

document.addEventListener('DOMContentLoaded', () => {

  initCalendar();

})

const initCalendar = () => {
 
  const dayCheckboxes = document.querySelectorAll('.day_checkbox');

  dayCheckboxes.forEach((currentElement) => {
    if (!!currentElement) {
      currentElement.addEventListener('change', dayChange)
    }
  })


}

const dayChange = (e) => {
    
  
}
