import { WidgetService } from './com/quickhellou/widget/WidgetService'
import { BadgeView } from './com/quickhellou/widget/BadgeView'
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
    const badgeView = new BadgeView(widgetService)
    const extView = new WidgetExtensionView(widgetService)
    const extDispatcher = window.document.QHDispatcher
    //const bottomBarView = new WidgetBottomBarView(widgetService)
    // event handlers
    extDispatcher.addListener('collapse', () => {
      // bottomBarView.collapseView()
    })
    extDispatcher.addListener('collapse', () => {
      extView.toggleView()
      //bottomBarView.collapseView()
    })
    extDispatcher.addListener('setThumbnail', (path) => {
      extView.setThumbnails(path)
    })
    /*bottomBarView.addListener('toggleBadgeTopState', (force) => {
      badgeView.toggleTopState(force)
    })
    bottomBarView.addListener('expandExtView', () => {
      extView.expandView()
    })*/
    // init widget modules
    badgeView.init()
    extView.init()
    // bottomBarView.init()

    // init
    document.querySelector('.qh-root').classList.add('active')
  })
  .catch((reason) => {
    document.querySelector('.qh-root').style.opacity = 1
    document.querySelector('.qh-root').innerHTML = reason
  })
