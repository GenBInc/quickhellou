import { ColliderService } from './application/service/ColliderService'
import { LoadingParams } from './LoadingParams'
import { PeerConnectionClient } from './PeerConnectionClient'
import { CallEvent } from './CallEvent'
import { Util } from './Util'
import { PeerConnectionClientEvent } from './PeerConnectionClientEvent'
import { BaseUtils } from '../genb/base/utils/BaseUtils'
import { FormService } from '../genb/base/services/FormService'
import { Room } from './application/model/Room'
import { PeerConnectionResponseType } from './application/model/PeerConnectionResponseType'
import { Log } from '../genb/base/utils/Log'
import { StringUtils } from '../genb/base/utils/StringUtils'
import { RegisterOptions } from './application/model/RegisterOptions'
import { SessionInit } from './application/model/SessionInit'
import { RtcSession } from './application/model/RtcSession'
import { SessionOptions } from './application/model/SessionOptions'
import { VideoTrackEventOptions } from './application/model/VideoTrackEventOptions'
import { RetryConsumeManager } from './application/controller/RetryConsumeManager'
import { RetryJobEvent } from './application/events/RetryJobEvent'

/**
 * Call facade.
 *
 * @export
 * @class Call
 * @extends {FormService}
 */
export class Call extends FormService {
  private colliderService: ColliderService
  private params: LoadingParams
  private pcClients: Map<string, PeerConnectionClient>
  private localStream: MediaStream
  private startTime: number

  private cameraTrack: MediaStreamTrack
  private displayTrack: MediaStreamTrack

  private isCertificateGenerated: boolean
  private retryConsumeManagers: Map<string, RetryConsumeManager>
  private room: Room

  /**
   * Creates an instance of Call.
   *
   * @param {LoadingParams} params
   * @memberof Call
   */
  constructor(params: LoadingParams) {
    super()
    this.params = params

    this.colliderService = ColliderService.getInstance()
    this.retryConsumeManagers = new Map<string, RetryConsumeManager>()
    this.pcClients = new Map<string, PeerConnectionClient>()
    this.localStream = null
    this.startTime = null
    this.cameraTrack = null

    this.isCertificateGenerated = false

    this.createCertificate()
  }

  /**
   * Sends a message via signaling channel.
   *
   * @param {*} message
   * @memberof Call
   */
  public send(message: any, persistant: boolean = true): void {
    const msgString: string = JSON.stringify(message)
    this.colliderService.send(msgString, persistant)
  }

  /**
   * Broadcasts a message.
   *
   * @param {string} inputType
   * @param {*} message
   * @memberof Call
   */
  public broadcast(inputType: string, message: any): void {
    this.colliderService.broadcast(inputType, message)
  }

  /**
   * Toggles video muting.
   *
   * @returns {void}
   * @memberof Call
   */
  public toggleVideoMute(): void {
    const videoTracks: MediaStreamTrack[] = this.localStream.getVideoTracks()
    if (videoTracks.length === 0) {
      Log.log('No local video available.')
      return
    }
    Log.log('Toggling video mute state.')
    for (const videoTrack of videoTracks) {
      videoTrack.enabled = !videoTrack.enabled
    }
    Log.log('Video ' + (videoTracks[0].enabled ? 'unmuted.' : 'muted.'))
  }

  /**
   * Adds display media tracks to peer connection clients.
   *
   * @param {MediaStreamTrack} track
   * @memberof Call
   */
  public addDisplayMediaTracks(track: MediaStreamTrack): void {
    // mute video track
    this.cameraTrack.enabled = false

    // Re-enable video on screen sharing end.
    track.addEventListener('ended', () => {
      this.stopDisplayMedia()
    })
    this.localStream
      .getVideoTracks()
      .forEach((videoTrack: MediaStreamTrack) => {
        this.localStream.removeTrack(videoTrack)
      })
    this.localStream.addTrack(track)
    this.displayTrack = track
    this.dispatchEvent(
      CallEvent.LOCAL_VIDEO_MEDIA_CHANGE,
      new VideoTrackEventOptions(
        this.displayTrack,
        VideoTrackEventOptions.SCREEN_CAPTURE
      )
    )
    try {
      this.pcClients.forEach((pcClient: PeerConnectionClient) => {
        pcClient.addVideoTrack(this.displayTrack)
      })
    } catch (e) {
      Log.log('error', e)
    }
  }
  /**
   * Stops the display media.
   *
   * @public
   * @memberof Call
   */
  public stopDisplayMedia() {
    if (!this.displayTrack) {
      return
    }
    if (!this.displayTrack.enabled) {
      return
    }
    this.displayTrack.enabled = false
    this.displayTrack.stop()

    this.addCameraTracks()

    this.dispatchEvent(
      CallEvent.LOCAL_VIDEO_MEDIA_CHANGE,
      new VideoTrackEventOptions(this.cameraTrack)
    )
  }

