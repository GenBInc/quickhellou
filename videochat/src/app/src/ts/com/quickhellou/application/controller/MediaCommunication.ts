import { EventDispatcherService } from '../../../genb/base/services/EventDispatcherService'
import { Call } from '../../Call'
import { LoadingParams } from '../../LoadingParams'
import { ColliderService } from '../service/ColliderService'
import { CallEvent } from '../../CallEvent'
import { Room } from '../model/Room'
import { Util } from '../../Util'
import { ColliderServiceEvent } from '../model/ColliderServiceEvent'
import { BaseUtils } from '../../../genb/base/utils/BaseUtils'
import { StringUtils } from '../../../genb/base/utils/StringUtils'
import { Log } from '../../../genb/base/utils/Log'
import { PeerConnectionResponseType } from '../model/PeerConnectionResponseType'
import { RegisterOptions } from '../model/RegisterOptions'
import { SessionInit } from '../model/SessionInit'
import { RtcSession } from '../model/RtcSession'
import { SessionOptions } from '../model/SessionOptions'
import { MediaConstraints } from '../model/MediaConstraints'
import { MediaEvent } from '../model/MediaEvent'
import { VideoTrackEventOptions } from '../model/VideoTrackEventOptions'
import { ShareScreenEvent } from '../model/ShareScreenEvent'

/**
 * MediaCommunication and media facade.
 *
 * @export
 * @class MediaCommunication
 * @extends {EventDispatcherService}
 */
export class MediaCommunication extends EventDispatcherService {
  public call: Call
  private loadingParams: LoadingParams
  private colliderService: ColliderService
  private room: Room
  private getMediaPromise: Promise<any>
  private getIceServersPromise: Promise<any>

  /**
   * Creates an instance of MediaCommunication.
   *
   * @param {LoadingParams} loadingParams
   * @memberof MediaCommunication
   */
  constructor(loadingParams: LoadingParams) {
    super()
    this.loadingParams = loadingParams
    this.colliderService = ColliderService.setupInstance(
      this.loadingParams.wssUrl,
      this.loadingParams.wssPostUrl,
      true
    )

    this.setRoom(this.loadingParams.roomID, this.loadingParams.roomLink)

    this.colliderService = ColliderService.getInstance()
    
    this.colliderService.addEventListener(
      ColliderServiceEvent.MESSAGE,
      this.onReceiveColliderChannelMessage,
      this
    )

    this.colliderService.addEventListener(
      ColliderServiceEvent.CLOSE,
      this.onColliderChannelClose,
      this
    )

    this.requestMediaAndIceServers()
  }

  /**
   * Sets room.
   *
   * @param {string} roomId
   * @param {string} roomLink
   * @memberof MediaCommunication
   */
  public setRoom(roomId: string, roomLink: string): void {
    this.room = new Room(roomId, roomLink)
    this.loadingParams.roomID = roomId
    this.loadingParams.roomLink = roomLink
    this.room.server = this.room.server = this.loadingParams.hostUrl || ''
  }

  /**
   * Creates call instance.
   *
   * @returns {Call}
   * @memberof MediaCommunication
   */
  public createCall(): Call {
    if (!BaseUtils.isObjectDefined(this.call)) {
      this.call = new Call(this.loadingParams)
      this.setupCallEvents()
    }
    return this.call
  }

  /**
   * Connects to remote services.
   *
   * @memberof MediaCommunication
   */
  public connect(): void {
    // Asynchronously open a WebSocket connection to the Collider service.
    const connectColliderPromise: Promise<any> = this.colliderService
      .open()
      .catch((reason: any): Promise<any> => {
        this.onError(`WebSocket open error: ${reason.message}`)
        return Promise.reject(reason)
      })

    // Asynchronously join the room.
    const joinSignalingServerPromise: Promise<any> = this.joinRoom().catch(
      (reason: any): Promise<any> => {
        this.onError(`Room server join error: ${reason.message}`)
        return Promise.reject(reason)
      }
    )

    // We only register with WSS if the web socket connection is open and if we're
    // already registered with PyApp.
    Promise.all([connectColliderPromise, joinSignalingServerPromise])
      .then((results: any): void => {
        const roomPyParams: any = results[1]
        this.loadingParams.clientID = roomPyParams.client_id
        const sessions: any[] = roomPyParams.sessions
        const sessionInit: SessionInit = new SessionInit()
        sessions.forEach((sessionObj: any) => {
          const sessionJson: any = JSON.parse(sessionObj)
          sessionInit.addSession(
            new RtcSession(
              sessionJson.id,
              sessionJson.messages,
              sessionJson.other_client_id,
              StringUtils.equals(sessionJson.is_initiator, 'True'),
              StringUtils.equals(sessionJson.is_forward, 'True')
            )
          )
        })

        this.colliderService.register(this.room.id, roomPyParams.client_id)

        // We only start signaling after we have registered the signaling channel
        // and have media and TURN. Since we send candidates as soon as the peer
        // connection generates them we need to wait for the signaling channel to be
        // ready.
        Promise.all([this.getIceServersPromise, this.getMediaPromise])
          .then((): void => {
            this.startRtcSignaling(sessionInit)
          })
          .catch((reason: any): void => {
            this.onError(`Failed to start signaling: ${reason.message}`)
          })
      })
      .catch((reason: any): void => {
        this.onError(`WebSocket register error: ${reason.message}`)
      })
  }

