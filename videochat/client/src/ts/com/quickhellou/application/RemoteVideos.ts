import { HTMLUtils } from '../../genb/base/utils/HTMLUtils'
import { RemoteVideo } from './RemoteVideo'
import { EventDispatcherService } from '../../genb/base/services/EventDispatcherService'
import { BaseUtils } from '../../genb/base/utils/BaseUtils'
import { RemoteVideosEvent } from './model/RemoteVideosEvent'
import { Log } from '../../genb/base/utils/Log'
import { RegisterOptions } from './model/RegisterOptions'

/**
 * Remote videos controller
 *
 * @export
 * @class RemoteVideos
 * @extends {EventDispatcherService}
 */
export class RemoteVideos extends EventDispatcherService {
  /**
   * Gets static instance.
   *
   * @static
   * @returns
   * @memberof RemoteVideos
   */
  public static getInstance() {
    if (!RemoteVideos.instance) {
      RemoteVideos.instance = new RemoteVideos()
    }
    return RemoteVideos.instance
  }

  private static instance: RemoteVideos
  private isFullScreen: boolean = false
  private videos: Map<string, RemoteVideo>
  /** Newest remote stream per session; older streams' retries are dropped. */
  private latestStreams: Map<string, MediaStream> = new Map<string, MediaStream>()
  private static MAX_ADD_STREAM_ATTEMPTS: number = 30
  private static ADD_STREAM_RETRY_MS: number = 2000

  /**
   * Creates an instance of RemoteVideos.
   *
   * @memberof RemoteVideos
   */
  private constructor() {
    super()
    this.videos = new Map()

    document.addEventListener(
      'fullscreenchange',
      (): void => {
        this.onFullScreenChange()
      },
      false
    )
    document.addEventListener(
      'webkitfullscreenchange',
      (): void => {
        this.onFullScreenChange()
      },
      false
    )
    document.addEventListener(
      'mozfullscreenchange',
      (event: MouseEvent): void => {
        this.onFullScreenChange()
      },
      false
    )
  }

  /**
   * Removes a remote video object.
   *
   * @public
   * @param {string} videoId
   * @memberof RemoteVideos
   */
  public remove(videoId: string) {
    this.videos.delete(videoId)
  }

  /**
   * Gets remote video.
   *
   * @param {string} videoId
   * @returns {RemoteVideo}
   * @memberof RemoteVideos
   */
  public get(videoId: string): RemoteVideo {
    const video = this.videos.get(videoId)
    return video
  }

  /**
   * Gets all remote videos.
   *
   * @returns {Map<string, RemoteVideo>}
   * @memberof RemoteVideos
   */
  public getAll(): Map<string, RemoteVideo> {
    return this.videos
  }

  /**
   * Checks if there are no remote videos.
   *
   * @returns {boolean}
   * @memberof RemoteVideos
   */
  public isEmpty(): boolean {
    return Array.from(this.videos).length === 0
  }

  /**
   * Checks if a remote client has at least one tile.
   *
   * @param {string} clientId
   * @returns {boolean}
   * @memberof RemoteVideos
   */
  public hasClient(clientId: string): boolean {
    return Array.from(this.videos.values()).some(
      (video: RemoteVideo) => video.clientId === clientId
    )
  }

  /**
   * Counts distinct remote clients that have a tile.
   *
   * @returns {number}
   * @memberof RemoteVideos
   */
  public getClientCount(): number {
    const clientIds: Set<string> = new Set<string>()
    this.videos.forEach((video: RemoteVideo) => clientIds.add(video.clientId))
    return clientIds.size
  }

  /**
   * Gets remote video video element.
   *
   * @param {string} videoId
   * @returns {HTMLVideoElement}
   * @memberof RemoteVideos
   */
  public getElement(videoId: string): HTMLVideoElement {
    const remoteVideo: RemoteVideo = this.videos.get(videoId)
    if (BaseUtils.isObjectDefined(remoteVideo)) {
      return remoteVideo.element
    } else {
      Log.warn('RemoteVideos::getElement No remote video by given video ID.')
    }

    return null
  }

  /**
   * Awaits remote stream arrival.
   *
   * @public
   * @param {string} streamId
   * @memberof RemoteVideos
   */
  public waitForRemoteVideo(streamId: string): void {
    // Wait for the actual video to start arriving before moving to the active
    // call state.

    const remoteVideo: RemoteVideo = this.videos.get(streamId)
    const remoteVideoElement: HTMLVideoElement = remoteVideo.element

    if (remoteVideoElement.readyState >= 2) {
      // i.e. can play
      Log.log(
        'Remote video started; currentTime: ' + remoteVideoElement.currentTime
      )
      this.dispatchEvent(
        RemoteVideosEvent.ADD_STREAM_SUCCESS,
        remoteVideo.element
      )
    } else {
      remoteVideoElement.oncanplay = (): void => {
        this.waitForRemoteVideo(streamId)
      }
    }
  }

  /**
   * Removes remote video "can play" handlers.
   *
   * @memberof RemoteVideos
   */
  public removeCanPlayHandlers() {
    this.videos.forEach((remoteVideo) => {
      remoteVideo.element.oncanplay = undefined
    })
  }

