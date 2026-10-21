// Datas no fuso horário do navegador.
// toISOString() usa UTC: no Brasil (UTC-3), depois das 21h ele já devolve o dia seguinte.

/** Data local no formato YYYY-MM-DD (o mesmo das colunas `date` do Supabase). */
export function toLocalDateStr(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** Converte YYYY-MM-DD em meia-noite local (new Date('YYYY-MM-DD') seria meia-noite UTC). */
export function parseLocalDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
}

/** Saudação pelo horário local. */
export function greeting(date: Date = new Date()): string {
  const hour = date.getHours();
  if (hour < 12) return 'Bom dia';
  if (hour < 18) return 'Boa tarde';
  return 'Boa noite';
}
