import fs from 'fs';

// Dicionário de Correções Ortográficas, Acentuações e Simplificações de Nomes (Fase 1)
const spellingCorrections = [
  // Termos Científicos e Técnicos solicitados e comuns
  { regex: /ácido\s+ascórbico/gi, replacement: 'Vitamina C' },
  { regex: /musa\s+spp/gi, replacement: 'Banana' },
  { regex: /musa\s+paradisiaca/gi, replacement: 'Banana' },
  { regex: /musa\s+acuminata/gi, replacement: 'Banana' },
  { regex: /saccharum\s+officinarum/gi, replacement: 'Cana-de-açúcar' },
  { regex: /cloreto\s+de\s+sódio/gi, replacement: 'Sal de cozinha' },
  { regex: /citrus\s+sinensis/gi, replacement: 'Laranja' },
  { regex: /citrus\s+limon/gi, replacement: 'Limão' },
  { regex: /malus\s+domestica/gi, replacement: 'Maçã' },
  { regex: /vitis\s+vinifera/gi, replacement: 'Uva' },
  { regex: /solanum\s+tuberosum/gi, replacement: 'Batata-inglesa' },
  { regex: /manihot\s+esculenta/gi, replacement: 'Mandioca' },
  { regex: /phaseolus\s+vulgaris/gi, replacement: 'Feijão' },
  { regex: /oryza\s+sativa/gi, replacement: 'Arroz' },
  { regex: /zea\s+mays/gi, replacement: 'Milho' },
  { regex: /triticum\s+aestivum/gi, replacement: 'Trigo' },
  { regex: /glycine\s+max/gi, replacement: 'Soja' },
  { regex: /avena\s+sativa/gi, replacement: 'Aveia' },
  { regex: /solanum\s+lycopersicum/gi, replacement: 'Tomate' },
  { regex: /allium\s+cepa/gi, replacement: 'Cebola' },
  { regex: /allium\s+sativum/gi, replacement: 'Alho' },
  { regex: /daucus\s+carota/gi, replacement: 'Cenoura' },
  { regex: /cucumis\s+sativus/gi, replacement: 'Pepino' },
  { regex: /ananas\s+comosus/gi, replacement: 'Abacaxi' },
  { regex: /persea\s+americana/gi, replacement: 'Abacate' },

  // Remotização de listas longas parentéticas do IBGE para simplificar a busca do nutricionista
  { regex: /\(ouro,\s*prata,\s*d[áa]gua,\s*da\s*terra,\s*etc\)/gi, replacement: '' },
  { regex: /\(polido,\s*parboilizado,\s*agulha,\s*agulhinha,\s*etc\)/gi, replacement: '' },
  { regex: /\(preto,\s*mulatinho,\s*roxo,\s*rosinha,\s*etc\)/gi, replacement: '' },
  { regex: /\(em\s+grao\)/gi, replacement: 'em grão' },
  { regex: /\(in\s+natura\)/gi, replacement: 'in natura' },

  // Remoção de "(nao se aplica)" e variações
  { regex: /\s*\(nao\s+se\s+aplica\)/gi, replacement: '' },
  { regex: /\s*\(não\s+se\s+aplica\)/gi, replacement: '' },

  // Correções de acentuação e ortografia em português
  { regex: /\bnao\b/g, replacement: 'não' },
  { regex: /\bFeijao\b/g, replacement: 'Feijão' },
  { regex: /\bfeijao\b/g, replacement: 'feijão' },
  { regex: /\bGrao\b/g, replacement: 'Grão' },
  { regex: /\bgrao\b/g, replacement: 'grão' },
  { regex: /\bPao\b/g, replacement: 'Pão' },
  { regex: /\bpao\b/g, replacement: 'pão' },
  { regex: /\bMacarrao\b/g, replacement: 'Macarrão' },
  { regex: /\bmacarrao\b/g, replacement: 'macarrão' },
  { regex: /\bMamao\b/g, replacement: 'Mamão' },
  { regex: /\bmamao\b/g, replacement: 'mamão' },
  { regex: /\bMelao\b/g, replacement: 'Melão' },
  { regex: /\bmelao\b/g, replacement: 'melão' },
  { regex: /\bAgua\b/g, replacement: 'Água' },
  { regex: /\bagua\b/g, replacement: 'água' },
  { regex: /\boleo\b/g, replacement: 'óleo' },
  { regex: /\bOleo\b/g, replacement: 'Óleo' },
  { regex: /\bcafe\b/g, replacement: 'café' },
  { regex: /\bCafe\b/g, replacement: 'Café' },
  { regex: /\bcha\b/g, replacement: 'chá' },
  { regex: /\bCha\b/g, replacement: 'Chá' },
  { regex: /\borganico\b/g, replacement: 'orgânico' },
  { regex: /\bOrganico\b/g, replacement: 'Orgânico' },
  { regex: /\brequeijao\b/g, replacement: 'requeijão' },
  { regex: /\bRequeijao\b/g, replacement: 'Requeijão' },
  { regex: /\bacucar\b/g, replacement: 'açúcar' },
  { regex: /\bAcucar\b/g, replacement: 'Açúcar' },
  { regex: /\bsanduiche\b/g, replacement: 'sanduíche' },
  { regex: /\bSanduiche\b/g, replacement: 'Sanduíche' },
  { regex: /\blinguica\b/g, replacement: 'linguiça' },
  { regex: /\bLinguica\b/g, replacement: 'Linguiça' },
  { regex: /\bcamarao\b/g, replacement: 'camarão' },
  { regex: /\bCamarao\b/g, replacement: 'Camarão' },
  { regex: /\bmusculo\b/g, replacement: 'músculo' },
  { regex: /\bMusculo\b/g, replacement: 'Músculo' },
  { regex: /\bpre-cozido\b/g, replacement: 'pré-cozido' },
  { regex: /\bPre-cozido\b/g, replacement: 'Pré-cozido' },
  { regex: /\bpo\b/g, replacement: 'pó' },
  { regex: /\bPo\b/g, replacement: 'Pó' },

  // Tratamento de processos e preparos técnicos
  { regex: /,\s*infusão\s+\d+%?/gi, replacement: ' (infusão)' },
  { regex: /,\s*cru(a)?/gi, replacement: ' (cru)' },
  { regex: /,\s*cozido(a)?/gi, replacement: ' (cozido)' },
  { regex: /,\s*assado(a)?/gi, replacement: ' (assado)' },
  { regex: /,\s*frito(a)?/gi, replacement: ' (frito)' },
  { regex: /,\s*grelhado(a)?/gi, replacement: ' (grelhado)' },
  { regex: /,\s*com\s+sal/gi, replacement: ' (com sal)' },
  { regex: /,\s*sem\s+sal/gi, replacement: ' (sem sal)' },
  { regex: /,\s*tipo\s+/gi, replacement: ' tipo ' },

  // Parenteses do IBGE adicionais
  { regex: /\(cozido\(a\)\)/gi, replacement: '(cozido)' },
  { regex: /\(assado\(a\)\)/gi, replacement: '(assado)' },
  { regex: /\(frito\(a\)\)/gi, replacement: '(frito)' },
  { regex: /\(empanado\(a\)\/a\s+milanesa\)/gi, replacement: '(empanado à milanesa)' },
  { regex: /\(com\s+manteiga\/oleo\)/gi, replacement: '(com manteiga/óleo)' },
  { regex: /\(ensopado\)/gi, replacement: '(ensopado)' },
  { regex: /\(mingau\)/gi, replacement: '(mingau)' },
  { regex: /\(sopa\)/gi, replacement: '(sopa)' }
];

