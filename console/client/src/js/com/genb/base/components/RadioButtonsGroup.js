import { UIView } from '../controller/UIView'
import { ToggleButton } from './ToggleButton'

/**
 * Radio buttons group.
 *
 * @export
 * @class RadioButtonsGroup
 * @extends {UIView}
 */
export class RadioButtonsGroup extends UIView {
  
  /**
   * Creates an instance of RadioButtonsGroup.
   *
   *
   * @memberof RadioButtonsGroup
  */
  constructor() {
      super()
      this.elements = []
  }

  /**
   * Adds radio button.
   *
   * @param {ToggleButton} button
   * @memberof RadioButtonsGroup
   */
  addRadioButton(button) {
    this.elements.push(button)
    button.element.addEventListener('click', () => {
      this.disableAll()
      button.enable()
    }, false)
  }

  /**
   * Disables all radio buttons.
   *
   * @memberof RadioButtonsGroup
   */
  disableAll() {
    this.elements.forEach(element => {
      element.disable()
    })
  }
}