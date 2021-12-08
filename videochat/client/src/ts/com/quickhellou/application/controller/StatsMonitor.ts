import { EventDispatcherService } from "../../../genb/base/services/EventDispatcherService";
import { Log } from "../../../genb/base/utils/Log";
import { MovingAverage } from "../utils/MovingAverage";
import { BandwidthLevelUpdateEvent } from "../events/BandwidthLevelUpdateEvent";
import { BandwidthLevel } from "../model/BandwidthLevel";

/**
 * Bandwidth monitor for a peer connection.
 *
 * @export
 * @class StatsMonitor
 * @extends {EventDispatcherService}
 */
export class StatsMonitor extends EventDispatcherService {
  private monitorInterval: number;

  private peerConnection: RTCPeerConnection;

  private inboundBandwidthMA: MovingAverage;
  private outboundBandwidthMA: MovingAverage;

  private inboundBandwidthLevel: string;
  private outboundBandwidthLevel: string;

  private isSafari: boolean = /^((?!chrome|android).)*safari/i.test(
    navigator.userAgent
  );

  private getStatsResult: any = {
    audio: {
      send: {
        tracks: [],
        availableBandwidth: 0,
        streams: 0,
        framerateMean: 0,
        bitrateMean: 0,
      },
      recv: {
        tracks: [],
        availableBandwidth: 0,
        streams: 0,
        framerateMean: 0,
        bitrateMean: 0,
      },
      bytesSent: 0,
      bytesReceived: 0,
      packetsLost: 0,
    },
    video: {
      send: {
        tracks: [],
        availableBandwidth: 0,
        availableBandwidthMA: 0,
        streams: 0,
        framerateMean: 0,
        bitrateMean: 0,
      },
      recv: {
        tracks: [],
        availableBandwidth: 0,
        availableBandwidthMA: 0,
        streams: 0,
        framerateMean: 0,
        bitrateMean: 0,
      },
      bytesSent: 0,
      bytesReceived: 0,
      packetsLost: 0,
    },
    bandwidth: {
      availableOutgoingBitrate: 0,
      availableIncomingBitrate: 0,
      actualEncBitrate: 0,
      helper: {
        audioBytesSent: 0,
        videoBytestSent: 0,
      },
      speed: 0,
    },
    results: {},
    resolutions: {
      send: {
        width: 0,
        height: 0,
      },
      recv: {
        width: 0,
        height: 0,
      },
    },
    framesPerSecond: 0,
    internal: {
      audio: {
        send: {},
        recv: {},
      },
      video: {
        send: {
          prevBytesSent: 0,
          prevFramerateMean: 0,
          prevBitrateMean: 0,
          ema: 0,
        },
        recv: {
          prevBytesReceived: 0,
        },
      },
    },
  };

  /**
   * Creates an instance of StatsMonitor.
   *
   * @param {RTCPeerConnection} peerConnection
   * @memberof StatsMonitor
   */
  constructor(peerConnection: RTCPeerConnection) {
    super();
    this.peerConnection = peerConnection;
    this.inboundBandwidthMA = new MovingAverage(5);
    this.outboundBandwidthMA = new MovingAverage(5);

    this.inboundBandwidthLevel = BandwidthLevel.HIGH;
    this.outboundBandwidthLevel = BandwidthLevel.HIGH;
  }

  /**
   * Runs the monitor.
   *
   * @memberof StatsMonitor
   */
  public run(): void {
    setTimeout(() => {
      this.monitorInterval = window.setInterval(() => {
        this.monitorCycle();
      }, 1000);
    }, 10000);
  }

  /**
   * Stops monitoring.
   *
   * @public
   * @memberof StatsMonitor
   */
  public stop(): void {
    window.clearInterval(this.monitorInterval);
  }

