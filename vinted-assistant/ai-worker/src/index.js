const ALLOWED_ORIGIN = "https://ecoastuce-studio.github.io";
const MAX_BODY_BYTES = 4.5 * 1024 * 1024;

function cors(origin) {
  return {
    "Access-Control-Allow-Origin": origin === ALLOWED_ORIGIN ? ALLOWED_ORIGIN : "null",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Vary": "Origin"
  };
}
function json(data, status, origin) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", ...cors(origin) }
  });
}
function instructions(mode) {
  const common = "Tu es l'assistant pédagogique de Vinted Assistant, en français. Aide uniquement à préparer et organiser la revente occasionnelle des propres vêtements et objets de l'utilisateur. Sois honnête, prudent et concret. N'invente jamais une marque, une matière, une taille, un défaut, une authenticité, une vente ou un prix de marché. Signale clairement les incertitudes. Ne demande aucune donnée personnelle ni information d'acheteur. Ne prétends pas être affilié à Vinted et ne propose ni scraping, ni automatisation de compte, ni contournement des règles de la plateforme. Rappelle que l'utilisateur doit vérifier chaque information et demander l'aide d'un parent pour les questions de compte, paiement ou activité professionnelle.";
  const modes = {
    chat: "Réponds à la question avec des étapes simples et utiles.",
    listing: "Améliore le titre et la description d'annonce. Sépare les faits fournis des éléments à vérifier. N'ajoute aucune caractéristique non fournie. Propose un titre concis, une description honnête et une courte checklist.",
    photo: "Analyse uniquement ce qui est visuellement observable sur la photo : type apparent de vêtement, couleurs, coupe, détails visibles, cadrage et améliorations photo. Ne déduis pas la marque, la composition, la taille, l'authenticité ni l'état intérieur. Indique les limites de l'image.",
    price: "Aide à réfléchir à un prix uniquement à partir des comparables fournis par l'utilisateur. Distingue prix affichés et prix réellement vendus. Si les comparables sont insuffisants, dis-le et demande de meilleures comparaisons. Ne présente jamais le résultat comme une estimation certaine du marché."
  };
  return common + "\n\nMission : " + (modes[mode] || modes.chat);
}
function extractText(data) {
  if (typeof data.output_text === "string") return data.output_text;
  const parts = [];
  for (const item of (data.output || [])) {
    if (item.type === "message" && Array.isArray(item.content)) {
      for (const c of item.content) if (c.type === "output_text" && c.text) parts.push(c.text);
    }
  }
  return parts.join("\n").trim();
}
export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "";
    if (request.method === "OPTIONS") {
      if (origin !== ALLOWED_ORIGIN) return new Response(null, { status: 403 });
      return new Response(null, { status: 204, headers: cors(origin) });
    }
    if (origin !== ALLOWED_ORIGIN) return json({ error: "Origine non autorisée." }, 403, origin);
    if (request.method !== "POST") return json({ error: "Méthode non autorisée." }, 405, origin);
    if (!env.OPENAI_API_KEY) return json({ error: "Le serveur n'a pas encore de clé API configurée." }, 503, origin);
    const length = Number(request.headers.get("Content-Length") || 0);
    if (length > MAX_BODY_BYTES) return json({ error: "Requête trop volumineuse." }, 413, origin);
    let body;
    try { body = await request.json(); } catch { return json({ error: "Requête JSON invalide." }, 400, origin); }
    const mode = ["chat", "listing", "photo", "price"].includes(body.mode) ? body.mode : "chat";
    const message = typeof body.message === "string" ? body.message.slice(0, 5000) : "";
    const imageData = typeof body.imageData === "string" ? body.imageData : "";
    if (!message && !imageData) return json({ error: "Ajoute une question ou une image." }, 400, origin);
    if (imageData && (!/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(imageData) || imageData.length > 4_300_000)) {
      return json({ error: "Image invalide ou trop volumineuse. Utilise un JPG, PNG ou WEBP de moins de 3 Mo." }, 400, origin);
    }
    const content = [{ type: "input_text", text: message || "Analyse cette photo et donne des conseils utiles." }];
    if (imageData) content.push({ type: "input_image", image_url: imageData, detail: "low" });
    try {
      const upstream = await fetch("https://api.openai.com/v1/responses", {
        method: "POST",
        headers: { "Authorization": "Bearer " + env.OPENAI_API_KEY, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: env.OPENAI_MODEL || "gpt-4.1-mini",
          instructions: instructions(mode),
          input: [{ role: "user", content }],
          max_output_tokens: 900,
          store: false
        })
      });
      const result = await upstream.json().catch(() => ({}));
      if (!upstream.ok) {
        return json({ error: upstream.status === 401 ? "La clé API du serveur est invalide." : "Le fournisseur IA a rencontré une erreur. Réessaie plus tard." }, 502, origin);
      }
      const answer = extractText(result);
      if (!answer) return json({ error: "Aucune réponse textuelle reçue." }, 502, origin);
      return json({ answer }, 200, origin);
    } catch {
      return json({ error: "Le service IA est momentanément indisponible." }, 502, origin);
    }
  }
};
