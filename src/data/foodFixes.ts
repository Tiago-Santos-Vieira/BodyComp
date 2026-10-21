// Correções sobre as tabelas importadas (taco.ts / ibge.ts).
// Ficam separadas para não se perderem se os scripts de importação forem rodados de novo.

// Itens que vieram zerados na importação da TACO (campo vazio na fonte virou 0).
// Valores do mesmo alimento na tabela do IBGE (ibge1411, ibge1461, ibge1421).
export const foodOverrides: Record<string, { kcal: number; prot: number; carb: number; gord: number }> = {
  t458: { kcal: 60, prot: 3.2, carb: 4.5, gord: 3.3 },    // Leite de vaca integral
  t457: { kcal: 34.2, prot: 3.4, carb: 5, gord: 0.1 },    // Leite de vaca desnatado UHT
  t450: { kcal: 98.7, prot: 3.5, carb: 14.6, gord: 3.5 }, // Iogurte sabor abacaxi
};

// Zerado na TACO e sem equivalente confiável (o "coco" do IBGE é coco maduro, 354 kcal).
export const hiddenFoodIds = new Set(['t591']); // Coco verde (cru)

// Nomes populares que a busca deve reconhecer.
export const foodAliases: Record<string, string[]> = {
  t3: ['arroz branco'],            // Arroz tipo 1 (cozido)
  t4: ['arroz branco'],            // Arroz tipo 1 (cru)
  ibge4: ['arroz branco'],         // Arroz
  t463: ['muçarela', 'mussarela', 'mozzarella'], // Queijo mozarela
  t226: ['mamão papaya'],          // Mamão Papaia (cru)
  t597: ['nozes'],                 // Noz (cru)
  ibge1506: ['pão de forma branco', 'pão de forma tradicional'],
  t410: ['frango grelhado', 'peito de frango grelhado', 'filé de frango'], // Frango peito sem pele (grelhado)
  t458: ['leite integral'],        // Leite de vaca integral
  t457: ['leite desnatado'],       // Leite de vaca desnatado UHT
};