  /**
   * Handles monitor cycle.
   *
   * @private
   * @returns {void}
   * @memberof StatsMonitor
   */
  private monitorCycle(): void {
    if (!this.peerConnection) {
      Log.log("No peer connection. Stopping monitor.");
      this.stop();
      return;
    }

    this.peerConnection.getStats().then((report: RTCStatsReport) => {
      const reportResults: any[] = [];
      report.forEach((reportResult: RTCStats) => {
        reportResults.push(reportResult);
      });
      this.processReportResults(reportResults);
    });

    this.getBandwidth();

    this.distributeBandwidthEvents(this.getStatsResult.video);
  }

  /**
   * Distriutes bandwidth events.
   *
   * @private
   * @param {*} videoResult
   * @memberof StatsMonitor
   */
  private distributeBandwidthEvents(videoResult: any): void {
    const outboundBandwidth: number = videoResult.send.availableBandwidthMA;

    /*if (this.getStatsResult.video.send.framerateMean < 20) {
      this.dispatchEvent(BandwidthLevelUpdateEvent.INBOUND_LEVEL_CHANGE, {
        level: BandwidthLevel.LOW,
      });
      return;
    }*/

    if (
      BandwidthLevel.isLow(outboundBandwidth) &&
      this.outboundBandwidthLevel !== BandwidthLevel.LOW
    ) {
      this.outboundBandwidthLevel = BandwidthLevel.LOW;
      this.dispatchEvent(BandwidthLevelUpdateEvent.OUTBOUND_LEVEL_CHANGE, {
        level: BandwidthLevel.LOW,
      });
    }

    if (
      BandwidthLevel.isMedium(outboundBandwidth) &&
      this.outboundBandwidthLevel !== BandwidthLevel.MEDIUM
    ) {
      this.outboundBandwidthLevel = BandwidthLevel.MEDIUM;
      this.dispatchEvent(BandwidthLevelUpdateEvent.OUTBOUND_LEVEL_CHANGE, {
        level: BandwidthLevel.MEDIUM,
      });
    }

    if (
      BandwidthLevel.isHigh(outboundBandwidth) &&
      this.outboundBandwidthLevel !== BandwidthLevel.HIGH
    ) {
      this.outboundBandwidthLevel = BandwidthLevel.HIGH;
      this.dispatchEvent(BandwidthLevelUpdateEvent.OUTBOUND_LEVEL_CHANGE, {
        level: BandwidthLevel.HIGH,
      });
    }
  }

  /**
   * Handles report elements.
   *
   * @private
   * @param {any[]} reportResults
   * @returns
   * @memberof StatsMonitor
   */
  private processReportResults(reportResults: any[]) {
    if (!reportResults || !reportResults.forEach) {
      return;
    }
    reportResults.forEach((result: any) => {
      this.processReportResult(result);
    });
  }

  /**
   * Handles report element.
   *
   * @private
   * @param {*} result
   * @memberof StatsMonitor
   */
  private processReportResult(result: any) {
    this.checkAudio(result);
    this.checkVideo(result);
  }

