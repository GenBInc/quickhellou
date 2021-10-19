import { Log } from "../genb/base/utils/Log";
import { StringUtils } from "../genb/base/utils/StringUtils";

/**
 * Session Description Protocol utils.
 *
 * @export
 * @class SDPUtils
 */
export class SDPUtils {
  /**
   * Merges options contstraints.
   *
   * @static
   * @param {*} cons1
   * @param {*} cons2
   * @returns
   * @memberof SDPUtils
   */
  public static mergeConstraints(cons1: any, cons2: any) {
    if (!cons1 || !cons2) {
      return cons1 || cons2;
    }
    const merged: any = cons1;
    for (const key of Object.keys(cons2)) {
      merged[key] = cons2[key];
    }
    return merged;
  }

  /**
   * Gets ICE candidate string.
   *
   * @static
   * @param {string} candidateStr
   * @returns
   * @memberof SDPUtils
   */
  public static iceCandidateType(candidateStr: string) {
    return candidateStr.split(" ")[7];
  }

  public static maybeSetOpusOptions(sdp: any, params: any) {
    // Set Opus in Stereo, if stereo is true, unset it, if stereo is false, and
    // do nothing if otherwise.
    if (params.opusStereo === "true") {
      sdp = this.setCodecParam(sdp, "opus/48000", "stereo", "1");
    } else if (params.opusStereo === "false") {
      sdp = this.removeCodecParam(sdp, "opus/48000", "stereo");
    }

    // Set Opus FEC, if opusfec is true, unset it, if opusfec is false, and
    // do nothing if otherwise.
    if (params.opusFec === "true") {
      sdp = this.setCodecParam(sdp, "opus/48000", "useinbandfec", "1");
    } else if (params.opusFec === "false") {
      sdp = this.removeCodecParam(sdp, "opus/48000", "useinbandfec");
    }

    // Set Opus DTX, if opusdtx is true, unset it, if opusdtx is false, and
    // do nothing if otherwise.
    if (params.opusDtx === "true") {
      sdp = this.setCodecParam(sdp, "opus/48000", "usedtx", "1");
    } else if (params.opusDtx === "false") {
      sdp = this.removeCodecParam(sdp, "opus/48000", "usedtx");
    }

    // Set Opus maxplaybackrate, if requested.
    if (params.opusMaxPbr) {
      sdp = this.setCodecParam(
        sdp,
        "opus/48000",
        "maxplaybackrate",
        params.opusMaxPbr
      );
    }
    return sdp;
  }

  public static maybeSetAudioSendBitRate(sdp: any, params: any) {
    if (!params.audioSendBitrate) {
      return sdp;
    }
    Log.log("Prefer audio send bitrate: " + params.audioSendBitrate);
    return this.preferBitRate(sdp, params.audioSendBitrate, "audio");
  }

  public static maybeSetAudioReceiveBitRate(sdp: any, params: any) {
    if (!params.audioRecvBitrate) {
      return sdp;
    }
    Log.log("Prefer audio receive bitrate: " + params.audioRecvBitrate);
    return this.preferBitRate(sdp, params.audioRecvBitrate, "audio");
  }

  public static maybeSetVideoSendBitRate(sdp: any, params: any) {
    if (!params.videoSendBitrate) {
      return sdp;
    }
    Log.log("Prefer video send bitrate: " + params.videoSendBitrate);
    return this.preferBitRate(sdp, params.videoSendBitrate, "video");
  }

  public static maybeSetVideoReceiveBitRate(sdp: any, params: any) {
    if (!params.videoRecvBitrate) {
      return sdp;
    }
    Log.log("Prefer video receive bitrate: " + params.videoRecvBitrate);
    return this.preferBitRate(sdp, params.videoRecvBitrate, "video");
  }

  // Add a b=AS:bitrate line to the m=mediaType section.
  public static preferBitRate(sdp: any, bitrate: any, mediaType: string) {
    const sdpLines = sdp.split("\r\n");

    // Find m line for the given mediaType.
    const mLineIndex = this.findLine(sdpLines, "m=", mediaType);
    if (mLineIndex === null) {
      Log.log("Failed to add bandwidth line to sdp, as no m-line found");
      return sdp;
    }

    // Find next m-line if any.
    let nextMLineIndex = this.findLineInRange(
      sdpLines,
      mLineIndex + 1,
      -1,
      "m="
    );
    if (nextMLineIndex === null) {
      nextMLineIndex = sdpLines.length;
    }

    // Find c-line corresponding to the m-line.
    const cLineIndex = this.findLineInRange(
      sdpLines,
      mLineIndex + 1,
      nextMLineIndex,
      "c="
    );
    if (cLineIndex === null) {
      Log.log("Failed to add bandwidth line to sdp, as no c-line found");
      return sdp;
    }

    // Check if bandwidth line already exists between c-line and next m-line.
    const bLineIndex = this.findLineInRange(
      sdpLines,
      cLineIndex + 1,
      nextMLineIndex,
      "b=AS"
    );
    if (bLineIndex) {
      sdpLines.splice(bLineIndex, 1);
    }

    // Create the b (bandwidth) sdp line.
    const bwLine = "b=AS:" + bitrate;
    // As per RFC 4566, the b line should follow after c-line.
    sdpLines.splice(cLineIndex + 1, 0, bwLine);
    sdp = sdpLines.join("\r\n");
    return sdp;
  }

