// ================= Multi-step proposal / application flow =================

(function () {
  const panels = document.querySelectorAll('.form-panel');
  const stepItems = document.querySelectorAll('.step-item');
  if (!panels.length) return;

  const panelOrder = ['plan', 'details', 'ekyc', 'payment', 'review', 'certificate', 'success'];
  let current = 0;
  let selectedPlan = null;

  function selectPlan(card) {
    document.querySelectorAll('.plan-pick').forEach((item) => item.classList.remove('selected'));
    card.classList.add('selected');
    selectedPlan = card.dataset.planName;
    const notice = card.closest('.form-panel').querySelector('.plan-error');
    if (notice) notice.style.display = 'none';
  }

  function panelIndex(name) {
    return panelOrder.indexOf(name);
  }

  function digitsOnly(value) {
    return value.replace(/\D/g, '');
  }

  function formatCnic(value) {
    const digits = digitsOnly(value).slice(0, 13);
    if (digits.length <= 5) return digits;
    if (digits.length <= 12) return digits.slice(0, 5) + '-' + digits.slice(5);
    return digits.slice(0, 5) + '-' + digits.slice(5, 12) + '-' + digits.slice(12);
  }

  const cnicInput = document.getElementById('inp-cnic');
  if (cnicInput) {
    cnicInput.addEventListener('input', () => {
      cnicInput.value = formatCnic(cnicInput.value);
    });
  }

  const phoneInput = document.getElementById('inp-phone');
  if (phoneInput) {
    phoneInput.addEventListener('input', () => {
      phoneInput.value = digitsOnly(phoneInput.value).slice(0, 10);
    });
  }

  function showPanel(index) {
    panels.forEach((p) => p.classList.toggle('active', panelIndex(p.dataset.panel) === index));
    stepItems.forEach((s, i) => {
      s.classList.toggle('active', i === index);
      s.classList.toggle('done', i < index);
    });
    const card = document.querySelector('.form-card');
    if (card) window.scrollTo({ top: card.offsetTop - 100, behavior: 'smooth' });
  }

  function validatePanel(index) {
    const panel = panels[index];
    const requiredFields = panel.querySelectorAll('[data-required="true"]');
    let valid = true;

    requiredFields.forEach((field) => {
      const group = field.closest('.form-group');
      const empty = !field.value || field.value.trim() === '';
      const validCnic = field.id !== 'inp-cnic' || /^\d{5}-\d{7}-\d$/.test(field.value);
      const validPhone = field.id !== 'inp-phone' || /^3\d{9}$/.test(field.value);
      if (empty || !validCnic || !validPhone) {
        valid = false;
        if (group) group.classList.add('error');
      } else {
        if (group) group.classList.remove('error');
      }
    });

    if (panel.dataset.panel === 'plan' && !selectedPlan) {
      valid = false;
      const notice = panel.querySelector('.plan-error');
      if (notice) notice.style.display = 'block';
    }

    return valid;
  }

  document.querySelectorAll('[data-action="next"]').forEach((btn) => {
    btn.addEventListener('click', () => {
      if (!validatePanel(current)) return;
      if (panels[current].dataset.panel === 'payment') buildReview();
      current++;
      showPanel(current);
    });
  });

  document.querySelectorAll('[data-action="next-ekyc"]').forEach((btn) => {
    btn.addEventListener('click', () => {
      if (!validatePanel(current)) return;
      current++;
      showPanel(current);
      runEkycSimulation();
    });
  });

  document.querySelectorAll('[data-action="back"]').forEach((btn) => {
    btn.addEventListener('click', () => {
      if (current > 0) {
        current--;
        showPanel(current);
      }
    });
  });

  document.querySelectorAll('.plan-pick').forEach((card) => {
    card.addEventListener('click', () => {
      selectPlan(card);
    });
  });

  const applicationParams = new URLSearchParams(window.location.search);
  const requestedPlan = applicationParams.get('plan');
  const requestedPlanCard = requestedPlan
    ? Array.from(document.querySelectorAll('.plan-pick')).find((card) => card.dataset.planName === requestedPlan)
    : null;
  if (requestedPlanCard) selectPlan(requestedPlanCard);

  const requestedCover = applicationParams.get('cover');
  const coverInput = document.getElementById('inp-cover');
  if (coverInput && /^\d+$/.test(requestedCover || '')) {
    coverInput.value = requestedCover;
  }

  const requestedFrequency = applicationParams.get('frequency');
  const frequencyInput = document.getElementById('inp-freq');
  const frequencyLabels = {
    monthly: 'Monthly',
    quarterly: 'Quarterly',
    annual: 'Annual',
  };
  if (frequencyInput && frequencyLabels[requestedFrequency]) {
    frequencyInput.value = frequencyLabels[requestedFrequency];
  }

  function runEkycSimulation() {
    const items = [
      { id: 'ekyc-cnic', delay: 1200 },
      { id: 'ekyc-bio', delay: 2600 },
      { id: 'ekyc-contact', delay: 3800 },
    ];
    const continueBtn = document.getElementById('ekyc-continue-btn');
    const resultBox = document.getElementById('ekyc-result');

    items.forEach((item) => {
      const el = document.getElementById(item.id);
      if (!el) return;
      el.classList.remove('checking', 'passed');
      const statusEl = el.querySelector('.ekyc-status');
      if (statusEl) statusEl.textContent = 'Pending';
    });
    if (resultBox) resultBox.style.display = 'none';
    if (continueBtn) continueBtn.disabled = true;

    items.forEach((item, i) => {
      const startDelay = i === 0 ? 300 : items[i - 1].delay;
      setTimeout(() => {
        const el = document.getElementById(item.id);
        if (!el) return;
        el.classList.add('checking');
        const statusEl = el.querySelector('.ekyc-status');
        if (statusEl) statusEl.textContent = 'Checking...';
      }, startDelay);

      setTimeout(() => {
        const el = document.getElementById(item.id);
        if (!el) return;
        el.classList.remove('checking');
        el.classList.add('passed');
        const statusEl = el.querySelector('.ekyc-status');
        if (statusEl) statusEl.textContent = 'Verified';
      }, item.delay);
    });

    const lastDelay = items[items.length - 1].delay;
    setTimeout(() => {
      if (resultBox) resultBox.style.display = 'flex';
      if (continueBtn) continueBtn.disabled = false;
    }, lastDelay + 400);
  }

  function runCertificateSimulation() {
    const steps = [
      { id: 'cert-payment', delay: 900 },
      { id: 'cert-csr', delay: 2200 },
      { id: 'cert-validate', delay: 3600 },
      { id: 'cert-issued', delay: 4800 },
    ];
    const finishBtn = document.getElementById('cert-finish-btn');
    if (finishBtn) finishBtn.disabled = true;

    steps.forEach((step) => {
      const el = document.getElementById(step.id);
      if (!el) return;
      el.classList.remove('active', 'done');
      const badge = el.querySelector('.cert-badge');
      if (badge) badge.textContent = 'Pending';
    });

    steps.forEach((step, i) => {
      const startDelay = i === 0 ? 300 : steps[i - 1].delay;
      setTimeout(() => {
        const el = document.getElementById(step.id);
        if (!el) return;
        el.classList.add('active');
        const badge = el.querySelector('.cert-badge');
        if (badge) badge.textContent = 'Processing';
      }, startDelay);

      setTimeout(() => {
        const el = document.getElementById(step.id);
        if (!el) return;
        el.classList.remove('active');
        el.classList.add('done');
        const badge = el.querySelector('.cert-badge');
        if (badge) badge.textContent = 'Done';
      }, step.delay);
    });

    const lastDelay = steps[steps.length - 1].delay;
    setTimeout(() => {
      if (finishBtn) finishBtn.disabled = false;
    }, lastDelay + 400);
  }

  function fieldVal(id) {
    const el = document.getElementById(id);
    return el ? el.value : '';
  }

  function buildReview() {
    const map = {
      'rv-name': fieldVal('inp-name'),
      'rv-cnic': fieldVal('inp-cnic'),
      'rv-dob': fieldVal('inp-dob'),
      'rv-phone': fieldVal('inp-phone') ? '+92 ' + fieldVal('inp-phone') : '',
      'rv-email': fieldVal('inp-email'),
      'rv-city': fieldVal('inp-city'),
      'rv-plan': selectedPlan || '—',
      'rv-cover': fieldVal('inp-cover') ? 'PKR ' + Number(fieldVal('inp-cover')).toLocaleString('en-PK') : '—',
      'rv-term': fieldVal('inp-term') ? fieldVal('inp-term') + ' years' : '—',
      'rv-freq': fieldVal('inp-freq'),
    };
    Object.keys(map).forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.textContent = map[id] || '—';
    });
  }

  const submitBtn = document.querySelector('[data-action="submit"]');
  if (submitBtn) {
    submitBtn.addEventListener('click', () => {
      current++;
      showPanel(current);
      runCertificateSimulation();
    });
  }

  const finishBtn = document.getElementById('cert-finish-btn');
  if (finishBtn) {
    finishBtn.addEventListener('click', () => {
      current++;
      const ref = 'EFU-' + Math.floor(100000 + Math.random() * 900000);
      const refEl = document.getElementById('ref-number');
      if (refEl) refEl.textContent = ref;
      showPanel(current);
    });
  }

  showPanel(0);
})();