  /**
   * Toggles audio unmuting.
   *
   * @returns {void}
   * @memberof Call
   */

  public toggleAudioUnMute(): void {
    const audioTracks: MediaStreamTrack[] = this.localStream.getAudioTracks()
    if (audioTracks.length === 0) {
      Log.log('No local audio available.')
      return
    }
    Log.log('Toggling audio to unmute state.')
    for (const audioTrack of audioTracks) {
      audioTrack.enabled = true
    }
    Log.log('Audio unmuted.')
  }

  /**
   * Toggles audio muting.
   *
   * @returns {void}
   * @memberof Call
   */
  public toggleAudioMute(): void {
    const audioTracks: MediaStreamTrack[] = this.localStream.getAudioTracks()
    if (audioTracks.length === 0) {
      Log.log('No local audio available.')
      return
    }
    Log.log('Toggling audio mute state.')
    for (const audioTrack of audioTracks) {
      audioTrack.enabled = !audioTrack.enabled
    }
    Log.log('Audio ' + (audioTracks[0].enabled ? 'unmuted.' : 'muted.'))
  }

  /**
   * Return call start time.
   *
   * @public
   * @returns {number}
   * @memberof Call
   */
  public getStartTime(): number {
    return this.startTime
  }

  /**
   * Sets local stream.
   *
   * @public
   * @param {MediaStream} stream
   * @memberof Call
   */
  public setLocalStream(stream: MediaStream) {
    this.localStream = stream

    if (this.localStream.getVideoTracks().length === 0) {
      return
    }

    this.cameraTrack = this.localStream.getVideoTracks().shift()
  }

  /**
   * Sets room.
   *
   * @public
   * @param {Room} room
   * @memberof Call
   */
  public setRoom(room: Room) {
    this.room = room
  }

  /**
   * Handles received signaling channel message.
   *
   * @public
   * @param {string} message
   * @memberof Call
   */
  public receiveColliderChannelMessage(messageObj: string): void {
    const message = JSON.parse(messageObj)
    const sessionId: string = message.sessionId
    Log.log(
      'Call::receiveColliderChannelMessage (should create PC Client) ',
      sessionId
    )
    this.createPcClient(new RtcSession(sessionId, '', message)).then(
      (pcClient: PeerConnectionClient): void => {
        pcClient.receiveSignalingMessage(message)
      }
    )
  }

  /**
   * Starts signaling.
   *
   * @public
   * @memberof Call
   */
  public startRtcSignaling(sessionInit: SessionInit): void {
    sessionInit.sessions.forEach((session: RtcSession) => {
      Log.log('Call::startRtcSignaling - forward? ', session.isForward)
      if (!session.isForward) {
        this.startNewRtcSession(session)
      } else {
        this.forwardNewRtcSession(session)
      }
    })
  }

  /**
   * Starts new connection session.
   *
   * @public
   * @memberof Call
   */
  public startNewRtcSession(session: RtcSession): void {
    this.startTime = window.performance.now()

    Log.log('Start new session with ID: ', session.id)
    if (StringUtils.isEmpty(session.id)) {
      Log.fatal('No sessionId from the remote peer.')
      return
    }

    this.createPcClient(session)
      .then((pcClient: PeerConnectionClient): void => {
        if (this.localStream) {
          pcClient.addStream(this.localStream)
        }
        if (session.isInitiator) {
          this.startupAsInitiator(pcClient)
          return
        }
        const started: boolean = pcClient.startAsReceiver(session.messages)
        if (!started) {
          this.startRetryConsumeManager(pcClient)
        }
      })
      .catch((reason: any): void => {
        this.onError(`Create PeerConnection exception: ${reason}`)
      })
  }

