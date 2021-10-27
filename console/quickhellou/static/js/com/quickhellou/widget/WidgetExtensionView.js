import { UIView } from '../../genb/base/controller/UIView'
import { HTMLUtils } from '../../genb/base/utils/HTMLUtils'

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
    this.element = this.uiGet('#qh_e_frame')
    this.isExpanded = false
    this.videoMode = false
  }

  /**
   * Initializes the view.
   *
   * @memberof WidgetExtensionView
   */
  async init() {
    this.service.addListener('admin', (adminUser) => {
      this.onAdmin(adminUser)
    })

    this.service.addListener('listUsers', (a) => {
      this.updateVideoCallUi(!!a.length)
    })

    this.service.addListener('callAccepted', (e) => {
      this.onCallAccepted(e)
    })

    this.service.addListener('callRejected', () => {
      this.onCallRejected()
    })

    this.service.addListener('videochatSessionClose', () => {
      this.onHangUpVideoChat()
    })

    const rateButtons = this.uiArray('.qh_rate-star')
    rateButtons.forEach((rateButton, index) => {
      rateButton.addEventListener('click', () => {
        for (let a = 1; a <= rateButtons.length; a++) {
          const button = this.uiGet(`.qh_rate-star:nth-child(${a})`)
          button.classList.remove('js-enabled,js-disabled')
          if (a <= index + 1) {
            button.classList.add('js-enabled')
            button.classList.remove('js-disabled')
          } else {
            button.classList.remove('js-enabled')
            button.classList.add('js-disabled')
          }
        }
        this.service.rateComSession(index + 1)
      })
    })
    this.initContactForm()
  }

  /**
   * Initializes contact form.
   *
   * @memberof WidgetExtensionView
   */
  initContactForm() {
    const sendButtonClassName = '.widget-extension__button--send'
    if (this.uiExists(sendButtonClassName)) {
      HTMLUtils.removeAllEventListeners(sendButtonClassName)
      const submitButtonElement = this.uiGet(sendButtonClassName)
      submitButtonElement.addEventListener('click', () => {
        this.sendContactForm()
      })
    }
    this.initInactiveOperatorCloser()
  }

  /**
   * Initializes active operator init form.
   */
  initStartVideoChatForm() {
    const startVideoButtonClassName = '.widget-extension__button--video-call'
    if (this.uiExists(startVideoButtonClassName)) {
      HTMLUtils.removeAllEventListeners(startVideoButtonClassName)
      const submitButtonElement = this.uiGet(startVideoButtonClassName)
      submitButtonElement.addEventListener('click', () =>
        this.sendStartVideoChatForm()
      )
    }
    this.initActiveOperatorCloser()
  }

  /**
   * Initializes closer button.
   * 
   * @memberof WidgetExtensionView
   */
  initActiveOperatorCloser() {
    const initFormCloserClass = '.qh_video-ui_form .qh_widget-closer--active-operator' 
    if (this.uiExists(initFormCloserClass)) {
      HTMLUtils.removeAllEventListeners(initFormCloserClass)
      const collapseViewButtonElement = this.uiGet(initFormCloserClass)
      collapseViewButtonElement.addEventListener('click', () => {
        this.collapseAndReinitActiveOperatorInitForm(false)
      })
    }
    
    const rateUXCloserClass = '.qh_rate-ux-content .qh_widget-closer--active-operator' 
    if (this.uiExists(rateUXCloserClass)) {
      HTMLUtils.removeAllEventListeners(rateUXCloserClass)
      const collapseViewButtonElement = this.uiGet(rateUXCloserClass)
      collapseViewButtonElement.addEventListener('click', () => {
        this.collapseAndReinitActiveOperatorInitForm()
      })
    }
    
  }

  /**
   * Initializes inactive operator form closer.
   * 
   * @memberof WidgetExtensionView
   */
  initInactiveOperatorCloser() {
    if (this.uiExists('.qh_widget-closer--inactive-operator')) {
      HTMLUtils.removeAllEventListeners('.qh_widget-closer--inactive-operator')
      const collapseViewButtonElement = this.uiGet('.qh_widget-closer--inactive-operator')
      collapseViewButtonElement.addEventListener('click', () => {
        this.collapseAndReinitInactiveOperatorInitForm()
      })
    }
  }

  /**
   * Collapses view and reinits active operator form.
   * 
   * @param {*} forceDestroyVideoChat 
   * 
   * @memberof WidgetExtensionView
   */
  collapseAndReinitActiveOperatorInitForm(forceDestroyVideoChat = true) {
    this.deactivateVideoMode()
    this.service.getActiveOperatorInitForm().then((html) => {
      document.querySelector('.qh_video-ui_replace').innerHTML = html
      this.activateActiveOperatorInitForm()
      this.collapseView()
      if (forceDestroyVideoChat) {
        this.service.destroyVideoChatApp()
      }
    })
  }

  /**
   * Collapses view and reinits inactive operator form.
   * 
   * @memberof WidgetExtensionView
   */
  collapseAndReinitInactiveOperatorInitForm() {
    this.service.getInactiveOperatorInitForm().then((html) => {
      document.querySelector('.contact-form').innerHTML = html
      this.initContactForm()
      this.collapseView()
    })
  }

  /**
   * Sends contact form.
   *
   * @memberof WidgetExtensionView
   */
  sendContactForm() {
    const fieldSet = {
      name: document.querySelector('.qh_module--inactive-form input[name=name]')
        .value,
      email_or_phone: document.querySelector(
        '.qh_module--inactive-form input[name=email_or_phone]'
      ).value,
      message: document.querySelector('textarea[name=message]').value,
    }
    this.service
      .sendContactForm(fieldSet)
      .then((response) => {
        document.querySelector('.contact-form').innerHTML = response
        this.initContactForm()
      })
      .catch((reason) => {
        console.log('reason', reason)
      })
  }

  /**
   * Sends start video chat form.
   */
  sendStartVideoChatForm() {
    const fieldSet = {
      name: document.querySelector('.qh_active-user-form__input[name=name]')
        .value,
      email_or_phone: document.querySelector(
        '.qh_active-user-form__input[name=email_or_phone]'
      ).value,
    }
    this.service
      .sendStartVideoChatForm(fieldSet)
      .then((response) => {
        document.querySelector('.qh_video-ui_replace').innerHTML = response
        const resultElement = this.uiGet('.qh_com-status')
        const status = resultElement.dataset.status
        const userId = resultElement.dataset.userid
        this.service.setUserId(userId)
        if (status === 'ok') {
            this.requestCall()
        } else {
          this.initStartVideoChatForm()
        }
      })
      .catch((reason) => {
        console.log('reason', reason)
      })
  }

  /**
   * Handles admin user.
   *
   * @param {object} adminUser
   */
  onAdmin(adminUser) {
    this.adminUser = adminUser
    const adminNameElement = this.uiGet('.active-user__admin-name')
    const firstName = adminUser.full_name.split(' ')[0]
    adminNameElement.innerHTML = firstName
  }

  setThumbnails(thumbnailPath) {
    const adminThumbnailElements = this.uiArray('.active-user-form__thumbnail')
    adminThumbnailElements.forEach((adminThumbnailElement) => {
      adminThumbnailElement.style.backgroundImage = `url(${this.service.consoleAppUrl}/media/${thumbnailPath})`
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
    this.element.classList.add('js-expanded')
  }

  /**
   * Collapses the view.
   *
   * @memberof WidgetExtensionView
   */
  collapseView() {
    this.isExpanded = false
    this.element.classList.remove('js-expanded')
    this.deactivateVideoMode()
  }

  /**
   * Enables video call UI when number if any admin is active.
   *
   * @param {boolean} anyOperatorActive
   * @memberof WidgetExtensionView
   */
  updateVideoCallUi(anyOperatorActive) {
    const activeOperatorElement = this.uiGet('.qh_module--active-operator')
    activeOperatorElement.classList.toggle('js-enabled', anyOperatorActive)
    const inactiveOperatorForm = this.uiGet('.qh_module--inactive-form')
    inactiveOperatorForm.classList.toggle('js-enabled', !anyOperatorActive)
    if (!anyOperatorActive) {
      this.activateCallDefaultStage()
    } else if (!this.videoMode) {
      this.activateActiveOperatorInitForm()
      this.bottomBarView.collapseView()
    }
  }

  /**
   * Requests a call.
   *
   * @memberof WidgetExtensionView
   */
  requestCall() {
    this.service.requestCall()
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
  onCallAccepted(roomId) {
    const urlElement = this.uiGet('meta[name=room_id]')
    urlElement.setAttribute('content', roomId)
    this.activateVideoChat()
  }

  deleteRoomId() {
    const urlElement = this.uiGet('meta[name=room_id]')
    urlElement.setAttribute('content', '')
  }

  /**
   * Handles call rejected event.
   *
   * @memberof WidgetExtensionView
   */
  onCallRejected() {
    this.collapseAndReinitActiveOperatorInitForm()
  }

  /**
   * Activates default video UI stage.
   *
   * @memberof WidgetExtensionView
   */
  activateCallDefaultStage() {
    this.deactivateAllStages()
    const stageElement = this.uiGet('.qh_module--inactive-form')
    stageElement.classList.add('js-enabled')
    this.deactivateVideoMode()
  }

  /**
   * Activates video call request UI stage.
   *
   * @memberof WidgetExtensionView
   */
  activateActiveOperatorInitForm() {
    this.deactivateAllStages()
    const stageElement = this.uiGet('.qh_submodule--init-form')
    stageElement.classList.add('js-enabled')
    this.initStartVideoChatForm()
  }

  /**
   * Activates the rate UX form submdule.
   *
   * @memberof WidgetExtensionView
   */
  activateRateUxForm() {
    this.deactivateAllStages()
    const stageElement = this.uiGet('.qh_submodule--rate-ux')
    stageElement.classList.add('js-enabled')
  }

  /**
   * Activates video chat.
   *
   * @memberof WidgetExtensionView
   */
  activateVideoChat() {
    this.deactivateAllStages()
    const stageElement = this.uiGet('.qh_submodule--video-chat')
    stageElement.classList.add('js-enabled')
    this.activateVideoMode()

    const joinButton = this.uiGet('.confirm-join-button')
    joinButton.addEventListener('click', () => {
      this.onJoinVideoChat()
    })

    const hangupButton = this.uiGet('.button--hangup')
    hangupButton.addEventListener('click', () => {
      this.onHangUpVideoChat()
    })
  }

  onJoinVideoChat() {}

  /**
   * Handles call close.
   */
  onHangUpVideoChat() {
    this.activateRateUxForm()
    this.activateVideoMode()
    this.deleteRoomId()
  }

  /**
   * Deactivates all submodules.
   *
   * @memberof WidgetExtensionView
   */
  deactivateAllStages() {
    const stageElements = this.uiArray('.qh_submodule')
    stageElements.forEach((stageElement) => {
      stageElement.classList.remove('js-enabled')
    })
    this.deactivateVideoMode()
  }

  /**
   * Sets bottom bar element.
   *
   * @param {WidgetExtensionView} extensionView
   */
  setBottomBar(bottomBarView) {
    this.bottomBarView = bottomBarView
  }

  /**
   * Activates video mode.
   *
   * @memberof WidgetExtensionView
   */
  activateVideoMode() {
    this.element.classList.add('qh_video-mode')
    this.videoMode = true  
  }

  /**
   * Deactivates video mode.
   *
   * @memberof WidgetExtensionView
   */
  deactivateVideoMode() {
    this.element.classList.remove('qh_video-mode')
    this.videoMode = false
    // remove connection data from videochat app
  }
}
