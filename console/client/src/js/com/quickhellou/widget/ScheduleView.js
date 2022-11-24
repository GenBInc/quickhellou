import { UIView } from '../../genb/base/controller/UIView'

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

    const dateElement = document.querySelector('.widget--scheduler__date') 
    flatpickr(dateElement, {
      inline: true,
      minDate: 'today',
      dateFormat: 'Y-m-d',
      altInputClass : 'invisible',
    })

    const timeElement = document.querySelector('.widget--scheduler__time') 
    flatpickr(timeElement, {
      inline: true,
      enableTime: true,
      noCalendar: true,
      dateFormat: "H:i",
      minTime: "16:00",
      maxTime: "22:30",
      altInputClass : 'invisible'
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