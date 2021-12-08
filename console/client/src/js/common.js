export function initCallPageUrlInput(formQuerySelector) {
  const callPageUrlNoHTTPInputElement = document.querySelector(
    "input[name='callpage_url_no_http']"
  )
  const callPageUrlInputElement = document.querySelector(
    'input.form__input--callpage-url'
  )
  const callPageUrlFormInputElement = document.querySelector(
    "input[name='callpage_url']"
  )
  const form = document.querySelector(`form${formQuerySelector}`)
  form.addEventListener('submit', () => {
    callPageUrlNoHTTPInputElement.value = callPageUrlInputElement.value
    callPageUrlFormInputElement.value =
      'http://' + callPageUrlInputElement.value
    return true
  })
}
