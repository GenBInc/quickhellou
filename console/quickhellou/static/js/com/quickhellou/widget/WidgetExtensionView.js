import { UIView } from '../../genb/base/controller/UIView'

/**
 * Embed widget view.
 *
 * @export
 * @class WidgetExtensionView
 * @extends {UIView}
 */
export class WidgetExtensionView extends UIView {
  /**
   * Creates an instance of WidgetExtensionView.
   *
   * @param {*} service
   *
   * @memberof WidgetExtensionView
   */
  constructor(service) {
    super()
    this.service = service
    this.isExpanded = false
  }

  /**
   * Initializes the view.
   *
   * @memberof WidgetExtensionView
   */
  async init() {
    this.service.addListener('listUsers', (a) => {
      this.updateVideoCallUi(a.length > 0)
    })

    this.service.addListener('callAccepted', (e) => {
      this.onCallAccepted(e)
    })

    this.service.addListener('callRejected', () => {
      this.onCallRejected()
    })

    const makeVideoCallButton = this.uiGet('.button--video-call')
    makeVideoCallButton.addEventListener('click', () => {
      this.requestCall()
    })

    const cancelVideoCallButton = this.uiGet('.button--cancel-video-call')
    cancelVideoCallButton.addEventListener('click', () => {
      this.cancelCall()
    })

    const collapseViewButtonElement = this.uiGet('.widget-closer')
    collapseViewButtonElement.addEventListener('click', () => {
      this.collapseView()
    })
    this.initContactForm()
  }

  /**
   * Initializes contact form.
   *
   * @memberof WidgetExtensionView
   */
  initContactForm() {
    const submitButtonElement = this.uiGet('.widget-extension__button.submit')
    submitButtonElement.addEventListener('click', () => {
      this.sendContactForm()
    })
  }

  /**
   * Sends contact form.
   *
   * @memberof WidgetExtensionView
   */
  sendContactForm() {
    const fieldSet = {
      email: document.querySelector('input[name=email]').value,
      phone: document.querySelector('input[name=phone]').value,
      message: document.querySelector('textarea[name=message]').value,
    }
    this.service.sendContactForm(fieldSet).then((response) => {
      document.querySelector('.contact-form').innerHTML = response
    }).catch((reason) => {
      console.log('reason', reason)
    })
  }

  /**
   * Toggles the view.
   *
   * @memberof WidgetExtensionView
   */
  toggleView() {
    if (this.isExpanded) {
      this.collapseView()
    } else {
      this.expandView()
    }
  }

  /**
   * Expands the view.
   *
   * @memberof WidgetExtensionView
   */
  expandView() {
    this.isExpanded = true
    window.parent.document
      .getElementById('qh_e_frame')
      .classList.add('js-expanded')
  }

  /**
   * Collapses the view.
   *
   * @memberof WidgetExtensionView
   */
  collapseView() {
    this.isExpanded = false
    window.parent.document
      .getElementById('qh_e_frame')
      .classList.remove('js-expanded')
  }

  /**
   * Enables video call UI when number if any admin is active.
   *
   * @param {boolean} force
   * @memberof WidgetExtensionView
   */
  updateVideoCallUi(force) {
    const videoUiElement = this.uiGet('.video-ui')
    videoUiElement.classList.toggle('js-enabled', force)
    if (!force) {
      this.activateCallDefaultStage()
    }
  }

  /**
   * Requests a call.
   *
   * @memberof WidgetExtensionView
   */
  requestCall() {
    this.service.requestCall()
    this.activateCallRequestStage()
  }

  /**
   * Cancels a call.
   *
   * @memberof WidgetExtensionView
   */
  cancelCall() {
    this.service.cancelCall()
    this.activateCallDefaultStage()
  }

  /**
   * Handles call accepted event.
   *
   * @param {string} url
   * @memberof WidgetExtensionView
   */
  onCallAccepted(url) {
    const urlElement = this.uiGet('.iu-view__video-app-url')
    urlElement.innerHTML = urlElement.href = url
    this.activateCallAcceptedStage()
  }

  /**
   * Handles call rejected event.
   *
   * @memberof WidgetExtensionView
   */
  onCallRejected() {
    this.activateCallDefaultStage()
  }

  /**
   * Activates default video UI stage.
   *
   * @memberof WidgetExtensionView
   */
  activateCallDefaultStage() {
    this.deactivateAllStages()
    const stageElement = this.uiGet('.ui-view__stage--default')
    stageElement.classList.add('js-enabled')
  }

  /**
   * Activates video call request UI stage.
   *
   * @memberof WidgetExtensionView
   */
  activateCallRequestStage() {
    this.deactivateAllStages()
    const stageElement = this.uiGet('.ui-view__stage--call-request')
    stageElement.classList.add('js-enabled')
  }

  /**
   * Activates video call accepted UI stage.
   *
   * @memberof WidgetExtensionView
   */
  activateCallAcceptedStage() {
    this.deactivateAllStages()
    const stageElement = this.uiGet('.ui-view__stage--call-accepted')
    stageElement.classList.add('js-enabled')
  }

  /**
   * Deactivates all stages.
   *
   * @memberof WidgetExtensionView
   */
  deactivateAllStages() {
    const stageElements = this.uiArray('.video-ui__stage')
    stageElements.forEach((stageElement) => {
      stageElement.classList.remove('js-enabled')
    })
  }
}
