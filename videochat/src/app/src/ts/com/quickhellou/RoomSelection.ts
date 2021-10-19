import { UIConstants } from './UIConstants'
import { HTMLUtils } from '../genb/base/utils/HTMLUtils'
import { EventDispatcherService } from '../genb/base/services/EventDispatcherService'
import { RoomSelectionEvent } from './RoomSelectionEvent'
import { Util } from './Util'

export class RoomSelection extends EventDispatcherService {
  private roomType: string
  private roomID: string

  /**
   * Creates an instance of RoomSelection.
   *
   * @param {string} roomType
   * @memberof RoomSelection
   */
  constructor(roomType: string) {
    super()
    this.roomType = roomType

    this.roomID = Util.randomString(9)

    this.attachButtonEvents()
  }

  public attachButtonEvents(): void {
    this.attachJoinButtonsEvents()
    this.attachSchedulerButtonsEvents()
  }

  public attachJoinButtonsEvents(): void {
    const joinButtons: HTMLElement[] = HTMLUtils.array('.button--quick-talk')
    joinButtons.forEach((joinButton: HTMLElement): void => {
      joinButton.addEventListener(
        'click',
        (): void => {
          this.onJoinButton()
        },
        false
      )
    })
  }

  public attachSchedulerButtonsEvents(): void {
    const schedulerButtons: HTMLElement[] =
      HTMLUtils.array('.button--scheduler')
    schedulerButtons.forEach((schedulerButton: HTMLElement): void => {
      schedulerButton.addEventListener(
        'click',
        (): void => {
          this.onSchedulerButton()
        },
        false
      )
    })
  }

  public static matchRandomRoomPattern(roomID: string): boolean {
    return roomID.match(/^\d{9}$/) !== null
  }

  public removeEventListeners(): void {}

  private onJoinButton(): void {
    this.dispatchEvent(RoomSelectionEvent.ROOM_SELECTED, {
      roomID: this.roomID,
    })
  }

  private onSchedulerButton(): void {
    this.dispatchEvent(RoomSelectionEvent.SCHEDULER_SELECTED, {
      roomID: this.roomID,
    })
  }
}
