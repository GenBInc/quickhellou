import { InvitationSubmitterEvent } from "./InvitationSubmitterEvent";
import { Invitation } from "./model/Invitation";
import { BaseUtils } from "../../genb/base/utils/BaseUtils";
import { StringUtils } from "../../genb/base/utils/StringUtils";
import { EventDispatcherService } from "../../genb/base/services/EventDispatcherService";

export class InvitationSubmitter extends EventDispatcherService {

  private static OK: string = "OK";

  private invitation: Invitation;

  constructor(invitation: Invitation) {
    super();
    this.invitation = invitation;
  }

  public submit(): boolean {
    const process: Promise<any> = new Promise(this.processSubmitting);
    process.then((resolve: string):void => {
      this.dispatchEvent(InvitationSubmitterEvent.INVITATION_SENT, resolve);
    }).catch((reason:string):void => {
      this.dispatchEvent(InvitationSubmitterEvent.INVITATION_ERROR, reason);
    });

    return true;
  }

  public processSubmitting = (resolve: Function, reject: Function): void => {
    let formData: FormData = new FormData();
    formData.append("subject", "Quick Hellou - Quick Talk Invitation");
    formData.append("email", this.invitation.email);
    formData.append("message", this.invitation.description.trim());
    formData.append("dateTime", this.invitation.dateTime);
    formData.append("calendar", this.invitation.calendar);
    formData.append("attachCalendar", StringUtils.toString(this.invitation.attachCalendar));
    let request: XMLHttpRequest = new XMLHttpRequest();
    request.open("POST", "/sendinvitation");
    request.addEventListener("load", (event): void => {
      if (request.statusText === InvitationSubmitter.OK && BaseUtils.isObjectDefined(resolve)) {
        resolve(request.responseText);
      } else reject(request.responseText);
    });
    request.send(formData);
  }
}