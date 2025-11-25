document.addEventListener('DOMContentLoaded', function(){
  const form = document.getElementById('calorieForm');
  if (!form) return;
  form.addEventListener('submit', function(e){
    e.preventDefault();
    const activity = document.getElementById('activity').value;
    const minutes = parseInt(document.getElementById('minutes').value,10);
    const output = document.getElementById('output');

    if (!minutes || minutes <= 0) {
      output.textContent = 'Please enter duration in minutes (greater than 0).';
      return;
    }

    let calories = 0;
    switch(activity){
      case 'running': calories = minutes * 10; break;
      case 'cycling': calories = minutes * 8; break;
      case 'yoga': calories = minutes * 5; break;
      case 'walking': calories = minutes * 4; break;
      default: calories = minutes * 6;
    }
    output.innerHTML = `<strong>Estimated calories burned:</strong> ${calories} kcal`;
  });
});
