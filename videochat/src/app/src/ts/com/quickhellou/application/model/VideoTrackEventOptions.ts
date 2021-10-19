/**
 * Data for video track update event.
 *
 * @export
 * @class VideoTrackEventOptions
 */
export class VideoTrackEventOptions {
  public static CAMERA = "camera";
  public static SCREEN_CAPTURE = "screen_capture";

  public track: MediaStreamTrack;
  public type: string;

  /**
   * Creates an instance of VideoTrackEventOptions.
   *
   * @param {MediaStreamTrack} track
   * @param {string} [type=LocalVideoTrackEventOptions.CAMERA]
   * @memberof VideoTrackEventOptions
   */
  constructor(
    track: MediaStreamTrack,
    type: string = VideoTrackEventOptions.CAMERA
  ) {
    this.track = track;
    this.type = type;
  }
}
