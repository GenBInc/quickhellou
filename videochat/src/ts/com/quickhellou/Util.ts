import { StringUtils } from "../genb/base/utils/StringUtils";
import { Log } from "../genb/base/utils/Log";

/**
 * Utilities.
 *
 * @export
 * @class Util
 */
export class Util {
  public static sendAsyncUrlRequest(
    method: string,
    url: string,
    body?: string
  ) {
    return this.sendUrlRequest(method, url, true, body);
  }

  /**
   * Sends XHR request.
   *
   * @static
   * @param {string} method
   * @param {string} url
   * @param {boolean} async
   * @param {string} [body]
   * @returns
   * @memberof Util
   */
  public static sendUrlRequest(
    method: string,
    url: string,
    async: boolean,
    body?: string
  ) {
    return new Promise((resolve: any, reject: any): void => {
      if (!async) {
        resolve(navigator.sendBeacon(url, body));
        return;
      }
      let xhr: XMLHttpRequest;
      const reportResults = (): void => {
        if (xhr.status !== 200) {
          reject(
            Error("Status=" + xhr.status + ", response=" + xhr.responseText)
          );
          return;
        }
        resolve(xhr.responseText);
      };

      xhr = new XMLHttpRequest();
      if (async) {
        xhr.onreadystatechange = (): void => {
          if (xhr.readyState !== 4) {
            return;
          }
          reportResults();
        };
      }
      xhr.open(method, url, async);
      xhr.send(body);

      if (!async) {
        reportResults();
      }
    });
  }

  /**
   * Parses JSON object.
   *
   * @static
   * @param {string} json
   * @returns {object}
   * @memberof Util
   */
  public static parseJSON(json: string): object {
    try {
      return JSON.parse(json);
    } catch (e) {
      Log.log("Error parsing json: " + json);
    }
    return null;
  }

  public static setCookie(
    name: string,
    value: string,
    days = 7,
    path = "/"
  ): void {
    const expires = new Date(Date.now() + days * 864e5).toUTCString();
    document.cookie =
      name +
      "=" +
      encodeURIComponent(value) +
      "; expires=" +
      expires +
      "; path=" +
      path;
  }

  public static getCookie(name: string): string {
    return document.cookie.split("; ").reduce((r, v) => {
      const parts = v.split("=");
      return parts[0] === name ? decodeURIComponent(parts[1]) : r;
    }, "");
  }

  public static deleteCookie(name: string, path: string): void {
    this.setCookie(name, "", -1, path);
  }

