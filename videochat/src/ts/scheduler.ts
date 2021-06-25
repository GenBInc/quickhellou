import "../scss/scheduler.scss";

import { SchedulerView } from "./com/quickhellou/scheduler/SchedulerView";
import "../../../node_modules/pikaday/pikaday";
import { HTMLUtils } from "./com/genb/base/utils/HTMLUtils";
import { Log } from "./com/genb/base/utils/Log";

Log.log(`Quick Hellou Scheduler v. ${version} ${environment} build`);

window.addEventListener("load", (event: Event): void => {
  let main: HTMLElement = HTMLUtils.get("main");
  main.classList.add("js-visible");
  new SchedulerView(HTMLUtils.get(".scheduler"));
  // remove loader after when the main element is visible
  setTimeout((): void => {
    let loader: HTMLElement = HTMLUtils.get("div.loader");
    loader.remove();
  }, 1000);
});
