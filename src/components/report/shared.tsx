import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

// Peças comuns dos relatórios impressos (avaliação e dieta).
// As cores usam !important porque o index.css força texto preto em tudo no @media print.

export type NutriProfile = { full_name?: string; specialty?: string } | null;

export function useNutriProfile(): NutriProfile {
  const [nutri, setNutri] = useState<NutriProfile>(null);
  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return;
      const { data } = await supabase.from('profiles').select('full_name, specialty').eq('id', user.id).single();
      if (data) setNutri(data);
    });
  }, []);
  return nutri;
}

export const fmtDate = (iso: string | Date) => new Date(iso).toLocaleDateString('pt-BR');
export const num = (v: number | string, d = 1) => Number(v).toLocaleString('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d });

export function ReportHeader({ kicker, title, sub, nutri }: { kicker: string; title: string; sub: string; nutri: NutriProfile }) {
  return (
    <header className="rp-head">
      <div>
        <div className="rp-kicker">{kicker}</div>
        <div className="rp-title">{title}</div>
        <div className="rp-sub">{sub}</div>
      </div>
      {nutri?.full_name && (
        <div className="rp-nutri">
          <div className="rp-nutri-name">{nutri.full_name}</div>
          {nutri.specialty && <div className="rp-nutri-sub">{nutri.specialty}</div>}
        </div>
      )}
    </header>
  );
}

export function ReportFooter({ nutri, note }: { nutri: NutriProfile; note: string }) {
  return (
    // div e não <footer>: o index.css esconde todo footer na impressão
    <div className="rp-foot rp-avoid">
      <div className="rp-sign">
        <div className="rp-sign-line" />
        <div>{nutri?.full_name || 'Nutricionista responsável'}</div>
        {nutri?.specialty && <div className="rp-sign-sub">{nutri.specialty}</div>}
      </div>
      <div className="rp-brand">Gerado pelo BodyComp em {fmtDate(new Date())}. {note}</div>
    </div>
  );
}

export const BASE_REPORT_CSS = `
.report { font-family: 'Inter', sans-serif; font-size: 10pt; line-height: 1.4; }
.report * { box-sizing: border-box; }
.report section { margin-bottom: 0 !important; }
.report .rp-head { display: flex; justify-content: space-between; align-items: flex-end; gap: 24px; padding-bottom: 14px; border-bottom: 3px solid #006c4d; }
.report .rp-kicker { font-size: 8pt; font-weight: 700; letter-spacing: .14em; text-transform: uppercase; color: #006c4d !important; }
.report .rp-title { font-family: 'Manrope', sans-serif; font-size: 22pt; font-weight: 800; letter-spacing: -.02em; line-height: 1.1; margin-top: 4px; color: #191c1d !important; }
.report .rp-sub { font-size: 9.5pt; margin-top: 4px; color: #5b6862 !important; }
.report .rp-nutri { text-align: right; }
.report .rp-nutri-name { font-family: 'Manrope', sans-serif; font-weight: 800; font-size: 11pt; color: #191c1d !important; }
.report .rp-nutri-sub { font-size: 8.5pt; color: #5b6862 !important; }
.report .rp-label { font-size: 7.5pt; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; color: #5b6862 !important; }
.report .rp-block { margin-top: 18px; }
.report .rp-h { font-family: 'Manrope', sans-serif; font-size: 12pt; font-weight: 800; color: #006c4d !important; margin-bottom: 10px; display: flex; align-items: center; gap: 8px; }
.report .rp-h::after { content: ''; flex: 1; height: 1px; background: #d6e2dc; }
.report .rp-table { width: 100%; border-collapse: collapse; font-size: 9.5pt; }
.report .rp-table th { text-align: left; font-size: 7.5pt; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; color: #5b6862 !important; padding: 0 8px 6px; border-bottom: 1.5px solid #191c1d; }
.report .rp-table td { padding: 5px 8px; border-bottom: 1px solid #e5ece8; color: #191c1d !important; }
.report .rp-num { text-align: right; font-weight: 600; font-variant-numeric: tabular-nums; }
.report .rp-table th.rp-num { text-align: right; }
.report .rp-foot { margin-top: 30px; display: flex; justify-content: space-between; align-items: flex-end; gap: 24px; }
.report .rp-sign { width: 7cm; text-align: center; font-size: 9pt; font-weight: 700; }
.report .rp-sign div { color: #191c1d !important; }
.report .rp-sign-line { height: 1px; background: #191c1d !important; margin-bottom: 6px; }
.report .rp-sign .rp-sign-sub { font-weight: 500; font-size: 8pt; color: #5b6862 !important; }
.report .rp-brand { flex: 1; text-align: right; font-size: 7.5pt; color: #8a958f !important; }
.report .rp-avoid { break-inside: avoid; page-break-inside: avoid; }
`;
