/*import './common';*/
import { MDCFloatingLabel } from '@material/floating-label'
import { MDCTextField } from '@material/textfield'
import { MDCRipple } from '@material/ripple'
/*
function listen() {
  const url = "ws://127.0.0.1:8089/ws";
  console.log(`Calling the websocket server using URL: ${url}`);
    
  const websocket = new WebSocket(url);
  websocket.onopen = () => {
    console.log('Signaling channel opened for console communication.');
    websocket.onmessage = (event) => {
      const message = JSON.parse(event.data);
      console.log(`Message arrived: ${message}`);
      console.log(event.data);
    };
    
    var registerMessage = {
      cmd: 'consoleRegister',
      clientid: "console"
    };
    websocket.send(JSON.stringify(registerMessage));
  };
}
*/
document.addEventListener('DOMContentLoaded', () => {
  const inputElements = Array.from(document.querySelectorAll('.mdc-text-field'))
  inputElements.forEach((inputElement) => {
    MDCTextField.attachTo(inputElement)
  })

  const labelElements = Array.from(
    document.querySelectorAll('.mdc-floating-label')
  )
  labelElements.forEach((labelElement) => {
    MDCFloatingLabel.attachTo(labelElement)
  })

  const submitButton = document.querySelector('.form__submit')
  if (submitButton) {
    MDCRipple.attachTo(submitButton)
  }

  //listen();

  //initUrlInput("");
})

/**
 * Handles captcha.
 */
// eslint-disable-next-line func-names
window.onloadCallback = function () {
  // eslint-disable-next-line no-undef
  grecaptcha.render('recaptcha', {
    //localhost
    //'sitekey': '6LdRb28UAAAAAGrJkEJbiGF10ZoakR2QcjQzBDcU',
    //quickhellou.com
    sitekey: '6LdJTo8UAAAAAIfD1-LwdukUOKnL16upPWj3SoJy',
    // eslint-disable-next-line func-names
    callback: function () {
      const captchaContainer = document.querySelector("input[name='recaptcha']")
      captchaContainer.value = '1'
    },
  })
}

export function initUrlInput(formQuerySelector) {
  const urlNoHTTPInputElement = document.querySelector(
    "input[name='url_no_http']"
  )
  const urlInputElement = document.querySelector(
    'input.form__input--callpage-url'
  )
  const urlFormInputElement = document.querySelector("input[name='url']")
  const form = document.querySelector(`form${formQuerySelector}`)
  // eslint-disable-next-line func-names
  form.addEventListener('submit', function () {
    urlNoHTTPInputElement.value = urlInputElement.value
    urlFormInputElement.value = 'http://' + urlInputElement.value
    return true
  })
}
