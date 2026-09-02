// ================= Hero premium calculator =================
// Simple illustrative premium estimator — not a real actuarial engine.

(function () {
  const ageInput = document.getElementById('calc-age');
  const ageOut = document.getElementById('calc-age-out');
  const coverInput = document.getElementById('calc-cover');
  const coverOut = document.getElementById('calc-cover-out');
  const planSel = document.getElementById('calc-plan');
  const freqBtns = document.querySelectorAll('.seg button');
  const resultAmount = document.getElementById('calc-result-amount');
  const resultFreq = document.getElementById('calc-result-freq');
  const applyLink = document.getElementById('calc-apply-link');

  if (!ageInput || !coverInput || !planSel) return; // not on this page

  const planFactors = {
    'Security Plus Plan': 0.9,
    'Mukammal Sehat': 1.6,
    'Education Plan': 1.1,
    'Prosperity for Life Plan': 1.3,
    'Capital Growth Plan': 1.25,
    'Executive Pension Plus Plan': 1.2,
  };

  let frequency = 'monthly';

  function formatPKR(n) {
    return 'PKR ' + Math.round(n).toLocaleString('en-PK');
  }

  function calculate() {
    const age = parseInt(ageInput.value, 10);
    const cover = parseInt(coverInput.value, 10);
    const plan = planSel.value;
    const factor = planFactors[plan] || 1;

    // Illustrative formula: base rate scales with age and cover, plan factor applied
    const ageMultiplier = 1 + Math.max(0, age - 25) * 0.018;
    const base = (cover / 1000) * 1.15 * ageMultiplier * factor;
    let annual = base;

    let shown = annual;
    let label = '/ year';
    if (frequency === 'monthly') {
      shown = annual / 12;
      label = '/ month';
    } else if (frequency === 'quarterly') {
      shown = annual / 4;
      label = '/ quarter';
    }

    ageOut.textContent = age;
    coverOut.textContent = formatPKR(cover);
    resultAmount.innerHTML = formatPKR(shown) + ' <small>' + label + '</small>';
    if (applyLink) {
      const applicationParams = new URLSearchParams({
        plan,
        cover: String(cover),
        frequency,
      });
      applyLink.href = 'apply.html?' + applicationParams.toString();
    }
  }

  ageInput.addEventListener('input', calculate);
  coverInput.addEventListener('input', calculate);
  planSel.addEventListener('change', calculate);

  freqBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      freqBtns.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      frequency = btn.dataset.freq;
      calculate();
    });
  });

  calculate();
})();