  /**
   * Sets display media as default video track.
   *
   * @memberof MediaCommunication
   */
  public async displayMedia() {
    ;(navigator.mediaDevices as any)
      .getDisplayMedia({ video: true, audio: true })
      .then((stream: MediaStream) => {
        this.onUserDisplayMediaSuccess(stream)
      })
      .catch((reason: any) => {
        Log.warn(reason)
        this.dispatchEvent(ShareScreenEvent.NOT_ALLOWED)
      })
  }

  /**
   * Stops sending the screen capture tracks
   * and reattaches camera tracks.
   *
   * @public
   * @memberof MediaCommunication
   */
  public async stopSendingDisplayMedia() {
    this.call.stopDisplayMedia()
  }

  /**
   * Restarts call.
   *
   * @memberof MediaCommunication
   */
  public restartCall() {
    this.requestMediaAndIceServers()
    this.connect()
  }

  /**
   * Hangups call.
   *
   * @param {boolean} async
   * @memberof MediaCommunication
   */
  public hangupCall(async: boolean) {
    Log.log('MediaCommunication::hangupCall', async)
    this.call.hangup(async)
  }

  /**
   * Toggles audio unmuting.
   *
   * @memberof MediaCommunication
   */
  public toggleAudioUnMute() {
    this.call.toggleAudioUnMute()
  }

  /**
   * Toggles audio muting.
   *
   * @memberof MediaCommunication
   */
  public toggleAudioMute() {
    this.call.toggleAudioMute()
  }

  /**
   * Toggles video muting.
   *
   * @memberof MediaCommunication
   */
  public toggleVideoMute() {
    this.call.toggleVideoMute()
  }

  /**
   * Gets call start time.
   *
   * @returns
   * @memberof MediaCommunication
   */
  public getCallStartTime() {
    return this.call.getStartTime()
  }

  /**
   * Sends local chat message.
   *
   * @public
   * @param {string} message
   * @memberof MediaCommunication
   */
  public sendLocalChatMessage(message: string): void {
    this.call.broadcast(PeerConnectionResponseType.TEXT_CHAT_MESSAGE, message)
  }

  /**
   * Gets call instance.
   *
   * @returns {Call}
   * @memberof MediaCommunication
   */
  public getCall(): Call {
    return this.call
  }

  /**
   * Adds display media to stream.
   *
   * @private
   * @param {MediaStream} stream
   * @memberof MediaCommunication
   */
  private async onUserDisplayMediaSuccess(displayStream: MediaStream) {
    if (!BaseUtils.isObjectDefined(this.call)) {
      Log.error('Call instance is not defined.')
      return
    }
    if (displayStream.getTracks().length === 0) {
      Log.error('Display screen has no tracks attached.')
      return
    }
    this.dispatchEvent(MediaEvent.DISPLAY_MEDIA_DISPLAYED)

    this.call.addDisplayMediaTracks(displayStream.getTracks()[0])
  }

  /**
   * Requests local media and ICE servers.
   *
   * @private
   * @memberof MediaCommunication
   */
  private requestMediaAndIceServers(): void {
    this.getMediaPromise = this.maybeGetMedia()
    this.getIceServersPromise = this.maybeGetIceServers()
  }

