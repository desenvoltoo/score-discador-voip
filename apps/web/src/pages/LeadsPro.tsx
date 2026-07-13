import React, { useEffect, useMemo, useState } from 'react';
import { CalendarClock, CheckCircle2, Copy, Eye, MessageSquare, PhoneCall, RefreshCw, Save, Search, ShieldBan, X } from 'lucide-react';
import { api } from '../services/api';
import Notice, { type NoticeMessage } from '../components/Notice';
import StatusBadge from '../components/StatusBadge';

const statuses = ['NOVO', 'EM_FILA', 'LIGANDO', 'ATENDIDO', 'NAO_ATENDEU', 'OCUPADO', 'RETORNO', 'INTERESSADO', 'SEM_INTERESSE', 'MATRICULADO', 'NAO_LIGAR_NOVAMENTE', 'ERRO_CHAMADA'];

function fmt(v: any) {
  if (v === null || v === undefined || v === '') return '—';
  if (String(v).includes('T')) return String(v).replace('T', ' ').slice(0, 16);
  return String(v).replaceAll('_', ' ');
}

function waText(lead: any) {
  const nome = lead?.name || 'tudo bem';
  const curso = lead?.course ? ` sobre o curso de ${lead.course}` : '';
  return `Olá, ${nome}. Estou entrando em contato${curso}. Pode me informar o melhor horário para falarmos?`;
}

export default function LeadsPro({ openOperator }: { openOperator: () => void }) {
  const [q, setQ] = useState<any>({ status: '', nome: '', telefone: '' });
  const [rows, setRows] = useState<any[]>([]);
  const [selected, setSelected] = useState<any | null>(null);
  const [notes, setNotes] = useState('');
  const [msg, setMsg] = useState<NoticeMessage>(null);
  const [loading, setLoading] = useState(false);

  async function load() {
    const params = new URLSearchParams();
    Object.entries(q).forEach(([k, v]: any) => { if (v) params.set(k, v); });
    try {
      setLoading(true);
      setRows(await api(`/leads?${params.toString()}`));
    } catch (e: any) {
      setMsg({ type: 'err', text: e.message });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);
  useEffect(() => { setNotes(selected?.notes || ''); }, [selected?.id]);

  const summary = useMemo(() => ({
    total: rows.length,
    fila: rows.filter((r) => r.status === 'EM_FILA').length,
    interessados: rows.filter((r) => r.status === 'INTERESSADO').length,
    retornos: rows.filter((r) => r.status === 'RETORNO').length,
  }), [rows]);

  async function patchLead(row: any, data: any, okText: string) {
    try {
      const updated = await api(`/leads/${row.id}`, { method: 'PATCH', body: JSON.stringify(data) });
      setRows((items) => items.map((x) => x.id === row.id ? updated : x));
      setSelected((current: any) => current?.id === row.id ? updated : current);
      setMsg({ type: 'ok', text: okText });
    } catch (e: any) { setMsg({ type: 'err', text: e.message }); }
  }

  async function saveNotes() {
    if (!selected) return;
    await patchLead(selected, { notes }, 'Observação salva no lead.');
  }

  function copyWhatsApp(row: any) {
    navigator.clipboard.writeText(waText(row));
    setMsg({ type: 'ok', text: 'Mensagem de WhatsApp copiada.' });
  }

  return <section className="leadsPro">
    <div className="heroPanel heroPremium">
      <div><small>Base comercial</small><h2>Leads com ações visíveis e detalhe rápido</h2><p>Filtre, visualize, salve observações e execute ações sem depender de menu escondido.</p></div>
      <button onClick={openOperator}><PhoneCall size={17} />Ir para Mesa</button>
    </div>

    <div className="miniKpis">
      <div><small>Total filtrado</small><b>{summary.total}</b></div>
      <div><small>Em fila</small><b>{summary.fila}</b></div>
      <div><small>Interessados</small><b>{summary.interessados}</b></div>
      <div><small>Retornos</small><b>{summary.retornos}</b></div>
    </div>

    <div className="filters proFilters">
      <label>Status<select value={q.status} onChange={(e) => setQ({ ...q, status: e.target.value })}><option value="">Todos</option>{statuses.map((s) => <option key={s}>{s}</option>)}</select></label>
      <label>Nome<input value={q.nome} onChange={(e) => setQ({ ...q, nome: e.target.value })} placeholder="Buscar por nome" /></label>
      <label>Telefone<input value={q.telefone} onChange={(e) => setQ({ ...q, telefone: e.target.value })} placeholder="Buscar por telefone" /></label>
      <button onClick={load}>{loading ? <RefreshCw size={17} /> : <Search size={17} />}Filtrar</button>
    </div>
    <Notice msg={msg} />

    <div className="tableWrap leadsTable"><table><thead><tr><th>Lead</th><th>Telefone</th><th>Curso</th><th>Origem</th><th>Status</th><th>Tent.</th><th>Ações</th></tr></thead><tbody>{rows.map((row) => <tr key={row.id}><td><b>{row.name || 'Sem nome'}</b><small>{row.email || 'sem email'}</small></td><td>{row.phoneNormalized}</td><td>{row.course || '—'}</td><td>{row.origin || '—'}</td><td><StatusBadge status={row.status} /></td><td>{fmt(row.attemptsCount)}</td><td><div className="rowActions"><button className="ghostBtn" onClick={() => setSelected(row)}><Eye size={15} />Ver</button><button className="ghostBtn" onClick={() => navigator.clipboard.writeText(row.phoneNormalized || '')}><Copy size={15} />Copiar</button><button onClick={() => copyWhatsApp(row)}><MessageSquare size={15} />WhatsApp</button></div></td></tr>)}</tbody></table>{!rows.length && <div className="empty"><strong>Nenhum lead encontrado</strong><span>Importe uma base ou ajuste os filtros.</span></div>}</div>

    {selected && <aside className="leadDrawer"><div className="leadDrawerCard"><button className="drawerClose" onClick={() => setSelected(null)}><X size={18} /></button><small>Detalhe do lead</small><h2>{selected.name || 'Sem nome'}</h2><p>{selected.phoneNormalized}</p><StatusBadge status={selected.status} /><div className="drawerFacts"><span>Curso: <b>{selected.course || '—'}</b></span><span>Origem: <b>{selected.origin || '—'}</b></span><span>Tentativas: <b>{fmt(selected.attemptsCount)}</b></span><span>Criado: <b>{fmt(selected.createdAt)}</b></span></div><label>Observação<textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Registre contexto, objeções e próximo passo" /></label><div className="drawerActions"><button onClick={saveNotes}><Save size={16} />Salvar observação</button><button className="ghostBtn" onClick={() => patchLead(selected, { status: 'INTERESSADO' }, 'Lead marcado como interessado.')}><CheckCircle2 size={16} />Interessado</button><button className="ghostBtn" onClick={() => patchLead(selected, { status: 'RETORNO' }, 'Lead marcado como retorno.')}><CalendarClock size={16} />Retorno</button><button className="dangerBtn" onClick={() => patchLead(selected, { status: 'NAO_LIGAR_NOVAMENTE', doNotCall: true }, 'Lead bloqueado para novas ligações.')}><ShieldBan size={16} />Não ligar</button></div></div></aside>}
  </section>;
}