  // Add an a=fmtp: x-google-min-bitrate=kbps line, if videoSendInitialBitrate
  // is specified. We'll also add a x-google-min-bitrate value, since the max
  // must be >= the min.
  public static maybeSetVideoSendInitialBitRate(sdp: any, params: any) {
    let initialBitrate: number = Number(params.videoSendInitialBitrate);
    if (!initialBitrate) {
      return sdp;
    }

    // Validate the initial bitrate value.
    let maxBitrate: number = initialBitrate;
    const bitrate: number = Number(params.videoSendBitrate);
    if (bitrate) {
      if (initialBitrate > bitrate) {
        Log.log(
          "Clamping initial bitrate to max bitrate of " + bitrate + " kbps."
        );
        initialBitrate = bitrate;
        params.videoSendInitialBitrate = initialBitrate;
      }
      maxBitrate = bitrate;
    }

    const sdpLines = sdp.split("\r\n");

    // Search for m line.
    const mLineIndex = this.findLine(sdpLines, "m=", "video");
    if (mLineIndex === null) {
      Log.log("Failed to find video m-line");
      return sdp;
    }
    // Figure out the first codec payload type on the m=video SDP line.
    const videoMLine = sdpLines[mLineIndex];
    const pattern = new RegExp("m=video\\s\\d+\\s[A-Z/]+\\s");
    const sendPayloadType = videoMLine.split(pattern)[1].split(" ")[0];
    const fmtpLine =
      sdpLines[this.findLine(sdpLines, "a=rtpmap", sendPayloadType)];
    const codecName = fmtpLine
      .split("a=rtpmap:" + sendPayloadType)[1]
      .split("/")[0];

    // Use codec from params if specified via URL param, otherwise use from SDP.
    const codec = params.videoSendCodec || codecName;
    sdp = this.setCodecParam(
      sdp,
      codec,
      "x-google-min-bitrate",
      params.videoSendInitialBitrate.toString()
    );
    sdp = this.setCodecParam(
      sdp,
      codec,
      "x-google-max-bitrate",
      maxBitrate.toString()
    );

    return sdp;
  }

  public static removePayloadTypeFromMline(mLine: any, payloadType: any) {
    mLine = mLine.split(" ");
    for (let i = 0; i < mLine.length; ++i) {
      if (mLine[i] === payloadType.toString()) {
        mLine.splice(i, 1);
      }
    }
    return mLine.join(" ");
  }

  public static getMsid(sdp: any): string {
    const sdpLines = sdp.split("\r\n");
    const index: number = this.findLine(sdpLines, "a=msid:");
    if (index === null) {
      return StringUtils.EMPTY;
    }
    const sdpLine: string = sdpLines[index];
    return sdpLine
      .match(new RegExp("a=msid:[a-z0-9A-Z{}-]+"))[0]
      .replace(/a=msid:/, "");
  }

  /**
   * Checks if protocol allows sending and receiving signal.
   *
   * @static
   * @param {*} sdp
   * @returns {boolean}
   * @memberof SDPUtils
   */
  public static isSendRecv(sdp: any): boolean {
    const sdpLines = sdp.split("\r\n");
    const index: number = this.findLine(sdpLines, "a=sendrecv");
    if (index === null) {
      return false;
    }
    return true;
  }

  public static removeCodecByName(sdpLines: any, codec: any) {
    const index = this.findLine(sdpLines, "a=rtpmap", codec);
    if (index === null) {
      return sdpLines;
    }
    const payloadType = this.getCodecPayloadTypeFromLine(sdpLines[index]);
    sdpLines.splice(index, 1);

    // Search for the video m= line and remove the codec.
    const mLineIndex = this.findLine(sdpLines, "m=", "video");
    if (mLineIndex === null) {
      return sdpLines;
    }
    sdpLines[mLineIndex] = this.removePayloadTypeFromMline(
      sdpLines[mLineIndex],
      payloadType
    );
    return sdpLines;
  }

