import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CalendarClock, CheckCircle2, Clock, Copy, MessageSquare, PhoneCall, RefreshCw, Save, Search } from 'lucide-react';
import { api } from '../services/api';
import Notice, { type NoticeMessage } from '../components/Notice';
import StatusBadge from '../components/StatusBadge';
import { useAsyncAction } from '../hooks/useAsyncAction';
import { formatDateTime, formatPhone } from '../utils/format';
import '../ops-pages.css';
import './returns-page.css';

type EntitySummary = { id?: string; name?: string };
type ReturnLead = {
  id: string;
  name?: string;
  phoneNormalized?: string;
  course?: string;
  origin?: string;
  status?: string;
  notes?: string;
  callbackAt?: string | null;
  attemptsCount?: number;
  campaign?: EntitySummary;
  operator?: EntitySummary;
};

type CallbackResponse = {
  items: ReturnLead[];
  page: number;
  pageSize: number;
  total: number;
  overdue: number;
  totalPages: number;
};

type ReturnFilter = 'TODOS' | 'ATRASADOS' | 'HOJE' | 'PROXIMOS';

function buildWhatsApp(lead: ReturnLead) {
  const name = lead.name || 'tudo bem';
  const course = lead.course ? ` sobre o curso de ${lead.course}` : '';
  return `Olá, ${name}. Conforme combinado, estou retornando seu contato${course}. Pode falar agora?`;
}

function bucket(callbackAt?: string | null) {
  if (!callbackAt) return 'Sem data';
  const now = new Date();
  const date = new Date(callbackAt);
  const start = new Date(); start.setHours(0, 0, 0, 0);
  const end = new Date(); end.setHours(23, 59, 59, 999);
  if (date < now) return 'Atrasado';
  if (date >= start && date <= end) return 'Hoje';
  return 'Próximos';
}

function localDateInput(value?: string | null) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60000).toISOString().slice(0, 16);
}

