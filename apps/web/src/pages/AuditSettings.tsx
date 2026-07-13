import React, { useEffect, useMemo, useState } from 'react';
import { Download, RefreshCw, Search, ShieldCheck } from 'lucide-react';
import { api } from '../services/api';
import Notice, { type NoticeMessage } from '../components/Notice';
import { exportCsv } from '../utils/exportCsv';

 type AuditUser = {
  id?: string;
  name?: string;
  email?: string;
  role?: string;
};

type AuditItem = {
  id: string;
  action: string;
  entity?: string | null;
  entityId?: string | null;
  metadata?: unknown;
  createdAt: string;
  user?: AuditUser | null;
};

type AuditResponse = {
  items: AuditItem[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

type AuditFilters = {
  action: string;
  entity: string;
  dateFrom: string;
  dateTo: string;
};

function formatDate(value?: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString('pt-BR');
}

function metadataText(value: unknown) {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'string') return value;
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

export default function AuditSettings() {
  const [rows, setRows] = useState<AuditItem[]>([]);
  const [filters, setFilters] = useState<AuditFilters>({ action: '', entity: '', dateFrom: '', dateTo: '' });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<NoticeMessage>(null);

  async function load(nextPage = page) {
    const params = new URLSearchParams({ page: String(nextPage), pageSize: String(pageSize) });
    if (filters.action.trim()) params.set('action', filters.action.trim());
    if (filters.entity.trim()) params.set('entity', filters.entity.trim());
    if (filters.dateFrom) params.set('dateFrom', filters.dateFrom);
    if (filters.dateTo) params.set('dateTo', filters.dateTo);

    try {
      setLoading(true);
      setMsg(null);
      const data = await api(`/audit?${params.toString()}`) as AuditResponse;
      setRows(data.items || []);
      setPage(data.page || nextPage);
      setTotal(data.total || 0);
      setTotalPages(Math.max(1, data.totalPages || 1));
    } catch (error: unknown) {
      setMsg({ type: 'err', text: error instanceof Error ? error.message : 'Não foi possível carregar a auditoria.' });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load(1);
  }, [pageSize]);

  const summary = useMemo(() => ({
    displayed: rows.length,
    actions: new Set(rows.map((item) => item.action)).size,
    users: new Set(rows.map((item) => item.user?.id || item.user?.email).filter(Boolean)).size,
  }), [rows]);

  function applyFilters(event: React.FormEvent) {
    event.preventDefault();
    setPage(1);
    load(1);
  }

  function downloadCsv() {
    exportCsv(
      `auditoria-${new Date().toISOString().slice(0, 10)}.csv`,
      ['Data', 'Usuário', 'E-mail', 'Perfil', 'Ação', 'Entidade', 'ID da entidade', 'Metadados'],
      rows.map((item) => [
        formatDate(item.createdAt),
        item.user?.name || '',
        item.user?.email || '',
        item.user?.role || '',
        item.action,
        item.entity || '',
        item.entityId || '',
        metadataText(item.metadata),
      ]),
    );
  }

  return <section className="auditSettings">
    <div className="panel auditHeaderPanel">
      <div className="panelHeader">
        <div><h3><ShieldCheck size={20} />Central de Auditoria</h3><p className="muted">Acompanhe ações administrativas, alterações operacionais e eventos críticos do sistema.</p></div>
        <div className="auditHeaderActions"><button className="ghostBtn" onClick={() => load(page)} disabled={loading}><RefreshCw size={16} />Atualizar</button><button onClick={downloadCsv} disabled={!rows.length}><Download size={16} />Exportar CSV</button></div>
      </div>
      <Notice msg={msg} />
      <div className="miniKpis auditKpis"><div><small>Total encontrado</small><b>{total}</b></div><div><small>Exibidos</small><b>{summary.displayed}</b></div><div><small>Ações distintas</small><b>{summary.actions}</b></div><div><small>Usuários na página</small><b>{summary.users}</b></div></div>
    </div>

    <form className="panel auditFilters" onSubmit={applyFilters}>
      <label>Ação<input value={filters.action} onChange={(event) => setFilters({ ...filters, action: event.target.value })} placeholder="Ex.: CALL_STARTED" /></label>
      <label>Entidade<input value={filters.entity} onChange={(event) => setFilters({ ...filters, entity: event.target.value })} placeholder="Ex.: Lead" /></label>
      <label>Data inicial<input type="date" value={filters.dateFrom} onChange={(event) => setFilters({ ...filters, dateFrom: event.target.value })} /></label>
      <label>Data final<input type="date" value={filters.dateTo} onChange={(event) => setFilters({ ...filters, dateTo: event.target.value })} /></label>
      <button disabled={loading}><Search size={16} />{loading ? 'Buscando...' : 'Aplicar filtros'}</button>
    </form>

    <div className="panel auditTablePanel">
      <div className="panelHeader"><h3>Eventos registrados</h3><label className="pageSizeControl">Por página<select value={pageSize} onChange={(event) => setPageSize(Number(event.target.value))}><option value={25}>25</option><option value={50}>50</option><option value={100}>100</option></select></label></div>
      <div className="tableWrap"><table><thead><tr><th>Data</th><th>Usuário</th><th>Ação</th><th>Entidade</th><th>Detalhes</th></tr></thead><tbody>{rows.map((item) => <tr key={item.id}><td>{formatDate(item.createdAt)}</td><td><b>{item.user?.name || 'Sistema'}</b><small>{item.user?.email || item.user?.role || 'evento automático'}</small></td><td><span className="auditActionPill">{item.action.replaceAll('_', ' ')}</span></td><td>{item.entity || '—'}{item.entityId ? <small>{item.entityId}</small> : null}</td><td><code>{metadataText(item.metadata)}</code></td></tr>)}</tbody></table>{!loading && !rows.length && <div className="empty"><ShieldCheck size={34} /><strong>Nenhum evento encontrado</strong><span>Ajuste os filtros ou aguarde novas ações auditáveis.</span></div>}</div>
      <div className="paginationBar"><span>Página {page} de {totalPages}</span><div><button className="ghostBtn" disabled={loading || page <= 1} onClick={() => load(page - 1)}>Anterior</button><button className="ghostBtn" disabled={loading || page >= totalPages} onClick={() => load(page + 1)}>Próxima</button></div></div>
    </div>
  </section>;
}
