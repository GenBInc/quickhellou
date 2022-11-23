import { WidgetService } from './com/quickhellou/widget/WidgetService'
import { WidgetEmbedView } from './com/quickhellou/widget/WidgetEmbedView'

// Initialize event target that will proxy all iframe event handlers
window.document.QHDispatcher = new EventTarget()

document.addEventListener("readystatechange", () => {
  const consoleAppUrl = document.querySelector('iframe#qh_iframe').dataset.url
  const widgetId = document.querySelector('iframe#qh_iframe').dataset.id
  // service
  const widgetService = new WidgetService(consoleAppUrl, widgetId)
  widgetService
    .init()
    .then(() => {
      const embedView = new WidgetEmbedView(widgetService)
      embedView.init(window.document.QHDispatcher)
    })
    .catch((reason) => {
      console.log('QuickHellou failure: ', reason)
    })
})