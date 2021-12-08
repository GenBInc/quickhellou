import { DashboardView } from "./DashboardView";
import { HTMLUtils } from "../../genb/base/utils/HTMLUtils";

export class WidgetView extends DashboardView {

  /**
   * Initializes the view.
   *
   * @memberof WidgetViewController
   */
  init() {
    const copyWidgetCodeElement = this.uiGet(".widget-code-box__copy");
    copyWidgetCodeElement.addEventListener("click", () => {
      const copyTextElement = this.uiGet(".widget-code-box__content");
      HTMLUtils.copyToClipboard(HTMLUtils.decodeHtml(copyTextElement.innerHTML));
    });
  } 
}