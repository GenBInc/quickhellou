import { DashboardView } from './DashboardView'
import { WebSocketService } from '../base/services/WebSocketService'
import { ApplicationSettings } from '../base/model/ApplicationSettings'
import { QhUtils } from '../base/utils/QhUtils'

/**
 * Pages dashboard view.
 *
 * @export
 * @class CallsView
 * @extends {DashboardView}
 */
export class CallsView extends DashboardView {
  async init() {
    let userJson = await this.apiService.getCurrentUser()
    this.user = JSON.parse(userJson)
    let appSettingsJson = await this.apiService.getSettings()
    this.appSettings = new ApplicationSettings(appSettingsJson)

    // load call record list
    this.showPageLoader()
    this.loadCallViewList()
    this.hidePageLoader()
  }

  /**
   * Handles WebSocket server connection failure.
   *
   * @memberof CallsView
   */
  onConnectionFailure() {
    const activateButtonElement = this.uiGet('.call-list__button--activate')
    const connectingTextElement = this.uiGet('.com-list__text--connecting')
    const failureTextElement = this.uiGet('.com-list__text--failure')
    failureTextElement.innerHTML = 'Connection failure.'
    activateButtonElement.classList.add('js-hidden')
    connectingTextElement.classList.add('js-hidden')
    failureTextElement.classList.remove('js-hidden')
  }

  /**
   * Initializes web socket service.
   *
   * @memberof CallsView
   */
  initWebSocketService() {
    this.webSocketService = new WebSocketService(
      this.appSettings.webSocketServiceUrl
    )

    this.webSocketService.addListener('register', (e) => {
      this.onUserRegister(e)
    })

    this.webSocketService.addListener('connection_failure', () => {
      this.onConnectionFailure()
    })

    this.webSocketService.addListener('listUsers', (e) => {
      this.onListUsers(e)
    })

    this.webSocketService.addListener('callRequest', (userWSId, userId, widgetId) => {
      this.onCallRequest(userWSId, userId, widgetId)
    })

    this.webSocketService.addListener('callCancel', (recordId) => {
      this.onCallCancel(recordId)
    })
  }

  /**
   * Handles user register response.
   *
   * @param {string} e
   * @memberof CallsView
   */
  onUserRegister(e) {
    if (e === 'ok') {
      const connectingTextElement = this.uiGet('.com-list__text--connecting')
      const deactivateButtonElement = this.uiGet(
        '.call-list__button--deactivate'
      )
      connectingTextElement.classList.add('js-hidden')
      deactivateButtonElement.classList.remove('js-hidden')
    }
  }

  /**
   * Handles user list refresh response.
   *
   * @param {array<string>} userList
   * @memberof CallsView
   */
  onListUsers(userList) {
    const userCountElement = this.uiGet('.active-guests')
    userCountElement.innerHTML = userList.length
    this.clearDroppedSessions(userList)
  }

  /**
   * Checks if any of the connected clients resigned (closed a window).
   *
   * @param {array<string>} userList
   * @memberof CallsView
   */
  async clearDroppedSessions(userList) {
    let isChanged = false
    let pendingSessionsString = await this.apiService.getPendingSessions()
    const pendingSessions = JSON.parse(pendingSessionsString)
    pendingSessions.forEach((pendingSession) => {
      if (!userList.includes(pendingSession.client)) {
        this.apiService.setComSessionAsCancelled(pendingSession.id)
        isChanged = true
      }
    })

    // if any change occured update appointments list
    if (isChanged) {
      this.loadCallViewList()
    }
  }

  /**
   * Handles call request received.
   *
   * @param {string} calleeName
   * @param {string} widgetUuid
   * @memberof CallsView
   */
  onCallRequest(userWSId, userId, widgetUuid) {
    this.createCall(userWSId, userId, widgetUuid)
  }

  /**
   * Handles call cancel received.
   *
   * @param {string} recordId
   * @memberof CallsView
   */
  onCallCancel(recordId) {
    this.cancelCall(recordId)
  }

  /**
   * Creates a call record.
   * 
   * @param {*} userWSId the user ID in the WebSocket
   * @param {*} userId the user ID
   * @param {*} widgetUuid the widget UUID
   */
  async createCall(userWSId, userId, widgetUuid) {
    this.showPageLoader()
    try {
      // create communication
      let comRecordString = await this.apiService.createCall(
        userWSId,
        userId,
        widgetUuid,
      )
      const comRecord = JSON.parse(comRecordString)
      // as the communication is newly created, get the first session record
      const sessionRecord = comRecord.sessions[0]
      // pass communication session to remote widget
      this.passCommunicationRecord(userWSId, comRecord.widget, sessionRecord)
      this.loadCallViewList()
      this.hidePageLoader()
    } catch (e) {
      console.log('exception', e)
    }
  }