  /**
   * Deactivates all remote video windows.
   *
   * @public
   * @memberof RemoteVideos
   */
  public deactivateAll() {
    this.videos.forEach((remoteVideo) => {
      remoteVideo.element.classList.remove('active')
    })

    this.removeAllRemoteVideo()
  }

  /**
   * Creates remote video window with stream attached.
   *
   * @public
   * @param {MediaStream} stream
   * @memberof RemoteVideos
   */
  public addRemoteVideo(registerOptions: RegisterOptions) {
    Log.log('RemoteVideos::addRemoteVideo', registerOptions.clientId, registerOptions.sessionId)
    // One tile per remote client: a tile left over from an older session of
    // the same client (renegotiation, missed BYE) would show the user twice.
    Array.from(this.videos.entries()).forEach((entry: [string, RemoteVideo]) => {
      const sessionId: string = entry[0]
      const video: RemoteVideo = entry[1]
      if (
        sessionId !== registerOptions.sessionId &&
        video.clientId === registerOptions.clientId
      ) {
        Log.log('RemoteVideos::addRemoteVideo replacing stale tile', sessionId)
        this.removeRemoteVideo(sessionId)
      }
    })
    this.add(registerOptions.clientId, registerOptions.sessionId)

    this.updateVideoElementsLayout()

    this.dispatchEvent(RemoteVideosEvent.REMOTE_VIDEO_ADDED)
  }

  /**
   * Adds stream to existing video element.
   *
   * @public
   * @param {MediaStream} stream
   * @memberof RemoteVideos
   */
  public addStream(
    sessionId: string,
    stream: MediaStream,
    attempt: number = 0
  ): void {
    // Only the newest stream of a session may be attached; retries of an older
    // (e.g. pre-rejoin) stream stop as soon as a newer one arrives.
    if (attempt === 0) {
      if (this.latestStreams.get(sessionId) === stream) {
        return // same stream (audio + video both fire ontrack); already handled
      }
      this.latestStreams.set(sessionId, stream)
    } else if (this.latestStreams.get(sessionId) !== stream) {
      return
    }
    if (attempt > RemoteVideos.MAX_ADD_STREAM_ATTEMPTS || stream.active === false) {
      Log.warn('RemoteVideos::addStream giving up', sessionId)
      return
    }

    const retry = (): void => {
      setTimeout(() => {
        this.addStream(sessionId, stream, attempt + 1)
      }, RemoteVideos.ADD_STREAM_RETRY_MS)
    }

    const remoteVideo: RemoteVideo = this.get(sessionId)
    if (!BaseUtils.isObjectDefined(remoteVideo)) {
      retry()
      return
    }

    const remoteVideoElement: HTMLVideoElement = remoteVideo.element

    if (!BaseUtils.isObjectDefined(remoteVideoElement)) {
      this.dispatchEvent(RemoteVideosEvent.ADD_STREAM_FAILURE)
      return
    }

    // Replace whatever is attached (a dead stream from a previous connection
    // of this session would otherwise block the new one forever).
    if (remoteVideoElement.srcObject !== stream) {
      remoteVideoElement.srcObject = stream
    }
    if (remoteVideoElement.readyState >= 2) {
      this.dispatchEvent(
        RemoteVideosEvent.ADD_STREAM_SUCCESS,
        remoteVideoElement
      )
      return
    }

    retry()
  }

  /**
   * Remove remote video.
   *
   * @param {string} videoId
   * @memberof RemoteVideos
   */
  public removeRemoteVideo(sessionId: string) {
    const remoteVideo: RemoteVideo = this.get(sessionId)
    if (BaseUtils.isObjectDefined(remoteVideo)) {
      remoteVideo.element.srcObject = null
      remoteVideo.element.oncanplay = undefined
      this.remove(sessionId)

      // document.querySelectorAll(this.getRemoteVideoClassName(sessionId)).forEach((e) => e.parentNode.removeChild(e));

      const wrapVideo: HTMLElement = remoteVideo.element.parentElement
      if (BaseUtils.isObjectDefined(wrapVideo)) {
        wrapVideo.remove()
      }
      this.dispatchEvent(RemoteVideosEvent.REMOTE_VIDEO_REMOVED)
    }
    this.updateVideoElementsLayout()
  }

  /**
   * Gets remote video class name.
   *
   * @param {string} sessionId
   * @returns {string}
   * @memberof RemoteVideos
   */
  public getRemoteVideoClassName(sessionId: string): string {
    return `remote-video--${sessionId}`
  }

  /**
   * Updates video windows layout.
   *
   * @public
   * @memberof RemoteVideos
   */
  public updateVideoElementsLayout(): void {
    const activeVideoElementsSize: number = HTMLUtils.list(
      'video.remote-video.active'
    ).length

    this.videos.forEach((video: RemoteVideo, sessionId: string) => {
      const videoElement: HTMLElement = video.element.parentElement
      videoElement.classList.remove(
        'size--single',
        'size--double',
        'size--multi'
      )
      let sizeClass: string = 'size--single'
      if (activeVideoElementsSize === 2) {
        sizeClass = 'size--double'
      }
      if (activeVideoElementsSize > 2 && activeVideoElementsSize <= 4) {
        sizeClass = 'size--multi'
      }
      if (activeVideoElementsSize > 4) {
        sizeClass = 'size--large'
      }
      videoElement.classList.add(sizeClass)
    })
  }