export default function ReturnsPage({ openOperator }: { openOperator: () => void }) {
  const [rows, setRows] = useState<ReturnLead[]>([]);
  const [selected, setSelected] = useState<ReturnLead | null>(null);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<ReturnFilter>('TODOS');
  const [callbackAt, setCallbackAt] = useState('');
  const [notes, setNotes] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [overdue, setOverdue] = useState(0);
  const [msg, setMsg] = useState<NoticeMessage>(null);
  const { pending: loading, run } = useAsyncAction();
  const { pending: saving, run: runSave } = useAsyncAction();

  async function load(targetPage = page) {
    await run(async () => {
      try {
        const now = new Date();
        const from = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 30).toISOString().slice(0, 10);
        const to = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 30).toISOString().slice(0, 10);
        const params = new URLSearchParams({ page: String(targetPage), pageSize: String(pageSize), dateFrom: from, dateTo: to });
        const data = await api(`/callbacks?${params.toString()}`) as CallbackResponse;
        const items = Array.isArray(data?.items) ? data.items : [];
        setRows(items);
        setPage(data?.page || targetPage);
        setTotal(data?.total || 0);
        setTotalPages(data?.totalPages || 1);
        setOverdue(data?.overdue || 0);
        setSelected((current) => current && items.some((item) => item.id === current.id) ? current : items[0] || null);
      } catch (error: unknown) {
        const text = error instanceof Error ? error.message : 'Não foi possível carregar retornos.';
        setMsg({ type: 'err', text });
      }
    });
  }

  useEffect(() => { void load(1); }, [pageSize]);
  useEffect(() => {
    setNotes(selected?.notes || '');
    setCallbackAt(localDateInput(selected?.callbackAt));
  }, [selected?.id]);

  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase('pt-BR');
    return rows.filter((row) => {
      const text = [row.name, row.phoneNormalized, row.course, row.origin, row.campaign?.name, row.operator?.name].join(' ').toLocaleLowerCase('pt-BR');
      const group = bucket(row.callbackAt);
      const matchesFilter = filter === 'TODOS' || (filter === 'ATRASADOS' && group === 'Atrasado') || (filter === 'HOJE' && group === 'Hoje') || (filter === 'PROXIMOS' && group === 'Próximos');
      return (!normalizedQuery || text.includes(normalizedQuery)) && matchesFilter;
    });
  }, [rows, query, filter]);

  const kpis = useMemo(() => ({
    total,
    atrasado: overdue,
    hoje: rows.filter((row) => bucket(row.callbackAt) === 'Hoje').length,
    proximos: rows.filter((row) => bucket(row.callbackAt) === 'Próximos').length,
  }), [rows, total, overdue]);

  async function saveReturn() {
    if (!selected) return;
    if (!callbackAt) {
      setMsg({ type: 'info', text: 'Informe a data e o horário do retorno.' });
      return;
    }
    await runSave(async () => {
      try {
        const updated = await api(`/leads/${selected.id}`, {
          method: 'PATCH',
          body: JSON.stringify({ status: 'RETORNO', notes, callbackAt: new Date(callbackAt).toISOString() }),
        }) as ReturnLead;
        setSelected(updated);
        setRows((items) => items.map((item) => item.id === updated.id ? updated : item));
        setMsg({ type: 'ok', text: 'Retorno atualizado.' });
      } catch (error: unknown) {
        const text = error instanceof Error ? error.message : 'Não foi possível salvar o retorno.';
        setMsg({ type: 'err', text });
      }
    });
  }

  async function sendToQueue() {
    if (!selected) return;
    await runSave(async () => {
      try {
        await api(`/leads/${selected.id}`, { method: 'PATCH', body: JSON.stringify({ status: 'EM_FILA', notes, callbackAt: null }) });
        setMsg({ type: 'ok', text: 'Lead voltou para a fila da Mesa do Operador.' });
        await load(page);
      } catch (error: unknown) {
        const text = error instanceof Error ? error.message : 'Não foi possível devolver o lead à fila.';
        setMsg({ type: 'err', text });
      }
    });
  }

  async function copyWhatsApp() {
    if (!selected) return;
    try {
      await navigator.clipboard.writeText(buildWhatsApp(selected));
      setMsg({ type: 'ok', text: 'Mensagem de retorno copiada.' });
    } catch {
      setMsg({ type: 'err', text: 'Não foi possível copiar a mensagem.' });
    }
  }

  return <section className="returnsPage returnsAgenda">
    <div className="heroPanel heroPremium">
      <div><small>Agenda de retornos</small><h2>Atrasados, agenda do dia e próximos contatos</h2><p>Priorize retornos vencidos, ajuste horários e devolva o lead à Mesa do Operador sem perder o histórico.</p></div>
      <button onClick={() => void load(page)} disabled={loading}><RefreshCw size={17} />{loading ? 'Atualizando...' : 'Atualizar'}</button>
    </div>

    <div className="kpiGrid compactKpis">
      <button className={`kpi agendaKpi ${filter === 'TODOS' ? 'active' : ''}`} onClick={() => setFilter('TODOS')}><small>Total</small><strong>{kpis.total}</strong><span>retornos no período</span></button>
      <button className={`kpi agendaKpi danger ${filter === 'ATRASADOS' ? 'active' : ''}`} onClick={() => setFilter('ATRASADOS')}><small>Atrasados</small><strong>{kpis.atrasado}</strong><span>prioridade máxima</span></button>
      <button className={`kpi agendaKpi ${filter === 'HOJE' ? 'active' : ''}`} onClick={() => setFilter('HOJE')}><small>Hoje</small><strong>{kpis.hoje}</strong><span>agenda do dia</span></button>
      <button className={`kpi agendaKpi ${filter === 'PROXIMOS' ? 'active' : ''}`} onClick={() => setFilter('PROXIMOS')}><small>Próximos</small><strong>{kpis.proximos}</strong><span>programados</span></button>
    </div>

    <Notice msg={msg} />

    <div className="leadOpsGrid">
      <div className="panel returnsListPanel">
        <div className="panelHeader"><h3><CalendarClock size={20} />Fila de retornos</h3><span className="muted">{total} registros</span></div>
        <div className="filters singleFilter"><label>Buscar<input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Nome, telefone, curso, campanha ou operador" /></label><button onClick={() => void load(1)} disabled={loading}><Search size={16} />Buscar</button></div>
        {loading ? <p>Carregando...</p> : <div className="queueList largeQueue returnQueueList">
          {filtered.map((lead) => {
            const group = bucket(lead.callbackAt);
            return <button key={lead.id} className={`queueItem returnQueueItem ${selected?.id === lead.id ? 'active' : ''} ${group === 'Atrasado' ? 'overdue' : ''}`} onClick={() => setSelected(lead)}>
              <span><b>{lead.name || 'Sem nome'}</b><small>{formatPhone(lead.phoneNormalized)} • {lead.course || 'Curso não informado'}</small><small>{lead.campaign?.name || 'Sem campanha'} • {lead.operator?.name || 'Sem operador'}</small></span>
              <em>{group === 'Atrasado' && <AlertTriangle size={13} />}{group}</em>
            </button>;
          })}
          {!filtered.length && <div className="empty"><Clock size={34} /><strong>Nenhum retorno encontrado</strong><span>Ajuste a busca ou selecione outro grupo.</span></div>}
        </div>}
        {total > 0 && <div className="paginationBar"><label>Linhas<select value={pageSize} onChange={(event) => setPageSize(Number(event.target.value))}><option value={25}>25</option><option value={50}>50</option><option value={100}>100</option></select></label><span>Página {page} de {totalPages}</span><div><button className="ghostBtn" disabled={page <= 1 || loading} onClick={() => void load(page - 1)}>Anterior</button><button className="ghostBtn" disabled={page >= totalPages || loading} onClick={() => void load(page + 1)}>Próxima</button></div></div>}
      </div>

      <aside className="panel leadDrawer staticDrawer returnDrawer">
        <h3><MessageSquare size={20} />Detalhe do retorno</h3>
        {selected ? <>
          <div className="drawerHero"><div className="leadAvatar smallAvatar">{String(selected.name || 'L').slice(0, 2).toUpperCase()}</div><div><small>Lead selecionado</small><h2>{selected.name || 'Sem nome'}</h2><p>{formatPhone(selected.phoneNormalized)}</p><StatusBadge status={selected.status} /></div></div>
          <div className="leadFacts"><span>Curso: {selected.course || '—'}</span><span>Origem: {selected.origin || '—'}</span><span>Campanha: {selected.campaign?.name || '—'}</span><span>Operador: {selected.operator?.name || '—'}</span><span>Retorno: {formatDateTime(selected.callbackAt)}</span><span>Tentativas: {selected.attemptsCount ?? 0}</span></div>
          <label>Data/hora do retorno<input type="datetime-local" value={callbackAt} onChange={(event) => setCallbackAt(event.target.value)} /></label>
          <label>Observação<textarea value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Motivo do retorno, objeção e próximo passo" /></label>
          <div className="drawerActions"><button onClick={() => void saveReturn()} disabled={saving}><Save size={16} />{saving ? 'Salvando...' : 'Salvar retorno'}</button><button className="ghostBtn" onClick={() => void copyWhatsApp()}><Copy size={16} />Copiar WhatsApp</button><button className="ghostBtn" onClick={() => void sendToQueue()} disabled={saving}><CheckCircle2 size={16} />Voltar para fila</button><button className="ghostBtn" onClick={openOperator}><PhoneCall size={16} />Abrir Mesa</button></div>
        </> : <div className="empty"><CalendarClock size={34} /><strong>Selecione um retorno</strong><span>Os detalhes aparecerão aqui.</span></div>}
      </aside>
    </div>
  </section>;
}
