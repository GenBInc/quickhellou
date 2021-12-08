/**
 * Bandwidth level.
 *
 * @export
 * @class BandwidthLevel
 */
export class BandwidthLevel {
  public static LOW: string = "low";
  public static MEDIUM: string = "medium";
  public static HIGH: string = "high";

  public static LOW_BITRATE: number = 50;
  public static HIGH_BITRATE: number = 150;

  /**
   * Checks if a bitrate is in the lower range.
   *
   * @static
   * @param {number} bitrate
   * @returns {boolean}
   * @memberof BandwidthLevel
   */
  public static isLow(bitrate: number): boolean {
    return bitrate > 0 && bitrate < BandwidthLevel.LOW_BITRATE;
  }

  /**
   * Checks if a bitrate is in the medium range.
   *
   * @static
   * @param {number} bitrate
   * @returns {boolean}
   * @memberof BandwidthLevel
   */
  public static isMedium(bitrate: number): boolean {
    return (
      bitrate > BandwidthLevel.LOW_BITRATE &&
      bitrate < BandwidthLevel.HIGH_BITRATE
    );
  }

  /**
   * Checks if a bitrate is in the higher range.
   *
   * @static
   * @param {number} bitrate
   * @returns {boolean}
   * @memberof BandwidthLevel
   */
  public static isHigh(bitrate: number): boolean {
    return bitrate >= BandwidthLevel.HIGH_BITRATE;
  }

  /**
   * Gets a bitrate to adjust stream.
   *
   * @static
   * @param {string} level
   * @returns {string}
   * @memberof BandwidthLevel
   */
  public static getBitrate(level: string): string {
    if (level === BandwidthLevel.LOW) {
      return "30";
    }

    if (level === BandwidthLevel.MEDIUM) {
      return "150";
    }

    if (level === BandwidthLevel.HIGH) {
      return "unlimited";
    }
  }
}
