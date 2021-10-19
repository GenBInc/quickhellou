import "../scss/web_app.scss";

import { Log } from "./com/genb/base/utils/Log";
import { HTMLUtils } from "./com/genb/base/utils/HTMLUtils";
import { HomeController } from "./com/quickhellou/home/controller/HomeController";

try {
  window.addEventListener("load", (): void => {
    const homeController: HomeController = new HomeController();
    homeController.init();
    const loader: HTMLElement = HTMLUtils.get("div.loader");
    loader.remove();
    HTMLUtils.get("div.main").classList.add("js-visible");
  });
} catch (error) {
  Log.warn(error);
}
