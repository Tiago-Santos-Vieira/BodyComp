export interface AIContextData {
  name: string;
  age: number | string;
  gender: string;
  objective: string;
  weight: number;
  height: number;
  bodyFat: number | null;
  anamnesis: any;
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export async function generateDietPlan(context: AIContextData, apiKey: string) {
  // Format Anamnesis summary
  let anamnesisText = 'Não preenchida.';
  if (context.anamnesis) {
    const a = context.anamnesis;
    anamnesisText = `
- Intestino: ${a.intestine || 'N/A'}
- Sono: ${a.sleep || 'N/A'}
- Atividade Física: ${a.physicalActivity || 'N/A'}
- Medicamentos: ${a.medications || 'N/A'}
- Restrições/Alergias: ${a.restrictions || 'N/A'}
- Histórico Familiar: ${a.familyHistory || 'N/A'}
- Hábitos: ${a.habits || 'N/A'}
- Comportamento Alimentar: ${a.eatingBehavior || 'N/A'}
    `;
  }

  const prompt = `
Você é um Nutricionista Clínico, Esportivo e Comportamental especialista em criar planos alimentares perfeitamente calculados, baseados nas tabelas TACO e IBGE do Brasil.

PERFIL DO PACIENTE:
- Nome: ${context.name}
- Idade: ${context.age}
- Gênero: ${context.gender}
- Objetivo Principal: ${context.objective}
- Peso: ${context.weight}kg
- Altura: ${context.height}cm
${context.bodyFat ? `- % Gordura: ${context.bodyFat}%` : ''}

DADOS CLÍNICOS E HÁBITOS (ANAMNESE):
${anamnesisText}

OBJETIVO DA TAREFA:
Crie um plano alimentar completo de 1 dia para este paciente, dividido em 4 a 6 refeições. Respeite as restrições alimentares. Use medidas caseiras reais do Brasil.

CÁLCULO E MACRONUTRIENTES:
Calcule kcal, carb, prot, gord para as quantidades sugeridas. Objetivo: ${context.objective}, Peso: ${context.weight}kg.

RESPOSTA - APENAS JSON VÁLIDO, sem markdown, sem texto extra:
{"meals":[{"name":"Café da Manhã","time":"08:00","items":[{"name":"Ovo cozido","measure":"unidade(s)","quantity":2,"weight":"100g","kcal":155,"prot":13,"carb":1,"gord":10}]}]}
`;

  // ─── PASSO 1: Descobrir modelos disponíveis ───────────────────────────────────
  let listRes: Response;
  try {
    listRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}&pageSize=100`
    );
  } catch {
    throw new Error('Sem conexão com o servidor do Google. Verifique sua internet.');
  }

  const listData = await listRes.json();

  if (!listRes.ok || listData?.error) {
    const msg = listData?.error?.message || 'Erro desconhecido';
    if (listData?.error?.code === 403) throw new Error('Chave de API inválida ou sem permissão. Verifique em aistudio.google.com.');
    throw new Error(`Erro ao verificar modelos: ${msg}`);
  }

  if (!listData?.models?.length) {
    throw new Error('Nenhum modelo encontrado para esta chave de API.');
  }

  // Filtrar: apenas modelos que suportam generateContent E NÃO são de áudio/TTS/vídeo
  const EXCLUDED_KEYWORDS = ['tts', 'audio', 'video', 'vision', 'embedding', 'aqa'];
  const availableModels: string[] = listData.models
    .filter((m: any) => {
      const nameLower = m.name.toLowerCase();
      const supportsGenerate = m.supportedGenerationMethods?.includes('generateContent');
      const isExcluded = EXCLUDED_KEYWORDS.some(k => nameLower.includes(k));
      return supportsGenerate && !isExcluded;
    })
    .map((m: any) => m.name.replace('models/', ''));

  console.log('📋 Modelos de texto disponíveis:', availableModels);

  if (!availableModels.length) {
    throw new Error('Nenhum modelo de texto disponível para esta chave. Verifique sua conta no Google AI Studio.');
  }

  // ─── PASSO 2: Ordenar por preferência ────────────────────────────────────────
  const PRIORITY_KEYWORDS = ['flash', 'pro'];
  const DEPRIORITY_KEYWORDS = ['preview', 'exp', 'lite'];

  const scored = availableModels.map(name => {
    let score = 0;
    if (PRIORITY_KEYWORDS.some(k => name.includes(k))) score += 10;
    if (DEPRIORITY_KEYWORDS.some(k => name.includes(k))) score -= 5;
    return { name, score };
  });
  scored.sort((a, b) => b.score - a.score);
  const orderedModels = scored.map(m => m.name);

  console.log('🎯 Ordem de tentativa:', orderedModels);

  // ─── PASSO 3: Tentar cada modelo com retry para 429 temporário ───────────────
  let lastError: any;

  for (const modelName of orderedModels) {
    // Tenta até 2x por modelo (para caso de 429 temporário de RPM)
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.7 }
          })
        });

        const json = await res.json();

        if (!res.ok || json.error) {
          const errCode = json?.error?.code ?? res.status;
          const errMsg = json?.error?.message || res.statusText;
          const errStatus = json?.error?.status || '';

          // 429 RESOURCE_EXHAUSTED com limit=0 → problema de billing permanente
          if (errCode === 429 && (errStatus === 'RESOURCE_EXHAUSTED' || errMsg.toLowerCase().includes('quota'))) {
            console.warn(`Modelo ${modelName}: COTA ESGOTADA (billing).`);
            lastError = new Error(`BILLING: Cota da chave esgotada para o modelo ${modelName}.`);
            break; // Vai para o próximo modelo
          }

          // 429 Too Many Requests → temporário de RPM, aguardar e tentar de novo
          if (errCode === 429 && attempt === 1) {
            console.warn(`Modelo ${modelName}: Rate limit temporário. Aguardando 5s...`);
            await sleep(5000);
            continue; // tenta de novo
          }

          // 404 ou 400 → modelo não disponível, tenta próximo
          console.warn(`Modelo ${modelName} falhou (${errCode}): ${errMsg}`);
          lastError = new Error(errMsg);
          break;
        }

        const text = json?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!text) throw new Error('Resposta vazia da IA.');

        // Extrair JSON da resposta
        let cleanText = text.trim();
        const jsonMatch = cleanText.match(/\{[\s\S]*\}/);
        if (jsonMatch) cleanText = jsonMatch[0];

        const data = JSON.parse(cleanText);
        if (!data || !Array.isArray(data.meals)) {
          throw new Error('Formato JSON retornado inválido.');
        }

        console.log(`✅ Dieta gerada com sucesso usando: ${modelName}`);
        return data;

      } catch (error: any) {
        lastError = error;
        break;
      }
    }
  }

  // Verificar se todos os erros foram de billing
  const allBilling = lastError?.message?.startsWith('BILLING:');
  if (allBilling) {
    throw new Error(
      'Sua chave de API atingiu o limite de requisições gratuitas. ' +
      'Aguarde alguns minutos e tente novamente. Se persistir, acesse ' +
      'aistudio.google.com e verifique sua cota gratuita diária.'
    );
  }

  throw new Error(
    `Todos os ${orderedModels.length} modelos disponíveis falharam. ` +
    `Último erro: ${lastError?.message || 'desconhecido'}`
  );
}
