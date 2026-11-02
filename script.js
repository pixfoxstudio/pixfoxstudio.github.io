(() => {
  const year = document.getElementById('year');
  if (year) year.textContent = new Date().getFullYear();

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!reduceMotion && 'IntersectionObserver' in window) {
    document.body.classList.add('reveal-ready');
    const observer = new IntersectionObserver((entries, instance) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          instance.unobserve(entry.target);
        }
      });
    }, { threshold: 0.08, rootMargin: '0px 0px 50px 0px' });
    document.querySelectorAll('[data-reveal]').forEach(element => observer.observe(element));
  }

  // Gently bring navigation into view without hiding content on smaller screens.
  const nav = document.querySelector('.site-header');
  if (nav) {
    const updateHeader = () => {
      nav.style.background = window.scrollY > 60 ? 'rgba(16, 16, 23, .88)' : 'transparent';
      nav.style.backdropFilter = window.scrollY > 60 ? 'blur(22px)' : 'none';
      nav.style.position = window.scrollY > 60 ? 'fixed' : 'absolute';
      nav.style.boxShadow = window.scrollY > 60 ? '0 1px 0 rgba(255,255,255,.08)' : 'none';
    };
    updateHeader();
    window.addEventListener('scroll', updateHeader, { passive: true });
  }
})();