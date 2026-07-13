import React, { useEffect, useMemo, useState } from 'react';
import { CalendarClock, CheckCircle2, Clock3, Copy, Eye, History, MessageSquare, PhoneCall, RefreshCw, Save, Search, ShieldBan, X } from 'lucide-react';
import { api } from '../services/api';
import Notice, { type NoticeMessage } from '../components/Notice';
import StatusBadge from '../components/StatusBadge';
import { useAsyncAction } from '../hooks/useAsyncAction';
import { formatDateTime, formatPhone, formatStatus } from '../utils/format';
import './leads-timeline.css';

const statuses = ['NOVO', 'EM_FILA', 'LIGANDO', 'ATENDIDO', 'NAO_ATENDEU', 'OCUPADO', 'RETORNO', 'INTERESSADO', 'SEM_INTERESSE', 'MATRICULADO', 'NAO_LIGAR_NOVAMENTE', 'ERRO_CHAMADA'];

type Lead = {
  id: string;
  name?: string;
  email?: string;
  phoneNormalized?: string;
  course?: string;
  origin?: string;
  status?: string;
  attemptsCount?: number;
  notes?: string;
  createdAt?: string;
  callbackAt?: string | null;
  doNotCall?: boolean;
  campaign?: { id?: string; name?: string };
  operator?: { id?: string; name?: string };
};

type TimelineEvent = {
  id: string;
  type: string;
  at: string;
  title: string;
  metadata?: Record<string, unknown> | null;
};

