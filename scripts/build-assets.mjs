// Generates README SVG assets (section headers, link buttons, activity heatmap)
// in light + dark variants. Usage: node scripts/build-assets.mjs [--activity-only]
import { writeFileSync, mkdirSync } from "node:fs";

const USER = "zhmdff";
const OUT = new URL("../assets/", import.meta.url);
mkdirSync(OUT, { recursive: true });

const THEMES = {
  dark: { bg: "#000000", fg: "#FFFFFF" },
  light: { bg: "#FFFFFF", fg: "#000000" },
};
const FONT = `'JetBrains Mono','SFMono-Regular',Consolas,Menlo,'Liberation Mono',monospace`;
const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const write = (name, svg) => writeFileSync(new URL(name, OUT), svg.replace(/\n\s*/g, ""));
const cross = (x, y, c) => `<path d="M${x - 6} ${y}H${x + 6}M${x} ${y - 6}V${y + 6}" stroke="${c}" stroke-width="1.2"/>`;

// ── Section headers ─────────────────────────────────────────────
const SECTIONS = [
  ["00", "ABOUT", "cat about.cs"],
  ["01", "STACK", "ls ~/stack"],
  ["02", "STATS", "git stats"],
  ["03", "ACTIVITY", "git log --graph"],
];

function section([num, title, cmd], { bg, fg }) {
  const W = 1000, H = 64, cy = 32;
  const label = `[ ${num} / ${title} ]`;
  const bw = label.length * 9.6 + 40;
  const bx = (W - bw) / 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
    <style>text{font-family:${FONT};fill:${fg}}.l{font-size:16px;font-weight:700;letter-spacing:1px}.m{font-size:10px;opacity:.45}</style>
    <rect width="${W}" height="${H}" fill="${bg}"/>
    <line x1="20" y1="${cy}" x2="${bx - 12}" y2="${cy}" stroke="${fg}" stroke-opacity=".6"/>
    <line x1="${bx + bw + 12}" y1="${cy}" x2="980" y2="${cy}" stroke="${fg}" stroke-opacity=".6"/>
    ${cross(20, cy, fg)}${cross(980, cy, fg)}
    <rect x="${bx}" y="${cy - 16}" width="${bw}" height="32" fill="${bg}" stroke="${fg}" stroke-width="1.5"/>
    <rect x="${bx - 4}" y="${cy - 4}" width="8" height="8" fill="${fg}"/>
    <rect x="${bx + bw - 4}" y="${cy - 4}" width="8" height="8" fill="${fg}"/>
    <text x="${W / 2}" y="${cy + 6}" text-anchor="middle" class="l">${label}</text>
    <text x="28" y="${cy - 10}" class="m">$ ${esc(cmd)}</text>
    <text x="972" y="${cy - 10}" text-anchor="end" class="m">${num}/03</text>
  </svg>`;
}

// ── Link buttons ────────────────────────────────────────────────
const LINKS = [
  ["web", "zhmdff.com"],
  ["linkedin", "linkedin"],
  ["twitter", "twitter"],
  ["instagram", "instagram"],
  ["email", "email"],
];

function button([key, value], { bg, fg }) {
  const W = Math.round(value.length * 8.4 + 44), H = 34;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
    <style>text{font-family:${FONT};font-size:14px;fill:${fg}}.k{font-weight:700}</style>
    <rect x=".75" y=".75" width="${W - 1.5}" height="${H - 1.5}" fill="${bg}" stroke="${fg}" stroke-width="1.5"/>
    <rect x="10" y="${H / 2 - 3}" width="6" height="6" fill="${fg}"/>
    <text x="24" y="${H / 2 + 5}" class="k">${esc(value)}</text>
  </svg>`;
}

// ── Activity heatmap ────────────────────────────────────────────
async function fetchContributions() {
  const res = await fetch(`https://github-contributions-api.jogruber.de/v4/${USER}?y=last`);
  if (!res.ok) throw new Error(`contributions API ${res.status}`);
  const json = await res.json();
  return { days: json.contributions, total: json.total.lastYear };
}

