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
const HEAT_DECAY = 0.7;
const STILL_PHASE = 7.3;
/** Seconds without input before the precincts slow to a stop and frames stop. */
const IDLE_AFTER = 4;
const SETTLE = 0.9;

type Point = [number, number];
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

/** Keeps the part of `poly` where nx*x + ny*y <= c (Sutherland-Hodgman, one edge). */
function clip(poly: Point[], nx: number, ny: number, c: number): Point[] {
	const out: Point[] = [];
	for (let i = 0; i < poly.length; i++) {
		const a = poly[i];
		const b = poly[(i + 1) % poly.length];
		const da = nx * a[0] + ny * a[1] - c;
		const db = nx * b[0] + ny * b[1] - c;
		if (da <= 0) out.push(a);
		if (da < 0 !== db < 0) {
			const k = da / (da - db);
			out.push([a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k]);
		}
	}
	return out;
}

function area(poly: Point[]) {
	let s = 0;
	for (let i = 0; i < poly.length; i++) {
		const a = poly[i];
		const b = poly[(i + 1) % poly.length];
		s += a[0] * b[1] - b[0] * a[1];
	}
	return Math.abs(s) / 2;
}

/**
 * Lays out a street grid with lanes, local streets, mains and one arterial
 * each way, splits each block into lots the way a subdivision does, then cuts
 * a diagonal avenue through the lots.
 */
