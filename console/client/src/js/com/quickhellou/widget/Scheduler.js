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

      this.currentPage = 0

      // sample data
      this.data = [
      {
        info: 'Today',
        date: '2022-11-28',
        day: 'Monday',
        name: 'Nov 28',
        time: [
          '8:00 AM', '8:30 AM', '9:00 AM', '9:30 AM', '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM', '12:00 PM', '12:30 PM', '1:00 PM', '1:30 PM', '2:00 PM', '2:30 PM', '3:00 PM', '3:30 PM'
        ],
      }, {
        info: 'Tommorrow',
        date: '2022-11-29',
        day: 'Tuesday',
        name: 'Nov 29',
        time: [
          '8:30 AM', '9:00 AM', '10:00 AM'
        ],
      }, {
        info: '',
        date: '2022-11-30',
        day: 'Wednesday',
        name: 'Nov 30',
        time: [
          '11:30 AM', '13:00 AM', '13:30 AM'
        ],
      }, {
        info: '',
        date: '2022-12-01',
        day: 'Thursday',
        name: 'Dec 1',
        time: [
          '11:30 AM', '13:00 AM', '13:30 AM'
        ],
      }, {
        info: '',
        date: '2022-12-02',
        day: 'Friday',
        name: 'Dec 2',
        time: [
          '11:30 AM', '13:00 AM', '13:30 AM', '15:30 AM'
        ],
      }, {
        info: '',
        date: '2022-12-05',
        day: 'Monday',
        name: 'Dec 5',
        time: [
          '9:00 AM', '13:00 AM', '13:30 AM', '15:30 AM'
        ],
      }, {
        info: '',
        date: '2022-12-06',
        day: 'Tuesday',
        name: 'Dec 6',
        time: [
          '10:00 AM', '14:00 AM', '14:30 AM'
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
    this.build(this.data)
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
  build(dates) {
    /*let template = `<div class="flc scheduler__pages">`
    
    const size = 5
    const chunks = this.chunk(dates, size)
    
    chunks.forEach(chunk => {
      template += `
        <div class="flc scheduler__page">
          <div class="flc scheduler__page-table scheduler__page-headers">`
      chunk.forEach(day => {
        template += this.buildDayHeader(day)
      })
      template += `
        </div>
        <div class="fcol fct scheduler__page-table scheduler__page-buttons">
        `
      chunk.forEach(day => {
        template += this.buildDay(day)
      })
      template += '</div>'
    })

    template += '</div>'
    
    this.element.innerHTML = template*/
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
  }

  buildTimeButton(date, time) {
    return `
      <div class="fc scheduler__button scheduler__button--time scheduler__time" data-time="${date} ${time}">
        <span class="scheduler__button-text">${time}</span>
      </div>
    `
  }

  buildDayHeader(row) {
    return `
    <div class="f1 fcol scheduler__day">
      <div class="f1 fcol scheduler__day-header">
        <span class="fc scheduler__day-info">${row.info}</span>
        <div class="fcol scheduler__day-header">
          <span class="scheduler__day-text scheduler__day-name">${row.day}</span>
          <span class="scheduler__day-text">${row.name}</span>
        </div>
      </div>
    </div>
    `
  }

  buildDay(row) {
    let template = ''
    row.time.forEach(time => {
      template += this.buildTimeButton(row.date, time)
    })
    return template
  }

  /**
   * Array partition.
   *
   * @param {Array} array source array
   * @param {number} size size of chunk
   * @returns the partitions
   * 
   * @memberof Scheduler
   */
  chunk(array, size) {
    // This prevents infinite loops
    const result = []
    for (let i = 0; i < array.length; i += size) {
      result.push(array.slice(i, i + size))
    }
    return result
  }

}