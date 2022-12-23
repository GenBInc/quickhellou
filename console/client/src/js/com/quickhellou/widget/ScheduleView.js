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
    this.scheduler = new Scheduler(this.service)
  }

  /**
   * Initializes the view.
   *
   * @memberof ScheduleView
   */
  async init() {
    const closeButton = document.querySelector('.qh_widget-closer')
    closeButton.addEventListener('click', () => {
      this.extDispatcher.dispatchEvent(
        new CustomEvent('collapse', {
          detail: {
            'source': 'schedule',
          },
        })
      )

    })

    const submitButton = document.querySelector(
      '.widget-extension__button--send-schedule'
    )
    submitButton.addEventListener('click', () => {
      let datetime = ''
      const selectedScheduleTimeElement = document.querySelector('.scheduler__time.js-enabled')
      if (!!selectedScheduleTimeElement) {
        datetime = document.querySelector('.scheduler__time.js-enabled')
        .dataset.time
      }
      if (!selectedScheduleTimeElement) {
        return
      }
      
      this.extDispatcher.dispatchEvent(
        new CustomEvent('expand_contact', {
          detail: {
            'source': 'schedule',
            'datetime': datetime
          },
        })
      )
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
