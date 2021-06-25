/**
 * String utilities
 *
 * @export
 * @class StringUtils
 */
export class StringUtils {
  public static EMPTY: string = "";
  public static TRUE: string = "true";
  public static FALSE: string = "false";
  public static URL_TARGET_BLANK: string = "_blank";
  public static URL_TARGET_SELF: string = "_self";

  /**
   * Checks if a string is defined.
   *
   * @static
   * @param {string} s
   * @returns {boolean}
   * @memberof StringUtils
   */
  public static isDefined(s: string): boolean {
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
  public static isEmpty(s: string) {
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
  public static isNotEmpty(s: string): boolean {
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
  public static equals(string1: string, string2: string): boolean {
    return string1 === string2;
  }

  /**
   * Gets an unique identifier.
   *
   * @static
   * @returns {string}
   * @memberof StringUtils
   */
  public static getUID(): string {
    const timestamp: number = new Date().getTime();
    return timestamp.toString();
  }

  public static uuidv4(): string {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === "x" ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  /**
   * Checks if e-mail string is valid.
   *
   * @static
   * @param {string} email
   * @returns {boolean}
   * @memberof StringUtils
   */
  public static isEmailValid(email: string): boolean {
    return /^[a-zA-Z0-9.!#$%&'*+\/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/.test(
      email
    );
  }

  /**
   * Checks if URL string is valid.
   *
   * @static
   * @param {string} url
   * @returns {boolean}
   * @memberof StringUtils
   */
  public static isUrlValid(url: string): boolean {
    return /((http|ftp|https):\/\/)?[\w-]+(\.[\w-]+)+([\w.,@?^=%&amp;:\/~+#-]*[\w@?^=%&amp;\/~+#-])?/.test(
      url
    );
  }

  /**
   * Checks if a string is a number.
   *
   * @static
   * @param {string} s
   * @returns {boolean}
   * @memberof StringUtils
   */
  public static isNumber(s: string): boolean {
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
  public static isCurrency(s: string): boolean {
    return /(?=.)^\$?(([1-9][0-9]{0,2}(,[0-9]{3})*)|[0-9]+)?(\.[0-9]{1,2})?$/.test(
      s
    );
  }

  /**
   * Extracts Form Builder field type string.
   *
   * @static
   * @param {string} className
   * @returns {string}
   * @memberof StringUtils
   */
  public static extractFormBuilderFormFieldType(className: string): string {
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
  public static extractFileNameFromPath(path: string): string {
    return path.replace(/^.*[\\\/]/, "");
  }

  /**
   * Converts string to boolean.
   *
   * @static
   * @param {string} s
   * @returns {boolean}
   * @memberof StringUtils
   */
  public static toBoolean(s: string): boolean {
    return /(true|True|1)/g.test(s);
  }

  public static toString(b: boolean): string {
    return b ? "true" : "false";
  }

  public static stripFromQuotes(expression: string): string {
    const matches: RegExpMatchArray = /(['"]?)(.*)\1/.exec(expression);
    if (matches.length > 2) {
      return matches[2];
    }
    return StringUtils.EMPTY;
  }

  public static hashCode(s: string): string {
    return s
      .split("")
      .reduce(
        (prevHash: any, currVal: string) =>
          (prevHash << 5) - prevHash + currVal.charCodeAt(0),
        0
      );
  }
}
