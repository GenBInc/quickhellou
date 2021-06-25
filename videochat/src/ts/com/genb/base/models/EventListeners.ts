import { EventListener } from "../models/EventListener";

/**
 * Event listeners map.
 *
 * @interface IEventListenerMap
 */
export interface IEventListenerMap {
  [key: string]: any;
}

/**
 * Event listeners aggregator
 *
 * @export
 * @class EventListeners
 */
export class EventListeners {
  private listeners: IEventListenerMap;

  /**
   * Creates an instance of EventListeners.
   * @memberof EventListeners
   */
  constructor() {
    this.setListeners(new Array<EventListener>());
  }

  public addEventListener(type: string, eventListener: EventListener) {
    const eventListeners: EventListener[] = this.getEventListenersListByType(
      type
    );
    eventListeners.push(eventListener);
    this.listeners[type] = eventListeners;
  }

  public removeEventListener(type: string) {
    delete this.listeners[type];
  }

  public getEventListenersListByType(type: string): EventListener[] {
    const eventListenersList: EventListener[] = this.listeners[type];
    return eventListenersList ? eventListenersList : [];
  }

  public empty() {
    this.listeners = [];
  }

  public getListeners(): IEventListenerMap {
    return this.listeners;
  }

  public setListeners(listeners: IEventListenerMap) {
    this.listeners = listeners;
  }
}