// Limpa e formata os nomes técnicos para comuns (Fase 1)
function cleanName(name) {
  let cleaned = name;

  // Aplica as substituições ortográficas/simplificações (Fase 1)
  for (const item of spellingCorrections) {
    cleaned = cleaned.replace(item.regex, item.replacement);
  }

  // Limpeza de vírgulas de classificação estrutural
  cleaned = cleaned.replace(/,\s*de\s+/gi, ' de ');
  cleaned = cleaned.replace(/,\s*com\s+/gi, ' com ');
  cleaned = cleaned.replace(/,\s*sem\s+/gi, ' sem ');
  cleaned = cleaned.replace(/,\s*tipo\s+/gi, ' tipo ');
  cleaned = cleaned.replace(/,\s*em\s+/gi, ' em ');
  cleaned = cleaned.replace(/,\s*para\s+/gi, ' para ');

  // Vírgulas genéricas restantes viram espaço simples
  cleaned = cleaned.replace(/,\s+/g, ' ');

  // Remove espaços múltiplos e limpa pontas
  cleaned = cleaned.replace(/\s+/g, ' ').trim();

  // Capitaliza a primeira letra do nome
  if (cleaned.length > 0) {
    cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
  }

  return cleaned;
}

// Verifica se o alimento é líquido (Fase 2)
function isLiquid(name) {
  // Remove acentos para garantir a classificação correta sem falsos negativos
  const normalized = name.toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  // Exceções sólidas ou pastosas que contém palavras de líquidos
  if (
    normalized.includes('doce de leite') ||
    normalized.includes('leite em po') ||
    normalized.includes('leite condensado') ||
    normalized.includes('creme de leite') ||
    normalized.includes('queijo') ||
    normalized.includes('manteiga')
  ) {
    return false;
  }

  // Palavras-chave normatizadas sem acento
  const liquidKeywords = [
    'suco', 'leite', 'agua', 'oleo', 'refrigerante',
    'bebida', 'caldo', 'cha', 'cafe', 'cerveja', 'vinho', 'azeite',
    'nectar', 'licor', 'vitamina', 'achocolatado', 'cachaca', 'vodka', 'rum', 'energetico'
  ];

  return liquidKeywords.some(kw => normalized.includes(kw));
}

