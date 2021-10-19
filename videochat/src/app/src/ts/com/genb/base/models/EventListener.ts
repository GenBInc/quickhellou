import { EventObject } from "../models/EventObject";

/**
 * Event dispatching component.
 *
 * @export
 * @class EventListener
 */
export class EventListener {
  /**
   * Event object
   *
   * @private
   * @type {EventObject}
   * @memberof EventListener
   */
  private event: EventObject;

  /**
   * Event handler function
   *
   * @private
   * @type {any}
   * @memberof EventListener
   */
  private handler: any;

  /**
   * Scope of dispatch
   *
   * @private
   * @type {*}
   * @memberof EventListener
   */
  private scope: any;

  /**
   * Creates an instance of EventListener.
   *
   * @param {string} type
   * @param {Function} handler
   * @param {*} scope
   * @memberof EventListener
   */
  constructor(type: string, handler: any, scope: any) {
    this.event = new EventObject(type);
    this.handler = handler;
    this.scope = scope;
  }

  /**
   * Gets a handler.
   *
   * @returns {Function}
   * @memberof EventListener
   */
  public getHandler(): any {
    return this.handler;
  }

  /**
   * Gets and event object.
   *
   * @returns {EventObject}
   * @memberof EventListener
   */
  public getEventObject(): EventObject {
    return this.event;
  }

  /**
   * Gets a scope.
   *
   * @returns {*}
   * @memberof EventListener
   */
  public getScope(): any {
    return this.scope;
  }
}
