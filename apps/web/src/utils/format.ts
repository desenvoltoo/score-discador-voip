const dateTimeFormatter = new Intl.DateTimeFormat('pt-BR', {
  dateStyle: 'short',
  timeStyle: 'short',
  timeZone: 'America/Sao_Paulo',
});

export function formatNumber(value: unknown, maximumFractionDigits = 2) {
  const number = Number(value);
  if (!Number.isFinite(number)) return '—';
  return number.toLocaleString('pt-BR', { maximumFractionDigits });
}

export function formatPercent(value: number, total: number) {
  if (!total) return '0%';
  return `${((value / total) * 100).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`;
}

export function formatDateTime(value?: string | Date | null) {
  if (!value) return '—';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return dateTimeFormatter.format(date);
}

export function formatStatus(value?: string | null) {
  return value?.trim() ? value.replaceAll('_', ' ') : '—';
}

export function formatPhone(value?: string | null) {
  const digits = value?.replace(/\D/g, '') || '';
  if (digits.length === 11) return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  if (digits.length === 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return value?.trim() || '—';
}