function activity({ days, total }, { bg, fg }) {
  const CELL = 14, GAP = 3, STEP = CELL + GAP;
  const pad = (new Date(days[0].date).getUTCDay()); // align first column to Sunday
  const weeks = Math.ceil((days.length + pad) / 7);
  const gridW = weeks * STEP - GAP;
  const W = 1000, gx = Math.round((W - gridW) / 2) + 10, gy = 70;
  const H = gy + 7 * STEP + 70;
  const opacity = [0.08, 0.3, 0.55, 0.8, 1];

  let cells = "", months = "", lastMonth = -1;
  days.forEach((d, i) => {
    const idx = i + pad, col = Math.floor(idx / 7), row = idx % 7;
    const x = gx + col * STEP, y = gy + row * STEP;
    const fill = d.level === 0
      ? `fill="none" stroke="${fg}" stroke-opacity=".18"`
      : `fill="${fg}" fill-opacity="${opacity[d.level]}"`;
    cells += `<rect x="${x + (d.level ? 0 : .5)}" y="${y + (d.level ? 0 : .5)}" width="${CELL - (d.level ? 0 : 1)}" height="${CELL - (d.level ? 0 : 1)}" ${fill}><title>${d.date}: ${d.count}</title></rect>`;
    const m = new Date(d.date).getUTCMonth();
    if (row === 0 && m !== lastMonth && col < weeks - 2) {
      months += `<text x="${x}" y="${gy - 10}" class="m">${new Date(d.date).toLocaleString("en", { month: "short", timeZone: "UTC" }).toLowerCase()}</text>`;
      lastMonth = m;
    }
  });
  const dayLabels = [[1, "mon"], [3, "wed"], [5, "fri"]]
    .map(([r, l]) => `<text x="${gx - 10}" y="${gy + r * STEP + 11}" text-anchor="end" class="m">${l}</text>`).join("");

  let streak = 0;
  for (let i = days.length - 1; i >= 0 && (days[i].count > 0 || i === days.length - 1); i--) if (days[i].count > 0) streak++;
  const best = days.reduce((a, d) => (d.count > a.count ? d : a));
  const active = days.filter((d) => d.count > 0).length;

  const legendX = gx + gridW - 5 * STEP - 34;
  const legend = opacity.map((o, i) => i === 0
    ? `<rect x="${legendX + .5}" y="${H - 37.5}" width="${CELL - 1}" height="${CELL - 1}" fill="none" stroke="${fg}" stroke-opacity=".18"/>`
    : `<rect x="${legendX + i * STEP}" y="${H - 38}" width="${CELL}" height="${CELL}" fill="${fg}" fill-opacity="${o}"/>`).join("");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
    <style>text{font-family:${FONT};fill:${fg}}.m{font-size:10px;opacity:.5}.s{font-size:13px}.b{font-weight:700}</style>
    <rect width="${W}" height="${H}" fill="${bg}"/>
    <rect x="20" y="10" width="960" height="${H - 20}" fill="none" stroke="${fg}" stroke-width="1.5"/>
    <line x1="20" y1="40" x2="980" y2="40" stroke="${fg}"/>
    <rect x="36" y="20" width="10" height="10" fill="${fg}"/>
    <rect x="54" y="20" width="10" height="10" fill="none" stroke="${fg}"/>
    <rect x="72" y="20" width="10" height="10" fill="none" stroke="${fg}"/>
    <text x="500" y="30" text-anchor="middle" class="m">$ git log --since="1 year ago" --author=${USER}</text>
    <text x="964" y="30" text-anchor="end" class="m">updated ${days.at(-1).date}</text>
    ${months}${dayLabels}${cells}
    <text x="${gx}" y="${H - 26}" class="s"><tspan class="b">${total.toLocaleString("en")}</tspan> contributions · <tspan class="b">${active}</tspan> active days · streak <tspan class="b">${streak}</tspan>d · peak <tspan class="b">${best.count}</tspan></text>
    <text x="${legendX - 8}" y="${H - 27}" text-anchor="end" class="m">less</text>${legend}
    <text x="${legendX + 5 * STEP + 2}" y="${H - 27}" class="m">more</text>
  </svg>`;
}

// ── Build ───────────────────────────────────────────────────────
const activityOnly = process.argv.includes("--activity-only");
const data = await fetchContributions();
for (const [name, theme] of Object.entries(THEMES)) {
  if (!activityOnly) {
    SECTIONS.forEach((s) => write(`section-${s[0]}-${name}.svg`, section(s, theme)));
    LINKS.forEach((l) => write(`link-${l[0]}-${name}.svg`, button(l, theme)));
  }
  write(`activity-${name}.svg`, activity(data, theme));
}
console.log(`assets written · ${data.total} contributions`);
