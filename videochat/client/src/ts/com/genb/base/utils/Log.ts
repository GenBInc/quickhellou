import { StringUtils } from "./StringUtils";

export class Log {
  /**
   * Sets enviroment variable.
   *
   * @static
   * @param {string} environment
   * @memberof Log
   */
  public static setEnvironment(environment: string): void {
    this.isDevelopment = StringUtils.equals(environment, "development");
  }

  /**
   * Displays log objects.
   *
   * @static
   * @param {*} [message]
   * @param {...any[]} optionalParams
   * @memberof Log
   */
  public static log(message?: any, ...optionalParams: any[]): void {
    if (!this.isDevelopment) {
      return;
    }
    // tslint:disable-next-line:no-console
    console.log(
      `%c${this.getNow()}`,
      "color: #008000",
      message,
      ...optionalParams
    );
  }

  /**
   * Displays warn objects.
   *
   * @static
   * @param {*} [message]
   * @param {...any[]} optionalParams
   * @memberof Log
   */
  public static warn(message?: any, ...optionalParams: any[]): void {
    if (!this.isDevelopment) {
      return;
    }
    // tslint:disable-next-line:no-console
    console.warn(
      `%c${this.getNow()}`,
      "color: #FF7F00",
      message,
      ...optionalParams
    );
  }

  /**
   * Displays error objects.
   *
   * @static
   * @param {*} [message]
   * @param {...any[]} optionalParams
   * @memberof Log
   */
  public static error(message?: any, ...optionalParams: any[]): void {
    if (!this.isDevelopment) {
      return;
    }
    // tslint:disable-next-line:no-console
    console.error(`${this.getNow()}`, message, ...optionalParams);
  }

  /**
   * Asserts log objects if condition is met.
   *
   * @static
   * @param {boolean} [condition]
   * @param {string} [message]
   * @param {...any[]} data
   * @memberof Log
   */
  public static assert(
    condition?: boolean,
    message?: string,
    ...data: any[]
  ): void {
    if (!this.isDevelopment) {
      return;
    }
    // tslint:disable-next-line:no-console
    console.assert(
      condition,
      `%c${this.getNow()}`,
      "color: #008000",
      message,
      ...data
    );
  }

  /**
   * Displays breakpoint label and log objects.
   *
   * @static
   * @param {string} [label]
   * @param {...any[]} optionalParams
   * @memberof Log
   */
  public static breakpoint(label?: string, ...optionalParams: any[]): void {
    if (!this.isDevelopment) {
      return;
    }
    // tslint:disable-next-line:no-console
    console.log(
      `%c${this.getNow()} ${label}`,
      "background-color: #144E8B; color:#fff",
      ...optionalParams
    );
  }

  /**
   * Displays breakpoint fatal error label and log objects.
   *
   * @static
   * @param {string} [label]
   * @param {...any[]} optionalParams
   * @memberof Log
   */
  public static fatal(label?: string, ...optionalParams: any[]): void {
    if (!this.isDevelopment) {
      return;
    }
    // tslint:disable-next-line:no-console
    console.log(
      `%c${this.getNow()} ${label}`,
      "background-color: #c90000; color:#fff",
      ...optionalParams
    );
  }

  /**
   * Displays breakpoint success label and log objects.
   *
   * @static
   * @param {string} [label]
   * @param {...any[]} optionalParams
   * @memberof Log
   */
  public static success(label?: string, ...optionalParams: any[]): void {
    if (!this.isDevelopment) {
      return;
    }
    // tslint:disable-next-line:no-console
    console.log(
      `%c${this.getNow()} ${label}`,
      "background-color: #008000; color:#fff",
      ...optionalParams
    );
  }

  public static info(label?: string, ...optionalParams: any[]): void {
    if (!this.isDevelopment) {
      return;
    }
    // tslint:disable-next-line:no-console
    console.log(
      `%c${this.getNow()} ${label}`,
      "background-color: #4AAEFB; color:#fff",
      ...optionalParams
    );
  }

  private static isDevelopment: boolean = true;

  /**
   * Gets window perfomance now value.
   *
   * @private
   * @static
   * @returns {string}
   * @memberof Log
   */
  private static getNow(): string {
    return (window.performance.now() / 1000).toFixed(3);
  }
}
