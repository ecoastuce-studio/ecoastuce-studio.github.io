#!/usr/bin/env node
/*
 * EcoAstuce — génère les images locales du site :
 *   /img/<categorie>.jpg   couvertures de catégorie (1200x675)
 *   /og/<slug>.jpg         cartes de partage réseaux sociaux (1200x630)
 *   /pins/<slug>.jpg       images verticales Pinterest (1000x1500)
 *
 * Prérequis : Node + Playwright (npm i playwright && npx playwright install chromium)
 * Usage : node tools/render-images.js   (après node build-articles.js)
 */
const fs = require("fs"), path = require("path"), vm = require("vm");
const { chromium } = require("playwright");
const ROOT = path.join(__dirname, "..");
const html = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");
const s = html.indexOf("const articles = ["), e = html.indexOf("\n];", s);
const articles = vm.runInNewContext("(" + html.slice(s + 17, e + 3).replace(/;\s*$/, "") + ")");
const esc = t => String(t).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const slugify = c => c.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const HUE = { maison: [28, 70], budget: [160, 60], environnement: [135, 55], technologie: [215, 70], etudes: [265, 55], "vie-professionnelle": [195, 65], cuisine: [12, 75] };
const grad = c => { const [h] = HUE[slugify(c)] || [160]; return `linear-gradient(135deg,hsl(${h} 60% 14%),hsl(${(h + 30) % 360} 55% 26%))`; };
const BASE = "margin:0;font-family:Inter,system-ui,-apple-system,'Segoe UI',sans-serif;color:#fff;box-sizing:border-box;position:relative;overflow:hidden;";
const circles = `<div style="position:absolute;right:-140px;top:-140px;width:520px;height:520px;border-radius:50%;background:#66edaa24"></div><div style="position:absolute;left:-100px;bottom:-180px;width:420px;height:420px;border-radius:50%;background:#66edaa14"></div>`;
const brand = sz => `<div style="font-size:${sz}px;font-weight:800;letter-spacing:-1px">🍃 Eco<span style="color:#66edaa">Astuce</span></div>`;
const pill = (t, sz) => `<span style="display:inline-block;background:#66edaa;color:#072c20;font-weight:800;font-size:${sz}px;border-radius:99px;padding:.25em .8em">${esc(t)}</span>`;

const cover = c => `<body style="${BASE}width:1200px;height:675px;background:${grad(c)};display:flex;flex-direction:column;justify-content:flex-end;padding:70px 80px">${circles}${brand(36)}<div style="font-size:120px;font-weight:800;letter-spacing:-4px;line-height:1;margin-top:16px">${esc(c)}</div></body>`;
const og = a => `<body style="${BASE}width:1200px;height:630px;background:${grad(a.category)};display:flex;flex-direction:column;justify-content:center;padding:0 80px">${circles}<div>${pill(a.category, 28)}</div><div style="font-size:${a.title.length > 70 ? 56 : 66}px;font-weight:800;line-height:1.1;letter-spacing:-2px;margin:28px 0 36px;max-width:1000px">${esc(a.title)}</div>${brand(34)}</body>`;
const pin = a => `<body style="${BASE}width:1000px;height:1500px;background:${grad(a.category)};display:flex;flex-direction:column;justify-content:space-between;padding:110px 90px">${circles}<div>${pill(a.category, 34)}</div><div style="font-size:${a.title.length > 70 ? 84 : 98}px;font-weight:800;line-height:1.08;letter-spacing:-3px">${esc(a.title)}</div><div><div style="font-size:38px;color:#cfe6dd;margin-bottom:34px">${esc(a.description)}</div>${brand(54)}<div style="font-size:30px;color:#9fd6bf;margin-top:10px">ecoastuce-studio.github.io</div></div></body>`;

(async () => {
  const jobs = [];
  for (const c of [...new Set(articles.map(a => a.category))]) jobs.push([cover(c), 1200, 675, `img/${slugify(c)}.jpg`]);
  for (const a of articles) {
    const slug = a.slug; if (!slug) throw new Error("slug manquant : lance d'abord node build-articles.js");
    jobs.push([og(a), 1200, 630, `og/${slug}.jpg`], [pin(a), 1000, 1500, `pins/${slug}.jpg`]);
  }
  const b = await chromium.launch(); const p = await b.newPage();
  for (const [body, w, h, out] of jobs) {
    await p.setViewportSize({ width: w, height: h });
    await p.setContent(`<!doctype html><html><head><meta charset="utf-8"></head>${body}</html>`);
    const file = path.join(ROOT, out); fs.mkdirSync(path.dirname(file), { recursive: true });
    await p.screenshot({ path: file, type: "jpeg", quality: 82 });
  }
  await b.close(); console.log(jobs.length + " images générées");
})();
