// ============================================================
// Floating-dot pawn — a decorative particle field for the Form Book.
//
// A chess pawn silhouette is drawn off-screen, its interior is sampled
// into a grid of "home" points, and each point becomes a particle that
// (1) assembles from a scattered burst, then (2) drifts forever in a
// small Lissajous wander around its home — so the dots are never static
// yet always keep the pawn's shape.
// ============================================================

const TAU = Math.PI * 2;

// Palette — board green, with a lighter mid-green sprinkled for life.
const INK = [
    'rgba(47, 93, 69, ALPHA)',   // --green
    'rgba(62, 122, 90, ALPHA)',  // --green-mid
];

// Off-screen silhouette resolution (logical px). Aspect ≈ a Staunton pawn.
const OW = 220;
const OH = 300;
const SAMPLE_GAP = 9;   // grid step when sampling — controls dot count/density

let canvas = null;
let ctx = null;
let dpr = 1;

let particles = [];
let cssW = 0;
let cssH = 0;

let running = false;        // start() called and not yet stopped
let rafId = 0;
let formationStart = 0;     // ms timestamp the current assemble began
let reduced = false;        // prefers-reduced-motion
let listenersBound = false;
let resizeTimer = 0;

const FORMATION_MS = 1300;

// —— Build the pawn silhouette and return interior sample points ——
function samplePawnPoints() {
    const off = document.createElement('canvas');
    off.width = OW;
    off.height = OH;
    const octx = off.getContext('2d');
    const cx = OW / 2;

    octx.fillStyle = '#000';

    // Head — the cap.
    octx.beginPath();
    octx.arc(cx, 80, 45, 0, TAU);
    octx.fill();

    // Neck + collar disc under the head.
    octx.beginPath();
    octx.ellipse(cx, 132, 33, 15, 0, 0, TAU);
    octx.fill();
    octx.fillRect(cx - 16, 120, 32, 36);

    // Body — a flared bell from the neck down to the foot.
    octx.beginPath();
    octx.moveTo(cx - 16, 152);
    octx.bezierCurveTo(cx - 20, 192, cx - 74, 206, cx - 64, 250);
    octx.lineTo(cx + 64, 250);
    octx.bezierCurveTo(cx + 74, 206, cx + 20, 192, cx + 16, 152);
    octx.closePath();
    octx.fill();

    // Ring above the base (the classic torus).
    octx.beginPath();
    octx.ellipse(cx, 250, 66, 13, 0, 0, TAU);
    octx.fill();

    // Base — a wide rounded trapezoid foot.
    octx.beginPath();
    octx.moveTo(cx - 58, 252);
    octx.lineTo(cx + 58, 252);
    octx.lineTo(cx + 88, 288);
    octx.lineTo(cx - 88, 288);
    octx.closePath();
    octx.fill();

    // Read alpha on a jittered grid → interior points.
    const data = octx.getImageData(0, 0, OW, OH).data;
    const pts = [];
    const half = SAMPLE_GAP / 2;
    for (let y = half; y < OH; y += SAMPLE_GAP) {
        for (let x = half; x < OW; x += SAMPLE_GAP) {
            const jx = x + (Math.random() - 0.5) * SAMPLE_GAP * 0.6;
            const jy = y + (Math.random() - 0.5) * SAMPLE_GAP * 0.6;
            const px = Math.min(OW - 1, Math.max(0, Math.round(jx)));
            const py = Math.min(OH - 1, Math.max(0, Math.round(jy)));
            if (data[(py * OW + px) * 4 + 3] > 128) {
                pts.push({ x: jx, y: jy });
            }
        }
    }
    return pts;
}

