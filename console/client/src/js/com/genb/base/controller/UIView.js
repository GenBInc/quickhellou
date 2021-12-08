import { ObservableController } from './ObservableController'
import { HTMLUtils } from '../utils/HTMLUtils'

/**
 * UI view facade.
 *
 * @export
 * @class UIViewController
 * @extends {ObservableController}
 */
export class UIView extends ObservableController {
  /**
   * Gets DOM element by a CSS selector.
   *
   * @param {string} cssSelector
   * @returns
   * @memberof UIViewController
   */
  uiGet(cssSelector) {
    return HTMLUtils.get(cssSelector)
  }

  /**
   * Checks if DOM element selected by given CSS selector exists.
   *
   * @param {string} cssSelector
   * @returns
   * @memberof UIViewController
   */
  uiExists(cssSelector) {
    return HTMLUtils.exists(cssSelector)
  }

  /**
   * Returns DOM elements list selected by given CSS selector as Array object.
   *
   * @param {string} cssSelector
   * @returns {Array<HTMLElement>}
   * @memberof UIView
   */
  uiArray(cssSelector) {
    return HTMLUtils.array(cssSelector)
  }

  /**
   * Removes all listeners by replacing it with a clone.
   *
   * @param {string} cssSelector
   * @memberof UIView
   */
  removeListeners(cssSelector) {
    var element = this.uiGet(cssSelector)
    var newElement = element.cloneNode(true)
    element.parentNode.replaceChild(newElement, element)
  }
}
