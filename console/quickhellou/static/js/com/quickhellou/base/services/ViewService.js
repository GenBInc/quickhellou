import { FormService } from '../../../genb/base/service/FormService'

/**
 * Service for URL based views interaction.
 *
 * @export
 * @class ViewService
 * @extends {FormService}
 */
export class ViewService extends FormService {
  /**
   * Get call list view.
   *
   * @returns Promise<string> html
   * @memberof ViewService
   */
  getCallViewList() {
    return this.getAsXMLHttpRequest('/dashboard/communications/list/')
  }
}
