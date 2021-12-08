import { RoomSelection } from '../../RoomSelection'
import { EventDispatcherService } from '../../../../com/genb/base/services/EventDispatcherService'
import { RoomSelectionEvent } from '../../RoomSelectionEvent'

/**
 * Home view controller.
 *
 * @export
 * @class HomeController
 * @extends {EventDispatcherService}
 */
export class HomeController extends EventDispatcherService {
  /**
   * Initializes controller.
   *
   * @public
   * @memberof HomeController
   */
  public init(): void {
    const roomSelection: RoomSelection = new RoomSelection('room')
    roomSelection.addEventListener(
      RoomSelectionEvent.ROOM_SELECTED,
      (data: any): void => {
        this.roomSelectedHander(data.roomID)
      },
      this
    )
  }

  /**
   * Handles room selection.
   *
   * @private
   * @param {string} roomId
   * @memberof HomeController
   */
  private roomSelectedHander(roomId: string): void {
    const roomLink: string = `${window.location.protocol}//${window.location.host}/r/${roomId}`
    document.location.href = roomLink
  }
}
