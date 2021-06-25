import { BaseUtils } from "../genb/base/utils/BaseUtils";
import { HTMLUtils } from "../genb/base/utils/HTMLUtils";
import { AppControllerEvent } from "./AppControllerEvent";
import { CallEvent } from "./CallEvent";
import { LoadingParams } from "./LoadingParams";
import { Util } from "./Util";
import { IconSet } from "./IconSet";
import { HTMLTemplates } from "./HTMLTemplates";
import { StringUtils } from "../genb/base/utils/StringUtils";
import { EventDispatcherService } from "../genb/base/services/EventDispatcherService";
import { InvitationView } from "./InvitationView";
import { RemoteVideos } from "./application/RemoteVideos";
import { Room } from "./application/model/Room";
import { RemoteVideosEvent } from "./application/model/RemoteVideosEvent";
import { MediaCommunication } from "./application/controller/MediaCommunication";
import { MediaEvent } from "./application/model/MediaEvent";
import { Log } from "../genb/base/utils/Log";
import { RegisterOptions } from "./application/model/RegisterOptions";
import { ScreenShareButtonComponent } from "./application/controller/ScreenShareButtonComponent";
import { ShareScreenEvent } from "./application/model/ShareScreenEvent";
import { VideoTrackEventOptions } from "./application/model/VideoTrackEventOptions";
import { RoomSelection } from "./RoomSelection";
import { UIConstants } from "./UIConstants";

/**
 * Quick Hellou controller.
 *
 * @export
 * @class AppController
 */
export class AppController extends EventDispatcherService {
  private hangupSvg: HTMLElement;
  private icons: HTMLElement;
  private localVideo: HTMLVideoElement;
  private miniVideo: HTMLVideoElement;
  private sharingDiv: HTMLElement;
  private videosDiv: HTMLElement;
  private roomLinkHref: HTMLLinkElement;
  private roomLinkHrefWaiting: HTMLLinkElement;
  private rejoinDiv: HTMLElement;
  private textChatButton: HTMLElement;
  private rejoinButton: HTMLElement;
  private newRoomButton: HTMLElement;
  private fullscreenIcon: HTMLElement;
  private hellouLogoFooterDiv: HTMLElement;
  private overlayDiv: HTMLElement;
  private overlayWaitingDiv: HTMLElement;
  private closeOverlayButton: HTMLElement;
  private textChatWindow: HTMLElement;
  private textChatCloseButton: HTMLElement;
  private textChatCollapseButton: HTMLElement;
  private textChatMessageList: HTMLElement;
  private textChatInput: HTMLInputElement;

  private loadingParams: LoadingParams;

  private mediaCommunication: MediaCommunication;
  private remoteVideos: RemoteVideos;
  private shareScreenButton: ScreenShareButtonComponent;

  // to revise

  private roomLink: string;
  private localStream: MediaStream;

  // helpers

  private hideIconsAfterTimeout: number;
  private muteAudioIconSet: IconSet;
  private muteVideoIconSet: IconSet;
  private fullscreenIconSet: IconSet;

  /**
   * Creates an instance of AppController.
   * @memberof AppController
   */
  constructor(loadingParams: LoadingParams) {
    super();
    this.loadingParams = loadingParams;
    this.loadUrlParams();
    this.createCommunication();
  }

