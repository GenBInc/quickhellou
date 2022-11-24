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
    this.videoAppUrl = this.objs.video_app_url
    this.consoleAppUrl = this.objs.console_app_url
    this.webSocketServiceUrl = this.objs.ws_service_url
    this.adminEmailAddress = this.objs.admin_email_address
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
