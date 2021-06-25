import { FormService } from '../../../genb/base/service/FormService'
import { UserType } from '../model/UserType'

/**
 * Handles WebSocket connection.
 * Points to the go collider server.
 *
 * @export
 * @class WebSocketService
 * @extends {FormService}
 */

export class WebSocketService extends FormService {
  /**
   * Creates an instance of WebSocketService.
   *
   * @param {string} serviceUrl
   * @memberof WebSocketService
   */
  constructor(serviceUrl) {
    super()

    this.url = serviceUrl
    this.isOpen = false

    this.openWebSocketConnection()
  }

  /**
   * Opens server connection.
   *
   * @returns
   * @memberof WebSocketService
   */
  openWebSocketConnection() {
    return new Promise((resolve) => {
      this.websocket = new WebSocket(this.url)
      this.websocket.onopen = () => {
        this.isOpen = true
        this.attachWebSocketEventHandlers()
        resolve()
      }
      this.websocket.onerror = (event) => {
        if (event.currentTarget.readyState === 3) {
          this.emit('connection_failure')
        }
      }
    })
  }

  /**
   * Attaches server event handlers.
   *
   * @memberof WebSocketService
   */
  attachWebSocketEventHandlers() {
    this.websocket.onmessage = (event) => {
      this.handleMessageResponse(event.data)
    }
    this.websocket.onclose = () => {
      this.isOpen = false
    }
  }

  /**
   * Handles server response message.
   *
   * @param {object} response
   * @memberof WebSocketService
   */
  handleMessageResponse(response) {
    if (response === '') {
      return
    }

    const responseJson = JSON.parse(response)
    if (responseJson.error !== '') {
      this.emit('error', responseJson.error)
      return
    }
    const message = responseJson.msg
    if (message !== '') {
      const messageJson = JSON.parse(responseJson.msg)
      switch (messageJson.type) {
        case 'response':
          this.handleNamedResponse(messageJson.body)
          break
        case 'list-clients':
          this.emit('listUsers', messageJson.body)
          break
        case 'send':
          this.handleNamedResponse(messageJson.body)
          break
        default:
          console.log('Response type not found.')
      }
    }
  }

  /**
   * Handles named response.
   *
   * @param {object} responseJson
   * @memberof WebSocketService
   */
  handleNamedResponse(response) {
    if (response === '') {
      return
    }

    const responseJson =
      typeof response === 'string' ? JSON.parse(response) : response

    switch (responseJson.name) {
      case 'register':
        this.emit('register', responseJson.status)
        break
      case WebSocketService.REQUEST_CALL:
        this.emit('callRequest', responseJson.user, responseJson.widget)
        break
      case WebSocketService.CANCEL_CALL:
        this.emit('callCancel', responseJson.record)
        break
      case WebSocketService.ACCEPT_CALL_REQUEST:
        this.emit('callAccepted', responseJson.uuid)
        break
      case WebSocketService.REJECT_CALL_REQUEST:
        this.emit('callRejected')
        break
      case WebSocketService.SEND_COMMUNICATION_RECORD:
        this.emit('communicationRecord', responseJson.record)
        break
      default:
        console.log('No named response found.')
        break
    }
  }

  /**
   * Registers the user in the multiple rooms identified by records ids.
   *
   * @param {string} userId
   * @param {string} userType
   * @param {array<object>} records
   * @memberof WebSocketService
   */
  registerList(userId, userType, records) {
    records.forEach((record) => {
      this.register(userId, userType, record.id)
    })
  }

  /**
   * Registers the admin user in multiple rooms identified by
   * installed widgets ids.
   *
   * @param {string} userId
   * @param {array<object>} widgets
   * @memberof WebSocketService
   */
  registerAdminList(userId, widgets) {
    widgets = widgets.filter((widget) => widget.is_installed === true)
    this.registerList(userId, UserType.ADMIN, widgets)
  }

  /**
   * Deregisters the user from multiple rooms identified by records ids.
   *
   * @param {string} userId
   * @param {array<object>} records
   * @memberof WebSocketService
   */
  deregisterList(userId, records) {
    records.forEach((record) => {
      this.deregister(userId, record.id)
    })
  }

  /**
   * Registers the user in the room.
   *
   * @param {string} userId
   * @param {string} userType
   * @param {string} roomId
   * @memberof WebSocketService
   */
  register(userId, userType, roomId) {
    this.sendWebSocketMessage({
      cmd: 'register',
      clientid: userId,
      clienttype: userType,
      roomid: roomId,
    })
  }

  /**
   * Registers the admin user in the room.
   *
   * @param {string} userId
   * @param {string} roomId
   * @memberof WebSocketService
   */
  registerAdmin(userId, roomId) {
    this.register(userId, UserType.ADMIN, roomId)
  }

  /**
   * Registers the guest user in the room.
   *
   * @param {string} userId
   * @param {string} roomId
   * @memberof WebSocketService
   */
  registerGuest(userId, roomId) {
    this.register(userId, UserType.GUEST, roomId)
  }

  /**
   * Deregisters the user from the room.
   *
   * @param {string} userId
   * @param {string} roomId
   * @memberof WebSocketService
   */
  deregister(userId, roomId) {
    this.sendWebSocketMessage({
      cmd: 'deregister',
      clientid: userId,
      roomid: roomId,
    })
  }

