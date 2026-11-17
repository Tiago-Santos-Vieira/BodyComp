import React from 'react';
import type { BasicData, computeResults } from '../views/AssessmentsView';
import { BASE_REPORT_CSS, ReportFooter, ReportHeader, fmtDate, num, useNutriProfile } from './shared';

type Results = ReturnType<typeof computeResults>;

interface Props {
  patientName: string;
  date: string;
  basicData: BasicData;
  results: Results;
  skinfoldLabels: string[];
  skinfolds: number[];
  perimetry: Record<string, number>;
  previous: { date: string; basicData: BasicData; results: Results } | null;
  frontalImage: string | null;
  profileImage: string | null;
}

const PERIMETRY_GROUPS: [string, string[]][] = [
  ['Tronco', ['Pescoço', 'Ombros', 'Tórax Relaxado', 'Tórax Inspirado']],
  ['Abdômen', ['Cintura', 'Abdominal (Umbilical)', 'Quadril']],
  ['Membros superiores', ['Braço Relax. Esq.', 'Braço Relax. Dir.', 'Braço Cont. Esq.', 'Braço Cont. Dir.', 'Antebraço Esq.', 'Antebraço Dir.']],
  ['Membros inferiores', ['Coxa Prox. Esq.', 'Coxa Prox. Dir.', 'Coxa Méd. Esq.', 'Coxa Méd. Dir.', 'Coxa Dist. Esq.', 'Coxa Dist. Dir.', 'Pantur. Esq.', 'Pantur. Dir.']],
];

