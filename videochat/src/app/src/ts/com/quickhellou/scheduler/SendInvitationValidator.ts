import { DateTime } from "./DateTime";
import { StringUtils } from "../../genb/base/utils/StringUtils";
import { SendInvitationError } from "./model/SendInvitationError";
import { Invitation } from "./model/Invitation";

export class SendInvitationValidator {

  private dateTime: DateTime;
  private emailString: string;
  private descriptionString: string;

  constructor(dateTime:DateTime, invitation:Invitation) {
    this.dateTime = dateTime;
    this.emailString = invitation.email;
    this.descriptionString = invitation.description;
  }

  public get isValid(): boolean {
    return this.isDateTimeFullfilled && this.isEmailNotEmpty &&
      this.isEmailValid && this.isDescriptionNotEmpty;
  }

  public get errors(): string[] {
    let errors: string[] = new Array<string>();

    if (!this.isDateTimeFullfilled)
      errors.push(SendInvitationError.DATE_TIME_NOT_SET);

    if (!this.isEmailNotEmpty)
      errors.push(SendInvitationError.EMAIL_EMPTY);
    else {
      if (!this.isEmailValid)
        errors.push(SendInvitationError.EMAIL_INVALID);
    }
    
    if (!this.isDescriptionNotEmpty)
      errors.push(SendInvitationError.DESCRIPTION_EMPTY);

    return errors;
  }

  private get isDateTimeFullfilled(): boolean {
    return this.dateTime.isFullDateTime;
  }

  private get isEmailNotEmpty(): boolean {
    return StringUtils.isNotEmpty(this.emailString);
  }

  private get isEmailValid(): boolean {
    return StringUtils.isEmailValid(this.emailString);
  }

  private get isDescriptionNotEmpty(): boolean {
    return StringUtils.isNotEmpty(this.descriptionString);
  }
}