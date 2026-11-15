# Vinted Assistant 2.0

Outil indépendant de suivi personnel des articles et ventes d'occasion.

- Inventaire local dans le navigateur
- Suivi manuel des ventes et colis, avec frais et emballage
- Tableau de bord : sommes reçues, reste estimé après frais, ventes du mois
- Export CSV séparé pour l'inventaire et les ventes
- Import de sauvegarde avec vérification des champs et des photos
- Préparation de brouillons d'annonces à copier manuellement
- Calcul de montant net indicatif
- Export/import de sauvegardes JSON et CSV

**Limites importantes :** cet outil ne se connecte pas à Vinted, ne récupère aucun identifiant, ne publie pas d'annonce et ne synchronise pas les données entre appareils. Les données restent dans le navigateur utilisé. Les photos sont locales ; une sauvegarde JSON peut contenir ces photos et doit être conservée prudemment. Il ne contient ni compte utilisateur, ni IA en ligne, ni paiement.

URL prévue : https://ecoastuce-studio.github.io/vinted-assistant/


## Assistant IA (configuration à terminer)
L'interface comprend maintenant un onglet « Assistant IA » pour les questions, l'amélioration d'annonces, l'analyse visuelle de photos et l'aide au prix à partir de comparables fournis. Le service serveur sécurisé est dans `ai-worker/`. Il n'est pas encore déployé ni relié : un parent devra superviser le déploiement et la configuration du secret API. Voir `ai-worker/README.md`. Aucun mot de passe Vinted ni clé API ne doit être placé dans le site.


## Utilisation responsable

Cette version est conçue pour organiser la vente occasionnelle de biens personnels. Elle n'est pas un outil d'achat-revente professionnel, ne contourne pas les conditions de Vinted et ne doit pas servir à dissimuler une activité commerciale. Vérifie toujours les règles applicables à ton compte avec un parent.

## Nouveautés de suivi

- Chaque vente peut inclure les frais à ta charge et le coût d'emballage.
- Le tableau de bord calcule un reste estimé : montant reçu moins frais et emballage saisis. Ce n'est pas un bénéfice comptable ni un conseil financier.
- Supprimer un suivi de vente remet l'article associé en « À préparer » si son statut était « Vendu ».
- Les sauvegardes importées sont limitées en taille et leurs champs sont filtrés ; conserve néanmoins tes propres sauvegardes en lieu sûr.
