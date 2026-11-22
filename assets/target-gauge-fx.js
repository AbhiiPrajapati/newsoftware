/* Target gauge glimmer: travelling shimmer, glowing tip, sparkle and sparks.
   Draws on a canvas laid over the existing SVG arc (#employeeTargetGauge).
   It reads the value from #employeeTeamPercent, so app.js needs no changes. */
(function () {
  const gauge = document.querySelector('.employee-gauge');
  const svg = gauge && gauge.querySelector('svg');
  const percentEl = document.getElementById('employeeTeamPercent');
  if (!gauge || !svg || !percentEl) return;

  // Same geometry as the SVG path "M25 125 A95 95 0 0 1 215 125" (viewBox 240x150)
  const VB_W = 240, VB_H = 150, CX = 120, CY = 125, R = 95, STROKE = 13;

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const canvas = document.createElement('canvas');
  canvas.className = 'employee-gauge-fx';
  canvas.setAttribute('aria-hidden', 'true');
  canvas.style.cssText = 'position:absolute;left:0;top:0;width:100%;height:140px;pointer-events:none';
  svg.after(canvas); // after the svg, before the % text, so the text stays on top
  const ctx = canvas.getContext('2d');

  let w = 0, h = 0, scale = 1, offX = 0, offY = 0;
  let target = 0;          // real percentage from the app
  let shown = 0;           // animated percentage (eases to target, like the 1s SVG transition)
  let hover = 0, hoverVel = 0, hovered = false;
  let last = performance.now(), t = 0;
  const sparks = [];

  function readTarget() {
    const v = parseFloat(percentEl.textContent);
    target = Number.isFinite(v) ? Math.max(0, Math.min(100, v)) : 0;
  }

  function resize() {
    const r = svg.getBoundingClientRect();
    w = r.width; h = r.height;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.max(1, w * dpr);
    canvas.height = Math.max(1, h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    // svg uses preserveAspectRatio xMidYMid meet: replicate its fit
    scale = Math.min(w / VB_W, h / VB_H);
    offX = (w - VB_W * scale) / 2;
    offY = (h - VB_H * scale) / 2;
  }

  const pt = (a, r) => [offX + (CX + Math.cos(a) * r) * scale, offY + (CY + Math.sin(a) * r) * scale];
  const angleFor = (p) => Math.PI + Math.PI * (p / 100);

  function spawn(x, y, ang, k) {
    if (sparks.length > 26) return;
    const dir = ang + (Math.random() - 0.5) * 1.2 + (Math.random() > 0.3 ? 0 : Math.PI);
    const sp = (0.3 + Math.random() * 0.8) * (1 + k);
    sparks.push({
      x: x + (Math.random() - 0.5) * 3, y: y + (Math.random() - 0.5) * 3,
      vx: Math.cos(dir) * sp, vy: Math.sin(dir) * sp - 0.12,
      life: 1, decay: 0.025 + Math.random() * 0.025,
      size: 1 + Math.random() * 1.5, white: Math.random() > 0.3
    });
  }

  function frame(now) {
    requestAnimationFrame(frame);
    if (document.hidden) { last = now; return; }
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now; t += dt;

    if (!w || !h) { resize(); if (!w) return; }
    readTarget();

    // Ease toward the target, matching the CSS dasharray transition
    shown += (target - shown) * Math.min(1, dt * 4);
    if (Math.abs(target - shown) < 0.005) shown = target;

    // Springy hover/click kick
    hoverVel += -20 * hover * dt;
    hoverVel *= Math.exp(-4.8 * dt);
    hover = Math.max(-0.15, hover + hoverVel * dt);

    ctx.clearRect(0, 0, w, h);
    if (shown <= 0.05) return;

    const motion = !reduceMotion.matches;
    const push = motion ? Math.pow(Math.max(0, Math.sin((t * 1.45) % (Math.PI * 2))), 3) * 0.6 : 0;
    const intensity = push + Math.max(0, hover) * 0.6 + (hovered ? 0.25 : 0);

    const a0 = angleFor(0);
    const a1 = angleFor(shown);
    const span = a1 - a0;

    // Travelling shimmer waves inside the filled arc
    if (motion) {
      for (let i = 0; i < 2; i++) {
        const pos = ((t * 1.0) + i * 0.5) % 1;
        const head = a0 + span * pos;
        const tail = Math.max(a0, head - Math.min(0.5, span * 0.45));
        if (head - tail < 0.01) continue;
        const [x0, y0] = pt(tail, R), [x1, y1] = pt(head, R);
        const g = ctx.createLinearGradient(x0, y0, x1, y1);
        g.addColorStop(0, 'rgba(255,255,255,0)');
        g.addColorStop(0.65, 'rgba(186,230,253,0.55)');
        g.addColorStop(1, 'rgba(255,255,255,0.95)');
        const cxp = offX + CX * scale, cyp = offY + CY * scale;
        ctx.beginPath();
        ctx.arc(cxp, cyp, R * scale, tail, head, false);
        ctx.strokeStyle = g;
        ctx.lineWidth = STROKE * 0.5 * scale;
        ctx.lineCap = 'round';
        ctx.stroke();
      }
    }

    // Bright leading edge
    const segLen = Math.min(0.2 + intensity * 0.1, span);
    if (segLen > 0.01) {
      const s = a1 - segLen;
      const [x0, y0] = pt(s, R), [x1, y1] = pt(a1, R);
      const g = ctx.createLinearGradient(x0, y0, x1, y1);
      g.addColorStop(0, 'rgba(56,189,248,0)');
      g.addColorStop(0.5, 'rgba(224,242,254,0.85)');
      g.addColorStop(1, '#ffffff');
      const cxp = offX + CX * scale, cyp = offY + CY * scale;
      ctx.beginPath();
      ctx.arc(cxp, cyp, R * scale, s, a1, false);
      ctx.strokeStyle = g;
      ctx.lineWidth = STROKE * 0.85 * scale;
      ctx.lineCap = 'round';
      ctx.stroke();
    }

    // Glow + sparkle at the tip
    const [tx, ty] = pt(a1, R);
    const fr = (15 + intensity * 8) * scale;
    const rg = ctx.createRadialGradient(tx, ty, 0, tx, ty, fr);
    rg.addColorStop(0, 'rgba(255,255,255,1)');
    rg.addColorStop(0.28, 'rgba(224,242,254,0.9)');
    rg.addColorStop(0.6, 'rgba(56,189,248,0.4)');
    rg.addColorStop(1, 'rgba(0,132,255,0)');
    ctx.fillStyle = rg;
    ctx.beginPath(); ctx.arc(tx, ty, fr, 0, Math.PI * 2); ctx.fill();

    if (motion) {
      const sc = (0.8 + intensity * 0.5 + Math.sin(t * 9) * 0.12) * scale;
      ctx.save();
      ctx.translate(tx, ty);
      ctx.rotate(t * 0.85);
      ctx.fillStyle = 'rgba(255,255,255,0.96)';
      ctx.beginPath();
      for (let i = 0; i < 4; i++) {
        const a = i * Math.PI / 2;
        ctx.lineTo(Math.cos(a) * 9.5 * sc, Math.sin(a) * 9.5 * sc);
        ctx.lineTo(Math.cos(a + Math.PI / 4) * 1.8 * sc, Math.sin(a + Math.PI / 4) * 1.8 * sc);
      }
      ctx.closePath(); ctx.fill();
      ctx.restore();

      if (Math.random() < 0.4 + intensity * 0.45) spawn(tx, ty, a1 + Math.PI / 2, intensity);
      for (let i = sparks.length - 1; i >= 0; i--) {
        const p = sparks[i];
        p.x += p.vx; p.y += p.vy; p.life -= p.decay;
        if (p.life <= 0) { sparks.splice(i, 1); continue; }
        ctx.save();
        ctx.globalAlpha = p.life;
        ctx.fillStyle = p.white ? '#ffffff' : '#7dd3fc';
        ctx.shadowColor = '#38bdf8';
        ctx.shadowBlur = 6;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      }
    }
  }

  const panel = gauge.closest('.target-command-panel') || gauge;
  panel.addEventListener('mouseenter', () => { hovered = true; hoverVel += 0.9; });
  panel.addEventListener('mouseleave', () => { hovered = false; });
  panel.addEventListener('click', () => { hoverVel += 1.4; });

  new ResizeObserver(resize).observe(svg);
  window.addEventListener('resize', resize);
  readTarget();
  resize();
  requestAnimationFrame(frame);
})();
