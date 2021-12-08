import { LoadingParams } from './LoadingParams'
import { Util } from './Util'
import { SDPUtils } from './SDPUtils'
import { PeerConnectionClientEvent } from './PeerConnectionClientEvent'
import { BaseUtils } from '../genb/base/utils/BaseUtils'
import { Constants } from './Constants'
import { StringUtils } from '../genb/base/utils/StringUtils'
import { FormService } from '../genb/base/services/FormService'
import { PeerConnectionResponseType } from './application/model/PeerConnectionResponseType'
import { Log } from '../genb/base/utils/Log'
import { PeerConnectionIdentity } from './application/model/PeerConnectionIdentity'
import { RtcSession } from './application/model/RtcSession'
import { StatsMonitor } from './application/controller/StatsMonitor'
import { BandwidthLevelUpdateEvent } from './application/events/BandwidthLevelUpdateEvent'
import { BandwidthLevel } from './application/model/BandwidthLevel'

/**
 * Peer connection client (WebRTC).
 *
 * @export
 * @class PeerConnectionClient
 * @extends {EventDispatcherService}
 */
export class PeerConnectionClient extends FormService {
  private static DEFAULT_SDP_OFFER_OPTIONS = {
    offerToReceiveAudio: 1,
    offerToReceiveVideo: 1,
    voiceActivityDetection: false,
  }
  public requireDataConsume: boolean = false

  private params: LoadingParams
  private startTime: number
  private peerConnection: RTCPeerConnection

  private messageQueue: string[]

  private hasRemoteSdp: boolean
  private started: boolean

  private identity: PeerConnectionIdentity
  private session: RtcSession

  private statsMonitor: StatsMonitor

  private localIceCandidates: any[]

  /**
   * Creates an instance of PeerConnectionClient.
   *
   * @param {LoadingParams} params
   * @param {number} startTime
   * @memberof PeerConnectionClient
   */
  constructor(params: LoadingParams, startTime: number, session: RtcSession) {
    super()
    this.params = params
    this.startTime = startTime
    this.identity = new PeerConnectionIdentity()
    this.session = session

    this.localIceCandidates = []
  }

  /**
   * Initializes the client.
   *
   * @returns {Promise<void>}
   * @memberof PeerConnectionClient
   */
  public init(): Promise<void> {
    return new Promise((resolve: any) => {
      // Create an RTCPeerConnection via the polyfill (adapter.js).
      // adapter.js is a shim to insulate apps from spec changes and prefix differences.
      // https://webrtcglossary.com/adapter-js/
      this.peerConnection = new (RTCPeerConnection as any)(
        this.params.peerConnectionConfig,
        this.params.peerConnectionConstraints
      )
      this.peerConnection.onicecandidate = (
        ev: RTCPeerConnectionIceEvent
      ): void => {
        this.onIceCandidate(ev)
      }
      this.peerConnection.ontrack = (ev: RTCTrackEvent): void => {
        this.onRemoteStreamAdded(ev)
      }
      this.peerConnection.onnegotiationneeded = async (event: Event) => {
        this.renegotiate()
      }
      this.peerConnection.onsignalingstatechange = (message): void => {
        this.onSignalingStateChanged()
      }
      this.peerConnection.oniceconnectionstatechange = (message): void => {
        this.onIceConnectionStateChanged()
      }

      this.peerConnection.onstatsended = (message: any): void => {
        Log.log('message', message)
      }

      this.peerConnection.onicegatheringstatechange = (ev: any) => {
        if (this.peerConnection.iceGatheringState === 'complete') {
          this.dispatchEvent(PeerConnectionClientEvent.ICE_GATHERING_COMPLETE, {
            session: this.session,
            candidates: this.localIceCandidates,
          })
          this.localIceCandidates = []
        }
      }

      // is it required?
      window.dispatchEvent(
        new CustomEvent('pccreated', {
          detail: {
            pc: this,
            sessionId: this.params.roomID,
            time: new Date(),
            userId:
              this.params.roomID + (this.session.isInitiator ? '-0' : '-1'),
          },
        })
      )
      this.hasRemoteSdp = false
      this.messageQueue = []
      this.started = false

      this.statsMonitor = new StatsMonitor(this.peerConnection)
      this.statsMonitor.addEventListener(
        BandwidthLevelUpdateEvent.OUTBOUND_LEVEL_CHANGE,
        (data: any) => {
          this.updateOutboundStream(data.level)
        },
        this
      )

      this.statsMonitor.addEventListener(
        BandwidthLevelUpdateEvent.INBOUND_LEVEL_CHANGE,
        (data: any) => {
          this.updateInboundStream(data.level)
        },
        this
      )

      this.statsMonitor.run()
      resolve()
    })
  }

