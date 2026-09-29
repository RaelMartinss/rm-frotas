/**
 * Formatadores pt-BR compartilhados entre renderizadores (CSV e PDF).
 * Seguem convenções do fuso horário America/Sao_Paulo e tratamento de caracteres padrão ASCII
 * para compatibilidade universal tanto em fontes personalizadas (Inter/Mono) quanto em fallbacks (Helvetica).
 */

const SAO_PAULO_TZ = 'America/Sao_Paulo';

const currencyFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

const integerFormatter = new Intl.NumberFormat('pt-BR', {
  maximumFractionDigits: 0,
});

/**
 * Formata valores monetários em BRL com espaço não-quebrável entre o símbolo e o valor.
 */
export function formatCurrency(value: number | string | null | undefined): string {
  if (value === null || value === undefined) {
    return 'R$\u00A00,00';
  }
  const num = typeof value === 'string' ? Number(value) : value;
  const formatted = currencyFormatter.format(isNaN(num) ? 0 : num);
  // Garante espaço não-quebrável (\u00A0) para evitar quebra de linha em PDFs
  return formatted.replace(/\s+/g, '\u00A0');
}

/**
 * Formata quilometragem inteira pt-BR (ex: 84.210 km).
 */
export function formatKm(km: number | null | undefined): string {
  if (km === null || km === undefined) {
    return '0 km';
  }
  return `${integerFormatter.format(km)} km`;
}

/**
 * Formata percentual com sinal explícito e vírgula decimal (ex: +29,9%, -4,2%).
 * Usa estritamente hífen ASCII comum ("-") para compatibilidade com Helvetica.
 */
export function formatPercent(percent: number | null | undefined): string {
  if (percent === null || percent === undefined) {
    return '—';
  }

  const rounded = Number(percent.toFixed(1));
  if (rounded === 0) {
    return '0,0%';
  }

  const formattedAbs = Math.abs(rounded).toFixed(1).replace('.', ',');
  if (rounded > 0) {
    return `+${formattedAbs}%`;
  }
  // Hífen ASCII comum "-"
  return `-${formattedAbs}%`;
}

/**
 * Converte data (YYYY-MM-DD ou Date) para dd/mm/aaaa no fuso America/Sao_Paulo.
 */
export function formatDate(date: string | Date): string {
  if (!date) return '';
  if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
    const [year, month, day] = date.split('-');
    return `${day}/${month}/${year}`;
  }

  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('pt-BR', {
    timeZone: SAO_PAULO_TZ,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

/**
 * Converte Data para dd/mm/aaaa HH:mm no fuso America/Sao_Paulo.
 */
export function formatDateTime(date: Date): string {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  const parts = new Intl.DateTimeFormat('pt-BR', {
    timeZone: SAO_PAULO_TZ,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(d);

  return parts.replace(',', '');
}
