/**
 * Array utilities
 *
 * @export
 * @class ArrayUtils
 */
export class ArrayUtils {
  /**
   * Return elements in random order.
   *
   * @static
   * @param {any[]} array
   * @returns {any []}
   * @memberof ArrayUtils
   */
  public static shuffle(array: any[]): any[] {
    let currentIndex = array.length;
    let temporaryValue;
    let randomIndex;

    while (0 !== currentIndex) {
      randomIndex = Math.floor(Math.random() * currentIndex);
      currentIndex -= 1;

      temporaryValue = array[currentIndex];
      array[currentIndex] = array[randomIndex];
      array[randomIndex] = temporaryValue;
    }

    return array;
  }

  /**
   * Checks if an array is empty or null.
   *
   * @static
   * @param {any[]} array
   * @returns
   * @memberof ArrayUtils
   */
  public static isEmpty(array: any[]) {
    if (typeof array === "object") {
      return array.length === 0;
    } else {
      return true;
    }
  }
}
