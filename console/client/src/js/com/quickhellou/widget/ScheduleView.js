import { UIView } from '../../genb/base/controller/UIView'
import { Scheduler } from './Scheduler'

/**
 * Widget schedule meeting view.
 *
 * @export
 * @class ScheduleView
 * @extends {UIView}
 */
export class ScheduleView extends UIView {
  /**
   * Creates an instance of ScheduleView.
   *
   * @param { WidgetService } service
   *
   * @memberof ScheduleView
   */
   constructor(service) {
    super()
    this.service = service
    this.isExpanded = false
    this.element = document.querySelector('.widget--schedule')
    this.extDispatcher = window.parent.document.QHDispatcher
    this.scheduler = new Scheduler()
  }

  /**
   * Initializes the view.
   *
   * @memberof ScheduleView
  */
  async init() {

    const closeButton = document.querySelector('.qh_widget-closer--schedule')
    closeButton.addEventListener('click', (e) => {
      this.collapseView()
    })

    this.extDispatcher.addEventListener('expand_scheduler', () => {
      this.element.classList.add('js-expanded')
    }, false)

    const sendFormButton = document.querySelector('.widget-extension__button--send-schedule')
    sendFormButton.addEventListener('click', () => {
      this.sendForm()
    })
  }

  /**
   * Sends form.
   *
   * @memberof ScheduleView
   */
  sendForm() {
    const fieldSet = {
      datetime: document.querySelector('input[name=datetime]').value,
      email_or_phone: document.querySelector('input[name=email_or_phone]').value,
    }
    this.service
      .sendScheduleForm(fieldSet)
      .then((response) => {
        document.querySelector('.widget--schedule__content').innerHTML = response
      })
      .catch((reason) => {
        console.log('reason', reason)
      })
  }

  /**
   * Toggles the view.
   *
   * @memberof ScheduleView
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
   * @memberof ScheduleView
   */
  expandView() {
    this.isExpanded = true
    this.element.classList.add('js-expanded')
    this.scheduler.init()
  }

  /**
   * Collapses the view.
   *
   * @memberof ScheduleView
   */
  collapseView() {
    this.isExpanded = false
    this.element.classList.remove('js-expanded')
  }


}