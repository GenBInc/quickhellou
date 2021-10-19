export class CallEvent {
  public static ERROR: string = "error";
  public static STATUS_MESSAGE: string = "status_message";
  public static NEW_ICE_CANDIDATE: string = "new_ice_candidate";
  public static ICE_CONNECTION_STATE_CHANGE: string =
    "ice_connection_state_change";
  public static SIGNALING_STATE_CHANGE: string = "signaling_state_change";
  public static REMOTE_STREAM_ADDED: string = "remote_stream_added";
  public static LOCAL_STREAM_ADDED: string = "local_stream_added";
  public static LOCAL_DISPLAY_MEDIA_TRACK_ADDED: string =
    "local_display_media_track_added";
  public static REMOTE_SDP_PROTOCOL_RECEIVED: string =
    "remote_sdp_protocol_received";
  public static REMOTE_HANGUP: string = "remote_hangup";
  public static WEBSOCKET_CLOSED: string = "websocket_closed";
  public static WSS_RESPONSE: string = "wss_response";
  public static CALLER_STARTED: string = "caller_started";
  public static REMOTE_TEXT_CHAT_MESSAGE: string = "remote_text_chat_message";
  public static REMOTE_CLIENT_REGISTERED: string = "remote_client_registered";
  public static LOCAL_VIDEO_MEDIA_CHANGE: string = "local_video_media_change";
}
