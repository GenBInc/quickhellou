import { Time } from "./Time";
import { StringUtils } from "../../genb/base/utils/StringUtils";
import { BaseUtils } from "../../genb/base/utils/BaseUtils";

export class DateTime {
  private dateString: string;
  private time: Time;

  constructor() {
    this.time = new Time();
  }

  public setDateString(dateString: string): void {
    this.dateString = dateString;
  }

  public setMinute(minute: number): void {
    this.time.setMinute(minute);
  }

  public setHour(hour: number): void {
    this.time.setHour(hour);
  }

  public timeToString(): string {
    return this.time.toString();
  }

  public toString(): string {
    return `${this.dateString} ${this.time.toString()}`;
  }

  public get isFullDateTime(): boolean {
    if (!BaseUtils.isObjectDefined(this.time))
      return false;

    return StringUtils.isNotEmpty(this.dateString) && this.time.isFullTime;
  }

  public get isFullTime():boolean {
    return this.time.isFullTime;
  }

  public reset():void {
    this.time.reset();
    this.dateString = StringUtils.EMPTY;
  }

  public get date():string {
    return this.date;
  }

  public get calendarTime():string {
    return this.time.calendarTime;
  }

  public getHours():number {
    return this.time.getHours();
  }

  public getMinutes():number {
    return this.time.getMinutes();
  }
}

