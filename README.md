# Kosto — Du solide, rien qui casse

Conseiller de matériel durable (maison, voiture, camping, bricolage, cuisine, sport).
Moteur en arrière-plan (Groq), monétisation par affiliation Amazon.

## Structure
```
index.html          → racine
api/reco.js          → fonction serverless Vercel (moteur)
manifest.json        → PWA
sw.js                → service worker (offline + install)
assets/              → icon-192.png + icon-512.png (à ajouter)
```
⚠️ Pas de dossier `public/` (évite le bug d'output directory sur Vercel).

## Mise en route (3 étapes)
1. **Clé Groq** — Vercel → Settings → Environment Variables → `GROQ_API_KEY` = ta clé.
2. **Balise Amazon** — dans `index.html`, ligne `const AFFILIATE_TAG = ""` → mets ta balise (ex : `"djkiz-21"`) une fois le compte Partenaires validé.
3. **Icônes** — ajoute `assets/icon-192.png` et `assets/icon-512.png`.

L'app fonctionne dès que la clé Groq est en place (même sans balise Amazon).

## Amazon Partenaires — à savoir
3 ventes qualifiées requises dans les 180 premiers jours, sinon le compte est fermé (redemande possible).
