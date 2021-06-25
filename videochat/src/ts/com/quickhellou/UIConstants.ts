import { TextChatUIConstants } from "./TextChatUIConstants";
import { RoomSelectionUIConstants } from "./RoomSelectionUIConstants";

export class UIConstants {
  public static confirmJoinButton: string = ".confirm-join-button";
  public static confirmJoinDiv: string = ".confirm-join-div";
  public static confirmJoinRoomSpan: string = ".confirm-join-room-span";
  public static fullscreenSvg: string = ".fullscreen";
  public static hangupSvg: string = ".button--hangup";
  public static icons: string = ".icons";
  public static infoDiv: string = ".info-div";
  public static localVideo: string = ".local-video";
  public static miniVideo: string = ".mini-video";
  public static muteAudioSvg: string = ".mute-audio";
  public static muteVideoSvg: string = ".mute-video";
  public static newRoomButton: string = ".new-room-button";
  public static remoteVideo: string = ".remote-video";
  public static textChatButton: string = ".button--chat-window";
  public static rejoinButton: string = ".rejoin-button";
  public static rejoinDiv: string = ".rejoin-div";
  public static roomLinkHref: string = ".room-link-href";
  public static roomLinkHrefWaiting: string = ".room-link-href-waiting";
  public static sharingDiv: string = ".sharing-div";
  public static statusDiv: string = ".status-div";
  public static videosDiv: string = ".view--videos";
  public static hellouLogoFooterDiv: string = ".quickhellou-logo-footer";
  public static overlayDiv: string = ".overlay";
  public static overlayWaitingDiv: string = ".overlay-waiting";
  public static closeOverlayButton: string = ".invite-waiting-button--thanks";
  public static textChat: TextChatUIConstants = new TextChatUIConstants();
  public static roomSelection: RoomSelectionUIConstants = new RoomSelectionUIConstants();
}
