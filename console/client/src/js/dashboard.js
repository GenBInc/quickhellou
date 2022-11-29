import { MDCList } from '@material/list'
import { MDCTopAppBar } from '@material/top-app-bar/index'
import { MDCTextField } from '@material/textfield'
import { MDCSelect } from '@material/select'
import { MDCSnackbar } from '@material/snackbar'
import { MDCFormField } from '@material/form-field'
import { MDCCheckbox } from '@material/checkbox'
import { MDCRadio } from '@material/radio'
import { QhUtils } from './com/quickhellou/base/utils/QhUtils'
import { CalendarView } from './com/quickhellou/dashboard/CalendarView'
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

  initColorPicker()

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

  const selectElements = document.querySelectorAll('.mdc-select')
  selectElements.forEach(selectElement => {
    if (selectElement) {
      MDCSelect.attachTo(selectElement)
    }
  })
  initUrlInput('.form--profile')
  //initPhone()

  // init current view
  let uiView
  if (QhUtils.isPage('widget_detail')) {
    uiView = new WidgetView()
  } else if (QhUtils.isPage('communications')) {
    uiView = new CallsView()
  } else if (QhUtils.isPage('calendar')) {
    uiView = new CalendarView()
  } else {
    uiView = new DashboardView()
  }
  uiView.init()

  initMobileMenu()
  initMessages()

})

const initColorPicker = () => {

  Coloris({
    parent: '.color-dot-wrap',
    alpha: true,
    focusInput: false,
    theme: 'polaroid',
    /*format: 'rgb',
    saveButton: {
      show: true,
      label: 'Save',
    },
    clearButton: {
      show: true,
      label: 'Cancel',
    },*/
    swatches: [
      '#231f20',
      '#264653',
      '#2a9d8f',
      '#e9c46a',
      '#f4a261',
      '#e76f51',
      '#d62828',
      '#023e8a',
      '#0096c7',
      '#00b4d8',
      '#48cae4',
      '#ffffff',
    ],
  })

  
  const colorDot = document.querySelector('.color-dot');
  if (!!colorDot) {
    updateColor();
    colorDot.addEventListener('click', openColorPicker);
  }

  const colorInput = document.querySelector('.widget-color-field')
  if (!!colorInput) {
    colorInput.addEventListener('input', updateColor)
  }

}

const updateColor = () => {
  const colorInput = document.querySelector('.widget-color-field')
  const colorDot = document.querySelector('.color-dot')
  const previewDot = document.querySelector('.widget-outlook__background-circle')

  if (!!colorInput && !!colorDot && !!previewDot) {
    previewDot.style.fill = colorDot.style.backgroundColor = colorInput.value;
  }

}



const openColorPicker = (e) => {

  const colorInput = document.querySelector('.widget-color-field')
  colorInput.dispatchEvent(new Event('openPicker', { bubbles: true }));
  
}

const initMessages = () => {
  const ulMessages = document.querySelector('ul.messages')
  if (!!ulMessages) {
    ulMessages.classList.add('js-fade')
  }
}

const initMobileMenu = () => {

  const mobileMenu = document.querySelector('.mobile-menu_button')


  mobileMenu.addEventListener('click', () => {

    const asideDrawer = document.querySelector('aside.mdc-drawer')

    if (asideDrawer.classList.contains("aside-active")) {
      asideDrawer.classList.remove("aside-active")
    } else {
      asideDrawer.classList.add("aside-active")
    }
    
  }) 


  const pageContent = document.querySelector('.main-content')

  pageContent.addEventListener('click', function (e) {
    const asideDrawer = document.querySelector('aside.mdc-drawer')
    asideDrawer.classList.remove("aside-active")
    e.stopPropagation();
  })  

  const asideCloseButton = document.querySelector('.aside-close-button  ')

  asideCloseButton.addEventListener('click', function (e) {
    const asideDrawer = document.querySelector('aside.mdc-drawer')
    asideDrawer.classList.remove("aside-active")
    e.stopPropagation();
  })  

}