import { HTMLUtils } from "../../genb/base/utils/HTMLUtils";
import { RemoteVideo } from "./RemoteVideo";
import { EventDispatcherService } from "../../genb/base/services/EventDispatcherService";
import { BaseUtils } from "../../genb/base/utils/BaseUtils";
import { RemoteVideosEvent } from "./model/RemoteVideosEvent";
import { Log } from "../../genb/base/utils/Log";
import { RegisterOptions } from "./model/RegisterOptions";

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
      RemoteVideos.instance = new RemoteVideos();
    }
    return RemoteVideos.instance;
  }

  private static instance: RemoteVideos;
  private isFullScreen: boolean = false;
  private videos: Map<string, RemoteVideo>;

  /**
   * Creates an instance of RemoteVideos.
   *
   * @memberof RemoteVideos
   */
  private constructor() {
    super();
    this.videos = new Map();

    document.addEventListener(
      "fullscreenchange",
      (): void => {
        this.onFullScreenChange();
      },
      false
    );
    document.addEventListener(
      "webkitfullscreenchange",
      (): void => {
        this.onFullScreenChange();
      },
      false
    );
    document.addEventListener(
      "mozfullscreenchange",
      (event: MouseEvent): void => {
        this.onFullScreenChange();
      },
      false
    );
  }

  /**
   * Removes a remote video object.
   *
   * @public
   * @param {string} videoId
   * @memberof RemoteVideos
   */
  public remove(videoId: string) {
    this.videos.delete(videoId);
  }

  /**
   * Gets remote video.
   *
   * @param {string} videoId
   * @returns {RemoteVideo}
   * @memberof RemoteVideos
   */
  public get(videoId: string): RemoteVideo {
    const video = this.videos.get(videoId);
    return video;
  }

  /**
   * Gets all remote videos.
   *
   * @returns {Map<string, RemoteVideo>}
   * @memberof RemoteVideos
   */
  public getAll(): Map<string, RemoteVideo> {
    return this.videos;
  }

  /**
   * Checks if there are no remote videos.
   *
   * @returns {boolean}
   * @memberof RemoteVideos
   */
  public isEmpty(): boolean {
    return Array.from(this.videos).length === 0;
  }

  /**
   * Gets remote video video element.
   *
   * @param {string} videoId
   * @returns {HTMLVideoElement}
   * @memberof RemoteVideos
   */
  public getElement(videoId: string): HTMLVideoElement {
    const remoteVideo: RemoteVideo = this.videos.get(videoId);
    if (BaseUtils.isObjectDefined(remoteVideo)) {
      return remoteVideo.element;
    } else {
      Log.warn("RemoteVideos::getElement No remote video by given video ID.");
    }

    return null;
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

    const remoteVideo: RemoteVideo = this.videos.get(streamId);
    const remoteVideoElement: HTMLVideoElement = remoteVideo.element;

    if (remoteVideoElement.readyState >= 2) {
      // i.e. can play
      Log.log(
        "Remote video started; currentTime: " + remoteVideoElement.currentTime
      );
      this.dispatchEvent(
        RemoteVideosEvent.ADD_STREAM_SUCCESS,
        remoteVideo.element
      );
    } else {
      remoteVideoElement.oncanplay = (): void => {
        this.waitForRemoteVideo(streamId);
      };
    }
  }

  /**
   * Removes remote video "can play" handlers.
   *
   * @memberof RemoteVideos
   */
  public removeCanPlayHandlers() {
    this.videos.forEach((remoteVideo) => {
      remoteVideo.element.oncanplay = undefined;
    });
  }

  /**
   * Deactivates all remote video windows.
   *
   * @public
   * @memberof RemoteVideos
   */
  public deactivateAll() {
    this.videos.forEach((remoteVideo) => {
      remoteVideo.element.classList.remove("active");
    });

    this.removeAllRemoteVideo();
  }

  /**
   * Creates remote video window with stream attached.
   *
   * @public
   * @param {MediaStream} stream
   * @memberof RemoteVideos
   */
  public addRemoteVideo(registerOptions: RegisterOptions) {
    this.add(registerOptions.clientId, registerOptions.sessionId);

    this.updateVideoElementsLayout();

    this.dispatchEvent(RemoteVideosEvent.REMOTE_VIDEO_ADDED);
  }

  /**
   * Adds stream to existing video element.
   *
   * @public
   * @param {MediaStream} stream
   * @memberof RemoteVideos
   */
  public addStream(sessionId: string, stream: MediaStream) {
    const remoteVideo: RemoteVideo = this.get(sessionId);
    if (!BaseUtils.isObjectDefined(remoteVideo)) {
      setTimeout(() => {
        this.addStream(sessionId, stream);
      }, 2000);
      return;
    }

    const remoteVideoElement: HTMLVideoElement = remoteVideo.element;

    if (!BaseUtils.isObjectDefined(remoteVideoElement)) {
      this.dispatchEvent(RemoteVideosEvent.ADD_STREAM_FAILURE);
      return;
    }

    if (!BaseUtils.isObjectDefined(remoteVideoElement.srcObject)) {
      remoteVideoElement.srcObject = stream;
    }

    if (remoteVideoElement.readyState >= 2) {
      this.dispatchEvent(
        RemoteVideosEvent.ADD_STREAM_SUCCESS,
        remoteVideoElement
      );
      return;
    }

    setTimeout(() => {
      this.addStream(sessionId, stream);
    }, 2000);
  }

  /**
   * Remove remote video.
   *
   * @param {string} videoId
   * @memberof RemoteVideos
   */
  public removeRemoteVideo(sessionId: string) {
    const remoteVideo: RemoteVideo = this.get(sessionId);
    if (BaseUtils.isObjectDefined(remoteVideo)) {
      remoteVideo.element.srcObject = null;
      remoteVideo.element.oncanplay = undefined;
      this.remove(sessionId);

      // document.querySelectorAll(this.getRemoteVideoClassName(sessionId)).forEach((e) => e.parentNode.removeChild(e));

      const wrapVideo: HTMLElement = remoteVideo.element.parentElement;
      if (BaseUtils.isObjectDefined(wrapVideo)) {
        wrapVideo.remove();
      }
      this.dispatchEvent(RemoteVideosEvent.REMOTE_VIDEO_REMOVED);
    }
    this.updateVideoElementsLayout();
  }

  /**
   * Gets remote video class name.
   *
   * @param {string} sessionId
   * @returns {string}
   * @memberof RemoteVideos
   */
  public getRemoteVideoClassName(sessionId: string): string {
    return `remote-video--${sessionId}`;
  }

  /**
   * Updates video windows layout.
   *
   * @public
   * @memberof RemoteVideos
   */
  public updateVideoElementsLayout(): void {
    const activeVideoElementsSize: number = HTMLUtils.list(
      "video.remote-video.active"
    ).length;

    this.videos.forEach((video: RemoteVideo, sessionId: string) => {
      const videoElement: HTMLElement = video.element.parentElement;
      videoElement.classList.remove(
        "size--single",
        "size--double",
        "size--multi"
      );
      let sizeClass: string = "size--single";
      if (activeVideoElementsSize === 2) {
        sizeClass = "size--double";
      }
      if (activeVideoElementsSize > 2 && activeVideoElementsSize <= 4) {
        sizeClass = "size--multi";
      }
      if (activeVideoElementsSize > 4) {
        sizeClass = "size--large";
      }
      videoElement.classList.add(sizeClass);
    });
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
    const videoElementClassName = this.getRemoteVideoClassName(sessionId);

    if (HTMLUtils.exists(videoElementClassName)) {
      this.removeRemoteVideo(sessionId);
    }

    if (!HTMLUtils.exists(videoElementClassName)) {
      const videoElementHtml: string =
        `<div class="remote-video-wrap ${videoElementClassName}--wrap">
        <div class="remote-video-fullscreen ${videoElementClassName}--fullscreen">
        </div><div class="video-loader js-active">
        </div><video class="remote-video ${videoElementClassName}" autoplay playsinline></video></div>`;
      const videoElementContainerElement = HTMLUtils.get(
        ".videos-wrap"
      ) as HTMLElement;

      videoElementContainerElement.insertAdjacentHTML(
        "afterbegin",
        videoElementHtml
      );

      const fullscreenButton: HTMLElement = HTMLUtils.get(
        `.${videoElementClassName}--fullscreen`
      );

      fullscreenButton.addEventListener(
        "click",
        (): void => {
          this.toggleFullScreen(`.${videoElementClassName}--wrap`);
        },
        false
      );
    }

    const videoElement: HTMLVideoElement = HTMLUtils.get(
      `.${videoElementClassName}`
    ) as HTMLVideoElement;

    const remoteVideo: RemoteVideo = new RemoteVideo(
      remoteClientId,
      videoElement
    );
    this.videos.set(sessionId, remoteVideo);

    const videoLoader: HTMLElement = HTMLUtils.get(
      `.${videoElementClassName}--wrap .video-loader`
    );

    videoElement.oncanplay = (): void => {
      videoLoader.classList.remove("js-active");
      videoElement.oncanplay = undefined;
    };

    Log.info("RemoteVideos::add Remote video added ", sessionId);
    return remoteVideo;
  }

  /**
   * Handles full screen change event.
   *
   * @memberof AppController
   */
  private onFullScreenChange(): void {
    if (this.isFullScreen) {
      const footer: HTMLElement = HTMLUtils.get(".footer");
      const videosWrapList: NodeListOf<HTMLElement> = HTMLUtils.list(
        ".video-columns-wrap, .videos-wrap, .remote-video-wrap"
      );
      footer.classList.remove("hidden");
      videosWrapList.forEach((elem: HTMLElement) => {
        elem.classList.remove("js-fullscreen");
      });
      this.isFullScreen = false;
    }
  }

  /**
   * Toggles full screen.
   *
   * @private
   * @memberof RemoteVideos
   */

  private toggleFullScreen(videoElementName: string): void {
    const footer: HTMLElement = HTMLUtils.get(".footer");
    const videosWrapList: NodeListOf<HTMLElement> = HTMLUtils.list(
      ".video-columns-wrap, .videos-wrap, " + videoElementName
    );
    if (!this.isFullScreen) {
      Log.log("Entering fullscreen.");
      footer.classList.add("hidden");
      videosWrapList.item(0).classList.add("js-fullscreen");
      videosWrapList.item(1).classList.add("js-fullscreen");
      videosWrapList.item(2).classList.add("js-fullscreen");
      this.isFullScreen = true;
    } else {
      Log.log("Exiting fullscreen.");
      footer.classList.remove("hidden");
      videosWrapList.forEach((elem: HTMLElement) => {
        elem.classList.remove("js-fullscreen");
      });
      this.isFullScreen = false;
    }
  }

  /**
   * Removes all remote videos.
   *
   * @private
   * @memberof RemoteVideos
   */
  private removeAllRemoteVideo(): void {
    this.videos.forEach((video: RemoteVideo, sessionId: string) => {
      this.removeRemoteVideo(sessionId);
    });
  }
}
