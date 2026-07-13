import React, { useEffect, useMemo, useState } from 'react';
import { CalendarClock, CheckCircle2, Clock, Copy, MessageSquare, PhoneCall, RefreshCw, Save, Search } from 'lucide-react';
import { api } from '../services/api';
import Notice, { type NoticeMessage } from '../components/Notice';
import StatusBadge from '../components/StatusBadge';

function fmtDate(v?: string | null) {
  if (!v) return 'Sem data';
  return new Date(v).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}

function buildWhatsApp(lead: any) {
  const name = lead?.name || 'tudo bem';
  const course = lead?.course ? ` sobre o curso de ${lead.course}` : '';
  return `Olá, ${name}. Conforme combinado, estou retornando seu contato${course}. Pode falar agora?`;
}

function bucket(callbackAt?: string | null) {
  if (!callbackAt) return 'Sem data';
  const now = new Date();
  const d = new Date(callbackAt);
  const start = new Date(); start.setHours(0, 0, 0, 0);
  const end = new Date(); end.setHours(23, 59, 59, 999);
  if (d < now) return 'Atrasado';
  if (d >= start && d <= end) return 'Hoje';
  return 'Próximos';
}

export default function ReturnsPage({ openOperator }: { openOperator: () => void }) {
  const [rows, setRows] = useState<any[]>([]);
  const [selected, setSelected] = useState<any | null>(null);
  const [query, setQuery] = useState('');
  const [callbackAt, setCallbackAt] = useState('');
  const [notes, setNotes] = useState('');
  const [msg, setMsg] = useState<NoticeMessage>(null);
  const [loading, setLoading] = useState(false);

  async function load() {
    try {
      setLoading(true);
      const data = await api('/leads?status=RETORNO');
      setRows(data || []);
      setSelected((current: any) => current || data?.[0] || null);
    } catch (e: any) {
      setMsg({ type: 'err', text: e.message || 'Não foi possível carregar retornos.' });
    } finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);
  useEffect(() => {
    setNotes(selected?.notes || '');
    setCallbackAt(selected?.callbackAt ? selected.callbackAt.slice(0, 16) : '');
  }, [selected?.id]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => !q || [r.name, r.phoneNormalized, r.course, r.origin].join(' ').toLowerCase().includes(q));
  }, [rows, query]);

  const kpis = useMemo(() => ({
    total: rows.length,
    atrasado: rows.filter((r) => bucket(r.callbackAt) === 'Atrasado').length,
    hoje: rows.filter((r) => bucket(r.callbackAt) === 'Hoje').length,
    proximos: rows.filter((r) => bucket(r.callbackAt) === 'Próximos').length,
  }), [rows]);

  async function saveReturn() {
    if (!selected) return;
    try {
      const updated = await api(`/leads/${selected.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'RETORNO', notes, callbackAt: callbackAt ? new Date(callbackAt).toISOString() : null }),
      });
      setSelected(updated);
      setRows((items) => items.map((x) => x.id === updated.id ? updated : x));
      setMsg({ type: 'ok', text: 'Retorno atualizado.' });
    } catch (e: any) { setMsg({ type: 'err', text: e.message }); }
  }

  async function sendToQueue() {
    if (!selected) return;
    try {
      await api(`/leads/${selected.id}`, { method: 'PATCH', body: JSON.stringify({ status: 'EM_FILA', notes }) });
      setMsg({ type: 'ok', text: 'Lead voltou para a fila da Mesa do Operador.' });
      await load();
    } catch (e: any) { setMsg({ type: 'err', text: e.message }); }
  }

  function copyWhatsApp() {
    if (!selected) return;
    navigator.clipboard.writeText(buildWhatsApp(selected));
    setMsg({ type: 'ok', text: 'Mensagem de retorno copiada.' });
  }

  return <section className="returnsPage">
    <div className="heroPanel heroPremium">
      <div>
        <small>Central de retornos</small>
        <h2>Organize retornos, atrasados e próximos contatos</h2>
        <p>Controle quem pediu retorno, ajuste horário, salve observações e jogue o lead de volta para a Mesa do Operador.</p>
      </div>
      <button onClick={load}><RefreshCw size={17} />Atualizar</button>
    </div>

    <div className="kpiGrid compactKpis">
      <div className="kpi"><small>Total</small><strong>{kpis.total}</strong><span>retornos</span></div>
      <div className="kpi"><small>Atrasados</small><strong>{kpis.atrasado}</strong><span>prioridade máxima</span></div>
      <div className="kpi"><small>Hoje</small><strong>{kpis.hoje}</strong><span>agenda do dia</span></div>
      <div className="kpi"><small>Próximos</small><strong>{kpis.proximos}</strong><span>programados</span></div>
    </div>

    <Notice msg={msg} />

    <div className="leadOpsGrid">
      <div className="panel">
        <h3><CalendarClock size={20} />Fila de retornos</h3>
        <div className="filters singleFilter"><label>Buscar<input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Nome, telefone, curso..." /></label><button onClick={load}><Search size={16} />Buscar</button></div>
        {loading ? <p>Carregando...</p> : <div className="queueList largeQueue">
          {filtered.map((lead) => <button key={lead.id} className={`queueItem ${selected?.id === lead.id ? 'active' : ''}`} onClick={() => setSelected(lead)}>
            <span><b>{lead.name || 'Sem nome'}</b><small>{lead.phoneNormalized} • {lead.course || 'Curso não informado'}</small></span>
            <em>{bucket(lead.callbackAt)}</em>
          </button>)}
          {!filtered.length && <div className="empty"><Clock size={34} /><strong>Nenhum retorno encontrado</strong><span>Quando um lead tiver status RETORNO, ele aparecerá aqui.</span></div>}
        </div>}
      </div>

      <aside className="panel leadDrawer staticDrawer">
        <h3><MessageSquare size={20} />Detalhe do retorno</h3>
        {selected ? <>
          <div className="drawerHero"><div className="leadAvatar smallAvatar">{String(selected.name || 'L').slice(0, 2).toUpperCase()}</div><div><small>Lead selecionado</small><h2>{selected.name}</h2><p>{selected.phoneNormalized}</p><StatusBadge status={selected.status} /></div></div>
          <div className="leadFacts"><span>Curso: {selected.course || '—'}</span><span>Origem: {selected.origin || '—'}</span><span>Retorno: {fmtDate(selected.callbackAt)}</span></div>
          <label>Data/hora do retorno<input type="datetime-local" value={callbackAt} onChange={(e) => setCallbackAt(e.target.value)} /></label>
          <label>Observação<textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Motivo do retorno, objeção, próximo passo..." /></label>
          <div className="drawerActions">
            <button onClick={saveReturn}><Save size={16} />Salvar retorno</button>
            <button className="ghostBtn" onClick={copyWhatsApp}><Copy size={16} />Copiar WhatsApp</button>
            <button className="ghostBtn" onClick={sendToQueue}><CheckCircle2 size={16} />Voltar para fila</button>
            <button className="ghostBtn" onClick={openOperator}><PhoneCall size={16} />Abrir Mesa</button>
          </div>
        </> : <div className="empty"><CalendarClock size={34} /><strong>Selecione um retorno</strong><span>Os detalhes aparecerão aqui.</span></div>}
      </aside>
    </div>
  </section>;
}
