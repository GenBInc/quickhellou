/**
 * Application settings.
 *
 * @export
 * @class ApplicationSettings
 */
export class ApplicationSettings {
  /**
   * Creates an instance of ApplicationSettings.
   *
   * @param {objString} obj
   * @memberof ApplicationSettings
   */
  constructor(objString) {
    this.objs = JSON.parse(objString)
    this.videoAppUrl = this.getValue('video_app_url')
    this.consoleAppUrl = this.getValue('console_app_url')
    this.webSocketServiceUrl = this.getValue('ws_service_url')
    this.adminEmailAddress = this.getValue('admin_email_address')
  }

  /**
   * Gets value from property name.
   *
   * @param {string} propertyName
   * @returns
   * @memberof ApplicationSettings
   */
  getValue(propertyName) {
    return this.objs.filter((obj) => obj.property === propertyName)[0].value
  }
}
