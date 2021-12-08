/*import './common';*/
import { MDCFloatingLabel } from '@material/floating-label'
import { MDCTextField } from '@material/textfield'
import { MDCRipple } from '@material/ripple'

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

  //initUrlInput("");
})

/**
 * Handles captcha.
 */
// eslint-disable-next-line func-names
window.onloadCallback = function () {
  // eslint-disable-next-line no-undef
  grecaptcha.render('recaptcha', {
    sitekey: '__sitekey__',
    // eslint-disable-next-line func-names
    callback: function () {
      const captchaContainer = document.querySelector("input[name='recaptcha']")
      captchaContainer.value = '1'
    },
  })
}
