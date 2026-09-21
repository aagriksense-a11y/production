// Navigation state handler
const nav = document.getElementById('nav');
function navState() {
  nav.classList.toggle('solid', window.scrollY > 32);
}
window.addEventListener('scroll', navState, { passive: true });
navState();

// Reveal animation on scroll
const obs = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      e.target.classList.add('in');
      obs.unobserve(e.target);
    }
  });
}, { threshold: .12 });
document.querySelectorAll('.reveal').forEach(x => obs.observe(x));

// Mobile navigation menu
const mobileNav = document.getElementById('mobileNav');
const mobileMenuBtn = document.querySelector('.mobile-menu');
const mobileCloseBtn = document.querySelector('.mobile-nav-close');

if (mobileMenuBtn && mobileNav && mobileCloseBtn) {
  mobileMenuBtn.addEventListener('click', () => {
    mobileNav.classList.add('open');
    document.body.style.overflow = 'hidden';
  });

  mobileCloseBtn.addEventListener('click', () => {
    mobileNav.classList.remove('open');
    document.body.style.overflow = '';
  });

  mobileNav.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      mobileNav.classList.remove('open');
      document.body.style.overflow = '';
    });
  });
}
