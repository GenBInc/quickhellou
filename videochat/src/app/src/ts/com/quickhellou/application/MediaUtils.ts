/**
 * Media utils.
 *
 * @export
 * @class MediaUtils
 */
export class MediaUtils {
  /**
   * Extracts track ID from a stream instance.
   *
   * @static
   * @param {MediaStream} stream
   * @returns
   * @memberof MediaUtils
   */
  public static extractTrackId(stream: MediaStream) {
    return stream.getVideoTracks()[0].id.replace(/\{|\}/g, "");
  }

  /**
   * Extracts and trims stream ID.
   *
   * @static
   * @param {MediaStream} stream
   * @returns
   * @memberof MediaUtils
   */
  public static extractStreamId(stream: MediaStream) {
    return stream.id.replace(/\{|\}/g, "");
  }
}
