import { Log } from "../../../../com/genb/base/utils/Log";

/**
 * Expotential moving average utility.
 *
 * @export
 * @class MovingAverage
 */
export class MovingAverage {
  /**
   * Ratio
   *
   * @type {number}
   * @memberof MovingAverage
   */
  public alpha: number;

  /**
   * Mean
   *
   * @type {number}
   * @memberof MovingAverage
   */
  public mean: number;

  private range: number;
  private values: number[];

  /**
   * Creates an instance of MovingAverage.
   *
   * @param {any}
   * @memberof MovingAverage
   */
  constructor(range: number) {
    this.range = range;
    this.values = Array(range * 2).fill(0);
  }

  public update(newValue: number): string {
    if (this.values.length > this.range * 2) {
      this.values.shift();
    }
    this.values.push(newValue);

    return this.calculate();
  }

  private calculate() {
    const c: number = this.smooth(this.range);
    let average: number = this.average(this.values.slice(0, this.range));
    const acc = [this.toFixed(average)];
    for (let i: number = this.range; i < this.values.length; i++) {
      average = c * Number(this.values[i]) + (1 - c) * average;
      acc.push(this.toFixed(average));
    }
    return acc.pop();
  }

  private average(arr: number[]) {
    const len: number = arr.length;
    let i: number = -1;
    let num: number = 0;
    while (++i < len) {
      num += Number(arr[i]);
    }
    return num / len;
  }

  private smooth(n: number): number {
    return 2 / (n + 1);
  }

  private toFixed(n: number): string {
    return n.toFixed(2);
  }
}
