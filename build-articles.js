#!/usr/bin/env node
/*
 * EcoAstuce — génère les pages du site à partir des articles.
 *
 * Source de vérité : le tableau `articles` dans index.html.
 * Usage : node build-articles.js
 *
 * Ce que fait le script :
 *  1. lit les articles dans index.html ;
 *  2. ajoute un `slug` (la fin de l'URL) aux articles qui n'en ont pas encore ;
 *  3. écrit une page par article dans /articles/<slug>.html ;
 *  4. écrit une page par catégorie dans /categorie/<slug>.html ;
 *  5. met à jour sitemap.xml et robots.txt.
 *
 * Pour ajouter un article : ajoute-le dans index.html (avec un id unique),
 * relance `node build-articles.js`, puis publie les fichiers modifiés.
 */
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = __dirname;
const SITE = "https://ecoastuce-studio.github.io";
const INDEX = path.join(ROOT, "index.html");
const ART_DIR = path.join(ROOT, "articles");
const CAT_DIR = path.join(ROOT, "categorie");

let html = fs.readFileSync(INDEX, "utf8");

// --- 1. Lire le tableau d'articles ---------------------------------------
const START = "const articles = [";
const startIdx = html.indexOf(START);
if (startIdx < 0) throw new Error("Tableau `articles` introuvable dans index.html");
const endIdx = html.indexOf("\n];", startIdx);
if (endIdx < 0) throw new Error("Fin du tableau `articles` introuvable");
const arrayText = html.slice(startIdx + "const articles = ".length, endIdx + 3);
const articles = vm.runInNewContext("(" + arrayText.replace(/;\s*$/, "") + ")");

// --- 2. Slugs --------------------------------------------------------------
function slugify(title) {
  let s = title
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[’']/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  if (s.length > 75) {
    s = s.slice(0, 75);
    const cut = s.lastIndexOf("-");
    if (cut > 30) s = s.slice(0, cut);
  }
  // Ne pas finir sur un petit mot coupé ("...avant-de", "...a-la")
  const filler = new Set(["a","la","le","les","de","du","des","au","aux","avant","deux","pour","sans","et","ou","son","ses","sa","en","un","une","dans","sur","avec","que","qui","tout","ce"]);
  const parts = s.split("-");
  while (parts.length > 3 && filler.has(parts[parts.length - 1])) parts.pop();
  return parts.join("-");
}

const used = new Set(articles.filter(a => a.slug).map(a => a.slug));
let newSlugs = 0;
for (const a of articles) {
  if (a.slug) continue;
  let slug = slugify(a.title), n = 2;
  const base = slug;
  while (used.has(slug)) slug = base + "-" + n++;
  used.add(slug);
  a.slug = slug;
  const re = new RegExp("(\\{\\s*id:\\s*" + a.id + "\\s*,)");
  if (!re.test(html)) throw new Error("Article id " + a.id + " introuvable dans index.html");
  html = html.replace(re, '$1 slug:"' + slug + '",');
  newSlugs++;
}
if (newSlugs) fs.writeFileSync(INDEX, html);

// --- Helpers ---------------------------------------------------------------
const esc = s => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
// Images Unsplash : on ajoute les paramètres de taille ; images locales (/img/...) : inchangées.
const bigImage = (u, w = 1200) => /^https?:/.test(u) ? u + (u.includes("?") ? "" : `?auto=format&fit=crop&w=${w}&q=80`) : u;
const absUrl = u => /^https?:/.test(u) ? u : SITE + u;
const FR_MONTHS = ["janvier","février","mars","avril","mai","juin","juillet","août","septembre","octobre","novembre","décembre"];
const frDate = d => { const [y, m, j] = d.split("-").map(Number); return `${j === 1 ? "1er" : j} ${FR_MONTHS[m - 1]} ${y}`; };
// Corps de l'article. Avec withAd, un emplacement publicitaire est inséré au milieu, juste avant un sous-titre
// (jamais collé à un titre ni en tout début d'article).
function renderBody(body, withAd = false) {
  const html = body.map(p => p.startsWith("## ") ? `<h2>${esc(p.slice(3))}</h2>` : `<p>${esc(p)}</p>`);
  if (withAd) {
    const heads = body.map((p, i) => p.startsWith("## ") ? i : -1).filter(i => i > 2);
    const at = heads.length ? heads[Math.floor((heads.length - 1) / 2)] : (body.length >= 5 ? 3 : -1);
    if (at > 0) html.splice(at, 0, `<aside class="eco-ad" data-slot="article_mid" aria-label="Publicité" hidden></aside>`);
  }
  return html.join("\n");
}

