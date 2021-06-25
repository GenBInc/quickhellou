import { EventEmitter } from '../../genb/base/service/EventEmitter'
import { WebSocketService } from '../base/services/WebSocketService'
import { ApiService } from '../base/services/ApiService'
import { ApplicationSettings } from '../base/model/ApplicationSettings'

/**
 * The widget collective service.
 *
 * @extends EventEmitter
 */
export class WidgetService extends EventEmitter {
  /**
   * Creates an instance of WidgetService.
   *
   * @param {string} consoleAppUrl the console app URL address
   * @param {string} widgetId the widget ID
   */
  constructor(consoleAppUrl, widgetId) {
    super()
    this.apiService = new ApiService(consoleAppUrl)
    this.consoleAppUrl = consoleAppUrl
    this.widgetId = widgetId
    this.users = []
  }

  /**
   * Initializes the service.
   *
   * @memberof WidgetService
   */
  async init() {
    return new Promise((resolve, reject) => {
      this.apiService.getSettings().then((appSettingsJson) => {
        this.appSettings = new ApplicationSettings(appSettingsJson)
        try {
          this.apiService.getWidgetById(this.widgetId).then((widgetObject) => {
            this.widget = JSON.parse(widgetObject)
            this.install().then((response) => {
              const responseJson = JSON.parse(response)
              if (responseJson.status === 'failure') {
                reject(responseJson.result)
              }

              this.webSocketService = new WebSocketService(
                this.appSettings.webSocketServiceUrl
              )

              this.webSocketService.addListener('register', (e) => {
                this.onUserRegister(e)
              })
              this.webSocketService.addListener('listUsers', (e) => {
                this.onListUsers(e)
              })

              this.webSocketService.addListener('callAccepted', (e) => {
                this.onCallAccepted(e)
              })

              this.webSocketService.addListener('callRejected', () => {
                this.onCallRejected()
              })

              this.webSocketService.addListener(
                'communicationRecord',
                (record) => {
                  this.onCommunicationRecord(record)
                }
              )

              this.user = {
                uuid: 'guest_' + String(Math.floor(Date.now() / 1000)),
                roomId: this.widget.uuid,
              }
              this.webSocketService.registerGuest(
                this.user.uuid,
                this.widget.uuid
              )
              resolve()
            })
          })
        } catch (e) {
          console.log(e)
        }
      })
    })
  }

  /**
   * Requests a call with an active admin.
   *
   * @memberof WidgetService
   */
  requestCall() {
    const adminUuid = this.admins[0]
    this.webSocketService.requestCall(
      this.user.uuid,
      adminUuid,
      this.widget.uuid
    )
  }

  /**
   * Cancels a call request.
   *
   * @memberof WidgetService
   */
  cancelCall() {
    this.webSocketService.cancelCall(
      this.user.uuid,
      this.widget.uuid,
      this.sessionRecord.id
    )
  }

  /**
   * Handles user register response.
   *
   * @param {string} response the response
   * @memberof WidgetService
   */
  onUserRegister(response) {
    if (response === 'ok') {
      this.webSocketService.listAdmins(this.user.uuid, this.widget.uuid)
    }
  }

  /**
   * Handles user list refresh response.
   *
   * @param {array<string>} a
   * @memberof WidgetService
   */
  onListUsers(a) {
    this.admins = a
    this.emit('listUsers', a)
  }

  /**
   * Handles call accept notification.
   *
   * @param {string} uuid the UUID string
   * @memberof WidgetService
   */
  async onCallAccepted(uuid) {
    const url = `${this.appSettings.videoAppUrl}/r/${uuid}`
    this.emit('callAccepted', url)
  }

  /**
   * Handles call reject notification.
   *
   * @memberof WidgetService
   */
  onCallRejected() {
    this.emit('callRejected')
  }

  /**
   * Handles communication record.
   *
   * @param {object} record the communication record
   */
  onCommunicationRecord(record) {
    this.sessionRecord = record
  }

  /**
   * Sends contact form.
   *
   * @param {array<object>} fieldSet the field set
   */
  sendContactForm(fieldSet) {
    const url = `${this.consoleAppUrl}/dashboard/widget_extension_embed/${
      this.widgetId
    }/${encodeURIComponent(window.location.hostname.toLowerCase())}/${
      this.widget.uuid
    }`
    return this.apiService.postAsXMLHttpRequest(fieldSet, url)
  }

  /**
   * Installs the widget.
   *
   * @returns true if installed correctly.
   */
  async install() {
    const url = `${this.consoleAppUrl}/dashboard/install/${
      this.widgetId
    }/${encodeURIComponent(window.location.hostname.toLowerCase())}/${
      this.widget.uuid
    }`
    return this.apiService.postAsXMLHttpRequest({}, url)
  }
}
