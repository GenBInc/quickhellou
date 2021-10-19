import { HTMLComponent } from "../../../../com/genb/base/components/HtmlComponent";
import { HTMLUtils } from "../../../../com/genb/base/utils/HTMLUtils";
import { ShareScreenEvent } from "../model/ShareScreenEvent";
import { Log } from "../../../../com/genb/base/utils/Log";

export class ScreenShareButtonComponent extends HTMLComponent {
  
  private isSharingEnabled:boolean = false;

  /**
   * Initializes the component.
   *
   * @memberof ScreenShareButtonComponent
   */
  init() {
    this.setupUIEvents();
  }

  /**
   * Setups UI events.
   *
   * @private
   * @memberof ScreenShareButtonComponent
   */
  private setupUIEvents() {
    this.element.addEventListener("click", () => {
      this.dispatchScreenSharingEvent();
    });
  }

  /**
   * Toggles screen sharing.
   *
   * @private
   * @memberof ScreenShareButtonComponent
   */
  private dispatchScreenSharingEvent() {
    if (this.isSharingEnabled) {
      this.dispatchEvent(ShareScreenEvent.START_SHARING);
      //this.lock();
      this.setStopSharingLabel();
    } else {
      this.dispatchEvent(ShareScreenEvent.STOP_SHARING);
      this.setStartSharingLabel();
    }
  }


  /**
   * 
   * @public
   * @param {boolean} isSharingEnabled
   * @memberof ScreenShareButtonComponent
   */
  public toggleScreenSharingWithFlag(isSharingEnabled:boolean) {
    if (this.isSharingEnabled) {
      this.setStopSharingLabel();
    } else {
      this.setStartSharingLabel();
    }
    this.isSharingEnabled = !isSharingEnabled;
  }

  /**
   * Enables component.
   *
   * @public
   * @memberof ScreenShareButtonComponent
   */
  public enableSharingState() {
    this.isSharingEnabled = true;
    super.enable();
    this.setStartSharingLabel();
  }

  /**
   * Disables components.
   *
   * @public
   * @memberof ScreenShareButtonComponent
   */
  public disableSharingState() {
    this.isSharingEnabled = false;
    super.disable();
    this.setStopSharingLabel();
  }

  /**
   * Locks the button.
   *
   * @public
   * @memberof ScreenShareButtonComponent
   */
  public lock() {
    this.element.classList.add("js-locked");
  }

  /**
   * Unlocks the button.
   *
   * @memberof ScreenShareButtonComponent
   */
  public unlock() {
    this.element.classList.remove("js-locked");
  }
  
  /**
   * Sets label as start sharing.
   *
   * @public
   * @memberof ScreenShareButtonComponent
   */
  public setStartSharingLabel() {
    const labelElement:HTMLElement = HTMLUtils.get(".button--share-screen__label");
    labelElement.innerHTML = "Share Screen";
  }

  /**
   * Sets label as stop sharing.
   *
   * @private
   * @memberof ScreenShareButtonComponent
   */
  private setStopSharingLabel() {
    const labelElement:HTMLElement = HTMLUtils.get(".button--share-screen__label");
    labelElement.innerHTML = "Stop Sharing Screen";
  }
}