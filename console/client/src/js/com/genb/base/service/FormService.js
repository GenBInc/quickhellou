import { EventEmitter } from './EventEmitter'

import Cookie from 'js-cookie'

/**
 * Form service class.
 *
 * @export
 * @class FormService
 */
export class FormService extends EventEmitter {
  /**
   * Gets data as XMLHttpRequest call.
   *
   * @param {string} serviceName
   * @memberof FormService
   */
  getAsXMLHttpRequest(serviceName) {
    return this.sendAsXMLHttpRequest('GET', [], serviceName)
  }

  /**
   * Posts data as XMLHttpRequest call.
   *
   * @param {*} fieldSet
   * @param {string} serviceName
   * @memberof FormService
   */
  postAsXMLHttpRequest(fieldSet, serviceName) {
    return this.sendAsXMLHttpRequest('POST', fieldSet, serviceName)
  }

  /**
   * Sends data as XMLHttpRequest call.
   *
   * @param {string} method
   * @param {array<object>} fieldSet
   * @param {string} url
   * @memberof FormService
   */
  sendAsXMLHttpRequest(method, fieldSet, url) {
    let formData = new FormData()
    for (const [key, value] of Object.entries(fieldSet)) {
      formData.append(key, value)
    }
    return new Promise((resolve, reject) => {
      let request = new XMLHttpRequest()
      request.open(method, url, true)
      request.addEventListener('load', () => {
        if ([200, 201].includes(request.status)) {
          resolve(request.responseText)
        }
        reject(request.responseText)
      })
      var csrftoken = Cookie.get('csrftoken')
      if (csrftoken !== 'undefined') {
        request.setRequestHeader('X-CSRFToken', csrftoken)
      }
      request.send(formData)
    })
  }

  /**
   * Sends serialized parameters as form url encoded type.
   *
   * @param {*} fieldSet
   * @param {string} serviceName
   * @returns
   * @memberof FormService
   */
  sendAsXMLHttpFormEncodedRequest(fieldSet, serviceName) {
    let data = ''
    fieldSet.forEach((field) => {
      data = `${data}${field.name}=${field.value}&`
    })
    return new Promise((resolve) => {
      let request = new XMLHttpRequest()
      request.open('POST', serviceName, true)
      request.addEventListener('load', () => {
        resolve(request.responseText)
      })
      request.setRequestHeader(
        'Content-Type',
        'application/x-www-form-urlencoded'
      )
      request.send(data)
    })
  }

  /**
   * Sends data as HTML form.
   *
   * @param {*} fieldSet
   * @param {string} action
   * @memberof FormService
   */
  sendAsForm(fieldSet, action) {
    let html = `<form id="__form__" action='${action}' method="POST" enctype="multipart/form-data">`
    var csrftoken = Cookie.get('csrftoken')
    if (csrftoken !== 'undefined') {
      html += `<input type="hidden" name="csrfmiddlewaretoken" value="${csrftoken}">`
    }
    for (const [key, value] of Object.entries(fieldSet)) {
      html += `<input type="hidden" name="${key}" value='${value}'>`
    }
    html += `</form>`
    document.body.insertAdjacentHTML('beforeend', html)
    const form = document.getElementById('__form__')
    form.submit()
  }
}
