// Builds the three SVGs in this folder from plain data. Node standard library only.
//
//   node assets/make.mjs
//
// Inputs: assets/commits-daily.json (one row per day, { date, commits }, counts only; a copy of
// src/data/commits-daily.json from the jaysueno.com repo, counted November 7, 2026). The merged
// pull request count and the co-author share are not in that file; they are the numbers the
// jaysueno.com /code page states for the same date, set below.
//
// Every shape is a filled rect, circle or polygon and every label is a plain <text>, so the files
// render the same in a browser and in ImageMagick's built-in SVG reader.

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));

const NAVY = '#001B3B';
const SAND = '#EDE7DC';
const TERRA = '#8C5348';
const HEAD = '#F2EDE2';
const SECOND = '#D8D3CA';
const SERIF = "Georgia, 'Playfair Display', serif";
const SANS = "-apple-system, 'Helvetica Neue', Helvetica, Arial, sans-serif";

const START = '2026-01-01';
const END = '2026-11-07';
const MERGED_PRS = 3168;
const COAUTHOR_SHARE = '84%';

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const fmt = (n) => n.toLocaleString('en-US');
const r1 = (n) => Math.round(n * 10) / 10;

function rect(x, y, w, h, fill, extra = '') {
  return `<rect x="${r1(x)}" y="${r1(y)}" width="${r1(w)}" height="${r1(h)}" fill="${fill}"${extra ? ' ' + extra : ''}/>`;
}

function text(x, y, s, { size = 16, family = SANS, fill = SECOND, weight, anchor } = {}) {
  const a = [`x="${r1(x)}"`, `y="${r1(y)}"`, `font-family="${family}"`, `font-size="${size}"`, `fill="${fill}"`];
  if (weight) a.push(`font-weight="${weight}"`);
  if (anchor) a.push(`text-anchor="${anchor}"`);
  return `<text ${a.join(' ')}>${esc(s)}</text>`;
}

// A 1px border drawn as two filled rects, so no renderer has to draw a stroke.
function frame(x, y, w, h, outer, inner) {
  return rect(x, y, w, h, outer) + rect(x + 1, y + 1, w - 2, h - 2, inner);
}

function arrow(x1, x2, y, color = TERRA) {
  const head = 14;
  return rect(x1, y - 2, x2 - x1 - head + 1, 4, color) +
    `<polygon points="${r1(x2 - head)},${r1(y - 9)} ${r1(x2)},${r1(y)} ${r1(x2 - head)},${r1(y + 9)}" fill="${color}"/>`;
}

