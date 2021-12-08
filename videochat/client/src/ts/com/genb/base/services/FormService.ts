import { EventDispatcherService } from "./EventDispatcherService";
import { BaseUtils } from "../utils/BaseUtils";
import { Log } from "../utils/Log";

/**
 * Form services facade
 *
 * @export
 * @class FormService
 * @extends {EventDispatcherService}
 */
export class FormService extends EventDispatcherService {
  public static LOAD: string = "load";

  public static OK: string = "OK";
  public static STATUS_OK: number = 200;
  public static STATUS_FORBIDDEN: number = 403;
  public static STATUS_INTERNAL_SERVER_ERROR: number = 500;

  private static GET: string = "GET";
  private static POST: string = "POST";

  /**
   * Makes a POST request.
   *
   * @param {string} url
   * @param {(string | FormData)} postData
   * @returns {Promise<any>}
   * @memberof FormService
   */
  public post(url: string, postData?: string | FormData): Promise<any> {
    return new Promise((resolve: any, reject: any) => {
      const request: XMLHttpRequest = new XMLHttpRequest();
      request.open(FormService.POST, url, true);
      request.addEventListener("load", (event: Event) => {
        if (request.status === FormService.STATUS_FORBIDDEN) {
          alert("You've been logged out. Please try again.");
        } else if (
          request.status === FormService.STATUS_INTERNAL_SERVER_ERROR
        ) {
          Log.warn(
            "There was an error while processing your request.",
            request.statusText,
            request.responseText
          );
          reject(request.responseText);
        } else if (
          request.statusText === FormService.OK &&
          BaseUtils.isObjectDefined(resolve)
        ) {
          resolve(request.responseText);
        }
      });
      if (!!postData) {
        request.send(postData);
      } else {
        request.send();
      }
    });
  }

  /**
   * Makes a GET request.
   *
   * @public
   * @param {string} url
   * @param {Function} [resolve]
   * @memberof FormService
   */
  public get(url: string, resolve?: any) {
    const request: XMLHttpRequest = new XMLHttpRequest();
    request.open(FormService.GET, url);
    request.addEventListener("load", (event: Event) => {
      if (request.status === FormService.STATUS_FORBIDDEN) {
        alert("You've been logged out. Please try again.");
      } else if (request.status === FormService.STATUS_INTERNAL_SERVER_ERROR) {
        alert("There was an error while processing your request.");
      } else if (
        request.status === FormService.STATUS_OK &&
        BaseUtils.isObjectDefined(resolve)
      ) {
        resolve(request.responseText);
      }
    });
    request.send();
  }
}