  public static removeCodecByPayloadType(sdpLines: any, payloadType: any) {
    const index = this.findLine(sdpLines, "a=rtpmap", payloadType.toString());
    if (index === null) {
      return sdpLines;
    }
    sdpLines.splice(index, 1);

    // Search for the video m= line and remove the codec.
    const mLineIndex = this.findLine(sdpLines, "m=", "video");
    if (mLineIndex === null) {
      return sdpLines;
    }
    sdpLines[mLineIndex] = this.removePayloadTypeFromMline(
      sdpLines[mLineIndex],
      payloadType
    );
    return sdpLines;
  }

  public static maybeRemoveVideoFec(sdp: any, params: any) {
    if (params.videoFec !== "false") {
      return sdp;
    }

    let sdpLines = sdp.split("\r\n");

    let index = this.findLine(sdpLines, "a=rtpmap", "red");
    if (index === null) {
      return sdp;
    }
    const redPayloadType = this.getCodecPayloadTypeFromLine(sdpLines[index]);
    sdpLines = this.removeCodecByPayloadType(sdpLines, redPayloadType);

    sdpLines = this.removeCodecByName(sdpLines, "ulpfec");

    // Remove fmtp lines associated with red codec.
    index = this.findLine(sdpLines, "a=fmtp", redPayloadType.toString());
    if (index === null) {
      return sdp;
    }
    const fmtpLine = this.parseFmtpLine(sdpLines[index]);
    const rtxPayloadType = fmtpLine.pt;
    if (rtxPayloadType === null) {
      return sdp;
    }
    sdpLines.splice(index, 1);

    sdpLines = this.removeCodecByPayloadType(sdpLines, rtxPayloadType);
    return sdpLines.join("\r\n");
  }

  // Promotes |audioSendCodec| to be the first in the m=audio line, if set.
  public static maybePreferAudioSendCodec(sdp: any, params: any) {
    return this.maybePreferCodec(sdp, "audio", "send", params.audioSendCodec);
  }

  // Promotes |audioRecvCodec| to be the first in the m=audio line, if set.
  public static maybePreferAudioReceiveCodec(sdp: any, params: any) {
    return this.maybePreferCodec(
      sdp,
      "audio",
      "receive",
      params.audioRecvCodec
    );
  }

  // Promotes |videoSendCodec| to be the first in the m=audio line, if set.
  public static maybePreferVideoSendCodec(sdp: any, params: any) {
    return this.maybePreferCodec(sdp, "video", "send", params.videoSendCodec);
  }

  // Promotes |videoRecvCodec| to be the first in the m=audio line, if set.
  public static maybePreferVideoReceiveCodec(sdp: any, params: any) {
    return this.maybePreferCodec(
      sdp,
      "video",
      "receive",
      params.videoRecvCodec
    );
  }

  // Sets |codec| as the default |type| codec if it's present.
  // The format of |codec| is 'NAME/RATE', e.g. 'opus/48000'.
  public static maybePreferCodec(sdp: any, type: any, dir: any, codec: any) {
    const str = type + " " + dir + " codec";
    if (!codec) {
      Log.log("No preference on " + str + ".");
      return sdp;
    }

    Log.log("Prefer " + str + ": " + codec);

    const sdpLines = sdp.split("\r\n");

    // Search for m line.
    const mLineIndex = this.findLine(sdpLines, "m=", type);
    if (mLineIndex === null) {
      return sdp;
    }

    // If the codec is available, set it as the default in m line.
    const payload = this.getCodecPayloadType(sdpLines, codec);
    if (payload) {
      sdpLines[mLineIndex] = this.setDefaultCodec(
        sdpLines[mLineIndex],
        payload
      );
    }

    sdp = sdpLines.join("\r\n");
    return sdp;
  }

  // Set fmtp param to specific codec in SDP. If param does not exists, add it.
  public static setCodecParam(sdp: any, codec: any, param: any, value: any) {
    const sdpLines = sdp.split("\r\n");

    const fmtpLineIndex = this.findFmtpLine(sdpLines, codec);

    let fmtpObj: any = {};
    if (fmtpLineIndex === null) {
      const index = this.findLine(sdpLines, "a=rtpmap", codec);
      if (index === null) {
        return sdp;
      }
      const payload = this.getCodecPayloadTypeFromLine(sdpLines[index]);
      fmtpObj.pt = payload.toString();
      fmtpObj.params = {};
      fmtpObj.params[param] = value;
      sdpLines.splice(index + 1, 0, this.writeFmtpLine(fmtpObj));
    } else {
      fmtpObj = this.parseFmtpLine(sdpLines[fmtpLineIndex]);
      fmtpObj.params[param] = value;
      sdpLines[fmtpLineIndex] = this.writeFmtpLine(fmtpObj);
    }

    sdp = sdpLines.join("\r\n");
    return sdp;
  }

