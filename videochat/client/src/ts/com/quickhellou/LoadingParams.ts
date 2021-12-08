import { Util } from './Util'
import { BaseUtils } from '../genb/base/utils/BaseUtils'
/**
 * Loading params.
 *
 * @export
 * @class LoadingParams
 */
export class LoadingParams {
  constructor(roomId: string) {
    this.roomID = roomId
  }

  /**
   * Loads settings data acquired from local service.
   * 
   * @param inlineLoadingParams 
   */
  load(inlineLoadingParams: any) {
    if (BaseUtils.isObjectDefined(inlineLoadingParams)) {
      this.bypassJoinConfirmation = inlineLoadingParams.bypassJoinConfirmation
      this.iceServerRequestUrl = inlineLoadingParams.ice_server_url
      this.errorMessages = inlineLoadingParams.error_messages
      this.warningMessages = inlineLoadingParams.warning_messages
      this.mediaConstraints = inlineLoadingParams.media_constraints
      this.offerOptions = inlineLoadingParams.offer_options
      this.peerConnectionConfig = inlineLoadingParams.pc_config
      this.peerConnectionConstraints = inlineLoadingParams.pc_constraints
      this.roomType = inlineLoadingParams.room_type
      this.wssPostUrl = inlineLoadingParams.wss_post_url
      this.wssUrl = inlineLoadingParams.wss_url
      this.hostUrl = inlineLoadingParams.host_url

      if (BaseUtils.isObjectDefined(inlineLoadingParams.room_id)) {
        this.roomID = inlineLoadingParams.room_id
      }
      if (BaseUtils.isObjectDefined(inlineLoadingParams.room_link)) {
        this.roomLink = inlineLoadingParams.room_link
      }
      if (BaseUtils.isObjectDefined(inlineLoadingParams.additional_param)) {
        this.additionalParam = inlineLoadingParams.additional_param
      }
    }
  }

  public errorMessages: string[] = new Array<string>()
  public warningMessages: string[] = new Array<string>()
  public suggestedRoomId: string = Util.randomString(9)
  public roomServer: 'https://www.quickhellou.com'
  public connect: boolean = false
  public roomID: string
  public roomType: string

  public previousRoomID: string
  public roomLink: string
  public clientID: string

  public isLoopback: boolean
  public sessionId: string
  public sessions: string[]

  public wssUrl: string
  public wssPostUrl: string

  public versionInfo: string

  public peerConnectionConfig: any
  public peerConnectionConstraints: any
  public mediaConstraints: any
  public iceServerRequestUrl: any
  public iceServerTransports: any

  public offerOptions: any
  public bypassJoinConfirmation: any

  public audioSendBitrate: string
  public audioSendCodec: string
  public audioRecvBitrate: string
  public audioRecvCodec: string
  public opusMaxPbr: string
  public opusFec: string
  public opusDtx: string
  public opusStereo: string
  public videoSendBitrate: string
  public videoSendInitialBitrate: string
  public videoSendCodec: string
  public videoRecvBitrate: string
  public videoRecvCodec: string
  public videoFec: string
  public hostUrl: string

  public messages: any[]

  public paramsFunction: any
  public additionalParam: string
}
