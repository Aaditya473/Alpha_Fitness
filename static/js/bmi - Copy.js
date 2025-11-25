document.addEventListener('DOMContentLoaded', function(){
  const form = document.getElementById('bmiForm');
  if (!form) return;
  form.addEventListener('submit', function(e){
    e.preventDefault();
    const w = parseFloat(document.getElementById('weight').value);
    const h = parseFloat(document.getElementById('height').value);
    if (!w || !h) return;
    const bmi = w / (h*h);
    let cat = '';
    if (bmi < 18.5) cat = 'Underweight';
    else if (bmi < 25) cat = 'Normal';
    else if (bmi < 30) cat = 'Overweight';
    else cat = 'Obese';
    document.getElementById('result').innerHTML = `<strong>BMI:</strong> ${bmi.toFixed(2)} <br><strong>Category:</strong> ${cat}`;
    // suggest next action
    const suggest = document.createElement('div');
    suggest.className = 'result-suggest';
    suggest.innerHTML = `<p>Suggestion: <button onclick="openChat('${cat.toLowerCase()}')">Consult Trainer</button></p>`;
    document.getElementById('result').appendChild(suggest);
  });
});
