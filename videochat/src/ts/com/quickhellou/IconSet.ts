import { HTMLUtils } from "../genb/base/utils/HTMLUtils";

export class IconSet {
  public iconElement: HTMLElement;

  constructor(selector: string) {
    this.iconElement = HTMLUtils.get(selector);
  }

  public toggle(): void {
    if (this.iconElement.classList.contains("on")) {
      this.iconElement.classList.remove("on");
    } else {
      this.iconElement.classList.add("on");
    }
  }

  public disable(): void {
    if (!this.iconElement.classList.contains("on")) {
      this.iconElement.classList.add("on");
    }
  }

  public enable(): void {
    if (this.iconElement.classList.contains("on")) {
      this.iconElement.classList.remove("on");
    }
  }


}