  /**
   * Handles signaling message communication event.
   *
   * @public
   * @param {any} message
   * @returns {void}
   * @memberof PeerConnectionClient
   */
  public receiveSignalingMessage(messageObj: any): void {
    // const messageObj: any = Util.parseJSON(message)
    if (!BaseUtils.isObjectDefined(messageObj)) {
      Log.log('Message object is not defined.')
      return
    }
    const type: string = messageObj.type
    if (
      (this.session.isInitiator && PeerConnectionResponseType.isAnswer(type)) ||
      (!this.session.isInitiator && PeerConnectionResponseType.isOffer(type))
    ) {
      this.hasRemoteSdp = true
      // Always process offer before candidates.
      this.messageQueue.unshift(messageObj)
    } else if (PeerConnectionResponseType.isCandidate(type)) {
      this.messageQueue.push(messageObj)
    }
    this.drainMessageQueue()
  }

  public hasActiveRemoteSdp(): boolean {
    return this.hasRemoteSdp
  }

  /**
   * Adds display media track to the RTCPeerConnection client.
   *
   * @public
   * @param {MediaStreamTrack} track
   * @returns {void}
   * @memberof PeerConnectionClient
   */
  public addVideoTrack(track: MediaStreamTrack): void {
    if (!BaseUtils.isObjectDefined(this.peerConnection)) {
      Log.error('Peer connection is not defined.')
      return
    }
    Promise.all(
      this.peerConnection.getSenders().map((sender: RTCRtpSender) => {
        if (sender.track.kind === 'video') {
          try {
            const parameters = sender.getParameters()
            parameters.degradationPreference = 'maintain-resolution'
            sender.setParameters(parameters).then(() => {
              sender.replaceTrack(track)
            })
          } catch (e) {
            Log.warn('Replace track failure.')
          }
        }
      })
    )
  }

  /**
   * Returns peer connection stats.
   *
   * @public
   * @param {*} callback
   * @returns {void}
   * @memberof PeerConnectionClient
   */
  public getPeerConnectionStats(track: MediaStreamTrack, callback: any): void {
    if (!BaseUtils.isObjectDefined(this.peerConnection)) {
      Log.warn(
        'PeerConnectionClient::getPeerConnectionStats No RTCPeerConnection object.'
      )
      return
    }

    this.peerConnection.getStats(track).then(callback)
  }

  /**
   * Adds a stream to the peer connection to send it to a remote peer.
   *
   * @public
   * @param {MediaStream} stream
   * @returns {void}
   * @memberof PeerConnectionClient
   */
  public addStream(stream: MediaStream): void {
    if (!BaseUtils.isObjectDefined(this.peerConnection)) {
      return null
    }
    stream.getTracks().forEach((track: MediaStreamTrack) => {
      this.peerConnection.addTrack(track, stream)
    })
  }

  /**
   * Returns peer connection states.
   *
   * @public
   * @returns {any}
   * @memberof PeerConnectionClient
   */
  public getPeerConnectionStates(): any {
    if (!BaseUtils.isObjectDefined(this.peerConnection)) {
      return null
    }
    return {
      signalingState: this.peerConnection.signalingState,
      iceGatheringState: this.peerConnection.iceGatheringState,
      iceConnectionState: this.peerConnection.iceConnectionState,
    }
  }

