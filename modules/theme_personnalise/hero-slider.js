(() => {
 'use strict';
 document.querySelectorAll('[data-hero-visual]').forEach(visual => {
  visual.style.background = `hsl(${Math.floor(Math.random() * 360)} 42% 38%)`;
  const img = visual.querySelector('img');
  if (img) {
   const fallback = () => { img.hidden = true; };
   img.addEventListener('error', fallback);
   if (img.complete && !img.naturalWidth) fallback();
  }
 });
 document.querySelectorAll('[data-hero-carousel]').forEach(root => {
  const slides = [...root.querySelectorAll('.gda-carousel__slide')];
  if (!slides.length) return;
  let current = 0, timer;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  let playing = root.dataset.autoplay === 'true' && !reduced.matches;
  const controls = root.querySelector('[data-carousel-controls]');
  const toggle = root.querySelector('[data-carousel-toggle]');
  const status = root.querySelector('[data-carousel-status]');
  const dots = [];
  const schedule = () => {
   clearTimeout(timer);
   if (playing && !document.hidden && !root.matches(':hover') && !root.contains(document.activeElement) && slides.length > 1)
    timer = setTimeout(() => show((current + 1) % slides.length), Number(root.dataset.interval) * 1000);
   if (toggle) { toggle.textContent = playing ? 'Pause' : 'Défiler'; toggle.setAttribute('aria-label', playing ? 'Mettre le diaporama en pause' : 'Démarrer le diaporama'); }
  };
  const show = (index, manual = false) => {
   current = (index + slides.length) % slides.length;
   slides.forEach((slide, i) => {
    slide.classList.toggle('is-active', i === current);
    slide.setAttribute('aria-hidden', String(i !== current));
    slide.inert = i !== current;
    slide.setAttribute('aria-label', `${i + 1} sur ${slides.length}`);
    if (dots[i]) dots[i].setAttribute('aria-current', String(i === current));
   });
   if (manual) { playing = false; status.textContent = `Article ${current + 1} sur ${slides.length}`; }
   schedule();
  };
  if (controls) {
   slides.forEach((slide, i) => {
    const dot = document.createElement('button');
    dot.type = 'button'; dot.setAttribute('aria-label', `Afficher l’article ${i + 1}`);
    dot.addEventListener('click', () => show(i, true));
    root.querySelector('[data-carousel-dots]').append(dot); dots.push(dot);
   });
   root.querySelector('[data-carousel-prev]').addEventListener('click', () => show(current - 1, true));
   root.querySelector('[data-carousel-next]').addEventListener('click', () => show(current + 1, true));
   toggle.addEventListener('click', () => { playing = !playing; schedule(); });
   controls.hidden = false;
  }
  root.dataset.ready = 'true'; show(0);
  ['mouseenter', 'mouseleave', 'focusin'].forEach(event => root.addEventListener(event, schedule));
  root.addEventListener('focusout', () => setTimeout(schedule, 0));
  document.addEventListener('visibilitychange', schedule);
  reduced.addEventListener('change', () => { if (reduced.matches) playing = false; schedule(); });
 });
})();
