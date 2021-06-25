interface Document {
  cancelFullScreen: boolean | any;
  mozFullScreen: boolean;
  isFullScreen: boolean;
  webkitFullscreenElement: Element;
  mozCancelFullScreen(): void;
  msExitFullscreen(): void;
}

interface HTMLElement {
  requestFullScreen: boolean | any;
  msRequestFullscreen(): void;
  mozRequestFullScreen(): void;
}

interface RTCPeerConnection extends EventTarget {
  generateCertificate: (certParams: any) => any;
}

interface Navigator {
  getDisplayMedia: any;
}

interface MediaDevices {
  getDisplayMedia: any;
}

interface MediaTrackSupportedConstraints {
  mediaSource: any;
}

interface MediaStreamConstraints {
  mediaSource?: string | boolean | MediaTrackConstraints;
}

declare var adapter: any;
declare var apprtc: any;
declare var chrome: any;
declare var inlineLoadingParams: any;
declare var version: any;
declare var environment: any;
