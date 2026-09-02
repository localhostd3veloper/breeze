'use client';

import { useEffect, useRef } from 'react';

/**
 * The one animation on the site.
 *
 * A slow flow field standing in for moving air — the thing the product is named
 * after, and the medium the boundary rule cuts through. Deliberately near the
 * threshold of visibility: it should register as atmosphere, not as an effect.
 *
 * Silent no-op under `prefers-reduced-motion`, where a single static frame is drawn.
 */
export function WindField({ className }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let width = 0;
    let height = 0;
    let raf = 0;
    let running = true;

    /**
     * Each particle carries its own short trail. This is the reason the canvas is
     * cleared every frame instead of being faded down: a multiplicative fade
     * (`destination-out` at low alpha) can never reach zero in an 8-bit buffer —
     * once a pixel decays to 1/255, `1 * 0.965` rounds back to 1 — so faint
     * streaks survive forever and silt up the background over a long session.
     */
    const TAIL = 16;
    type Particle = { x: number; y: number; life: number; pts: number[] };
    let particles: Particle[] = [];

    const stroke = () =>
      getComputedStyle(canvas).getPropertyValue('--wind-stroke').trim() || 'rgba(63,163,148,0.35)';

    const spawn = (w: number, h: number, seeded: boolean): Particle => ({
      x: seeded ? Math.random() * w : Math.random() * w * 0.4 - 20,
      y: Math.random() * h,
      life: seeded ? Math.random() * 220 : 160 + Math.random() * 200,
      pts: [],
    });

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = rect.width;
      height = rect.height;
      canvas.width = Math.max(1, Math.floor(width * dpr));
      canvas.height = Math.max(1, Math.floor(height * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      // Density scales with area so a phone doesn't run the same load as a desktop.
      const count = Math.round(Math.min(120, Math.max(28, (width * height) / 9000)));
      particles = Array.from({ length: count }, () => spawn(width, height, true));
      ctx.clearRect(0, 0, width, height);
    };

    /**
     * Layered sines rather than a noise library: cheap, dependency-free, and the
     * long wavelengths read as a prevailing wind with eddies in it.
     */
    const angleAt = (x: number, y: number, t: number) =>
      Math.sin(x * 0.0022 + t) * 0.6 +
      Math.sin(y * 0.0035 - t * 0.7) * 0.5 +
      Math.sin((x + y) * 0.0011 + t * 0.35) * 0.4;

    /** Moves every particle one step and records the new head of its trail. */
    const simulate = (t: number) => {
      for (const p of particles) {
        const a = angleAt(p.x, p.y, t);
        // Biased rightwards: wind has a prevailing direction.
        p.x += Math.cos(a) * 0.9 + 0.55;
        p.y += Math.sin(a) * 0.9;
        p.life -= 1;

        const dead = p.life <= 0 || p.x < -20 || p.x > width + 20 || p.y < -20 || p.y > height + 20;

        if (dead) {
          const fresh = spawn(width, height, false);
          p.x = fresh.x;
          p.y = fresh.y;
          p.life = fresh.life;
          p.pts.length = 0; // no streak from the old position to the new one
        }

        p.pts.push(p.x, p.y);
        if (p.pts.length > TAIL * 2) p.pts.splice(0, p.pts.length - TAIL * 2);
      }
    };

    // Trails are stroked in a few batched bands rather than per particle, so a
    // frame costs a handful of paths no matter how many particles are alive.
    const BANDS = 4;
    const bandAlpha = [0.18, 0.42, 0.7, 1];

    const paint = () => {
      ctx.clearRect(0, 0, width, height);
      ctx.strokeStyle = stroke();
      ctx.lineWidth = 1;
      ctx.lineCap = 'round';

      for (let b = 0; b < BANDS; b++) {
        ctx.globalAlpha = bandAlpha[b];
        ctx.beginPath();
        for (const p of particles) {
          const segs = p.pts.length / 2 - 1;
          if (segs < 1) continue;
          const from = Math.floor((segs * b) / BANDS);
          const to = Math.floor((segs * (b + 1)) / BANDS);
          for (let i = from; i < to; i++) {
            ctx.moveTo(p.pts[i * 2], p.pts[i * 2 + 1]);
            ctx.lineTo(p.pts[i * 2 + 2], p.pts[i * 2 + 3]);
          }
        }
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    };

    /** One whole frame. Kept free of scheduling so the static reduced-motion
     *  render can drive it directly. */
    const advance = (time: number) => {
      simulate(time * 0.00006);
      paint();
    };

    const step = (time: number) => {
      if (!running) return;
      advance(time);
      raf = requestAnimationFrame(step);
    };

    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    resize();

    if (reduced) {
      // Walk the field forward without painting, then draw a single frame, so the
      // still image has the same texture as the live one and nothing is scheduled.
      running = false;
      for (let i = 0; i < 400; i++) simulate(i * 16 * 0.00006);
      paint();
    } else {
      raf = requestAnimationFrame(step);
    }

    // Don't burn frames on a tab nobody is looking at.
    const onVisibility = () => {
      if (reduced) return;
      if (document.hidden) {
        running = false;
        cancelAnimationFrame(raf);
      } else if (!running) {
        running = true;
        raf = requestAnimationFrame(step);
      }
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      running = false;
      cancelAnimationFrame(raf);
      observer.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  return <canvas ref={canvasRef} aria-hidden className={className} />;
}
