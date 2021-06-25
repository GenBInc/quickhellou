/**
 * Remote web socket (chrome app only)
 *
 * @export
 * @class RemoteWebSocket
 */
export class RemoteWebSocket {
  private wssUrl: string;
  constructor(wssUrl: string, wssPostUrl: string) {
    this.wssUrl = wssUrl;
    /*apprtc.windowPort.addMessageListener(this.handleMessage_.bind(this));
    this.sendMessage_({
      action: Constants.WS_ACTION,
      wsAction: Constants.WS_CREATE_ACTION,
      wssUrl: wssUrl,
      wssPostUrl: wssPostUrl
    });
    this.readyState = WebSocket.CONNECTING;*/
  }
}
