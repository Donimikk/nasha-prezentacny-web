// Google Maps is loaded only after a click, so no third-party cookies before consent.
function loadMap() {
  const q = encodeURIComponent('Nasha kaviareň, Námestie slobody 2467/3, Vranov nad Topľou');
  const box = document.getElementById('map');
  box.innerHTML = '<iframe loading="lazy" title="Mapa: Nasha kaviareň" src="https://www.google.com/maps?q=' + q + '&output=embed"></iframe>';
  // the clicked button is gone; move keyboard focus to the map instead of losing it
  box.querySelector('iframe').focus();
}

// Instagram strip: pause / resume the moving row
function toggleStrip(btn) {
  const strip = btn.closest('.igs');
  const paused = strip.classList.toggle('paused');
  btn.textContent = paused ? 'Spustiť pohyb' : 'Zastaviť pohyb';
  btn.setAttribute('aria-pressed', String(paused));
}
