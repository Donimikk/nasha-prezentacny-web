// Pour-over animation (mockup).
// Origami dripper (fluted cone) on a wooden holder, sitting on a glass server
// shaped like the Timemore server: short neck, sloped shoulders, widest point
// low, flat base, spout on the left, angular glass handle on the right.
//
// Both streams are drawn as thin vertical capsules (rectangles with fully
// rounded ends): water falls straight down from an invisible kettle into the
// dripper, coffee runs straight down from the outlet into the server. The
// coffee surface stays flat. The logo is drawn in the panel's peach, so it
// only shows once the dark coffee is behind it.
//
// Usage: <div class="decanter" data-logo="path/to/nasha-logo.svg"></div>
//        Click replays. ?t=ms freezes one frame (screenshots).

(function () {
  const NS = 'http://www.w3.org/2000/svg';
  const NAVY = '#1E2155';
  const PEACH = '#FBBD98';
  const WHITE = '#FFFFFF';

  // geometry, viewBox 0 0 400 600
  const CX = 200;
  const RIM_Y = 150, RIM_RX = 120, RIM_RY = 10;     // dripper top
  const OUTLET_Y = 268, OUTLET_RX = 32;             // dripper bottom
  const HOLDER = { x: 82, y: 266, w: 236, h: 20 };
  const NECK_TOP = HOLDER.y + HOLDER.h;             // 286
  const BASE_Y = 560;
  const SERVER =
    `M144,${NECK_TOP} L144,322 L84,452 Q72,480 78,510 Q86,556 128,${BASE_Y} ` +
    `L272,${BASE_Y} Q314,556 322,510 Q328,480 316,452 L256,322 L256,${NECK_TOP} Z`;
  const SPOUT = `M144,${NECK_TOP + 4} Q130,${NECK_TOP + 2} 124,${NECK_TOP - 8}`;
  const HANDLE = 'M258,304 L336,304 Q346,304 346,314 L346,414 Q346,422 340,426 L312,444';
  const POUR = { x: CX - 3.5, w: 7, top: 34, bottom: RIM_Y + 18 };  // kettle stream
  const FLOW_W = 4;                                                  // coffee stream
  const LEVEL_EMPTY = BASE_Y, LEVEL_FULL = 398;

  function el(name, attrs, parent) {
    const n = document.createElementNS(NS, name);
    for (const k in attrs) n.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(n);
    return n;
  }

  // capsule = rect with radius of half its width; hidden when too short
  function setCapsule(node, top, bottom) {
    const h = bottom - top;
    node.setAttribute('y', top.toFixed(1));
    node.setAttribute('height', Math.max(0, h).toFixed(1));
    node.setAttribute('opacity', h > 1 ? 1 : 0);
  }

  window.mountDecanter = function (host) {
    const uid = 'p' + Math.random().toString(36).slice(2, 7);
    const svg = el('svg', { viewBox: '0 0 400 600', role: 'img',
      'aria-label': 'Káva sa prekvapkáva cez origami dripper do servera a odkryje logo nasha' });
    const defs = el('defs', {}, svg);
    el('path', { d: SERVER }, el('clipPath', { id: uid + 's' }, defs));

    // water from the kettle (drawn first, disappears behind the dripper rim)
    const pour = el('rect', { x: POUR.x, width: POUR.w, rx: POUR.w / 2, fill: WHITE, opacity: 0 }, svg);

    // coffee in the server, flat surface
    const coffee = el('rect', { x: 60, width: 280, y: BASE_Y, height: 0, fill: NAVY,
      'clip-path': 'url(#' + uid + 's)' }, svg);
    el('image', { href: host.dataset.logo, x: 112, y: 456, width: 176, height: 56 }, svg);
    // coffee running from the outlet
    const flow = el('rect', { x: CX - FLOW_W / 2, width: FLOW_W, rx: FLOW_W / 2, fill: NAVY, opacity: 0 }, svg);

    // server glass
    el('path', { d: SERVER, fill: 'none', stroke: NAVY, 'stroke-width': 4, 'stroke-linejoin': 'round' }, svg);
    el('path', { d: SPOUT, fill: 'none', stroke: NAVY, 'stroke-width': 4, 'stroke-linecap': 'round' }, svg);
    el('path', { d: HANDLE, fill: 'none', stroke: NAVY, 'stroke-width': 4,
      'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, svg);
    el('line', { x1: 146, y1: 322, x2: 254, y2: 322, stroke: NAVY, 'stroke-width': 2.5 }, svg); // neck ring

    // wooden holder
    el('rect', { x: HOLDER.x, y: HOLDER.y, width: HOLDER.w, height: HOLDER.h, rx: HOLDER.h / 2,
      fill: WHITE, stroke: NAVY, 'stroke-width': 4 }, svg);

    // origami dripper: navy cone, peach pleat ridges spaced like a round cone
    el('path', { d: `M${CX - RIM_RX},${RIM_Y} L${CX - OUTLET_RX},${OUTLET_Y} ` +
      `L${CX + OUTLET_RX},${OUTLET_Y} L${CX + RIM_RX},${RIM_Y} Z`,
      fill: NAVY, stroke: NAVY, 'stroke-width': 4, 'stroke-linejoin': 'round' }, svg);
    for (let i = 1; i < 10; i++) {
      const c = Math.cos(Math.PI * i / 10);
      el('line', { x1: (CX - (RIM_RX - 4) * c).toFixed(1), y1: (RIM_Y + RIM_RY * Math.sin(Math.PI * i / 10)).toFixed(1),
        x2: (CX - (OUTLET_RX - 2) * c).toFixed(1), y2: OUTLET_Y - 2,
        stroke: PEACH, 'stroke-width': i % 2 ? 2.4 : 1.4, 'stroke-linecap': 'round' }, svg);
    }
    el('ellipse', { cx: CX, cy: RIM_Y, rx: RIM_RX, ry: RIM_RY, fill: WHITE, stroke: NAVY, 'stroke-width': 4 }, svg);
    const bed = el('ellipse', { cx: CX, cy: RIM_Y + 1, rx: 56, ry: 5, fill: NAVY, opacity: 0.2 }, svg);

    host.appendChild(svg);

    const T = { pourIn: 450, flowStart: 1200, pourOut: 5000, flowEnd: 6200, fillEnd: 6000 };
    const smooth = (p) => p * p * (3 - 2 * p);
    const clamp = (v) => Math.max(0, Math.min(1, v));
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const frozenAt = new URLSearchParams(location.search).get('t');
    let start = null, raf = null;

    function draw(t) {
      // water: the capsule grows down from the top, then its top end follows it down
      const grow = smooth(clamp(t / T.pourIn));
      const fall = smooth(clamp((t - T.pourOut) / 450));
      setCapsule(pour, POUR.top + (POUR.bottom - POUR.top) * fall,
                       POUR.top + (POUR.bottom - POUR.top) * grow);

      // coffee bed darkens as it gets wet
      const wet = clamp(t / 1500);
      bed.setAttribute('opacity', (0.2 + 0.65 * wet).toFixed(2));
      bed.setAttribute('rx', (56 + 44 * wet).toFixed(1));

      // level in the server
      const fill = smooth(clamp((t - T.flowStart) / (T.fillEnd - T.flowStart)));
      const level = LEVEL_EMPTY - (LEVEL_EMPTY - LEVEL_FULL) * fill;
      coffee.setAttribute('y', level.toFixed(1));
      coffee.setAttribute('height', (BASE_Y - level).toFixed(1));

      // coffee stream: same capsule logic, from the outlet down to the surface
      const out = NECK_TOP - 2;
      const fGrow = smooth(clamp((t - T.flowStart) / 300));
      const fFall = smooth(clamp((t - (T.flowEnd - 350)) / 350));
      setCapsule(flow, out + (level - out) * fFall, out + (level - out) * fGrow);
    }

    function frame(now) {
      if (start === null) start = now;
      const t = now - start;
      draw(t);
      if (t < T.flowEnd + 200) raf = requestAnimationFrame(frame);
    }

    function play() {
      cancelAnimationFrame(raf);
      start = null;
      if (frozenAt !== null) { draw(Number(frozenAt)); return; }
      if (reduce) { draw(T.flowEnd + 1000); return; }
      raf = requestAnimationFrame(frame);
    }

    host.addEventListener('click', play);
    // keyboard users can replay it too
    host.tabIndex = 0;
    host.setAttribute('role', 'button');
    host.setAttribute('aria-label', 'Prehrať animáciu prípravy kávy znova');
    host.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); play(); }
    });
    // Start only when most of the panel is on screen, and replay each time it
    // comes back into view after having left it completely.
    let armed = true;
    new IntersectionObserver((entries) => {
      const e = entries[0];
      if (e.intersectionRatio >= 0.75 && armed) { armed = false; play(); }
      else if (!e.isIntersecting) armed = true;
    }, { threshold: [0, 0.75] }).observe(host);
  };

  document.querySelectorAll('.decanter').forEach(window.mountDecanter);
})();
