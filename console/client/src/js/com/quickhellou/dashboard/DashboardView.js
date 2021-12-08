import { UIView } from '../../genb/base/controller/UIView'
import { ApiService } from '../base/services/ApiService'
import { ViewService } from '../base/services/ViewService'

export class DashboardView extends UIView {
  constructor() {
    super()
    this.apiService = new ApiService('')
    this.viewService = new ViewService()
  }

  async init() {}

  /**
   * Shows page loader.
   *
   * @memberof DashboardView
   */
  showPageLoader() {
    if (this.uiExists('.mdc-linear-progress--page')) {
      const pageLoader = this.uiGet('.mdc-linear-progress--page')
      pageLoader.classList.add('js-active')
    }
  }

  /**
   * Hides page loader.
   *
   * @memberof DashboardView
   */
  hidePageLoader() {
    const pageLoader = this.uiGet('.mdc-linear-progress--page')
    pageLoader.classList.remove('active')
    pageLoader.classList.remove('js-active')
  }
}