  /**
   * Checks audio report data.
   *
   * @private
   * @param {*} result
   * @returns
   * @memberof StatsMonitor
   */
  private checkAudio(result: any) {
    if (
      (!!result.mediaType && result.mediaType !== "audio") ||
      (!!result.kind && result.kind !== "audio")
    ) {
      return;
    }

    let sendrecvType: string;
    if (result.isRemote === true || result.bytesReceived !== undefined) {
      sendrecvType = "recv";
    }
    if (result.isRemote === false || result.bytesSent !== undefined) {
      sendrecvType = "send";
    }

    if (!sendrecvType) {
      return;
    }

    if (!!result.bytesSent) {
      let kilobytes: number = 0;
      if (!this.getStatsResult.internal.audio[sendrecvType].prevBytesSent) {
        this.getStatsResult.internal.audio[sendrecvType].prevBytesSent =
          result.bytesSent;
      }

      const bytes: number =
        result.bytesSent -
        this.getStatsResult.internal.audio[sendrecvType].prevBytesSent;
      this.getStatsResult.internal.audio[sendrecvType].prevBytesSent =
        result.bytesSent;

      kilobytes = bytes / 1024;
      this.getStatsResult.audio[
        sendrecvType
      ].availableBandwidth = kilobytes.toFixed(1);
      this.getStatsResult.audio.bytesSent = kilobytes.toFixed(1);
    }

    if (!!result.bytesReceived) {
      let kilobytes: number = 0;
      if (!this.getStatsResult.internal.audio[sendrecvType].prevBytesReceived) {
        this.getStatsResult.internal.audio[sendrecvType].prevBytesReceived =
          result.bytesReceived;
      }

      const bytes: number =
        result.bytesReceived -
        this.getStatsResult.internal.audio[sendrecvType].prevBytesReceived;
      this.getStatsResult.internal.audio[sendrecvType].prevBytesReceived =
        result.bytesReceived;

      kilobytes = bytes / 1024;

      this.getStatsResult.audio.bytesReceived = kilobytes.toFixed(1);
    }

    // calculate packetsLost
    if (!!result.packetsLost) {
      if (!this.getStatsResult.internal.audio.prevPacketsLost) {
        this.getStatsResult.internal.audio.prevPacketsLost = result.packetsLost;
      }

      const bytes: number =
        result.packetsLost - this.getStatsResult.internal.audio.prevPacketsLost;
      this.getStatsResult.internal.audio.prevPacketsLost = result.packetsLost;

      this.getStatsResult.audio.packetsLost = bytes.toFixed(1);

      if (this.getStatsResult.audio.packetsLost < 0) {
        this.getStatsResult.audio.packetsLost = 0;
      }
    }
  }

  /**
   * Checks video report data.
   *
   * @private
   * @param {*} result
   * @returns
   * @memberof StatsMonitor
   */
  private checkVideo(result: any) {
    if (
      (!!result.mediaType && result.mediaType !== "video") ||
      (!!result.kind && result.kind !== "video")
    ) {
      return;
    }

    let sendrecvType: string = result.id.split("_").pop();
    if (result.isRemote === true || result.bytesReceived !== undefined) {
      sendrecvType = "recv";
    }
    if (result.isRemote === false || result.bytesSent !== undefined) {
      sendrecvType = "send";
    }

    if (!sendrecvType) {
      return;
    }

    this.getTrack(result);

    this.getMediaSource(result);

    this.getDataSentReceived(result);

    this.getInboundRtp(result);

    this.getOutboundRtp(result);
  }

  /**
   * Statistics for the media produced by a MediaStreamTrack
   * that is currently attached to an RTCRtpSender.
   *
   * @private
   * @param {*} result
   * @returns {void}
   * @memberof StatsMonitor
   */
  private getMediaSource(result: any): void {
    if (result.type !== "media-source") {
      return;
    }
    this.getStatsResult.framesPerSecond = result.framesPerSecond;
  }

  /**
   * Statistics related to a specific MediaStreamTrack's attachment to
   * an RTCRtpSender and the corresponding media-level metrics.
   *
   * @private
   * @param {*} result
   * @returns {void}
   * @memberof StatsMonitor
   */
  private getTrack(result: any): void {
    if (result.type !== "track") {
      return;
    }

    const sendrecvType: string = result.remoteSource === true ? "send" : "recv";

    if (result.frameWidth && result.frameHeight) {
      this.getStatsResult.resolutions[sendrecvType].width = result.frameWidth;
      this.getStatsResult.resolutions[sendrecvType].height = result.frameHeight;
    }
  }

