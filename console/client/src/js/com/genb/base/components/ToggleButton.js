import { UIView } from '../controller/UIView'

/**
 * Toggle button.
 *
 * @export
 * @class ToggleButton
 * @extends {UIView}
 */
export class ToggleButton extends UIView {
  
  /**
   * Creates an instance of ToggleButton.
   *
   *
   * @memberof ToggleButton
  */
  constructor(element) {
      super()
      this.element = element
      this.enabled = false
      this.element.addEventListener('click', () => {
        this.toggle()
      }, false)
  }

  /**
   * Enables button.
   *
   * @memberof ToggleButton
   */
  enable() {
    this.enabled = true
    this.element.classList.add('js-enabled')  
  }

  /**
   * Disable button.
   *
   * @memberof ToggleButton
   */
  disable() {
    this.enabled = false
    this.element.classList.remove('js-enabled', 'enabled')
  }

  /**
   * Toggles button.
   *
   * @memberof ToggleButton
   */
  toggle() {
    console.log('this.enabled', this.enabled)
    if (this.enabled) {
      this.disable()
    } else {
      this.enable()
    }
  }
}