// Articles recommandés : même catégorie ou mots proches dans le titre/la description (toutes catégories confondues).
const STOP = new Set("avec sans pour dans plus mais comme cette leurs vous nous tout tous votre quand entre chez sont etre avoir faire fait sur par des les une aux ses son leur qui que quoi dont aussi tres bien deux trois premier moins comment pourquoi quelques simples simple petit petits".split(" "));
const words = a => new Set((a.title + " " + a.description).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().split(/[^a-z0-9]+/).filter(w => w.length > 3 && !STOP.has(w)));
function relatedFor(a) {
  const wa = words(a);
  return articles.filter(x => x.id !== a.id).map(x => {
    let score = x.category === a.category ? 2 : 0;
    for (const w of words(x)) if (wa.has(w)) score += 3;
    return { x, score };
  }).sort((p, q) => q.score - p.score || q.x.id - p.x.id).slice(0, 4).map(p => p.x);
}
const thumb = u => bigImage(u, 700);
const catSlug = c => slugify(c);
const CATEGORIES = [...new Set(articles.map(a => a.category))]
  .sort((x, y) => x.localeCompare(y, "fr"));
const byRecent = [...articles].sort((x, y) => y.id - x.id);

const HEAD_NAV = `<a class="skip" href="#contenu">Aller au contenu</a>
<header><div class="wrap nav"><a class="brand" href="/">🍃 Eco<span>Astuce</span></a><nav aria-label="Navigation principale"><a href="/">Accueil</a><a href="/#articles">Articles</a><a href="/a-propos.html">À propos</a><a href="/contact.html">Contact</a></nav></div></header>`;
const FOOT = `<footer><div class="wrap"><a href="/confidentialite.html">Politique de confidentialité</a> · <a href="/mentions-legales.html">Mentions légales</a> · <a href="#" onclick="ecoConsentReset();return false;">Gérer les cookies</a></div></footer>`;

function head({ title, description, url, image, type = "website", extra = "" }) {
  return `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="google-adsense-account" content="ca-pub-1800081150235092">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<meta name="theme-color" content="#091827">
<link rel="canonical" href="${url}">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="preconnect" href="https://images.unsplash.com" crossorigin>
<meta property="og:type" content="${type}">
<meta property="og:site_name" content="EcoAstuce">
<meta property="og:locale" content="fr_FR">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${url}">
<meta property="og:image" content="${esc(image)}">
<meta name="twitter:card" content="summary_large_image">
<link rel="stylesheet" href="/page.css">
<script src="/consent.js" defer></script>
${extra}</head>
<body>
`;
}
const ld = o => `<script type="application/ld+json">\n${JSON.stringify(o, null, 2)}\n</script>\n`;
const crumbLd = items => ld({
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: items.map((it, i) => ({ "@type": "ListItem", position: i + 1, name: it[0], item: SITE + it[1] }))
});

