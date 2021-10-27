import { BaseUtils } from './BaseUtils'

/**
 * HTML utilities.
 *
 * @export
 * @class HTMLUtils
 */
export class HTMLUtils {
  /**
   * Gets an element by a selector.
   *
   * @static
   * @param {string} selector
   * @returns
   * @memberof HTMLUtils
   */
  static get(selector) {
    const element = document.querySelector(selector)
    if (!BaseUtils.isObjectDefined(element)) {
      console.warn(`HTMLUtils::get Element "${selector}" is not defined.`)
    }
    return element
  }

  /**
   * Checks if DOM element selected by given CSS selector exists.
   *
   * @static
   * @param {string} selector
   * @returns
   * @memberof HTMLUtils
   */
  static exists(cssSelector) {
    const element = document.querySelector(cssSelector)
    return BaseUtils.isObjectDefined(element)
  }

  /**
   * Gets a default form element.
   *
   * @memberof HTMLUtils
   */
  static getForm() {
    return HTMLUtils.get('form')
  }

  /**
   * Gets DOM element value by name attribute.
   *
   * @static
   * @param {string} name
   * @returns
   * @memberof HTMLUtils
   */
  static getValueByName(name) {
    return this.get(`*[name="${name}"]`).value
  }

  /**
   * Gets DOM input element value by name attribute.
   *
   * @static
   * @param {string} name
   * @returns
   * @memberof HTMLUtils
   */
  static getInputByName(name) {
    return this.get(`input[name="${name}"]`)
  }

  static getInputByClassName(name) {
    return this.get(`input.${name}`)
  }

  static getSelectByName(name) {
    return this.get(`select[name="${name}"]`)
  }

  static getSelectByClassName(name) {
    return this.get(`select.${name}`)
  }

  static getInputValueByName(name) {
    return this.getInputByName(name).value
  }

  static getCheckboxValueByName(name) {
    return this.getInputByName(name).checked ? 'true' : 'false'
  }

  static setInputValueByName(name, value) {
    const inputElement = this.getInputByName(name)
    if (BaseUtils.isObjectDefined(inputElement)) {
      inputElement.value = value
    } else {
      console.warn(`setInputValueByName:: Element '${name}' is not defined.`)
    }
  }

  static getSelectValueByName(name) {
    return this.getSelectByName(name).value
  }

  static getSelectTextByName(name) {
    return this.getSelectByName(name).selectedOptions[0].text
  }

  static setSelectValueByName(name, value) {
    const selectElement = this.getSelectByName(name)
    if (BaseUtils.isObjectDefined(selectElement)) {
      selectElement.value = value
    } else {
      console.warn(`setSelectValueByName:: Element '${name}' is not defined.`)
    }
  }

  static getInputValueByClassName(name) {
    return this.getInputByClassName(name).value
  }

  static getSelectValueByClassName(name) {
    return this.getSelectByClassName(name).value
  }

  /**
   * Lists DOM elements.
   *
   * @static
   * @param {string} selector
   * @returns
   * @memberof HTMLUtils
   */
  static list(selector) {
    const elementList = document.querySelectorAll(selector)
    if (!BaseUtils.isObjectDefined(elementList)) {
      console.warn(`Elements "${selector}" are not defined.`)
    }
    return elementList
  }

  /**
   * Returns DOM elements list as Array object.
   *
   * @static
   * @param {string} selector
   * @returns
   * @memberof HTMLUtils
   */
  static array(selector) {
    return Array.from(HTMLUtils.list(selector))
  }

  static firstToHTMLElement(elements) {
    if (elements.length > 0) {
      return elements[0]
    }
  }

  /**
   * Activates DOM element created from selector by adding CSS activation class.
   *
   * @static
   * @param {string} selector
   * @memberof HTMLUtils
   */
  static activate(selector) {
    const element = HTMLUtils.get(selector)
    HTMLUtils.activateElement(element)
  }

  /**
   * Activates DOM element by adding CSS activation class.
   *
   * @static
   * @param {HTMLElement} element
   * @memberof HTMLUtils
   */
  static activateElement(element) {
    element.classList.add('js-active')
  }

  /**
   * Deactivates DOM element created from selector by removing CSS activation class.
   *
   * @static
   * @param {string} selector
   * @memberof HTMLUtils
   */
  static deactivate(selector) {
    const element = HTMLUtils.get(selector)
    HTMLUtils.deactivateElement(element)
  }

  /**
   * Deactivates DOM element by removing CSS activation class.
   *
   * @static
   * @param {HTMLElement} element
   * @memberof HTMLUtils
   */
  static deactivateElement(element) {
    element.classList.remove('js-active')
  }

  /**
   * Copies string to clipboard.
   *
   * @static
   * @param {string} s
   * @memberof HTMLUtils
   */
  static copyToClipboard(s) {
    function listener(e) {
      e.clipboardData.setData('text/html', s)
      e.clipboardData.setData('text/plain', s)
      e.preventDefault()
    }
    document.addEventListener('copy', listener)
    document.execCommand('copy')
    document.removeEventListener('copy', listener)
  }

  /**
   * Decodes HTML text.
   *
   * @static
   * @param {string} html
   * @returns
   * @memberof HTMLUtils
   */
  static decodeHtml(html) {
    var txt = document.createElement('textarea')
    txt.innerHTML = html
    return txt.value
  }

  /**
   * Removes all event listeners from an html element by a class name.
   *
   * @param {string} className the class name
   */
  static removeAllEventListeners(className) {
    const element = document.querySelector(className)
    const newElement = element.cloneNode(element)
    element.parentNode.replaceChild(newElement, element)
  }

  /**
   * Removes all event listeners from an html element by a class name.
   *
   * @param {string} className the class name
   */
   static removeAllEventListenersFromElement(element) {
    const newElement = element.cloneNode(element)
    element.parentNode.replaceChild(newElement, element)
  }

  static setCookie(name, value, days = 7, path = '/') {
    const expires = new Date(Date.now() + days * 864e5).toUTCString()
    document.cookie =
      name +
      '=' +
      encodeURIComponent(value) +
      '; expires=' +
      expires +
      '; path=' +
      path
  }

  static getCookie(name) {
    return document.cookie.split('; ').reduce((r, v) => {
      const parts = v.split('=')
      return parts[0] === name ? decodeURIComponent(parts[1]) : r
    }, '')
  }

  static deleteCookie(name, path) {
    this.setCookie(name, '', -1, path)
  }
}
