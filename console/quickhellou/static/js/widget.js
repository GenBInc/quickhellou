import { WidgetService } from './com/quickhellou/widget/WidgetService'
import { WidgetView } from './com/quickhellou/widget/WidgetView'
import { WidgetExtensionView } from './com/quickhellou/widget/WidgetExtensionView'
import { WidgetBottomBarView } from './com/quickhellou/widget/WidgetBottomBarView'

// data
const consoleAppUrl = document.querySelector('.qh-root').dataset.url
const widgetId = document.querySelector('.qh-root').dataset.id
// service
const widgetService = new WidgetService(consoleAppUrl, widgetId)
widgetService
  .init()
  .then(() => {
    // views
    const widgetBadgeView = new WidgetView(widgetService)
    const widgetExtView = new WidgetExtensionView(widgetService)
    widgetBadgeView.setExtension(widgetExtView)
    const widgetBottomBarView = new WidgetBottomBarView(widgetService)
    widgetBottomBarView.setExtension(widgetExtView)
    widgetBottomBarView.setBadge(widgetBadgeView)
    widgetExtView.setBottomBar(widgetBottomBarView)
    widgetBadgeView.setBottomBar(widgetBottomBarView)
    // init widget modules
    widgetBadgeView.init()
    widgetExtView.init()
    widgetBottomBarView.init()

    // init
    document.querySelector('.qh-root').classList.add('active')
  })
  .catch((reason) => {
    document.querySelector('.qh-root').style.opacity = 1
    document.querySelector('.qh-root').innerHTML = reason
  })
