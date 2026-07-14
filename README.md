# Kosto V2 — Du solide, rien qui casse

Conseiller de matériel durable ET indispensable (maison, voiture, camping, bricolage, cuisine, sport).
Moteur en arrière-plan (Groq). Multi-marchand : le client choisit sa boutique, tu touches la commission quel que soit le site.

## Structure
```
index.html       → racine
api/reco.js      → fonction serverless Vercel (moteur)
manifest.json    → PWA
sw.js            → service worker (offline + install)
assets/          → icon-192.png + icon-512.png
```
⚠️ Pas de dossier `public/` (évite le bug d'output directory sur Vercel).

## Mise en route
1. **Clé Groq** — Vercel → Settings → Environment Variables → `GROQ_API_KEY` = ta clé. (obligatoire)
2. **Affiliation** — dans `index.html`, bloc `AFFILIATES` :
   - `amazon.tag` = ta balise Amazon Partenaires (ex : "djkiz-21").
   - `*.deeplink` = ton lien tracké Awin/Rakuten par marchand, avec `{url}` (à remplir quand tu auras les comptes).
   Tant que c'est vide, les liens marchent quand même (sans commission).
3. **Icônes** — `assets/icon-192.png` et `assets/icon-512.png` (déjà inclus).

## Marchands
- **Amazon** et **Decathlon** : format de recherche vérifié ✅
- **ManoMano** et **Cdiscount** : format standard, `confirmed:false`. Si un lien tombe à côté, mets `enabled:false` sur le marchand dans `index.html`.
- Répartition par univers dans `UNIVERS_MERCHANTS`.

## Nouveautés V2
- Moteur resserré : uniquement l'ESSENTIEL DURABLE (fini les gadgets).
- Plus de noms de produits inventés → type générique + requête mots-clés → liens toujours valides.
- Boutons multi-marchands sur chaque reco.
