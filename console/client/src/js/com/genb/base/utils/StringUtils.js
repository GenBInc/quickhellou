/**
 * String utilities
 * 
 * @export
 * @class StringUtils
 */
export class StringUtils {
  
  static EMPTY = "";
  static URL_TARGET_BLANK = "_blank";
  static URL_TARGET_SELF = "_self";
    
  /**
   * Checks if a string is defined.
   * 
   * @static
   * @param {string} s 
   * @returns {boolean} 
   * @memberof StringUtils
   */
  static isDefined(s) {
    return typeof s === "string";
  }

  /**
   * Checks if a string is empty.
   * 
   * @static
   * @param {string} s 
   * @returns 
   * @memberof StringUtils
   */
  static isEmpty(s) {
    return typeof s === "string" && s.length === 0;
  }

  /**
   * Checks if a string is not empty.
   * 
   * @static
   * @param {string} s 
   * @returns {boolean} 
   * @memberof StringUtils
   */
  static isNotEmpty(s) {
    return !this.isEmpty(s);
  }

  /**
   * Checks if two strings are equal.
   * 
   * @static
   * @param {string} string1 
   * @param {string} string2 
   * @returns {boolean} 
   * @memberof StringUtils
   */
  static equals(string1, string2) {
    return string1 === string2; 
  }

  /**
   * Gets an unique identifier.
   * 
   * @static
   * @returns {string} 
   * @memberof StringUtils
   */
  static getUID() {
    var timestamp = new Date().getTime();  
    return timestamp.toString();
  }

  /**
   * Checks if e-mail string is valid.
   * 
   * @static
   * @param {string} email 
   * @returns {boolean} 
   * @memberof StringUtils
   */
  static isEmailValid(email) {
    return /^[a-zA-Z0-9.!#$%&'*+\/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/.test(email);
  }

  /**
   * Checks if IP address is valid.
   *
   * @static
   * @param {*} ipAddress
   * @returns
   * @memberof StringUtils
   */
  static isIpAddressValid(ipAddress) {
    return /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/.test(ipAddress);
  }
  
  /**
   * Checks if URL string is valid.
   * 
   * @static
   * @param {string} url 
   * @returns {boolean} 
   * @memberof StringUtils
   */
  static isUrlValid(url) {
    return /((http|ftp|https):\/\/)?[\w-]+(\.[\w-]+)+([\w.,@?^=%&amp;:\/~+#-]*[\w@?^=%&amp;\/~+#-])?/.test(url);
  }

  /**
   * Checks if a string is a number.
   * 
   * @static
   * @param {string} s 
   * @returns {boolean} 
   * @memberof StringUtils
   */
  static isNumber(s) {
    return /^-?\d*[\.]?\d+$/.test(s);
  }

  /**
   * Checks if a string is in a currency format.
   * 
   * @static
   * @param {string} s 
   * @returns {boolean} 
   * @memberof StringUtils
   */
  static isCurrency(s) {
    return /(?=.)^\$?(([1-9][0-9]{0,2}(,[0-9]{3})*)|[0-9]+)?(\.[0-9]{1,2})?$/.test(s);
  }

  /**
   * Extracts Form Builder field type string.
   * 
   * @static
   * @param {string} className 
   * @returns {string} 
   * @memberof StringUtils
   */
  static extractFormBuilderFormFieldType(className) {
    return className.split(" ")[0].split("-")[1];
  }

  /**
   * Extracts file name from path.
   * 
   * @static
   * @param {string} path 
   * @returns {string} 
   * @memberof StringUtils
   */
  static extractFileNameFromPath(path) {
    return path.replace(/^.*[\\\/]/, '');
  }

  /**
   * Capitalize first letter of a string.
   *
   * @static
   * @param {string} s
   * @returns {string}
   * @memberof StringUtils
   */
  static capitalize(i) {
    return i.replace(/(^| )(\w)/g, s => s.toUpperCase());
  }

  /**
   * Converts string to boolean.
   * 
   * @static
   * @param {string} s 
   * @returns {boolean} 
   * @memberof StringUtils
   */
  static toBoolean(s) {
    return /(true|True|1)/g.test(s);
  }
  
  /**
   * Strips string from quotes.
   *
   * @static
   * @param {*} expression
   * @returns
   * @memberof StringUtils
   */
  static stripFromQuotes(expression) {
    let matches = /(['"]?)(.*)\1/.exec(expression); 
    if (matches.length > 2) {
      return matches[2];
    }
    return StringUtils.EMPTY;
  }

  static hashCode(s) {
    return s.split('').reduce((prevHash, currVal) =>
      ((prevHash << 5) - prevHash) + currVal.charCodeAt(0), 0);
  }
}