  /**
   * Intializes the controller.
   *
   * @memberof AppController
   */
  public init(): void {
    Log.log(
      "Initializing; Room ID " +
        (BaseUtils.isObjectDefined(this.loadingParams.roomID)
          ? `= ${this.loadingParams.roomID}`
          : "not defined") +
        "."
    );

    this.hangupSvg = HTMLUtils.get(UIConstants.hangupSvg);
    this.icons = HTMLUtils.get(UIConstants.icons);
    this.localVideo = HTMLUtils.get(UIConstants.localVideo) as HTMLVideoElement;
    this.miniVideo = HTMLUtils.get(UIConstants.miniVideo) as HTMLVideoElement;
    this.sharingDiv = HTMLUtils.get(UIConstants.sharingDiv);
    this.initRemoteVideos();
    this.videosDiv = HTMLUtils.get(UIConstants.videosDiv);
    this.roomLinkHref = HTMLUtils.get(
      UIConstants.roomLinkHref
    ) as HTMLLinkElement;
    this.roomLinkHrefWaiting = HTMLUtils.get(
      UIConstants.roomLinkHrefWaiting
    ) as HTMLLinkElement;
    this.rejoinDiv = HTMLUtils.get(UIConstants.rejoinDiv);
    this.textChatButton = HTMLUtils.get(UIConstants.textChatButton);
    this.rejoinButton = HTMLUtils.get(UIConstants.rejoinButton);
    this.newRoomButton = HTMLUtils.get(UIConstants.newRoomButton);
    this.fullscreenIcon = HTMLUtils.get(UIConstants.fullscreenSvg);
    this.hellouLogoFooterDiv = HTMLUtils.get(UIConstants.hellouLogoFooterDiv);
    this.overlayDiv = HTMLUtils.get(UIConstants.overlayDiv);
    this.overlayWaitingDiv = HTMLUtils.get(UIConstants.overlayWaitingDiv);
    this.closeOverlayButton = HTMLUtils.get(UIConstants.closeOverlayButton);
    this.textChatWindow = HTMLUtils.get(UIConstants.textChat.chatWindow);
    this.textChatCloseButton = HTMLUtils.get(UIConstants.textChat.closeButton);
    this.textChatCollapseButton = HTMLUtils.get(
      UIConstants.textChat.collapseButton
    );
    this.textChatMessageList = HTMLUtils.get(UIConstants.textChat.messageList);
    this.textChatInput = HTMLUtils.get(
      UIConstants.textChat.input
    ) as HTMLInputElement;

    this.newRoomButton.addEventListener(
      "click",
      (): void => {
        this.onNewRoomClick();
      },
      false
    );
    this.rejoinButton.addEventListener(
      "click",
      (): void => {
        this.onRejoinClick();
      },
      false
    );
    this.closeOverlayButton.addEventListener(
      "click",
      (): void => {
        this.onCloseOverlayClick();
      },
      false
    );
    this.textChatButton.addEventListener(
      "click",
      (): void => {
        this.onTextChatButtonClick();
      },
      false
    );
    this.textChatCloseButton.addEventListener(
      "click",
      (): void => {
        this.onTextChatCloseButtonClick();
      },
      false
    );
    this.textChatCollapseButton.addEventListener(
      "click",
      (event: MouseEvent): void => {
        this.onTextChatCollapseButtonClick();
      },
      false
    );
    this.textChatInput.addEventListener(
      "keyup",
      (event: KeyboardEvent): void => {
        this.onTextChatInputKeyUp(event);
      },
      false
    );

    const sendTextChatMessageButton: HTMLElement = HTMLUtils.get(
      ".text-chat-window__send-message-button"
    );
    sendTextChatMessageButton.addEventListener("click", () => {
      this.sendTextChatMessageButtonClickHandler();
    });

    const overlayButtonsList: HTMLElement[] = HTMLUtils.array(
      ".button--send-invitation"
    );

    const sendInvitationCloserButtonList: HTMLElement[] = HTMLUtils.array(
      ".overlay__closer-button"
    );
    sendInvitationCloserButtonList.forEach(
      (sendInvitationCloserButton: HTMLElement) => {
        sendInvitationCloserButton.addEventListener("click", (event): void => {
          this.closeOverlay(
            HTMLUtils.get(`.${sendInvitationCloserButton.dataset.screen}`),
            HTMLUtils.array(
              `.button--overlay[data-screen='${sendInvitationCloserButton.dataset.screen}']`
            )
          );
        });
      }
    );

    overlayButtonsList.forEach((overlayButton: HTMLElement): void => {
      const screen: string = overlayButton.dataset.screen;
      const overlaySelector: string = `.${screen}`;
      const selectedOverlayButtonsList: HTMLElement[] = HTMLUtils.array(
        `.button--overlay[data-screen='${screen}']`
      );
      overlayButton.onclick = (): void => {
        this.closeAllOverlays();
        const sendInvitationOverlay: HTMLElement = HTMLUtils.get(
          overlaySelector
        );
        sendInvitationOverlay.classList.remove("hidden");

        const sendInvitationResult: HTMLElement = HTMLUtils.get(
          `.overlay--${screen}__result`
        );
        sendInvitationResult.classList.add("hidden");
        const sendInvitationResultMessage: HTMLElement = HTMLUtils.get(
          `.overlay--${screen}__result-message`
        );
        sendInvitationResultMessage.innerHTML = "";
        const sendInvitationBody: HTMLElement = HTMLUtils.get(
          `.overlay--${screen}__body`
        );
        sendInvitationBody.classList.remove("hidden");
        selectedOverlayButtonsList.forEach(
          (inviteButton: HTMLElement): void => {
            inviteButton.classList.add("js-active");
          }
        );
      };
    });

    const schedulerButton: HTMLElement = HTMLUtils.get(
      ".button--setup-future-talk"
    );
    schedulerButton.addEventListener("click", (event: any) => {
      const setupFutureTalkOverlay: HTMLElement = HTMLUtils.get(
        ".overlay--setup-future-talk"
      );
      if (BaseUtils.isObjectDefined(setupFutureTalkOverlay)) {
        setupFutureTalkOverlay.classList.remove("hidden");
      }
    });

    this.shareScreenButton = new ScreenShareButtonComponent(
      HTMLUtils.get(".button--share-screen")
    );
    if (!Util.isMobile() && !Util.isEdgeHTML()) {
      this.shareScreenButton.init();
      this.shareScreenButton.addEventListener(
        ShareScreenEvent.START_SHARING,
        () => {
          this.mediaCommunication.displayMedia();
        },
        this
      );

      this.shareScreenButton.addEventListener(
        ShareScreenEvent.STOP_SHARING,
        () => {
          this.mediaCommunication.stopSendingDisplayMedia();
        },
        this
      );

    } else {
      this.shareScreenButton.disableSharingState();
    }

    // send invitation view
    // tslint:disable-next-line:no-unused-expression
    new InvitationView(HTMLUtils.get(".send-invitation"));

    // chat window handlers
    const chatWindowInput: HTMLInputElement = HTMLUtils.get(
      ".text-chat-window__message-input"
    ) as HTMLInputElement;
    chatWindowInput.addEventListener("focusin", (event): void => {
      if (chatWindowInput.value === "Type your message here") {
        chatWindowInput.value = "";
      }
    });

    chatWindowInput.addEventListener("focusout", (): void => {
      if (StringUtils.isEmpty(chatWindowInput.value)) {
        chatWindowInput.value = "Type your message here";
      }
    });

    this.muteAudioIconSet = new IconSet(UIConstants.muteAudioSvg);
    this.muteVideoIconSet = new IconSet(UIConstants.muteVideoSvg);
    this.fullscreenIconSet = new IconSet(UIConstants.fullscreenSvg);

    this.roomLink = StringUtils.EMPTY;
    this.localStream = null;

    this.createCall();

    // If the params has a roomID specified, we should connect to that room
    // immediately. If not, show the room selection UI.
    if (this.loadingParams.roomID) {
      this.updateInvitationLinks(this.loadingParams.roomID);

      if (StringUtils.equals(this.loadingParams.additionalParam, "setup")) {
        this.roomSelectedHander(this.loadingParams.roomID);
      } else {
        // Ask the user to confirm.
        if (!RoomSelection.matchRandomRoomPattern(this.loadingParams.roomID)) {
          // Show the room name only if it does not match the random room pattern.
          const confirmJoinRoomSpanElement: HTMLElement = HTMLUtils.get(
            UIConstants.confirmJoinRoomSpan
          );
          confirmJoinRoomSpanElement.textContent = ` "${this.loadingParams.roomID}"`;
        }
        const confirmJoinDiv: HTMLElement = HTMLUtils.get(
          UIConstants.confirmJoinDiv
        );
        this.show(confirmJoinDiv);

        const confirmJoinButtonElement: HTMLElement = HTMLUtils.get(
          UIConstants.confirmJoinButton
        );
        confirmJoinButtonElement.addEventListener("click", (): void => {
          this.hide(confirmJoinDiv);
          this.setupCall();
        });

        if (this.loadingParams.bypassJoinConfirmation) {
          this.hide(confirmJoinDiv);
          this.setupCall();
        }
      }
    } else {
      Log.warn("Missing RoomID.");
    }

    window.addEventListener("online", (event: Event): void => {
      this.updateOnlineStatus(event);
    });
    window.addEventListener("offline", (event: Event): void => {
      this.updateOnlineStatus(event);
    });

    if (
      StringUtils.isNotEmpty(this.loadingParams.additionalParam) &&
      StringUtils.equals(this.loadingParams.additionalParam, "invite")
    ) {
      this.openSendInvitationOverlay();
    }

    this.dispatchEvent(AppControllerEvent.INITIALIZED);
  }

