import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Brain,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  Clock,
  Copy,
  Eye,
  FileDown,
  Headphones,
  LayoutDashboard,
  LogOut,
  MessageSquare,
  Phone,
  PhoneCall,
  PhoneForwarded,
  Plus,
  RefreshCw,
  Search,
  Settings,
  ShieldBan,
  Sparkles,
  Target,
  Upload,
  Users,
  Wand2,
} from 'lucide-react';
import { api, token } from './services/api';
import SipSoftphone from './SipSoftphone';
import './style.css';

const APP_NAME = 'ReferencIA Discador';
const DEFAULT_LOGIN = 'admin@score.com.br';
const DEFAULT_PASSWORD = 'Admin@123456';
const statuses = ['NOVO', 'EM_FILA', 'LIGANDO', 'ATENDIDO', 'NAO_ATENDEU', 'OCUPADO', 'RETORNO', 'INTERESSADO', 'SEM_INTERESSE', 'MATRICULADO', 'NAO_LIGAR_NOVAMENTE', 'ERRO_CHAMADA'];
const dispositions = ['ATENDIDO', 'NAO_ATENDEU', 'INTERESSADO', 'SEM_INTERESSE', 'MATRICULADO', 'RETORNO', 'OCUPADO', 'CAIXA_POSTAL', 'NUMERO_INVALIDO', 'NAO_LIGAR_NOVAMENTE'];
const menu = [
  ['Dashboard', LayoutDashboard],
  ['Campanhas', Target],
  ['Importar Leads', Upload],
  ['Leads', Phone],
  ['Mesa do Operador', Headphones],
  ['Softphone SIP', PhoneCall],
  ['Relatórios', BarChart3],
  ['Não Ligar', ShieldBan],
  ['Usuários', Users],
  ['VoIP', Settings],
] as const;

type Msg = { type: 'ok' | 'err' | 'info'; text: string } | null;
type MenuAction = { label: string; icon?: React.ReactNode; action: () => void; danger?: boolean };
type Column = { key: string; label: string };

function fmt(v: any) {
  if (v === null || v === undefined || v === '') return '—';
  if (typeof v === 'number') return v.toLocaleString('pt-BR', { maximumFractionDigits: 2 });
  if (typeof v === 'boolean') return v ? 'Sim' : 'Não';
  if (typeof v === 'object') return '—';
  if (String(v).includes('T')) return String(v).replace('T', ' ').slice(0, 16);
  return String(v).replaceAll('_', ' ');
}

