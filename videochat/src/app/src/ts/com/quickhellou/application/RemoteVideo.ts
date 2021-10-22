/**
 * Remote video object.
 *
 * @export
 * @class RemoteVideo
 */
export class RemoteVideo {
  public clientId: string;
  public element: HTMLVideoElement;

  /**
   * Creates an instance of RemoteVideo.
   *
   * @param {string} id
   * @param {HTMLVideoElement} element
   * @memberof RemoteVideo
   */
  constructor(clientId: string, element: HTMLVideoElement) {
    this.clientId = clientId;
    this.element = element;
  }
}
