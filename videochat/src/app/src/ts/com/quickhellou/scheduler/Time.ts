import { StringUtils } from "../../genb/base/utils/StringUtils";
import { BaseUtils } from "../../genb/base/utils/BaseUtils";

export class Time {
  private hour: number;
  private minute: number;

  toString(): string {
    let hourString: string = String(this.hour);
    if (/^\d$/.test(hourString))
      hourString = `0${hourString}`;
    let minuteString: string = String(this.minute);
    if (/^\d$/.test(minuteString))
      minuteString = `0${minuteString}`;

    return `${hourString}:${minuteString}`;
  }

  setHour(hour: number): void {
    this.hour = hour;
  }

  setMinute(minute: number): void {
    this.minute = minute;
  }
  
  public reset():void {
    this.minute = NaN;  
    this.hour = NaN;  
  }

  public get isFullTime():boolean {
    return this.hour != NaN && this.minute != NaN && 
      BaseUtils.isObjectDefined(this.hour) && BaseUtils.isObjectDefined(this.minute);
  }

  public get calendarTime():string {
    return "";
  }

  public getHours():number {
    return this.hour;
  }

  public getMinutes():number {
    return this.minute;
  }
  
}