import { UIView } from '../../genb/base/controller/UIView'
import { HTMLUtils } from '../../genb/base/utils/HTMLUtils'

/**
 * Embed widget view.
 *
 * @export
 * @class WidgetView
 * @extends {UIView}
 */
export class WidgetView extends UIView {
  /**
   * Creates an instance of WidgetView.
   *
   * @param {*} service
   *
   * @memberof WidgetView
   */
  constructor(service) {
    super()
    this.service = service
    this.element = window.parent.document.getElementById('qh_w_frame')
  }

  /**
   * Initializes the view.
   *
   * @memberof WidgetView
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
      this.extensionView.toggleView()
      this.bottomBarView.collapseView()
    })

    this.service.addListener('callRejected', () => {
      this.onCallRejected()
    })
  }

  /**
   * Handles user register response.
   *
   * @param {string} e
   * @memberof WidgetView
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
   * @memberof WidgetView
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
   * @memberof WidgetView
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
   * @memberof WidgetView
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
   * @memberof WidgetView
   */
  setIcon(thumbnailPath) {
    const adminThumbnailElement = this.uiGet('.widget-outlook__admin-thumbnail')
    adminThumbnailElement.style.backgroundImage = `url(${this.service.consoleAppUrl}/media/${thumbnailPath})`
    this.extensionView.setThumbnails(thumbnailPath)
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
   * @memberof WidgetView
   */
  setCallRequestIcon() {
    const widgetIconElement = this.uiGet('.widget-outlook__icon img')
    widgetIconElement.src = `${this.service.consoleAppUrl}/static/images/call-request.svg`
  }

  /**
   * Sets call accepted icon.
   *
   * @memberof WidgetView
   */
  setCallAcceptedIcon() {
    const widgetIconElement = this.uiGet('.widget-outlook__icon img')
    widgetIconElement.src = `${this.service.consoleAppUrl}/static/images/call-accepted.svg`
  }

  /**
   * Sets extension element.
   *
   * @param {WidgetView} extensionView
   */
  setExtension(extensionView) {
    this.extensionView = extensionView
  }

  /**
   * Sets bottom bar element.
   *
   * @param {WidgetView} extensionView
   */
   setBottomBar(bottomBarView) {
    this.bottomBarView = bottomBarView
  }
}
