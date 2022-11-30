import { UIView } from '../../genb/base/controller/UIView'
import { ApiService } from '../base/services/ApiService'
import { ViewService } from '../base/services/ViewService'

export class CalendarView extends UIView {
  constructor() {
    super()
    this.apiService = new ApiService('')
    this.viewService = new ViewService()
    this.timeRowCounter = 1
  }

  async init() {
    this.initAddTimeRowControls()
    this.initDeleteTimeSlots()
    this.initTimeSelects()
    this.initSubmit()
  }

  initSubmit() {
    const submitButton = document.querySelector('.calendar__button--submit')
    submitButton.addEventListener('click', () => {
      const form = document.querySelector('form.form--save')
      const formInputs = form.querySelectorAll('input.input--data')
      formInputs.forEach(formInput => {
        formInput.remove()
      })
      const days = this.updateTimeSelectInput()
      
      for (const [dayCode, day] of Object.entries(days)) {
        day.forEach(dateTime => {
          form.insertAdjacentHTML('beforeend', `<input class="input--data" type="hidden" name="day${dayCode}" value="${dateTime}">`)
        })
      }
      form.submit()
    })
  }

  initTimeSelects() {
    this.removeListListeners('.calendar__select--hour')
    const hourSelectElements = document.querySelectorAll('.calendar__select--hour')
    hourSelectElements.forEach(hourSelectElement => {
      hourSelectElement.addEventListener('change', () => {
        this.updateTimeSelectInput()
      })
    })

    this.removeListListeners('.calendar__select--minutes')
    const minutesSelectElements = document.querySelectorAll('.calendar__select--minutes')
    minutesSelectElements.forEach(minutesSelectElement => {
      minutesSelectElement.addEventListener('change', () => {
        this.updateTimeSelectInput()
      })
    })

    this.removeListListeners('.calendar__select--time-abbreviation')
    const timeAbbreviationElements = document.querySelectorAll('.calendar__select--time-abbreviation')
    timeAbbreviationElements.forEach(timeAbbreviationElement => {
      timeAbbreviationElement.addEventListener('change', () => {
        this.updateTimeSelectInput()
      })
    })
  }

  initAddTimeRowControls() {
    this.removeListListeners('.calendar__button--time-break')
    const buttonElements = document.querySelectorAll('.calendar__button--time-break')
    buttonElements.forEach(buttonElement => {
      buttonElement.addEventListener('click', () => {
        this.addTimeRow(buttonElement.dataset.day, ++this.timeRowCounter)
      })
    })
  }
  
  updateTimeSelectInput() {
    const daySlotElements = document.querySelectorAll('.calendar__day-slot')
    let data = []
    
    daySlotElements.forEach(daySlotElement => {
      const isChecked = daySlotElement.querySelector('input.day_checkbox').checked
      if (!isChecked) {
        return
      }
      const dayCode = daySlotElement.dataset.daycode
      const timeRowElements = daySlotElement.querySelectorAll('.calendar__time-slot')
      timeRowElements.forEach(element => {
        const id = element.dataset.id

        const fromHour = element.querySelector(`select[data-id=from_hour_${id}]`).value
        const fromMinutes = element.querySelector(`select[data-id=from_minutes_${id}]`).value
        const fromTimeAbbreviation = element.querySelector(`select[data-id=from_timeabbr_${id}]`).value.toUpperCase()

        const toHour = element.querySelector(`select[data-id=to_hour_${id}]`).value
        const toMinutes = element.querySelector(`select[data-id=to_minutes_${id}]`).value
        const toTimeAbbreviationElement = element.querySelector(`select[data-id=to_timeabbr_${id}]`)
        const toTimeAbbreviation = toTimeAbbreviationElement.value.toUpperCase()
        
        const isFromTimeAbbreviationPM = fromTimeAbbreviation === 'PM'
        if (isFromTimeAbbreviationPM) {
          toTimeAbbreviationElement.value = 'pm'
          toTimeAbbreviationElement.setAttribute('disabled', 'disabled')
        }
        if (!isFromTimeAbbreviationPM) {
          toTimeAbbreviationElement.removeAttribute('disabled')
        }
        
        if (!data[dayCode]) {
          data[dayCode] = []
        }
        data[dayCode].push(`${dayCode} ${fromHour}:${fromMinutes} ${fromTimeAbbreviation} ${toHour}:${toMinutes} ${toTimeAbbreviation}`)
      })
    })
    return data
  }

  initDeleteTimeSlots() {
    this.removeListListeners('.calendar__button--delete-time-slot')
    const deleteTimeButtons = document.querySelectorAll('.calendar__button--delete-time-slot')
    deleteTimeButtons.forEach(deleteTimeButton => {
      deleteTimeButton.addEventListener('click', () => {
        deleteTimeButton.parentElement.parentElement.parentElement.remove()
        this.updateTimeSelectInput()
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
      this.initAddTimeRowControls()
      this.updateTimeSelectInput()
    })
  }
}
