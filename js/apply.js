// ================= Multi-step proposal / application flow =================

(function () {
  const panels = document.querySelectorAll('.form-panel');
  let selectedPolicyBenefits = [];
  const stepItems = document.querySelectorAll('.step-item');
  if (!panels.length) return;

  const panelOrder = ['plan', 'details', 'ekyc', 'review', 'payment', 'mobile-approval', 'certificate', 'signed-pdf', 'success'];
  let current = 0;
  let selectedPlan = null;
  let signedApplicantName = '';

  const planFactors = {
    'Security Plus Plan': 0.9,
    'Mukammal Sehat': 1.6,
    'Education Plan': 1.1,
    'Prosperity for Life Plan': 1.3,
    'Capital Growth Plan': 1.25,
    'Executive Pension Plus Plan': 1.2,
  };

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
    const activePanel = panels[index];
    stepItems.forEach((s, i) => {
      s.classList.toggle('active', i === index);
      s.classList.toggle('done', i < index);
    });

    if (activePanel && (activePanel.dataset.panel === 'review' || activePanel.dataset.panel === 'payment' || activePanel.dataset.panel === 'mobile-approval')) {
      refreshPremiumSummary();
      renderMobileApproval();
    }
    if (activePanel && activePanel.dataset.panel === 'signed-pdf') renderSignedPdf();

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

      if (panels[current - 1] && panels[current - 1].dataset.panel === 'mobile-approval') {
        runCertificateSimulation();
      }
    });
  });

  document.querySelectorAll('[data-action="next-ekyc"]').forEach((btn) => {
    btn.addEventListener('click', () => {
      if (!validatePanel(current)) return;
      buildReview();
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

  [document.getElementById('inp-cover'), frequencyInput].forEach((element) => {
    if (element) {
      element.addEventListener('input', refreshPremiumSummary);
      element.addEventListener('change', refreshPremiumSummary);
    }
  });

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
      { id: 'cert-csr', delay: 1200 },
      { id: 'cert-validate', delay: 2800 },
      { id: 'cert-issued', delay: 4400 },
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

  async function renderSignedPdf() {
    const canvas = document.getElementById('signed-pdf-canvas');
    const loading = document.getElementById('pdf-loading');
    if (!canvas || !loading || typeof pdfjsLib === 'undefined') return;
    if (canvas.dataset.loaded === 'true') return;
    try {
      pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
      const pdf = await pdfjsLib.getDocument('./policy_agreement_signed.pdf?v=20260904').promise;
      const page = await pdf.getPage(1);
      const baseViewport = page.getViewport({ scale: 1 });
      const scale = Math.min(1.5, (canvas.parentElement.clientWidth - 36) / baseViewport.width);
      const viewport = page.getViewport({ scale });
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
      canvas.dataset.loaded = 'true';
      loading.remove();
    } catch (error) {
      loading.textContent = 'PDF preview could not load. Use Open signed PDF below.';
    }
  }

  function formatPKR(n) {
    return 'PKR ' + Math.round(n).toLocaleString('en-PK');
  }

  function calculatePremiumEstimate() {
    const cover = Number(fieldVal('inp-cover')) || 0;
    const selectedFreq = (fieldVal('inp-freq') || 'Monthly').toLowerCase();
    const age = Number(new URLSearchParams(window.location.search).get('age') || 30);
    const currentPlan = selectedPlan || 'Security Plus Plan';
    const planFactor = planFactors[currentPlan] || 1;
    const annual = (cover / 1000) * 1.15 * (1 + Math.max(0, age - 25) * 0.018) * planFactor;

    let amount = annual;
    let suffix = '/ year';
    if (selectedFreq === 'monthly') {
      amount = annual / 12;
      suffix = '/ month';
    } else if (selectedFreq === 'quarterly') {
      amount = annual / 4;
      suffix = '/ quarter';
    }

    return {
      amount,
      suffix,
      text: formatPKR(amount) + ' ' + suffix,
    };
  }

  function refreshPremiumSummary() {
    const premium = calculatePremiumEstimate();
    const displayEl = document.getElementById('payment-estimate');
    if (displayEl) displayEl.textContent = premium.text;

    const reviewPremiumEl = document.getElementById('rv-premium');
    if (reviewPremiumEl) reviewPremiumEl.textContent = premium.text;
  }

  function renderMobileApproval() {
    const selected = selectedPlan || 'Security Plus Plan';
    const name = fieldVal('inp-name') || '—';
    signedApplicantName = name !== '—' ? name : signedApplicantName || 'Customer';
    const cnic = fieldVal('inp-cnic') || '—';
    const city = fieldVal('inp-city') || '—';
    const phone = fieldVal('inp-phone') ? '+92 ' + fieldVal('inp-phone') : '—';
    const email = fieldVal('inp-email') || '—';
    const dob = fieldVal('inp-dob') || '—';
    const cover = fieldVal('inp-cover') ? 'PKR ' + Number(fieldVal('inp-cover')).toLocaleString('en-PK') : '—';
    const frequency = fieldVal('inp-freq') || '—';

    const policyNameEl = document.getElementById('mobile-policy-name');
    if (policyNameEl) policyNameEl.textContent = selected;

    const applicantNameEl = document.getElementById('mobile-applicant-name');
    if (applicantNameEl) applicantNameEl.textContent = name;

    const applicantCnicEl = document.getElementById('mobile-applicant-cnic');
    if (applicantCnicEl) applicantCnicEl.textContent = cnic;

    const applicantCityEl = document.getElementById('mobile-applicant-city');
    if (applicantCityEl) applicantCityEl.textContent = city;

    const benefitMap = {
      'Security Plus Plan': [
        'Family protection cover for spouse, children and dependents.',
        'Lump-sum payout on life-cover event for financial continuity.',
        'Priority claim support with simplified documentation and processing.',
        'Flexible coverage options aligned to long-term family security goals.',
        'Affordable premiums designed for ongoing protection and peace of mind.'
      ],
      'Education Plan': [
        'Education savings structured for tuition, school and university milestones.',
        'Dedicated planning for child education, marriage and future ambitions.',
        'Regular savings discipline with a clear long-term funding roadmap.',
        'Targeted maturity benefits aligned to academic and life-stage needs.',
        'Secure growth with disciplined payout planning for future stability.'
      ],
      'Mukammal Sehat': [
        'Cashless hospitalization and emergency medical support for the family.',
        'Coverage for medicines, diagnostics, specialist consultations and procedures.',
        'Day-care treatment benefits for regular and critical healthcare needs.',
        'Protection against unexpected medical expenses and high treatment costs.',
        'Shariah-friendly and family-focused benefits for practical health security.'
      ],
      'Capital Growth Plan': [
        'Long-term wealth accumulation through a disciplined growth strategy.',
        'Investment-linked benefits designed for future financial milestones.',
        'Structured capital appreciation journey with stable long-term value.',
        'Flexible planning for retirement, housing and major life objectives.',
        'Optimized returns with disciplined protection features for lasting wealth.'
      ],
      'Executive Pension Plus Plan': [
        'Retirement income planning to maintain stability in senior years.',
        'Structured pension benefits that support ongoing living expenses.',
        'Financial continuity beyond active employment and business life.',
        'Protection for dependents while ensuring dependable retirement security.',
        'Long-term stability through disciplined pension accumulation and planning.'
      ],
      'Prosperity for Life Plan': [
        'Balanced protection and savings strategy for personal life security.',
        'Stable long-term value with consistent planning and future readiness.',
        'Designed for personal security, wealth continuity and milestone protection.',
        'Financial continuity through changing life stages and household needs.',
        'Access to meaningful life cover with savings benefits for future growth.'
      ]
    };

    const selectedBenefits = benefitMap[selected] || benefitMap['Security Plus Plan'];
    selectedPolicyBenefits = selectedBenefits;
    const mobileList = document.getElementById('mobile-policy-list');
    if (mobileList) {
      mobileList.innerHTML = `
        <div style="display:flex; flex-direction:column; gap:12px;">
          <div style="padding:10px 12px; border:1px solid rgba(82,100,90,.18); border-radius:12px; background:#eefae8;">
            <div style="font-size:11px; color:#64748b; text-transform:uppercase; letter-spacing:.05em; margin-bottom:5px;">Selected policy</div>
            <div style="font-size:18px; font-weight:700; color:#1f2937;">${selected}</div>
          </div>

          <div style="padding:10px 12px; border:1px solid rgba(82,100,90,.18); border-radius:12px; background:#f8faf8;">
            <div style="font-size:11px; color:#64748b; text-transform:uppercase; letter-spacing:.05em; margin-bottom:8px;">Customer details</div>
            <div style="display:flex; flex-direction:column; gap:6px; font-size:11px; color:#334155;">
              <div style="display:flex; justify-content:space-between; gap:8px;"><span>Full name</span><strong style="text-align:right;">${name}</strong></div>
              <div style="display:flex; justify-content:space-between; gap:8px;"><span>CNIC</span><strong style="text-align:right;">${cnic}</strong></div>
              <div style="display:flex; justify-content:space-between; gap:8px;"><span>Date of birth</span><strong style="text-align:right;">${dob}</strong></div>
              <div style="display:flex; justify-content:space-between; gap:8px;"><span>City</span><strong style="text-align:right;">${city}</strong></div>
              <div style="display:flex; justify-content:space-between; gap:8px;"><span>Phone</span><strong style="text-align:right;">${phone}</strong></div>
              <div style="display:flex; justify-content:space-between; gap:8px;"><span>Email</span><strong style="text-align:right;">${email}</strong></div>
              <div style="display:flex; justify-content:space-between; gap:8px;"><span>Coverage</span><strong style="text-align:right;">${cover}</strong></div>
              <div style="display:flex; justify-content:space-between; gap:8px;"><span>Frequency</span><strong style="text-align:right;">${frequency}</strong></div>
            </div>
          </div>

          <div style="padding:10px 12px; border:1px solid rgba(82,100,90,.18); border-radius:12px; background:#f8faf8;">
            <div style="font-size:11px; color:#64748b; text-transform:uppercase; letter-spacing:.05em; margin-bottom:8px;">Key benefits</div>
            <ol style="margin:0; padding-left:18px; color:#334155; font-size:11px; line-height:1.7; list-style-type:decimal;">
              ${selectedBenefits.map((benefit) => `<li>${benefit}</li>`).join('')}
            </ol>
          </div>

          <div style="padding-top:8px; display:flex; justify-content:center;">
            <button type="button" class="mobile-sign-btn" style="background:#1f332e; color:#ffffff; border:none; border-radius:999px; padding:10px 18px; font-weight:700; font-size:11px; cursor:pointer;">Sign</button>
          </div>
        </div>
      `;

      const signBtn = mobileList.querySelector('.mobile-sign-btn');
      if (signBtn) {
        signBtn.addEventListener('click', () => {
          signedApplicantName = fieldVal('inp-name') || signedApplicantName || 'Customer';
          current = panelOrder.indexOf('certificate');
          showPanel(current);
          runCertificateSimulation();
        });
      }
    }
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
      'rv-freq': fieldVal('inp-freq'),
    };
    Object.keys(map).forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.textContent = map[id] || '—';
    });
    refreshPremiumSummary();
  }

  const submitBtn = document.querySelector('[data-action="submit"]');
  if (submitBtn) {
    submitBtn.addEventListener('click', () => {
      if (!validatePanel(current)) return;
      buildReview();
      submitBtn.disabled = true;
      const successMessage = document.getElementById('payment-success');
      if (successMessage) successMessage.classList.add('visible');
      setTimeout(() => {
        current++;
        showPanel(current);
      }, 2000);
    });
  }

  const certificateNextBtn = document.getElementById('cert-finish-btn');
  if (certificateNextBtn) {
    certificateNextBtn.addEventListener('click', () => {
      current++;
      showPanel(current);
    });
  }

  const signedPdfFinishBtn = document.getElementById('signed-pdf-finish-btn');
  if (signedPdfFinishBtn) {
    signedPdfFinishBtn.addEventListener('click', () => {
      current++;
      const ref = 'NIFT-' + Math.floor(100000 + Math.random() * 900000);
      const refEl = document.getElementById('ref-number');
      if (refEl) refEl.textContent = ref;
      showPanel(current);
    });
  }

  showPanel(0);
})();