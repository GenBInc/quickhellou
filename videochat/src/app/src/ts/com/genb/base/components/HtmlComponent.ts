import { BaseUtils } from "../../base/utils/BaseUtils";
import { ToggleableComponent } from "./ToggleableComponent";
import { Log } from "../utils/Log";

/**
 * HTMLElement based Component
 *
 * @export
 * @class HtmlComponent
 * @extends {Component}
 */
export class HTMLComponent extends ToggleableComponent {
  /**
   * JQuery element.
   *
   * @private
   * @type {JQuery}
   * @memberof UIComponent
   */
  protected element: HTMLElement;

  /**
   * Creates an instance of RawUIComponent.
   * @param {JQuery} element
   * @memberof UIComponent
   */
  constructor(element: HTMLElement) {
    super();

    this.setElement(element);
  }

  /**
   * Destroys an instance of UIComponent
   *
   * @memberof UIComponent
   */
  public destroy() {
    super.destroy();
    this.element.remove();
  }

  /**
   * Sets the element.
   *
   * @param {HTMLElement} element
   * @memberof UIComponent
   */
  public setElement(element: HTMLElement) {
    this.element = element;
  }

  /**
   * Gets the element.
   *
   * @param {HTMLElement} element
   * @memberof UIComponent
   */
  public getElement(): HTMLElement {
    try {
      return this.element;
    } catch (exception) {
      Log.error("No element for ", this.getId(), " component");
    }

    return undefined;
  }

  /**
   * Gets data value by identifier from a JQuery element.
   *
   * @param {string} id
   * @returns {any}
   * @memberof UIComponent
   */
  public getData(id: string): any {
    if (BaseUtils.isObjectDefined(this.getElement())) {
      return this.getElement().dataset[id];
    }

    return BaseUtils.UNDEFINED;
  }

  /**
   * Finds child elements within root element.
   *
   * @public
   * @param {string} elementQuery
   * @returns {NodeListOf<Element>}
   * @memberof HtmlComponent
   */
  public findElements(elementQuery: string): NodeListOf<Element> {
    if (BaseUtils.isObjectDefined(this.getElement())) {
      return this.getElement().querySelectorAll(elementQuery);
    }

    return BaseUtils.UNDEFINED;
  }

  /**
   * Finds an child element within root element.
   *
   * @public
   * @param {string} elementQuery
   * @returns {HTMLElement}
   * @memberof HtmlComponent
   */
  public findElement(elementQuery: string): HTMLElement {
    if (BaseUtils.isObjectDefined(this.getElement())) {
      const results: NodeListOf<Element> = this.findElements(elementQuery);

      if (results.length > 0) {
        return results[0] as HTMLElement;
      }
    }

    return BaseUtils.UNDEFINED;
  }

  /**
   * Finds a form element within root element.
   *
   * @public
   * @returns {HTMLFormElement}
   * @memberof HtmlComponent
   */
  public findFormElement(): HTMLFormElement {
    return this.findElement("form") as HTMLFormElement;
  }

  /**
   * Finds an input element within root element.
   *
   * @public
   * @returns {Element}
   * @memberof HtmlComponent
   */
  public findInputElement(): Element {
    return this.findElement("input");
  }

  /**
   * Adds a class to the component element.
   *
   * @public
   * @param {string} className
   * @memberof UIComponent
   */
  public addClass(className: string): void {
    if (BaseUtils.isObjectDefined(this.getElement())) {
      this.getElement().classList.add(className);
    }
  }

  /**
   * Removes a class from the component element.
   *
   * @param {string} className
   * @memberof UIComponent
   */
  public removeClass(className: string): void {
    if (BaseUtils.isObjectDefined(this.getElement())) {
      this.getElement().classList.remove(className);
    }
  }

  /**
   * Adds an event listener handler for the component.
   *
   * @param {string} eventName
   * @param {Function} handler
   * @memberof HtmlComponent
   */
  public addHTMLEventListener(eventName: string, handler: any) {
    this.getElement().addEventListener(eventName, (): void => {
      handler.call(this);
    });
  }

  /**
   * Enables component.
   *
   * @memberof UIComponent
   */
  public enable() {
    super.enable();
    this.getElement().classList.remove("js-disabled");
  }

  /**
   * Disables component.
   *
   * @memberof UIComponent
   */
  public disable() {
    super.disable();
    this.getElement().classList.add("js-disabled");
  }

  /**
   * Sets component enable state.
   *
   * @param {boolean} isEnabled
   * @memberof UIComponent
   */
  public setIsEnabled(isEnabled: boolean) {
    super.setIsEnabled(isEnabled);
    this.getElement().classList.toggle("js-disabled", !isEnabled);
  }
}