  /**
   * Creates media communication instance.
   *
   * @private
   * @memberof AppController
   */
  private createCommunication(): void {
    this.mediaCommunication = new MediaCommunication(this.loadingParams);
  }

  /**
   * Opens "Send Invitation" overlay.
   *
   * @private
   * @memberof AppController
   */
  private openSendInvitationOverlay(): void {
    const overlayButtonsList: HTMLElement[] = HTMLUtils.array(
      ".button--overlay"
    );
    overlayButtonsList.forEach((): void => {
      const screen: string = "send-invitation";
      const overlaySelector: string = `.${screen}`;
      const selectedOverlayButtonsList: HTMLElement[] = HTMLUtils.array(
        `.button--overlay[data-screen='${screen}']`
      );
      this.closeAllOverlays();
      const sendInvitationOverlay: HTMLElement = HTMLUtils.get(overlaySelector);
      sendInvitationOverlay.classList.remove("hidden");

      const sendInvitationResult: HTMLElement = HTMLUtils.get(
        `.overlay--${screen}__result`
      );
      sendInvitationResult.classList.add("hidden");
      const sendInvitationResultMessage: HTMLElement = HTMLUtils.get(
        `.overlay--${screen}__result-message`
      );
      sendInvitationResultMessage.innerHTML = "";
      const sendInvitationBody: HTMLElement = HTMLUtils.get(
        `.overlay--${screen}__body`
      );
      sendInvitationBody.classList.remove("hidden");
      selectedOverlayButtonsList.forEach((inviteButton: HTMLElement): void => {
        inviteButton.classList.add("js-active");
      });
    });
  }

  /**
   * Closes all overlays.
   *
   * @private
   * @memberof AppController
   */
  private closeAllOverlays(): void {
    this.closeOverlay(
      HTMLUtils.get(`.send-invitation`),
      HTMLUtils.array(`.button--overlay[data-screen='send-invitation']`)
    );
  }

  /**
   * Closes an overlay.
   *
   * @private
   * @param {HTMLElement} overlay
   * @param {HTMLElement[]} buttons
   * @memberof AppController
   */
  private closeOverlay(overlay: HTMLElement, buttons: HTMLElement[]): void {
    overlay.classList.add("hidden");
    buttons.forEach((inviteButton: HTMLElement): void => {
      inviteButton.classList.remove("js-active");
    });
  }

  private updateOnlineStatus(event: Event): void {
    const status: string = navigator.onLine ? "online" : "offline";
  }