  /**
   * Returns peer connection stats.
   *
   * @param {Function} callback
   * @returns {void}
   * @memberof Call
   */
  public getPeerConnectionStats(callback: any, pcClientId: string): void {
    const pcClient: PeerConnectionClient = this.pcClients.get(pcClientId)
    if (!BaseUtils.isObjectDefined(pcClient)) {
      return
    }
  }

  /**
   * Returns peer connection states.
   *
   * @returns
   * @memberof Call
   */
  public getPeerConnectionStates(pcClientId: string) {
    const pcClient: PeerConnectionClient = this.pcClients.get(pcClientId)
    if (!BaseUtils.isObjectDefined(pcClient)) {
      return null
    }
    return pcClient.getPeerConnectionStates()
  }

  /**
   * Hangs up a call locally.
   *
   * @public
   * @param {boolean} async
   * @returns {Promise<any>}
   * @memberof Call
   */
  public hangup(async: boolean): Promise<any> {
    this.startTime = null
    Log.log('Call::hangup', async)
    if (!!this.localStream) {
      if (typeof this.localStream.getTracks === 'undefined') {
        this.localStream.stop()
      } else {
        this.localStream.getTracks().forEach((track: any): void => {
          track.stop()
        })
      }
      this.localStream = null
    }

    if (!BaseUtils.isObjectDefined(this.room)) {
      Log.log('No room defined.')
      return
    }

    if (!BaseUtils.isObjectDefined(this.room.id)) {
      Log.log('No room ID defined.')
      return
    }

    // close WebRTC peer client
    this.pcClients.forEach((pcClient: PeerConnectionClient) => {
      pcClient.close()
    })

    // Send 'leave' to PyApp. This must complete before saying BYE to other client.
    // When the other client sees BYE it attempts to post offer and candidates to
    // PyApp. PyApp needs to know that we're disconnected at that point otherwise
    // it will forward messages to this client instead of storing them.

    // This section of code is executed in both sync and async depending on
    // where it is called from. When the browser is closed, the requests must
    // be executed as sync to finish before the browser closes. When called
    // from pressing the hang up button, the requests are executed async.

    // If you modify the steps used to hang up a call, you must also modify
    // the clean up queue steps set up in queueCleanupMessages_.');

    const steps: any[] = []
    steps.push({
      step: (): any => {
        // Send POST request to /leave.
        if (this.getLeaveUrl().valid) {
          Log.log('sending leave', this.getLeaveUrl().url)
          return Util.sendUrlRequest('POST', this.getLeaveUrl().url, async)
        }
      },
      errorString: 'Error sending /leave:',
    })
    steps.push({
      step: (): void => {
        // Send bye to the other clients.
        Array.from(this.pcClients).forEach((pcClientPair: any) => {
          const pcClient: PeerConnectionClient = pcClientPair[1]
          this.sendToOther(pcClient.getSession().otherClientId, {
            type: PeerConnectionResponseType.BYE,
            clientId: this.params.clientID,
            sessionId: pcClient.getSessionId(),
          })
          this.pcClients.delete(pcClient.getId())
        })
        // request current sessons and sends session update for collider applicaion.
      },
      errorString: 'Error sending bye:',
    })
    steps.push({
      step: (): any => {
        // Close signaling channel.
        Log.log('close WS collider from hangup ', async)
        return this.colliderService.close(async)
      },
      errorString: 'Error closing signaling channel:',
    })
    steps.push({
      step: (): void => {
        // the room stays as it is, no need to introduce new one
        // this.params.previousRoomID = this.room.id;
        // this.params.roomID = this.room.id = null;
        this.params.clientID = null
      },
      errorString: 'Error setting params:',
    })

    if (async) {
      const errorHandler: any = (errorString: string): void => {
        Log.warn(errorString)
      }
      let promise: Promise<any> = Promise.resolve()
      for (const step of steps) {
        promise = promise
          .then((): void => {
            step.step.call(this)
          })
          .catch((reason: string): void => {
            Log.log(reason, step.errorString)
            errorHandler(step.errorString)
          })
      }

      return promise
    }
    // Execute the cleanup steps.
    const executeStep = (executor: any, errorString: string): void => {
      try {
        executor()
      } catch (ex) {
        Log.log(errorString + ' ' + ex)
      }
    }

    for (const step of steps) {
      executeStep(step.step, step.errorString)
    }

    if (
      BaseUtils.isObjectDefined(this.room.id) ||
      BaseUtils.isObjectDefined(this.params.clientID)
    ) {
      Log.log(
        'ERROR: sync cleanup tasks did not complete successfully.',
        this.room.id,
        this.params.clientID
      )
    } else {
      Log.log('Cleanup completed.')
    }
    return Promise.resolve()
  }