// Relatório da avaliação feito só para a impressão (fica escondido na tela).
export default function AssessmentReport(p: Props) {
  const nutri = useNutriProfile();

  const { basicData: b, results: r } = p;
  const perimetryValue = (label: string) => label === 'Cintura' ? b.waist : label === 'Quadril' ? b.hip : p.perimetry[label] || 0;
  const groups = PERIMETRY_GROUPS
    .map(([title, labels]) => [title, labels.filter(l => perimetryValue(l) > 0)] as [string, string[]])
    .filter(([, labels]) => labels.length > 0);
  const hasFat = Number(r.bodyFat) > 0;
  const fatPct = Math.min(100, Math.max(0, Number(r.bodyFat)));
  const hasWhr = b.waist > 0 && b.hip > 0;

  const prev = p.previous;
  const delta = (now: number, before: number, unit: string, d = 1, lowerIsBetter = true) => {
    const diff = now - before;
    if (Math.abs(diff) < 0.05) return <span className="rp-delta rp-neutral">=</span>;
    const good = lowerIsBetter ? diff < 0 : diff > 0;
    return <span className={`rp-delta ${good ? 'rp-good' : 'rp-bad'}`}>{diff > 0 ? '+' : '−'}{num(Math.abs(diff), d)} {unit}</span>;
  };

  return (
    <div className="report hidden print:block">
      <style>{BASE_REPORT_CSS + REPORT_CSS}</style>

      <ReportHeader
        kicker="Relatório de avaliação física"
        title={p.patientName}
        sub={`Avaliação de ${fmtDate(p.date)}${prev ? ` · anterior em ${fmtDate(prev.date)}` : ''}`}
        nutri={nutri}
      />

      <section className="rp-strip">
        {[
          ['Idade', b.age ? `${b.age} anos` : '—'],
          ['Sexo', b.gender === 'F' ? 'Feminino' : 'Masculino'],
          ['Peso', b.weight ? `${num(b.weight)} kg` : '—'],
          ['Altura', b.height ? `${num(b.height, 0)} cm` : '—'],
        ].map(([k, v]) => (
          <div key={k}><div className="rp-label">{k}</div><div className="rp-strip-v">{v}</div></div>
        ))}
      </section>

      <section className="rp-block">
        <div className="rp-h">Composição corporal</div>
        <div className="rp-tiles">
          <div className="rp-tile rp-tile-main">
            <div className="rp-label">Gordura corporal</div>
            <div className="rp-big">{hasFat ? `${num(r.bodyFat)}%` : '—'}</div>
            <div className="rp-note">Jackson &amp; Pollock, 7 dobras</div>
          </div>
          <div className="rp-tile">
            <div className="rp-label">Massa magra</div>
            <div className="rp-big">{num(r.leanMass)} <small>kg</small></div>
          </div>
          <div className="rp-tile">
            <div className="rp-label">Massa gorda</div>
            <div className="rp-big">{num(r.fatMass)} <small>kg</small></div>
          </div>
          <div className="rp-tile">
            <div className="rp-label">IMC</div>
            <div className="rp-big">{Number(r.imc) > 0 ? num(r.imc) : '—'}</div>
            {r.imcClass && <div className="rp-note">{r.imcClass}</div>}
          </div>
        </div>

        {hasFat && b.weight > 0 && (
          <div className="rp-bar-wrap">
            <div className="rp-bar">
              <div className="rp-bar-lean" style={{ width: `${100 - fatPct}%` }} />
              <div className="rp-bar-fat" style={{ width: `${fatPct}%` }} />
            </div>
            <div className="rp-legend">
              <span><i className="rp-dot rp-dot-lean" /> Massa magra {num(100 - fatPct)}%</span>
              <span><i className="rp-dot rp-dot-fat" /> Massa gorda {num(fatPct)}%</span>
            </div>
          </div>
        )}

        <div className="rp-mini">
          <div><div className="rp-label">Taxa metabólica basal</div><div className="rp-mini-v">{b.weight ? `${r.tmb} kcal` : '—'}</div></div>
          <div><div className="rp-label">Água corporal (est.)</div><div className="rp-mini-v">{num(r.water)} L</div></div>
          <div><div className="rp-label">Peso ideal (est.)</div><div className="rp-mini-v">{b.height ? `${num(r.idealWeight)} kg` : '—'}</div></div>
          <div><div className="rp-label">Relação cintura/quadril</div><div className="rp-mini-v">{hasWhr ? `${num(r.whr, 2)} · ${r.whrRisk}` : '—'}</div></div>
        </div>
      </section>

      {prev && (
        <section className="rp-block rp-avoid">
          <div className="rp-h">Evolução desde {fmtDate(prev.date)}</div>
          <table className="rp-table">
            <thead><tr><th>Indicador</th><th>Anterior</th><th>Atual</th><th>Variação</th></tr></thead>
            <tbody>
              <tr><td>Peso</td><td>{num(prev.basicData.weight)} kg</td><td>{num(b.weight)} kg</td><td>{delta(b.weight, prev.basicData.weight, 'kg')}</td></tr>
              <tr><td>Gordura corporal</td><td>{num(prev.results.bodyFat)}%</td><td>{num(r.bodyFat)}%</td><td>{delta(Number(r.bodyFat), Number(prev.results.bodyFat), 'p.p.')}</td></tr>
              <tr><td>Massa magra</td><td>{num(prev.results.leanMass)} kg</td><td>{num(r.leanMass)} kg</td><td>{delta(Number(r.leanMass), Number(prev.results.leanMass), 'kg', 1, false)}</td></tr>
              <tr><td>Massa gorda</td><td>{num(prev.results.fatMass)} kg</td><td>{num(r.fatMass)} kg</td><td>{delta(Number(r.fatMass), Number(prev.results.fatMass), 'kg')}</td></tr>
              <tr><td>Soma das dobras</td><td>{num(prev.results.sumSkinfolds)} mm</td><td>{num(r.sumSkinfolds)} mm</td><td>{delta(Number(r.sumSkinfolds), Number(prev.results.sumSkinfolds), 'mm')}</td></tr>
            </tbody>
          </table>
        </section>
      )}

      <div className="rp-cols rp-avoid">
        <section className="rp-block">
          <div className="rp-h">Dobras cutâneas</div>
          <table className="rp-table">
            <tbody>
              {p.skinfoldLabels.map((label, i) => (
                <tr key={label}><td>{label.replace('Dobra ', '')}</td><td className="rp-num">{p.skinfolds[i] ? `${num(p.skinfolds[i])} mm` : '—'}</td></tr>
              ))}
              <tr className="rp-total"><td>Soma</td><td className="rp-num">{num(r.sumSkinfolds)} mm</td></tr>
            </tbody>
          </table>
        </section>

        <section className="rp-block">
          <div className="rp-h">Perimetria</div>
          {groups.length === 0 ? (
            <div className="rp-empty">Nenhuma medida registrada.</div>
          ) : (
            <table className="rp-table">
              <tbody>
                {groups.map(([title, labels]) => (
                  <React.Fragment key={title}>
                    <tr className="rp-group"><td colSpan={2}>{title}</td></tr>
                    {labels.map(l => <tr key={l}><td>{l}</td><td className="rp-num">{num(perimetryValue(l))} cm</td></tr>)}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </div>

      {(p.frontalImage || p.profileImage) && (
        <section className="rp-block rp-avoid">
          <div className="rp-h">Registros visuais</div>
          <div className="rp-photos">
            {p.frontalImage && <figure><div className="rp-frame"><img src={p.frontalImage} alt="Vista frontal" /></div><figcaption>Vista frontal</figcaption></figure>}
            {p.profileImage && <figure><div className="rp-frame"><img src={p.profileImage} alt="Vista de perfil" /></div><figcaption>Vista de perfil</figcaption></figure>}
          </div>
        </section>
      )}

      <ReportFooter nutri={nutri} note="Valores estimados por equações preditivas; interpretar junto com a avaliação clínica." />
    </div>
  );
}

const REPORT_CSS = `
.report .rp-strip { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin: 16px 0 6px; padding: 12px 16px; background: #f1f6f3 !important; border-radius: 10px; }
.report .rp-strip-v { font-family: 'Manrope', sans-serif; font-weight: 800; font-size: 12.5pt; color: #191c1d !important; }
.report .rp-tiles { display: grid; grid-template-columns: 1.3fr 1fr 1fr 1fr; gap: 10px; }
.report .rp-tile { border: 1px solid #d6e2dc; border-radius: 10px; padding: 10px 12px; }
.report .rp-tile-main { background: #006c4d !important; border-color: #006c4d; }
.report .rp-tile-main .rp-label, .report .rp-tile-main .rp-note { color: #c9eedd !important; }
.report .rp-tile-main .rp-big { color: #ffffff !important; }
.report .rp-big { font-family: 'Manrope', sans-serif; font-size: 20pt; font-weight: 800; letter-spacing: -.02em; line-height: 1.15; margin-top: 2px; color: #191c1d !important; }
.report .rp-big small { font-size: 10pt; font-weight: 700; color: inherit !important; }
.report .rp-note { font-size: 8pt; color: #5b6862 !important; margin-top: 2px; }
.report .rp-bar-wrap { margin-top: 12px; }
.report .rp-bar { display: flex; height: 12px; border-radius: 6px; overflow: hidden; }
.report .rp-bar-lean { background: #3eb489 !important; }
.report .rp-bar-fat { background: #ef817d !important; }
.report .rp-legend { display: flex; gap: 18px; margin-top: 6px; font-size: 8.5pt; }
.report .rp-legend span { color: #3d4943 !important; }
.report .rp-dot { display: inline-block; width: 8px; height: 8px; border-radius: 50%; margin-right: 4px; vertical-align: 0; }
.report .rp-dot-lean { background: #3eb489 !important; }
.report .rp-dot-fat { background: #ef817d !important; }
.report .rp-mini { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-top: 12px; padding-top: 10px; border-top: 1px dashed #d6e2dc; }
.report .rp-mini-v { font-family: 'Manrope', sans-serif; font-weight: 800; font-size: 11pt; color: #191c1d !important; }
.report .rp-cols { display: grid; grid-template-columns: 1fr 1fr; gap: 22px; }
.report .rp-total td { font-weight: 800; border-bottom: none; border-top: 1.5px solid #191c1d; }
.report .rp-group td { padding-top: 9px; font-size: 7.5pt; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; color: #006c4d !important; border-bottom: none; }
.report .rp-delta { font-weight: 700; }
.report .rp-good { color: #00704f !important; }
.report .rp-bad { color: #b3261e !important; }
.report .rp-neutral { color: #5b6862 !important; }
.report .rp-empty { font-size: 9pt; color: #5b6862 !important; }
.report .rp-photos { display: flex; justify-content: center; gap: 18px; }
.report .rp-photos figure { margin: 0; text-align: center; }
.report .rp-photos .rp-frame { width: 7cm; height: 9.3cm; display: flex; align-items: center; justify-content: center; background: #f1f6f3 !important; border-radius: 8px; overflow: hidden; }
.report .rp-photos img { max-width: 100%; max-height: 100%; object-fit: contain; display: block; }
.report .rp-photos figcaption { font-size: 8pt; margin-top: 4px; color: #5b6862 !important; }
`;