  /**
   * Handles room selection.
   *
   * @private
   * @param {string} roomId
   * @memberof AppController
   */
  private roomSelectedHander(roomId: string): void {
    const roomSelectionDiv: HTMLElement = HTMLUtils.get(
      UIConstants.roomSelection.div
    );

    // patch to set room url before local stream initialization
    const roomLink: string = `${window.location.protocol}//${window.location.host}/r/${roomId}`;
    this.mediaCommunication.setRoom(roomId, roomLink);
    this.pushCallNavigation(new Room(roomId, roomLink));

    if (this.localStream) {
      this.attachLocalStream();
    }

    this.hide(roomSelectionDiv);
    this.createCall();
    this.setupCall();

    const schedulerLinkElement: HTMLLinkElement = HTMLUtils.get(
      "footer .button--setup-future-talk"
    ) as HTMLLinkElement;
    schedulerLinkElement.href = `/scheduler/${roomId}`;
  }

  /**
   * Loads URL parameters into LoadingParams object.
   *
   * @private
   * @memberof AppController
   */
  private loadUrlParams(): void {
    const DEFAULT_VIDEO_CODEC: string = "VP9";
    const urlParams: any = Util.queryStringToDictionary(window.location.search);
    this.loadingParams.audioSendBitrate = urlParams.asbr;
    this.loadingParams.audioSendCodec = urlParams.asc;
    this.loadingParams.audioRecvBitrate = urlParams.arbr;
    this.loadingParams.audioRecvCodec = urlParams.arc;
    this.loadingParams.opusMaxPbr = urlParams.opusmaxpbr;
    this.loadingParams.opusFec = urlParams.opusfec;
    this.loadingParams.opusDtx = urlParams.opusdtx;
    this.loadingParams.opusStereo = urlParams.stereo;
    this.loadingParams.videoSendBitrate = urlParams.vsbr;
    this.loadingParams.videoSendInitialBitrate = urlParams.vsibr;
    this.loadingParams.videoSendCodec = urlParams.vsc;
    this.loadingParams.videoRecvBitrate = urlParams.vrbr;
    this.loadingParams.videoRecvCodec = urlParams.vrc || DEFAULT_VIDEO_CODEC;
    this.loadingParams.videoFec = urlParams.videofec;
  }

  /**
   * Creates a call.
   *
   * @private
   * @returns {void}
   * @memberof AppController
   */
  private createCall(): void {
    this.mediaCommunication.addEventListener(
      CallEvent.WEBSOCKET_CLOSED,
      this.hangup,
      this
    );

    this.mediaCommunication.addEventListener(
      CallEvent.REMOTE_HANGUP,
      (sessionId: string) => {
        this.onRemoteHangup(sessionId);
      },
      this
    );
    this.mediaCommunication.addEventListener(
      CallEvent.REMOTE_SDP_PROTOCOL_RECEIVED,
      (data: any): void => {
        this.onRemoteSdpProtocolReceived(
          data.sessionId,
          data.isRemoteVideoPlaybackAvailable,
          data.isRemoteDisplayMediaAvailable
        );
      },
      this
    );
    this.mediaCommunication.addEventListener(
      CallEvent.REMOTE_STREAM_ADDED,
      (data: any): void => {
        this.onRemoteStreamAdded(data.sessionId, data.stream);
      },
      this
    );
    this.mediaCommunication.addEventListener(
      CallEvent.LOCAL_STREAM_ADDED,
      (stream: MediaStream): void => {
        this.onLocalStreamAdded(stream);
      },
      this
    );
    this.mediaCommunication.addEventListener(
      CallEvent.SIGNALING_STATE_CHANGE,
      (): void => {
        // no code
      },
      this
    );
    this.mediaCommunication.addEventListener(
      CallEvent.ICE_CONNECTION_STATE_CHANGE,
      (): void => {
        // no code
      },
      this
    );
    this.mediaCommunication.addEventListener(
      CallEvent.NEW_ICE_CANDIDATE,
      (data: any): void => {
        // no code
      },
      this
    );
    this.mediaCommunication.addEventListener(
      MediaEvent.DISPLAY_MEDIA_DISPLAYED,
      () => {
        this.shareScreenButton.unlock();
      },
      this
    );
    this.mediaCommunication.addEventListener(
      CallEvent.REMOTE_TEXT_CHAT_MESSAGE,
      (message: string): void => {
        this.onRemoteTextChatMessage(message);
      },
      this
    );
    this.mediaCommunication.addEventListener(
      CallEvent.STATUS_MESSAGE,
      (message: string): void => {
        Log.log(message);
      },
      this
    );
    this.mediaCommunication.addEventListener(
      CallEvent.ERROR,
      (message: string): void => {
        this.displayError(message);
      },
      this
    );
    this.mediaCommunication.addEventListener(
      CallEvent.CALLER_STARTED,
      this.displaySharingInfo,
      this
    );

    this.mediaCommunication.addEventListener(
      CallEvent.REMOTE_CLIENT_REGISTERED,
      (registerOptions: RegisterOptions) => {
        this.onRemoteClientRegistered(registerOptions);
      },
      this
    );

    this.mediaCommunication.addEventListener(
      CallEvent.LOCAL_VIDEO_MEDIA_CHANGE,
      (options: VideoTrackEventOptions) => {
        this.toggleVideoTrack(options);
      },
      this
    );

    this.mediaCommunication.addEventListener(
      ShareScreenEvent.NOT_ALLOWED,
      () => {
        this.shareScreenButton.enableSharingState();
      },
      this
    );

    this.mediaCommunication.createCall();

    this.show(this.hellouLogoFooterDiv);
    this.show(this.videosDiv);
    this.show(this.overlayDiv);
  }