  /**
   * Handles remote hang up.
   *
   * @public
   * @memberof Call
   */
  public onRemoteHangup(sessionId: string): void {
    this.startTime = null
    // On remote hangup this client becomes the new initiator.
    const pcClient: PeerConnectionClient = this.pcClients.get(sessionId)
    if (!BaseUtils.isObjectDefined(pcClient)) {
      Log.warn(
        `Call::onRemoteHangup pcClient identified by sessionId ${sessionId} doesn't exist.
        Not initializing new connection.`
      )
      return
    }
    // this.requestSessionUpdate();
    pcClient.close()
    this.pcClients.delete(sessionId)

    const sessionInit: SessionInit = new SessionInit()
    sessionInit.addSession(
      new RtcSession(
        pcClient.getSession().id,
        StringUtils.EMPTY,
        StringUtils.EMPTY,
        true
      )
    )
    this.startRtcSignaling(sessionInit)
  }

  /**
   * Handles remote hangup.
   *
   * @param {string} clientId
   * @returns {string}
   * @memberof Call
   */
  public onRemoteHangupByClientId(clientId: string): string {
    let sessionId: string = StringUtils.EMPTY
    Array.from(this.pcClients).forEach((pcClientPair: any) => {
      const pcClient: PeerConnectionClient = pcClientPair[1]
      if (pcClient.getSession().otherClientId === clientId) {
        this.onRemoteHangup(pcClient.getSession().id)
        sessionId = pcClient.getSession().id
      }
    })
    return sessionId
  }

  /**
   * Sets other client's session ID for a particular peer connection client.
   *
   * @param {RegisterOptions} registerOptions
   * @memberof Call
   */
  public setSessionOtherClientId(
    registerOptions: RegisterOptions
  ): Promise<any> {
    return new Promise((resolve: any, reject: any) => {
      const pcClient: PeerConnectionClient = this.pcClients.get(
        registerOptions.sessionId
      )
      Log.log('Call::setSessionOtherClientId client?', !!pcClient)
      if (BaseUtils.isObjectDefined(pcClient)) {
        const session: RtcSession = pcClient.getSession()
        session.otherClientId = registerOptions.clientId
        pcClient.setSession(session)
        Log.log('Call::setSessionOtherClientId updated')
      
        if (pcClient.requireDataConsume) {
          const retryConsumeManager: RetryConsumeManager =
            this.retryConsumeManagers.get(session.id)
          retryConsumeManager.next()
        }
      } else {
        Log.log('No client.')
      }

      resolve()
    })
  }

  public onRemoteIceComplete(data: any) {
    const sessionId: string = data.sessionId
    const candidates: any[] = data.candidates
    const pcClient: PeerConnectionClient = this.pcClients.get(sessionId)
    pcClient.onRemoteIceComplete(candidates)
  }

  public consumeRemoteMessages(pcClient: PeerConnectionClient): void {
    pcClient.requireDataConsume = false
    this.colliderService.touch(this.params.roomID, this.params.clientID)
    this.post(
      `/consume/${this.params.roomID}/${pcClient.getSessionId()}/${
        this.params.clientID
      }`
    ).then((result: any) => {
      if (!result) {
        return
      }
      const resultJson: any = JSON.parse(result)
      const messages: any[] = resultJson.messages
      messages.forEach((message) => {
        Log.log('%%% consumeRemoteMessages %%%', message)
        pcClient.receiveSignalingMessage(message)
      })
    })
  }

