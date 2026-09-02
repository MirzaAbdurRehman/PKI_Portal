// ================= Shared site behaviour =================

// Scroll-reveal for elements with .reveal
function initReveal() {
  const els = document.querySelectorAll('.reveal');
  if (!els.length) return;
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) {
        e.target.classList.add('in');
        io.unobserve(e.target);
      }
    });
  }, { threshold: 0.15 });
  els.forEach((el) => io.observe(el));
}

// Mobile hamburger toggle
function initMobileNav() {
  const btn = document.querySelector('.hamburger');
  const links = document.querySelector('.nav-links');
  if (!btn || !links) return;
  btn.addEventListener('click', () => {
    const open = links.style.display === 'flex';
    links.style.display = open ? 'none' : 'flex';
    links.style.cssText += open
      ? ''
      : 'position:absolute;top:78px;left:0;right:0;background:var(--cream);flex-direction:column;padding:20px 32px;border-bottom:1px solid var(--sage-line);gap:18px;';
  });
}

// Highlight current nav link based on page
function initActiveNav() {
  const path = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-links a').forEach((a) => {
    const href = a.getAttribute('href');
    if (href === path) a.classList.add('active');
  });
}

document.addEventListener('DOMContentLoaded', () => {
  initReveal();
  initMobileNav();
  initActiveNav();
});
