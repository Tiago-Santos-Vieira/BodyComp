// Alimentos e suplementos que não existem na TACO nem na tabela do IBGE.
// Valores por 100 g (ou 100 ml) e mesmo formato de taco.ts / ibge.ts.
// source:
//   SUPL   = suplemento; média de rótulos de marcas comuns no Brasil (varia por marca)
//   USDA   = USDA FoodData Central
//   RÓTULO = produto industrializado; média de rótulos de marcas comuns no Brasil

const m = (measure: string, amount: number, unit = 'g') => ({ measure, amount, unit });
const grams = m('g', 1);
const mls = m('ml', 1, 'ml');

export const extrasData = [
  // ── Proteínas em pó ────────────────────────────────────────────────
  { id: 'x-whey-concentrado', name: 'Whey protein concentrado (pó)', kcal: 400, prot: 78, carb: 8, gord: 6, unit: 'g', source: 'SUPL',
    householdMeasures: [m('scoop (dosador)', 30), m('colher de sopa', 10), grams] },
  { id: 'x-whey-isolado', name: 'Whey protein isolado (pó)', kcal: 370, prot: 88, carb: 2, gord: 1, unit: 'g', source: 'SUPL',
    householdMeasures: [m('scoop (dosador)', 30), m('colher de sopa', 10), grams] },
  { id: 'x-whey-hidrolisado', name: 'Whey protein hidrolisado (pó)', kcal: 374, prot: 85, carb: 4, gord: 2, unit: 'g', source: 'SUPL',
    householdMeasures: [m('scoop (dosador)', 30), m('colher de sopa', 10), grams] },
  { id: 'x-caseina', name: 'Caseína micelar (pó)', kcal: 358, prot: 80, carb: 5, gord: 2, unit: 'g', source: 'SUPL',
    householdMeasures: [m('scoop (dosador)', 30), m('colher de sopa', 10), grams] },
  { id: 'x-albumina', name: 'Albumina (clara de ovo em pó)', kcal: 360, prot: 82, carb: 7, gord: 0.3, unit: 'g', source: 'SUPL',
    householdMeasures: [m('scoop (dosador)', 30), m('colher de sopa', 10), grams] },
  { id: 'x-proteina-ervilha', name: 'Proteína isolada de ervilha (pó)', kcal: 386, prot: 80, carb: 3, gord: 6, unit: 'g', source: 'SUPL',
    householdMeasures: [m('scoop (dosador)', 30), m('colher de sopa', 10), grams] },
  { id: 'x-proteina-soja', name: 'Proteína isolada de soja (pó)', kcal: 335, prot: 88.3, carb: 0, gord: 3.4, unit: 'g', source: 'USDA',
    householdMeasures: [m('scoop (dosador)', 30), m('colher de sopa', 10), grams] },
  { id: 'x-colageno', name: 'Colágeno hidrolisado (pó, sem sabor)', kcal: 360, prot: 90, carb: 0, gord: 0, unit: 'g', source: 'SUPL',
    householdMeasures: [m('colher de sopa', 10), m('dose', 10), grams] },
  { id: 'x-barra-proteina', name: 'Barra de proteína', kcal: 390, prot: 32, carb: 34, gord: 14, unit: 'g', source: 'SUPL',
    householdMeasures: [m('unidade', 45), grams] },

  // ── Aminoácidos e outros ───────────────────────────────────────────
  { id: 'x-creatina', name: 'Creatina monohidratada (pó)', kcal: 0, prot: 0, carb: 0, gord: 0, unit: 'g', source: 'SUPL',
    householdMeasures: [m('dose (3 g)', 3), m('dose (5 g)', 5), grams] },
  { id: 'x-glutamina', name: 'Glutamina (pó)', kcal: 380, prot: 95, carb: 0, gord: 0, unit: 'g', source: 'SUPL',
    householdMeasures: [m('dose', 5), m('colher de chá', 5), grams] },
  { id: 'x-bcaa', name: 'BCAA (pó)', kcal: 368, prot: 92, carb: 0, gord: 0, unit: 'g', source: 'SUPL',
    householdMeasures: [m('dose', 5), grams] },
  { id: 'x-omega3', name: 'Ômega 3 (cápsula de óleo de peixe)', kcal: 900, prot: 0, carb: 0, gord: 100, unit: 'g', source: 'SUPL',
    householdMeasures: [m('cápsula', 1), grams] },
  { id: 'x-psyllium', name: 'Psyllium (casca em pó)', kcal: 205, prot: 2, carb: 88, gord: 0.6, unit: 'g', source: 'SUPL',
    householdMeasures: [m('colher de sopa', 5), m('colher de chá', 2), grams] },

  // ── Carboidratos para treino ───────────────────────────────────────
  { id: 'x-maltodextrina', name: 'Maltodextrina (pó)', kcal: 380, prot: 0, carb: 95, gord: 0, unit: 'g', source: 'SUPL',
    householdMeasures: [m('scoop (dosador)', 30), m('colher de sopa', 10), grams] },
  { id: 'x-dextrose', name: 'Dextrose (pó)', kcal: 365, prot: 0, carb: 91, gord: 0, unit: 'g', source: 'SUPL',
    householdMeasures: [m('scoop (dosador)', 30), m('colher de sopa', 10), grams] },
  { id: 'x-palatinose', name: 'Palatinose / isomaltulose (pó)', kcal: 400, prot: 0, carb: 100, gord: 0, unit: 'g', source: 'SUPL',
    householdMeasures: [m('scoop (dosador)', 30), m('colher de sopa', 10), grams] },
  { id: 'x-waxy-maize', name: 'Waxy maize / amilopectina (pó)', kcal: 380, prot: 0, carb: 95, gord: 0, unit: 'g', source: 'SUPL',
    householdMeasures: [m('scoop (dosador)', 30), m('colher de sopa', 10), grams] },
  { id: 'x-hipercalorico', name: 'Hipercalórico (pó)', kcal: 382, prot: 15, carb: 75, gord: 2.5, unit: 'g', source: 'SUPL',
    householdMeasures: [m('dosador', 50), m('colher de sopa', 15), grams] },
  { id: 'x-gel-carboidrato', name: 'Gel de carboidrato', kcal: 267, prot: 0, carb: 67, gord: 0, unit: 'g', source: 'SUPL',
    householdMeasures: [m('sachê', 30), grams] },
  { id: 'x-isotonico', name: 'Bebida isotônica', kcal: 24, prot: 0, carb: 6, gord: 0, unit: 'ml', source: 'RÓTULO',
    householdMeasures: [m('garrafa', 500, 'ml'), m('copo de 200ml', 200, 'ml'), mls] },

  // ── Peixes e proteínas ─────────────────────────────────────────────
  { id: 'x-tilapia-crua', name: 'Tilápia filé (cru)', kcal: 96, prot: 20.1, carb: 0, gord: 1.7, unit: 'g', source: 'USDA',
    householdMeasures: [m('filé médio', 120), grams] },
  { id: 'x-tilapia-grelhada', name: 'Tilápia filé (grelhado/assado)', kcal: 128, prot: 26.2, carb: 0, gord: 2.7, unit: 'g', source: 'USDA',
    householdMeasures: [m('filé médio', 100), grams] },
  { id: 'x-atum-agua', name: 'Atum em conserva em água (drenado)', kcal: 116, prot: 25.5, carb: 0, gord: 0.8, unit: 'g', source: 'USDA',
    householdMeasures: [m('lata drenada', 120), m('colher de sopa', 15), grams] },
  { id: 'x-pts', name: 'Proteína texturizada de soja (seca)', kcal: 333, prot: 50, carb: 31, gord: 1, unit: 'g', source: 'RÓTULO',
    householdMeasures: [m('colher de sopa', 10), m('xícara', 50), grams] },

  // ── Laticínios e bebidas ───────────────────────────────────────────
  { id: 'x-cottage', name: 'Queijo cottage', kcal: 98, prot: 11.1, carb: 3.4, gord: 4.3, unit: 'g', source: 'USDA',
    householdMeasures: [m('colher de sopa', 30), m('pote', 200), grams] },
  { id: 'x-iogurte-grego-natural', name: 'Iogurte grego natural (sem açúcar)', kcal: 97, prot: 9, carb: 4, gord: 5, unit: 'g', source: 'USDA',
    householdMeasures: [m('pote', 100), m('colher de sopa', 20), grams] },
  { id: 'x-iogurte-grego-tradicional', name: 'Iogurte grego tradicional (adoçado)', kcal: 125, prot: 5, carb: 15, gord: 5, unit: 'g', source: 'RÓTULO',
    householdMeasures: [m('pote', 100), m('colher de sopa', 20), grams] },
  { id: 'x-iogurte-proteico', name: 'Iogurte proteico (~15 g de proteína por pote)', kcal: 62, prot: 9.4, carb: 5.4, gord: 0.5, unit: 'g', source: 'RÓTULO',
    householdMeasures: [m('pote', 160), grams] },
  { id: 'x-kefir', name: 'Kefir (leite semidesnatado)', kcal: 41, prot: 3.8, carb: 4.5, gord: 0.9, unit: 'ml', source: 'USDA',
    householdMeasures: [m('copo de 200ml', 200, 'ml'), m('xícara', 240, 'ml'), mls] },
  { id: 'x-leite-sem-lactose-integral', name: 'Leite sem lactose integral (UHT)', kcal: 58, prot: 3, carb: 4.5, gord: 3, unit: 'ml', source: 'RÓTULO',
    householdMeasures: [m('copo de 200ml', 200, 'ml'), m('xícara', 240, 'ml'), m('colher de sopa', 15, 'ml'), mls] },
  { id: 'x-leite-sem-lactose-desnatado', name: 'Leite sem lactose desnatado (UHT)', kcal: 33, prot: 3.1, carb: 4.8, gord: 0.1, unit: 'ml', source: 'RÓTULO',
    householdMeasures: [m('copo de 200ml', 200, 'ml'), m('xícara', 240, 'ml'), m('colher de sopa', 15, 'ml'), mls] },
  { id: 'x-bebida-amendoas', name: 'Bebida de amêndoas (sem açúcar)', kcal: 15, prot: 0.6, carb: 0.6, gord: 1.2, unit: 'ml', source: 'USDA',
    householdMeasures: [m('copo de 200ml', 200, 'ml'), m('xícara', 240, 'ml'), mls] },
  { id: 'x-refrigerante-zero', name: 'Refrigerante zero (cola)', kcal: 0, prot: 0, carb: 0, gord: 0, unit: 'ml', source: 'RÓTULO',
    householdMeasures: [m('lata', 350, 'ml'), m('copo de 200ml', 200, 'ml'), mls] },
  { id: 'x-adocante-liquido', name: 'Adoçante líquido (sucralose/estévia)', kcal: 0, prot: 0, carb: 0, gord: 0, unit: 'ml', source: 'RÓTULO',
    householdMeasures: [m('10 gotas', 0.5, 'ml'), mls] },

  // ── Cereais, pães e farinhas ───────────────────────────────────────
  { id: 'x-arroz-parboilizado', name: 'Arroz parboilizado (cozido)', kcal: 123, prot: 2.9, carb: 26.1, gord: 0.4, unit: 'g', source: 'USDA',
    householdMeasures: [m('colher de sopa', 25), m('escumadeira', 80), grams] },
  { id: 'x-macarrao-integral', name: 'Macarrão integral (cozido)', kcal: 149, prot: 6, carb: 30.1, gord: 1.7, unit: 'g', source: 'USDA',
    householdMeasures: [m('pegador', 100), m('colher de sopa', 25), grams] },
  { id: 'x-goma-tapioca', name: 'Goma de tapioca hidratada (pronta)', kcal: 240, prot: 0, carb: 59, gord: 0, unit: 'g', source: 'RÓTULO',
    householdMeasures: [m('tapioca média', 50), m('colher de sopa', 15), grams] },
  { id: 'x-pao-sirio', name: 'Pão sírio (pita) branco', kcal: 275, prot: 9.1, carb: 55.7, gord: 1.2, unit: 'g', source: 'USDA',
    householdMeasures: [m('unidade média', 60), grams] },
  { id: 'x-tortilha-trigo', name: 'Tortilha / wrap de trigo (tipo Rap10)', kcal: 306, prot: 8.2, carb: 50, gord: 8, unit: 'g', source: 'RÓTULO',
    householdMeasures: [m('unidade', 35), grams] },
  { id: 'x-biscoito-arroz', name: 'Biscoito de arroz integral', kcal: 387, prot: 8.2, carb: 81.5, gord: 2.8, unit: 'g', source: 'USDA',
    householdMeasures: [m('unidade', 9), grams] },
  { id: 'x-barra-cereal', name: 'Barra de cereal (tradicional)', kcal: 390, prot: 5, carb: 70, gord: 10, unit: 'g', source: 'RÓTULO',
    householdMeasures: [m('unidade', 22), grams] },
  { id: 'x-farelo-aveia', name: 'Farelo de aveia', kcal: 246, prot: 17.3, carb: 66.2, gord: 7, unit: 'g', source: 'USDA',
    householdMeasures: [m('colher de sopa', 8), grams] },
  { id: 'x-farinha-amendoas', name: 'Farinha de amêndoas', kcal: 579, prot: 21.2, carb: 21.6, gord: 49.9, unit: 'g', source: 'USDA',
    householdMeasures: [m('colher de sopa', 10), grams] },

  // ── Frutas, gorduras e outros ──────────────────────────────────────
  { id: 'x-mirtilo', name: 'Mirtilo / blueberry (cru)', kcal: 57, prot: 0.7, carb: 14.5, gord: 0.3, unit: 'g', source: 'USDA',
    householdMeasures: [m('xícara', 140), m('colher de sopa', 15), grams] },
  { id: 'x-framboesa', name: 'Framboesa (crua)', kcal: 52, prot: 1.2, carb: 11.9, gord: 0.7, unit: 'g', source: 'USDA',
    householdMeasures: [m('xícara', 120), m('colher de sopa', 10), grams] },
  { id: 'x-oleo-coco', name: 'Óleo de coco', kcal: 884, prot: 0, carb: 0, gord: 100, unit: 'g', source: 'USDA',
    householdMeasures: [m('colher de sopa', 13), m('colher de chá', 4), grams] },
  { id: 'x-cacau-po', name: 'Cacau em pó 100% (sem açúcar)', kcal: 228, prot: 19.6, carb: 57.9, gord: 13.7, unit: 'g', source: 'USDA',
    householdMeasures: [m('colher de sopa', 6), grams] },
  { id: 'x-chocolate-70', name: 'Chocolate amargo 70% cacau', kcal: 598, prot: 7.8, carb: 45.9, gord: 42.6, unit: 'g', source: 'USDA',
    householdMeasures: [m('quadrado', 5), m('barra', 100), grams] },
];