function subdivide(width: number, height: number, view: number, clears: Rect[]) {
	const rand = mulberry32(2022);
	const u = Math.min(1.15, Math.max(0.62, width / 1440));
	const lots: Rect[] = [];

	const strip = (length: number, min: number, spread: number, arterial: number) => {
		const out: [number, number][] = [];
		let p = -rand() * 50 * u;
		let built = false;
		for (let i = 0; p < length; i++) {
			const size = (min + rand() * spread) * u;
			out.push([p, size]);
			p += size;
			let street = rand() < 0.28 ? 4 : 7;
			if (i % 4 === 3) street = 12;
			if (!built && p > arterial) {
				street = 26;
				built = true;
			}
			p += street * u;
		}
		return out;
	};
	const cols = strip(width, 48, 78, width * 0.58);
	const rows = strip(height, 38, 62, Math.min(height, view) * 0.52);

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

	// The avenue rises left to right through the first screen at about 31 degrees.
	const angle = (-31 * Math.PI) / 180;
	const nx = -Math.sin(angle);
	const ny = Math.cos(angle);
	const ox = width * 0.6;
	const oy = Math.min(height, view) * 0.62;
	const avenue = { nx, ny, c: nx * ox + ny * oy, half: 11 * u };

	return { lots, u, avenue };
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
	// Lot outlines in device pixels: vertex i of lot k is at verts[start[k] + 2i].
	let verts = new Float32Array(0);
	let start = new Uint32Array(0);
	let sides = new Uint8Array(0);
	let cx = new Float32Array(0);
	let cy = new Float32Array(0);
	let noise = new Float32Array(0);
	let heat = new Float32Array(0);
	let band = new Uint8Array(0);
	let order = new Uint32Array(0);
	let origin = { x: 0, y: 0 };

	let clock = 0;
	let phase = STILL_PHASE;
	let drift = 1;
	let lastInput = 0;
	let introAt = -1;
	let idle = false;
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

		const city = subdivide(width, height, window.innerHeight, clears);
		unit = city.u;
		const gap = Math.max(1, Math.round(dpr));
		const { nx, ny, c, half } = city.avenue;
		const pieces: Point[][] = [];
		for (const l of city.lots) {
			const x0 = Math.round(l.x * dpr);
			const y0 = Math.round(l.y * dpr);
			const x1 = Math.max(x0 + 1, Math.round((l.x + l.w) * dpr) - gap);
			const y1 = Math.max(y0 + 1, Math.round((l.y + l.h) * dpr) - gap);
			const rect: Point[] = [
				[x0, y0],
				[x1, y0],
				[x1, y1],
				[x0, y1]
			];
			for (const side of [
				clip(rect, nx, ny, (c - half) * dpr),
				clip(rect, -nx, -ny, -(c + half) * dpr)
			]) {
				if (side.length >= 3 && area(side) > 24 * dpr * dpr) pieces.push(side);
			}
		}

		count = pieces.length;
		start = new Uint32Array(count);
		sides = new Uint8Array(count);
		cx = new Float32Array(count);
		cy = new Float32Array(count);
		noise = new Float32Array(count);
		heat = new Float32Array(count);
		band = new Uint8Array(count);
		order = new Uint32Array(count);
		verts = new Float32Array(pieces.reduce((n, p) => n + p.length * 2, 0));
		const rand = mulberry32(31);
		let v = 0;
		pieces.forEach((poly, i) => {
			start[i] = v;
			sides[i] = poly.length;
			let sx = 0;
			let sy = 0;
			for (const [x, y] of poly) {
				verts[v++] = x;
				verts[v++] = y;
				sx += x;
				sy += y;
			}
			cx[i] = sx / poly.length / dpr;
			cy[i] = sy / poly.length / dpr;
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

	/** Shades every lot; returns the hottest pointer or ring heat left on the map. */
	function paint(dt: number) {
		const span = Math.max(width, height);
		const field = precincts.map((p, k) => ({
			x: width * (p.bx + p.ax * Math.sin(phase * p.wx * 6.283 + k * 1.7)),
			y: height * (p.by + p.ay * Math.cos(phase * p.wy * 6.283 + k * 2.3)),
			inv: 1 / (2 * (p.r * span) ** 2),
			a: p.a
		}));

		const decay = Math.exp(-dt / HEAT_DECAY);
		const reach = HEAT_RADIUS * unit;
		const intro = introAt < 0 ? 1 : (clock - introAt) / INTRO_LIFE;
		const eased = 1 - (1 - Math.min(1, intro)) ** 3;
		const reveal = eased * Math.hypot(Math.max(origin.x, width - origin.x), Math.max(origin.y, height - origin.y)) * 1.05;
		const edge = 180 * unit;
		const counts = new Uint32Array(HOT + 2);
		let hottest = 0;

		for (let i = 0; i < count; i++) {
			const x = cx[i];
			const y = cy[i];
			let h = heat[i] * decay;

			if (pointer && !idle) {
				const d = Math.hypot(x - pointer.x, y - pointer.y);
				if (d < reach) {
					const near = 1 - d / reach;
					h = Math.max(h, Math.min(0.1 + 0.5 * near, h + near * dt * 2.2));
				}
			}
			for (const ring of rings) {
				const age = clock - ring.t0;
				const off = Math.abs(Math.hypot(x - ring.x, y - ring.y) - age * RING_SPEED * unit);
				if (off < RING_WIDTH * unit) h = Math.max(h, (1 - age / RING_LIFE) * (1 - off / (RING_WIDTH * unit)) * 0.95);
			}
			heat[i] = h;
			if (h > hottest) hottest = h;

			if (intro < 1 && Math.hypot(x - origin.x, y - origin.y) > reveal) {
				band[i] = HOT + 1;
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
			const b = v >= 1 ? HOT : Math.max(0, Math.min(BANDS - 1, Math.floor(v * BANDS)));
			band[i] = b;
			counts[b]++;
		}

		const offsets = new Uint32Array(HOT + 1);
		for (let b = 1; b <= HOT; b++) offsets[b] = offsets[b - 1] + counts[b - 1];
		const fill = offsets.slice();
		for (let i = 0; i < count; i++) if (band[i] <= HOT) order[fill[band[i]]++] = i;

		const g = ctx!;
		g.clearRect(0, 0, canvas.width, canvas.height);
		for (let b = 0; b <= HOT; b++) {
			if (!counts[b]) continue;
			g.fillStyle = colours[b];
			g.beginPath();
			for (let k = offsets[b], end = offsets[b] + counts[b]; k < end; k++) {
				const i = order[k];
				let p = start[i];
				g.moveTo(verts[p], verts[p + 1]);
				for (let s = 1; s < sides[i]; s++) {
					p += 2;
					g.lineTo(verts[p], verts[p + 1]);
				}
				g.closePath();
			}
			g.fill();
		}
		return hottest;
	}

	function tick(now: number) {
		frame = 0;
		const dt = Math.min(0.05, (now - last) / 1000 || 0);
		last = now;
		clock += dt;
		rings = rings.filter((r) => clock - r.t0 < RING_LIFE);
		const introDone = introAt < 0 || clock - introAt >= INTRO_LIFE;
		idle = introDone && !rings.length && (now - lastInput) / 1000 > IDLE_AFTER;
		drift += ((idle ? 0 : 1) - drift) * (1 - Math.exp(-dt / SETTLE));
		phase += dt * drift;
		const hottest = paint(dt);
		if (idle && drift < 0.01 && hottest < 0.005) return;
		schedule();
	}

	const running = () => !stopped && !reduced.matches && onScreen && !document.hidden;

	function schedule() {
		if (!frame && running()) frame = requestAnimationFrame(tick);
	}

	function wake() {
		if (frame) return;
		last = performance.now();
		schedule();
	}

	function poke() {
		lastInput = performance.now();
		wake();
	}

	function still() {
		phase = STILL_PHASE;
		introAt = -1;
		heat.fill(0);
		rings = [{ x: width * 0.66, y: Math.min(height, window.innerHeight) * 0.55, t0: clock - 0.3 }];
		paint(0);
		rings = [];
	}

	function local(e: PointerEvent) {
		const box = host.getBoundingClientRect();
		return { x: e.clientX - box.left, y: e.clientY - box.top };
	}
	function move(e: PointerEvent) {
		if (e.pointerType !== 'mouse') return;
		pointer = local(e);
		poke();
	}
	function leave() {
		pointer = null;
	}
	function down(e: PointerEvent) {
		if ((e.target as Element).closest('a') || reduced.matches) return;
		rings.push({ ...local(e), t0: clock });
		if (rings.length > 6) rings.shift();
		poke();
	}

	let resizeTimer = 0;
	let lastWidth = 0;
	const resized = new ResizeObserver(() => {
		clearTimeout(resizeTimer);
		resizeTimer = window.setTimeout(() => {
			build();
			if (reduced.matches) still();
			else {
				paint(0);
				if (host.clientWidth !== lastWidth) poke();
			}
			lastWidth = host.clientWidth;
		}, 120);
	});
	const seen = new IntersectionObserver(([entry]) => {
		onScreen = entry.isIntersecting;
		wake();
	});
	const visibility = () => wake();
	const motionChange = () => (reduced.matches ? still() : poke());

	const fonts = Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 700))]);
	fonts.then(() => {
		if (stopped) return;
		build();
		lastWidth = host.clientWidth;
		if (reduced.matches) {
			still();
		} else {
			introAt = clock;
			rings.push({ ...origin, t0: clock });
			poke();
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
