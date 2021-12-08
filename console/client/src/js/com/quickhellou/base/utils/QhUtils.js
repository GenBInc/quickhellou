import { BaseUtils } from '../../../genb/base/utils/BaseUtils'
import { StringUtils } from '../../../genb/base/utils/StringUtils'

/**
 * EngagedMD service utils.
 *
 * @export
 * @class QhUtils
 */
export class QhUtils {
  /**
   * Checks for given page.
   *
   * @static
   * @param {string} urlName
   * @returns
   * @memberof QhUtils
   */
  static isPage(urlName) {
    const meta = document.querySelector("meta[property='qh:view']")
    if (BaseUtils.isObjectDefined(meta)) {
      return StringUtils.equals(meta.attributes.content.value, urlName)
    }
    return false
  }

  /**
   * Return EMD property value.
   *
   * @static
   * @param {string} propertyName
   * @returns {string} property value
   * @memberof QhUtils
   */
  static getQhProperty(propertyName) {
    const meta = document.querySelector(`meta[property='qh:${propertyName}']`)
    if (BaseUtils.isObjectDefined(meta)) {
      return meta.attributes.content.value
    }
    console.warn(`QhUtils::getQhProperty No "${propertyName}" property found.`)
    return null
  }

  /**
   * Returns parsed quickhellou property value.
   *
   * @static
   * @param {string} propertyName
   * @returns {object} parsed property value object
   * @memberof QhUtils
   */
  static getQhPropertyObject(propertyName) {
    return JSON.parse(QhUtils.getQhProperty(propertyName))
  }

  /**
   * Is application in test mode.
   *
   * @memberof QhUtils
   */
  static inTestMode() {
    return StringUtils.equals(QhUtils.getQhProperty('developerMode'), 'test')
  }

  /**
   * Creates key for websocket communication that contains user id. 
   * 
   * @param {string} userId 
   * @returns 
   */
  static createUserId(userId) {
    return `${this.appUuid}${userId}`
  }

  /**
   * Extracts id from user key generated for websocket identification.
   * 
   * @param {string} key 
   * @returns 
   */
  static extractUserId(key) {
    return key.split(this.appUuid)[1]
  }

  /**
   * Randomly generated application UUID.
   *
   * @readonly
   * @static
   * @memberof QhUtils
   */
  static get appUuid() {
    return 'faf8c9f7-99f7-4b9a-8ab8-c1ec416737e7'
  }
}
