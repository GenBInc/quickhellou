import { Log } from "../../../genb/base/utils/Log";

export class ScreenSharingController {
  private enableStartCapture: boolean = true;
  private enableStopCapture: boolean = false;
  private enableDownloadRecording: boolean = false;
  private stream: MediaStream = null;
  private chunks: [] = [];
  private mediaRecorder: any = null;
  private status: String = "Inactive";
  private recording: any = null;

  /**
   * Creates an instance of ScreenSharingController.
   *
   * @memberof ScreenSharingController
   */
  constructor() {
    this.init();

    this.enableStartCapture = true;
    this.enableStopCapture = false;
    this.enableDownloadRecording = false;
    this.stream = null;
    this.chunks = [];
    this.mediaRecorder = null;
    this.status = "Inactive";
    this.recording = null;
  }

  static get properties() {
    return {
      status: String,
      enableStartCapture: Boolean,
      enableStopCapture: Boolean,
      enableDownloadRecording: Boolean,
      recording: {
        /*type: {
          fromAttribute: input => input
        }*/
      }
    };
  }

  public async init() {
    this.stream = await this.getDisplayMedia();
  }

  /**
   *
   *
   * @returns
   * @memberof ScreenSharingController
   */
  getDisplayMedia() {
    if (navigator.getDisplayMedia) {
      return navigator.getDisplayMedia({ video: true, audio: true });
    }

    if (navigator.mediaDevices.getDisplayMedia) {
      return navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
    }

    return null;
  }
  /*
  async startCapturing() {
    console.log('Start capturing.');
    this.status = 'Screen recording started.';
    this.enableStartCapture = false;
    this.enableStopCapture = true;
    this.enableDownloadRecording = false;
    //this.requestUpdate('buttons');

    if (this.recording) {
      window.URL.revokeObjectURL(this.recording);
    }

    this.chunks = [];
    this.recording = null;
    this.stream = await this.startScreenCapture();
    this.stream.addEventListener('inactive', e => {
      Log.log('Capture stream inactive - stop recording!');
      this.stopCapturing();
    });
    this.mediaRecorder = new MediaRecorder(this.stream, {mimeType: 'video/webm'});
    this.mediaRecorder.addEventListener('dataavailable', event => {
      if (event.data && event.data.size > 0) {
        this.chunks.push(event.data);
      }
    });
    this.mediaRecorder.start(10);
  }*/

  stopCapturing() {
    Log.log("Stop capturing.");
    this.status = "Screen recorded completed.";
    this.enableStartCapture = true;
    this.enableStopCapture = false;
    this.enableDownloadRecording = true;

    this.mediaRecorder.stop();
    this.mediaRecorder = null;
    this.stream.getTracks().forEach(track => track.stop());
    this.stream = null;

    this.recording = window.URL.createObjectURL(
      new Blob(this.chunks, { type: "video/webm" })
    );
  }

  /*downloadRecording() {
    console.log('Download recording.');
    this.enableStartCapture = true;
    this.enableStopCapture = false;
    this.enableDownloadRecording = false;

    const downloadLink = this.shadowRoot.querySelector('a#downloadLink');
    downloadLink.addEventListener('progress', e => console.log(e));
    downloadLink.href = this.recording;
    downloadLink.download = 'screen-recording.webm';
    downloadLink.click();
  }*/
}
