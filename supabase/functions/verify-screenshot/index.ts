import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY')!
const ANTHROPIC_MODEL = 'claude-haiku-4-5-20251001'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

// Ne renvoie que les champs nécessaires à la page mobile — jamais user_id,
// mise_euros ou d'autres données de l'engagement.
async function getEngagementByToken(token: string) {
  const { data, error } = await supabase
    .from('engagements')
    .select('id, nom, sites_bloques, heure_debut, heure_fin, verification_statut')
    .eq('verification_token', token)
    .maybeSingle()

  if (error || !data) return null
  return data
}

function buildSystemPrompt(engagement: {
  nom: string
  sites_bloques: string[]
  heure_debut: string
  heure_fin: string
}) {
  const sites = (engagement.sites_bloques || []).join(', ')
  return `Tu es un assistant de vérification pour l'application Momentum. Tu analyses des captures d'écran de temps d'écran (iOS "Temps d'écran" ou Android "Bien-être numérique").

L'utilisateur avait pris l'engagement suivant : bloquer ${sites} pendant la plage ${engagement.heure_debut}-${engagement.heure_fin}.

Analyse cette capture d'écran et détermine si l'utilisateur a respecté son engagement. Réponds UNIQUEMENT avec un JSON valide (double quotes), sans texte autour, selon ce format exact :
{
  "reussi": true,
  "raison": "explication courte en français",
  "apps_detectees": ["liste des apps visibles sur la capture"],
  "temps_excessif": ["apps qui dépassent un usage raisonnable pendant la plage de blocage"]
}`
}

function extractJson(text: string) {
  const cleaned = text
    .trim()
    .replace(/^```(json)?/i, '')
    .replace(/```$/, '')
    .trim()
  return JSON.parse(cleaned)
}

async function callAnthropic(engagement: any, imageBase64: string, mimeType: string) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: ANTHROPIC_MODEL,
      max_tokens: 1024,
      system: buildSystemPrompt(engagement),
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: { type: 'base64', media_type: mimeType, data: imageBase64 },
            },
            {
              type: 'text',
              text: "Voici la capture d'écran à analyser.",
            },
          ],
        },
      ],
    }),
  })

  if (!res.ok) {
    const errText = await res.text()
    throw new Error(`Anthropic API error (${res.status}): ${errText}`)
  }

  const data = await res.json()
  const textBlock = data.content?.find((c: any) => c.type === 'text')
  if (!textBlock) throw new Error("Réponse Anthropic sans contenu texte.")

  return extractJson(textBlock.text)
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    if (req.method === 'GET') {
      const url = new URL(req.url)
      const token = url.searchParams.get('token')
      if (!token) return jsonResponse({ error: 'Token manquant.' }, 400)

      const engagement = await getEngagementByToken(token)
      if (!engagement) return jsonResponse({ error: 'Engagement introuvable.' }, 404)

      return jsonResponse(engagement)
    }

    if (req.method === 'POST') {
      const { token, imageBase64, mimeType } = await req.json()

      if (!token || !imageBase64 || !mimeType) {
        return jsonResponse({ error: 'Paramètres manquants.' }, 400)
      }

      // L'engagement est relu côté serveur à partir du token : on ne fait
      // jamais confiance aux champs "engagement" envoyés par le client.
      const engagement = await getEngagementByToken(token)
      if (!engagement) return jsonResponse({ error: 'Engagement introuvable.' }, 404)

      await supabase
        .from('engagements')
        .update({ verification_statut: 'en_attente' })
        .eq('id', engagement.id)

      let aiResult
      try {
        aiResult = await callAnthropic(engagement, imageBase64, mimeType)
      } catch (err) {
        console.error('[verify-screenshot] Échec analyse IA :', err)
        return jsonResponse({ error: "L'analyse de la capture a échoué." }, 502)
      }

      const statut = aiResult.reussi === true ? 'reussi' : 'echoue'

      await supabase
        .from('engagements')
        .update({
          verification_statut: statut,
          verification_resultat: aiResult,
        })
        .eq('id', engagement.id)

      return jsonResponse({ ...aiResult, statut })
    }

    return jsonResponse({ error: 'Méthode non supportée.' }, 405)
  } catch (err) {
    console.error('[verify-screenshot] Erreur inattendue :', err)
    return jsonResponse({ error: 'Erreur serveur.' }, 500)
  }
})
