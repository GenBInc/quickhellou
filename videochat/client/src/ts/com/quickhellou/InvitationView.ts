import { HTMLComponent } from "../genb/base/components/HtmlComponent";
import { HTMLUtils } from "../genb/base/utils/HTMLUtils";
import { StringUtils } from "../genb/base/utils/StringUtils";

/**
 * Send invitation view component.
 *
 * @export
 * @class InvitationView
 * @extends {HTMLComponent}
 */
export class InvitationView extends HTMLComponent {
  private sendInvitationForm: HTMLFormElement;

  /**
   * Creates an instance of InvitationView.
   *
   * @param {HTMLElement} element
   * @memberof InvitationView
   */
  constructor(element: HTMLElement) {
    super(element);

    this.sendInvitationForm = this.findElement(
      ".send-invitation-form"
    ) as HTMLFormElement;
    this.addFormEvents();
  }

  /**
   * Adds event to the send invitaion form.
   *
   * @private
   * @memberof InvitationView
   */
  private addFormEvents(): void {
    this.sendInvitationForm.addEventListener("submit", (event: Event): void => {
      event.preventDefault();

      const emailInput: HTMLInputElement = HTMLUtils.get(
        ".send-invitation__email"
      ) as HTMLInputElement;
      const email: string = emailInput.value;

      const messageInput: HTMLElement = HTMLUtils.get(
        ".send-invitation__message-editable"
      );
      const message: string = messageInput.innerHTML;

      const messageErrorMessageElement: HTMLElement = HTMLUtils.get(
        ".send-invitation__error--message"
      );
      messageErrorMessageElement.classList.add("hidden");

      const emailErrorMessageElement: HTMLElement = HTMLUtils.get(
        ".send-invitation__error--email"
      );
      emailErrorMessageElement.classList.add("hidden");

      if (StringUtils.isNotEmpty(email) && StringUtils.isNotEmpty(message)) {
        const formData: FormData = new FormData();
        formData.append("email", email);
        formData.append("subject", "Quick Hellou - Invitation");
        formData.append("message", message.trim());
        formData.append("dateTime", StringUtils.EMPTY);
        formData.append("attachCalendar", StringUtils.FALSE);

        const request: XMLHttpRequest = new XMLHttpRequest();
        request.open("POST", "/sendinvitation");
        request.addEventListener("load", (): void => {
          const sendInvitationBodyElement: HTMLElement = HTMLUtils.get(
            ".send-invitation__body"
          );
          sendInvitationBodyElement.classList.add("hidden");

          const sendInvitationResultElement: HTMLElement = HTMLUtils.get(
            ".send-invitation__result"
          );
          sendInvitationResultElement.classList.remove("hidden");

          const sendInvitationResultMessageElement: HTMLElement = HTMLUtils.get(
            ".send-invitation__result-message"
          );
          sendInvitationResultMessageElement.classList.remove("js-error");
          sendInvitationResultMessageElement.innerHTML = request.responseText;
        });
        request.send(formData);
      } else {
        if (StringUtils.isEmpty(message)) {
          messageErrorMessageElement.classList.remove("hidden");
        }

        if (StringUtils.isEmpty(email) || !StringUtils.isEmailValid(email)) {
          emailErrorMessageElement.classList.remove("hidden");
        }
      }
    });
  }
}
