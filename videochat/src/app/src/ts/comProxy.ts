import { EventDispatcherService } from './com/genb/base/services/EventDispatcherService'
import { BaseUtils } from './com/genb/base/utils/BaseUtils'
import { Log } from './com/genb/base/utils/Log'
import { ColliderServiceEvent } from './com/quickhellou/application/model/ColliderServiceEvent'
import { PeerConnectionResponseType } from './com/quickhellou/application/model/PeerConnectionResponseType'
import { ColliderService } from './com/quickhellou/application/service/ColliderService'
import { CallEvent } from './com/quickhellou/CallEvent'
import { Util } from './com/quickhellou/Util'
/**
 * The communication proxy.
 */
export class ComProxy extends EventDispatcherService {
  
  /** the Collider service */
  private colliderService: ColliderService

  /**
   * The proxy constructor.
   */
  constructor() {
    super()
    this.retry()
  }

  /**
   * Retry manager function for acquiring initialized service.
   * // TODO make it event driven
   */
  retry() {
    setTimeout(() => {
      if (!!ColliderService.getInstance()) {
        this.init()
      }
      this.retry()
    }, 3000)
  }

  /**
   * Initializes the proxy.
   */
  init() {
    this.colliderService = ColliderService.getInstance()

    this.colliderService.addEventListener(
      ColliderServiceEvent.MESSAGE,
      this.onReceiveColliderChannelMessage,
      this
    )

    this.colliderService.addEventListener(
      ColliderServiceEvent.CLOSE,
      this.onColliderChannelClose,
      this
    )
  }

  destroy(roomId:string, clientId:string) {
    /*this.colliderService.deregister(roomId, clientId).then(() => {
      this.dispatchEvent('deregistered')
    })*/
    this.colliderService.destroy()
  }

  /**
   * Resolves response signaling message.
   *
   * @param {string} message the message
   *
   * @memberof ComProxy
   */
  onReceiveColliderChannelMessage(message: string) {
    let messageJson: any = Util.parseJSON(message)
    if (typeof messageJson === 'string') {
      messageJson = Util.parseJSON(messageJson)
    }
    if (!BaseUtils.isObjectDefined(messageJson)) {
      Log.warn(
        'MediaCommunication::onReceiveColliderChannelMessage No message defined.'
      )
      return
    }
    const type: string = messageJson.type
    if (PeerConnectionResponseType.isBye(type)) {
      this.onRemoteHangup(messageJson.sessionId)
      return
    }
  }

  /**
   * Handles remote hangup signal.
   *
   * @private
   * @param {string} sessionId
   * 
   * @memberof ComProxy
   */
  private onRemoteHangup(sessionId: string) {
    this.dispatchEvent(CallEvent.REMOTE_HANGUP, sessionId)
  }

  /**
   * Handles unexpected Collider channel close.
   *
   * @memberof ComProxy
   */
  onColliderChannelClose() {
    this.dispatchEvent(ColliderServiceEvent.CLOSE)
  }
}

/**
 * Proxy expose function.
 * 
 * @returns the ComProxy instance.
 */
export function proxy() {
  Log.log('Videochat proxy initialized.')
  return new ComProxy()
}
