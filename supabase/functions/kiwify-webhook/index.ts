import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "npm:@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function generatePassword(email: string): string {
  let namePart = email.split("@")[0];
  if (namePart.length < 3) {
    namePart = namePart.padEnd(3, 'x');
  }
  const first3 = namePart.substring(0, 3);
  const last3 = namePart.substring(namePart.length - 3);
  const randomNum = Math.floor(Math.random() * (999 - 100 + 1)) + 100;
  return `${first3}${last3}${randomNum}`;
}

Deno.serve(async (req) => {
  // Tratamento de CORS para preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const payload = await req.json()
    const email = payload?.Customer?.email

    if (!email) {
      return new Response(
        JSON.stringify({ error: "O e-mail do comprador não foi encontrado no payload." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    const password = generatePassword(email)

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? ""
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? ""

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !RESEND_API_KEY) {
      throw new Error("Variáveis de ambiente não configuradas.")
    }

    // Usando Service Role Key para contornar RLS
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    const { data: userData, error: userError } = await supabase.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true
    })

    if (userError) {
      console.error("Erro ao criar usuário:", userError)
      return new Response(
        JSON.stringify({ error: "Erro ao criar usuário no Supabase.", details: userError.message }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
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
          <p>Recomendamos que você altere sua senha após o primeiro acesso.</p>
        `,
      }),
    });

    if (!resendResponse.ok) {
      const errorText = await resendResponse.text();
      console.error("Erro do Resend:", errorText)
      return new Response(
        JSON.stringify({ error: "Erro ao enviar e-mail via Resend.", details: errorText }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    return new Response(
      JSON.stringify({ message: "Usuário criado e e-mail enviado com sucesso." }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  } catch (err) {
    console.error("Erro na função:", err)
    return new Response(
      JSON.stringify({ error: "Erro interno no servidor.", details: err instanceof Error ? err.message : String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  }
})
