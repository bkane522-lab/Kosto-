// api/reco.js — Kosto V2.1 : moteur de recommandation (Vercel serverless, CommonJS)
// Variable d'environnement requise sur Vercel : GROQ_API_KEY

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  let body = req.body;
  if (typeof body === "string") {
    try { body = JSON.parse(body); } catch (e) { body = {}; }
  }
  body = body || {};

  const univers  = (body.univers  || "Maison").toString().slice(0, 40);
  const budget   = (body.budget   || "Raisonnable").toString().slice(0, 40);
  const priorite = (body.priorite || "Durabilité maximale").toString().slice(0, 60);
  const besoin   = (body.besoin   || "").toString().slice(0, 300);

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: "GROQ_API_KEY manquante" });
    return;
  }

  const system = [
    "Tu es un expert en équipement DURABLE, INCASSABLE et INDISPENSABLE. La promesse de la marque : \"rien qui casse au bout de six mois\".",
    "",
    "RÈGLE 1 — MATÉRIAUX INCASSABLES uniquement. Privilégie fonte, inox, acier, aluminium anodisé, bois massif, cuir, silicone renforcé. INTERDIT tout ce qui casse facilement : verre, céramique fragile, porcelaine, plastique premier prix. (Ex : jamais de cafetière en verre → propose une cafetière italienne en inox ou une French press en inox.)",
    "RÈGLE 2 — QUALITÉ DURABLE, pas premier prix. Vise des produits conçus pour durer 10 ans et plus, généralement à partir de 25-30 €. Évite les objets jetables, gadgets, bas de gamme, et les broutilles à moins de 15 €.",
    "RÈGLE 3 — VRAIMENT INDISPENSABLE. Uniquement des objets essentiels qu'on utilise souvent. Rien de secondaire ni d'accessoire 'sympa mais inutile'.",
    "RÈGLE 4 — N'INVENTE JAMAIS de nom de modèle ni de référence commerciale. Donne un TYPE de produit générique et clair.",
    "RÈGLE 5 — Le champ 'requete' = recherche en MOTS-CLÉS GÉNÉRIQUES qui marche sur tout site marchand (Amazon, Cdiscount, ManoMano, Decathlon). Reste générique ; une marque réputée réelle n'est tolérée que si vraiment pertinente.",
    "RÈGLE 6 — Trois objets DIFFÉRENTS et complémentaires, jamais trois variantes du même produit.",
    "",
    "Mentalité : \"achat unique pour 10 ans\". Si le produit peut se casser en tombant, ne le propose pas.",
    "",
    "Réponds UNIQUEMENT avec un tableau JSON valide, sans texte autour, sans balises markdown.",
    "Format exact : [{\"nom\":\"...\",\"categorie\":\"...\",\"pourquoi\":\"...\",\"prix\":\"...\",\"requete\":\"...\"}]",
    "- nom : type de produit, court et concret (ex : \"Poêle en fonte\", \"Cafetière italienne inox\", \"Gourde isotherme inox\").",
    "- categorie : 2-3 mots.",
    "- pourquoi : 1 à 2 phrases : pourquoi c'est INCASSABLE/durable ET indispensable.",
    "- prix : fourchette en euros, ex \"40–70 €\".",
    "- requete : mots-clés génériques (ex : \"poele fonte\", \"cafetiere italienne inox\", \"gourde isotherme inox\").",
    "Exactement 3 objets. Français uniquement."
  ].join("\n");

  const user = [
    `Univers : ${univers}`,
    `Budget : ${budget}`,
    `Priorité : ${priorite}`,
    besoin ? `Besoin précis : ${besoin}` : "Besoin précis : (non précisé)",
    "",
    "Donne 3 équipements incassables, durables ET indispensables adaptés."
  ].join("\n");

  try {
    const gr = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        temperature: 0.5,
        max_tokens: 1100,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user }
        ]
      })
    });

    if (!gr.ok) {
      const t = await gr.text();
      res.status(502).json({ error: "Groq error", detail: t.slice(0, 300) });
      return;
    }

    const j = await gr.json();
    let raw = (j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content) || "";
    raw = raw.replace(/```json/gi, "").replace(/```/g, "").trim();
    const start = raw.indexOf("[");
    const end = raw.lastIndexOf("]");
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