// Configuração estrita de medidas caseiras sem o prefixo numérico fixo "1 " (Fase 2)
function getHouseholdMeasures(isLiquidFood) {
  if (isLiquidFood) {
    // Apenas medidas líquidas
    return [
      { measure: 'copo de 200ml', amount: 200, unit: 'ml' },
      { measure: 'xícara', amount: 240, unit: 'ml' },
      { measure: 'colher de sopa', amount: 15, unit: 'ml' },
      { measure: 'ml', amount: 1, unit: 'ml' }
    ];
  } else {
    // Apenas medidas sólidas
    return [
      { measure: 'colher de sopa', amount: 15, unit: 'g' },
      { measure: 'escumadeira', amount: 30, unit: 'g' },
      { measure: 'fatia', amount: 30, unit: 'g' },
      { measure: 'unidade', amount: 100, unit: 'g' },
      { measure: 'pedaço', amount: 50, unit: 'g' },
      { measure: 'colher de servir', amount: 25, unit: 'g' },
      { measure: 'g', amount: 1, unit: 'g' }
    ];
  }
}

// Função que extrai os dados JSON de dentro dos arquivos exportados em .ts
function extractData(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const startIndex = content.indexOf('[');
  const endIndex = content.lastIndexOf(']') + 1;
  const jsonString = content.substring(startIndex, endIndex);
  return JSON.parse(jsonString);
}

// Processa o alimento de acordo com as 3 fases
function processFood(item) {
  // FASE 1: Limpeza e Tradução
  const cleanedName = cleanName(item.name);

  // FASE 2: Classificação e Medidas Caseiras Específicas
  const liquid = isLiquid(cleanedName);
  const unit = liquid ? 'ml' : 'g';
  const householdMeasures = getHouseholdMeasures(liquid);

  return {
    ...item,
    name: cleanedName,
    unit,
    householdMeasures
  };
}

// Atualiza o arquivo
function updateTable(inputPath, outputPath, exportName) {
  console.log(`Processando ${inputPath}...`);
  try {
    const data = extractData(inputPath);
    const updatedData = data.map(processFood);
    
    const fileContent = `export const ${exportName} = ${JSON.stringify(updatedData, null, 2)};\n`;
    fs.writeFileSync(outputPath, fileContent);
    console.log(`✅ ${outputPath} atualizado com sucesso! Total: ${updatedData.length}`);
  } catch (error) {
    console.error(`Erro ao processar ${inputPath}:`, error.message);
  }
}

console.log("=== INICIANDO PROCESSAMENTO DA BASE EM 3 FASES ===\n");
updateTable('src/data/taco.ts', 'src/data/taco.ts', 'tacoData');
updateTable('src/data/ibge.ts', 'src/data/ibge.ts', 'ibgeData');
console.log("\n=== CONCLUÍDO COM SUCESSO! ===");