  /**
   * Request session update in go app.
   *
   * @private
   * @memberof Call
   */
  private async requestSessionUpdate() {
    /*const sessions: string = await this.flushSessions(null, null);
    if (!!sessions) {
      const sessionsJson: any = Util.parseJSON(sessions);
      const sessionsList: string[] = [];
      Log.log("sessions", sessionsJson.sessions);
      this.colliderService.updateSession(sessionsJson.sessions);
    }*/
  }

  /**
   *  Requests sessions list from py app.
   *
   * @private
   * @returns {Promise<string>}
   * @memberof Call
   */
  private onLocalIceComplete(data: any): any {
    const session: RtcSession = data.session
    this.post(`/sessions-getter/${this.params.roomID}`)
    Log.log(
      'onLocalIceComplete requireDataConsume',
      data.pcClient.requireDataConsume
    )
    if (data.pcClient.requireDataConsume) {
      this.startRetryConsumeManager(data.pcClient)
    }
  }

  /**
   * Starts retry consume manager.
   *
   * @private
   * @param {PeerConnectionClient} pcClient
   * @memberof Call
   */
  private startRetryConsumeManager(pcClient: PeerConnectionClient) {
    let retryConsumeManager: RetryConsumeManager =
      this.retryConsumeManagers.get(pcClient.getSessionId())
    if (BaseUtils.isObjectDefined(retryConsumeManager)) {
      return
    }

    retryConsumeManager = new RetryConsumeManager(
      this.colliderService,
      pcClient,
      this.params.roomID,
      this.params.clientID
    )
    retryConsumeManager.addEventListener(
      RetryJobEvent.COMPLETE,
      () => {
        Log.log('Job complete.')
        this.retryConsumeManagers.delete(pcClient.getSessionId())
      },
      this
    )
    retryConsumeManager.start()

    this.retryConsumeManagers.set(pcClient.getSessionId(), retryConsumeManager)
  }

  /**
   * Sets local video track as camera.
   *
   * @private
   * @memberof Call
   */
  private setLocalVideoTrackAsCamera() {
    if (!!this.displayTrack) {
      this.localStream.removeTrack(this.displayTrack)
    }
    if (!this.localStream.getTrackById(this.cameraTrack.id)) {
      this.localStream.addTrack(this.cameraTrack)
    }
  }

  /**
   * Adds camera tracks to all the peer connections.
   *
   * @private
   * @memberof Call
   */
  private addCameraTracks(): void {
    this.setLocalVideoTrackAsCamera()
    this.pcClients.forEach((pcClient: PeerConnectionClient) => {
      pcClient.addVideoTrack(this.cameraTrack)
    })
  }

  /**
   * Sends a message to other client.
   *
   * @private
   * @param {string} otherClientId
   * @param {*} message
   * @memberof Call
   */
  private sendToOther(otherClientId: string, message: any): void {
    const msgString: string = JSON.stringify(message)
    this.colliderService.sendToOther(
      this.params.roomID,
      this.params.clientID,
      otherClientId,
      msgString
    )
  }

  /**
   * Sends response via signling channel.
   *
   * @private
   * @param {*} options
   * @memberof Call
   */
  private sendResponse(otherClientId: string, options: any): void {
    const responseOptions: any = {
      type: 'response',
      body: options,
    }
    if (StringUtils.isNotEmpty(otherClientId)) {
      this.sendToOther(otherClientId, responseOptions)
      return
    }
    this.send(responseOptions)
  }

  /**
   * Startups connection as initiator.
   *
   * @private
   * @param {PeerConnectionClient} pcClient
   * @memberof Call
   */
  private startupAsInitiator(pcClient: PeerConnectionClient): void {
    if (!this.hasAnyActiveSession()) {
      this.dispatchEvent(CallEvent.CALLER_STARTED, this.room)
    }
    pcClient.startAsInitiator(this.params.offerOptions)
  }

  /**
   * Forwards session initialization to a remote peer.
   *
   * @private
   * @param {RtcSession} session
   * @memberof Call
   */
  private forwardNewRtcSession(session: RtcSession) {
    const options: SessionOptions = new SessionOptions()
    const otherClientId: string = session.otherClientId

    session.isForward = false
    session.otherClientId = this.params.clientID
    options.session = session

    this.sendResponse(otherClientId, options)
  }

