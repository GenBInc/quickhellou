import { UIView } from '../../genb/base/controller/UIView'

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
  }

  /**
   * Initializes the view.
   *
   * @memberof WidgetView
   */
  async init() {
    this.service.addListener('listUsers', (e) => {
      this.onListUsers(e)
    })

    const widgetButtonElement = this.uiGet('.widget_base')
    widgetButtonElement.addEventListener('click', () => {
      this.extensionView.toggleView()
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
   * @param {array<string>} a
   * @memberof WidgetView
   */
  onListUsers(a) {
    const userCountElement = this.uiGet('.widget-outlook__alert-text')
    userCountElement.innerHTML = a.length
  }

  /**
   * Sets default widget icon.
   *
   * @memberof WidgetView
   */
  setDefaultIcon() {
    const widgetIconElement = this.uiGet('.widget-outlook__icon img')
    widgetIconElement.src = this.defaultIconSource
  }

  /**
   * Sets call request icon.
   *
   * @memberof WidgetView
   */
  setCallRequestIcon() {
    const widgetIconElement = this.uiGet('.widget-outlook__icon img')
    widgetIconElement.src = '/static/images/call-request.svg'
  }

  /**
   * Sets call accepted icon.
   *
   * @memberof WidgetView
   */
  setCallAcceptedIcon() {
    const widgetIconElement = this.uiGet('.widget-outlook__icon img')
    widgetIconElement.src = '/static/images/call-accepted.svg'
  }

  /**
   * Sets extension element.
   *
   * @param {WidgetView} extensionView
   */
  setExtension(extensionView) {
    this.extensionView = extensionView
  }
}