  /**
   * Handles media track toggling.
   *
   * @private
   * @param {VideoTrackEventOptions} options
   * @memberof AppController
   */
  private toggleVideoTrack(options: VideoTrackEventOptions): void {
    const enabledTrack: MediaStreamTrack = options.track;
    this.localStream.getTracks().forEach((track: MediaStreamTrack) => {
      track.enabled = track.id === enabledTrack.id;
    });
    const isCaptureScreenTrack: boolean = StringUtils.equals(
      options.type,
      VideoTrackEventOptions.SCREEN_CAPTURE
    );
    this.shareScreenButton.toggleScreenSharingWithFlag(isCaptureScreenTrack);
    const tracks: MediaStreamTrack[] = [
      ...this.localStream.getAudioTracks(),
      enabledTrack,
    ];
    const stream: MediaStream = new MediaStream(tracks);
    try {
      this.miniVideo.srcObject = stream;
    } catch (e) {
      Log.warn("Unable to attach stream to video element.");
    }

    this.toggleAudioUnMute();
  }

  /**
   * Initializes call setup.
   *
   * @private
   * @memberof AppController
   */
  private setupCall(): void {
    this.mediaCommunication.connect();

    this.setupUI();

    // Call hangup with async = false. Required to complete multiple
    // clean up steps before page is closed.
    window.onbeforeunload = (): void => {
      this.mediaCommunication.hangupCall(false);
    };

    window.onpopstate = (event: any): void => {
      if (!event.state) {
        Log.log("Reloading main page.");
        location.href = location.origin;
      } else {
        // This could be a forward request to open a room again.
        if (event.state.roomLink) {
          location.href = event.state.roomLink;
        }
      }
    };
  }

  /**
   * Attaches local stream.
   *
   * @private
   * @memberof AppController
   */
  private attachLocalStream(): void {
    try {
      this.localVideo.srcObject = this.localStream;
      if (!Util.isMobile() && !Util.isEdgeHTML()) {
        this.shareScreenButton.enableSharingState();
      }
    } catch (e) {
      Log.log("Unable to attach stream to video element.");
    }

    this.activate(this.localVideo);
    this.show(this.icons);
    this.show(this.fullscreenIcon);

    if (this.localStream.getVideoTracks().length === 0) {
      const muteVideoSVGElement: HTMLElement = HTMLUtils.get(
        UIConstants.muteVideoSvg
      );
      this.hide(muteVideoSVGElement);
    }
    if (this.localStream.getAudioTracks().length === 0) {
      const muteAudioSVGElement: HTMLElement = HTMLUtils.get(
        UIConstants.muteAudioSvg
      );
      this.hide(muteAudioSVGElement);
    }
  }

  /**
   * Hangs up connection.
   *
   * @private
   * @memberof AppController
   */
  private hangup(): void {
    Log.log("AppController::hangup (true, from WS)");
    this.hide(this.icons);
    this.transitionToDone();

    // Call hangup with async = true.
    this.mediaCommunication.hangupCall(true);
    // Reset key and mouse event handlers.
    document.onkeypress = null;
    window.onmousemove = null;
  }

  private sendTextChatMessageButtonClickHandler(): void {
    const message: string = this.textChatInput.value
      .trim()
      .replace(/(\r\n|\n|\r)/gm, "");
    if (StringUtils.isNotEmpty(message)) {
      this.addLocalMessageHTML(message);
      this.mediaCommunication.sendLocalChatMessage(message);
      this.textChatInput.value = "";
      this.textChatInput.focus();
    }
  }

  /**
   * Handles new room request event.
   *
   * @private
   * @memberof AppController
   */
  private onNewRoomClick(): void {
    location.href = location.origin;
  }

  /**
   * Handles rejoin event.
   *
   * @private
   * @memberof AppController
   */
  private onRejoinClick(): void {
    this.deactivate(this.rejoinDiv);
    this.hide(this.rejoinDiv);
    this.mediaCommunication.restartCall();
  }

  /**
   * Setups UI.
   *
   * @memberof AppController
   */
  private setupUI(): void {
    this.iconEventSetup();
    window.addEventListener("mousemove", (): void => {
      this.showIcons();
    });
    this.overlayDiv.addEventListener("mousemove", (): void => {
      this.showIcons();
    });
    this.overlayDiv.addEventListener("click", (): void => {
      this.showIcons();
    });

    document.addEventListener("touchstart", (): void => {
      this.showIcons();
    });

    document.addEventListener("click", (): void => {
      this.showIcons();
    });

    const muteAudioSVGElement: HTMLElement = HTMLUtils.get(
      UIConstants.muteAudioSvg
    );
    muteAudioSVGElement.addEventListener("click", (): void => {
      this.toggleAudioMute();
    });

    const muteVideoSVGElement: HTMLElement = HTMLUtils.get(
      UIConstants.muteVideoSvg
    );
    muteVideoSVGElement.addEventListener("click", (): void => {
      this.toggleVideoMute();
    });

    /*
    const fullscreenSVGElement: HTMLElement = HTMLUtils.get(
      UIConstants.fullscreenSvg
    );
    fullscreenSVGElement.addEventListener("click", (): void => {
      this.toggleFullScreen();
    });
*/

    const hangupSVGElement: HTMLElement = HTMLUtils.get(UIConstants.hangupSvg);
    hangupSVGElement.addEventListener("click", (): void => {
      Log.log("hangup click");
      this.hangup();
      this.shareScreenButton.disableSharingState();
      this.closeFullScreen();
    });
/*
    document.addEventListener(
      "fullscreenchange",
      (): void => {
        this.onFullScreenChange();
      },
      false
    );
    document.addEventListener(
      "webkitfullscreenchange",
      (): void => {
        this.onFullScreenChange();
      },
      false
    );
    document.addEventListener(
      "mozfullscreenchange",
      (event: MouseEvent): void => {
        this.onFullScreenChange();
      },
      false
    );
*/
    Util.setUpFullScreen();
  }

