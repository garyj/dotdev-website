// A made-up leasing market drawn as a cadastral lot map. Each lot is shaded by
// demand: slow-moving precincts, a little per-lot noise, heat left by the
// pointer, and rings of heat that spread out from every signed lease.

const BANDS = 8;
const HOT = BANDS;
const RING_SPEED = 560;
const RING_WIDTH = 46;
const RING_LIFE = 2.4;
const INTRO_LIFE = 1.5;
const HEAT_RADIUS = 130;
const HEAT_DECAY = 1.3;
const STILL_T = 7.3;

type Rect = { x: number; y: number; w: number; h: number };
type Ring = { x: number; y: number; t0: number };

function mulberry32(seed: number) {
	return () => {
		seed |= 0;
		seed = (seed + 0x6d2b79f5) | 0;
		let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

function hits(r: Rect, clears: Rect[]) {
	return clears.some((c) => r.x < c.x + c.w && r.x + r.w > c.x && r.y < c.y + c.h && r.y + r.h > c.y);
}

/** Lays out street blocks and splits each into lots the way a subdivision does. */
function subdivide(width: number, height: number, clears: Rect[]) {
	const rand = mulberry32(2022);
	const u = Math.min(1.15, Math.max(0.62, width / 1440));
	const lots: Rect[] = [];

	const strip = (length: number, min: number, spread: number, every: number) => {
		const out: [number, number][] = [];
		let p = -rand() * 50 * u;
		for (let i = 0; p < length; i++) {
			const size = (min + rand() * spread) * u;
			out.push([p, size]);
			p += size + (i % every === every - 1 ? 17 : 7) * u;
		}
		return out;
	};
	const cols = strip(width, 56, 62, 4);
	const rows = strip(height, 40, 50, 3);

	const run = (r: Rect, along: 'x' | 'y') => {
		const total = along === 'x' ? r.w : r.h;
		let p = 0;
		while (p < total - 0.5) {
			const wide = rand() < 0.14;
			let f = (wide ? 19 + rand() * 15 : 7 + rand() * 8) * u;
			if (total - p - f < 6 * u) f = total - p;
			lots.push(along === 'x' ? { x: r.x + p, y: r.y, w: f, h: r.h } : { x: r.x, y: r.y + p, w: r.w, h: f });
			p += f;
		}
	};

	for (const [x, w] of cols) {
		for (const [y, h] of rows) {
			const block = { x, y, w, h };
			if (y + h > height || hits(block, clears)) continue;
			const kind = rand();
			const along = w >= h ? 'x' : 'y';
			if (kind < 0.07) {
				lots.push(block);
			} else if (kind < 0.2) {
				const cut = 0.35 + rand() * 0.3;
				if (along === 'x') {
					lots.push({ x, y, w: w * cut, h }, { x: x + w * cut, y, w: w * (1 - cut), h });
				} else {
					lots.push({ x, y, w, h: h * cut }, { x, y: y + h * cut, w, h: h * (1 - cut) });
				}
			} else {
				const depth = along === 'x' ? h : w;
				if (depth > 40 * u) {
					const back = 0.42 + rand() * 0.16;
					if (along === 'x') {
						run({ x, y, w, h: h * back }, 'x');
						run({ x, y: y + h * back, w, h: h * (1 - back) }, 'x');
					} else {
						run({ x, y, w: w * back, h }, 'y');
						run({ x: x + w * back, y, w: w * (1 - back), h }, 'y');
					}
				} else {
					run(block, along);
				}
			}
		}
	}
	return { lots, u };
}

/** Starts the map inside `host`; returns a function that stops it. */
export function startMarket(host: HTMLElement, canvas: HTMLCanvasElement): () => void {
	const ctx = canvas.getContext('2d', { alpha: true });
	if (!ctx) return () => {};

	const css = getComputedStyle(document.documentElement);
	const colours = Array.from({ length: BANDS + 1 }, (_, i) =>
		css.getPropertyValue(i === HOT ? '--lot-hot' : `--lot-${i}`).trim()
	);
	const reduced = matchMedia('(prefers-reduced-motion: reduce)');

	let width = 0;
	let height = 0;
	let unit = 1;
	let count = 0;
	let px = new Float32Array(0);
	let py = new Float32Array(0);
	let pw = new Float32Array(0);
	let ph = new Float32Array(0);
	let cx = new Float32Array(0);
	let cy = new Float32Array(0);
	let noise = new Float32Array(0);
	let heat = new Float32Array(0);
	let band = new Uint8Array(0);
	let origin = { x: 0, y: 0 };

	let t = 0;
	let introAt = -1;
	let rings: Ring[] = [];
	let pointer: { x: number; y: number } | null = null;
	let frame = 0;
	let last = 0;
	let onScreen = true;
	let stopped = false;

	function build() {
		const box = host.getBoundingClientRect();
		width = box.width;
		height = box.height;
		const dpr = Math.min(window.devicePixelRatio || 1, 2);
		canvas.width = Math.round(width * dpr);
		canvas.height = Math.round(height * dpr);

		const pad = 12;
		const clears = [...host.querySelectorAll<HTMLElement>('[data-clear]')].map((el) => {
			const r = el.getBoundingClientRect();
			return { x: r.left - box.left - pad, y: r.top - box.top - pad, w: r.width + pad * 2, h: r.height + pad * 2 };
		});
		const name = host.querySelector('h1')?.getBoundingClientRect();
		origin = name
			? { x: name.left - box.left + name.width * 0.5, y: name.top - box.top + name.height * 0.5 }
			: { x: width / 2, y: height / 2 };

		const city = subdivide(width, height, clears);
		unit = city.u;
		count = city.lots.length;
		px = new Float32Array(count);
		py = new Float32Array(count);
		pw = new Float32Array(count);
		ph = new Float32Array(count);
		cx = new Float32Array(count);
		cy = new Float32Array(count);
		noise = new Float32Array(count);
		heat = new Float32Array(count);
		band = new Uint8Array(count);
		const rand = mulberry32(31);
		const gap = Math.max(1, Math.round(dpr));
		city.lots.forEach((l, i) => {
			const x0 = Math.round(l.x * dpr);
			const y0 = Math.round(l.y * dpr);
			px[i] = x0;
			py[i] = y0;
			pw[i] = Math.max(1, Math.round((l.x + l.w) * dpr) - x0 - gap);
			ph[i] = Math.max(1, Math.round((l.y + l.h) * dpr) - y0 - gap);
			cx[i] = l.x + l.w / 2;
			cy[i] = l.y + l.h / 2;
			noise[i] = (rand() + rand() - 1) * 0.13;
		});
	}

	// Four precincts drift on slow Lissajous paths; their sum is base demand.
	const precincts = [
		{ bx: 0.72, by: 0.34, ax: 0.14, ay: 0.12, wx: 0.07, wy: 0.05, r: 0.13, a: 0.74 },
		{ bx: 0.5, by: 0.7, ax: 0.2, ay: 0.1, wx: 0.045, wy: 0.08, r: 0.11, a: 0.46 },
		{ bx: 0.22, by: 0.2, ax: 0.12, ay: 0.14, wx: 0.06, wy: 0.035, r: 0.1, a: 0.42 },
		{ bx: 0.92, by: 0.82, ax: 0.08, ay: 0.12, wx: 0.05, wy: 0.06, r: 0.12, a: 0.4 }
	];

	function paint(dt: number) {
		const span = Math.max(width, height);
		const field = precincts.map((p, k) => ({
			x: width * (p.bx + p.ax * Math.sin(t * p.wx * 6.283 + k * 1.7)),
			y: height * (p.by + p.ay * Math.cos(t * p.wy * 6.283 + k * 2.3)),
			inv: 1 / (2 * (p.r * span) ** 2),
			a: p.a
		}));

		const decay = Math.exp(-dt / HEAT_DECAY);
		const reach = HEAT_RADIUS * unit;
		const intro = introAt < 0 ? 1 : (t - introAt) / INTRO_LIFE;
		const eased = 1 - (1 - Math.min(1, intro)) ** 3;
		const reveal = eased * Math.hypot(Math.max(origin.x, width - origin.x), Math.max(origin.y, height - origin.y)) * 1.05;
		const edge = height * 0.16;

		for (let i = 0; i < count; i++) {
			const x = cx[i];
			const y = cy[i];
			let h = heat[i] * decay;

			if (pointer) {
				const d = Math.hypot(x - pointer.x, y - pointer.y);
				if (d < reach) {
					const near = 1 - d / reach;
					h = Math.max(h, Math.min(0.1 + 0.5 * near, h + near * dt * 2.2));
				}
			}
			for (const ring of rings) {
				const age = t - ring.t0;
				const off = Math.abs(Math.hypot(x - ring.x, y - ring.y) - age * RING_SPEED * unit);
				if (off < RING_WIDTH * unit) h = Math.max(h, (1 - age / RING_LIFE) * (1 - off / (RING_WIDTH * unit)) * 0.95);
			}
			heat[i] = h;

			if (intro < 1 && Math.hypot(x - origin.x, y - origin.y) > reveal) {
				band[i] = 255;
				continue;
			}

			let v = 0.06 + noise[i];
			for (const f of field) {
				const dx = x - f.x;
				const dy = y - f.y;
				v += f.a * Math.exp(-(dx * dx + dy * dy) * f.inv);
			}
			const sink = height - y;
			if (sink < edge) v *= sink / edge;
			v += h;
			band[i] = v >= 1 ? HOT : Math.max(0, Math.min(BANDS - 1, Math.floor(v * BANDS)));
		}

		ctx!.clearRect(0, 0, canvas.width, canvas.height);
		for (let b = 0; b <= HOT; b++) {
			ctx!.fillStyle = colours[b];
			ctx!.beginPath();
			for (let i = 0; i < count; i++) if (band[i] === b) ctx!.rect(px[i], py[i], pw[i], ph[i]);
			ctx!.fill();
		}
	}

	function tick(now: number) {
		frame = 0;
		const dt = Math.min(0.05, (now - last) / 1000 || 0);
		last = now;
		t += dt;
		rings = rings.filter((r) => t - r.t0 < RING_LIFE);
		paint(dt);
		schedule();
	}

	const running = () => !stopped && !reduced.matches && onScreen && !document.hidden;

	function schedule() {
		if (!frame && running()) {
			frame = requestAnimationFrame(tick);
		}
	}

	function wake() {
		if (frame) return;
		last = performance.now();
		schedule();
	}

	function still() {
		t = STILL_T;
		introAt = -1;
		heat.fill(0);
		rings = [{ x: width * 0.66, y: height * 0.34, t0: t - 0.3 }];
		paint(0);
		rings = [];
	}

	function local(e: PointerEvent) {
		const box = host.getBoundingClientRect();
		return { x: e.clientX - box.left, y: e.clientY - box.top };
	}
	function move(e: PointerEvent) {
		if (e.pointerType === 'mouse') pointer = local(e);
	}
	function leave() {
		pointer = null;
	}
	function down(e: PointerEvent) {
		if ((e.target as Element).closest('a') || reduced.matches) return;
		rings.push({ ...local(e), t0: t });
		if (rings.length > 6) rings.shift();
		wake();
	}

	let resizeTimer = 0;
	const resized = new ResizeObserver(() => {
		clearTimeout(resizeTimer);
		resizeTimer = window.setTimeout(() => {
			build();
			if (reduced.matches) still();
			else paint(0);
		}, 120);
	});
	const seen = new IntersectionObserver(([entry]) => {
		onScreen = entry.isIntersecting;
		wake();
	});
	const visibility = () => wake();
	const motionChange = () => (reduced.matches ? still() : wake());

	const fonts = Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 700))]);
	fonts.then(() => {
		if (stopped) return;
		build();
		if (reduced.matches) {
			still();
		} else {
			t = STILL_T - INTRO_LIFE;
			introAt = t;
			rings.push({ ...origin, t0: t });
			wake();
		}
		resized.observe(host);
		host.querySelectorAll('[data-clear]').forEach((el) => resized.observe(el));
		seen.observe(canvas);
	});

	host.addEventListener('pointermove', move);
	host.addEventListener('pointerleave', leave);
	host.addEventListener('pointerdown', down);
	document.addEventListener('visibilitychange', visibility);
	reduced.addEventListener('change', motionChange);

	return () => {
		stopped = true;
		cancelAnimationFrame(frame);
		clearTimeout(resizeTimer);
		resized.disconnect();
		seen.disconnect();
		host.removeEventListener('pointermove', move);
		host.removeEventListener('pointerleave', leave);
		host.removeEventListener('pointerdown', down);
		document.removeEventListener('visibilitychange', visibility);
		reduced.removeEventListener('change', motionChange);
	};
}
