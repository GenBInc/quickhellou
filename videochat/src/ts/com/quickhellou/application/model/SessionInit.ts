import { RtcSession } from "./RtcSession";

/**
 * RTC connection sessions intitlization data.
 *
 * @export
 * @class SessionInit
 */
export class SessionInit {
  public sessions: RtcSession[];

  /**
   * Creates an instance of SessionInit.
   *
   * @memberof SessionInit
   */
  constructor() {
    this.sessions = [];
  }

  /**
   * Adds a session.
   *
   * @param {RtcSession} session
   * @memberof SessionInit
   */
  public addSession(session: RtcSession): void {
    this.sessions.push(session);
  }
}
