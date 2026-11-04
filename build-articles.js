#!/usr/bin/env node
/*
 * EcoAstuce — génère une page HTML (et donc une URL) pour chaque article.
 *
 * Source de vérité : le tableau `articles` dans index.html.
 * Usage : node build-articles.js
 *
 * Ce que fait le script :
 *  1. lit les articles dans index.html ;
 *  2. ajoute un `slug` (la fin de l'URL) aux articles qui n'en ont pas encore ;
 *  3. écrit une page par article dans /articles/<slug>.html ;
 *  4. met à jour sitemap.xml et robots.txt.
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
const OUT_DIR = path.join(ROOT, "articles");

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
  let parts = s.split("-");
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
  // Écrire le slug dans index.html juste après l'id de l'article
  const re = new RegExp("(\\{\\s*id:\\s*" + a.id + "\\s*,)");
  if (!re.test(html)) throw new Error("Article id " + a.id + " introuvable dans index.html");
  html = html.replace(re, '$1 slug:"' + slug + '",');
  newSlugs++;
}
if (newSlugs) fs.writeFileSync(INDEX, html);

// --- 3. Pages d'articles ---------------------------------------------------
const esc = s => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const bigImage = u => u + (u.includes("?") ? "" : "?auto=format&fit=crop&w=1200&q=80");

function page(a) {
  const url = `${SITE}/articles/${a.slug}.html`;
  const img = bigImage(a.image);
  const related = articles
    .filter(x => x.id !== a.id && x.category === a.category)
    .sort((x, y) => y.id - x.id)
    .slice(0, 3);
  const jsonld = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: a.title,
    description: a.description,
    image: img,
    articleSection: a.category,
    inLanguage: "fr-FR",
    mainEntityOfPage: url,
    author: { "@type": "Organization", name: "EcoAstuce" },
    publisher: { "@type": "Organization", name: "EcoAstuce" }
  };
  return `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(a.title)} — EcoAstuce</title>
<meta name="description" content="${esc(a.description)}">
<link rel="canonical" href="${url}">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<meta property="og:type" content="article">
<meta property="og:title" content="${esc(a.title)}">
<meta property="og:description" content="${esc(a.description)}">
<meta property="og:url" content="${url}">
<meta property="og:image" content="${esc(img)}">
<meta name="twitter:card" content="summary_large_image">
<link rel="stylesheet" href="/page.css">
<script src="/consent.js" defer></script>
<script type="application/ld+json">
${JSON.stringify(jsonld, null, 2)}
</script>
</head>
<body>
<header><div class="wrap nav"><a class="brand" href="/">🍃 Eco<span>Astuce</span></a><nav><a href="/">Accueil</a><a href="/#articles">Articles</a><a href="/a-propos.html">À propos</a><a href="/contact.html">Contact</a></nav></div></header>
<main class="wrap page">
<p class="meta"><a class="tag" href="/#articles">${esc(a.category)}</a> · ${a.minutes} min de lecture</p>
<h1>${esc(a.title)}</h1>
<p class="meta">${esc(a.description)}</p>
<img class="cover" src="${esc(img)}" alt="" loading="lazy">
${a.body.map(p => `<p>${esc(p)}</p>`).join("\n")}
${related.length ? `<section class="related">
<h2>À lire aussi</h2>
<ul>
${related.map(r => `<li><a href="/articles/${r.slug}.html">${esc(r.title)}</a></li>`).join("\n")}
</ul>
</section>` : ""}
<p><a href="/#articles">← Tous les articles</a></p>
</main>
<footer><div class="wrap"><a href="/confidentialite.html">Politique de confidentialité</a> · <a href="/mentions-legales.html">Mentions légales</a> · <a href="#" onclick="ecoConsentReset();return false;">Gérer les cookies</a></div></footer>
</body>
</html>
`;
}

fs.mkdirSync(OUT_DIR, { recursive: true });
for (const a of articles) fs.writeFileSync(path.join(OUT_DIR, a.slug + ".html"), page(a));

// --- 4. sitemap.xml + robots.txt -------------------------------------------
const urls = [
  "/", "/a-propos.html", "/contact.html", "/confidentialite.html", "/mentions-legales.html",
  ...articles.sort((x, y) => x.id - y.id).map(a => `/articles/${a.slug}.html`)
];
fs.writeFileSync(path.join(ROOT, "sitemap.xml"),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
  urls.map(u => `  <url><loc>${SITE}${u}</loc></url>`).join("\n") + `\n</urlset>\n`);
fs.writeFileSync(path.join(ROOT, "robots.txt"), `User-agent: *\nAllow: /\n\nSitemap: ${SITE}/sitemap.xml\n`);

console.log(`${articles.length} articles — ${newSlugs} nouveaux slugs — pages écrites dans /articles`);
