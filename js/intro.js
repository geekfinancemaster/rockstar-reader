// Cinematic Intro: Violent Hellfire Chain strike, blazing "ROCKSTAR" title,
// and the chain slinging down right into Ghost Rider's hand on his Hell Cycle!

export function playIntro({ root, canvas, titleEl, title, theme = 'fight', onDone }) {
  const ctx = canvas.getContext('2d');
  let w = 0, h = 0, dpr = 1, raf = 0, last = 0, t0 = 0, finished = false;
  let cracked = false, flash = 0, shake = 0, ring = -1, ringX = 0, ringY = 0;
  const parts = [];
  let bgGrad = null;

  const isCold = theme === 'relax';
  const fireColor = isCold ? '#00d4ff' : '#ff5500';
  const fireCore = isCold ? '#e0f9ff' : '#fff0b8';
  const sparkHueMin = isCold ? 180 : 15;
  const sparkHueMax = isCold ? 220 : 50;

  // Keyframe timeline (ms)
  const T_CRACK = 1400;      // Chain hits center & explodes
  const T_TITLE = 1700;      // ROCKSTAR logo emerges
  const T_SLING = 3000;      // Chain swings and slings down to bike
  const T_CATCH = 4100;      // Caught in Ghost Rider's fist with bike rev
  const T_FADE  = 4900;      // Fade transition to app
  const T_END   = 5500;      // Intro complete

  const rnd = (a, b) => a + Math.random() * (b - a);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const easeOut = (t) => 1 - Math.pow(1 - clamp(t, 0, 1), 3);
  const easeInOut = (t) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

  // Load Ghost Rider image for the bike sequence
  const riderImg = new Image();
  riderImg.src = isCold ? 'assets/ghost-rider-cold.jpg' : 'assets/ghost-rider-fire.jpg';

  function resize() {
    dpr = Math.min(2, window.devicePixelRatio || 1);
    w = window.innerWidth;
    h = window.innerHeight;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    bgGrad = ctx.createRadialGradient(w / 2, h * 0.45, 10, w / 2, h * 0.5, Math.max(w, h));
    if (isCold) {
      bgGrad.addColorStop(0, '#06131c');
      bgGrad.addColorStop(0.5, '#03080e');
      bgGrad.addColorStop(1, '#010306');
    } else {
      bgGrad.addColorStop(0, '#1c0703');
      bgGrad.addColorStop(0.5, '#0d0303');
      bgGrad.addColorStop(1, '#040102');
    }
  }

  function spawn(x, y, vx, vy, size, life, hue, g, splash) {
    if (parts.length > 1400) return;
    parts.push({ x, y, vx, vy, size, life, max: life, hue, g, splash });
  }

  function crack(x, y) {
    cracked = true;
    flash = 1;
    shake = 22;
    ring = 0;
    ringX = x;
    ringY = y;
    for (let i = 0; i < 280; i++) {
      const a = rnd(0, Math.PI * 2);
      const s = rnd(3, 14);
      spawn(x, y, Math.cos(a) * s, Math.sin(a) * s - 3, rnd(1.8, 5), rnd(45, 120), rnd(sparkHueMin, sparkHueMax), 0.18, false);
    }
  }

  // Draw chain links with metallic reflections and fiery glow
  function drawChainLinks(points, glowColor) {
    if (points.length < 2) return;
    ctx.save();
    ctx.shadowColor = glowColor;
    ctx.shadowBlur = 18;

    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i];
      const p1 = points[i + 1];
      const ang = Math.atan2(p1.y - p0.y, p1.x - p0.x);
      const mx = (p0.x + p1.x) / 2;
      const my = (p0.y + p1.y) / 2;
      const segLen = Math.hypot(p1.x - p0.x, p1.y - p0.y);

      ctx.save();
      ctx.translate(mx, my);
      ctx.rotate(ang);

      const face = i % 2 === 0;
      const W = face ? 11 : 5;
      const L = Math.max(12, segLen * 1.15);

      const grad = ctx.createLinearGradient(0, -W / 2, 0, W / 2);
      if (isCold) {
        grad.addColorStop(0, '#e8f7ff');
        grad.addColorStop(0.4, '#80c8f5');
        grad.addColorStop(1, '#1b3f54');
      } else {
        grad.addColorStop(0, '#fff4d6');
        grad.addColorStop(0.4, '#ff9e2c');
        grad.addColorStop(1, '#4a1505');
      }

      ctx.strokeStyle = grad;
      ctx.lineWidth = face ? 2.8 : 3.4;
      ctx.beginPath();
      const r = W / 2;
      ctx.moveTo(-L / 2 + r, -r);
      ctx.lineTo(L / 2 - r, -r);
      ctx.arc(L / 2 - r, 0, r, -Math.PI / 2, Math.PI / 2);
      ctx.lineTo(-L / 2 + r, r);
      ctx.arc(-L / 2 + r, 0, r, Math.PI / 2, Math.PI * 1.5);
      ctx.closePath();
      ctx.stroke();

      // Glowing molten core on links
      if (i % 3 === 0) {
        ctx.fillStyle = fireCore;
        ctx.fillRect(-2, -1, 4, 2);
      }

      ctx.restore();
    }
    ctx.restore();
  }

  function frame(now) {
    if (finished) return;
    if (!t0) { t0 = now; last = now; }
    const t = now - t0;
    const dt = clamp((now - last) / 16.667, 0.2, 2.2);
    last = now;

    ctx.save();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    if (shake > 0.3) {
      ctx.translate(rnd(-shake, shake), rnd(-shake, shake));
      shake *= Math.pow(0.88, dt);
    }

    // Background fill
    ctx.fillStyle = bgGrad;
    ctx.fillRect(-20, -20, w + 40, h + 40);

    // Dynamic ground fog & road glow
    const gA = clamp(t / 1500, 0, 1);
    const rg = ctx.createRadialGradient(w / 2, h, 20, w / 2, h, h * 0.85);
    rg.addColorStop(0, isCold ? `rgba(0,180,255,${0.5 * gA})` : `rgba(255,80,0,${0.55 * gA})`);
    rg.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = rg;
    ctx.fillRect(-20, -20, w + 40, h + 40);

    // ==========================================
    // CHAIN ANIMATION STAGES
    // ==========================================
    const chainPts = [];
    let tip = null;

    if (t < T_SLING) {
      // PHASE 1: Whip down from top center to center stage
      const progress = clamp(t / T_CRACK, 0, 1);
      const curLen = easeOut(progress) * (h * 0.52);
      const N = 26;
      const wave = Math.sin(t * 0.015) * Math.min(w * 0.12, 60) * (1 - progress * 0.6);

      for (let i = 0; i <= N; i++) {
        const f = i / N;
        const cy = f * curLen;
        const cx = w / 2 + Math.sin(f * Math.PI * 2.2 - t * 0.015) * wave * f;
        chainPts.push({ x: cx, y: cy });
      }
      tip = chainPts[chainPts.length - 1];

      if (!cracked && t >= T_CRACK && tip) {
        crack(tip.x, tip.y);
      }
    } else {
      // PHASE 2 & 3: SLING THE CHAIN DOWN TO GHOST RIDER'S BIKE
      // Bike position in lower portion of screen
      const bikeTargetX = Math.min(w - 75, w * 0.65);
      const bikeTargetY = h - 90;

      // Rider rolls into place
      const bikeProgress = easeOut((t - T_SLING) / (T_CATCH - T_SLING));
      const bikeX = (w * 0.9) - (1 - bikeProgress) * (w * 0.35);
      const bikeY = bikeTargetY;

      // Hand position on the bike handlebars/seat
      const handX = bikeX - 35;
      const handY = bikeY - 28;

      // Slinging interpolation
      const slingT = clamp((t - T_SLING) / 1100, 0, 1);
      const slingEase = easeInOut(slingT);

      // Start anchor swings from top-left/center to hand
      const startX = w * 0.45 * (1 - slingEase) + (w * 0.2) * slingEase;
      const startY = 0;
      const endX = handX;
      const endY = handY;

      // Dynamic curve control point slinging wide
      const ctrlX = (w * 0.5) - Math.sin(slingT * Math.PI) * (w * 0.28);
      const ctrlY = (h * 0.35) + Math.sin(slingT * Math.PI) * (h * 0.22);

      const N = 28;
      for (let i = 0; i <= N; i++) {
        const f = i / N;
        // Quadratic bezier with wave ripple
        const inv = 1 - f;
        const bx = inv * inv * startX + 2 * inv * f * ctrlX + f * f * endX;
        const by = inv * inv * startY + 2 * inv * f * ctrlY + f * f * endY;
        const ripple = Math.sin(f * 8 - t * 0.02) * (1 - slingT) * 16;
        chainPts.push({ x: bx + ripple, y: by + ripple * 0.5 });
      }
      tip = { x: endX, y: endY };

      // DRAW GHOST RIDER ON HELL CYCLE
      ctx.save();
      ctx.translate(bikeX, bikeY);

      // Fire aura under bike
      const wheelGlow = ctx.createRadialGradient(-30, 10, 5, -30, 10, 42);
      wheelGlow.addColorStop(0, fireCore);
      wheelGlow.addColorStop(0.5, fireColor);
      wheelGlow.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = wheelGlow;
      ctx.fillRect(-70, -25, 80, 50);

      // Spinning Hell Cycle wheel
      ctx.save();
      ctx.translate(-30, 12);
      ctx.rotate(now * 0.025);
      ctx.strokeStyle = fireColor;
      ctx.lineWidth = 3.5;
      ctx.shadowColor = fireColor;
      ctx.shadowBlur = 14;
      ctx.beginPath();
      ctx.arc(0, 0, 16, 0, Math.PI * 2);
      ctx.stroke();
      for (let sp = 0; sp < 4; sp++) {
        const a = (sp * Math.PI) / 2;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(Math.cos(a) * 16, Math.sin(a) * 16);
        ctx.stroke();
      }
      ctx.restore();

      // Ghost Rider Image / Silhouette with Fiery/Cold aura
      const imgSize = 78;
      ctx.save();
      ctx.beginPath();
      ctx.arc(-5, -20, imgSize * 0.42, 0, Math.PI * 2);
      ctx.clip();
      if (riderImg.complete && riderImg.naturalWidth > 0) {
        ctx.drawImage(riderImg, -5 - imgSize / 2, -20 - imgSize / 2, imgSize, imgSize);
      } else {
        ctx.fillStyle = isCold ? '#00d4ff' : '#ff4800';
        ctx.fill();
      }
      ctx.restore();

      // Ring border around rider badge with fire/ice glow
      ctx.strokeStyle = isCold ? '#80e5ff' : '#ffd700';
      ctx.lineWidth = 2.5;
      ctx.shadowColor = fireColor;
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.arc(-5, -20, imgSize * 0.42, 0, Math.PI * 2);
      ctx.stroke();

      // Chain wrapped around Ghost Rider's arm
      if (t >= T_CATCH) {
        ctx.strokeStyle = '#e2e8f0';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(-35, -28, 10, 0, Math.PI * 1.5);
        ctx.stroke();

        // Catch spark burst
        if (t < T_CATCH + 180 && Math.random() < 0.6) {
          spawn(bikeX - 35, bikeY - 28, rnd(-4, 4), rnd(-6, -1), rnd(2, 4), rnd(20, 45), rnd(sparkHueMin, sparkHueMax), 0.18, false);
        }
      }

      ctx.restore();
    }

    // Draw the chain
    drawChainLinks(chainPts, fireColor);

    // Tip glow & sparks
    if (tip) {
      const tipGlow = ctx.createRadialGradient(tip.x, tip.y, 0, tip.x, tip.y, 35);
      tipGlow.addColorStop(0, fireCore);
      tipGlow.addColorStop(0.5, fireColor);
      tipGlow.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = tipGlow;
      ctx.fillRect(tip.x - 40, tip.y - 40, 80, 80);

      if (t < T_CRACK + 400 || (t > T_SLING && t < T_CATCH + 300)) {
        for (let i = 0; i < 3; i++) {
          spawn(tip.x, tip.y, rnd(-2.5, 2.5), rnd(-3.5, 0.5), rnd(1.2, 3), rnd(25, 55), rnd(sparkHueMin, sparkHueMax), 0.08, false);
        }
      }
    }

    // Step and draw all particle sparks
    const gy = h - 60;
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i];
      p.vy += p.g * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
      if (p.splash && p.vy > 0 && p.y >= gy) {
        for (let k = 0; k < 2; k++) {
          spawn(p.x, gy, rnd(-2, 2), rnd(-3, -1), p.size * 0.7, rnd(12, 25), p.hue, 0.2, false);
        }
        parts.splice(i, 1);
        continue;
      }
      if (p.life <= 0 || p.y > h + 40) parts.splice(i, 1);
    }

    // Draw spark particles
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineCap = 'round';
    for (const p of parts) {
      const k = clamp(p.life / p.max, 0, 1);
      ctx.strokeStyle = `hsla(${p.hue}, 100%, ${50 + k * 25}%, ${0.3 + k * 0.7})`;
      ctx.lineWidth = Math.max(0.8, p.size * (0.5 + k * 0.6));
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.x - p.vx * 2.4, p.y - p.vy * 2.4);
      ctx.stroke();
    }
    ctx.restore();

    // Shockwave ring
    if (ring >= 0) {
      ring += 10 * dt;
      ctx.strokeStyle = isCold
        ? `rgba(130,230,255,${clamp(1 - ring / 280, 0, 1)})`
        : `rgba(255,190,90,${clamp(1 - ring / 280, 0, 1)})`;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(ringX, ringY, ring, 0, Math.PI * 2);
      ctx.stroke();
      if (ring > 280) ring = -1;
    }

    // Explosive flash
    if (flash > 0.01) {
      ctx.fillStyle = isCold ? `rgba(200,240,255,${flash * 0.55})` : `rgba(255,220,160,${flash * 0.6})`;
      ctx.fillRect(-20, -20, w + 40, h + 40);
      flash *= Math.pow(0.86, dt);
    }

    ctx.restore();

    // Title reveal ("ROCKSTAR")
    if (t > T_TITLE && t < T_END) {
      titleEl.innerHTML = `
        <div class="intro-logo">
          <span class="logo-main">${title || 'ROCKSTAR'}</span>
          <span class="logo-sub">${isCold ? '❄️ RELAX MODE' : '⚔️ FIGHT MODE'}</span>
        </div>
      `;
      titleEl.classList.add('show');
    }

    // Fade to app
    if (t >= T_FADE && !root.classList.contains('out')) {
      root.classList.add('out');
    }

    if (t >= T_END) {
      finish();
      return;
    }

    raf = requestAnimationFrame(frame);
  }

  function finish() {
    if (finished) return;
    finished = true;
    cancelAnimationFrame(raf);
    window.removeEventListener('resize', resize);
    root.classList.add('out');
    setTimeout(() => { root.hidden = true; }, 700);
    onDone && onDone();
  }

  // Start sequence
  root.hidden = false;
  root.classList.remove('out');
  titleEl.classList.remove('show');
  titleEl.innerHTML = '';
  resize();
  window.addEventListener('resize', resize);
  raf = requestAnimationFrame(frame);

  return { skip: finish };
}
