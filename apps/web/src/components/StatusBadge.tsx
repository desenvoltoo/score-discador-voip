export default function StatusBadge({ status }: { status?: string | null }) {
  const value = status || 'SEM_STATUS';
  const key = value.toUpperCase();
  const className = `statusBadge status-${key.toLowerCase().replaceAll('_', '-')}`;
  return <span className={className}>{value.replaceAll('_', ' ')}</span>;
}