  /**
   * Closes peer connection.
   *
   * @public
   * @returns {void}
   * @memberof PeerConnectionClient
   */
  public close(): void {
    if (!BaseUtils.isObjectDefined(this.peerConnection)) {
      return
    }

    this.peerConnection.close()
    window.dispatchEvent(
      new CustomEvent('pcclosed', {
        detail: {
          pc: this,
          time: new Date(),
        },
      })
    )
    this.peerConnection = null

    this.statsMonitor.stop()
  }

  /**
   * Starts signaling as initiator.
   *
   * @public
   * @param {*} offerOptions
   * @returns {boolean}
   * @memberof PeerConnectionClient
   */
  public startAsInitiator(offerOptions: any): boolean {
    Log.breakpoint('Start as initiator.')
    if (!BaseUtils.isObjectDefined(this.peerConnection)) {
      Log.log('this.peerConnection not defined. return')
      return false
    }
    if (this.started) {
      Log.log('already started. return')
      return false
    }
    this.started = true
    const constraints: RTCOfferOptions = SDPUtils.mergeConstraints(
      PeerConnectionClient.DEFAULT_SDP_OFFER_OPTIONS,
      offerOptions
    )
    this.peerConnection
      .createOffer(constraints)
      .then((sessionDescriptionInit: RTCSessionDescriptionInit): any => {
        this.setLocalSdpAndNotify(sessionDescriptionInit).then(() => {
          this.dispatchEvent(
            PeerConnectionClientEvent.CREATE_OFFER_SUCCESS,
            this.session
          )
        })
      })
      .catch((reason: string): void =>
        this.dispatchEvent(
          PeerConnectionClientEvent.ERROR,
          `ERROR:createOffer => ${reason}`
        )
      )

    return true
  }

  /**
   * Starts signaling when another peer is present.
   *
   * @param {any} initialMessages
   *              SDP and type data
   * @returns {boolean}
   *              is process successful
   * @memberof PeerConnectionClient
   */
  public startAsReceiver(initialMessages: object[]): boolean {
    Log.breakpoint('Start as receiver.')
    if (!BaseUtils.isObjectDefined(this.peerConnection)) {
      return false
    }

    if (this.started) {
      return false
    }

    this.started = true
    if (
      BaseUtils.isObjectDefined(initialMessages) &&
      initialMessages.length > 0
    ) {
      // Convert received messages to JSON objects and add them to the message
      // queue.
      initialMessages.forEach((message) => {
        Log.log('proceed with initial message', message)
        this.receiveSignalingMessage(message)
      })
      return true
    }

    // We may have queued messages received from the signaling channel before
    // started.
    if (this.messageQueue.length > 0) {
      Log.log('*** have already queued messages so drain them ***')
      this.drainMessageQueue()
    } else {
      Log.log('*** requires remote data to consume ***')
      this.requireDataConsume = true
      return false
    }
    return true
  }

  public getSessionId(): string {
    return this.session.id
  }

  /**
   * Gets the session.
   *
   * @returns {RtcSession}
   * @memberof PeerConnectionClient
   */
  public getSession(): RtcSession {
    return this.session
  }

  /**
   * Sets the session.
   *
   * @public
   * @param {RtcSession} session
   * @memberof PeerConnectionClient
   */
  public setSession(session: RtcSession): void {
    this.session = session
  }

  /**
   * Returns true if send message using memorystore channel.
   *
   * @public
   * @returns {boolean}
   * @memberof PeerConnectionClient
   */
  public ifSendAsPyMessage(): boolean {
    if (!this.session.isInitiator) {
      return false
    }

    if (StringUtils.isNotEmpty(this.session.otherClientId)) {
      return false
    }

    return true
  }

