import { UIView } from '../../genb/base/controller/UIView'
import { HTMLUtils } from '../../genb/base/utils/HTMLUtils'

/**
 * Widget embed view. The iframe that is included on a client's page.
 *
 * @export
 * @class WidgetEmbedView
 * @extends {UIView}
 */
export class WidgetEmbedView extends UIView {
  /**
   * Creates an instance of WidgetEmbedView.
   *
   * @param { WidgetService } service
   *
   * @memberof WidgetEmbedView
   */
  constructor(service) {
    super()
    this.service = service
    this.isExpanded = false
    this.element = document.querySelector('iframe#qh_iframe')
  }

  /**
   * Initializes the view.
   *
   * @memberof WidgetEmbedView
   */
  async init(extDispatcher) {
    
    this.extDispatcher = extDispatcher

    this.service.addListener('callRejected', () => {
      this.onCallRejected()
    })

    this.service.addListener('listUsers', (a) => {
      this.onListUsers(a.length > 0)
    })

    this.service.addListener('error', (error) => {
      this.onError(error)
    })

    this.extDispatcher.addEventListener('expand_contact', () => {
      this.element.classList.add('js-expanded', 'js-expanded--large')
    }, false)

    this.extDispatcher.addEventListener('expand_schedule', () => {
      this.element.classList.add('js-expanded', 'js-expanded--large')
    }, false)

    this.extDispatcher.addEventListener('collapse', () => {
      this.element.classList.remove('js-expanded', 'js-expanded--large')
    }, false)
  }

  /**
   * Handles call rejected event.
   *
   * @memberof WidgetEmbedView
   */
  onCallRejected() {
    this.expandView()
  }

  /**
   * Handles user list update.
   *
   * @param {boolean} anyOperatorActive is any operator active
   *
   * @memberof WidgetEmbedView
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
    // const noOperatorsDescription = this.uiGet('.qh_widget-bottom__msg--no-operators')
    // noOperatorsDescription.classList.toggle('js-active', !anyOperatorActive)
    // const linesDescription = this.uiGet('.qh_widget-bottom__msg--lines')
    // linesDescription.classList.toggle('js-active', anyOperatorActive)
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
   * @memberof WidgetEmbedView
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
   * @memberof WidgetEmbedView
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
   * @memberof WidgetEmbedView
   */
  collapseView() {
    this.isExpanded = false
    this.element.classList.remove('js-active')
    this.emit('toggleBadgeTopState', false)
    this.extDispatcher.dispatchEvent(
      new CustomEvent('toggleBadgeTopState', {
        detail: {
          isExpanded: false,
          source: 'widgetExtView',
        }
      })
    )
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
