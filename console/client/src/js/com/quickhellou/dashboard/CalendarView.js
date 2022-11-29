import { UIView } from '../../genb/base/controller/UIView'
import { ApiService } from '../base/services/ApiService'
import { ViewService } from '../base/services/ViewService'

export class CalendarView extends UIView {
  constructor() {
    super()
    this.apiService = new ApiService('')
    this.viewService = new ViewService()
  }

  async init() {
    this.initAddTimeRowControls()
    this.initDeleteTimeSlots()
    this.initTimeSelects()
  }

  initTimeSelects() {
    this.removeListeners('.calendar__select--hour')
    const hourSelectElements = document.querySelectorAll('.calendar__select--hour')
    hourSelectElements.forEach(hourSelectElement => {
      hourSelectElement.addEventListener('change', (e) => {
        this.updateTimeSelectInput()
      })
    })

    this.removeListeners('.calendar__select--minutes')
    const minutesSelectElements = document.querySelectorAll('.calendar__select--minutes')
    minutesSelectElements.forEach(minutesSelectElement => {
      minutesSelectElement.addEventListener('change', () => {
        this.updateTimeSelectInput()
      })
    })

    this.removeListeners('.calendar__select--time-abbreviation')
    const timeAbbreviationElements = document.querySelectorAll('.calendar__select--time-abbreviation')
    timeAbbreviationElements.forEach(timeAbbreviationElement => {
      timeAbbreviationElement.addEventListener('change', () => {
        this.updateTimeSelectInput()
      })
    })
  }

  initAddTimeRowControls() {
    const buttonElements = document.querySelectorAll('.calendar__button--time-break')
    buttonElements.forEach(buttonElement => {
      buttonElement.addEventListener('click', () => {
        const day = buttonElement.dataset.day
        const slotElement = document.querySelector(`div.time-row[data-day="${day}"]:last-child`)
        this.addTimeRow(buttonElement.dataset.day, Number(slotElement.dataset.index) + 1)
      })
    })
  }
  
  updateTimeSelectInput() {
    const elements = document.querySelectorAll('.calendar__time-slot')
    elements.forEach(element => {
      const id = element.dataset.id
      const day = element.dataset.day

      const inputElement = element.querySelector('input[name="date_time"]')
      
      const fromHour = element.querySelector(`select[data-id=from_hour_${id}]`).value
      const fromMinutes = element.querySelector(`select[data-id=from_minutes_${id}]`).value
      const fromTimeAbbreviation = element.querySelector(`select[data-id=from_timeabbr_${id}]`).value
      
      const toHour = element.querySelector(`select[data-id=to_hour_${id}]`).value
      const toMinutes = element.querySelector(`select[data-id=to_minutes_${id}]`).value
      const toTimeAbbreviation = element.querySelector(`select[data-id=to_timeabbr_${id}]`).value
      
      
      inputElement.value = `${day} ${fromHour}:${fromMinutes} ${fromTimeAbbreviation} ${toHour}:${toMinutes} ${toTimeAbbreviation}`
      console.log('xx', inputElement.value)
    })
  }

  initDeleteTimeSlots() {
    this.removeListeners('.calendar__button--delete-time-slot')
    const deleteTimeButtons = document.querySelectorAll('.calendar__button--delete-time-slot')
    deleteTimeButtons.forEach(deleteTimeButton => {
      deleteTimeButton.addEventListener('click', () => {
        deleteTimeButton.parentElement.parentElement.remove()
      })
    })
  }

  /**
   * Shows page loader.
   *
   * @memberof CalendarView
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
   * @memberof CalendarView
   */
  hidePageLoader() {
    const pageLoader = this.uiGet('.mdc-linear-progress--page')
    pageLoader.classList.remove('active')
    pageLoader.classList.remove('js-active')
  }

  addTimeRow(day, index) {
    const url = `/dashboard/calendar/time_row/${day}/${index}`
    this.apiService.postAsXMLHttpRequest({}, url).then(resultHtml => {
      document.querySelector(`.time-rows--${day}`).innerHTML += resultHtml
      this.initDeleteTimeSlots()
      this.initTimeSelects()
    })
  }
}