  /**
   * Joins room in signaling service.
   *
   * @private
   * @returns {Promise<any>}
   * @memberof MediaCommunication
   */
  private joinRoom(): Promise<any> {
    return new Promise((resolve: any, reject: any): any => {
      if (!BaseUtils.isObjectDefined(this.room.id)) {
        reject(Error('Missing room ID.'))
      }

      const path: string = `${this.room.server}/join/${this.room.id}${window.location.search}`
      Util.sendAsyncUrlRequest('POST', path)
        .then((response: any): void => {
          const responseObj: any = Util.parseJSON(response)
          if (!responseObj) {
            reject(Error('Error parsing response JSON.'))
            return
          }
          if (!StringUtils.equals(responseObj.result, 'SUCCESS')) {
            reject(Error(`Registration error: ${responseObj.result}`))
            if (StringUtils.equals(responseObj.result, 'FULL')) {
              const getPath: string = `${this.room.server}/r/${this.room.id}${window.location.search}`
              window.location.assign(getPath)
            }
            return
          }
          Log.log('Joined the room.')
          resolve(responseObj.params)
        })
        .catch((reason: any): void => {
          reject(Error(`Failed to join the room: ${reason.message}`))
          return
        })
    })
  }

  /**
   * Asynchronously request local video and audio if needed.
   *
   * @private
   * @returns {Promise<any>}
   * @memberof MediaCommunication
   */
  private maybeGetMedia(): Promise<any> {
    const needStream: boolean =
      this.loadingParams.mediaConstraints.audio !== false ||
      this.loadingParams.mediaConstraints.video !== false
    let mediaPromise: Promise<any> = null
    if (needStream) {
      const mediaConstraints: MediaConstraints =
        this.loadingParams.mediaConstraints
      mediaPromise = navigator.mediaDevices
        .getUserMedia(mediaConstraints)
        .catch((reason: any): any => {
          if (reason.name !== 'NotFoundError') {
            throw reason
          }
          return navigator.mediaDevices
            .enumerateDevices()
            .then((devices: MediaDeviceInfo[]): any => {
              const cam: MediaDeviceInfo = devices.find(
                (device: MediaDeviceInfo): boolean => {
                  return device.kind === 'videoinput'
                }
              )
              const mic: MediaDeviceInfo = devices.find(
                (device: MediaDeviceInfo): boolean => {
                  return device.kind === 'audioinput'
                }
              )
              const audioConstraint: MediaTrackConstraints = {
                echoCancellation: true,
              }
              const constraints: MediaStreamConstraints = {
                audio: audioConstraint,
                video: cam && mediaConstraints.video,
              }
              if (!!navigator.mediaDevices.getUserMedia) {
                return navigator.mediaDevices.getUserMedia(constraints)
              } else {
                Log.warn(
                  'Feature not supported. Please update your browser to the newest release.'
                )
              }
            })
        })
        .then((stream: MediaStream): any => {
          this.onUserMediaSuccess(stream)
        })
        .catch((reason: any): void => {
          this.onError(`Error getting local media: ${reason.message}`)
          this.onUserMediaError(reason)
        })
    } else {
      mediaPromise = Promise.resolve()
    }

    return mediaPromise
  }

  /**
   * Handles local media initialize success.
   *
   * @private
   * @param {MediaStream} stream
   * @memberof MediaCommunication
   */
  private onUserMediaSuccess(stream: MediaStream): void {
    if (!BaseUtils.isObjectDefined(this.call)) {
      Log.warn('Call instance is not defined.')
      return
    }
    this.call.setLocalStream(stream)
    this.dispatchEvent(CallEvent.LOCAL_STREAM_ADDED, stream)
  }

  /**
   * Handles local media initialize error.
   *
   * @private
   * @param {any} error
   * @memberof MediaCommunication
   */
  private onUserMediaError(reason: any): void {
    const errorMessage: string =
      `Failed to get access to local media. Error name was ${reason.name}.` +
      'Continuing without sending a stream.'
    this.onError(`getUserMedia error: ${errorMessage}`)
    alert(errorMessage)
  }

  /**
   * Asynchronously request an ICE server if needed.
   *
   * @private
   * @returns {Promise<any>}
   * @memberof MediaCommunication
   */
  private maybeGetIceServers(): Promise<any> {
    const shouldRequestIceServers =
      this.loadingParams.iceServerRequestUrl &&
      this.loadingParams.iceServerRequestUrl.length > 0 &&
      this.loadingParams.peerConnectionConfig.iceServers &&
      this.loadingParams.peerConnectionConfig.iceServers.length === 0

    let iceServerPromise: Promise<any> = null
    if (shouldRequestIceServers) {
      const requestURL: string = this.loadingParams.iceServerRequestUrl
      iceServerPromise = Util.requestIceServers(
        requestURL,
        this.loadingParams.iceServerTransports
      )
        .then((iceServers: any): void => {
          const servers = this.loadingParams.peerConnectionConfig.iceServers
          this.loadingParams.peerConnectionConfig.iceServers =
            servers.concat(iceServers)
        })
        .catch((reason: any): void => {
          // Error retrieving ICE servers.
          const message: string =
            'No TURN server; unlikely that media will traverse networks.'
          this.dispatchEvent(CallEvent.STATUS_MESSAGE, message)
          Log.warn(reason.message)
        })
    } else {
      iceServerPromise = Promise.resolve()
    }
    return iceServerPromise
  }

