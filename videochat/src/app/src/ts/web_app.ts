import '../scss/web_app.scss'

import { HTMLUtils } from './com/genb/base/utils/HTMLUtils'
import { Log } from './com/genb/base/utils/Log'
import { StringUtils } from './com/genb/base/utils/StringUtils'
import { AppController } from './com/quickhellou/AppController'
import { AppControllerEvent } from './com/quickhellou/AppControllerEvent'

import 'expose-loader?exposes=videochat!./ComProxy'

Log.setEnvironment(environment)
Log.log(
  `Quick Hellou v. ${version} ${environment} build (webrtc-adapter v. 8.1.0)`
)

window.addEventListener('load', (): void => {
  const roomIdElement = document.querySelector('meta[name="room_id"]')
  if (roomIdElement !== null) {
    const roomId = roomIdElement.getAttribute('content')
    if (StringUtils.isNotEmpty(roomId)) {
      init(roomId, getInitType(), getVideoAppUrl())
    } else {
      setTimeout(reinit, 1000)
    }
  } else {
    Log.warn('No room parameter.')
  }
})

const init = (roomId: string, initType: string, videoAppUrl: string) => {
  const appController: AppController = new AppController(
    roomId,
    initType,
    videoAppUrl
  )
  appController.addEventListener(
    AppControllerEvent.INITIALIZED,
    (): void => {
      const main: HTMLElement = HTMLUtils.get('div.main')
      main.classList.add('js-visible')

      // remove loader after when the main element is visible
      setTimeout((): void => {
        const loader: HTMLElement = HTMLUtils.get('div.loader')
        loader.remove()
      }, 1000)

      // service workers facade
      // new ServiceWorkers()
    },
    this
  )
  appController.init()
}

const reinit = () => {
  const roomId = document
    .querySelector('meta[name="room_id"]')
    .getAttribute('content')
  if (StringUtils.isNotEmpty(roomId)) {
    init(roomId, getInitType(), getVideoAppUrl())
  } else {
    setTimeout(() => reinit(), 2000)
  }
}

const getInitType = () => {
  const metaInitType = document.querySelector('meta[name="init"]')
  const urlParams = new URLSearchParams(window.location.search)
  const initType = urlParams.get('init')
  if (initType !== null) {
    return initType
  }

  if (metaInitType !== null) {
    return metaInitType.getAttribute('content')
  }

  return ''
}

const getVideoAppUrl = () => {
  const metaVideoAppUrl = document.querySelector('meta[name="video_app_url"]')
  if (metaVideoAppUrl !== null) {
    return metaVideoAppUrl.getAttribute('content')
  }

  return ''
}
