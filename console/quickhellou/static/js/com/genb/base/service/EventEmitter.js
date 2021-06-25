/**
 * Event emitter.
 *
 * @export
 * @class EventEmitter
 */
export class EventEmitter {
  /**
   * Creates an instance of EventEmitter.
   *
   * @memberof EventEmitter
   */
  constructor() {
    this.listeners = new Map()
  }

  /**
   * Ads an event listener.
   *
   * @param {String} label
   * @param {*} callback
   * @memberof EventEmitter
   */
  addListener(label, callback) {
    this.listeners.has(label) || this.listeners.set(label, [])
    this.listeners.get(label).push(callback)
  }

  /**
   * Removes an event listener.
   *
   * @param {String} label
   * @param {*} callback
   * @returns
   * @memberof EventEmitter
   */
  removeListener(label, callback) {
    let listeners = this.listeners.get(label),
      index

    if (listeners && listeners.length) {
      index = listeners.reduce((i, listener, index) => {
        return this.isFunction(listener) && listener === callback
          ? (i = index)
          : i
      }, -1)

      if (index > -1) {
        listeners.splice(index, 1)
        this.listeners.set(label, listeners)
        return true
      }
    }
    return false
  }

  /**
   * Emits an event.
   *
   * @param {String} label
   * @param {*} args
   * @returns
   * @memberof EventEmitter
   */
  emit(label, ...args) {
    let listeners = this.listeners.get(label)

    if (listeners && listeners.length) {
      listeners.forEach((listener) => {
        listener(...args)
      })
      return true
    }
    return false
  }

  /**
   * Checks if object is function.
   *
   * @param {object} obj
   * @returns
   * @memberof EventEmitter
   */
  isFunction(obj) {
    return typeof obj === 'function' || false
  }
}