  /**
   * Sends request to create PeerConnection client and start RTC signaling.
   *
   * @private
   * @param {SessionInit} sessionInit
   * @memberof MediaCommunication
   */
  private startRtcSignaling(sessionInit: SessionInit): void {
    this.call.setRoom(this.room)
    this.call.startRtcSignaling(sessionInit)
  }

  /**
   * Resolves response signaling message.
   *
   * @private
   * @param {string} message the message
   * 
   * @memberof MediaCommunication
   */
  private onReceiveColliderChannelMessage(message: string): void {
    let messageJson: any = Util.parseJSON(message)
    if (typeof messageJson === 'string') {
      messageJson = Util.parseJSON(messageJson)
    }
    if (!BaseUtils.isObjectDefined(messageJson)) {
      Log.warn(
        'MediaCommunication::onReceiveColliderChannelMessage No message defined.'
      )
      return
    }

    const type: string = messageJson.type
    if (PeerConnectionResponseType.isBye(type)) {
      this.onRemoteHangup(messageJson.sessionId)
      return
    }

    if (PeerConnectionResponseType.isPing(type)) {
      this.onPingRequest()
      return
    }

    if (PeerConnectionResponseType.isRemoteIceComplete(type)) {
      this.onRemoteIceComplete(messageJson)
      return
    }

    if (PeerConnectionResponseType.isUnreachableClient(type)) {
      this.onUnreachableClient(messageJson.body)
      return
    }

    if (PeerConnectionResponseType.isTextChatMessage(messageJson)) {
      this.onRemoteTextChatMessage(Util.parseJSON(messageJson.body))
      return
    }

    if (PeerConnectionResponseType.isResponse(type)) {
      let body: any = messageJson.body
      if (typeof messageJson.body === 'string') {
        body = JSON.parse(messageJson.body)
      }
      if (BaseUtils.isObjectDefined(body)) {
        const name: string = body.name
        this.resolveResponseSignalingMessage(name, body)
        return
      }
    }

    // forward the message to the call instance
    // to use it in RTC connection
    this.call.receiveColliderChannelMessage(message)
  }

  /**
   * Handles unexpected Collider channel close.
   *
   * @private
   * @memberof MediaCommunication
   */
  private onColliderChannelClose(): void {
    this.dispatchEvent(CallEvent.WEBSOCKET_CLOSED)
  }

  /**
   * Responds on ping request.
   *
   * @private
   * @memberof MediaCommunication
   */
  private onPingRequest(): void {
    this.colliderService.respondOnPingRequest()
  }

  private onRemoteIceComplete(data: any) {
    this.call.onRemoteIceComplete(data)
  }

  /**
   *
   *
   * @private
   * @param {string} clientId
   * @memberof MediaCommunication
   */
  private onUnreachableClient(clientId: string): void {
    const sessionId: string = this.call.onRemoteHangupByClientId(clientId)
    this.dispatchEvent(CallEvent.REMOTE_HANGUP, sessionId)
  }

  /**
   * Setups call events.
   *
   * @private
   * @memberof MediaCommunication
   */
  private setupCallEvents() {
    this.call.addEventListener(
      CallEvent.REMOTE_SDP_PROTOCOL_RECEIVED,
      (data: any): void => {
        this.onRemoteSdpProtocolReceived(data)
      },
      this
    )
    this.call.addEventListener(
      CallEvent.REMOTE_STREAM_ADDED,
      (data: any): void => {
        this.onRemoteStreamAdded(data)
      },
      this
    )
    this.call.addEventListener(
      CallEvent.LOCAL_STREAM_ADDED,
      (data: any): void => {
        this.onLocalStreamAdded(data.stream)
      },
      this
    )

    this.call.addEventListener(
      CallEvent.SIGNALING_STATE_CHANGE,
      (): void => {
        this.dispatchEvent(CallEvent.SIGNALING_STATE_CHANGE)
      },
      this
    )

    this.call.addEventListener(
      CallEvent.ICE_CONNECTION_STATE_CHANGE,
      (): void => {
        this.dispatchEvent(CallEvent.ICE_CONNECTION_STATE_CHANGE)
      },
      this
    )
    this.call.addEventListener(
      CallEvent.NEW_ICE_CANDIDATE,
      (data: any): void => {
        this.dispatchEvent(CallEvent.NEW_ICE_CANDIDATE, data)
      },
      this
    )

    this.call.addEventListener(
      CallEvent.REMOTE_TEXT_CHAT_MESSAGE,
      (data: any): void => {
        this.onRemoteTextChatMessage(data.message)
      },
      this
    )

    this.call.addEventListener(
      CallEvent.STATUS_MESSAGE,
      (message: string): void => {
        this.dispatchEvent(CallEvent.STATUS_MESSAGE, message)
      },
      this
    )
    this.call.addEventListener(
      CallEvent.ERROR,
      (message: string): void => {
        this.dispatchEvent(CallEvent.ERROR, message)
      },
      this
    )

    this.call.addEventListener(
      CallEvent.CALLER_STARTED,
      (room: Room) => {
        this.dispatchEvent(CallEvent.CALLER_STARTED, room)
      },
      this
    )

    this.call.addEventListener(
      CallEvent.LOCAL_VIDEO_MEDIA_CHANGE,
      (options: VideoTrackEventOptions) => {
        this.dispatchEvent(CallEvent.LOCAL_VIDEO_MEDIA_CHANGE, options)
      },
      this
    )
  }