  /**
   * Toggles audio unmuting.
   *
   * @private
   * @memberof AppController
   */
  private toggleAudioUnMute(): void {
    this.mediaCommunication.toggleAudioUnMute();
    this.muteAudioIconSet.enable();
  }

  /**
   * Toggles audio muting.
   *
   * @private
   * @memberof AppController
   */
  private toggleAudioMute(): void {
    this.mediaCommunication.toggleAudioMute();
    this.muteAudioIconSet.toggle();
  }

  /**
   * Toggles video muting.
   *
   * @private
   * @memberof AppController
   */
  private toggleVideoMute(): void {
    this.mediaCommunication.toggleVideoMute();
    this.muteVideoIconSet.toggle();
  }

  /**
   * Handles full screen change event.
   *
   * @memberof AppController
   */
  private closeFullScreen(): void {
    const footer: HTMLElement = HTMLUtils.get(".footer");
    const videosWrapList: NodeListOf<HTMLElement> = HTMLUtils.list(
      ".video-columns-wrap, .videos-wrap, .remote-video-wrap"
    );
    footer.classList.remove("hidden");
    videosWrapList.forEach((elem: HTMLElement) => {
      elem.classList.remove("js-fullscreen");
    });
  }

  /**
   * Toggles full screen.
   *
   * @private
   * @memberof AppController
   */
  /*
  private toggleFullScreen(): void {
    const footer: HTMLElement = HTMLUtils.get(".footer");
    const videosWrapList: NodeListOf<HTMLElement> = HTMLUtils.list(
      ".video-columns-wrap, .videos-wrap"
    );
    if (Util.isFullScreen()) {
      Log.log("Exiting fullscreen.");
      footer.classList.remove("hidden");
      videosWrapList.item(0).classList.remove("js-fullscreen");
      videosWrapList.item(1).classList.remove("js-fullscreen");
      Util.cancelFullScreen();
    } else {
      Log.log("Entering fullscreen.");
      footer.classList.add("hidden");
      videosWrapList.item(0).classList.add("js-fullscreen");
      videosWrapList.item(1).classList.add("js-fullscreen");
      Util.requestFullscreen();
    }
    if (this.fullscreenIconSet) {
      this.fullscreenIconSet.toggle();
    }
  }
*/
  private iconEventSetup(): void {
    this.icons.addEventListener("onmouseenter", (): void => {
      window.clearTimeout(this.hideIconsAfterTimeout);
    });
    this.icons.addEventListener("mouseleave", (): void => {
      this.setIconTimeout();
    });
  }

  private setIconTimeout(): void {
    if (this.hideIconsAfterTimeout) {
      window.clearTimeout.bind(this, this.hideIconsAfterTimeout);
    }
    this.hideIconsAfterTimeout = window.setTimeout((): void => {
      this.hideIcons();
    }, 5000);
  }

  /**
   * Hides waiting overlay.
   *
   * @private
   * @memberof AppController
   */
  private onCloseOverlayClick(): void {
    this.hide(this.overlayWaitingDiv);
  }

  /**
   * Opens chat window.
   *
   * @private
   * @memberof AppController
   */
  private onTextChatButtonClick(): void {
    this.show(this.textChatWindow);
  }

  /**
   * Closes text chat window.
   *
   * @private
   * @memberof AppController
   */
  private onTextChatCloseButtonClick(): void {
    this.hide(this.textChatWindow);
  }

  /**
   * Collapses text chat window.
   *
   * @private
   * @memberof AppController
   */
  private onTextChatCollapseButtonClick(): void {
    this.hide(this.textChatWindow);
  }

  /**
   * Handles key up event in the chat window.
   *
   * @private
   * @param {KeyboardEvent} event
   * @memberof AppController
   */
  private onTextChatInputKeyUp(event: KeyboardEvent): void {
    const message: string = this.textChatInput.value
      .trim()
      .replace(/(\r\n|\n|\r)/gm, "");
    if (event.keyCode === 13 && message.length > 0) {
      this.addLocalMessageHTML(message);
      this.mediaCommunication.sendLocalChatMessage(message);
      this.textChatInput.value = "";
    }
  }

  /**
   * Adds a remote video element.
   *
   * @private
   * @param {RegisterOptions} registerOptions
   * @memberof AppController
   */
  private onRemoteClientRegistered(registerOptions: RegisterOptions): void {
    this.remoteVideos.addRemoteVideo(registerOptions);
  }

  private onRemoteTextChatMessage(message: string): void {
    this.show(this.textChatWindow);
    this.addRemoteMessageHTML(message);
  }

  private addRemoteMessageHTML(message: string): void {
    const messageHTML: string = HTMLTemplates.getRemoteMessageHTML(message);
    this.textChatMessageList.insertAdjacentHTML("beforeend", messageHTML);
    this.textChatMessageList.scrollTop =
      this.textChatMessageList.scrollHeight -
      this.textChatMessageList.clientHeight;
  }

