import { Log } from '../../../genb/base/utils/Log'

/**
 * Sender-side media quality settings.
 *
 * WebRTC's built-in congestion control (GCC) continuously estimates the
 * available bandwidth and adapts bitrate, resolution and frame rate on its
 * own. This class only sets sane limits for it to work within:
 *
 *  - an upload budget split across all peers (mesh: one encode per peer),
 *  - frame rate cap, no forced downscaling,
 *  - degradation: camera keeps motion smooth (balanced), screen share keeps
 *    text sharp (maintain-resolution),
 *  - audio gets priority over video and is sent with redundancy (RED) where
 *    supported, so speech survives packet loss.
 */
export class MediaQuality {
  /** Total video upload budget across all peers (bits/s). */
  public static VIDEO_UPLOAD_BUDGET: number = 1500000
  /** Per-peer video bitrate bounds (bits/s). */
  public static MIN_VIDEO_BITRATE: number = 150000
  public static MAX_VIDEO_BITRATE: number = 1500000
  /** Screen sharing needs more bits for sharp text. */
  public static MAX_SCREEN_BITRATE: number = 2500000
  public static MAX_FRAMERATE: number = 30
  public static MAX_SCREEN_FRAMERATE: number = 15

  /**
   * Per-peer video bitrate for the current number of peers.
   */
  public static videoBitrateFor(peerCount: number, isScreen: boolean): number {
    const peers: number = Math.max(1, peerCount)
    const max: number = isScreen
      ? MediaQuality.MAX_SCREEN_BITRATE
      : MediaQuality.MAX_VIDEO_BITRATE
    const budget: number = isScreen
      ? MediaQuality.MAX_SCREEN_BITRATE
      : MediaQuality.VIDEO_UPLOAD_BUDGET
    return Math.round(
      Math.min(max, Math.max(MediaQuality.MIN_VIDEO_BITRATE, budget / peers))
    )
  }

  /**
   * Marks a captured track so the encoder optimizes for its content.
   */
  public static setContentHint(track: MediaStreamTrack, isScreen: boolean): void {
    if (!track || track.kind !== 'video' || !('contentHint' in track)) {
      return
    }
    ;(track as any).contentHint = isScreen ? 'detail' : 'motion'
  }

  public static isScreenTrack(track: MediaStreamTrack): boolean {
    const hint: string = track ? (track as any).contentHint : ''
    return hint === 'detail' || hint === 'text'
  }

  /**
   * Applies bitrate / frame rate / priority limits to all senders of a
   * peer connection. Safe to call repeatedly (peer count change, track switch).
   * Encodings exist only after negotiation, so failures before that are ignored.
   */
  public static applySenderParameters(
    peerConnection: RTCPeerConnection,
    peerCount: number
  ): void {
    if (!peerConnection || !('RTCRtpSender' in window)) {
      return
    }
    peerConnection.getSenders().forEach((sender: RTCRtpSender) => {
      const track: MediaStreamTrack = sender.track
      if (!track || typeof sender.getParameters !== 'function') {
        return
      }
      const parameters: any = sender.getParameters()
      if (!parameters.encodings || parameters.encodings.length === 0) {
        return // not negotiated yet; applied again once connected
      }
      const encoding: any = parameters.encodings[0]

      if (track.kind === 'audio') {
        encoding.priority = 'high'
        encoding.networkPriority = 'high'
      } else if (track.kind === 'video') {
        const isScreen: boolean = MediaQuality.isScreenTrack(track)
        encoding.maxBitrate = MediaQuality.videoBitrateFor(peerCount, isScreen)
        encoding.maxFramerate = isScreen
          ? MediaQuality.MAX_SCREEN_FRAMERATE
          : MediaQuality.MAX_FRAMERATE
        // Never force a downscale: let congestion control pick the resolution.
        encoding.scaleResolutionDownBy = 1
        encoding.priority = 'low'
        encoding.networkPriority = 'low'
        parameters.degradationPreference = isScreen
          ? 'maintain-resolution'
          : 'balanced'
      }

      sender.setParameters(parameters).catch((reason: any) => {
        Log.warn('MediaQuality: setParameters failed', track.kind, reason)
      })
    })
  }

  /**
   * Prefers RED (redundant audio) before Opus where the browser supports it.
   * Must run before createOffer/createAnswer. Peers without RED fall back to Opus.
   */
  public static preferAudioRedundancy(peerConnection: RTCPeerConnection): void {
    try {
      const receiverCaps: any =
        (window as any).RTCRtpReceiver &&
        (RTCRtpReceiver as any).getCapabilities &&
        (RTCRtpReceiver as any).getCapabilities('audio')
      if (!receiverCaps || !receiverCaps.codecs) {
        return
      }
      const codecs: any[] = receiverCaps.codecs
      const red: any[] = codecs.filter(
        (c: any) => c.mimeType.toLowerCase() === 'audio/red'
      )
      if (red.length === 0) {
        return
      }
      const others: any[] = codecs.filter(
        (c: any) => c.mimeType.toLowerCase() !== 'audio/red'
      )
      peerConnection.getTransceivers().forEach((transceiver: any) => {
        const kind: string =
          (transceiver.sender && transceiver.sender.track && transceiver.sender.track.kind) ||
          (transceiver.receiver && transceiver.receiver.track && transceiver.receiver.track.kind)
        if (kind === 'audio' && typeof transceiver.setCodecPreferences === 'function') {
          transceiver.setCodecPreferences(red.concat(others))
        }
      })
    } catch (e) {
      Log.warn('MediaQuality: RED preference not applied', e)
    }
  }
}
