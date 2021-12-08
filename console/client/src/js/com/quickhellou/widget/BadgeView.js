import { UIView } from '../../genb/base/controller/UIView'
import { HTMLUtils } from '../../genb/base/utils/HTMLUtils'

/**
 * Widget badge view.
 *
 * @export
 * @class BadgeView
 * @extends {UIView}
 */
export class BadgeView extends UIView {
  /**
   * Creates an instance of BadgeView.
   *
   * @param {*} service
   *
   * @memberof BadgeView
   */
  constructor(service) {
    super()
    this.service = service
    this.element = window.parent.document.getElementById('qh_w_frame')
  }

  /**
   * Initializes the view.
   *
   * @memberof BadgeView
   */
  async init() {
    this.service.addListener('listUsers', (list) => {
      this.onListUsers(!!list.length)
    })
    this.service.addListener('admin', (e) => {
      this.onAdmin(e)
    })

    const widgetButtonElement = this.uiGet('.widget_base')
    widgetButtonElement.addEventListener('click', () => {
      this.emit('collapse')
    })

    this.service.addListener('callRejected', () => {
      this.onCallRejected()
    })
  }

  /**
   * Handles user register response.
   *
   * @param {string} e
   * @memberof BadgeView
   */
  onUserRegister(e) {
    if (e === 'ok') {
      this.webSocketService.listAdmins(this.user.uuid, this.widget.uuid)
    }
  }

  /**
   * Handles user list refresh response.
   *
   * @param {boolean} anyOperatorActive
   * 
   * @memberof BadgeView
   */
  onListUsers(anyOperatorActive) {
    this.toggleBackgroundElementActiveState(anyOperatorActive)
    if (!anyOperatorActive) {
      this.toggleUserIconElements(false)
    }
    this.toggleTopState(!anyOperatorActive)
  }

  /**
   * On admin user initialization.
   * @param {*} adminUser 
   * 
   * @memberof BadgeView
   */
  onAdmin(adminUser) {
    if (adminUser.thumbnail !== '') {
      this.setIcon(adminUser.thumbnail)
      this.toggleUserIconElements(true)
    }
  }

  /**
   * Handles call rejection.
   * 
   * @memberof BadgeView
   */
  onCallRejected() {
    this.toggleTopState(true)
  }

  toggleUserIconElements(force) {
    const userCircleElement = document.querySelector('.widget-outlook__alert')
    userCircleElement.classList.toggle('js-active', force)
  }

  toggleBackgroundElementActiveState(force) {
    const backgroundCircleElement = document.querySelector(
      '.widget-outlook__background-circle'
    )
    backgroundCircleElement.classList.toggle('js-active', force)
  }

  /**
   * Sets active admin user thumbnail icon.
   *
   * @param {string} thumbnailPath
   *
   * @memberof BadgeView
   */
  setIcon(thumbnailPath) {
    const adminThumbnailElement = this.uiGet('.widget-outlook__admin-thumbnail')
    adminThumbnailElement.style.backgroundImage = `url(${this.service.consoleAppUrl}/media/${thumbnailPath})`
    this.emit('setThumbnail', thumbnailPath)
  }

  /**
   * Toggles vertical position state.
   *
   * @memberof WidgetBottomBarView
   */
  toggleTopState(force) {
    if (HTMLUtils.getCookie('qh_bottom_bar') === 'false') {
      force = false
    }
    
    this.isTopState = force
    if (force) {
      this.element.classList.add('js-top')
    } else {
      this.element.classList.remove('js-top')
    }
  }

  /**
   * Sets call request icon.
   *
   * @memberof BadgeView
   */
  setCallRequestIcon() {
    const widgetIconElement = this.uiGet('.widget-outlook__icon img')
    widgetIconElement.src = `${this.service.consoleAppUrl}/static/images/call-request.svg`
  }

  /**
   * Sets call accepted icon.
   *
   * @memberof BadgeView
   */
  setCallAcceptedIcon() {
    const widgetIconElement = this.uiGet('.widget-outlook__icon img')
    widgetIconElement.src = `${this.service.consoleAppUrl}/static/images/call-accepted.svg`
  }
}
