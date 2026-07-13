export function exportCsv(filename: string, headers: string[], rows: unknown[][]) {
  const escapeCell = (value: unknown) => `"${String(value ?? '').replaceAll('"', '""')}"`;
  const csv = [headers.join(';'), ...rows.map((row) => row.map(escapeCell).join(';'))].join('\n');
  const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.style.display = 'none';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
