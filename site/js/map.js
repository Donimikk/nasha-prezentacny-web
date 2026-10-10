// Google Maps is loaded only after a click, so no third-party cookies before consent.
function loadMap() {
  const q = encodeURIComponent('Nasha kaviareň, Námestie slobody 2467/3, Vranov nad Topľou');
  document.getElementById('map').innerHTML = '<iframe loading="lazy" title="Mapa: Nasha kaviareň" src="https://www.google.com/maps?q=' + q + '&output=embed"></iframe>';
}
