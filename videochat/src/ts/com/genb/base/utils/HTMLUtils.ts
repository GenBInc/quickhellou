import { BaseUtils } from "./BaseUtils";
import { Log } from "./Log";

export class HTMLUtils {
  public static get(selector: string): HTMLElement {
    const element: HTMLElement = document.querySelector(selector);
    if (!BaseUtils.isObjectDefined(element)) {
      Log.warn(`Element "${selector}" is not defined.`);
    }
    return element;
  }

  public static input(selector: string): HTMLInputElement {
    return HTMLUtils.get(selector) as HTMLInputElement;
  }

  public static list(selector: string): NodeListOf<HTMLElement> {
    const elementList: NodeListOf<HTMLElement> = document.querySelectorAll(
      selector
    );
    if (!BaseUtils.isObjectDefined(elementList)) {
      Log.warn(`Elements "${selector}" are not defined.`);
    }
    return elementList;
  }

  public static array(selector: string): HTMLElement[] {
    return Array.from(HTMLUtils.list(selector));
  }

  public static firstToHTMLElement(elements: NodeListOf<Element>): HTMLElement {
    if (elements.length > 0) {
      return (elements[0] as HTMLElement);
    }
  }

  /**
   * Checks if DOM element selected by given CSS selector exists.
   *
   * @public
   * @static
   * @param {string} selector
   * @returns
   * @memberof HTMLUtils
   */
  public static exists(cssSelector: string) {
    const element = document.querySelector(cssSelector);
    return BaseUtils.isObjectDefined(element);
  }
}
