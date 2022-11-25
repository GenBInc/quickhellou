

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


const addTimeRow = (day) => {
    document.getElementById('time_rows_'+day).innerHTML+='<div class="df df-f1 flc time-row additional">'+document.getElementById('time-row').innerHTML+'</div>';
}
