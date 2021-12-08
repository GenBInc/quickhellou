import { StringUtils } from "../../../genb/base/utils/StringUtils";
import { Util } from "../../Util";
import { Log } from "../../../genb/base/utils/Log";

/**
 * Peer connection response types.
 *
 * @export
 * @class PeerConnectionResponseType
 */
export class PeerConnectionResponseType {
  public static RESPONSE: string = "response";
  public static ANSWER: string = "answer";
  public static OFFER: string = "offer";
  public static CANDIDATE: string = "candidate";
  public static BROADCAST: string = "broadcast";
  public static TEXT_CHAT_MESSAGE: string = "text-chat-message";
  public static BYE: string = "bye";
  public static PING: string = "ping";
  public static UNREACHABLE_CLIENT: string = "unreachable_client";
  public static REMOTE_ICE_COMPLETE: string = "remote_ice_complete";

  public static isType(type: string, otherType: string): boolean {
    return StringUtils.equals(type, otherType);
  }

  public static isResponse(type: string): boolean {
    return this.isType(this.RESPONSE, type);
  }

  public static isAnswer(type: string): boolean {
    return this.isType(this.ANSWER, type);
  }

  public static isOffer(type: string): boolean {
    return this.isType(this.OFFER, type);
  }

  public static isCandidate(type: string): boolean {
    return this.isType(this.CANDIDATE, type);
  }

  public static isBye(type: string): boolean {
    return this.isType(this.BYE, type);
  }

  public static isTextChatMessage(messageJson: any): boolean {
    if (this.isType(this.BROADCAST, messageJson.type)) {
      const bodyJson: any = Util.parseJSON(messageJson.body);
      return this.isType(this.TEXT_CHAT_MESSAGE, bodyJson.type);
    }
    return false;
  }

  public static isRemoteIceComplete(type: string): boolean {
    return this.isType(this.REMOTE_ICE_COMPLETE, type);
  }

  /**
   * Checks if response is a ping type call.
   *
   * @static
   * @param {string} type
   * @returns {boolean}
   * @memberof PeerConnectionResponseType
   */
  public static isPing(type: string): boolean {
    return this.isType(this.PING, type);
  }

  public static isUnreachableClient(type: string): boolean {
    return this.isType(this.UNREACHABLE_CLIENT, type);
  }
}