function downloadCsv(name: string, rows: any[]) {
  const header = Object.keys(rows[0] || {});
  const csv = [header.join(';'), ...rows.map((r) => header.map((h) => `"${String(r[h] ?? '').replaceAll('"', '""')}"`).join(';'))].join('\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  a.download = name;
  a.click();
}

function useLoad<T>(loader: () => Promise<T>, deps: React.DependencyList = []) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  async function reload() {
    try {
      setLoading(true);
      setError('');
      setData(await loader());
    } catch (e: any) {
      setError(e.message || 'Falha ao carregar');
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { reload(); }, deps);
  return { data, loading, error, reload, setData };
}

function Notice({ msg }: { msg: Msg }) {
  if (!msg) return null;
  return <div className={`notice ${msg.type}`}>{msg.type === 'err' ? <AlertTriangle size={18} /> : <CheckCircle2 size={18} />}<span>{msg.text}</span></div>;
}
function Empty({ text }: { text: string }) { return <div className="empty"><ClipboardList size={36} /><strong>Nenhum registro encontrado</strong><span>{text}</span></div>; }

function ContextMenu({ x, y, items, onClose }: { x: number; y: number; items: MenuAction[]; onClose: () => void }) {
  useEffect(() => {
    const close = () => onClose();
    window.addEventListener('click', close);
    window.addEventListener('scroll', close);
    return () => { window.removeEventListener('click', close); window.removeEventListener('scroll', close); };
  }, []);
  return <div className="contextMenu" style={{ left: x, top: y }} onClick={(e) => e.stopPropagation()}>{items.map((it, i) => <button key={i} className={it.danger ? 'danger' : ''} onClick={() => { it.action(); onClose(); }}>{it.icon}{it.label}</button>)}</div>;
}

function DataTable({ rows, columns, onRowMenu }: { rows: any[]; columns: Column[]; onRowMenu?: (row: any) => MenuAction[] }) {
  const [ctx, setCtx] = useState<{ x: number; y: number; items: MenuAction[] } | null>(null);
  if (!rows?.length) return <Empty text="Crie, importe ou filtre dados para visualizar aqui." />;
  return <div className="tableWrap"><table><thead><tr>{columns.map((c) => <th key={c.key}>{c.label}</th>)}</tr></thead><tbody>{rows.map((r, i) => <tr key={r.id || i} onContextMenu={(e) => { if (onRowMenu) { e.preventDefault(); setCtx({ x: e.clientX, y: e.clientY, items: onRowMenu(r) }); } }}>{columns.map((c) => <td key={c.key}>{fmt(r[c.key])}</td>)}</tr>)}</tbody></table>{ctx && <ContextMenu {...ctx} onClose={() => setCtx(null)} />}</div>;
}

function Login({ on }: { on: () => void }) {
  const [email, setEmail] = useState(DEFAULT_LOGIN);
  const [password, setPassword] = useState(DEFAULT_PASSWORD);
  const [msg, setMsg] = useState<Msg>(null);
  const [loading, setLoading] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    try {
      setLoading(true);
      const d = await api('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
      localStorage.setItem('token', d.token);
      on();
    } catch (x: any) { setMsg({ type: 'err', text: x.message || 'Não foi possível entrar' }); }
    finally { setLoading(false); }
  }
  return <main className="loginPage"><section className="loginHero"><div className="brandMark">IA</div><h1>{APP_NAME}</h1><p>Central inteligente de campanhas, telefone WebRTC, fila comercial, IA de atendimento, produtividade e compliance.</p><div className="heroBullets"><span>WebRTC</span><span>Agent Assist</span><span>Power Dialer</span><span>LGPD</span></div></section><form onSubmit={submit} className="loginCard"><small>Acesso restrito</small><h2>Entrar na operação</h2><label>E-mail<input value={email} onChange={(e) => setEmail(e.target.value)} /></label><label>Senha<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} /></label><Notice msg={msg} /><button disabled={loading}>{loading ? 'Entrando...' : 'Entrar'}</button><p className="muted">Use apenas credenciais autorizadas. Todas as ações relevantes devem ser auditáveis.</p></form></main>;
}

function Shell({ children, page, setPage }: { children: React.ReactNode; page: string; setPage: (p: string) => void }) {
  return <div className="appShell"><aside className="sidebar"><div className="logo"><span>Referenc</span><b>IA</b><small>Discador comercial</small></div><nav>{menu.map(([m, I]) => <button key={m} className={page === m ? 'active' : ''} onClick={() => setPage(m)}><I size={18} />{m}</button>)}</nav><button className="logout" onClick={() => { localStorage.clear(); location.reload(); }}><LogOut size={18} />Sair</button></aside><main className="content"><header className="topbar"><div><small>Operação ativa</small><h1>{page}</h1></div><div className="statusGroup"><div className="statusPill"><span /> API conectada</div><button className="ghostBtn" onClick={() => setPage('Softphone SIP')}><PhoneCall size={16} />Telefone</button></div></header>{children}</main></div>;
}