  // Remove fmtp param if it exists.
  public static removeCodecParam(sdp: any, codec: any, param: any) {
    const sdpLines = sdp.split("\r\n");

    const fmtpLineIndex = this.findFmtpLine(sdpLines, codec);
    if (fmtpLineIndex === null) {
      return sdp;
    }

    const map = this.parseFmtpLine(sdpLines[fmtpLineIndex]);
    delete map.params[param];

    const newLine = this.writeFmtpLine(map);
    if (newLine === null) {
      sdpLines.splice(fmtpLineIndex, 1);
    } else {
      sdpLines[fmtpLineIndex] = newLine;
    }

    sdp = sdpLines.join("\r\n");
    return sdp;
  }

  // Split an fmtp line into an object including 'pt' and 'params'.
  public static parseFmtpLine(fmtpLine: string) {
    const fmtpObj: any = {};
    const spacePos = fmtpLine.indexOf(" ");
    const keyValues = fmtpLine.substring(spacePos + 1).split(";");

    const pattern = new RegExp("a=fmtp:(\\d+)");
    const result = fmtpLine.match(pattern);
    if (result && result.length === 2) {
      fmtpObj.pt = result[1];
    } else {
      return null;
    }

    const params: any = {};
    // for (let i = 0; i < keyValues.length; ++i) {
    for (const pair of Object.keys(keyValues)) {
      // const pair = keyValues[i].split("=");
      if (pair.length === 2) {
        params[pair[0]] = pair[1];
      }
    }
    fmtpObj.params = params;

    return fmtpObj;
  }

  // Generate an fmtp line from an object including 'pt' and 'params'.
  public static writeFmtpLine(fmtpObj: any) {
    if (!fmtpObj.hasOwnProperty("pt") || !fmtpObj.hasOwnProperty("params")) {
      return null;
    }
    const pt = fmtpObj.pt;
    const params = fmtpObj.params;
    const keyValues = [];
    let i = 0;
    for (const key of Object.keys(params)) {
      keyValues[i] = key + "=" + params[key];
      ++i;
    }
    if (i === 0) {
      return null;
    }
    return "a=fmtp:" + pt.toString() + " " + keyValues.join(";");
  }

  // Find fmtp attribute for |codec| in |sdpLines|.
  public static findFmtpLine(sdpLines: string, codec: any) {
    // Find payload of codec.
    const payload = this.getCodecPayloadType(sdpLines, codec);
    // Find the payload in fmtp line.
    return payload
      ? this.findLine(sdpLines, "a=fmtp:" + payload.toString())
      : null;
  }

  // Find the line in sdpLines that starts with |prefix|, and, if specified,
  // contains |substr| (case-insensitive search).
  public static findLine(sdpLines: string, prefix: string, substr?: string) {
    return this.findLineInRange(sdpLines, 0, -1, prefix, substr);
  }

  // Find the line in sdpLines[startLine...endLine - 1] that starts with |prefix|
  // and, if specified, contains |substr| (case-insensitive search).
  public static findLineInRange(
    sdpLines: string,
    startLine: number,
    endLine: number,
    prefix: string,
    substr?: string
  ) {
    const realEndLine = endLine !== -1 ? endLine : sdpLines.length;
    for (let i = startLine; i < realEndLine; ++i) {
      if (sdpLines[i].indexOf(prefix) === 0) {
        if (
          !substr ||
          sdpLines[i].toLowerCase().indexOf(substr.toLowerCase()) !== -1
        ) {
          return i;
        }
      }
    }
    return null;
  }

  // Gets the codec payload type from sdp lines.
  public static getCodecPayloadType(sdpLines: any, codec: any) {
    const index = this.findLine(sdpLines, "a=rtpmap", codec);
    return index ? this.getCodecPayloadTypeFromLine(sdpLines[index]) : null;
  }

  // Gets the codec payload type from an a=rtpmap:X line.
  public static getCodecPayloadTypeFromLine(sdpLine: any) {
    const pattern = new RegExp("a=rtpmap:(\\d+) [a-zA-Z0-9-]+\\/\\d+");
    const result = sdpLine.match(pattern);
    return result && result.length === 2 ? result[1] : null;
  }

  // Returns a new m= line with the specified codec as the first one.
  public static setDefaultCodec(mLine: any, payload: any) {
    const elements = mLine.split(" ");

    // Just copy the first three parameters; codec order starts on fourth.
    const newLine = elements.slice(0, 3);

    // Put target payload first and copy in the rest.
    newLine.push(payload);
    for (let i = 3; i < elements.length; i++) {
      if (elements[i] !== payload) {
        newLine.push(elements[i]);
      }
    }
    return newLine.join(" ");
  }
}
