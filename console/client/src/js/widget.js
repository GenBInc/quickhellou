/**
 * Widget views root application.
*/

import { WidgetService } from './com/quickhellou/widget/WidgetService'
import { BadgeView } from './com/quickhellou/widget/BadgeView'
import { ScheduleView } from './com/quickhellou/widget/ScheduleView'
import { WidgetExtensionView } from './com/quickhellou/widget/WidgetExtensionView'
import { ContactInformationView } from './com/quickhellou/widget/ContactInformationView'

// data
const consoleAppUrl = document.querySelector('.qh-root').dataset.url
const widgetId = document.querySelector('.qh-root').dataset.id
// service
const widgetService = new WidgetService(consoleAppUrl, widgetId)
widgetService
  .init()
  .then(() => {
    // views
    const badgeView = new BadgeView(widgetService)
    const extView = new WidgetExtensionView(widgetService)
    const scheduleView = new ScheduleView(widgetService)
    const contactInformationView = new ContactInformationView(widgetService)
    const extDispatcher = window.parent.document.QHDispatcher

    // event handlers
    extDispatcher.addEventListener('collapse', () => {
      scheduleView.collapseView()
      extView.collapseView()
    }, false)
    extDispatcher.addEventListener('expand_contact', (event) => {
      extView.expandView()
      scheduleView.collapseView()
      contactInformationView.load(event.detail.datetime)
    }, false)
    extDispatcher.addEventListener('expand_schedule', () => {
      scheduleView.expandView()
      extView.collapseView()
    }, false)
    extDispatcher.addEventListener('setThumbnail', (path) => {
      extView.setThumbnails(path)
    }, false)
    
    // init widget modules
    badgeView.init()
    extView.init()
    scheduleView.init()
    contactInformationView.init()

    // init
    document.querySelector('.qh-root').classList.add('active')
  })
  .catch((reason) => {
    document.querySelector('.qh-root').style.opacity = 1
    document.querySelector('.qh-root').classList.add('failure')
    document.querySelector('.qh-root').innerHTML = reason
  })
