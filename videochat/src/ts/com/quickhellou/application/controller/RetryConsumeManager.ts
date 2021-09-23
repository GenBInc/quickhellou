import { ColliderService } from '../service/ColliderService'
import { PeerConnectionClient } from '../../PeerConnectionClient'
import { Log } from '../../../genb/base/utils/Log'
import { RetryJobEvent } from '../events/RetryJobEvent'
import { FormService } from '../../../genb/base/services/FormService'
import { BaseUtils } from '../../../genb/base/utils/BaseUtils'

export class RetryConsumeManager extends FormService {
  private colliderService: ColliderService
  private pcClient: PeerConnectionClient
  private roomId: string
  private clientId: string

  private status: string = '__init__'

  /**
   * Creates an instance of RetryConsumeManager.
   *
   * @param {ColliderService} colliderService
   * @param {PeerConnectionClient} pcClient
   * @memberof RetryConsumeManager
   */
  constructor(
    colliderService: ColliderService,
    pcClient: PeerConnectionClient,
    roomId: string,
    clientId: string
  ) {
    super()
    this.colliderService = colliderService
    this.pcClient = pcClient
    this.roomId = roomId
    this.clientId = clientId
  }

  /**
   * Starts jobs.
   *
   * @memberof RetryConsumeManager
   */
  public start(): void {
    Log.log('************* start')
    this.status = 'touch'
    this.doJob()
  }

  /**
   * Triggers next job.
   *
   * @memberof RetryConsumeManager
   */
  public next() {
    this.status = 'consume'
  }

  /**
   * Requests doing a job.
   *
   * @private
   * @memberof RetryConsumeManager
   */
  private doJob(): void {
    Log.log('**** status', this.status)

    if (!this.pcClient.requireDataConsume) {
      return
    }

    if (this.status === 'touch') {
      this.touch()
    } else if (this.status === 'consume') {
      this.consume()
    }
    if (this.status !== 'complete') {
      setTimeout(() => {
        this.doJob()
      }, 3000)
    }
  }

  /**
   * Request touch in go app.
   *
   * @private
   * @memberof RetryConsumeManager
   */
  private touch(): void {
    Log.log('Touch')
    this.colliderService.touch(this.roomId, this.clientId)
  }

  /**
   * Requests consume in py app.
   *
   * @private
   * @memberof RetryConsumeManager
   */
  private consume(): void {
    this.post(
      `/consume/${this.roomId}/${this.pcClient.getSessionId()}/${this.clientId}`
    ).then((result: any) => {
      if (!result) {
        return
      }
      const resultJson: any = JSON.parse(result)
      const messages: any[] = resultJson.messages
      if (!BaseUtils.isObjectDefined(messages)) {
        return
      }
      messages.forEach((message) => {
        Log.log('%%% RETRY CONSUME %%%', message)
        this.pcClient.receiveSignalingMessage(message)
      })
      if (messages.length > 0) {
        this.pcClient.requireDataConsume = false
        this.status = 'complete'
        this.dispatchEvent(RetryJobEvent.COMPLETE)
      }
    })
  }
}
