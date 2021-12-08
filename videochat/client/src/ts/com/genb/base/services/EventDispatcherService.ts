import { EventListener } from "../models/EventListener";
import { EventListeners } from "../models/EventListeners";

export class EventDispatcherService {
  public listeners: EventListeners;

  constructor() {
    this.listeners = new EventListeners();
  }

  /**
   *
   * service.addEventListener(Event.COMPLETE, handler);
   *
   */
  public addEventListener(type: string, handler: any, scope: any) {
    const eventListener: EventListener = new EventListener(type, handler, scope);
    this.listeners.addEventListener(type, eventListener);
  }

  public removeEventListener(type: string) {
    this.listeners.removeEventListener(type);
  }

  public removeAllEventListeners() {
    this.listeners.empty();
  }

  public dispatchEvent(type: string, data?: any) {
    const eventListeners: EventListener[] = this.listeners.getEventListenersListByType(
      type
    );
    eventListeners.forEach((eventListener: EventListener) => {
      eventListener.getHandler().call(eventListener.getScope(), data);
    });
  }
}