// --- 3. Pages d'articles ---------------------------------------------------
function articlePage(a) {
  const url = `${SITE}/articles/${a.slug}.html`;
  const img = bigImage(a.image);
  const og = `${SITE}/og/${a.slug}.jpg`;   // carte de partage (générée par tools/render-images.js)
  const pin = `${SITE}/pins/${a.slug}.jpg`; // image verticale pour Pinterest
  const pinUrl = `https://www.pinterest.com/pin/create/button/?url=${encodeURIComponent(url)}&media=${encodeURIComponent(pin)}&description=${encodeURIComponent(a.title + " — " + a.description)}`;
  const cs = catSlug(a.category);
  const sorted = [...articles].sort((x, y) => x.id - y.id);
  const i = sorted.findIndex(x => x.id === a.id);
  const prev = sorted[i - 1], next = sorted[i + 1];
  const related = relatedFor(a);

  const jsonld = ld({
    "@context": "https://schema.org",
    "@type": "Article",
    headline: a.title,
    description: a.description,
    image: [og, absUrl(img)],
    articleSection: a.category,
    inLanguage: "fr-FR",
    mainEntityOfPage: url,
    ...(a.date ? { datePublished: a.date, dateModified: a.date } : {}),
    author: { "@type": "Organization", name: "EcoAstuce" },
    publisher: { "@type": "Organization", name: "EcoAstuce", logo: { "@type": "ImageObject", url: SITE + "/og-image.jpg" } }
  }) + crumbLd([["Accueil", "/"], [a.category, `/categorie/${cs}.html`], [a.title, `/articles/${a.slug}.html`]]);

  return head({ title: `${a.title} — EcoAstuce`, description: a.description, url, image: og, type: "article", extra: jsonld }) +
`${HEAD_NAV}
<main id="contenu" class="wrap page">
<nav class="crumbs" aria-label="Fil d'Ariane"><a href="/">Accueil</a> › <a href="/categorie/${cs}.html">${esc(a.category)}</a></nav>
<p class="meta"><a class="tag" href="/categorie/${cs}.html">${esc(a.category)}</a> · ${a.minutes} min de lecture${a.date ? ` · <time datetime="${a.date}">${frDate(a.date)}</time>` : ""}</p>
<h1>${esc(a.title)}</h1>
<p class="lead">${esc(a.description)}</p>
<img class="cover" src="${esc(img)}" alt="${esc(a.title)}" width="1200" height="675" fetchpriority="high" onerror="this.style.display='none'">
<article class="article-body">
${renderBody(a.body, true)}
</article>
<div class="share">
<button class="btn btn-ghost" id="copy" type="button">🔗 Copier le lien</button>
<button class="btn btn-ghost" id="share" type="button" hidden>↗ Partager</button>
<a class="btn btn-pin" href="${esc(pinUrl)}" target="_blank" rel="noopener noreferrer">📌 Épingler</a>
<small id="copied" role="status" aria-live="polite"></small>
</div>
<aside class="eco-ad" data-slot="article_end" aria-label="Publicité" hidden></aside>
${related.length ? `<section class="related" aria-labelledby="related-title">
<h2 id="related-title">À lire aussi</h2>
<div class="cards">
${related.map(r => `<a class="card" href="/articles/${r.slug}.html"><img src="${esc(thumb(r.image))}" alt="" loading="lazy" width="700" height="300" onerror="this.style.display='none'"><div><span class="tag">${esc(r.category)} · ${r.minutes} min</span><h3>${esc(r.title)}</h3><p>${esc(r.description)}</p></div></a>`).join("\n")}
</div>
</section>` : ""}
<div class="pager">
${prev ? `<a class="prev" href="/articles/${prev.slug}.html"><small>← Article précédent</small>${esc(prev.title)}</a>` : "<span></span>"}
${next ? `<a class="next" href="/articles/${next.slug}.html"><small>Article suivant →</small>${esc(next.title)}</a>` : "<span></span>"}
</div>
<p style="margin-top:26px"><a href="/#articles">← Tous les articles</a></p>
<p class="meta" style="margin-top:20px">Ces informations sont données à titre général. Pour toute décision importante, vérifie auprès des sources officielles.</p>
</main>
${FOOT}
<script>
(function(){
  var url=${JSON.stringify(url)},t=${JSON.stringify(a.title)},m=document.getElementById("copied");
  var c=document.getElementById("copy"),s=document.getElementById("share");
  c.addEventListener("click",function(){
    var done=function(){m.textContent="Lien copié ✓"};
    if(navigator.clipboard){navigator.clipboard.writeText(url).then(done,function(){m.textContent=url})}else{m.textContent=url}
  });
  if(navigator.share){s.hidden=false;s.addEventListener("click",function(){navigator.share({title:t,url:url}).catch(function(){})})}
})();
</script>
</body>
</html>
`;
}

// --- 4. Pages catégories ---------------------------------------------------
const CAT_TEXT = {
  "Maison": "Ranger, organiser et prendre soin de son logement avec des idées simples.",
  "Budget": "Mieux suivre ses dépenses, comparer avant d'acheter et éviter les pièges.",
  "Environnement": "Des gestes concrets pour réduire le gaspillage et mieux trier.",
  "Technologie": "Outils, sécurité en ligne et organisation numérique, sans jargon.",
  "Études": "Méthodes de révision et d'organisation pour apprendre plus sereinement.",
  "Vie professionnelle": "CV, e-mails et travail en équipe : les bases pour bien démarrer.",
  "Cuisine": "Préparer ses repas et cuisiner plus simplement."
};

