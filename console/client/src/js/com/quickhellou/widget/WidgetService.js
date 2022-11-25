import { EventEmitter } from '../../genb/base/service/EventEmitter'
import { WebSocketService } from '../base/services/WebSocketService'
import { ApiService } from '../base/services/ApiService'
import { ApplicationSettings } from '../base/model/ApplicationSettings'
import { QhUtils } from '../base/utils/QhUtils'

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

              this.webSocketService.addListener('error', (error) => {
                this.emit('error', error)
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

              // attach videochat events
              try {
                this.videochatProxy = videochat.proxy()
                this.videochatProxy.addEventListener('close', () => {
                  this.onCloseVideoChat()
                })
                this.videochatProxy.addEventListener('remote_hangup', () => {
                  this.onCloseVideoChat()
                })
              } catch (e) {
                console.log('Videochat is not defined.')
              }

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
   * Removes connection data in the videochat application.
   */
   destroyVideoChatApp() {
    try {
      this.videochatProxy.destroy()
    } catch (e) {
      console.log('e', e)
    }
  }

  /**
   * Handles videochat session close.
   */
  onCloseVideoChat() {
    this.emit('videochatSessionClose')
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
      this.user.userId,
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
    const adminUuid = this.admins[0]
    this.webSocketService.cancelCall(
      this.sessionRecord.id,
      this.user.userId,
      adminUuid,
      this.widget.uuid
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

    if (a.length) {
      const adminId = QhUtils.extractUserId(a[0])
      this.getUser(adminId).then((user) => {
        this.emit('admin', user)
      })
    }
  }

  /**
   * Handles call accept notification.
   *
   * @param {string} uuid the UUID string
   * @memberof WidgetService
   */
  async onCallAccepted(uuid) {
    this.emit('callAccepted', uuid)
  }

  /**
   * Handles call reject notification.
   *
   * @memberof WidgetService
   */
  onCallRejected() {
    this.emit('callRejected')
    // this.destroyVideoChatApp()
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
   * Sends schedule form.
   *
   * @param {array<object>} fieldSet the field set
   */
  sendScheduleForm(fieldSet) {
      const url = `${this.consoleAppUrl}/dashboard/widget_schedule/${
        this.widgetId
      }/${encodeURIComponent(window.location.hostname.toLowerCase())}/${
        this.widget.uuid
      }`
      return this.apiService.postAsXMLHttpRequest(fieldSet, url)
  }

  /**
   * Sends start video chat form.
   *
   * @param {object} fieldSet
   * @returns the response
   */
  sendStartVideoChatForm(fieldSet) {
    const url = `${this.consoleAppUrl}/dashboard/widget_active_operator/${
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

  /**
   * Gets user by user ID.
   *
   * @param {*} userId
   * @returns
   */
  async getUser(userId) {
    let userJson = await this.apiService.getUserById(userId)
    return JSON.parse(userJson)
  }

  /**
   * Sets communication session rate.
   *
   * @param {number} rate
   * @returns
   */
  async rateComSession(rate) {
    let resultJson = await this.apiService.rateComSession(
      this.sessionRecord.id,
      rate
    )
    return JSON.parse(resultJson)
  }

  /**
   * Sets local user ID.
   *
   * @param {number} userId
   */
  setUserId(userId) {
    this.user.userId = userId
  }

  /**
   * Gets an active operator init form template.
   *
   * @returns the template string
   */
  async getActiveOperatorInitForm() {
    return await this.apiService.getAsXMLHttpRequest(
      `${this.consoleAppUrl}/dashboard/active_operator_init_form`
    )
  }

  /**
   * Gets an inactive operator init form template.
   *
   * @returns the template string
   */
  async getInactiveOperatorInitForm() {
    return await this.apiService.getAsXMLHttpRequest(
      `${this.consoleAppUrl}/dashboard/inactive_operator_init_form`
    )
  }
}