  /**
   * Handles remote hangup signal.
   *
   * @private
   * @param {string} sessionId
   * @memberof MediaCommunication
   */
  private onRemoteHangup(sessionId: string) {
    this.dispatchEvent(CallEvent.REMOTE_HANGUP, sessionId)
    this.call.onRemoteHangup(sessionId)
  }

  /**
   * Handles remote SPD protocol received.
   *
   * @private
   * @param {*} data
   * @memberof MediaCommunication
   */
  private onRemoteSdpProtocolReceived(data: any) {
    this.dispatchEvent(CallEvent.REMOTE_SDP_PROTOCOL_RECEIVED, data)
  }

  /**
   * Handles remote stream added.
   *
   * @private
   * @param {*} data
   * @memberof MediaCommunication
   */
  private onRemoteStreamAdded(data: any) {
    this.dispatchEvent(CallEvent.REMOTE_STREAM_ADDED, data)
  }

  /**
   * Handles local stream added.
   *
   * @private
   * @param {MediaStream} stream
   * @memberof MediaCommunication
   */
  private onLocalStreamAdded(stream: MediaStream) {
    this.dispatchEvent(CallEvent.LOCAL_STREAM_ADDED, stream)
  }

  /**
   * Handles remote text chat message received.
   *
   * @private
   * @param {string} message
   * @memberof MediaCommunication
   */
  private onRemoteTextChatMessage(message: any) {
    this.dispatchEvent(CallEvent.REMOTE_TEXT_CHAT_MESSAGE, message.data)
  }

  /**
   * Handles session initialization from a remtoe peer.
   *
   * @private
   * @param {SessionOptions} sessionOptions
   * @memberof MediaCommunication
   */
  private onRemoteSession(sessionOptions: SessionOptions): void {
    const sessionInit: SessionInit = new SessionInit()
    sessionInit.addSession(sessionOptions.session)
    this.startRtcSignaling(sessionInit)
  }

  /**
   * Handles remote peer registered.
   *
   * @private
   * @param {RegisterOptions} registerOptions
   * @memberof MediaCommunication
   */
  private onRemoteClientRegistered(registerOptions: RegisterOptions) {
    this.call
      .setSessionOtherClientId(registerOptions)
      .then(() => {
        this.dispatchEvent(CallEvent.REMOTE_CLIENT_REGISTERED, registerOptions)
      })
      .catch(() => {
        Log.warn('Remote client cannot be registered.')
      })
  }

  /**
   * Handles error message.
   *
   * @private
   * @param {any} message
   * @memberof MediaCommunication
   */
  private onError(message: any): void {
    this.dispatchEvent(CallEvent.ERROR, message)
  }

  /**
   * Resolves response signaling message.
   *
   * @private
   * @param {string} name
   * @param {string} status
   * @memberof MediaCommunication
   */
  private resolveResponseSignalingMessage(name: string, body: any) {
    switch (name) {
      case 'register':
        this.onRegister(body)
        break
      case 'remoteSession':
        this.onRemoteSession(body)
        break
      case 'remoteClientRegistered':
        this.onRemoteClientRegistered(body)
        break
    }
  }

  /**
   * Handles goapp register response.
   *
   * @private
   * @param {*} body
   * @memberof MediaCommunication
   */
  private onRegister(body: any) {
    if (StringUtils.equals(body.status, 'ok')) {
      Log.log('Client has successfully registered in the Collider service.')
    }
    // this.call.consumeRemoteMessages();
  }
}