  /**
   * Adds a remote video object.
   *
   * @param {string} remoteClientId
   * @param {string} sessionId
   * @returns {RemoteVideo}
   * @memberof RemoteVideos
   */
  private add(remoteClientId: string, sessionId: string): RemoteVideo {
    const videoElementClassName = this.getRemoteVideoClassName(sessionId)

    // Selector needs the leading dot (it is a class name). Without it the
    // check never matched and a second registration added a duplicate tile.
    const wrapSelector: string = `.${videoElementClassName}--wrap`
    if (this.videos.has(sessionId) || HTMLUtils.exists(wrapSelector)) {
      this.removeRemoteVideo(sessionId)
      // removeRemoteVideo only removes a tile it knows; drop orphans too.
      document.querySelectorAll(wrapSelector).forEach((e: Element) => e.remove())
    }

    if (!HTMLUtils.exists(wrapSelector)) {
      const videoElementHtml: string = `<div class="remote-video-wrap ${videoElementClassName}--wrap">
        <div class="remote-video-fullscreen ${videoElementClassName}--fullscreen">
        </div><div class="video-loader js-active">
        </div><video class="remote-video ${videoElementClassName}" autoplay playsinline></video></div>`
      const videoElementContainerElement = HTMLUtils.get(
        '.videos-wrap'
      ) as HTMLElement

      videoElementContainerElement.insertAdjacentHTML(
        'afterbegin',
        videoElementHtml
      )

      const fullscreenButton: HTMLElement = HTMLUtils.get(
        `.${videoElementClassName}--fullscreen`
      )

      fullscreenButton.addEventListener(
        'click',
        (): void => {
          this.toggleFullScreen(`.${videoElementClassName}--wrap`)
        },
        false
      )
    }

    const videoElement: HTMLVideoElement = HTMLUtils.get(
      `.${videoElementClassName}`
    ) as HTMLVideoElement

    const remoteVideo: RemoteVideo = new RemoteVideo(
      remoteClientId,
      videoElement
    )
    this.videos.set(sessionId, remoteVideo)

    const videoLoader: HTMLElement = HTMLUtils.get(
      `.${videoElementClassName}--wrap .video-loader`
    )

    videoElement.oncanplay = (): void => {
      videoLoader.classList.remove('js-active')
      videoElement.oncanplay = undefined
    }

    // A re-created tile (re-registration of the same session) gets the stream
    // that already arrived for it; ontrack does not fire a second time.
    const knownStream: MediaStream = this.latestStreams.get(sessionId)
    if (BaseUtils.isObjectDefined(knownStream) && knownStream.active !== false) {
      videoElement.srcObject = knownStream
    }

    Log.info('RemoteVideos::add Remote video added ', sessionId)
    return remoteVideo
  }

  /**
   * Handles full screen change event.
   *
   * @memberof AppController
   */
  private onFullScreenChange(): void {
    if (this.isFullScreen) {
      const footer: HTMLElement = HTMLUtils.get('.footer')
      const videosWrapList: NodeListOf<HTMLElement> = HTMLUtils.list(
        '.video-columns-wrap, .videos-wrap, .remote-video-wrap'
      )
      footer.classList.remove('hidden')
      videosWrapList.forEach((elem: HTMLElement) => {
        elem.classList.remove('js-fullscreen')
      })
      this.isFullScreen = false
    }
  }

  /**
   * Toggles full screen.
   *
   * @private
   * @memberof RemoteVideos
   */

  private toggleFullScreen(videoElementName: string): void {
    const footer: HTMLElement = HTMLUtils.get('.footer')
    const videosWrapList: NodeListOf<HTMLElement> = HTMLUtils.list(
      '.video-columns-wrap, .videos-wrap, ' + videoElementName
    )
    if (!this.isFullScreen) {
      Log.log('Entering fullscreen.')
      footer.classList.add('hidden')
      videosWrapList.item(0).classList.add('js-fullscreen')
      videosWrapList.item(1).classList.add('js-fullscreen')
      videosWrapList.item(2).classList.add('js-fullscreen')
      this.isFullScreen = true
    } else {
      Log.log('Exiting fullscreen.')
      footer.classList.remove('hidden')
      videosWrapList.forEach((elem: HTMLElement) => {
        elem.classList.remove('js-fullscreen')
      })
      this.isFullScreen = false
    }
  }

  /**
   * Removes all remote videos.
   *
   * @private
   * @memberof RemoteVideos
   */
  public removeAllRemoteVideo(): void {
    // Copy the keys first: removeRemoteVideo deletes from the map.
    Array.from(this.videos.keys()).forEach((sessionId: string) => {
      this.removeRemoteVideo(sessionId)
    })
    // Local hangup: every stream of this call is gone; stop their retries.
    this.latestStreams.clear()
  }
}
