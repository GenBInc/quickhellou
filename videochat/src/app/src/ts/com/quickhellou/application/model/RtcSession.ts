/**
 * RTC connection session data.
 *
 * @export
 * @class RtcSession
 */
export class RtcSession {
  public id: string;
  public messages: any;
  public otherClientId: string;
  public isInitiator: boolean;
  public isForward: boolean;

  /**
   * Creates an instance of RtcSession.
   *
   * @param {string} id
   * @param {*} messages
   * @param {string} otherClientId
   * @param {boolean} isInitiator
   * @param {boolean} isForward
   * @memberof RtcSession
   */
  constructor(
    id: string,
    messages: any,
    otherClientId: string,
    isInitiator: boolean = false,
    isForward: boolean = false
  ) {
    this.id = id;
    this.messages = messages;
    this.otherClientId = otherClientId;
    this.isInitiator = isInitiator;
    this.isForward = isForward;
  }
}
