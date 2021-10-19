export class DateUtils {
  public static toLocalShortString(date: Date): string {
    const options = {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric"
    };
    return date.toLocaleDateString("en-US", options);
  }
}