  /**
   * Creates peer connection if not exists.
   * Generates ECDSA certificates.
   *
   * @private
   * @returns {Promise<void>}
   * @memberof Call
   */
  private createCertificate(): Promise<void> {
    return new Promise((resolve: any, reject: any): void => {
      if (this.isCertificateGenerated) {
        resolve()
        return
      }

      if (
        typeof (RTCPeerConnection as any).generateCertificate === 'function'
      ) {
        const certParams: object = { name: 'ECDSA', namedCurve: 'P-256' }
        ;(RTCPeerConnection as any)
          .generateCertificate(certParams)
          .then((certificate: RTCCertificate): void => {
            Log.log('ECDSA certificate generated successfully.')
            this.params.peerConnectionConfig.certificates = [certificate]
            this.isCertificateGenerated = true
            resolve()
          })
          .catch((reason: string): void => {
            Log.log('ECDSA certificate generation failed.')
            reject(reason)
          })
      } else {
        resolve()
      }
    })
  }

  /**
   * Creates new peer connection client.
   *
   * @private
   * @returns {Promise<PeerConnectionClient>}
   * @memberof Call
   */
  private createPcClient(session: RtcSession): Promise<PeerConnectionClient> {
    return new Promise((resolve: any) => {
      let pcClient: PeerConnectionClient = this.pcClients.get(session.id)
      if (BaseUtils.isObjectDefined(pcClient)) {
        Log.log(
          'Call::createPcClient ',
          session.id,
          pcClient.requireDataConsume,
          ' pc client already exists. resolving.'
        )
        resolve(pcClient)
        return
      }
      Log.log(
        `Call::createPcClient ${session.id} pc client not exists. creating.`
      )
      pcClient = new PeerConnectionClient(this.params, this.startTime, session)
      this.pcClients.set(session.id, pcClient)
      pcClient.init().then(() => {
        this.addPeerConnectionClientEvents(pcClient)
        resolve(pcClient)
      })
    })
  }

  /**
   * Adds peer connection client events
   *
   * @private
   * @param {PeerConnectionClient} pcClient
   * @memberof Call
   */
  private addPeerConnectionClientEvents(pcClient: PeerConnectionClient) {
    pcClient.addEventListener(
      PeerConnectionClientEvent.SIGNALING_MESSAGE,
      (data: any) => {
        Log.log("send SIGNALING_MESSAGE", data, pcClient.getSession(), pcClient.ifSendAsPyMessage())
        this.sendSignalingMessage(
          data,
          pcClient.getSession(),
          pcClient.ifSendAsPyMessage()
        )
      },
      this
    )
    pcClient.addEventListener(
      PeerConnectionClientEvent.REMOTE_SDP_PROTOCOL_RECEIVED,
      (data: any) => {
        // TODO identify RTC client as remote session id
        this.dispatchEvent(CallEvent.REMOTE_SDP_PROTOCOL_RECEIVED, data)
      },
      this
    )
    pcClient.addEventListener(
      PeerConnectionClientEvent.REMOTE_STREAM_ADDED,
      (data: any) => {
        this.dispatchEvent(CallEvent.REMOTE_STREAM_ADDED, data)
      },
      this
    )
    pcClient.addEventListener(
      PeerConnectionClientEvent.SIGNALING_STATE_CHANGE,
      (): void => {
        this.dispatchEvent(CallEvent.SIGNALING_STATE_CHANGE)
      },
      this
    )
    pcClient.addEventListener(
      PeerConnectionClientEvent.ICE_CONNECTION_STATE_CHANGE,
      (): void => {
        this.dispatchEvent(CallEvent.ICE_CONNECTION_STATE_CHANGE)
      },
      this
    )
    pcClient.addEventListener(
      PeerConnectionClientEvent.NEW_ICE_CANDIDATE,
      (data: any): void => {
        this.dispatchEvent(CallEvent.NEW_ICE_CANDIDATE, data)
      },
      this
    )
    pcClient.addEventListener(
      PeerConnectionClientEvent.ICE_GATHERING_COMPLETE,
      (data: any): void => {
        data.pcClient = pcClient
        this.onLocalIceComplete(data)
      },
      this
    )
    pcClient.addEventListener(
      PeerConnectionClientEvent.ERROR,
      (message: string) => {
        this.onError(message)
      },
      this
    )
    pcClient.addEventListener(
      PeerConnectionClientEvent.CREATE_OFFER_SUCCESS,
      (session: RtcSession) => {
        const options: RegisterOptions = new RegisterOptions()
        options.clientId = this.params.clientID
        options.sessionId = session.id
        options.type = 'offer'
        options.uuid = StringUtils.uuidv4()
        Log.log('Call:: sending offer', session.otherClientId, options)
        this.sendResponse(session.otherClientId, options)
      },
      this
    )
    pcClient.addEventListener(
      PeerConnectionClientEvent.CREATE_ANSWER_SUCCESS,
      (session: RtcSession) => {
        const options: RegisterOptions = new RegisterOptions()
        options.clientId = this.params.clientID
        options.sessionId = session.id
        options.type = 'answer'
        options.uuid = StringUtils.uuidv4()
        if (session.otherClientId !== '') {
          Log.log('Call:: sending answer', session.otherClientId, options)
          this.sendResponse(session.otherClientId, options)
        }
      },
      this
    )
  }

