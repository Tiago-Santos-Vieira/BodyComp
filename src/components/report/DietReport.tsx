import React from 'react';
import { BASE_REPORT_CSS, ReportFooter, ReportHeader, fmtDate, num, useNutriProfile } from './shared';

type Totals = { kcal: number; prot: number; carb: number; gord: number };

interface Props {
  patientName: string;
  objective?: string;
  date: Date | null;
  meals: any[];
  guidelines: string;
  dailyTotals: Totals;
  mealTotals: (items: any[]) => Totals;
  formatMeasure: (quantity: number, measure: string) => string;
}

// Plano alimentar feito só para a impressão (fica escondido na tela).
export default function DietReport(p: Props) {
  const nutri = useNutriProfile();
  const t = p.dailyTotals;
  const kcalFrom = { carb: t.carb * 4, prot: t.prot * 4, gord: t.gord * 9 };
  const kcalSum = kcalFrom.carb + kcalFrom.prot + kcalFrom.gord;
  const pct = (k: keyof typeof kcalFrom) => (kcalSum > 0 ? (kcalFrom[k] / kcalSum) * 100 : 0);
  const macros = [
    { key: 'carb' as const, label: 'Carboidratos', g: t.carb, cls: 'rp-c-carb' },
    { key: 'prot' as const, label: 'Proteínas', g: t.prot, cls: 'rp-c-prot' },
    { key: 'gord' as const, label: 'Gorduras', g: t.gord, cls: 'rp-c-gord' },
  ];

  return (
    <div className="report hidden print:block">
      <style>{BASE_REPORT_CSS + DIET_CSS}</style>

      <ReportHeader
        kicker="Plano alimentar"
        title={p.patientName}
        sub={[p.date ? `Elaborado em ${fmtDate(p.date)}` : null, p.objective ? `Objetivo: ${p.objective}` : null].filter(Boolean).join(' · ')}
        nutri={nutri}
      />

      <section className="rp-summary rp-avoid">
        <div className="rp-kcal">
          <div className="rp-label">Total do dia</div>
          <div className="rp-kcal-v">{Math.round(t.kcal).toLocaleString('pt-BR')} <small>kcal</small></div>
        </div>
        <div className="rp-macros">
          <div className="rp-bar">
            {macros.map(m => <div key={m.key} className={m.cls} style={{ width: `${pct(m.key)}%` }} />)}
          </div>
          <div className="rp-macro-row">
            {macros.map(m => (
              <div key={m.key}>
                <div className="rp-label"><i className={`rp-dot ${m.cls}`} />{m.label}</div>
                <div className="rp-macro-v">{num(m.g, 0)} g <span>{num(pct(m.key), 0)}%</span></div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {p.meals.map(meal => {
        const mt = p.mealTotals(meal.items || []);
        return (
          <section key={meal.id} className="rp-meal rp-avoid">
            <div className="rp-meal-head">
              <span className="rp-time">{meal.time}</span>
              <span className="rp-meal-name">{meal.name}</span>
              <span className="rp-meal-kcal">{Math.round(mt.kcal)} kcal · C {num(mt.carb, 0)} g · P {num(mt.prot, 0)} g · G {num(mt.gord, 0)} g</span>
            </div>
            <table className="rp-table">
              <thead>
                <tr><th>Alimento</th><th>Quantidade</th><th className="rp-num">Kcal</th><th className="rp-num">Carb</th><th className="rp-num">Prot</th><th className="rp-num">Gord</th></tr>
              </thead>
              <tbody>
                {(meal.items || []).map((food: any, i: number) => (
                  <tr key={food.id || i}>
                    <td className="rp-food">{food.name}</td>
                    <td>{p.formatMeasure(food.quantity, food.measure)}{food.weight ? <span className="rp-weight"> ({food.weight})</span> : null}</td>
                    <td className="rp-num">{Math.round(food.kcal)}</td>
                    <td className="rp-num">{num(food.carb)}</td>
                    <td className="rp-num">{num(food.prot)}</td>
                    <td className="rp-num">{num(food.gord)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        );
      })}

      <section className="rp-block rp-notes rp-avoid">
        <div className="rp-h">Orientações</div>
        {p.guidelines.trim()
          ? <div className="rp-guide">{p.guidelines.trim()}</div>
          : [0, 1, 2, 3].map(i => <div key={i} className="rp-line" />)}
      </section>

      <ReportFooter nutri={nutri} note="Valores nutricionais calculados a partir das tabelas de composição de alimentos." />
    </div>
  );
}

const DIET_CSS = `
.report .rp-summary { display: flex; gap: 22px; align-items: center; margin-top: 16px; padding: 14px 18px; background: #f1f6f3 !important; border-radius: 10px; }
.report .rp-kcal { padding-right: 22px; border-right: 1px solid #d6e2dc; }
.report .rp-kcal-v { font-family: 'Manrope', sans-serif; font-size: 24pt; font-weight: 800; letter-spacing: -.02em; line-height: 1.1; color: #006c4d !important; }
.report .rp-kcal-v small { font-size: 11pt; color: #006c4d !important; }
.report .rp-macros { flex: 1; }
.report .rp-bar { display: flex; height: 10px; border-radius: 5px; overflow: hidden; background: #e5ece8 !important; }
.report .rp-macro-row { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-top: 8px; }
.report .rp-macro-v { font-family: 'Manrope', sans-serif; font-size: 12pt; font-weight: 800; color: #191c1d !important; }
.report .rp-macro-v span { font-family: 'Inter', sans-serif; font-size: 8.5pt; font-weight: 600; color: #5b6862 !important; }
.report .rp-dot { display: inline-block; width: 8px; height: 8px; border-radius: 50%; margin-right: 5px; }
.report .rp-c-carb { background: #3eb489 !important; }
.report .rp-c-prot { background: #006c4d !important; }
.report .rp-c-gord { background: #ef817d !important; }
.report .rp-meal { margin-top: 16px; border: 1px solid #d6e2dc !important; border-radius: 10px; overflow: hidden; }
.report .rp-meal-head { display: flex; align-items: center; gap: 10px; padding: 8px 12px; background: #f1f6f3 !important; border-bottom: 1px solid #d6e2dc; }
.report .rp-time { font-family: 'Manrope', sans-serif; font-weight: 800; font-size: 9.5pt; padding: 2px 8px; border-radius: 6px; background: #006c4d !important; color: #ffffff !important; }
.report .rp-meal-name { font-family: 'Manrope', sans-serif; font-weight: 800; font-size: 12pt; color: #191c1d !important; }
.report .rp-meal-kcal { margin-left: auto; font-size: 8.5pt; font-weight: 600; color: #5b6862 !important; }
.report .rp-meal .rp-table th { padding: 7px 12px 5px; border-bottom: 1px solid #d6e2dc; }
.report .rp-meal .rp-table td { padding: 6px 12px; }
.report .rp-meal .rp-table tr:last-child td { border-bottom: none; }
.report .rp-food { font-weight: 700; }
.report .rp-weight { color: #5b6862 !important; font-size: 8.5pt; }
.report .rp-notes { margin-top: 22px; }
.report .rp-guide { white-space: pre-wrap; font-size: 10pt; line-height: 1.6; padding: 12px 16px; background: #f1f6f3 !important; border-left: 4px solid #3eb489; border-radius: 6px; color: #191c1d !important; }
.report .rp-line { height: 26px; border-bottom: 1px solid #d6e2dc; }
`;
