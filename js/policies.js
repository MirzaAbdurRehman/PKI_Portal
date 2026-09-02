// ================= Policies page interactions =================

(function () {
  // --- Category tab filter ---
  const tabs = document.querySelectorAll('.tab-btn');
  const blocks = document.querySelectorAll('.policy-block');

  if (tabs.length) {
    tabs.forEach((tab) => {
      tab.addEventListener('click', () => {
        tabs.forEach((t) => t.classList.remove('active'));
        tab.classList.add('active');
        const cat = tab.dataset.cat;

        blocks.forEach((block) => {
          if (cat === 'all' || block.dataset.cat === cat) {
            block.style.display = '';
          } else {
            block.style.display = 'none';
          }
        });
      });
    });
  }

  // --- Document requirements checklist with live progress ---
  const reqItems = document.querySelectorAll('.req-item');
  const progressFill = document.querySelector('.progress-fill');
  const progressPct = document.querySelector('.progress-pct');

  function updateProgress() {
    if (!reqItems.length || !progressFill) return;
    const done = document.querySelectorAll('.req-item.done').length;
    const pct = Math.round((done / reqItems.length) * 100);
    progressFill.style.width = pct + '%';
    if (progressPct) progressPct.textContent = pct + '%';
  }

  reqItems.forEach((item) => {
    item.addEventListener('click', () => {
      item.classList.toggle('done');
      updateProgress();
    });
  });

  updateProgress();
})();
