// api/reco.js — Kosto V2.2 : moteur de recommandation (Vercel serverless, CommonJS)
// Variable d'environnement requise sur Vercel : GROQ_API_KEY

const FAMILLES = {
  Maison:    "cuisson, rangement/mobilier, entretien ménager, éclairage, outillage maison",
  Voiture:   "entretien, sécurité, confort/rangement, dépannage, nettoyage",
  Camping:   "couchage/abri, cuisson/popote, hydratation, éclairage, couteau/outil",
  Bricolage: "électroportatif, outil à main, mesure, fixation, rangement d'atelier",
  Cuisine:   "cuisson (poêle/casserole), découpe (couteau/planche), préparation, conservation, boisson",
  Sport:     "chaussures/textile technique, hydratation, récupération, accessoire d'entraînement"
};

module.exports = async (req, res) => {
  if (req.method !== "POST") { res.status(405).json({ error: "Method not allowed" }); return; }

  let body = req.body;
  if (typeof body === "string") { try { body = JSON.parse(body); } catch (e) { body = {}; } }
  body = body || {};

  const univers  = (body.univers  || "Maison").toString().slice(0, 40);
  const budget   = (body.budget   || "Raisonnable").toString().slice(0, 40);
  const priorite = (body.priorite || "Durabilité maximale").toString().slice(0, 60);
  const besoin   = (body.besoin   || "").toString().slice(0, 300);

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) { res.status(500).json({ error: "GROQ_API_KEY manquante" }); return; }

  const familles = FAMILLES[univers] || "des familles d'usage variées";

  const system = [
    "Tu es un expert en équipement DURABLE, INCASSABLE et INDISPENSABLE. Promesse de la marque : \"rien qui casse au bout de six mois\".",
    "",
    "RÈGLE 1 — VARIÉTÉ OBLIGATOIRE. Les 3 objets doivent venir de 3 FAMILLES D'USAGE DIFFÉRENTES. INTERDIT de proposer deux objets de la même famille (jamais deux assiettes, deux poêles, deux lampes…). Chaque objet a un usage distinct.",
    "RÈGLE 2 — ZÉRO MARQUE. N'écris AUCUN nom de marque ni de modèle, ni dans 'nom' ni dans 'requete'. Type de produit 100% générique. (Écris \"assiette inox\", jamais \"assiette inox Espro\".)",
    "RÈGLE 3 — MATÉRIAUX INCASSABLES. Privilégie fonte, inox, acier, aluminium anodisé, bois massif, cuir, silicone renforcé. INTERDIT verre, céramique fragile, porcelaine, plastique premier prix. Si ça se casse en tombant, ne le propose pas.",
    "RÈGLE 4 — QUALITÉ DURABLE, pas premier prix. Conçu pour durer 10 ans et plus, généralement à partir de 25-30 €. Pas de gadget ni de broutille à moins de 15 €.",
    "RÈGLE 5 — VRAIMENT INDISPENSABLE. Objets essentiels utilisés souvent, rien de secondaire.",
    "RÈGLE 6 — 'requete' = mots-clés GÉNÉRIQUES qui marchent sur tout site marchand (Amazon, Cdiscount, ManoMano, Decathlon).",
    "",
    `Familles d'usage possibles pour cet univers : ${familles}. Choisis-en 3 différentes.`,
    "",
    "Réponds UNIQUEMENT avec un tableau JSON valide, sans texte autour, sans balises markdown.",
    "Format exact : [{\"nom\":\"...\",\"categorie\":\"...\",\"pourquoi\":\"...\",\"prix\":\"...\",\"requete\":\"...\"}]",
    "- nom : type de produit générique, court (ex : \"Popote inox\", \"Gourde isotherme inox\", \"Lampe frontale\").",
    "- categorie : 2-3 mots.",
    "- pourquoi : 1 à 2 phrases : pourquoi c'est incassable/durable ET indispensable.",
    "- prix : fourchette en euros, ex \"40–70 €\".",
    "- requete : mots-clés génériques SANS marque (ex : \"popote camping inox\", \"gourde isotherme inox\", \"lampe frontale led\").",
    "Exactement 3 objets, 3 familles différentes. Français uniquement."
  ].join("\n");

  const user = [
    `Univers : ${univers}`,
    `Budget : ${budget}`,
    `Priorité : ${priorite}`,
    besoin ? `Besoin précis : ${besoin}` : "Besoin précis : (non précisé)",
    "",
    "Donne 3 équipements incassables, durables et indispensables — de 3 familles d'usage DIFFÉRENTES."
  ].join("\n");

  try {
    const gr = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        temperature: 0.65,
        max_tokens: 1100,
        messages: [ { role: "system", content: system }, { role: "user", content: user } ]
      })
    });

    if (!gr.ok) { const t = await gr.text(); res.status(502).json({ error: "Groq error", detail: t.slice(0, 300) }); return; }

    const j = await gr.json();
    let raw = (j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content) || "";
    raw = raw.replace(/```json/gi, "").replace(/```/g, "").trim();
    const start = raw.indexOf("["), end = raw.lastIndexOf("]");
    if (start !== -1 && end !== -1) raw = raw.slice(start, end + 1);

    let items;
    try { items = JSON.parse(raw); }
    catch (e) { res.status(502).json({ error: "Parse JSON échoué", raw: raw.slice(0, 300) }); return; }

    if (!Array.isArray(items)) items = [];
    items = items.slice(0, 3).map(it => ({
      nom:       String(it.nom || "").slice(0, 120),
      categorie: String(it.categorie || univers).slice(0, 60),
      pourquoi:  String(it.pourquoi || "").slice(0, 400),
      prix:      String(it.prix || "").slice(0, 40),
      requete:   String(it.requete || it.nom || univers).slice(0, 120)
    }));

    res.setHeader("Cache-Control", "no-store");
    res.status(200).json({ items });
  } catch (err) {
    res.status(500).json({ error: "Erreur serveur", detail: String(err).slice(0, 200) });
  }
};