  /**
   * Statistics for an inbound RTP stream that is currently received with
   * this RTCPeerConnection object.
   *
   * @private
   * @param {*} result
   * @returns
   * @memberof StatsMonitor
   */
  private getInboundRtp(result: any) {
    if (result.type !== "inbound-rtp") {
      return;
    }

    const mediaType: string = result.mediaType || "audio";

    if (!!result.bytesReceived) {
      const bytesReceived = result.bytesReceived;

      const bytes: number =
        bytesReceived -
        this.getStatsResult.internal[mediaType].recv.prevBytesReceived;

      const kilobytes: number = bytes / 1024;

      this.getStatsResult[
        mediaType
      ].recv.availableBandwidth = kilobytes.toFixed(1);

      this.getStatsResult[
        mediaType
      ].recv.availableBandwidthMA = this.inboundBandwidthMA.update(kilobytes);

      this.getStatsResult.internal[
        mediaType
      ].recv.prevBytesReceived = bytesReceived;

      this.getStatsResult[mediaType].bytesReceived = kilobytes.toFixed(1);
    }
  }

  /**
   * Statistics for an outbound RTP stream that is currently sent with
   * this RTCPeerConnection object.
   *
   * @private
   * @param {*} result
   * @returns
   * @memberof StatsMonitor
   */
  private getOutboundRtp(result: any) {
    if (result.type !== "outbound-rtp") {
      return;
    }

    const mediaType: string = result.mediaType || "audio";
    const sendrecvType: string = result.isRemote ? "recv" : "send";

    if (!sendrecvType) {
      return;
    }

    if (!!result.bytesSent) {
      const bytesSent: number = result.bytesSent;

      const bytes: number =
        bytesSent - this.getStatsResult.internal[mediaType].send.prevBytesSent;

      const kilobytes: number = bytes / 1024;

      this.getStatsResult[
        mediaType
      ].send.availableBandwidth = kilobytes.toFixed(1);

      this.getStatsResult[
        mediaType
      ].send.availableBandwidthMA = this.outboundBandwidthMA.update(kilobytes);

      this.getStatsResult.internal[mediaType].send.prevBytesSent = bytesSent;

      this.getStatsResult[mediaType].bytesSent = kilobytes.toFixed(1);

      if (!!result.retransmittedBytesSent) {
        this.getStatsResult.bandwidth.actualEncBitrate =
          result.bytesSent - result.retransmittedBytesSent;
      }
    }

    if (!!result.bytesReceived) {
      let kilobytes: number = 0;
      if (
        !this.getStatsResult.internal[mediaType][sendrecvType].prevBytesReceived
      ) {
        this.getStatsResult.internal[mediaType][
          sendrecvType
        ].prevBytesReceived = result.bytesReceived;
      }

      const bytes: number =
        result.bytesReceived -
        this.getStatsResult.internal[mediaType][sendrecvType].prevBytesReceived;
      this.getStatsResult.internal[mediaType][sendrecvType].prevBytesReceived =
        result.bytesReceived;

      kilobytes = bytes / 1024;
      this.getStatsResult[mediaType].bytesReceived = kilobytes.toFixed(1);
    }
  }

  private getDataSentReceived(result: any) {
    if (result.mediaType !== "video" && result.mediaType !== "audio") {
      return;
    }
    if (!!result.bytesSent) {
      this.getStatsResult[result.mediaType].bytesSent = Number(
        result.bytesSent
      );
    }

    if (!!result.bytesReceived) {
      this.getStatsResult[result.mediaType].bytesReceived = Number(
        result.bytesReceived
      );
    }
  }

  /**
   * Calculates bandwidth.
   *
   * @private
   * @memberof StatsMonitor
   */
  private getBandwidth(): void {
    if (this.getStatsResult.audio && this.getStatsResult.video) {
      this.getStatsResult.bandwidth.speed =
        this.getStatsResult.audio.bytesSent -
        this.getStatsResult.bandwidth.helper.audioBytesSent +
        (this.getStatsResult.video.bytesSent -
          this.getStatsResult.bandwidth.helper.videoBytesSent);
      this.getStatsResult.bandwidth.helper.audioBytesSent = this.getStatsResult.audio.bytesSent;
      this.getStatsResult.bandwidth.helper.videoBytesSent = this.getStatsResult.video.bytesSent;
    }
  }
}
