import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "npm:@supabase/supabase-js@2"

// Recebe os webhooks da Kiwify do produto BodyComp:
// - compra aprovada  -> cria a conta e envia login e senha por e-mail
// - reembolso / chargeback -> bloqueia o acesso
// Toda requisição precisa da assinatura da Kiwify (?signature=), calculada com o
// token do webhook (secret KIWIFY_WEBHOOK_TOKEN). Sem ela, nada é criado.

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const jsonResponse = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  })

// Senha aleatória de 12 caracteres, sem os que se confundem (0/O, 1/l/I)
function generatePassword(length = 12): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789"
  const limit = 256 - (256 % alphabet.length) // evita viés do módulo
  let password = ""
  while (password.length < length) {
    for (const byte of crypto.getRandomValues(new Uint8Array(length * 2))) {
      if (byte < limit && password.length < length) password += alphabet[byte % alphabet.length]
    }
  }
  return password
}

async function hmacSha1Hex(secret: string, message: string): Promise<string> {
  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-1" }, false, ["sign"])
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(message))
  return Array.from(new Uint8Array(signature), (byte) => byte.toString(16).padStart(2, "0")).join("")
}

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

// A Kiwify assina o JSON do corpo com HMAC-SHA1 (hex). Confere o corpo bruto e o JSON re-serializado.
async function isValidSignature(rawBody: string, payload: unknown, signature: string | null, token: string) {
  if (!signature) return false
  const expected = signature.trim().toLowerCase()
  for (const body of new Set([rawBody, JSON.stringify(payload)])) {
    if (safeEqual(await hmacSha1Hex(token, body), expected)) return true
  }
  return false
}

// deno-lint-ignore no-explicit-any
async function findUserByEmail(supabase: any, email: string) {
  for (let page = 1; page <= 50; page++) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 })
    if (error) throw error
    // deno-lint-ignore no-explicit-any
    const user = data.users.find((u: any) => u.email?.toLowerCase() === email)
    if (user) return user
    if (data.users.length < 1000) return null
  }
  return null
}

const REVOKED_STATUSES = ["refunded", "chargedback"]
const REVOKED_EVENTS = ["order_refunded", "chargeback"]
// Eventos que não são pagamento aprovado (caso alguém marque esses eventos no webhook da Kiwify)
const NOT_PAID_STATUSES = ["waiting_payment", "refused", "abandoned"]
const NOT_PAID_EVENTS = ["billet_created", "pix_created", "order_rejected", "abandoned_cart"]

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }
  if (req.method !== 'POST') {
    return jsonResponse(405, { error: "Método não permitido." })
  }

  try {
    const KIWIFY_WEBHOOK_TOKEN = Deno.env.get("KIWIFY_WEBHOOK_TOKEN") ?? ""
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? ""
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? ""

    if (!KIWIFY_WEBHOOK_TOKEN || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !RESEND_API_KEY) {
      throw new Error("Variáveis de ambiente não configuradas.")
    }

    const rawBody = await req.text()
    let payload
    try {
      payload = JSON.parse(rawBody)
    } catch {
      return jsonResponse(400, { error: "JSON inválido." })
    }

    const url = new URL(req.url)
    const signature = url.searchParams.get("signature")
    if (!(await isValidSignature(rawBody, payload, signature, KIWIFY_WEBHOOK_TOKEN))) {
      // Só nomes, sem valores: ajuda a diagnosticar se a Kiwify mudar o formato
      console.warn("Assinatura inválida ou ausente", {
        queryParams: [...url.searchParams.keys()],
        headers: [...req.headers.keys()],
      })
      return jsonResponse(401, { error: "Assinatura inválida." })
    }

    const email = String(payload?.Customer?.email ?? "").trim().toLowerCase()
    const status = payload?.order_status
    const event = payload?.webhook_event_type
    console.log("Webhook Kiwify", { event, status, order: payload?.order_id })

    if (!email) {
      return jsonResponse(400, { error: "O e-mail do comprador não foi encontrado no payload." })
    }

    // O botão "Testar Webhook" da Kiwify usa e-mails @example.com: confirma a assinatura sem criar conta
    if (email.endsWith("@example.com")) {
      return jsonResponse(200, { message: "Teste recebido: assinatura válida." })
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    if (REVOKED_STATUSES.includes(status) || REVOKED_EVENTS.includes(event)) {
      const user = await findUserByEmail(supabase, email)
      if (user) {
        const { error } = await supabase.auth.admin.updateUserById(user.id, { ban_duration: "876000h" })
        if (error) throw error
      }
      return jsonResponse(200, { message: user ? "Acesso bloqueado." : "Usuário não encontrado." })
    }

    if (NOT_PAID_STATUSES.includes(status) || NOT_PAID_EVENTS.includes(event)) {
      return jsonResponse(200, { message: "Evento ignorado: pagamento não aprovado." })
    }

    const password = generatePassword()
    const { error: userError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    })

    if (userError) {
      // Já tem conta (compra repetida): libera de novo se estava bloqueada e não reenvia senha
      if (userError.code === "email_exists" || /already/i.test(userError.message)) {
        const user = await findUserByEmail(supabase, email)
        if (user?.banned_until) {
          await supabase.auth.admin.updateUserById(user.id, { ban_duration: "none" })
        }
        return jsonResponse(200, { message: "Usuário já existe." })
      }
      console.error("Erro ao criar usuário:", userError)
      return jsonResponse(400, { error: "Erro ao criar usuário no Supabase.", details: userError.message })
    }

    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "BodyComp <contato@bodycomp.com.br>", // Domínio verificado!
        to: email,
        subject: "Seu acesso ao BodyComp!",
        html: `
          <h1>Bem-vindo ao BodyComp!</h1>
          <p>Sua compra foi aprovada e sua conta foi criada com sucesso.</p>
          <p>Aqui estão seus dados de acesso:</p>
          <ul>
            <li><strong>Login:</strong> ${email}</li>
            <li><strong>Senha:</strong> ${password}</li>
          </ul>
          <p>Acesse a plataforma clicando <a href="https://www.bodycomp.com.br/">aqui</a>.</p>
          <br/>
          <p>Recomendamos trocar a senha no primeiro acesso, em Perfil &gt; Alterar Senha.</p>
        `,
      }),
    })

    if (!resendResponse.ok) {
      const errorText = await resendResponse.text()
      console.error("Erro do Resend:", errorText)
      return jsonResponse(500, { error: "Erro ao enviar e-mail via Resend.", details: errorText })
    }

    return jsonResponse(200, { message: "Usuário criado e e-mail enviado com sucesso." })
  } catch (err) {
    console.error("Erro na função:", err)
    return jsonResponse(500, { error: "Erro interno no servidor.", details: err instanceof Error ? err.message : String(err) })
  }
})
