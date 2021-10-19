import { BaseUtils } from "../genb/base/utils/BaseUtils";
import { Log } from "../genb/base/utils/Log";

export class ServiceWorkers {
  constructor() {
    if (BaseUtils.isObjectDefined(navigator.serviceWorker)) {
      navigator.serviceWorker
        .register("sw.js")
        .then((registration: ServiceWorkerRegistration): void => {
          Log.log(
            `ServiceWorker registration successful with scope: ${registration.scope}`
          );
        })
        .catch((error: string): void => {
          Log.warn(error);
        });
    }
  }
}
