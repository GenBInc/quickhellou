import { UIView } from '../../genb/base/controller/UIView'
import { ApiService } from '../base/services/ApiService'
import { ViewService } from '../base/services/ViewService'

export class CalendarView extends UIView {

  static MAX_SLOTS_PER_DAY = 5

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

  /**
   * Initializes form submit.
   *
   * @memberof CalendarView
   */
  initSubmit() {
    const submitButton = document.querySelector('.calendar__button--submit')
    submitButton.addEventListener('click', () => {
      const form = document.querySelector('form.form--save')
      
      // Drop all form fields
      const formInputs = form.querySelectorAll('input.input--data')
      formInputs.forEach(formInput => {
        formInput.remove()
      })

      // Insert time interval
      form.insertAdjacentHTML('beforeend', `<input class="input--data" type="hidden" name="time_interval" value="${document.querySelector('select[name=time_interval]').value}">`)
      
      // Insert day fields
      const days = this.updateTimeSelectInput()
      for (const [dayCode, time] of Object.entries(days)) {
        form.insertAdjacentHTML('beforeend', `<input class="input--data" type="hidden" name="${dayCode}" value="${time}">`)
      }
      
      // Insert day checkboxes
      const dayCheckboxes = document.querySelectorAll('input.calendar__checkbox--day')
      dayCheckboxes.forEach(checkbox => {
        form.insertAdjacentHTML('beforeend', `<input class="input--data" type="hidden" name="${checkbox.name}" value="${checkbox.checked ? 'True' : 'False'}">`)
      })

      // Submit form
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

  /**
   * Initializes time slot controls.
   */
  initAddTimeRowControls() {
    this.removeListListeners('.calendar__button--time-break')
    const buttonElements = document.querySelectorAll('.calendar__button--time-break')
    buttonElements.forEach(buttonElement => {
      buttonElement.addEventListener('click', () => {
        //if (!this.isMaxSlotsExceeded(buttonElement.dataset.day)) {
          this.addTimeSlot(buttonElement.dataset.day)
        //}
      })
    })
  }
  
  updateTimeSelectInput() {
    const daySlotElements = document.querySelectorAll('.calendar__day-slot')
    let data = []
    
    daySlotElements.forEach(daySlotElement => {
      const isChecked = daySlotElement.querySelector('input.calendar__checkbox--day').checked
      if (!isChecked) {
        return
      }
      const timeRowElements = daySlotElement.querySelectorAll('.time-row:not(.hidden):not(.js-hidden)')
      timeRowElements.forEach(element => {
        const id = element.dataset.id

        const fromHour = element.querySelector(`select[data-id=from_hour_${id}]`).value
        const fromMinutes = element.querySelector(`select[data-id=from_minutes_${id}]`).value
        const fromTimeAbbreviation = element.querySelector(`select[data-id=from_timeabbr_${id}]`).value.toUpperCase()

        const toHour = element.querySelector(`select[data-id=to_hour_${id}]`).value
        const toMinutes = element.querySelector(`select[data-id=to_minutes_${id}]`).value
        const toTimeAbbreviationElement = element.querySelector(`select[data-id=to_timeabbr_${id}]`)
        const toTimeAbbreviation = toTimeAbbreviationElement.value.toUpperCase()
        
        data[id] = `${daySlotElement.dataset.daycode} ${fromHour}:${fromMinutes} ${fromTimeAbbreviation} ${toHour}:${toMinutes} ${toTimeAbbreviation}`
      })
    })
    return data
  }

  initDeleteTimeSlots() {
    this.removeListListeners('.calendar__button--delete-time-slot')
    const deleteTimeButtons = document.querySelectorAll('.calendar__button--delete-time-slot')
    deleteTimeButtons.forEach(deleteTimeButton => {
      deleteTimeButton.addEventListener('click', () => {
        const timeSlotElement = document.querySelector(`.time-row--additional[data-id="${deleteTimeButton.dataset.id}"]`)
        timeSlotElement.classList.add('js-hidden')
        const inputElement = document.querySelector(`input[name='${deleteTimeButton.dataset.id}'`)
        inputElement.value = ''
        this.updateTimeSelectInput()
        this.updateAddSlotButtonAvailability()
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

  /**
   * Adds time slot.
   *  
   * @param {string} day the name of day 
   */
  __addTimeSlot__(day) {
    const url = `/dashboard/calendar/time_row/${day}/${this.__getTimeSlotIndex__(day)}`
    this.apiService.postAsXMLHttpRequest({}, url).then(resultHtml => {
      document.querySelector(`.time-rows--${day}`).innerHTML += resultHtml
      this.initDeleteTimeSlots()
      this.initTimeSelects()
      this.initAddTimeRowControls()
      this.updateTimeSelectInput()
      this.updateAddSlotButtonAvailability()
    })
  }

  addTimeSlot(day) {
    this.updateTimeSlotAvailability(day)
    
    this.updateTimeSelectInput()
    this.updateAddSlotButtonAvailability()
  }

  updateTimeSlotAvailability(day) {
    const allIndices = [2, 3, 4, 5]
    const indices = []
    const timeSlotElements = document.querySelectorAll(`.time-rows--${day} .time-row--additional:not(.hidden):not(.js-hidden)`)
    timeSlotElements.forEach(timeSlotElement => {
      indices.push(Number(timeSlotElement.dataset.index))
    })

    let unique1 = allIndices.filter((o) => indices.indexOf(o) === -1)
    let unique2 = indices.filter((o) => allIndices.indexOf(o) === -1)
    const unique = unique1.concat(unique2)
    
    const timeSlotElement = document.querySelector(`.time-rows--${day} .time-row--additional[data-index="${unique[0]}"]`)
    timeSlotElement.classList.remove('hidden', 'js-hidden')

    return unique[0]
  }

  __getTimeSlotIndex__(day) {
    const allIndices = [1, 2, 3, 4, 5]
    const indices = []
    const timeSlotElements = document.querySelectorAll(`.time-rows--${day} .calendar__time-slot`)
    timeSlotElements.forEach(timeSlotElement => {
      indices.push(Number(timeSlotElement.dataset.index))
    })
    let unique1 = allIndices.filter((o) => indices.indexOf(o) === -1)
    let unique2 = indices.filter((o) => allIndices.indexOf(o) === -1)
  
    const unique = unique1.concat(unique2)
    return unique[0]
  }

  /**
   * Gets number of associated with a given day slot.
   * 
   * @param {string} day 
   * @returns the number of slots 
   */
  getNumberOfAddedSlots(day) {
    return document.querySelectorAll(`.time-rows--${day} .time-row--additional:not(.hidden):not(.js-hidden)`).length
  }

  /**
   * Checks if maximum number of slot has been exceeded. 
   * 
   * @param {string} day 
   * @returns true if number of slots has exceeded the maximum
   */
  isMaxSlotsExceeded(day) {
    return this.getNumberOfAddedSlots(day) >= CalendarView.MAX_SLOTS_PER_DAY - 1
  }

  /**
   * Checks if number of slot is equal to maximum.
   * 
   * @param {string} day 
   * @returns if number of number of slots is equal maximum
   */
  isNumberOfSlotsEqualsLimit(day) {
    return this.getNumberOfAddedSlots(day) === CalendarView.MAX_SLOTS_PER_DAY - 1
  }
  
  /**
   * Updates add slot availability.
   */
  updateAddSlotButtonAvailability() {
    const buttonElements = document.querySelectorAll('.calendar__button--time-break')
    buttonElements.forEach(buttonElement => {
      buttonElement.classList.toggle('js-disabled', this.isNumberOfSlotsEqualsLimit(buttonElement.dataset.day))
    })
  }
}
