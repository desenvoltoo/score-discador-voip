import React, { useEffect, useMemo, useState } from 'react';
import { Download, PhoneOff, Plus, RefreshCw, Search, ShieldBan, Trash2 } from 'lucide-react';
import { api } from '../services/api';
import Notice, { type NoticeMessage } from '../components/Notice';
import '../ops-pages.css';

function fmt(v: any) {
  if (v === null || v === undefined || v === '') return '—';
  if (String(v).includes('T')) return String(v).replace('T', ' ').slice(0, 16);
  return String(v);
}

function downloadCsv(rows: any[]) {
  const csv = ['telefone;motivo;bloqueado_em', ...rows.map((r) => [r.phoneNormalized, r.reason, r.blockedAt].map((v) => `"${String(v ?? '').replaceAll('"', '""')}"`).join(';'))].join('\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  a.download = 'nao-ligar-referencia.csv';
  a.click();
}

export default function DoNotCallPro() {
  const [rows, setRows] = useState<any[]>([]);
  const [query, setQuery] = useState('');
  const [form, setForm] = useState({ phone: '', reason: '' });
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<NoticeMessage>(null);

  async function load() {
    try {
      setLoading(true);
      setRows(await api('/do-not-call'));
    } catch (e: any) {
      setMsg({ type: 'err', text: e.message || 'Não foi possível carregar a lista.' });
    } finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => !q || [r.phoneNormalized, r.reason].join(' ').toLowerCase().includes(q));
  }, [rows, query]);

  async function block(e: React.FormEvent) {
    e.preventDefault();
    if (!form.phone.trim()) { setMsg({ type: 'info', text: 'Informe um telefone para bloquear.' }); return; }
    try {
      await api('/do-not-call', { method: 'POST', body: JSON.stringify({ phone: form.phone, reason: form.reason || 'Bloqueio manual' }) });
      setMsg({ type: 'ok', text: 'Telefone bloqueado na lista Não Ligar.' });
      setForm({ phone: '', reason: '' });
      await load();
    } catch (e: any) { setMsg({ type: 'err', text: e.message }); }
  }

  async function remove(row: any) {
    if (!confirm(`Remover ${row.phoneNormalized} da lista Não Ligar?`)) return;
    try {
      await api(`/do-not-call/${row.id}`, { method: 'DELETE' });
      setMsg({ type: 'ok', text: 'Bloqueio removido.' });
      await load();
    } catch (e: any) { setMsg({ type: 'err', text: e.message }); }
  }

  return <section>
    <div className="heroPanel heroPremium">
      <div>
        <small>Compliance LGPD</small>
        <h2>Central Não Ligar com bloqueio manual e auditoria</h2>
        <p>Bloqueie telefones que pediram interrupção de contato, consulte motivos, exporte a base e evite ligações indevidas.</p>
      </div>
      <div className="heroActions"><button className="ghostBtn" onClick={() => downloadCsv(filtered)}><Download size={17} />Exportar CSV</button><button onClick={load}><RefreshCw size={17} />Atualizar</button></div>
    </div>

    <div className="kpiGrid compactKpis">
      <div className="kpi"><small>Total bloqueado</small><strong>{rows.length}</strong><span>telefones protegidos</span></div>
      <div className="kpi"><small>Filtrados</small><strong>{filtered.length}</strong><span>resultado da busca</span></div>
      <div className="kpi"><small>Com motivo</small><strong>{rows.filter((r) => r.reason).length}</strong><span>bloqueios documentados</span></div>
      <div className="kpi"><small>Risco</small><strong>{rows.length ? 'Controlado' : 'Baixo'}</strong><span>evita contato indevido</span></div>
    </div>

    <Notice msg={msg} />

    <section className="pageGrid">
      <div className="panel">
        <h3><ShieldBan size={20} />Bloquear telefone</h3>
        <p className="muted">Use quando o lead pedir para não receber novos contatos.</p>
        <form className="formGrid" onSubmit={block}>
          <label className="wide">Telefone<input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="Ex.: 11999999999" /></label>
          <label className="wide">Motivo<textarea value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} placeholder="Ex.: solicitou remoção da lista" /></label>
          <button className="wide"><Plus size={17} />Adicionar à lista</button>
        </form>
      </div>

      <div className="panel listPanel">
        <div className="panelHeader"><h3><PhoneOff size={20} />Telefones bloqueados</h3></div>
        <div className="filters singleFilter"><label>Buscar<input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Telefone ou motivo" /></label><button onClick={load}><Search size={16} />Buscar</button></div>
        {loading ? <p>Carregando...</p> : <div className="tableWrap"><table><thead><tr><th>Telefone</th><th>Motivo</th><th>Bloqueado em</th><th>Ações</th></tr></thead><tbody>{filtered.map((r) => <tr key={r.id}><td><b>{fmt(r.phoneNormalized)}</b></td><td>{fmt(r.reason)}</td><td>{fmt(r.blockedAt)}</td><td><button className="ghostBtn" onClick={() => remove(r)}><Trash2 size={15} />Remover</button></td></tr>)}</tbody></table>{!filtered.length && <div className="empty"><ShieldBan size={34} /><strong>Nenhum telefone encontrado</strong><span>Bloqueie telefones manualmente ou pelo desfecho Não Ligar.</span></div>}</div>}
      </div>
    </section>
  </section>;
}
