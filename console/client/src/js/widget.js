import { WidgetService } from './com/quickhellou/widget/WidgetService'
import { BadgeView } from './com/quickhellou/widget/BadgeView'
import { ScheduleView } from './com/quickhellou/widget/ScheduleView'
import { WidgetExtensionView } from './com/quickhellou/widget/WidgetExtensionView'

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
    const extDispatcher = window.parent.document.QHDispatcher

    // event handlers
    extDispatcher.addEventListener('collapse', () => {
      // bottomBarView.collapseView()
    }, false)
    extDispatcher.addEventListener('expand_schedule', () => {
      scheduleView.expandView()
    }, false)
    extDispatcher.addEventListener('setThumbnail', (path) => {
      extView.setThumbnails(path)
    }, false)
    // init widget modules
    badgeView.init()
    extView.init()
    scheduleView.init()

    // init
    document.querySelector('.qh-root').classList.add('active')
  })
  .catch((reason) => {
    document.querySelector('.qh-root').style.opacity = 1
    document.querySelector('.qh-root').innerHTML = reason
  })
