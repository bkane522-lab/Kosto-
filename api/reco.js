// api/reco.js — Kosto : moteur de recommandation (Vercel serverless, CommonJS)
// Variable d'environnement requise sur Vercel : GROQ_API_KEY

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  // --- Lecture du body (Vercel parse déjà le JSON, mais on sécurise) ---
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
    "Tu es un expert en équipement durable et fiable pour le quotidien.",
    "Tu recommandes du matériel réputé pour NE PAS casser : conçu pour durer des années, avec de bons matériaux (acier, inox, alu, etc.) et une bonne réputation de fiabilité.",
    "Tu privilégies le rapport fiabilité/prix, jamais le plus cher pour le plus cher.",
    "Tu proposes des TYPES de produits concrets et des marques/gammes réputées quand c'est pertinent, achetables sur Amazon France.",
    "Réponds UNIQUEMENT avec un tableau JSON valide, sans texte autour, sans balises markdown.",
    "Format exact : [{\"nom\":\"...\",\"categorie\":\"...\",\"pourquoi\":\"...\",\"prix\":\"...\",\"requete\":\"...\"}]",
    "- nom : le produit recommandé (type + marque/gamme si utile), court.",
    "- categorie : 2-3 mots.",
    "- pourquoi : 1 à 2 phrases en français, centrées sur la durabilité et pourquoi ça ne casse pas.",
    "- prix : fourchette en euros, ex \"40–70 €\".",
    "- requete : requête de recherche Amazon efficace (mots-clés), sans marque inventée.",
    "Exactement 3 objets. Français uniquement."
  ].join("\n");

  const user = [
    `Univers : ${univers}`,
    `Budget : ${budget}`,
    `Priorité : ${priorite}`,
    besoin ? `Besoin précis : ${besoin}` : "Besoin précis : (non précisé)",
    "",
    "Donne 3 recommandations de matériel durable adaptées."
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
        temperature: 0.6,
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

    // Nettoyage : retire d'éventuelles balises ```json ... ```
    raw = raw.replace(/```json/gi, "").replace(/```/g, "").trim();

    // Isole le tableau JSON
    const start = raw.indexOf("[");
    const end = raw.lastIndexOf("]");
    if (start !== -1 && end !== -1) raw = raw.slice(start, end + 1);

    let items;
    try {
      items = JSON.parse(raw);
    } catch (e) {
      res.status(502).json({ error: "Parse JSON échoué", raw: raw.slice(0, 300) });
      return;
    }

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