  /**
   * Checks if is mobile platform.
   *
   * @static
   * @returns {boolean}
   * @memberof Util
   */
  public static isMobile(): boolean {
    if (
      // tslint:disable-next-line:max-line-length
      /(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|ipad|iris|kindle|Android|Silk|lge |maemo|midp|mmp|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows (ce|phone)|xda|xiino/i.test(
        navigator.userAgent
      ) ||
      // tslint:disable-next-line:max-line-length
      /1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(
        navigator.userAgent.substr(0, 4)
      )
    ) {
      return true;
    }
    return false;
  }

  /**
   * Checks if a browser is EdgeHTML.
   *
   * @static
   * @returns {boolean}
   * @memberof Util
   */
  public static isEdgeHTML(): boolean {
    return /Edge\//g.test(navigator.userAgent);
  }

  public static randomString(strLength: number): string {
    const result: string[] = [];
    strLength = strLength || 5;
    const charSet: string = "0123456789";
    while (strLength--) {
      result.push(charSet.charAt(Math.floor(Math.random() * charSet.length)));
    }
    return result.join("");
  }

  /**
   * Returns the URL query key-value pairs as a dictionary object.
   *
   * @static
   * @param {string} queryString
   * @returns {*}
   * @memberof Util
   */
  public static queryStringToDictionary(queryString: string): any {
    const pairs: string[] = queryString.slice(1).split("&");

    const result: any = {};
    pairs.forEach((pair: any) => {
      if (pair) {
        pair = pair.split("=");
        if (pair[0]) {
          result[pair[0]] = decodeURIComponent(pair[1] || "");
        }
      }
    });
    return result;
  }

  /**
   * Calculcates FPS for the provided video elements and calls on a callback which
   * is used to update the necessary stats for either remote or local videos.
   * Adapted from https://cs.chromium.org/chromium/src/chrome/test/data/media/html/media_stat_perf.html
   *
   * @static
   * @param {*} videoElement
   * @param {number} decodedFrames
   * @param {number} startTime
   * @param {string} remoteOrLocal
   * @param {Function} callback
   * @returns {number}
   * @memberof Util
   */
  public static calculateFps(
    videoElement: any,
    decodedFrames: number,
    startTime: number,
    remoteOrLocal: string,
    callback: any
  ): number {
    let fps: any = 0;
    if (
      videoElement &&
      typeof videoElement.webkitDecodedFrameCount !== undefined
    ) {
      if (videoElement.readyState >= videoElement.HAVE_CURRENT_DATA) {
        const currentTime = new Date().getTime();
        const deltaTime = (currentTime - startTime) / 1000;
        const startTimeToReturn = currentTime;
        fps =
          (videoElement.webkitDecodedFrameCount - decodedFrames) / deltaTime;
        callback(
          videoElement.webkitDecodedFrameCount,
          startTimeToReturn,
          remoteOrLocal
        );
      }
    }
    // tslint:disable-next-line:radix
    return parseInt(fps);
  }

  /**
   * Returns a list of ICE servers after requesting it from the ICE server provider.
   * ICE is a standard method of NAT traversal used in WebRTC.
   * https://webrtcglossary.com/ice/
   *
   * @static
   * @param {string} iceServerRequestUrl
   * @param {string} iceTransports
   * @returns {*}
   * @memberof Util
   */
  public static requestIceServers(
    iceServerRequestUrl: string,
    iceTransports: string
  ): any {
    return new Promise((resolve: any, reject: any): void => {
      this.sendAsyncUrlRequest("POST", iceServerRequestUrl)
        .then((response: any): void => {
          const iceServerRequestResponse: any = this.parseJSON(response);
          if (!iceServerRequestResponse) {
            reject(Error("Error parsing response JSON: " + response));
            return;
          }
          if (StringUtils.isNotEmpty(iceTransports)) {
            this.filterIceServersUrls(iceServerRequestResponse, iceTransports);
          }
          Log.log("Retrieved ICE server information.");
          resolve(iceServerRequestResponse.iceServers);
        })
        .catch((error: any): void => {
          reject(Error("ICE server request error: " + error.message));
          return;
        });
    });
  }

  public static isFullScreen(): boolean {
    return !!(document.isFullScreen || document.fullscreenEnabled); // if any defined and true
  }

  /**
   * Start shims for fullscreen
   * (kmr) review reliability
   * @static
   * @memberof Util
   */
  public static setUpFullScreen() {
    document.cancelFullScreen =
      document.mozCancelFullScreen || document.cancelFullScreen;

    document.body.requestFullScreen =
      document.body.mozRequestFullScreen || document.body.requestFullScreen;

    document.onfullscreenchange = (event: Event): any => {
      return document.onfullscreenchange;
    };
  }

  public static requestFullscreen(): void {
    if (document.body.requestFullscreen) {
      document.body.requestFullscreen();
    } else if (document.body.mozRequestFullScreen) {
      document.body.mozRequestFullScreen();
    } else if (document.body.msRequestFullscreen) {
      document.body.msRequestFullscreen();
    }
  }

  public static cancelFullScreen(): void {

    if (document.exitFullscreen) {
      document.exitFullscreen();
    } else if (document.mozCancelFullScreen) {
      document.mozCancelFullScreen();
    } else if (document.msExitFullscreen) {
      document.msExitFullscreen();
    } else if (document.cancelFullScreen) {
      document.cancelFullScreen();
    }
  }

  /**
   * Filter a peerConnection config to only contain ice servers with
   * transport=|protocol|.
   *
   * @private
   * @static
   * @param {*} config
   * @param {*} protocol
   * @memberof Util
   */
  private static filterIceServersUrls(config: any, protocol: any): void {
    const transport: string = "transport=" + protocol;
    const newIceServers: string[] = new Array<string>();
    // tslint:disable-next-line:prefer-for-of
    for (let i: number = 0; i < config.iceServers.length; ++i) {
      const iceServer: any = config.iceServers[i];
      const newUrls: string[] = [];
      // tslint:disable-next-line:prefer-for-of
      for (let j: number = 0; j < iceServer.urls.length; ++j) {
        const url: string = iceServer.urls[j];
        if (url.indexOf(transport) !== -1) {
          newUrls.push(url);
        } else if (url.indexOf("?transport=") === -1) {
          newUrls.push(url + "?" + transport);
        }
      }
      if (newUrls.length !== 0) {
        iceServer.urls = newUrls;
        newIceServers.push(iceServer);
      }
    }
    config.iceServers = newIceServers;
  }
}
