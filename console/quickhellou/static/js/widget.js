import { WidgetService } from './com/quickhellou/widget/WidgetService'
import { WidgetView } from './com/quickhellou/widget/WidgetView'
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
    const widgetView = new WidgetView(widgetService)
    widgetView.init()
    const widgetExtView = new WidgetExtensionView(widgetService)
    widgetExtView.init()
    widgetView.setExtension(widgetExtView)
    // init
    document.querySelector('.qh-root').classList.add('active')
  })
  .catch((reason) => {
    document.querySelector('.qh-root').style.opacity = 1
    document.querySelector('.qh-root').innerHTML = reason
  })