  /**
   * Gets identity token.
   *
   * @public
   * @returns {string}
   * @memberof PeerConnectionClient
   */
  public getId(): string {
    return this.session.id
  }

  /**
   * Changes connection bandwidth.
   *
   * @param {string} bandwidth
   * @memberof PeerConnectionClient
   */
  public changeBandwidth(bandwidth: string): void {
    const sender: RTCRtpSender = this.peerConnection.getSenders()[0]
    const parameters: RTCRtpSendParameters =
      sender.getParameters() as RTCRtpSendParameters
    if (!parameters.encodings) {
      parameters.encodings = [{ rid: StringUtils.EMPTY }]
    }
    if (
      bandwidth === 'unlimited' &&
      parameters.encodings[0].maxBitrate !== undefined
    ) {
      delete parameters.encodings[0].maxBitrate
    } else {
      ;(parameters.encodings[0] as any).degradationPreference =
        'maintain-resolution'
      parameters.encodings[0].maxBitrate = Number(bandwidth) * 1000
      parameters.encodings[0].scaleResolutionDownBy = 8
    }
    parameters.degradationPreference = 'maintain-resolution'
    sender
      .setParameters(parameters)
      .catch((reason: any) => Log.error('error', reason))
  }

  public onRemoteIceComplete(candidateMessages: any[]) {
    Log.log('state', this.peerConnection.connectionState)
    Log.log('candidates', candidateMessages)
  }

  /**
   * Updates outbound stream with a new bitrate level.
   *
   * @private
   * @param {string} level
   * @memberof PeerConnectionClient
   */
  private updateOutboundStream(level: string): void {
    this.changeBandwidth(BandwidthLevel.getBitrate(level))
  }

  private updateInboundStream(level: string): void {
    this.changeBandwidth(BandwidthLevel.getBitrate(level))
    return
  }

  /**
   * Renegotiates session.
   * Note: No need to handle this unless using EdgeHTML browser.
   *
   * @private
   * @memberof PeerConnectionClient
   */
  private async renegotiate() {
    Log.log('Negotiation needed.')
    // not implemented
  }

  /**
   * Sets remote SDP.
   *
   * @private
   * @param {*} message
   * @memberof PeerConnectionClient
   */
  private setRemoteSdp(message: any): void {
    message.sdp = SDPUtils.maybeSetOpusOptions(message.sdp, this.params)
    message.sdp = SDPUtils.maybePreferAudioSendCodec(message.sdp, this.params)
    message.sdp = SDPUtils.maybePreferVideoSendCodec(message.sdp, this.params)
    message.sdp = SDPUtils.maybeSetAudioSendBitRate(message.sdp, this.params)
    message.sdp = SDPUtils.maybeSetVideoSendBitRate(message.sdp, this.params)
    message.sdp = SDPUtils.maybeSetVideoSendInitialBitRate(
      message.sdp,
      this.params
    )
    message.sdp = SDPUtils.maybeRemoveVideoFec(message.sdp, this.params)
    this.peerConnection
      .setRemoteDescription(new RTCSessionDescription(message))
      .then((): void => {
        this.onSetRemoteDescriptionSuccess()
      })
      .catch((reason: any): void => {
        this.dispatchEvent(
          PeerConnectionClientEvent.ERROR,
          'setRemoteDescription'
        )
      })
  }