function categoryPage(cat) {
  const cs = catSlug(cat);
  const url = `${SITE}/categorie/${cs}.html`;
  const list = byRecent.filter(a => a.category === cat);
  const intro = CAT_TEXT[cat] || `Tous nos articles de la catégorie ${cat}.`;
  const desc = `${intro} ${list.length} article${list.length > 1 ? "s" : ""} à lire gratuitement sur EcoAstuce.`;
  const extra = crumbLd([["Accueil", "/"], [cat, `/categorie/${cs}.html`]]);
  return head({ title: `${cat} — Articles et astuces — EcoAstuce`, description: desc, url, image: SITE + "/og-image.jpg", extra }) +
`${HEAD_NAV}
<main id="contenu" class="wrap page">
<nav class="crumbs" aria-label="Fil d'Ariane"><a href="/">Accueil</a> › ${esc(cat)}</nav>
<h1>${esc(cat)}</h1>
<p class="lead">${esc(intro)}</p>
<div class="catlist" aria-label="Catégories">
${CATEGORIES.map(c => `<a href="/categorie/${catSlug(c)}.html"${c === cat ? ' aria-current="page"' : ""}>${esc(c)}</a>`).join("\n")}
</div>
<div class="cards">
${list.map(a => `<a class="card" href="/articles/${a.slug}.html"><img src="${esc(thumb(a.image))}" alt="" loading="lazy" width="700" height="300" onerror="this.style.display='none'"><div><span class="tag">${a.minutes} min</span><h2>${esc(a.title)}</h2><p>${esc(a.description)}</p></div></a>`).join("\n")}
</div>
<p style="margin-top:26px"><a href="/#articles">← Tous les articles</a></p>
</main>
${FOOT}
</body>
</html>
`;
}

// --- Écriture --------------------------------------------------------------
for (const dir of [ART_DIR, CAT_DIR]) {
  fs.mkdirSync(dir, { recursive: true });
  for (const f of fs.readdirSync(dir)) if (f.endsWith(".html")) fs.unlinkSync(path.join(dir, f)); // pas de pages orphelines
}
for (const a of articles) fs.writeFileSync(path.join(ART_DIR, a.slug + ".html"), articlePage(a));
for (const c of CATEGORIES) fs.writeFileSync(path.join(CAT_DIR, catSlug(c) + ".html"), categoryPage(c));

// --- Index : liste de secours (sans JavaScript) + liens catégories ----------
{
  let idx = fs.readFileSync(INDEX, "utf8");
  const fill = (name, content) => {
    const re = new RegExp(`<!--${name}-->[\\s\\S]*?<!--/${name}-->`);
    if (!re.test(idx)) throw new Error("Repère " + name + " introuvable dans index.html");
    idx = idx.replace(re, `<!--${name}-->${content}<!--/${name}-->`);
  };
  fill("noscript-list", "<ul>" + byRecent.map(a => `<li><a href="/articles/${a.slug}.html">${esc(a.title)}</a> — ${esc(a.category)}</li>`).join("") + "</ul>");
  idx = idx.replace(/Découvrez \d+ articles/, `Découvrez ${articles.length} articles`);
  fill("footer-cats", CATEGORIES.map(c => `<a href="/categorie/${catSlug(c)}.html">${esc(c)}</a>`).join(""));
  fs.writeFileSync(INDEX, idx);
}

// --- 5. sitemap.xml + robots.txt -------------------------------------------
const urls = [
  "/", "/a-propos.html", "/contact.html", "/confidentialite.html", "/mentions-legales.html",
  ...CATEGORIES.map(c => `/categorie/${catSlug(c)}.html`),
  ...[...articles].sort((x, y) => x.id - y.id).map(a => `/articles/${a.slug}.html`)
];
fs.writeFileSync(path.join(ROOT, "sitemap.xml"),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
  urls.map(u => `  <url><loc>${SITE}${u}</loc></url>`).join("\n") + `\n</urlset>\n`);
fs.writeFileSync(path.join(ROOT, "robots.txt"), `User-agent: *\nAllow: /\n\nSitemap: ${SITE}/sitemap.xml\n`);

console.log(`${articles.length} articles, ${CATEGORIES.length} catégories — ${newSlugs} nouveaux slugs`);