function svg(w, h, title, desc, body) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-labelledby="t d">\n` +
    `<title id="t">${esc(title)}</title>\n<desc id="d">${esc(desc)}</desc>\n${body.join('\n')}\n</svg>\n`;
}

function write(name, content) {
  if (content.includes(String.fromCharCode(0x2014))) throw new Error(`${name}: em dash in output`);
  writeFileSync(join(HERE, name), content);
  console.log(`wrote assets/${name} (${content.length} bytes)`);
}

// ---------- data ----------
const all = JSON.parse(readFileSync(process.argv[2] || join(HERE, 'commits-daily.json'), 'utf8'));
const days = all.filter((d) => d.date >= START && d.date <= END);
if (days.length !== 311 || days[0].date !== START || days.at(-1).date !== END) {
  throw new Error(`expected 311 days from ${START} to ${END}, got ${days.length}`);
}
const total = days.reduce((s, d) => s + d.commits, 0);
const active = days.filter((d) => d.commits > 0).length;
const busiest = Math.max(...days.map((d) => d.commits));
let streak = 0;
let run = 0;
for (const d of days) {
  run = d.commits > 0 ? run + 1 : 0;
  streak = Math.max(streak, run);
}
const firstActive = days.findIndex((d) => d.commits > 0);
const span = days.length - firstActive;
const caption = `${fmt(total)} commits across ${active} active days. Longest streak ${streak} days. Busiest day ${busiest}.`;

// ---------- paddle-2026.svg: one mark per day ----------
{
  const W = 1200;
  const H = 440;
  const pitch = 23;
  const mark = 18;
  const lead = new Date(`${START}T12:00:00Z`).getUTCDay();
  const weeks = Math.ceil((days.length + lead) / 7);
  const x0 = 1200 - 60 - weeks * pitch;
  const y0 = 166;
  const level = (c) => (c === 0 ? 0 : c < 8 ? 1 : c < 20 ? 2 : c < 40 ? 3 : 4);
  const alpha = [0.1, 0.32, 0.56, 0.8, 1];
  const body = [frame(0, 0, W, H, SAND, NAVY)];
  body.push(text(60, 70, 'The paddle, in commits. 2026.', { size: 36, family: SERIF, fill: HEAD }));
  body.push(text(60, 104, 'One mark per day, January 1 to November 7. Before January 11, nothing.', { size: 17 }));
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov'];
  days.forEach((d, i) => {
    if (d.date.slice(8) === '01') {
      const col = Math.floor((i + lead) / 7);
      body.push(text(x0 + col * pitch, y0 - 12, months[Number(d.date.slice(5, 7)) - 1], { size: 14 }));
    }
  });
  [['Mon', 1], ['Wed', 3], ['Fri', 5]].forEach(([label, row]) => {
    body.push(text(x0 - 10, y0 + row * pitch + mark / 2 + 5, label, { size: 13, anchor: 'end' }));
  });
  days.forEach((d, i) => {
    const n = i + lead;
    const a = alpha[level(d.commits)];
    body.push(rect(x0 + Math.floor(n / 7) * pitch, y0 + (n % 7) * pitch, mark, mark, SAND,
      `rx="3"${a < 1 ? ` fill-opacity="${a}"` : ''}`));
  });
  body.push(text(60, 376, caption, { size: 24, fill: HEAD, weight: 700 }));
  const legend = [['0', 0], ['1 to 7', 1], ['8 to 19', 2], ['20 to 39', 3], ['40 or more', 4]];
  let lx = 60;
  body.push(text(lx, 413, 'Commits in a day:', { size: 14 }));
  lx += 132;
  for (const [label, lv] of legend) {
    const a = alpha[lv];
    body.push(rect(lx, 400, 16, 16, SAND, `rx="3"${a < 1 ? ` fill-opacity="${a}"` : ''}`));
    body.push(text(lx + 23, 413, label, { size: 14 }));
    lx += 23 + label.length * 8 + 26;
  }
  write('paddle-2026.svg', svg(W, H, 'The paddle, in commits. 2026.',
    `A grid with one mark per day of 2026 from January 1 to November 7, brighter for more commits: ${fmt(total)} commits across ${active} active days, a longest streak of ${streak} days and a busiest day of ${busiest}.`, body));
}

// ---------- 2026-in-commits.svg: four tiles ----------
{
  const W = 1200;
  const H = 300;
  const tiles = [
    [fmt(total), ['commits on main branches']],
    [fmt(MERGED_PRS), ['merged pull requests']],
    [COAUTHOR_SHARE, ['with a Claude', 'co-author line']],
    [String(active), [`active days of ${span}`]],
  ];
  const body = [frame(0, 0, W, H, NAVY, SAND)];
  body.push(text(40, 58, '2026, in commits', { size: 30, family: SERIF, fill: NAVY }));
  body.push(text(40, 88, 'Counted November 7, 2026, across sixteen private repos.', { size: 16, fill: NAVY }));
  const gap = 20;
  const tw = (W - 80 - gap * 3) / 4;
  tiles.forEach(([value, lines], i) => {
    const x = 40 + i * (tw + gap);
    body.push(rect(x, 112, tw, 152, NAVY));
    body.push(text(x + 24, 188, value, { size: 60, fill: HEAD, weight: 700 }));
    lines.forEach((line, j) => body.push(text(x + 24, 222 + j * 22, line, { size: 17 })));
  });
  write('2026-in-commits.svg', svg(W, H, '2026, in commits',
    `Four tiles: ${fmt(total)} commits, ${fmt(MERGED_PRS)} merged pull requests, ${COAUTHOR_SHARE} with a Claude co-author line, and ${active} active days of ${span}, counted November 7, 2026.`, body));
}

// ---------- how-i-build.svg: five steps ----------
{
  const W = 1200;
  const H = 360;
  const steps = [
    ['Design', ['Jay designs', 'and reviews']],
    ['Write', ['Agents write', 'nearly all of it']],
    ['Check', ['A deterministic', 'gate checks']],
    ['Approve', ['A human approves', 'money, messages', 'and health data']],
    ['Verify', ['The live object', 'is verified']],
  ];
  const body = [frame(0, 0, W, H, SAND, NAVY)];
  body.push(text(40, 64, 'How I build', { size: 34, family: SERIF, fill: HEAD }));
  body.push(text(40, 96, 'Functions decide and fetch. The model phrases.', { size: 17 }));
  const gap = 44;
  const bw = (W - 80 - gap * 4) / 5;
  const by = 128;
  const bh = 192;
  steps.forEach(([head, lines], i) => {
    const x = 40 + i * (bw + gap);
    body.push(frame(x, by, bw, bh, SAND, NAVY));
    body.push(text(x + 20, by + 38, String(i + 1), { size: 16, fill: SECOND }));
    body.push(text(x + 20, by + 78, head, { size: 28, family: SERIF, fill: HEAD }));
    lines.forEach((line, j) => body.push(text(x + 20, by + 114 + j * 24, line, { size: 17 })));
    if (i < steps.length - 1) body.push(arrow(x + bw + 6, x + bw + gap - 6, by + bh / 2));
  });
  write('how-i-build.svg', svg(W, H, 'How I build',
    'Five steps from left to right: Jay designs and reviews, agents write, a deterministic gate checks, a human approves money, messages and health data, and the live object is verified.', body));
}

console.log(caption);
