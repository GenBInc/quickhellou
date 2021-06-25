import { Component } from "./Component";

/**
 * Toggleable component
 *
 * @export
 * @class ToggleableComponent
 * @extends {Component}
 */
export class ToggleableComponent extends Component {
  /**
   * Component state
   *
   * @private
   * @type {boolean}
   * @memberof ToggleableComponent
   */
  private isEnabled: boolean = true;

  /**
   * Toggle component.
   *
   * @memberof ToggleableComponent
   */
  public toggle() {
    this.setIsEnabled(!this.getIsEnabled);
  }

  /**
   * Enable component.
   *
   * @memberof ToggleableComponent
   */
  public enable() {
    this.setIsEnabled(true);
  }

  /**
   * Disable component.
   *
   * @memberof ToggleableComponent
   */
  public disable() {
    this.setIsEnabled(false);
  }

  /**
   * Sets component state.
   *
   * @param {boolean} isEnabled
   * @memberof ToggleableComponent
   */
  public setIsEnabled(isEnabled: boolean) {
    this.isEnabled = isEnabled;
  }

  /**
   * Gets component state.
   *
   * @returns {boolean}
   * @memberof ToggleableComponent
   */
  public getIsEnabled(): boolean {
    return this.isEnabled;
  }
}