function Dashboard({ setPage }: { setPage: (p: string) => void }) {
  const { data, loading, error, reload } = useLoad<any>(() => api('/dashboard/summary'), []);
  const cards = [['Total de leads', data?.total, 'Base disponível'], ['Novos', data?.newLeads, 'Aguardando ação'], ['Chamadas hoje', data?.callsToday, 'Tentativas registradas'], ['Atendidos', data?.atendidos, 'Contatos humanos'], ['Interessados', data?.interessados, 'Potencial comercial'], ['Matrículas', data?.matriculas, 'Conversão final'], ['Não ligar', data?.blocked, 'Bloqueios LGPD'], ['Conversão', `${fmt((data?.taxaConversao || 0) * 100)}%`, 'Matrículas / leads']];
  return <><div className="heroPanel heroPremium"><div><small>Visão geral</small><h2>Operação comercial com telefonia WebRTC e inteligência de atendimento</h2><p>Campanha, fila, chamada no navegador, screen pop, desfecho, LGPD e análise gerencial no mesmo fluxo.</p></div><button onClick={reload}><RefreshCw size={17} />Atualizar</button></div><div className="pipeline"><div>Base importada</div><div>Score de prioridade</div><div>Softphone SIP</div><div>Agent Assist</div><div>Relatório</div></div>{error && <Notice msg={{ type: 'err', text: error }} />}<div className="kpiGrid">{cards.map(([a, b, c]) => <div className="kpi" key={a}><small>{a}</small><strong>{loading ? '...' : fmt(b)}</strong><span>{c}</span></div>)}</div><section className="twoCols"><div className="panel"><h3><Sparkles size={19} />Atalhos de alta performance</h3><div className="steps"><button onClick={() => setPage('Campanhas')}>1. Criar campanha</button><button onClick={() => setPage('Importar Leads')}>2. Importar leads</button><button onClick={() => setPage('Softphone SIP')}>3. Registrar telefone</button><button onClick={() => setPage('Mesa do Operador')}>4. Operar com IA</button></div></div><div className="panel accent"><h3><Activity size={19} />Próximo diferencial</h3><p>O cockpit do operador agora concentra fila, lead, telefone, desfecho e uma camada visual de IA para acelerar atendimento e padronizar qualidade.</p></div></section></>;
}

function Campaigns() {
  const { data, loading, error, reload } = useLoad<any[]>(() => api('/campaigns'), []);
  const [form, setForm] = useState<any>({ name: '', description: '', status: 'ATIVA', maxAttemptsPerLead: 3, minIntervalMinutes: 60 });
  const [msg, setMsg] = useState<Msg>(null);
  async function save(e: React.FormEvent) { e.preventDefault(); try { await api('/campaigns', { method: 'POST', body: JSON.stringify({ ...form, maxAttemptsPerLead: Number(form.maxAttemptsPerLead), minIntervalMinutes: Number(form.minIntervalMinutes) }) }); setForm({ name: '', description: '', status: 'ATIVA', maxAttemptsPerLead: 3, minIntervalMinutes: 60 }); setMsg({ type: 'ok', text: 'Campanha criada com sucesso.' }); reload(); } catch (e: any) { setMsg({ type: 'err', text: e.message }); } }
  const rowMenu = (r: any) => [{ label: 'Copiar nome', icon: <Copy size={15} />, action: () => navigator.clipboard.writeText(r.name || '') }, { label: 'Atualizar lista', icon: <RefreshCw size={15} />, action: reload }, { label: 'Ir para importar leads', icon: <Upload size={15} />, action: () => alert('Abra Importar Leads e selecione esta campanha.') }];
  return <section className="pageGrid"><div className="panel"><h3>Nova campanha</h3><p className="muted">Crie uma operação por base, canal, curso, consultor ou período.</p><form className="formGrid" onSubmit={save}><label>Nome<input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ex.: Vestibular Julho - Unidade Centro" /></label><label>Status<select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}><option>ATIVA</option><option>RASCUNHO</option><option>PAUSADA</option><option>ENCERRADA</option></select></label><label>Tentativas por lead<input type="number" value={form.maxAttemptsPerLead} onChange={(e) => setForm({ ...form, maxAttemptsPerLead: e.target.value })} /></label><label>Intervalo mínimo min.<input type="number" value={form.minIntervalMinutes} onChange={(e) => setForm({ ...form, minIntervalMinutes: e.target.value })} /></label><label className="wide">Descrição<textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Objetivo, público, origem, regra de acionamento e observações" /></label><button><Plus size={17} />Criar campanha</button></form><Notice msg={msg} /></div><div className="panel listPanel"><h3>Campanhas cadastradas</h3>{error && <Notice msg={{ type: 'err', text: error }} />}{loading ? <p>Carregando...</p> : <DataTable rows={data || []} onRowMenu={rowMenu} columns={[{ key: 'name', label: 'Campanha' }, { key: 'status', label: 'Status' }, { key: 'allowedCallStart', label: 'Início' }, { key: 'allowedCallEnd', label: 'Fim' }, { key: 'maxAttemptsPerLead', label: 'Tent.' }]} />}</div></section>;
}