  /**
   * Handles remote session description setting success.
   *
   * @private
   * @memberof PeerConnectionClient
   */
  private onSetRemoteDescriptionSuccess(): void {
    // By now all onaddstream events for the setRemoteDescription have fired,
    // so we can know if the peer has any remote video streams that we need
    // to wait for. Otherwise, transition immediately to the active state.
    const remoteStreams: MediaStream[] = this.getRemoteStreams()
    const isRemoteStreamAvailable: boolean = remoteStreams.length > 0
    const isRemoteVideoPlaybackAvailableParam: boolean =
      isRemoteStreamAvailable && remoteStreams[0].getVideoTracks().length > 0
    const isRemoteDisplayMediaAvailableParam: boolean =
      isRemoteStreamAvailable && remoteStreams[0].getVideoTracks().length > 1
    this.dispatchEvent(PeerConnectionClientEvent.REMOTE_SDP_PROTOCOL_RECEIVED, {
      isRemoteDisplayMediaAvailable: isRemoteDisplayMediaAvailableParam,
      isRemoteVideoPlaybackAvailable: isRemoteVideoPlaybackAvailableParam,
      sessionId: this.session.id,
    })
    Log.log('Remote session description setting complete.')
  }

  /**
   * Processes signaling message.
   *
   * @private
   * @param {*} message
   * @returns {Promise<any>}
   * @memberof PeerConnectionClient
   */
  private processSignalingMessage(message: any): Promise<any> {
    return new Promise((resolve: any, reject: any) => {
      Log.info('====> processSignalingMessage', message)
      // if is receiver and get an offer
      if (
        message.type === PeerConnectionResponseType.OFFER &&
        !this.session.isInitiator
      ) {
        if (this.peerConnection.signalingState !== 'stable') {
          Log.warn(
            `Remote offer received in unexpected state:
           ${this.peerConnection.signalingState}`
          )
          resolve()
          return
        }
        this.setRemoteSdp(message)
        this.doAnswer()
        resolve()
        return
      }
      // if is initiator and get an answer
      if (
        message.type === PeerConnectionResponseType.ANSWER &&
        this.session.isInitiator
      ) {
        if (this.peerConnection.signalingState !== 'have-local-offer') {
          Log.warn(
            `Remote answer received in unexpected state:
          ${this.peerConnection.signalingState}`
          )
          resolve()
          return
        }
        this.setRemoteSdp(message)
        resolve()
        return
      }
      if (message.type === 'candidate') {
        const candidate = new RTCIceCandidate({
          candidate: message.candidate,
          sdpMLineIndex: message.label,
        })
        Log.fatal('Remote ICE candidate')
        this.recordIceCandidate('Remote', candidate)
        this.peerConnection
          .addIceCandidate(candidate)
          .then((): void => {
            Log.log('Remote candidate added successfully.')
          })
          .catch((reason: string): void => {
            this.dispatchEvent(
              PeerConnectionClientEvent.ERROR,
              `ERROR:addIceCandidate => ${reason}`
            )
          })
        resolve()
        return
      }
      Log.warn('Unexpected message: ' + JSON.stringify(message))
      reject(JSON.stringify(message))
    })
  }

  /**
   * When we receive messages from PyApp registration and from the WSS connection,
   * we add them to a queue and drain it if conditions are right.
   *
   * @private
   * @returns {void}
   * @memberof PeerConnectionClient
   */
  private async drainMessageQueue() {
    Log.info(
      'drainMessageQueue',
      this.started,
      this.hasRemoteSdp
    )
    // It's possible that we finish registering and receiving messages from WSS
    // before our peer connection is created or started. We need to wait for the
    // peer connection to be created and started before processing messages.
    //
    // Also, the order of messages is in general not the same as the POST order
    // from the other client because the POSTs are async and the server may handle
    // some requests faster than others. We need to process offer before
    // candidates so we wait for the offer to arrive first if we're answering.
    // Offers are added to the front of the queue.
    if (!this.peerConnection || !this.started || !this.hasRemoteSdp) {
      return
    }

    while (this.messageQueue.length > 0) {
      await this.processSignalingMessage(this.messageQueue.shift())
    }

    this.requireDataConsume = false

    this.messageQueue = []
  }

