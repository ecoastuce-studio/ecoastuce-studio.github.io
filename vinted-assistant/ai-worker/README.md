# Vinted Assistant — service IA sécurisé

Ce dossier contient le petit service serveur nécessaire à l'assistant IA du site statique.

## Ce qui est prévu
- Assistant de questions/réponses en français.
- Amélioration de titres et descriptions à partir des informations fournies.
- Analyse visuelle limitée aux éléments réellement visibles sur une photo.
- Aide à la réflexion sur le prix à partir de comparables saisis par l'utilisateur.
- Clé API conservée côté serveur, jamais dans le HTML.
- Requêtes non conservées côté fournisseur lorsque l'option `store: false` est prise en charge.

## Important : le site n'est pas encore connecté à l'IA
Le site GitHub Pages ne peut pas exécuter de code serveur. Il faut déployer ce Worker sur un compte Cloudflare et configurer une clé API côté serveur. Cela peut engendrer des frais selon l'usage et le fournisseur. Un parent doit superviser la création du compte, les conditions et la facturation.

## Configuration de déploiement (à faire avec un parent)
1. Créer un projet Cloudflare Workers et y placer `src/index.js` ainsi que `wrangler.toml`.
2. Ajouter la variable secrète `OPENAI_API_KEY` dans les secrets du Worker (ne jamais la mettre dans GitHub, le HTML ou le navigateur).
3. Déployer le Worker.
4. Copier l'adresse HTTPS du Worker.
5. Ouvrir Vinted Assistant > Assistant IA et coller cette adresse dans « Adresse du service IA sécurisé ».

Le modèle par défaut est `gpt-4.1-mini`. Il peut être remplacé côté serveur via la variable `OPENAI_MODEL`.

## Limites et sécurité
- L'origine autorisée est volontairement limitée à `https://ecoastuce-studio.github.io`.
- Le service accepte uniquement POST/OPTIONS et des images JPG/PNG/WEBP de moins de 3 Mo.
- L'analyse d'image peut se tromper. Elle ne certifie jamais une marque, une matière, l'authenticité ou l'état.
- Les prix ne sont pas vérifiés en direct et ne sont pas des prix de vente garantis.
- Aucun accès, scraping, synchronisation ou publication Vinted n'est inclus.
- Ne pas envoyer de visages, coordonnées, étiquettes personnelles ou informations d'acheteurs.
