import { FormService } from '../../../genb/base/service/FormService'
import { ComSessionStatus } from '../model/ComSessionStatus'

/**
 * Application REST API facade.
 * Points to the '{console_app_url}/api/' end.
 *
 * @export
 * @class ApiService
 * @extends {FormService}
 */
export class ApiService extends FormService {
  constructor(baseUrl) {
    super()
    this.baseUrl = baseUrl
  }

  /**
   * Gets current user.
   *
   * @returns
   * @memberof ApiService
   */
  getCurrentUser() {
    return this.getJson(`${this.baseUrl}/api/users/current/`)
  }

  /**
   * Gets application settings
   *
   * @returns
   * @memberof ApiService
   */
  getSettings() {
    return this.getJson(`${this.baseUrl}/api/settings/`)
  }

  /**
   * Gets user by id.
   *
   * @param {string} userId
   * @returns
   * @memberof ApiService
   */
  getUserById(userId) {
    return this.getJson(`${this.baseUrl}/api/users/${userId}/`)
  }

  /**
   * Gets widget by id.
   *
   * @param {string} widgetId
   * @returns
   * @memberof ApiService
   */
  getWidgetById(widgetId) {
    return this.getJson(`${this.baseUrl}/api/widgets/${widgetId}/`)
  }

  /**
   * Gets communication record by id.
   *
   * @param {string} communicationId
   * @returns
   * @memberof ApiService
   */
  getCommunicationRecord(communicationId) {
    return this.getJson(
      `${this.baseUrl}/api/appointments/${communicationId}/`
    )
  }

  /**
   * Gets Json data from XMLHttpRequest request.
   *
   * @param {string} actionName
   * @returns
   * @memberof ApiService
   */
  getJson(actionName) {
    return this.getAsXMLHttpRequest(`${actionName}?format=json`)
  }

  /**
   * Creates call record.
   *
   * @param {string} callerName
   * @param {string} widgetUuid
   * @returns
   * @memberof ApiService
   */
  createCall(userWSId, userId, widgetUuid) {
    const fieldSet = {
      caller_name: userWSId,
      caller_id: userId,
      widget_uuid: widgetUuid,
    }
    return this.postAsXMLHttpRequest(
      fieldSet,
      `${this.baseUrl}/api/appointments/`
    )
  }

  /**
   * 
   * @param {*} id the communication session ID 
   * @param {number} rate the session rate
   * @returns 
   */
  rateComSession(id, rate) {
    return this.getAsXMLHttpRequest(
      `${this.baseUrl}/api/com_sessions/rate/${id}/${rate}`
    )
  }

  /**
   * Cancels call record.
   *
   * @param {string} callerName
   * @param {string} widgetUuid
   * @returns
   * @memberof ApiService
   */
  cancelCall(id) {
    return this.getAsXMLHttpRequest(
      `${this.baseUrl}/api/appointments/cancel/${id}/`
    )
  }

  /**
   * Gets UUID from string.
   *
   * @param {string} str
   * @memberof ApiService
   */
  getUuid(str) {
    // TODO: make it as POST
    return this.getAsXMLHttpRequest(
      `${this.baseUrl}/api/com_sessions/room-uuid/${str}`
    )
  }

  /**
   * Sets communication session status as accepted.
   *
   * @param {string} id
   * @returns
   * @memberof ApiService
   */
  setComSessionAsAccepted(id) {
    return this.setComSessionStatus(id, ComSessionStatus.STATUS_ACCEPTED)
  }

  /**
   * Sets communication session status as rejected.
   *
   * @param {string} id
   * @returns
   * @memberof ApiService
   */
  setComSessionAsRejected(id) {
    return this.setComSessionStatus(id, ComSessionStatus.STATUS_REJECTED)
  }

  /**
   * Sets communication session status as cancelled.
   *
   * @param {string} id
   * @returns
   * @memberof ApiService
   */
  setComSessionAsCancelled(id) {
    return this.setComSessionStatus(id, ComSessionStatus.STATUS_CANCELLED)
  }

  /**
   * Sets communication session status as completed.
   *
   * @param {string} id
   * @returns
   * @memberof ApiService
   */
  setComSessionAsCompleted(id) {
    return this.setComSessionStatus(id, ComSessionStatus.STATUS_COMPLETED)
  }

  /**
   * Sets communication session status as enqueued.
   *
   * @param {string} id
   * @returns
   * @memberof ApiService
   */
  setComSessionAsEnqueued(id) {
    return this.setComSessionStatus(id, ComSessionStatus.STATUS_ENQUEUED)
  }

  /**
   * Sets communication session status.
   *
   * @param {string} id
   * @param {number} status
   * @returns
   * @memberof ApiService
   */
  setComSessionStatus(id, status) {
    return this.getAsXMLHttpRequest(
      `${this.baseUrl}/api/com_sessions/status/${id}/${status}`
    )
  }

  /**
   * Gets pending sessions.
   *
   * @memberof ApiService
   */
  getPendingSessions() {
    return this.getAsXMLHttpRequest(`${this.baseUrl}/api/com_sessions/pending/1`)
  }
}
