import { Util } from '../../Util'
import { ColliderServiceEvent } from '../model/ColliderServiceEvent'
import { FormService } from '../../../genb/base/services/FormService'
import { Log } from '../../../genb/base/utils/Log'
import { BaseUtils } from '../../../genb/base/utils/BaseUtils'
import { StringUtils } from '../../../genb/base/utils/StringUtils'

/**
 * Signaling channel WebSocket facade.
 * Handles communication with the Collider service.
 *
 * @export
 * @class ColliderService
 * @extends {EventDispatcherService}
 */
export class ColliderService extends FormService {
  public static MESSAGE: string = 'message'

  /**
   * Setups an instance.
   *
   * @static
   * @param {string} wssUrl the WebSocket URL
   * @param {string} wssPostUrl th WebSocket POST URL
   * @param {boolean} force force instance setup
   * @returns {ColliderService}
   * @memberof ColliderService
   */
  public static setupInstance(
    wssUrl: string,
    wssPostUrl: string,
    force: boolean
  ): ColliderService {
    if (!ColliderService.instance || force) {
      ColliderService.instance = new ColliderService(wssUrl, wssPostUrl)
      this.instance.isSet = true
    }
    return ColliderService.instance
  }

  /**
   * Gets an instance.
   *
   * @static
   * @returns
   * @memberof ColliderService
   */
  public static getInstance() {
    if (!!ColliderService.instance) {
      if (BaseUtils.isObjectDefined(this.instance.isSet)) {
        return ColliderService.instance
      }
    }
    // Log.warn('ColliderService::getInstance Collider service is not set.')
    return null
  }

  private static instance: ColliderService

  private websocket: WebSocket
  public isSet: boolean = false
  private wssUrl: string
  private wssPostUrl: string

  private roomId: string
  private clientID: string

  private registered: boolean = false

  private ROOM_TYPE: string = 'room'

  private onerror: any

  /**
   * Creates an instance of ColliderService.
   *
   * @private
   * @param {string} [wssUrl]
   * @param {string} [wssPostUrl]
   * @memberof ColliderService
   */
  private constructor(wssUrl?: string, wssPostUrl?: string) {
    super()
    if (BaseUtils.isObjectDefined(wssUrl)) {
      this.wssUrl = wssUrl
    }
    if (BaseUtils.isObjectDefined(wssPostUrl)) {
      this.wssPostUrl = wssPostUrl
    }
  }

  /**
   * Opens signaling channel.
   *
   * @public
   * @returns {Promise<any>}
   * @memberof ColliderService
   */
  public open(): Promise<any> {
    if (BaseUtils.isObjectDefined(this.websocket)) {
      Log.log('ERROR: ColliderService has been already opened.')
      return
    }

    if (this.wssUrl === undefined) {
      Log.error('The WebSocket address is either invalid or unset. Breaking.')
      return
    }

    Log.log(`Opening signaling channel: ${this.wssUrl}`)
    return new Promise((resolve: any, reject: any) => {
      this.websocket = new WebSocket(this.wssUrl)

      this.websocket.onopen = (): void => {
        Log.log('Signaling channel opened.')

        this.websocket.onerror = (event: any): void => {
          reject(`Signaling channel error. ${event}`)
        }
        this.websocket.onclose = (event: CloseEvent): void => {
          Log.log(`Collider channel closed with code:${event.code}`)
          this.websocket = null
          this.registered = false
          this.dispatchEvent(ColliderServiceEvent.CLOSE, event.code)
        }

        if (
          BaseUtils.isObjectDefined(this.clientID) &&
          BaseUtils.isObjectDefined(this.roomId)
        ) {
          this.register(this.roomId, this.clientID)
        }

        resolve()
      }

      this.websocket.onmessage = (event: any) => {
        Log.log('Collider -> Client: ', JSON.parse(event.data))

        const message: any = Util.parseJSON(event.data)
        if (!BaseUtils.isObjectDefined(message)) {
          Log.log('Failed to parse WSS message: ' + event.data)
          return
        }
        if (!StringUtils.isEmpty(message.error)) {
          Log.log('Signaling server error message: ' + message.error)
          return
        }
        this.dispatchEvent(ColliderServiceEvent.MESSAGE, message.msg)
      }

      this.websocket.onerror = (ev: Event): void => {
        reject(Error(`WebSocket error. ${ev}`))
      }
    })
  }

  /**
   * Responds on ping request.
   *
   * @public
   * @memberof ColliderService
   */
  public respondOnPingRequest(): void {
    const pingMessage: any = {
      cmd: 'ping',
      roomid: this.roomId,
      roomtype: this.ROOM_TYPE,
      clientid: this.clientID,
    }
    this.postMessage(pingMessage)
  }

  /**
   * Calls update session logic to clear non-referenced message out.
   *
   * @public
   * @param {string} sessionsList
   * @memberof ColliderService
   */
  public updateSession(sessionsList: string): void {
    const message: any = {
      cmd: 'session-update',
      roomid: this.roomId,
      roomtype: this.ROOM_TYPE,
      msg: sessionsList,
    }
    this.postMessage(message)
  }

