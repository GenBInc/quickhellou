import { UIView } from '../../genb/base/controller/UIView'
import { ToggleButton } from '../../genb/base/components/ToggleButton'
import { RadioButtonsGroup } from '../../genb/base/components/RadioButtonsGroup'

/**
 * Widget scheduler.
 *
 * @export
 * @class ScheduleView
 * @extends {UIView}
 */
export class Scheduler extends UIView {
  /**
   * Creates an instance of Scheduler.
   * 
   * @param { WidgetService } service
   *
   * @memberof Scheduler
   */
  constructor(service) {
      super()
      this.service = service
      this.element = document.querySelector('.widget--schedule__scheduler')

      this.currentPage = 0
  }

  /**
   * Initializes the scheduler.
   *
   * @memberof Scheduler
  */
  async init() {
    await this.loadCalendar()
    this.pages = document.querySelectorAll('.scheduler__page').length
    const nextPageButton = document.querySelector('.scheduler__pages-nav-button--next')
    nextPageButton.addEventListener('click', () => {
      if (this.currentPage < this.pages-1) {
        this.moveToPage(++this.currentPage)
      }
    })
    const prevPageButton = document.querySelector('.scheduler__pages-nav-button--prev')
    prevPageButton.addEventListener('click', () => {
      if (this.currentPage > 0) {
        this.moveToPage(--this.currentPage)
      }
    })
    this.updatePageNavigation()
    this.initDatetimeFields()
  }
  
  moveToPage(page) {
    const pagesElement = document.querySelector('.scheduler__pages')
    pagesElement.style.transform = `translate(-${page * 100}%)`
    this.updatePageNavigation()
  }

  updatePageNavigation() {
    const nextPageButton = document.querySelector('.scheduler__pages-nav-button--next')
    const prevPageButton = document.querySelector('.scheduler__pages-nav-button--prev')
    
    nextPageButton.classList.remove('js-hidden')
    prevPageButton.classList.remove('js-hidden')
    
    if (this.currentPage === 0) {
      prevPageButton.classList.add('js-hidden')
    }

    if (this.currentPage === this.pages - 1) {
      nextPageButton.classList.add('js-hidden')
    }
  }

  /**
   * Builds the component template.
   *
   * @memberof Scheduler
  */
  initDatetimeFields() {
    const radioGroup = new RadioButtonsGroup()
    
    const timeButtonElements = document.querySelectorAll('.scheduler__button--time')
    timeButtonElements.forEach(timeButtonElement => {
      const button = new ToggleButton(timeButtonElement)
      radioGroup.addRadioButton(button)
      timeButtonElement.addEventListener('click', () => {
        this.handleTimeButtonToggle(timeButtonElement.dataset.time)
      }, false)
    })
  }

  /**
   * Handles time button change.
   *
   * @param {*} time
   * @memberof Scheduler
   */
  handleTimeButtonToggle(time) {
    const datetimeInput = document.querySelector('input[name=datetime]')
    datetimeInput.value = time
    const submitButton = document.querySelector(
      '.widget-extension__button--send-schedule'
    )
    submitButton.classList.remove('disabled')
  }

  /**
   * Loads scheduler calendar view.
   * 
   * @param {number} 
   */
  async loadCalendar() {
    return new Promise((resolve, reject) => {
      const fieldSet = {
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      }
      this.service.getSchedulerCalendar(fieldSet).then((html) => {
        document.querySelector('.widget--schedule__datetime-controls').innerHTML = html
        resolve()
      }).catch(reason => {
        reject(reason)
      })
    })
  }

}