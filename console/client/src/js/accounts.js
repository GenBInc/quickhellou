import { MDCFloatingLabel } from '@material/floating-label'
import { MDCTextField } from '@material/textfield'
import { MDCRipple } from '@material/ripple'

document.addEventListener('DOMContentLoaded', () => {

  initMessages();

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

  /*
  const phoneInput = document.querySelector("input.form--signup__input--phone")
  window.intlTelInput(phoneInput, {
    initialCountry: 'us',
    separateDialCode: true,
    utilsScript: 'https://cdnjs.cloudflare.com/ajax/libs/intl-tel-input/8.4.6/js/utils.js'
  })
  */
})

const updatePhoneNumber = () => {
	var iti = window.intlTelInputGlobals.instances[0]
  if (iti !== undefined) {
		const phoneInput = document.querySelector("input[name='phone']")
		if (!!phoneInput) {
      phoneInput.value = iti.getNumber(1)
		}
	}
}

document.createAccount = () => {
  updatePhoneNumber()
  document.querySelector('form.site-form').submit()
}
/**
 * Handles captcha.
 */
/*
// eslint-disable-next-line func-names
window.onloadCallback = function () {
  // eslint-disable-next-line no-undef
  grecaptcha.render('recaptcha', {
    sitekey: '<key>',
    // eslint-disable-next-line func-names
    callback: function () {
      const captchaContainer = document.querySelector("input[name='recaptcha']")
      captchaContainer.value = '1'
    },
  })
}
*/

const initMessages = () => {
  const ulMessages = document.querySelector('ul.messages')
  if (!!ulMessages) {
    ulMessages.classList.add('js-fade')
  }
}