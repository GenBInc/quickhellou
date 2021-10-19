import { EventDispatcherService } from "../services/EventDispatcherService";

/**
 * Generic component.
 *
 * @export
 * @class Component
 */
export class Component {
  /**
   * Service
   *
   * @protected
   * @type {EventDispatcherService}
   * @memberof Component
   */
  protected service: EventDispatcherService;

  /**
   * Identifer
   *
   * @private
   * @type {string}
   * @memberof Component
   */
  private id: string;

  /**
   * Unique identifier
   *
   * @private
   * @type {string}
   * @memberof Component
   */
  private uid: string;

  /**
   * Creates an instance of Component.
   * @memberof Component
   */
  constructor() {
    this.service = new EventDispatcherService();
  }

  /**
   * Adds a listener.
   *
   * @public
   * @param {string} eventName
   * @param {Function} handler
   * @param {*} scope
   * @memberof Component
   */
  public addEventListener(eventName: string, handler: any, scope: any) {
    this.service.addEventListener(eventName, handler, scope);
  }

  /**
   * Removes a listener.
   *
   * @public
   * @param {string} eventType
   * @memberof Component
   */
  public removeEventListener(eventType: string) {
    this.service.removeEventListener(eventType);
  }

  /**
   * Dispatches an event.
   *
   * @public
   * @param {string} eventName
   * @param {*} [data]
   * @memberof Component
   */
  public dispatchEvent(eventName: string, data?: any) {
    this.service.dispatchEvent(eventName, data);
  }

  /**
   * Destroys a component.
   *
   * @public
   * @memberof Component
   */
  public destroy() {
    this.service.removeAllEventListeners();
  }

  /**
   * Gets an identifier.
   *
   * @public
   * @returns {string}
   * @memberof Component
   */
  public getId(): string {
    return this.id;
  }

  /**
   * Sets an identifier.
   *
   * @public
   * @param {string} id
   * @memberof Component
   */
  public setId(id: string) {
    this.id = id;
  }

  /**
   * Gets an unique identifier.
   *
   * @public
   * @returns {string}
   * @memberof Component
   */
  public getUid(): string {
    return this.uid;
  }

  /**
   * Sets an unique identifier
   *
   * @public
   * @param {string} uid
   * @memberof Component
   */
  public setUid(uid: string) {
    this.uid = uid;
  }
}