  /**
   * Register client into room.
   *
   * @public
   * @param {string} roomId
   * @param {string} clientID
   * @returns {Promise<any>}
   * @memberof ColliderService
   */
  public register(roomId: string, clientID: string): Promise<any> {
    return new Promise((resolve, reject) => {
      this.roomId = roomId
      this.clientID = clientID

      if (!BaseUtils.isObjectDefined(this.roomId)) {
        Log.log('ERROR: Missing roomID. Stopping client registration.')
        return reject({ code: 0, message: 'Missing roomID.' })
      }

      if (!BaseUtils.isObjectDefined(this.clientID)) {
        Log.log('ERROR: Missing clientID. Stopping client registration.')
        return reject({ code: 0, message: 'Missing clientID.' })
      }

      if (!this.websocket || this.websocket.readyState !== WebSocket.OPEN) {
        return reject({ code: 0, message: 'WebSocket not open.' })
      }

      const registerMessage: object = {
        cmd: 'register',
        roomid: this.roomId,
        roomtype: this.ROOM_TYPE,
        clientid: this.clientID,
      }

      this.websocket.send(JSON.stringify(registerMessage))
      this.registered = true

      return resolve({ code: 1, message: 'Signaling channel registered.' })
    })
  }

  public touch(roomId: string, clientID: string): Promise<any> {
    return new Promise((resolve, reject) => {
      this.roomId = roomId
      this.clientID = clientID

      if (!BaseUtils.isObjectDefined(this.roomId)) {
        Log.log('ERROR: Missing roomID. Stopping client registration.')
        return reject({ code: 0, message: 'Missing roomID.' })
      }

      if (!BaseUtils.isObjectDefined(this.clientID)) {
        Log.log('ERROR: Missing clientID. Stopping client registration.')
        return reject({ code: 0, message: 'Missing clientID.' })
      }

      if (!this.websocket || this.websocket.readyState !== WebSocket.OPEN) {
        return reject({ code: 0, message: 'WebSocket not open.' })
      }

      const registerMessage: object = {
        cmd: 'touch',
        roomid: this.roomId,
        roomtype: this.ROOM_TYPE,
        clientid: this.clientID,
      }

      this.websocket.send(JSON.stringify(registerMessage))

      return resolve({ code: 1, message: 'Touch sent.' })
    })
  }

  /**
   * Closes signaling channel.
   *
   * @public
   * @param {boolean} async
   * @returns
   * @memberof ColliderService
   */
  public async close(async: boolean) {
    Log.log('Closing websocket.')
    if (!!this.websocket) {
      this.websocket.close()
      this.websocket = null
    }

    if (!this.clientID || !this.roomId) {
      return
    }
    // Tell Collider that we're done.
    const path: string = this.getWssPostUrl()
    try {
      await Util.sendUrlRequest('POST', path, async, 'DELETE')
    } catch (error) {
      Log.log('Error deleting web socket connection: ' + error.message)
    }
    this.clientID = null
    this.roomId = null
    this.registered = false
  }

  /**
   * Sends a websocket message.
   *
   * @public
   * @param {*} message
   * @param {boolean} [persistant=true]
   * @returns
   * @memberof ColliderService
   */
  public send(message: any, persistant: boolean = true) {
    if (!this.roomId || !this.clientID) {
      Log.log('ERROR: ColliderService has not registered.')
      return
    }

    const wssMessage: object = {
      cmd: 'send',
      msg: message,
      persistant: persistant.toString(),
    }
    this.postMessage(wssMessage)
  }

  /**
   * Sends a message to other client.
   *
   * @param {string} roomId
   * @param {string} clientId
   * @param {string} otherClientId
   * @param {*} message
   * @returns
   * @memberof ColliderService
   */
  public sendToOther(
    roomId: string,
    clientId: string,
    otherClientId: string,
    message: any
  ) {
    if (!this.roomId || !this.clientID) {
      Log.log('ERROR: ColliderService has not registered.')
      return
    }
    const wssMessage: object = {
      cmd: 'send-to-other',
      roomid: roomId,
      clientid: clientId,
      otherid: otherClientId,
      msg: message,
    }
    this.postMessage(wssMessage)
  }

  /**
   * Broadcasts a message.
   *
   * @param {string} type
   * @param {*} data
   * @memberof ColliderService
   */
  public broadcast(inputType: string, inputData: any) {
    const wssMessage: object = {
      cmd: 'broadcast',
      msg: JSON.stringify({
        type: inputType,
        roomid: this.roomId,
        clientid: this.clientID,
        data: inputData,
      }),
    }
    this.postMessage(wssMessage)
  }

  /**
   * Gets WebSocket communication path.
   *
   * @public
   * @returns {string}
   * @memberof ColliderService
   */
  public getWssPostUrl(): string {
    return `${this.wssPostUrl}/${this.roomId}/${this.clientID}`
  }

  /**
   * If WebSocket connection is available then it sends a WebSocket message.
   * Otherwise, it sends a POST message.
   *
   * @private
   * @param {any} wssMessage
   * @memberof ColliderService
   */
  private postMessage(wssMessage: any): void {
    const msgString: string = JSON.stringify(wssMessage)
    if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
      this.websocket.send(msgString)
    } else {
      this.post(this.getWssPostUrl(), wssMessage.msg)
    }
  }
}
