export class PeerConnectionClientEvent {
  public static REMOTE_SDP_PROTOCOL_RECEIVED: string = "remote_sdp_protocol_received";
  public static GAE_MESSAGE: string = "gae_message";
  public static SIGNALING_MESSAGE: string = "signaling_message";
  public static REMOTE_HANGUP: string = "remote_hangup";
  public static REMOTE_TEXT_CHAT_MESSAGE: string = "remote_text_chat_message";
  public static SIGNALING_STATE_CHANGE: string = "signaling_state_change";
  public static ICE_GATHERING_COMPLETE: string = "ice_gathering_complete";
  public static NEW_ICE_CANDIDATE: string = "new_ice_candidate";
  public static ICE_CONNECTION_STATE_CHANGE: string = "ice_connection_state_change";
  public static REMOTE_STREAM_ADDED: string = "remote_stream_added";
  public static REGISTERED: string = "registered";
  public static CREATE_OFFER_SUCCESS: string = "create_offer_success";
  public static CREATE_ANSWER_SUCCESS: string = "create_answer_success";
  public static REMOTE_CLIENT_REGISTERED: string = "remote_client_registered";
  public static ERROR: string = "error";
}