  private addLocalMessageHTML(message: string): void {
    const messageHTML = HTMLTemplates.getLocalMessageHTML(message);
    this.textChatMessageList.insertAdjacentHTML("beforeend", messageHTML);
    this.textChatMessageList.scrollTop =
      this.textChatMessageList.scrollHeight -
      this.textChatMessageList.clientHeight;
  }

  /**
   * Stops waiting for remote video.
   *
   * @private
   * @memberof AppController
   */
  private transitionToDone(): void {
    this.remoteVideos.removeCanPlayHandlers();
    this.deactivate(this.localVideo);
    this.remoteVideos.deactivateAll();
    this.deactivate(this.miniVideo);
    this.hide(this.hangupSvg);
    this.hide(this.textChatButton);
    this.hide(this.textChatWindow);
    this.activate(this.rejoinDiv);
    this.show(this.rejoinDiv);
  }

  private displayError(error: string): void {
    Log.warn(error);
  }

  /**
   * Enables sharing info overlay (the "Invite someone to join you!" one).
   *
   * @private
   * @param {*} data
   * @memberof AppController
   */
  private displaySharingInfo(room: Room): void {
    const roomId: string = room.id;
    let roomLink: string = room.link;

    this.roomLink = roomLink = `${window.location.protocol}//${window.location.host}/r/${roomId}`;

    this.pushCallNavigation(new Room(roomId, roomLink));

    const isRoomAThirdPartyAccesedRoom = /[a-zA-Z0-9]+\-\d+/g.test(roomId);
    this.activate(this.sharingDiv);

    if (!isRoomAThirdPartyAccesedRoom) {
      this.activate(this.overlayWaitingDiv);
    }
  }

  /**
   * Pushes call view to navigation history.
   *
   * @protected
   * @param {string} roomID
   * @param {string} roomLink
   * @memberof AppController
   */
  private pushCallNavigation(room: Room): void {
    this.updateInvitationLinks(room.id);
    window.history.pushState(
      { roomId: room.id, roomLink: room.link },
      room.id,
      room.link
    );
  }

  private updateInvitationLinks(roomID: string): void {
    const tmpRoomLink: string = `https://www.quickhellou.com/r/${roomID}`;

    const invitationLink: HTMLLinkElement = HTMLUtils.get(
      `.overlay--send-invitation__message-editable a`
    ) as HTMLLinkElement;

    this.roomLinkHref.href = invitationLink.href = tmpRoomLink;
    this.roomLinkHref.textContent = invitationLink.innerHTML = tmpRoomLink;
    this.roomLinkHrefWaiting.textContent = tmpRoomLink;
    this.roomLinkHrefWaiting.href = tmpRoomLink;

    const inviteBySMSButtonElement: HTMLElement = HTMLUtils.get(
      ".invite-waiting-button--sms"
    );
    if (Util.isMobile()) {
      inviteBySMSButtonElement.addEventListener("click", (): void => {
        window.open(
          "sms://?body=Please join talk with me:" + tmpRoomLink,
          "_self"
        );
      });
    } else {
      inviteBySMSButtonElement.style.display = "none";
    }
  }

  /**
   * Hadles remote stream addition.
   *
   * @param {MediaStream} stream
   * @memberof AppController
   */
  private onRemoteStreamAdded(sessionId: string, stream: MediaStream): void {
    this.deactivate(this.sharingDiv);
    this.deactivate(this.overlayWaitingDiv);
    if (!Util.isMobile() && !Util.isEdgeHTML()) {
      // if(!this.shareScreenButton.getIsEnabled) this.shareScreenButton.enableSharingState();
    }
    this.remoteVideos.addStream(sessionId, stream);
  }

  /**
   * Handles local stream addition complete.
   *
   * @private
   * @param {MediaStream} stream
   * @memberof AppController
   */
  private onLocalStreamAdded(stream: MediaStream): void {
    Log.log("User has granted access to local media.");
    this.localStream = stream;
    this.attachLocalStream();
  }

  /**
   * Handles remote SDP protocol arrival.
   *
   * @private
   * @param {string} remoteStreamId
   * @param {boolean} isRemoteVideoPlaybackAvailable
   * @memberof AppController
   */
  private onRemoteSdpProtocolReceived(
    remoteStreamId: string,
    isRemoteVideoPlaybackAvailable: boolean,
    isRemoteDisplayMediaAvailable: boolean
  ): void {
    if (!isRemoteVideoPlaybackAvailable) {
      this.transitionToActive(remoteStreamId);
    }
    if (isRemoteDisplayMediaAvailable) {
      Log.log("run display media");
    }
  }

