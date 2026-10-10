// Line-art cups in the style of the printed menu. Each <span data-cup="name">
// is replaced with an inline SVG drawn with a navy outline.
(function () {
  const S = 'fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"';
  const CUPS = {
    tumbler: `<svg viewBox="0 0 60 70"><path ${S} d="M8,8 L14,62 Q30,66 46,62 L52,8 Z"/><path ${S} d="M10,24 Q30,28 50,24"/></svg>`,
    fluted: `<svg viewBox="0 0 60 70"><path ${S} d="M8,8 L14,62 Q30,66 46,62 L52,8 Z"/><path ${S} d="M20,10 L22,52 M30,10 L30,54 M40,10 L38,52"/><path ${S} d="M14,52 Q30,58 46,52"/></svg>`,
    cup: `<svg viewBox="0 0 80 70"><ellipse ${S} cx="40" cy="58" rx="34" ry="9"/><path ${S} d="M16,14 L20,46 Q40,54 60,46 L64,14 Z"/><ellipse ${S} cx="40" cy="14" rx="24" ry="5"/></svg>`,
    plate: `<svg viewBox="0 0 80 40"><ellipse ${S} cx="40" cy="20" rx="34" ry="14"/><ellipse ${S} cx="40" cy="20" rx="26" ry="9"/></svg>`,
    bean: `<svg viewBox="0 0 30 20"><ellipse ${S} cx="9" cy="10" rx="6" ry="8" transform="rotate(-30 9 10)"/><ellipse ${S} cx="22" cy="10" rx="6" ry="8" transform="rotate(-30 22 10)"/></svg>`,
  };
  document.querySelectorAll('[data-cup]').forEach((n) => { n.innerHTML = CUPS[n.dataset.cup] || ''; });
})();
