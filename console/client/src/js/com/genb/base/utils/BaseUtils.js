export class BaseUtils {
  /**
   * Checks if an object is defined.
   *
   * @static
   * @param {String} s
   * @returns
   * @memberof BaseUtils
   */
  static isObjectDefined(s) {
    try {
      return typeof s !== 'undefined' && s !== null
    } catch (e) {
      return false
    }
  }

  static isPage(urlName) {
    const meta = document.querySelector("meta[property='emd:page']")
    if (BaseUtils.isObjectDefined(meta)) {
      return meta.attributes.content.value === urlName
    }
    return false
  }

  /**
   * Returns a hostname.
   *
   * @readonly
   * @static
   * @memberof BaseUtils
   */
  static get hostname() {
    return window.location.hostname
  }

  log(message) {
    console.log(message)
  }
}