  /**
   * Sends an answer to a remote peer.
   *
   * @private
   * @memberof PeerConnectionClient
   */
  private doAnswer(): void {
    this.peerConnection
      .createAnswer()
      .then((sessionDescription: RTCSessionDescriptionInit): void => {
        this.setLocalSdpAndNotify(sessionDescription).then(() => {
          this.dispatchEvent(
            PeerConnectionClientEvent.CREATE_ANSWER_SUCCESS,
            this.session
          )
        })
      })
      .catch((reason: string): void => {
        this.dispatchEvent(
          PeerConnectionClientEvent.ERROR,
          `ERROR:createAnswer => ${reason}`
        )
      })
  }

  /**
   * Sets local session description protocol (SDP) and sends notification
   * to the RTC server.
   * SDP is used by WebRTC to negotiate the session’s parameters.
   * https://webrtcglossary.com/sdp/
   *
   * @private
   * @param {RTCSessionDescriptionInit} sessionDescriptionInit
   * @memberof PeerConnectionClient
   */
  private setLocalSdpAndNotify(
    sessionDescriptionInit: RTCSessionDescriptionInit
  ): Promise<void> {
    return new Promise((resolve: any) => {
      sessionDescriptionInit.sdp = SDPUtils.maybePreferAudioReceiveCodec(
        sessionDescriptionInit.sdp,
        this.params
      )
      sessionDescriptionInit.sdp = SDPUtils.maybePreferVideoReceiveCodec(
        sessionDescriptionInit.sdp,
        this.params
      )
      sessionDescriptionInit.sdp = SDPUtils.maybeSetAudioReceiveBitRate(
        sessionDescriptionInit.sdp,
        this.params
      )
      sessionDescriptionInit.sdp = SDPUtils.maybeSetVideoReceiveBitRate(
        sessionDescriptionInit.sdp,
        this.params
      )
      sessionDescriptionInit.sdp = SDPUtils.maybeRemoveVideoFec(
        sessionDescriptionInit.sdp,
        this.params
      )

      if (!SDPUtils.isSendRecv(sessionDescriptionInit.sdp)) {
        Log.warn('No local stream is added to the peer connection.')
      } else {
        this.identity.localSessionId = SDPUtils.getMsid(
          sessionDescriptionInit.sdp
        ).replace(/\{|\}/g, '')
      }

      this.peerConnection
        .setLocalDescription(sessionDescriptionInit)
        .then((): void => {
          Log.log(
            'PeerConnectionClient::setLocalSdpAndNotify Set session description success.'
          )
        })
        .catch((reason: string): void => {
          this.dispatchEvent(
            PeerConnectionClientEvent.ERROR,
            `ERROR::setLocalDescription => ${reason}`
          )
        })

      // Chrome version of RTCSessionDescription can't be serialized directly
      // because it JSON.stringify won't include attributes which are on the
      // object's prototype chain. By creating the message to serialize
      // explicitly we can avoid the issue.
      this.dispatchEvent(PeerConnectionClientEvent.SIGNALING_MESSAGE, {
        sdp: sessionDescriptionInit.sdp,
        type: sessionDescriptionInit.type,
        sessionId: this.session.id,
      })
      resolve()
    })
  }

  /**
   * Records ICE candidate in applicaton controller.
   *
   * @private
   * @param {string} location
   * @param {RTCIceCandidate} candidate
   * @memberof PeerConnectionClient
   */
  private recordIceCandidate(
    locationParameter: string,
    candidate: RTCIceCandidate
  ): void {
    this.dispatchEvent(PeerConnectionClientEvent.NEW_ICE_CANDIDATE, {
      candidate: candidate.candidate,
      location: locationParameter,
    })
    if (locationParameter === 'Local') {
      this.localIceCandidates.push(candidate)
    }
  }

  /**
   * Handles signaling state change.
   *
   * @private
   * @returns {void}
   * @memberof PeerConnectionClient
   */
  private onSignalingStateChanged(): void {
    if (!BaseUtils.isObjectDefined(this.peerConnection)) {
      return
    }
    Log.log(
      'PeerConnectionClient::onSignalingStateChanged Signaling state changed to: ' +
        this.peerConnection.signalingState
    )
    this.dispatchEvent(PeerConnectionClientEvent.SIGNALING_STATE_CHANGE)
  }

