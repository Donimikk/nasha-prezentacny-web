// Line-art objects in the style of the printed menu, drawn in three-quarter
// perspective (rims and bases are ellipses). Each [data-art] element gets an
// inline SVG. Strokes keep the same weight at any size (non-scaling-stroke),
// so large and small objects read as one set, like on the menu.
//
// Depth field: inside a [data-field] container, every [data-art] with
// data-depth (0.2 = far … 1.4 = near) moves with the pointer and with scroll
// at a speed proportional to its depth; on scroll the objects also drift
// outwards and grow, as if the camera moved through them. Elements without
// data-depth (the logo) stay still, which is what makes the depth readable.

(function () {
  const S = 'fill="#fff" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke"';
  const L = 'fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke"';
  const P = 'fill="#FBBD98" stroke="currentColor" stroke-width="2.6" stroke-linejoin="round" vector-effect="non-scaling-stroke"';

  const ART = {
    // cappuccino cup on a saucer, heart in the foam
    latte: `<svg viewBox="0 0 120 90"><ellipse ${S} cx="58" cy="70" rx="52" ry="15"/><ellipse ${L} cx="58" cy="70" rx="24" ry="6"/>
      <path ${S} d="M22,26 Q24,66 58,68 Q92,66 94,26"/><path ${L} d="M93,34 Q114,32 110,46 Q106,56 90,54"/>
      <ellipse ${S} cx="58" cy="26" rx="36" ry="10"/><path ${P} d="M58,32 C50,26 50,20 55,20 Q58,20 58,24 Q58,20 61,20 C66,20 66,26 58,32 Z"/></svg>`,
    espresso: `<svg viewBox="0 0 80 64"><ellipse ${S} cx="38" cy="50" rx="34" ry="10"/><path ${S} d="M16,18 Q17,46 38,47 Q59,46 60,18"/>
      <path ${L} d="M59,24 Q74,23 71,33 Q68,40 57,38"/><ellipse ${P} cx="38" cy="18" rx="22" ry="6"/></svg>`,
    tumbler: `<svg viewBox="0 0 60 80"><path ${S} d="M8,10 L14,70 Q30,76 46,70 L52,10"/><ellipse ${S} cx="30" cy="10" rx="22" ry="6"/>
      <path ${L} d="M11,34 Q30,40 49,34"/></svg>`,
    fluted: `<svg viewBox="0 0 60 80"><path ${S} d="M8,10 L14,70 Q30,76 46,70 L52,10"/><ellipse ${S} cx="30" cy="10" rx="22" ry="6"/>
      <path ${L} d="M18,16 L21,66 M30,17 L30,69 M42,16 L39,66"/></svg>`,
    lemonade: `<svg viewBox="0 0 70 110"><path ${L} d="M44,2 L36,46"/><path ${S} d="M10,30 L16,100 Q35,106 54,100 L60,30"/>
      <path ${P} d="M12,50 Q35,56 58,50 L54,100 Q35,106 16,100 Z"/><ellipse ${S} cx="35" cy="30" rx="25" ry="7"/>
      <circle ${S} cx="50" cy="26" r="10"/><path ${L} d="M50,16 L50,36 M40,26 L60,26"/></svg>`,
    dripper: `<svg viewBox="0 0 110 80"><path ${S} d="M6,12 L42,62 L68,62 L104,12"/>
      <path ${L} d="M20,16 L46,61 M34,18 L50,62 M48,19 L53,62 M62,19 L57,62 M76,18 L60,62 M90,16 L64,61"/>
      <ellipse ${S} cx="55" cy="12" rx="49" ry="8"/><rect ${S} x="22" y="62" width="66" height="10" rx="5"/></svg>`,
    server: `<svg viewBox="0 0 110 100"><path ${S} d="M38,6 L38,18 L14,58 Q8,70 12,82 Q16,94 30,95 L80,95 Q94,94 98,82 Q102,70 96,58 L72,18 L72,6 Z"/>
      <path ${L} d="M38,8 Q32,6 28,0"/><path ${L} d="M72,12 L100,12 L100,48 L92,56"/><ellipse ${L} cx="55" cy="6" rx="17" ry="4"/></svg>`,
    kettle: `<svg viewBox="0 0 140 100"><path ${S} d="M48,30 L44,88 Q70,96 96,88 L92,30 Z"/><ellipse ${S} cx="70" cy="30" rx="22" ry="6"/>
      <path ${L} d="M47,74 Q22,72 16,40 Q12,24 4,20"/><path ${L} d="M93,38 Q124,36 122,58 Q120,78 95,76"/>
      <path ${L} d="M64,24 L76,24"/></svg>`,
    pitcher: `<svg viewBox="0 0 80 90"><path ${S} d="M16,14 L12,78 Q36,86 60,78 L56,14"/><path ${S} d="M16,14 Q36,8 56,14 Q66,10 72,4 Q66,20 56,22 Q36,26 16,20 Z"/>
      <path ${L} d="M14,30 Q-2,34 2,52 Q4,64 13,64"/></svg>`,
    bean: `<svg viewBox="0 0 40 50"><ellipse ${S} cx="20" cy="25" rx="15" ry="21" transform="rotate(-20 20 25)"/>
      <path ${L} d="M14,8 Q26,22 16,30 Q8,38 22,44"/></svg>`,
    plate: `<svg viewBox="0 0 120 50"><ellipse ${S} cx="60" cy="25" rx="56" ry="18"/><ellipse ${L} cx="60" cy="25" rx="40" ry="11"/></svg>`,
    cake: `<svg viewBox="0 0 110 80"><path ${S} d="M10,40 L70,18 L100,34 L100,58 L40,76 L10,62 Z"/><path ${L} d="M10,40 L40,54 L100,34 M40,54 L40,76"/>
      <path ${P} d="M10,40 L40,54 L40,62 L10,48 Z"/><circle ${S} cx="68" cy="26" r="5"/></svg>`,
  };

  document.querySelectorAll('[data-art]').forEach((n) => { n.innerHTML = ART[n.dataset.art] || ''; });

  // depth field
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  document.querySelectorAll('[data-field]').forEach((field) => {
    const items = [...field.querySelectorAll('[data-art][data-depth]')].map((el) => ({
      el, d: parseFloat(el.dataset.depth), rot: parseFloat(el.dataset.rot || 0),
      tilt: parseFloat(el.dataset.tilt || 0), phase: Math.random() * 6.28,
    }));
    let mx = 0, my = 0, tx = 0, ty = 0;

    field.addEventListener('pointermove', (e) => {
      const r = field.getBoundingClientRect();
      tx = (e.clientX - r.left) / r.width - 0.5;
      ty = (e.clientY - r.top) / r.height - 0.5;
    });
    field.addEventListener('pointerleave', () => { tx = 0; ty = 0; });

    function frame(now) {
      mx += (tx - mx) * 0.06; my += (ty - my) * 0.06;     // eased pointer
      const r = field.getBoundingClientRect();
      const p = Math.max(0, Math.min(1, -r.top / r.height)); // 0 → 1 while the hero scrolls away
      const cx = r.width / 2, cy = r.height / 2;
      for (const it of items) {
        const box = it.el.offsetLeft + it.el.offsetWidth / 2 - cx;
        const boy = it.el.offsetTop + it.el.offsetHeight / 2 - cy;
        const float = Math.sin(now / 1800 + it.phase) * 6 * it.d;
        const x = -mx * 60 * it.d + box * p * it.d * 0.9;
        const y = -my * 40 * it.d + boy * p * it.d * 0.9 + float - p * 120 * it.d;
        const s = 1 + p * it.d * 0.7;
        it.el.style.transform =
          `translate3d(${x.toFixed(1)}px,${y.toFixed(1)}px,0) scale(${s.toFixed(3)}) ` +
          `rotateX(${(it.tilt + my * 18 * it.d).toFixed(1)}deg) rotateY(${(-mx * 22 * it.d).toFixed(1)}deg) rotate(${it.rot}deg)`;
        it.el.style.opacity = (1 - p * 0.8).toFixed(2);
      }
      if (visible) raf = requestAnimationFrame(frame);
      else raf = null;
    }

    if (reduce) {
      items.forEach((it) => { it.el.style.transform = `rotate(${it.rot}deg)`; });
      return;
    }
    // run the loop only while the hero is on screen
    let visible = false, raf = null;
    new IntersectionObserver((entries) => {
      visible = entries[0].isIntersecting;
      if (visible && raf === null) raf = requestAnimationFrame(frame);
    }).observe(field);
  });
})();