type PagedLeads = {
  items: Lead[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

type Filters = { status: string; nome: string; telefone: string };

function waText(lead: Lead) {
  const nome = lead.name || 'tudo bem';
  const curso = lead.course ? ` sobre o curso de ${lead.course}` : '';
  return `Olá, ${nome}. Estou entrando em contato${curso}. Pode me informar o melhor horário para falarmos?`;
}

function timelineDetail(event: TimelineEvent) {
  const data = event.metadata || {};
  const parts = [
    typeof data.operator === 'string' ? `Operador: ${data.operator}` : '',
    typeof data.disposition === 'string' ? `Desfecho: ${formatStatus(data.disposition)}` : '',
    typeof data.status === 'string' ? `Status: ${formatStatus(data.status)}` : '',
    typeof data.durationSeconds === 'number' ? `Duração: ${data.durationSeconds}s` : '',
    typeof data.notes === 'string' && data.notes.trim() ? data.notes : '',
  ].filter(Boolean);
  return parts.join(' • ');
}

function timelineKind(type: string) {
  if (type.includes('FAILED') || type.includes('BLOCKED')) return 'danger';
  if (type.includes('FINISHED') || type.includes('COMPLETED')) return 'success';
  if (type.includes('CALLBACK') || type.includes('RETORNO')) return 'warning';
  return 'info';
}

export default function LeadsPro({ openOperator }: { openOperator: () => void }) {
  const [filters, setFilters] = useState<Filters>({ status: '', nome: '', telefone: '' });
  const [rows, setRows] = useState<Lead[]>([]);
  const [selected, setSelected] = useState<Lead | null>(null);
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [timelineLoading, setTimelineLoading] = useState(false);
  const [notes, setNotes] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [msg, setMsg] = useState<NoticeMessage>(null);
  const { pending: loading, run } = useAsyncAction();
  const { pending: saving, run: runSave } = useAsyncAction();

  async function load(nextPage = page) {
    const params = new URLSearchParams({ page: String(nextPage), pageSize: String(pageSize) });
    Object.entries(filters).forEach(([key, value]) => { if (value) params.set(key, value); });
    await run(async () => {
      try {
        const data = await api(`/leads/paged?${params.toString()}`) as PagedLeads;
        setRows(Array.isArray(data.items) ? data.items : []);
        setPage(data.page || nextPage);
        setTotal(data.total || 0);
        setTotalPages(data.totalPages || 1);
        setSelected((current) => current && data.items?.some((item) => item.id === current.id) ? current : null);
      } catch (error: unknown) {
        const text = error instanceof Error ? error.message : 'Não foi possível carregar os leads.';
        setMsg({ type: 'err', text });
      }
    });
  }

  async function loadTimeline(leadId: string) {
    setTimelineLoading(true);
    try {
      const data = await api(`/leads/${leadId}/timeline`) as { events?: TimelineEvent[] };
      setTimeline(Array.isArray(data.events) ? data.events : []);
    } catch (error: unknown) {
      const text = error instanceof Error ? error.message : 'Não foi possível carregar o histórico.';
      setTimeline([]);
      setMsg({ type: 'err', text });
    } finally {
      setTimelineLoading(false);
    }
  }

  async function selectLead(row: Lead) {
    setSelected(row);
    setNotes(row.notes || '');
    await loadTimeline(row.id);
  }

  useEffect(() => { void load(1); }, [pageSize]);

  const summary = useMemo(() => ({
    total,
    fila: rows.filter((row) => row.status === 'EM_FILA').length,
    interessados: rows.filter((row) => row.status === 'INTERESSADO').length,
    retornos: rows.filter((row) => row.status === 'RETORNO').length,
  }), [rows, total]);

  async function patchLead(row: Lead, data: Partial<Lead>, okText: string) {
    await runSave(async () => {
      try {
        const updated = await api(`/leads/${row.id}`, { method: 'PATCH', body: JSON.stringify(data) }) as Lead;
        setRows((items) => items.map((item) => item.id === row.id ? updated : item));
        setSelected((current) => current?.id === row.id ? updated : current);
        setNotes(updated.notes || '');
        setMsg({ type: 'ok', text: okText });
        await loadTimeline(row.id);
      } catch (error: unknown) {
        const text = error instanceof Error ? error.message : 'Não foi possível atualizar o lead.';
        setMsg({ type: 'err', text });
      }
    });
  }

  async function saveNotes() {
    if (!selected) return;
    await patchLead(selected, { notes }, 'Observação salva no lead.');
  }

  async function copyText(text: string, okText: string) {
    try {
      await navigator.clipboard.writeText(text);
      setMsg({ type: 'ok', text: okText });
    } catch {
      setMsg({ type: 'err', text: 'Não foi possível copiar o conteúdo.' });
    }
  }

  async function markDoNotCall() {
    if (!selected) return;
    const confirmed = window.confirm('Este telefone será bloqueado para novas ligações. Deseja continuar?');
    if (!confirmed) return;
    await patchLead(selected, { status: 'NAO_LIGAR_NOVAMENTE', doNotCall: true }, 'Lead bloqueado para novas ligações.');
  }

  function closeDrawer() {
    setSelected(null);
    setTimeline([]);
  }

  return <section className="leadsPro">
    <div className="heroPanel heroPremium">
      <div><small>Base comercial</small><h2>Leads com ações e histórico completo</h2><p>Filtre, visualize, salve observações e acompanhe cada ligação, retorno e alteração registrada.</p></div>
      <button onClick={openOperator}><PhoneCall size={17} />Ir para Mesa</button>
    </div>

    <div className="miniKpis">
      <div><small>Total filtrado</small><b>{summary.total}</b></div>
      <div><small>Em fila nesta página</small><b>{summary.fila}</b></div>
      <div><small>Interessados nesta página</small><b>{summary.interessados}</b></div>
      <div><small>Retornos nesta página</small><b>{summary.retornos}</b></div>
    </div>

    <div className="filters proFilters">
      <label>Status<select value={filters.status} onChange={(event) => setFilters({ ...filters, status: event.target.value })}><option value="">Todos</option>{statuses.map((status) => <option key={status}>{status}</option>)}</select></label>
      <label>Nome<input value={filters.nome} onChange={(event) => setFilters({ ...filters, nome: event.target.value })} placeholder="Buscar por nome" /></label>
      <label>Telefone<input value={filters.telefone} onChange={(event) => setFilters({ ...filters, telefone: event.target.value })} placeholder="Buscar por telefone" /></label>
      <button onClick={() => void load(1)} disabled={loading}>{loading ? <RefreshCw size={17} /> : <Search size={17} />}{loading ? 'Buscando...' : 'Filtrar'}</button>
    </div>
    <Notice msg={msg} />

    <div className="tableWrap leadsTable"><table><thead><tr><th>Lead</th><th>Telefone</th><th>Curso</th><th>Campanha</th><th>Operador</th><th>Status</th><th>Tent.</th><th>Ações</th></tr></thead><tbody>{rows.map((row) => <tr key={row.id}><td><b>{row.name || 'Sem nome'}</b><small>{row.email || 'sem email'}</small></td><td>{formatPhone(row.phoneNormalized)}</td><td>{row.course || '—'}</td><td>{row.campaign?.name || '—'}</td><td>{row.operator?.name || 'Não atribuído'}</td><td><StatusBadge status={row.status} /></td><td>{row.attemptsCount || 0}</td><td><div className="rowActions"><button className="ghostBtn" onClick={() => void selectLead(row)}><Eye size={15} />Ver</button><button className="ghostBtn" onClick={() => void copyText(row.phoneNormalized || '', 'Telefone copiado.')}><Copy size={15} />Copiar</button><button onClick={() => void copyText(waText(row), 'Mensagem de WhatsApp copiada.')}><MessageSquare size={15} />WhatsApp</button></div></td></tr>)}</tbody></table>{!rows.length && <div className="empty"><strong>Nenhum lead encontrado</strong><span>Importe uma base ou ajuste os filtros.</span></div>}</div>

    {!!total && <div className="paginationBar"><label>Linhas<select value={pageSize} onChange={(event) => setPageSize(Number(event.target.value))}><option value={25}>25</option><option value={50}>50</option><option value={100}>100</option></select></label><span>Página {page} de {totalPages} • {total} leads</span><div><button className="ghostBtn" disabled={page <= 1 || loading} onClick={() => void load(page - 1)}>Anterior</button><button className="ghostBtn" disabled={page >= totalPages || loading} onClick={() => void load(page + 1)}>Próxima</button></div></div>}

    {selected && <aside className="leadDrawer leadTimelineDrawer"><div className="leadDrawerCard"><button className="drawerClose" onClick={closeDrawer}><X size={18} /></button><small>Detalhe do lead</small><h2>{selected.name || 'Sem nome'}</h2><p>{formatPhone(selected.phoneNormalized)}</p><StatusBadge status={selected.status} /><div className="drawerFacts"><span>Curso: <b>{selected.course || '—'}</b></span><span>Origem: <b>{selected.origin || '—'}</b></span><span>Campanha: <b>{selected.campaign?.name || '—'}</b></span><span>Operador: <b>{selected.operator?.name || 'Não atribuído'}</b></span><span>Tentativas: <b>{selected.attemptsCount || 0}</b></span><span>Criado: <b>{formatDateTime(selected.createdAt)}</b></span></div><label>Observação<textarea value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Registre contexto, objeções e próximo passo" /></label><div className="drawerActions"><button onClick={() => void saveNotes()} disabled={saving}><Save size={16} />{saving ? 'Salvando...' : 'Salvar observação'}</button><button className="ghostBtn" onClick={() => void patchLead(selected, { status: 'INTERESSADO' }, 'Lead marcado como interessado.')} disabled={saving}><CheckCircle2 size={16} />Interessado</button><button className="ghostBtn" onClick={() => void patchLead(selected, { status: 'RETORNO' }, 'Lead marcado como retorno.')} disabled={saving}><CalendarClock size={16} />Retorno</button><button className="dangerBtn" onClick={() => void markDoNotCall()} disabled={saving}><ShieldBan size={16} />Não ligar</button></div>

      <section className="leadTimeline"><div className="timelineHeader"><h3><History size={18} />Histórico do lead</h3><button className="ghostBtn" onClick={() => void loadTimeline(selected.id)} disabled={timelineLoading}><RefreshCw size={15} />Atualizar</button></div>{timelineLoading ? <p className="muted">Carregando histórico...</p> : timeline.length ? <div className="timelineList">{timeline.map((event) => <article key={event.id} className={`timelineItem timelineItem--${timelineKind(event.type)}`}><span className="timelineDot"><Clock3 size={13} /></span><div><small>{formatDateTime(event.at)}</small><b>{formatStatus(event.title)}</b>{timelineDetail(event) && <p>{timelineDetail(event)}</p>}</div></article>)}</div> : <div className="empty timelineEmpty"><History size={30} /><strong>Sem eventos registrados</strong><span>As ações futuras aparecerão aqui.</span></div>}</section>
    </div></aside>}
  </section>;
}
