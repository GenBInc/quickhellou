import { Util } from "./Util";

/**
 * Loading params.
 *
 * @export
 * @class LoadingParams
 */
export class LoadingParams {
  public errorMessages: string[] = new Array<string>();
  public warningMessages: string[] = new Array<string>();
  public suggestedRoomId: string = Util.randomString(9);
  public roomServer: "https://www.quickhellou.com";
  public connect: boolean = false;
  public roomID: string;
  public roomType: string;

  public previousRoomID: string;
  public roomLink: string;
  public clientID: string;

  public isLoopback: boolean;
  public sessionId: string;
  public sessions: string[];

  public wssUrl: string;
  public wssPostUrl: string;

  public versionInfo: string;

  public peerConnectionConfig: any;
  public peerConnectionConstraints: any;
  public mediaConstraints: any;
  public iceServerRequestUrl: any;
  public iceServerTransports: any;

  public offerOptions: any;
  public bypassJoinConfirmation: any;

  public audioSendBitrate: string;
  public audioSendCodec: string;
  public audioRecvBitrate: string;
  public audioRecvCodec: string;
  public opusMaxPbr: string;
  public opusFec: string;
  public opusDtx: string;
  public opusStereo: string;
  public videoSendBitrate: string;
  public videoSendInitialBitrate: string;
  public videoSendCodec: string;
  public videoRecvBitrate: string;
  public videoRecvCodec: string;
  public videoFec: string;

  public messages: any[];

  public paramsFunction: any;
  public additionalParam: string;
}
