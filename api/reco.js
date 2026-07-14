// api/reco.js — Kosto V2 : moteur de recommandation (Vercel serverless, CommonJS)
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
    "Tu es un expert en équipement DURABLE et INDISPENSABLE pour le quotidien.",
    "",
    "RÈGLE 1 — Ne recommande QUE des objets essentiels et durables : ceux qu'on achète UNE FOIS et qu'on garde des années. Du matériel costaud, réparable, en bons matériaux (acier, inox, fonte, alu anodisé, etc.).",
    "RÈGLE 2 — INTERDIT : les gadgets, accessoires secondaires, produits jetables ou 'sympas mais pas utiles'. Si ce n'est pas vraiment utile et solide, ne le propose pas.",
    "RÈGLE 3 — N'INVENTE JAMAIS de nom de modèle ni de référence commerciale (pas de noms de produits imaginaires). Donne un TYPE de produit générique et clair.",
    "RÈGLE 4 — Le champ 'requete' doit être une recherche en MOTS-CLÉS GÉNÉRIQUES qui renvoie de bons résultats sur n'importe quel site marchand (Amazon, Cdiscount, ManoMano, Decathlon). Pas de marque inventée. Une marque réputée réelle est tolérée seulement si elle est vraiment pertinente, sinon reste générique.",
    "RÈGLE 5 — Varie les 3 propositions : trois objets DIFFÉRENTS et complémentaires, pas trois variantes du même produit.",
    "",
    "Réponds UNIQUEMENT avec un tableau JSON valide, sans texte autour, sans balises markdown.",
    "Format exact : [{\"nom\":\"...\",\"categorie\":\"...\",\"pourquoi\":\"...\",\"prix\":\"...\",\"requete\":\"...\"}]",
    "- nom : le type de produit, court et concret (ex : \"Poêle en fonte\", \"Perceuse-visseuse sans fil\", \"Gourde isotherme inox\").",
    "- categorie : 2-3 mots.",
    "- pourquoi : 1 à 2 phrases, pourquoi c'est SOLIDE et pourquoi c'est INDISPENSABLE.",
    "- prix : fourchette en euros, ex \"40–70 €\".",
    "- requete : mots-clés de recherche génériques (ex : \"poele fonte\", \"perceuse visseuse sans fil\", \"gourde isotherme inox\").",
    "Exactement 3 objets. Français uniquement."
  ].join("\n");

  const user = [
    `Univers : ${univers}`,
    `Budget : ${budget}`,
    `Priorité : ${priorite}`,
    besoin ? `Besoin précis : ${besoin}` : "Besoin précis : (non précisé)",
    "",
    "Donne 3 équipements durables ET indispensables adaptés."
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