  /**
   * Handles transition to active state action.
   *
   * @private
   * @param {HTMLVideoElement} remoteVideoElement
   * @returns {void}
   * @memberof AppController
   */
  private onTransitionToActive(remoteVideoElement: HTMLVideoElement): void {
    remoteVideoElement.oncanplay = undefined;
    const connectTime = window.performance.now();

    this.activate(remoteVideoElement);
    this.remoteVideos.updateVideoElementsLayout();

    // Prepare the remote video and PIP elements.
    if (!BaseUtils.isObjectDefined(this.localVideo.srcObject)) {
      Log.log(
        "AppController::onTransitionToActive: No local video source. Not swapping."
      );
      return;
    }
    Log.log("AppController::onTransitionToActive swapMediaStream.");
    try {
      this.miniVideo.srcObject = this.localVideo.srcObject;
    } catch (e) {
      Log.warn("Unable to attach stream to video element.", e);
    }
    // Transition opacity from 0 to 1 for the remote and mini videos.
    this.activate(this.miniVideo);
    // Transition opacity from 1 to 0 for the local video.
    this.deactivate(this.localVideo);
    try {
      this.localVideo.srcObject = null;
    } catch (e) {
      Log.warn("Unable to attach stream to video element.", e);
    }
    // Rotate the div containing the videos 180 deg with a CSS transform.
    this.activate(this.videosDiv);

    const videosWrapElement: HTMLElement = HTMLUtils.get(".videos-wrap");
    videosWrapElement.classList.add("active");

    this.showActiveConnectionControls();
    Log.success("Connection established.");
  }

  /**
   * Shows controls associated with active connection.
   *
   * @private
   * @memberof AppController
   */
  private showActiveConnectionControls() {
    this.show(this.hangupSvg);
    this.show(this.textChatButton);
  }

  /**
   * Enable active connection state.
   *
   * @private
   * @param {string} videoId
   * @memberof AppController
   */
  private transitionToActive(videoId: string): void {
    Log.log("AppController::transitionToActive", videoId);
    const remoteVideoElement: HTMLVideoElement = this.remoteVideos.getElement(
      videoId
    );

    // Stop waiting for remote video.
    remoteVideoElement.oncanplay = undefined;
    const connectTime = window.performance.now();

    // Prepare the remote video and PIP elements.
    try {
      Log.log(this.localVideo.srcObject);
      this.miniVideo.srcObject = this.localVideo.srcObject;
    } catch (e) {
      Log.warn("Unable to attach stream to video element.", e);
    }

    // Transition opacity from 0 to 1 for the remote and mini videos.
    this.activate(remoteVideoElement);
    this.activate(this.miniVideo);
    // Transition opacity from 1 to 0 for the local video.
    this.deactivate(this.localVideo);

    try {
      this.localVideo.srcObject = null;
    } catch (e) {
      Log.warn("Unable to attach stream to video element.", e);
    }
    // Rotate the div containing the videos 180 deg with a CSS transform.
    this.activate(this.videosDiv);

    const videosWrapElement: HTMLElement = HTMLUtils.get(".videos-wrap");
    videosWrapElement.classList.add("active");

    this.showActiveConnectionControls();
  }

  /**
   * Switches to waiting for connection state.
   * Called after all remote connections hang up.
   *
   * @private
   * @memberof AppController
   */
  private transitionToWaiting(): void {
    this.hide(this.hangupSvg);
    this.hide(this.textChatButton);
    this.hide(this.textChatWindow);

    this.deactivate(this.videosDiv);

    // Set localVideo.srcObject now so that the local stream won't be lost if the
    // call is restarted before the timeout.
    try {
      this.localVideo.srcObject = this.miniVideo.srcObject;
    } catch (e) {
      Log.log("Unable to attach stream to video element.", e);
    }
    // Transition opacity from 0 to 1 for the local video.
    this.activate(this.localVideo);
    this.remoteVideos.deactivateAll();
    this.deactivate(this.miniVideo);
  }

  /**
   * Handles remote hangup event.
   *
   * @private
   * @param {string} sessionId
   * @memberof AppController
   */
  private onRemoteHangup(sessionId: string): void {
    Log.log("The remote side hung up. ", sessionId);
    this.remoteVideos.removeRemoteVideo(sessionId);
    if (this.remoteVideos.isEmpty()) {
      this.mediaCommunication.stopSendingDisplayMedia();
      // this.shareScreenButton.disableSharingState();
      this.transitionToWaiting();
      this.closeFullScreen();
    }
  }

  /**
   * Shows icons.
   *
   * @private
   * @memberof AppController
   */
  private showIcons(): void {
    if (!this.icons.classList.contains("active")) {
      this.activate(this.fullscreenIcon);
      this.activate(this.icons);
      this.setIconTimeout();
    }
  }

  /**
   * Hides icons.
   *
   * @private
   * @memberof AppController
   */
  private hideIcons(): void {
    if (this.icons.classList.contains("active")) {
      this.deactivate(this.icons);
      this.deactivate(this.fullscreenIcon);
    }
  }

  private hide = (element: HTMLElement): void => {
    element.classList.add("hidden");
  }

  private show = (element: HTMLElement): void => {
    element.classList.remove("hidden");
  }

  /**
   * Activates HTML element by adding "active" class.
   *
   * @private
   * @param {HTMLElement} element
   * @memberof AppController
   */
  private activate(element: HTMLElement): void {
    element.classList.add("active");
  }

  private deactivate = (element: HTMLElement): void => {
    element.classList.remove("active");
  }

  /**
   * Initialize remote videos.
   *
   * @private
   * @memberof AppController
   */
  private initRemoteVideos(): void {
    this.remoteVideos = RemoteVideos.getInstance();

    this.remoteVideos.addEventListener(
      RemoteVideosEvent.ADD_STREAM_SUCCESS,
      this.onTransitionToActive,
      this
    );
  }
}
