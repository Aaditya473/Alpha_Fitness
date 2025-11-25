document.addEventListener('DOMContentLoaded', function(){
  const form = document.getElementById('bmiForm');
  if (!form) return;
  form.addEventListener('submit', function(e){
    e.preventDefault();
    const w = parseFloat(document.getElementById('weight').value);
    const h = parseFloat(document.getElementById('height').value);
    const resultBox = document.getElementById('result');

    if (!w || !h || w <= 0 || h <= 0) {
      resultBox.textContent = 'Please enter valid weight and height.';
      return;
    }

    const bmi = w / (h*h);
    let cat = '';
    if (bmi < 18.5) cat = 'Underweight';
    else if (bmi < 25) cat = 'Normal';
    else if (bmi < 30) cat = 'Overweight';
    else cat = 'Obese';

    resultBox.innerHTML = `<strong>BMI:</strong> ${bmi.toFixed(2)}<br><strong>Category:</strong> ${cat}`;
    const old = resultBox.querySelector('.result-suggest');
    if (old) old.remove();
    const suggest = document.createElement('div');
    suggest.className = 'result-suggest';
    suggest.innerHTML = `<p>Suggestion: <button type="button" onclick="openChat('${cat.toLowerCase()}')">Consult Trainer</button></p>`;
    resultBox.appendChild(suggest);
  });
});
