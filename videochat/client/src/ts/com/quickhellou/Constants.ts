export class Constants {
  // Action type for remote web socket communication.
  public static WS_ACTION: string = "ws";
  // Action type for remote xhr communication.
  public static XHR_ACTION: string = "xhr";
  // Action type for adding a command to the remote clean up queue.
  public static QUEUEADD_ACTION: string = "addToQueue";
  // Action type for clearing the remote clean up queue.
  public static QUEUECLEAR_ACTION: string = "clearQueue";
  // Web socket action type specifying that an event occured.
  public static EVENT_ACTION: string = "event";

  // Web socket action type to create a remote web socket.
  public static WS_CREATE_ACTION: string = "create";
  // Web socket event type onerror.
  public static WS_EVENT_ONERROR: string = "onerror";
  // Web socket event type onmessage.
  public static WS_EVENT_ONMESSAGE: string = "onmessage";
  // Web socket event type onopen.
  public static WS_EVENT_ONOPEN: string = "onopen";
  // Web socket event type onclose.
  public static WS_EVENT_ONCLOSE: string = "onclose";
  // Web socket event sent when an error occurs while calling send.
  public static WS_EVENT_SENDERROR: string = "onsenderror";
  // Web socket action type to send a message on the remote web socket.
  public static WS_SEND_ACTION: string = "send";
  // Web socket action type to close the remote web socket.
  public static WS_CLOSE_ACTION: string = "close";
  public static TCP: string = "tcp";
  public static RELAY: string = "relay";
}