  /**
   * Handles ICE connection state change.
   *
   * @private
   * @returns {void}
   * @memberof PeerConnectionClient
   */
  private onIceConnectionStateChanged(): void {
    if (!BaseUtils.isObjectDefined(this.peerConnection)) {
      return
    }

    Log.log(
      'PeerConnectionClient::onSignalingStateChanged ICE connection state changed to: ' +
        this.peerConnection.iceConnectionState
    )
    if (
      StringUtils.equals(this.peerConnection.iceConnectionState, 'completed')
    ) {
      Log.log(
        'ICE complete time: ' +
          (window.performance.now() - this.startTime).toFixed(0) +
          'ms.'
      )
    }

    this.dispatchEvent(PeerConnectionClientEvent.ICE_CONNECTION_STATE_CHANGE)
  }

  /**
   * Handles ICE candicate offer.
   *
   * @private
   * @param {RTCPeerConnectionIceEvent} event
   * @memberof PeerConnectionClient
   */
  private onIceCandidate(event: RTCPeerConnectionIceEvent): void {
    if (event.candidate) {
      // Drop undesired candidates.
      if (this.filterIceCandidate(event.candidate)) {
        const message: any = {
          type: 'candidate',
          label: event.candidate.sdpMLineIndex,
          id: event.candidate.sdpMid,
          candidate: event.candidate.candidate,
          sessionId: this.session.id,
        }
        Log.breakpoint('Local ICE candidate')
        this.dispatchEvent(PeerConnectionClientEvent.SIGNALING_MESSAGE, message)
        this.recordIceCandidate('Local', event.candidate)
      }
    } else {
      Log.log('End of candidates.')
    }
  }

  /**
   * Checks if candidate should be dropped.
   *
   * @private
   * @param {RTCIceCandidate} candidate
   * @returns {boolean}
   * @memberof PeerConnectionClient
   */
  private filterIceCandidate(candidate: RTCIceCandidate): boolean {
    const candidateStr: string = candidate.candidate

    // Always drop TCP candidates. Not needed in this context.
    if (candidateStr.indexOf(Constants.TCP) !== -1) {
      return false
    }

    // If we're trying to drop non-relay candidates, do that.
    if (
      StringUtils.equals(
        this.params.peerConnectionConfig.iceTransports,
        Constants.RELAY
      ) &&
      !StringUtils.equals(
        SDPUtils.iceCandidateType(candidateStr),
        Constants.RELAY
      )
    ) {
      return false
    }

    return true
  }

  /**
   * Handles remote stream added.
   *
   * @private
   * @param {RTCTrackEvent} event
   * @memberof PeerConnectionClient
   */
  private onRemoteStreamAdded(event: RTCTrackEvent): void {
    Log.log('onRemoteStreamAdded', event)
    if (!event || event.type !== 'track') {
      Log.log('onRemoteStreamAdded return ')
      return
    }
    const mediaStream: MediaStream = event.streams[0]
    Log.log('onRemoteStreamAdded pass ', this.session.id, mediaStream)
    this.dispatchEvent(PeerConnectionClientEvent.REMOTE_STREAM_ADDED, {
      sessionId: this.session.id,
      stream: mediaStream,
    })
  }

  /**
   * Returns newly generated stream with remote tracks attached.
   *
   * @private
   * @returns {MediaStream[]}
   * @memberof PeerConnectionClient
   */
  private getRemoteStreams(): MediaStream[] {
    const stream: MediaStream = new MediaStream()
    this.peerConnection.getReceivers().forEach((receiver: RTCRtpReceiver) => {
      stream.addTrack(receiver.track)
    })
    stream.onremovetrack = () => {
      Log.log('Track removed.')
    }
    return [stream]
  }
}