  /**
   * Changes call bandwidth.
   *
   * @private
   * @param {string} bandwidth
   * @returns
   * @memberof Call
   */
  private changeBandwidth(bandwidth: string) {
    if (
      (adapter.browserDetails.browser === 'chrome' ||
        adapter.browserDetails.browser === 'safari' ||
        (adapter.browserDetails.browser === 'firefox' &&
          adapter.browserDetails.version >= 64)) &&
      'RTCRtpSender' in window &&
      'setParameters' in window.RTCRtpSender.prototype
    ) {
      this.pcClients.forEach((pcClient: PeerConnectionClient) => {
        pcClient.changeBandwidth(bandwidth)
      })

      return
    }
  }

  /**
   * Sends signaling message consumed from peer connection client.
   * Initiator sends to PyApp, receiver to Collider.
   *
   * @private
   * @param {*} message
   * @param {RtcSession} session
   * @param {boolean} [sendAsPyMessage=false]
   * @memberof Call
   */
  private sendSignalingMessage(
    message: any,
    session: RtcSession,
    sendAsPyMessage: boolean = false
  ): void {
    const msgString: string = JSON.stringify(message)
    if (sendAsPyMessage) {
      // Initiator posts all messages to PyApp. PyApp will either store the messages
      // until the other client connects, or forward the message to Collider if
      // the other client is already connected.
      // Must append query parameters in case we've specified alternate WSS url.
      let path: string = this.room.server
      if (StringUtils.isNotEmpty(session.id)) {
        path = `${path}/sessionmessage/${this.room.id}/${session.id}`
      } else {
        path = `${path}/message/${this.room.id}`
      }
      path = `${path}/${this.params.clientID}${window.location.search}`
      this.post(path, msgString)
    } else {
      if (StringUtils.isNotEmpty(session.otherClientId)) {
        this.colliderService.sendToOther(
          this.params.roomID,
          this.params.clientID,
          session.otherClientId,
          msgString
        )
      } else {
        this.colliderService.send(msgString)
      }
    }
  }
  /**
   * Handles error message.
   *
   * @private
   * @param {any} message
   * @memberof Call
   */
  private onError(message: any): void {
    this.dispatchEvent(CallEvent.ERROR, message)
  }

  /**
   * Returns leave URL.
   *
   * @private
   * @returns {string}
   * @memberof Call
   */
  private getLeaveUrl(clientId: string = this.params.clientID): any {
    if (!clientId) {
      return { valid: false }
    }
    return {
      valid: true,
      url: `${this.room.server}/leave/${this.room.id}/${clientId}`,
    }
  }

  /**
   * Checks if call has a single connection only.
   *
   * @private
   * @returns {boolean}
   * @memberof Call
   */
  private hasAnyActiveSession(): boolean {
    let hasActiveRemoteSdp: boolean = false
    this.pcClients.forEach((pcClient: PeerConnectionClient) => {
      hasActiveRemoteSdp = hasActiveRemoteSdp || pcClient.hasActiveRemoteSdp()
    })
    return hasActiveRemoteSdp
  }
}
