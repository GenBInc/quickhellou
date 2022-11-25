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
   *
   * @memberof Scheduler
   */
  constructor() {
      super()
      this.element = document.querySelector('.widget--schedule__scheduler')

      // sample data
      this.data = [
      {
        date: '2022-11-28',
        day: 'Monday',
        name: 'Nov 28',
        time: [
          '8:30 AM', '9:00 AM', '9:30 AM', '10:00 AM', '10:30 AM'
        ],
      }, {
        date: '2022-11-29',
        day: 'Tuesday',
        name: 'Nov 29',
        time: [
          '8:30 AM', '9:00 AM', '10:00 AM'
        ],
      }, {
        date: '2022-11-30',
        day: 'Wednesday',
        name: 'Nov 30',
        time: [
          '11:30 AM', '13:00 AM', '13:30 AM'
        ],
      }, {
        date: '2022-11-28',
        day: 'Thursday',
        name: 'Dec 1',
        time: [
          '11:30 AM', '13:00 AM', '13:30 AM'
        ],
      }, {
        date: '2022-11-29',
        day: 'Friday',
        name: 'Dec 2',
        time: [
          '11:30 AM', '13:00 AM', '13:30 AM'
        ],
      },
    ]
  }

  /**
   * Initializes the scheduler.
   *
   * @memberof Scheduler
  */
  async init() {
    this.build(this.data)
  }

  /**
   * Builds the component template.
   *
   * @memberof Scheduler
  */
  build(dates) {
    let template = `<div class="flc scheduler__controls">`
    
    dates.forEach(day => {
      template = template.concat(this.buildDay(day))
    })

    template = template.concat('</div>')
    
    this.element.innerHTML = template
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
    console.log(time)
  }

  buildTime(time) {
    return `
      <div class="fc scheduler__button scheduler__button--time scheduler__time" data-time="${time}">
        <span class="scheduler__button-text">${time}</span>
      </div>
    `
  }

  buildDay(row) {
    let template = `<div class="fct scheduler__day">
      <div class="fcol scheduler__day-header">
        <span class="scheduler__day-text scheduler__day-name">${row.day}</span>
        <span class="scheduler__day-text">${row.name}</span>
      </div>
    `

    row.time.forEach(time => {
      template = template.concat(this.buildTime(time))
    })

    template = template.concat('</div>')
    return template
  }
}