import { StringUtils } from './StringUtils'
import { Enviroment } from '../models/Enviroment'

/**
 * Base utilities.
 *
 * @export
 * @class BaseUtils
 */
export class BaseUtils {
  public static UNDEFINED: undefined = undefined
  public static NULL: null = null

  /**
   * Checks if an object is defined.
   *
   * @public
   * @static
   * @param {*} s
   * @returns {boolean}
   * @memberof BaseUtils
   */
  public static isObjectDefined(s: any): boolean {
    try {
      return typeof s !== 'undefined' && s !== null
    } catch (e) {
      return false
    }
  }

  /**
   * Checks if object is not empty.
   *
   * @public
   * @static
   * @param {*} object
   * @returns {boolean}
   * @memberof BaseUtils
   */
  public static isObjectNotEmpty(object: any): boolean {
    return (
      this.isObjectDefined(object) &&
      Object.getOwnPropertyNames(object).length !== 0
    )
  }

  /**
   * Navigates to an URL address.
   *
   * @param {string} url
   * @memberof BaseUtils
   */
  public static navigateToUrl(url: string) {
    window.location.href = url
  }

  public static isLocalEnviroment(): boolean {
    return StringUtils.equals(this.getEnviroment(), Enviroment.LOCAL)
  }

  public static isSandboxEnviroment(): boolean {
    return StringUtils.equals(this.getEnviroment(), Enviroment.SANDBOX)
  }

  public static isProductionEnviroment(): boolean {
    return StringUtils.equals(this.getEnviroment(), Enviroment.PRODUCTION)
  }

  public static get hostname(): string {
    return window.location.hostname
  }

  private static getEnviroment(): string {
    const element: Element = document.querySelector('meta[property="vis:env"]')
    let enviroment: string = Enviroment.LOCAL

    if (BaseUtils.isObjectDefined(element)) {
      enviroment =
        BaseUtils.isObjectDefined(element) && element.getAttribute('content')
    } else {
      const hostname: string = window.location.hostname
      enviroment = StringUtils.equals(hostname, Enviroment.PRODUCTION_HOSTNAME)
        ? Enviroment.PRODUCTION
        : Enviroment.SANDBOX
    }

    return enviroment
  }
}