  /**
   * Cancels a call.
   *
   * @param {string} recordId
   * @memberof CallsView
   */
  async cancelCall(recordId) {
    this.showPageLoader()
    try {
      await this.apiService.setComSessionAsCancelled(recordId)
      this.loadCallViewList()
      this.hidePageLoader()
    } catch (e) {
      console.log('exception', e)
    }
  }

  /**
   * Loads call list html text from request.
   *
   * @memberof CallsView
   */
  async loadCallViewList() {
    let html = await this.viewService.getAppointmentsViewList()
    const containerElement = this.uiGet('.call-list__content')
    containerElement.innerHTML = html
    this.attachAppointmentListEventListeners()
  }

  /**
   * Attaches appointments list html text.
   *
   * @memberof CallsView
   */
    attachAppointmentsList(html) {
      const containerElement = this.uiGet('.call-list__content')
      containerElement.innerHTML = html
      this.attachAppointmentListEventListeners()
    }

  /**
   * Attaches event listeners to the appointments list button entries.
   *
   * @memberof CallsView
   */
  attachAppointmentListEventListeners() {
    const acceptAppointmentButtonElements = this.uiArray('.list-link--accept')
    acceptAppointmentButtonElements.forEach((button) => {
      button.addEventListener('click', (event) => {
        const id = button.dataset.id
        this.acceptAppointment(id)
      })
    })

    const rejectAppointmentButtonElements = this.uiArray('.list-link--reject')
    rejectAppointmentButtonElements.forEach((button) => {
      button.addEventListener('click', (event) => {
        const id = button.dataset.id
        this.rejectAppointment(id)
      })
    })
  }

  acceptAppointment(id) {
    this.showPageLoader()
    const form = document.querySelector(`.form--accept-appointment[data-id='${id}']`)
    form.submit()
  }

  async rejectAppointment(id) {
    this.showPageLoader()
    const form = document.querySelector(`.form--reject-appointment[data-id='${id}']`)
    form.submit()
  }

  /**
   * Handles call accepting.
   *
   * @param {event} event
   * @memberof CallsView
   */
  async acceptCall(event) {
    this.showPageLoader()
    const buttonElement = event.currentTarget,
      sessionId = buttonElement.dataset.uuid,
      comId = buttonElement.dataset.id
    // get communication record
    let comRecordString = await this.apiService.getCommunicationRecord(comId)
    const comRecord = JSON.parse(comRecordString)
    // get video chat room uuid
    let uuidChunk = await this.apiService.getUuid(
      `${this.user.id}${comRecord.caller_name}${comRecord.id}`
    )
    let uuid = JSON.parse(uuidChunk).uuid
    // update com session status to accepted
    await this.apiService.setComSessionAsAccepted(sessionId)
    // notify remote client
    this.webSocketService.acceptCallRequest(
      this.adminId,
      comRecord.caller_name,
      comRecord.widget,
      uuid
    )
    // open video chat application
    this.openVideoChat(`${this.appSettings.videoAppUrl}/r/${uuid}?init=instant`)
    this.loadCallViewList()
    this.hidePageLoader()
  }

  /**
   * Handles call rejecting.
   *
   * @param {event} event
   * @memberof CallsView
   */
  async rejectCall(event) {
    this.showPageLoader()
    const buttonElement = event.currentTarget,
      sessionId = buttonElement.dataset.uuid,
      comId = buttonElement.dataset.id
    // get communication record
    let comRecordString = await this.apiService.getCommunicationRecord(comId)
    const comRecord = JSON.parse(comRecordString)
    // update com session status to rejected
    await this.apiService.setComSessionAsRejected(sessionId)
    // notify remote client
    this.webSocketService.rejectCallRequest(
      this.adminId,
      comRecord.caller_name,
      comRecord.widget
    )
    this.loadCallViewList()
    this.hidePageLoader()
  }

  /**
   * Pass communication widget to remote widget.
   *
   * @param {string} calleeName the callee name
   * @param {string} roomId the room ID
   * @param {string} comSession the com session
   * @memberof CallsView
   */
  passCommunicationRecord(userWSId, roomId, comSession) {
    this.webSocketService.passCommunicationRecord(
      this.adminId,
      userWSId,
      roomId,
      comSession
    )
  }

  /**
   * Opens video chat window.
   *
   * @param {string} url
   * @memberof CallsView
   */
  openVideoChat(url) {
    window.open(url, '_blank')
  }

  get adminId() {
    return QhUtils.createUserId(this.user.id)
  }
}
