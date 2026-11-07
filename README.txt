EcoAstuce — site statique (GitHub Pages)

Structure
- index.html : accueil + liste des articles (le tableau `articles` est la source de vérité)
- articles/ : une page par article (générées)
- categorie/ : une page par catégorie (générées)
- og/, pins/, img/ : images de partage, images Pinterest et couvertures (générées)
- sitemap.xml, robots.txt, ads.txt : référencement et régie publicitaire
- consent.js : bandeau cookies (publicités et mesure d'audience seulement après accord)

Ajouter un article
1. Ajoute un objet dans le tableau `articles` de index.html (id unique, category, title,
   description, image, minutes, body ; "## Titre" dans body = sous-titre ; date:"AAAA-MM-JJ" facultatif).
   Pour une couverture locale : image:"/img/<categorie>.jpg".
2. node build-articles.js          (pages, sitemap, liste de secours)
3. node tools/render-images.js     (cartes de partage et pins ; nécessite Playwright)
4. Publie les fichiers modifiés (commit + push).

Important
- Les articles sont rédigés avec l'aide d'une IA : relis-les et vérifie les faits avant publication.
- Les revenus publicitaires dépendent de l'acceptation du compte AdSense (règles d'âge et de paiement :
  voir les conditions de Google, un parent/tuteur peut être nécessaire).

Publicités (après approbation AdSense)
- Les articles contiennent 2 emplacements (milieu et fin) qui restent invisibles tant qu'aucun identifiant n'est configuré.
- Dans AdSense : Annonces > Par bloc d'annonces > créer 2 blocs « Display responsive », puis colle leurs identifiants
  (suite de chiffres, data-ad-slot) dans consent.js : var SLOTS={article_mid:'...',article_end:'...'}
- Les annonces ne s'affichent qu'après acceptation des cookies. Ne mets pas d'annonces sur les pages légales, contact ou 404.
