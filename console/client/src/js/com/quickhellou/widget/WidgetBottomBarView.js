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
      this.emit('expandExtView')
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
    this.handleDesciptionsOnOperatorListChange(anyOperatorActive)
  }

  /**
   * Handles descriptions on operator availability change.
   *
   * @param {boolean} anyOperatorActive
   */
  handleDesciptionsOnOperatorListChange(anyOperatorActive) {
    const noOperatorsDescription = this.uiGet('.qh_widget-bottom__msg--no-operators')
    noOperatorsDescription.classList.toggle('js-active', !anyOperatorActive)
    const linesDescription = this.uiGet('.qh_widget-bottom__msg--lines')
    linesDescription.classList.toggle('js-active', anyOperatorActive)
    // const leaveMessageDescription = this.uiGet('.qh_widget-bottom__msg--leave-message')
  }

  /**
   * Handles error.
   *
   * @param {string} error
   */
  onError() {
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
    this.emit('toggleBadgeTopState', false)
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