  /**
   * Sends a message to the WebSocket server room.
   *
   * @param {object} user
   * @param {string} message
   * @memberof WebSocketService
   */
  send(user, message) {
    this.sendWebSocketMessage({
      cmd: WebSocketService.SEND,
      clientid: user.uuid,
      roomid: user.client_board_id,
      msg: message,
    })
  }

  /**
   * Sends a message to the other user.
   *
   * @param {string} userId
   * @param {string} otherUserId
   * @param {string} roomId
   * @param {string} message
   * @memberof WebSocketService
   */
  sendToOther(userId, otherUserId, roomId, message) {
    this.sendWebSocketMessage({
      cmd: 'send-to-other',
      clientid: userId,
      roomid: roomId,
      otherid: otherUserId,
      msg: message,
    })
  }

  /**
   * Lists all clients from the room.
   *
   * @param {string} userId
   * @param {string} userType
   * @param {string} roomId
   * @memberof WebSocketService
   */
  listClients(userId, userType, roomId) {
    this.sendWebSocketMessage({
      cmd: 'list-clients',
      clientid: userId,
      clienttype: userType,
      roomid: roomId,
    })
  }

  /**
   * Lists all guests from the room.
   *
   * @param {string} userId
   * @param {string} roomId
   * @memberof WebSocketService
   */
  listGuests(userId, roomId) {
    this.listClients(userId, UserType.GUEST, roomId)
  }

  /**
   * Lists all admins from the room.
   *
   * @param {string} userId
   * @param {string} roomId
   * @memberof WebSocketService
   */
  listAdmins(userId, roomId) {
    this.listClients(userId, UserType.ADMIN, roomId)
  }

  /**
   * Requests a call with admin user.
   *
   * @param {string} userId
   * @param {string} adminId
   * @param {string} roomId
   * @memberof WebSocketService
   */
  requestCall(userId, adminId, roomId) {
    this.sendToOther(
      userId,
      adminId,
      roomId,
      JSON.stringify({
        type: 'send',
        body: {
          name: WebSocketService.REQUEST_CALL,
          user: userId,
          widget: roomId,
        },
      })
    )
    
    /*this.sendWebSocketMessage({
      cmd: WebSocketService.SEND,
      clientid: userId,
      clienttype: UserType.GUEST,
      roomid: roomId,
      msg: JSON.stringify({
        type: 'send',
        body: {
          name: WebSocketService.REQUEST_CALL,
          user: userId,
          widget: roomId,
        },
      }),
    })*/
  }

  /**
   * Sends a cancel call request.
   *
   * @param {string} userId
   * @param {string} roomId
   * @param {string} recordId
   * @memberof WebSocketService
   */
  cancelCall(userId, roomId, recordId) {
    this.sendWebSocketMessage({
      cmd: WebSocketService.SEND,
      clientid: userId,
      clienttype: UserType.GUEST,
      roomid: roomId,
      msg: JSON.stringify({
        type: 'send',
        body: {
          name: WebSocketService.CANCEL_CALL,
          user: userId,
          widget: roomId,
          record: recordId,
        },
      }),
    })
  }

  /**
   * Accepts call request.
   *
   * @param {string} calleeId
   * @param {string} callerUserId
   * @param {string} roomId
   * @param {string} comSessionId
   * @memberof WebSocketService
   */
  acceptCallRequest(calleeId, callerUserId, roomId, comSessionId) {
    this.sendToOther(
      calleeId,
      callerUserId,
      roomId,
      JSON.stringify({
        type: 'send',
        body: {
          name: WebSocketService.ACCEPT_CALL_REQUEST,
          uuid: comSessionId,
        },
      })
    )
  }

  /**
   * Rejects call request.
   *
   * @param {string} calleeId
   * @param {string} callerUserId
   * @param {string} roomId
   * @memberof WebSocketService
   */
  rejectCallRequest(calleeId, callerUserId, roomId) {
    this.sendToOther(
      calleeId,
      callerUserId,
      roomId,
      JSON.stringify({
        type: 'send',
        body: {
          name: WebSocketService.REJECT_CALL_REQUEST,
        },
      })
    )
  }

  /**
   * Passes communication session record to remote client.
   *
   * @param {string} userId
   * @param {string} otherUserId
   * @param {string} roomId
   * @param {object} record
   * @memberof WebSocketService
   */
  passCommunicationRecord(userId, otherUserId, roomId, record) {
    this.sendToOther(
      userId,
      otherUserId,
      roomId,
      JSON.stringify({
        type: 'send',
        body: {
          name: WebSocketService.SEND_COMMUNICATION_RECORD,
          record: record,
        },
      })
    )
  }

  /**
   * Sends the message to the WebSocket service.
   *
   * @param {object} message the message
   * @param {boolean} persistant
   * @memberof WebSocketService
   */
  async sendWebSocketMessage(message, persistant = true) {
    if (!this.isOpen) {
      await this.openWebSocketConnection()
    }

    message.roomtype = 'client_board'
    message.persistant = String(persistant)
    this.websocket.send(JSON.stringify(message))
  }
}

WebSocketService.SEND = 'send'
WebSocketService.REQUEST_CALL = 'request-call'
WebSocketService.CANCEL_CALL = 'cancel-call'
WebSocketService.ACCEPT_CALL_REQUEST = 'accept-call-request'
WebSocketService.REJECT_CALL_REQUEST = 'reject-call-request'
WebSocketService.SEND_COMMUNICATION_RECORD = 'send-communication-record'
