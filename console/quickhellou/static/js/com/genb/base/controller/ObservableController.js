import { EventEmitter } from '../service/EventEmitter'

/**
 * Event emitter controller.
 *
 * @export
 * @class ObservableController
 */
export class ObservableController {
  /**
   * Creates an instance of ObservableController.
   *
   * @memberof ObservableController
   */
  constructor() {
    this.observable = new EventEmitter()
  }

  /**
   * Adds emitter listener.
   *
   * @param {string} label
   * @param {*} callback
   * @memberof ObservableController
   */
  addListener(label, callback) {
    this.observable.addListener(label, callback)
  }

  /**
   * Removes emitter listener.
   *
   * @param {string} label
   * @param {*} callback
   * @memberof ObservableController
   */
  removeListener(label, callback) {
    this.observable.removeListener(label, callback)
  }

  /**
   * Emits an event.
   *
   * @param {string} label
   * @param {*} args
   * @memberof ObservableController
   */
  emit(label, ...args) {
    this.observable.emit(label, ...args)
  }
}