// —— Lay out particles for the current canvas size ——
function build() {
    const pts = samplePawnPoints();

    // Fit the silhouette into the canvas, preserving aspect, with margin.
    const scale = Math.min(cssW / OW, cssH / OH) * 0.92;
    const drawW = OW * scale;
    const drawH = OH * scale;
    const ox = (cssW - drawW) / 2;
    const oy = (cssH - drawH) / 2;
    const spacing = SAMPLE_GAP * scale;

    particles = pts.map((p) => {
        const homeX = ox + p.x * scale;
        const homeY = oy + p.y * scale;
        // Scatter origin: a soft burst from the canvas centre.
        const ang = Math.random() * TAU;
        const rad = Math.max(cssW, cssH) * (0.25 + Math.random() * 0.55);
        return {
            homeX,
            homeY,
            startX: cssW / 2 + Math.cos(ang) * rad,
            startY: cssH / 2 + Math.sin(ang) * rad * 0.7,
            // Two wander octaves, each its own freq + phase.
            ax: spacing * (0.18 + Math.random() * 0.16),
            ay: spacing * (0.18 + Math.random() * 0.16),
            sx: 0.3 + Math.random() * 0.6,
            sy: 0.3 + Math.random() * 0.6,
            phx: Math.random() * TAU,
            phy: Math.random() * TAU,
            delay: Math.random() * 0.35,           // staggered arrival (0..0.35 of formation)
            r: scale * (0.7 + Math.random() * 0.7), // dot radius (css px)
            color: INK[Math.random() < 0.78 ? 0 : 1],
            alpha: 0.32 + Math.random() * 0.42,
        };
    });
}

function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }

function draw(now) {
    ctx.clearRect(0, 0, cssW, cssH);

    const tSec = now / 1000;
    const elapsed = now - formationStart;

    for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        // Wander offset around home.
        const wx = Math.cos(tSec * p.sx + p.phx) * p.ax;
        const wy = Math.sin(tSec * p.sy + p.phy) * p.ay;

        let x, y, a = p.alpha;
        if (reduced) {
            x = p.homeX;
            y = p.homeY;
        } else {
            // Per-particle formation progress (with stagger).
            const span = FORMATION_MS * (1 - p.delay);
            const fp = easeOutCubic(Math.min(1, Math.max(0, (elapsed - FORMATION_MS * p.delay) / span)));
            const baseX = p.startX + (p.homeX - p.startX) * fp;
            const baseY = p.startY + (p.homeY - p.startY) * fp;
            x = baseX + wx * fp;
            y = baseY + wy * fp;
            a = p.alpha * fp;
        }

        ctx.beginPath();
        ctx.arc(x, y, p.r, 0, TAU);
        ctx.fillStyle = p.color.replace('ALPHA', a.toFixed(3));
        ctx.fill();
    }
}

function loop(now) {
    if (!running) return;
    if (document.hidden) { rafId = requestAnimationFrame(loop); return; }
    draw(now);
    rafId = requestAnimationFrame(loop);
}

// —— Measure the (visible) canvas and set up the backing store ——
function measureAndSetup() {
    const rect = canvas.getBoundingClientRect();
    if (rect.width < 8 || rect.height < 8) return false; // not visible yet

    dpr = Math.min(window.devicePixelRatio || 1, 2);
    cssW = rect.width;
    cssH = rect.height;
    canvas.width = Math.round(cssW * dpr);
    canvas.height = Math.round(cssH * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    build();
    return true;
}

// Wait until the canvas is laid out (the view fades in ~a frame after nav).
let readyTries = 0;
function beginWhenReady() {
    if (!running) return;
    if (measureAndSetup()) {
        formationStart = performance.now();
        if (reduced) {
            draw(formationStart);          // one static paint
        } else {
            rafId = requestAnimationFrame(loop);
        }
        return;
    }
    if (readyTries++ < 120) {
        rafId = requestAnimationFrame(beginWhenReady);
    }
}

function onResize() {
    if (!running) return;
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
        if (!running) return;
        readyTries = 0;
        cancelAnimationFrame(rafId);
        beginWhenReady();       // re-measure, rebuild, re-assemble
    }, 200);
}

function bindListeners() {
    if (listenersBound) return;
    listenersBound = true;
    window.addEventListener('resize', onResize);
}

export const pawnParticles = {
    /** Start (or re-assemble) the pawn. Safe to call repeatedly. */
    start() {
        canvas = document.getElementById('form-pawn-canvas');
        if (!canvas) return;
        if (!ctx) ctx = canvas.getContext('2d');
        reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        bindListeners();
        running = true;
        readyTries = 0;
        cancelAnimationFrame(rafId);
        beginWhenReady();
    },

    /** Stop the loop and free the frame (called when leaving the view). */
    stop() {
        running = false;
        cancelAnimationFrame(rafId);
    },
};
