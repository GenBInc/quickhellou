import { UIView } from '../../genb/base/controller/UIView'
import { HTMLUtils } from '../../genb/base/utils/HTMLUtils'

/**
 * Widget bottom bar view.
 *
 * @export
 * @class WidgetBottomBarView
 * @extends {UIView}
 */
export class WidgetBottomBarView extends UIView {
  /**
   * Creates an instance of WidgetBottomBarView.
   *
   * @param { WidgetService } service
   *
   * @memberof WidgetBottomBarView
   */
  constructor(service) {
    super()
    this.service = service
    this.isExpanded = false
    this.element = window.parent.document.getElementById('qh_b_frame')
  }

  /**
   * Initializes the view.
   *
   * @memberof WidgetBottomBarView
   */
  async init() {
    const muteButton = this.uiGet('.widget-bottom__button--mute')
    muteButton.addEventListener('click', () => {
      this.collapseView()
      this.disable()
    })
    const agreeButton = this.uiGet('.widget-bottom__button--yes')
    agreeButton.addEventListener('click', () => {
      this.collapseView()
      this.extensionView.expandView()
    })
    const disagreeButton = this.uiGet('.widget-bottom__button--no')
    disagreeButton.addEventListener('click', () => {
      this.collapseView()
      this.disable()
    })

    this.service.addListener('callRejected', () => {
      this.onCallRejected()
    })

    this.service.addListener('listUsers', (a) => {
      this.onListUsers(a.length > 0)
    })

    this.service.addListener('error', (error) => {
      this.onError(error)
    })
  }

  /**
   * Handles call rejected event.
   *
   * @memberof WidgetBottomBarView
   */
  onCallRejected() {
    this.expandView()
  }

  /**
   * Handles user list update.
   *
   * @param {boolean} anyOperatorActive is any operator active
   *
   * @memberof WidgetBottomBarView
   */
  onListUsers(anyOperatorActive) {
    if (anyOperatorActive) {
      this.collapseView()
    } else {
      this.expandView()
    }
  }

  /**
   * Handles error.
   *
   * @param {string} error
   */
  onError(error) {
    const contentElement = this.uiGet('.qh_widget-bottom__content')
    contentElement.classList.add('js-hidden')
    const errorElement = this.uiGet('.widget-bottom__error')
    errorElement.classList.remove('js-hidden')
    this.expandView()
  }

  /**
   * Toggles the view.
   *
   * @memberof WidgetBottomBarView
   */
  toggleView() {
    if (this.isExpanded) {
      this.collapseView()
    } else {
      this.expandView()
    }
  }

  /**
   * Expands the view.
   *
   * @memberof WidgetBottomBarView
   */
  expandView() {
    console.log('this.isEnabled()', this.isEnabled())
    if (this.isEnabled()) {
      this.isExpanded = true
      this.element.classList.add('js-active')
    }
  }

  /**
   * Collapses the view.
   *
   * @memberof WidgetBottomBarView
   */
  collapseView() {
    this.isExpanded = false
    this.element.classList.remove('js-active')
    this.badgeView.toggleTopState(false)
  }

  /**
   * Sets extension element.
   *
   * @param {WidgetExtensionView} extensionView
   */
  setExtension(extensionView) {
    this.extensionView = extensionView
  }

  /**
   * Sets badge element.
   *
   * @param {WidgetView} badgeView
   */
  setBadge(badgeView) {
    this.badgeView = badgeView
  }

  /**
   * Disables bottom bar.
   */
  disable() {
    HTMLUtils.setCookie('qh_bottom_bar', false)
  }

  /**
   * Checks if bottom bar is enabled.
   * 
   * @returns true if enabled
   */
  isEnabled() {
    return HTMLUtils.getCookie('qh_bottom_bar') !== 'false'
  }
}
