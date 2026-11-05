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
