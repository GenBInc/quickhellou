import { MDCList } from '@material/list'
import { MDCTopAppBar } from '@material/top-app-bar/index'
import { MDCTextField } from '@material/textfield'
import { MDCSelect } from '@material/select'
import { MDCSnackbar } from '@material/snackbar'
import { MDCFormField } from '@material/form-field'
import { MDCCheckbox } from '@material/checkbox'
import { MDCRadio } from '@material/radio'
import { QhUtils } from './com/quickhellou/base/utils/QhUtils'
import { DashboardView } from './com/quickhellou/dashboard/DashboardView'
import { WidgetView } from './com/quickhellou/dashboard/WidgetView'
import { CallsView } from './com/quickhellou/dashboard/CallsView'

export function initUrlInput(formQuerySelector) {
  const urlNoHTTPInputElement = document.querySelector(
    "input[name='callpage_url_no_http']"
  )
  if (urlNoHTTPInputElement) {
    const urlInputElement = document.querySelector(
      'input.form__input--callpage-url'
    )
    urlInputElement.value = urlInputElement.value.replace('http://', '')
    const urlFormInputElement = document.querySelector(
      "input[name='callpage_url']"
    )
    const form = document.querySelector(`form${formQuerySelector}`)
    form.addEventListener('submit', () => {
      urlNoHTTPInputElement.value = urlInputElement.value
      urlFormInputElement.value = 'http://' + urlInputElement.value
      return true
    })
  }
}

function initPhone() {}

document.addEventListener('DOMContentLoaded', () => {
  const list = MDCList.attachTo(document.querySelector('.mdc-list'))
  list.wrapFocus = true

  const topAppBarElement = document.querySelector('.mdc-top-app-bar')
  if (topAppBarElement) {
    MDCTopAppBar.attachTo(topAppBarElement)
  }
  const inputElements = Array.from(document.querySelectorAll('.mdc-text-field'))
  inputElements.forEach((inputElement) => {
    MDCTextField.attachTo(inputElement)
  })

  const checkboxElements = Array.from(
    document.querySelectorAll('.mdc-checkbox')
  )
  checkboxElements.forEach((checkboxElement) => {
    MDCCheckbox.attachTo(checkboxElement)
  })

  const formFieldElements = Array.from(
    document.querySelectorAll('.mdc-form-field')
  )
  formFieldElements.forEach((formFieldElement) => {
    MDCFormField.attachTo(formFieldElement)
  })

  const radioElement = document.querySelector('.mdc-radio')
  if (radioElement) {
    MDCRadio.attachTo(radioElement)
  }

  const radioFormFieldElements = Array.from(
    document.querySelectorAll('.mdc-form-field--radio-buttons')
  )
  radioFormFieldElements.forEach((radioFormFieldElement) => {
    radioFormFieldElement.input = radioElement
  })

  const colorSchemeRadioElements = document.querySelectorAll(
    "input[name='background_color']"
  )
  const backgroundGraphicElement = document.querySelector(
    '.widget-outlook__background-circle'
  )

  colorSchemeRadioElements.forEach((colorSchemeRadioElement) => {
    colorSchemeRadioElement.addEventListener('change', (event) => {
      backgroundGraphicElement.style.fill = `#${event.target.value}`
    })
  })

  const messageInput = document.querySelector('.message')
  if (messageInput) {
    const snackbarElement = document.querySelector('.mdc-snackbar')
    if (snackbarElement) {
      const snackbar = new MDCSnackbar(snackbarElement)
      const dataObj = {
        message: messageInput.innerHTML,
        actionText: 'Hide',
        actionHandler: () => {
          snackbar.hide()
        },
      }
      snackbar.show(dataObj)
    }
  }

  const selectElement = document.querySelector('.mdc-select')
  if (selectElement) {
    MDCSelect.attachTo(selectElement)
  }
  initUrlInput('.form--profile')
  initPhone()

  // init current view
  let uiView
  if (QhUtils.isPage('widget_detail')) {
    uiView = new WidgetView()
  } else if (QhUtils.isPage('communications')) {
    uiView = new CallsView()
  } else {
    uiView = new DashboardView()
  }
  uiView.init()
})
