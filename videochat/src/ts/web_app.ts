import "../scss/web_app.scss";

import { BaseUtils } from "./com/genb/base/utils/BaseUtils";
import { HTMLUtils } from "./com/genb/base/utils/HTMLUtils";
import { Log } from "./com/genb/base/utils/Log";
import { AppController } from "./com/quickhellou/AppController";
import { AppControllerEvent } from "./com/quickhellou/AppControllerEvent";
import { LoadingParams } from "./com/quickhellou/LoadingParams";

Log.setEnvironment(environment);
Log.log(
  `Quick Hellou v. ${version} ${environment} build (webrtc-adapter v. 8.1.0)`
);

const loadingParams: LoadingParams = new LoadingParams();
try {
  // load inline values
  if (BaseUtils.isObjectDefined(inlineLoadingParams)) {
    loadingParams.bypassJoinConfirmation =
      inlineLoadingParams.bypassJoinConfirmation;
    loadingParams.iceServerRequestUrl = inlineLoadingParams.iceServerRequestUrl;
    loadingParams.errorMessages = inlineLoadingParams.errorMessages;
    loadingParams.warningMessages = inlineLoadingParams.warningMessages;
    loadingParams.mediaConstraints = inlineLoadingParams.mediaConstraints;
    loadingParams.offerOptions = inlineLoadingParams.offerOptions;
    loadingParams.peerConnectionConfig =
      inlineLoadingParams.peerConnectionConfig;
    loadingParams.peerConnectionConstraints =
      inlineLoadingParams.peerConnectionConstraints;
    loadingParams.roomType = inlineLoadingParams.roomType;
    loadingParams.wssPostUrl = inlineLoadingParams.wssPostUrl;
    loadingParams.wssUrl = inlineLoadingParams.wssUrl;

    if (BaseUtils.isObjectDefined(inlineLoadingParams.roomID)) {
      loadingParams.roomID = inlineLoadingParams.roomID;
    }
    if (BaseUtils.isObjectDefined(inlineLoadingParams.roomLink)) {
      loadingParams.roomLink = inlineLoadingParams.roomLink;
    }
    if (BaseUtils.isObjectDefined(inlineLoadingParams.additionalParam)) {
      loadingParams.additionalParam = inlineLoadingParams.additionalParam;
    }
  }

  window.addEventListener("load", (): void => {
    const appController: AppController = new AppController(loadingParams);
    appController.addEventListener(
      AppControllerEvent.INITIALIZED,
      (): void => {
        const main: HTMLElement = HTMLUtils.get("main");
        main.classList.add("js-visible");

        // remove loader after when the main element is visible
        setTimeout((): void => {
          const loader: HTMLElement = HTMLUtils.get("div.loader");
          loader.remove();
        }, 1000);

        // service workers facade
        // new ServiceWorkers();
      },
      this
    );
    appController.init();
  });
} catch (error) {
  Log.warn(error);
}
