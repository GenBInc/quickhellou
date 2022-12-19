import { FormService } from '../../../genb/base/service/FormService'
import { ComSessionStatus } from '../model/ComSessionStatus'

/**
 * Service for URL based views interaction.
 *
 * @export
 * @class ViewService
 * @extends {FormService}
 */
export class ViewService extends FormService {
  /**
   * Get appointments list.
   *
   * @returns Promise<string> html
   * @memberof ViewService
   */
  getAppointmentsViewList() {
    return this.getAsXMLHttpRequest('/dashboard/appointments/list/')
  }
}
