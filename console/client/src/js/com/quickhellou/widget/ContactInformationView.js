import { UIView } from '../../genb/base/controller/UIView'
import { HTMLUtils } from '../../genb/base/utils/HTMLUtils'

/**
 * Widget schedule meeting view.
 *
 * @export
 * @class ContactInformationView
 * @extends {UIView}
 */
export class ContactInformationView extends UIView {
  /**
   * Creates an instance of ContactInformationView.
   *
   * @param { WidgetService } service
   *
   * @memberof ContactInformationView
   */
  constructor(service) {
    super()
    this.service = service
    this.isExpanded = false
    this.element = document.querySelector('.contact-information')
    this.extDispatcher = window.parent.document.QHDispatcher
  }

  /**
   * Initializes the view.
   *
   * @memberof ContactInformationView
   */
  async init() {
    // nothing yet
  }

  /**
   * Initializes the view.
   *
   * @memberof ContactInformationView
   */
  async load(datetime) {
    await this.loadContactForm(datetime)
    this.initUI()
  }

  initUI() {
    const closeButton = document.querySelector(
      '.widget-closer--contact-information'
    )
    closeButton.addEventListener('click', () => {
      this.extDispatcher.dispatchEvent(new CustomEvent('collapse', {detail: {'source': 'contact_information'},}))
    })

    const backButtons = document.querySelectorAll('.contact-information__button--back')
    backButtons.forEach(backButton => {
      backButton.addEventListener('click', () => {
        this.extDispatcher.dispatchEvent(new CustomEvent('expand_schedule', {detail: {'source': 'contact_information'},}))
      })
    })

    const sendButtonClassName = '.contact-information__button--submit'
    if (this.uiExists(sendButtonClassName)) {
      HTMLUtils.removeAllEventListeners(sendButtonClassName)
      const submitButtonElement = this.uiGet(sendButtonClassName)
      submitButtonElement.addEventListener('click', () => {
        this.sendContactForm().then(() => {
          this.initUI()
        })
      })
    }
  }

  /**
   * Loads contact form view.
   *
   * @param {string} datetime
   * @returns
   */
  async loadContactForm(datetime) {
    return new Promise((resolve, reject) => {
      const fieldSet = {
        datetime: datetime,
      }

      this.service
        .getContactForm(fieldSet)
        .then((html) => {
          document.querySelector('.contact-information').innerHTML = html
          resolve()
        })
        .catch((reason) => {
          reject(reason)
        })
    })
  }

  /**
   * Sends contact form view.
   *
   * @param {string} datetime
   * @returns
   */
    async sendContactForm() {
      const formElement = document.querySelector('.contact-information__form')
      return new Promise((resolve, reject) => {
        const fieldSet = {
          datetime: formElement.querySelector('input[name=datetime]').value,
          name: formElement.querySelector('input[name=name]').value,
          email_address: formElement.querySelector('input[name=email_address]').value,
          phone_number: formElement.querySelector('input[name=phone_number]').value,
          message: formElement.querySelector('textarea[name=message]').value,
        }
  
        this.service
          .sendContactForm(fieldSet)
          .then((html) => {
            document.querySelector('.contact-information').innerHTML = html
            resolve()
          })
          .catch((reason) => {
            reject(reason)
          })
      })
    }
}