function ImportLeads() {
  const { data: camps, reload } = useLoad<any[]>(() => api('/campaigns'), []);
  const [campaignId, setCampaignId] = useState('');
  const [msg, setMsg] = useState<Msg>(null);
  useEffect(() => { if (!campaignId && camps?.[0]?.id) setCampaignId(camps[0].id); }, [camps]);
  async function up(e: React.ChangeEvent<HTMLInputElement>) { const f = e.target.files?.[0]; if (!f || !campaignId) return; const fd = new FormData(); fd.append('file', f); try { const r = await fetch(`/api/imports/${campaignId}/upload`, { method: 'POST', headers: { Authorization: `Bearer ${token()}` }, body: fd }); const d = await r.json(); if (!r.ok) throw new Error(d.message || 'Erro ao importar'); setMsg({ type: 'ok', text: `Importação: ${d.totalImported} importados, ${d.duplicates} duplicados, ${d.invalid} inválidos, ${d.blocked} bloqueados.` }); } catch (x: any) { setMsg({ type: 'err', text: x.message }); } }
  return <section className="twoCols"><div className="panel"><h3>Importar base de leads</h3><p className="muted">Aceita CSV/XLSX. A campanha controla regras de tentativas, horários e relatórios.</p><label>Campanha<select value={campaignId} onChange={(e) => setCampaignId(e.target.value)}>{(camps || []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label><label className="uploadBox"><Upload size={30} /><span>Selecionar arquivo CSV/XLSX</span><input type="file" accept=".csv,.xlsx" onChange={up} /></label><Notice msg={msg} /><button onClick={reload}><RefreshCw size={17} />Atualizar campanhas</button></div><div className="panel"><h3>Modelo de colunas</h3><div className="tags">{['nome', 'telefone', 'cpf', 'email', 'curso', 'origem', 'observacao'].map((x) => <span key={x}>{x}</span>)}</div><p className="muted">O telefone é obrigatório. O sistema deduplica por telefone dentro da campanha e respeita bloqueios da lista “Não Ligar”.</p><div className="miniGuide"><b>Antes de importar</b><span>Confirme origem e finalidade da base.</span><span>Remova contatos sem autorização.</span><span>Use campanhas separadas por curso/unidade.</span></div></div></section>;
}

function Leads() {
  const [q, setQ] = useState<any>({ status: '', nome: '', telefone: '' });
  const [rows, setRows] = useState<any[]>([]);
  const [msg, setMsg] = useState<Msg>(null);
  async function load() { const params = new URLSearchParams(); Object.entries(q).forEach(([k, v]: any) => { if (v) params.set(k, v); }); try { setRows(await api(`/leads?${params.toString()}`)); } catch (e: any) { setMsg({ type: 'err', text: e.message }); } }
  useEffect(() => { load(); }, []);
  async function updateLead(row: any, status: string) { try { await api(`/leads/${row.id}`, { method: 'PATCH', body: JSON.stringify({ status }) }); setMsg({ type: 'ok', text: `Lead marcado como ${status.replaceAll('_', ' ')}` }); load(); } catch (e: any) { setMsg({ type: 'err', text: e.message }); } }
  const rowMenu = (r: any) => [{ label: 'Ver detalhes', icon: <Eye size={15} />, action: () => alert(JSON.stringify(r, null, 2)) }, { label: 'Copiar telefone', icon: <Copy size={15} />, action: () => navigator.clipboard.writeText(r.phoneNormalized || '') }, { label: 'Marcar interessado', icon: <Wand2 size={15} />, action: () => updateLead(r, 'INTERESSADO') }, { label: 'Marcar matrícula', icon: <CheckCircle2 size={15} />, action: () => updateLead(r, 'MATRICULADO') }, { label: 'Não ligar novamente', icon: <ShieldBan size={15} />, danger: true, action: () => updateLead(r, 'NAO_LIGAR_NOVAMENTE') }];
  return <><div className="filters"><label>Status<select value={q.status} onChange={(e) => setQ({ ...q, status: e.target.value })}><option value="">Todos</option>{statuses.map((s) => <option key={s}>{s}</option>)}</select></label><label>Nome<input value={q.nome} onChange={(e) => setQ({ ...q, nome: e.target.value })} /></label><label>Telefone<input value={q.telefone} onChange={(e) => setQ({ ...q, telefone: e.target.value })} /></label><button onClick={load}><Search size={17} />Filtrar</button></div><Notice msg={msg} /><DataTable rows={rows} onRowMenu={rowMenu} columns={[{ key: 'name', label: 'Nome' }, { key: 'phoneNormalized', label: 'Telefone' }, { key: 'email', label: 'Email' }, { key: 'course', label: 'Curso' }, { key: 'origin', label: 'Origem' }, { key: 'status', label: 'Status' }, { key: 'attemptsCount', label: 'Tent.' }]} /></>;
}

function Operator({ setPage }: { setPage: (p: string) => void }) {
  const [queue, setQueue] = useState<any[]>([]);
  const [lead, setLead] = useState<any>();
  const [call, setCall] = useState<any>();
  const [notes, setNotes] = useState('');
  const [msg, setMsg] = useState<Msg>(null);
  async function load() { const r = await api('/leads?status=EM_FILA'); setQueue(r); setLead((current: any) => current || r[0]); }
  useEffect(() => { load().catch(() => {}); }, []);
  async function start() { if (!lead) return; try { setCall(await api('/calls/start', { method: 'POST', body: JSON.stringify({ leadId: lead.id }) })); setMsg({ type: 'ok', text: 'Atendimento aberto. Use o softphone ao lado para ligar e depois salve o desfecho.' }); } catch (e: any) { setMsg({ type: 'err', text: e.message }); } }
  async function finish(s: string) { if (!call) { setMsg({ type: 'info', text: 'Abra o atendimento antes de salvar o desfecho.' }); return; } try { await api(`/calls/${call.id}/finish`, { method: 'POST', body: JSON.stringify({ finalDisposition: s, notes, doNotCall: s === 'NAO_LIGAR_NOVAMENTE' }) }); setMsg({ type: 'ok', text: `Desfecho salvo: ${s.replaceAll('_', ' ')}` }); setCall(undefined); setNotes(''); await load(); } catch (e: any) { setMsg({ type: 'err', text: e.message }); } }
  const score = Math.min(96, 58 + Number(lead?.attemptsCount || 0) * 6 + (lead?.course ? 12 : 0));
  const aiTips = [
    'Comece confirmando curso e unidade para reduzir objeções.',
    'Se houver interesse, ofereça agendamento de retorno ainda na chamada.',
    'Finalize sempre com próximo passo claro e registre o motivo do desfecho.',
  ];
  return <section className="operatorCockpit"><div className="cockpitMain"><div className="operatorHero"><div><small>Cockpit do operador</small><h2>Fila inteligente + telefone + IA de atendimento</h2><p>Uma tela única para consultar o lead, ligar, receber apoio de script e registrar o resultado sem perder contexto.</p></div><button onClick={() => setPage('Softphone SIP')}><PhoneForwarded size={18} />Abrir telefone completo</button></div><div className="liveMetrics"><div><small>Fila</small><b>{queue.length}</b><span>leads aguardando</span></div><div><small>Prioridade</small><b>{lead ? `${score}%` : '—'}</b><span>score estimado</span></div><div><small>SLA</small><b>02:15</b><span>tempo ideal</span></div><div><small>Modo</small><b>Preview</b><span>discagem assistida</span></div></div><Notice msg={msg} />{lead ? <div className="leadWorkspace"><div className="leadProfile"><div className="leadAvatar">{String(lead.name || 'L').slice(0, 2).toUpperCase()}</div><div><small>Lead selecionado</small><h2>{lead.name || 'Sem nome'}</h2><p>{lead.phoneNormalized || 'Telefone não informado'}</p><span>{lead.course || 'Curso não informado'} • {lead.origin || 'Origem não informada'}</span></div></div><div className="leadFacts"><span><Target size={15} />Status: {fmt(lead.status)}</span><span><Clock size={15} />Tentativas: {fmt(lead.attemptsCount)}</span><span><CalendarClock size={15} />Melhor ação: ligar agora</span></div><div className="callActions premiumActions"><button className="callBtn" onClick={start}><PhoneCall size={20} />Abrir atendimento</button><button className="ghostBtn" onClick={() => navigator.clipboard.writeText(lead.phoneNormalized || '')}><Copy size={17} />Copiar telefone</button><textarea placeholder="Observação do atendimento" value={notes} onChange={(e) => setNotes(e.target.value)} /></div><div className="dispositions premiumDispositions">{dispositions.map((s) => <button key={s} disabled={!call} onClick={() => finish(s)}>{s.replaceAll('_', ' ')}</button>)}</div></div> : <Empty text="Nenhum lead em fila." />}<div className="aiPanel"><h3><Brain size={20} />ReferencIA Assist</h3><div className="aiCards"><div><small>Resumo vivo</small><p>Aguardando ligação. Quando conectarmos transcrição, este quadro trará resumo em tempo real.</p></div><div><small>Objeção provável</small><p>Preço, tempo de deslocamento ou dúvida sobre modalidade.</p></div><div><small>Próxima melhor ação</small><p>Confirmar interesse, curso e melhor horário para retorno.</p></div></div><div className="scriptBox"><b>Script sugerido</b>{aiTips.map((tip) => <span key={tip}><Sparkles size={14} />{tip}</span>)}</div></div></div><aside className="cockpitSide"><div className="operatorSoftphone"><SipSoftphone /></div><div className="panel queuePanel"><h3><ClipboardList size={19} />Próximos da fila</h3>{queue.slice(0, 9).map((l, i) => <button className={`queueItem ${lead?.id === l.id ? 'active' : ''}`} key={l.id || i} onClick={() => setLead(l)}>{i + 1}. {l.name || 'Sem nome'}<span>{l.phoneNormalized}</span></button>)}{!queue.length && <Empty text="Nenhum lead aguardando." />}</div><div className="panel accent"><h3><MessageSquare size={19} />WhatsApp rápido</h3><p className="muted">Próximo passo: gerar mensagem automática pós-ligação com resumo, objeção e CTA de matrícula.</p></div></aside></section>;
}

function Reports() {
  const { data, loading, error } = useLoad<any[]>(() => api('/reports/calls'), []);
  const rows = data || [];
  const rowMenu = (r: any) => [{ label: 'Copiar telefone', icon: <Copy size={15} />, action: () => navigator.clipboard.writeText(r.telefone || '') }, { label: 'Ver JSON', icon: <Eye size={15} />, action: () => alert(JSON.stringify(r, null, 2)) }];
  const tableRows = rows.map((r) => ({ id: r.id, campanha: r.campaign?.name, operador: r.operator?.name, lead: r.lead?.name, telefone: r.lead?.phoneNormalized, status: r.status, desfecho: r.finalDisposition, criado: r.createdAt }));
  return <><div className="heroPanel"><div><small>Relatórios</small><h2>Auditoria e resultado da operação</h2><p>Veja chamadas, operador, campanha, lead, duração, desfecho e exporte CSV para gestão.</p></div><button onClick={() => downloadCsv('referencia-discador-relatorio.csv', tableRows)}><FileDown size={17} />Exportar CSV</button></div>{error && <Notice msg={{ type: 'err', text: error }} />}{loading ? <p>Carregando...</p> : <DataTable rows={tableRows} onRowMenu={rowMenu} columns={[{ key: 'campanha', label: 'Campanha' }, { key: 'operador', label: 'Operador' }, { key: 'lead', label: 'Lead' }, { key: 'telefone', label: 'Telefone' }, { key: 'status', label: 'Status' }, { key: 'desfecho', label: 'Desfecho' }, { key: 'criado', label: 'Data' }]} />}</>;
}

function DoNotCall() { const { data, loading, error } = useLoad<any[]>(() => api('/do-not-call'), []); return <><div className="panel accent"><h3>Lista Não Ligar</h3><p>Bloqueie e audite contatos que solicitaram interrupção, mantendo conformidade operacional e LGPD.</p></div><div className="mt">{error && <Notice msg={{ type: 'err', text: error }} />}{loading ? <p>Carregando...</p> : <DataTable rows={data || []} columns={[{ key: 'phoneNormalized', label: 'Telefone' }, { key: 'reason', label: 'Motivo' }, { key: 'blockedAt', label: 'Bloqueado em' }]} />}</div></>; }
function UsersPage() { const { data, loading, error, reload } = useLoad<any[]>(() => api('/users'), []); const [form, setForm] = useState<any>({ name: '', email: '', password: '', role: 'OPERADOR', extension: '' }); const [msg, setMsg] = useState<Msg>(null); async function save(e: React.FormEvent) { e.preventDefault(); try { await api('/users', { method: 'POST', body: JSON.stringify(form) }); setMsg({ type: 'ok', text: 'Usuário criado.' }); setForm({ name: '', email: '', password: '', role: 'OPERADOR', extension: '' }); reload(); } catch (e: any) { setMsg({ type: 'err', text: e.message }); } } return <section className="pageGrid"><div className="panel"><h3>Novo usuário</h3><form className="formGrid" onSubmit={save}><label>Nome<input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label><label>Email<input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></label><label>Senha<input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></label><label>Perfil<select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}><option>ADMIN</option><option>SUPERVISOR</option><option>OPERADOR</option></select></label><label>Ramal<input value={form.extension} onChange={(e) => setForm({ ...form, extension: e.target.value })} /></label><button><Plus size={17} />Criar</button></form><Notice msg={msg} /></div><div className="panel listPanel"><h3>Equipe</h3>{error && <Notice msg={{ type: 'err', text: error }} />}{loading ? <p>Carregando...</p> : <DataTable rows={data || []} columns={[{ key: 'name', label: 'Nome' }, { key: 'email', label: 'Email' }, { key: 'role', label: 'Perfil' }, { key: 'extension', label: 'Ramal' }, { key: 'active', label: 'Ativo' }]} />}</div></section>; }
function Voip() { const { data } = useLoad<any>(() => api('/voip/config'), []); return <section className="twoCols"><div className="panel"><h3>Configuração VoIP</h3><p className="muted">Asterisk validado com MicroSIP e WebRTC/WSS. Use o ramal 9001 no navegador.</p><DataTable rows={[data || { provider: 'Asterisk', asteriskHost: window.location.hostname, asteriskPort: 8089, asteriskContext: 'interno' }]} columns={[{ key: 'provider', label: 'Provider' }, { key: 'asteriskHost', label: 'Host' }, { key: 'asteriskPort', label: 'Porta' }, { key: 'asteriskContext', label: 'Contexto' }]} /></div><div className="panel accent"><h3>Próximas integrações</h3><div className="miniGuide"><span>Power Dialer com próximo lead automático.</span><span>Screen pop em chamada recebida.</span><span>Transcrição e resumo automático.</span><span>Gravação e auditoria por chamada.</span></div></div></section>; }

function App() { const [ok, setOk] = useState(!!localStorage.getItem('token')); const [page, setPage] = useState<string>('Dashboard'); const content = useMemo(() => page === 'Dashboard' ? <Dashboard setPage={setPage} /> : page === 'Campanhas' ? <Campaigns /> : page === 'Importar Leads' ? <ImportLeads /> : page === 'Leads' ? <Leads /> : page === 'Mesa do Operador' ? <Operator setPage={setPage} /> : page === 'Softphone SIP' ? <SipSoftphone /> : page === 'Relatórios' ? <Reports /> : page === 'Não Ligar' ? <DoNotCall /> : page === 'Usuários' ? <UsersPage /> : <Voip />, [page]); if (!ok) return <Login on={() => setOk(true)} />; return <Shell page={page} setPage={setPage}>{content}</Shell>; }

createRoot(document.getElementById('root')!).render(<App />);
