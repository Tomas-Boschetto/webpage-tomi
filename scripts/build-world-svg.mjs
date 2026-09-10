/**
 * Regenerates src/assets/maps/world.svg from Natural Earth 110m.
 * Run: node scripts/build-world-svg.mjs
 */
import fs from 'node:fs';
import https from 'node:https';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, '../src/assets/maps/world.svg');
const URL =
	'https://cdn.jsdelivr.net/gh/nvkelso/natural-earth-vector@v5.1.1/geojson/ne_110m_admin_0_countries.geojson';

const W = 1000;
const H = 500;
const PAD = 8;

function fetchJson(u) {
	return new Promise((resolve, reject) => {
		https
			.get(u, (res) => {
				if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
					return fetchJson(res.headers.location).then(resolve, reject);
				}
				let data = '';
				res.on('data', (c) => (data += c));
				res.on('end', () => {
					try {
						resolve(JSON.parse(data));
					} catch (e) {
						reject(e);
					}
				});
			})
			.on('error', reject);
	});
}

function project(lon, lat) {
	const x = PAD + ((lon + 180) / 360) * (W - 2 * PAD);
	const y = PAD + ((90 - lat) / 180) * (H - 2 * PAD);
	return [x, y];
}

function ringToPath(ring) {
	if (!ring || ring.length < 2) return '';
	let d = '';
	for (let i = 0; i < ring.length; i++) {
		const [lon, lat] = ring[i];
		const [x, y] = project(lon, lat);
		d += (i === 0 ? 'M' : 'L') + x.toFixed(2) + ' ' + y.toFixed(2);
	}
	return d + 'Z';
}

function coordsToPath(coords, type) {
	const parts = [];
	if (type === 'Polygon') {
		for (const ring of coords) parts.push(ringToPath(ring));
	} else if (type === 'MultiPolygon') {
		for (const poly of coords) {
			for (const ring of poly) parts.push(ringToPath(ring));
		}
	}
	return parts.join('');
}

function countryCode(props) {
	const a2 = String(props.ISO_A2 || '').toUpperCase();
	if (a2 && a2 !== '-99') return a2;
	const wb = String(props.WB_A2 || '').toUpperCase();
	if (wb && wb !== '-99') return wb;
	const a3 = String(props.ADM0_A3 || props.ISO_A3 || '').toUpperCase();
	const map = { FRA: 'FR', NOR: 'NO', KOS: 'XK', SOL: 'SB' };
	return map[a3] || '';
}

const neo = await fetchJson(URL);
const paths = [];
const seen = new Set();

for (const f of neo.features) {
	const props = f.properties || {};
	const code = countryCode(props);
	const name = String(props.NAME || props.ADMIN || code).replace(/"/g, '&quot;');
	const d = coordsToPath(f.geometry.coordinates, f.geometry.type);
	if (!d) continue;
	const idAttr = code ? ` id="${code}"` : '';
	const cls = code ? 'country' : 'country country--unnamed';
	if (code && seen.has(code)) {
		const idx = paths.findIndex((p) => p.code === code);
		if (idx >= 0) paths[idx].d += d;
		continue;
	}
	if (code) seen.add(code);
	paths.push({ code, name, d, cls, idAttr });
}

const body = paths
	.map((p) => `<path${p.idAttr} class="${p.cls}" data-name="${p.name}" d="${p.d}" />`)
	.join('\n  ');

const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="World map">
  <!-- Country boundaries derived from Natural Earth 110m (public domain) -->
  <rect class="ocean" width="${W}" height="${H}" />
  ${body}
</svg>
`;

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, svg);
console.log(`Wrote ${OUT} (${seen.size} countries)`);
