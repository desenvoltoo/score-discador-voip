import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  ClipboardList,
  FileDown,
  Headphones,
  LayoutDashboard,
  LogOut,
  Phone,
  PhoneCall,
  Plus,
  RefreshCw,
  Search,
  Settings,
  ShieldBan,
  Target,
  Upload,
  Users,
} from 'lucide-react';
import { api, token } from './services/api';
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
  ['Relatórios', BarChart3],
  ['Não Ligar', ShieldBan],
  ['Usuários', Users],
  ['VoIP', Settings],
] as const;

type Msg = { type: 'ok' | 'err' | 'info'; text: string } | null;

function fmt(v: any) {
  if (v === null || v === undefined || v === '') return '—';
  if (typeof v === 'number') return v.toLocaleString('pt-BR', { maximumFractionDigits: 2 });
  if (typeof v === 'boolean') return v ? 'Sim' : 'Não';
  if (typeof v === 'object') return '—';
  if (String(v).includes('T')) return String(v).replace('T', ' ').slice(0, 16);
  return String(v);
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

function Empty({ text }: { text: string }) {
  return <div className="empty"><ClipboardList size={36} /><strong>Nenhum registro encontrado</strong><span>{text}</span></div>;
}

function DataTable({ rows, columns }: { rows: any[]; columns: { key: string; label: string }[] }) {
  if (!rows?.length) return <Empty text="Crie, importe ou filtre dados para visualizar aqui." />;
  return <div className="tableWrap"><table><thead><tr>{columns.map(c => <th key={c.key}>{c.label}</th>)}</tr></thead><tbody>{rows.map((r, i) => <tr key={r.id || i}>{columns.map(c => <td key={c.key}>{fmt(r[c.key])}</td>)}</tr>)}</tbody></table></div>;
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
    } catch (x: any) {
      setMsg({ type: 'err', text: x.message || 'Não foi possível entrar' });
    } finally {
      setLoading(false);
    }
  }
  return <main className="loginPage">
    <section className="loginHero">
      <div className="brandMark">IA</div>
      <h1>{APP_NAME}</h1>
      <p>Central de campanhas, leads, fila de ligações e resultados comerciais para operação ativa.</p>
      <div className="heroBullets"><span>Campanhas</span><span>Discagem</span><span>Relatórios</span><span>LGPD</span></div>
    </section>
    <form onSubmit={submit} className="loginCard">
      <small>Acesso restrito</small>
      <h2>Entrar na operação</h2>
      <label>E-mail<input value={email} onChange={e => setEmail(e.target.value)} /></label>
      <label>Senha<input type="password" value={password} onChange={e => setPassword(e.target.value)} /></label>
      <Notice msg={msg} />
      <button disabled={loading}>{loading ? 'Entrando...' : 'Entrar'}</button>
      <p className="muted">Use apenas credenciais autorizadas. Todas as ações podem ser auditadas.</p>
    </form>
  </main>;
}

function Shell({ children, page, setPage }: { children: React.ReactNode; page: string; setPage: (p: string) => void }) {
  return <div className="appShell">
    <aside className="sidebar">
      <div className="logo"><span>Referenc</span><b>IA</b><small>Discador comercial</small></div>
      <nav>{menu.map(([m, I]) => <button key={m} className={page === m ? 'active' : ''} onClick={() => setPage(m)}><I size={18} />{m}</button>)}</nav>
      <button className="logout" onClick={() => { localStorage.clear(); location.reload(); }}><LogOut size={18} />Sair</button>
    </aside>
    <main className="content">
      <header className="topbar"><div><small>Operação ativa</small><h1>{page}</h1></div><div className="statusPill"><span /> API conectada</div></header>
      {children}
    </main>
  </div>;
}

function Dashboard({ setPage }: { setPage: (p: string) => void }) {
  const { data, loading, error, reload } = useLoad<any>(() => api('/dashboard/summary'), []);
  const cards = [
    ['Total de leads', data?.total, 'Base disponível na operação'],
    ['Leads novos', data?.newLeads, 'Aguardando triagem'],
    ['Chamadas hoje', data?.callsToday, 'Tentativas registradas'],
    ['Atendidos', data?.atendidos, 'Contatos com atendimento'],
    ['Interessados', data?.interessados, 'Potencial comercial'],
    ['Matrículas', data?.matriculas, 'Conversão final'],
    ['Não ligar', data?.blocked, 'Bloqueios LGPD'],
    ['Conversão', `${fmt((data?.taxaConversao || 0) * 100)}%`, 'Matrículas / leads'],
  ];
  return <>
    <div className="heroPanel"><div><small>Visão geral</small><h2>Controle sua operação ativa em tempo real</h2><p>Importe bases, organize campanhas, acompanhe a fila dos operadores e registre o desfecho de cada contato.</p></div><button onClick={reload}><RefreshCw size={17} />Atualizar</button></div>
    {error && <Notice msg={{ type: 'err', text: error }} />}
    <div className="kpiGrid">{cards.map(([title, value, sub]) => <div className="kpi" key={title}><small>{title}</small><strong>{loading ? '...' : fmt(value)}</strong><span>{sub}</span></div>)}</div>
    <section className="twoCols">
      <div className="panel"><h3>Próximo fluxo recomendado</h3><div className="steps"><button onClick={() => setPage('Campanhas')}>1. Criar campanha</button><button onClick={() => setPage('Importar Leads')}>2. Importar leads</button><button onClick={() => setPage('Mesa do Operador')}>3. Operar fila</button><button onClick={() => setPage('Relatórios')}>4. Medir resultado</button></div></div>
      <div className="panel accent"><h3>Boas práticas LGPD</h3><p>Use os contatos somente para a finalidade autorizada, registre observações essenciais e marque “Não Ligar” quando houver solicitação do titular.</p></div>
    </section>
  </>;
}

function Campaigns() {
  const { data, loading, error, reload } = useLoad<any[]>(() => api('/campaigns'), []);
  const [form, setForm] = useState<any>({ name: '', description: '', status: 'ATIVA', maxAttemptsPerLead: 3, minIntervalMinutes: 60 });
  const [msg, setMsg] = useState<Msg>(null);
  async function save(e: React.FormEvent) {
    e.preventDefault();
    try {
      await api('/campaigns', { method: 'POST', body: JSON.stringify({ ...form, maxAttemptsPerLead: Number(form.maxAttemptsPerLead), minIntervalMinutes: Number(form.minIntervalMinutes) }) });
      setForm({ name: '', description: '', status: 'ATIVA', maxAttemptsPerLead: 3, minIntervalMinutes: 60 });
      setMsg({ type: 'ok', text: 'Campanha criada com sucesso.' });
      reload();
    } catch (e: any) { setMsg({ type: 'err', text: e.message }); }
  }
  return <section className="pageGrid"><div className="panel"><h3>Nova campanha</h3><p className="muted">Crie uma operação por base, canal, curso ou período.</p><form className="formGrid" onSubmit={save}><label>Nome<input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Ex.: Vestibular Julho - WhatsApp" /></label><label>Status<select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}><option>ATIVA</option><option>RASCUNHO</option><option>PAUSADA</option><option>ENCERRADA</option></select></label><label>Tentativas por lead<input type="number" value={form.maxAttemptsPerLead} onChange={e => setForm({ ...form, maxAttemptsPerLead: e.target.value })} /></label><label>Intervalo mínimo min.<input type="number" value={form.minIntervalMinutes} onChange={e => setForm({ ...form, minIntervalMinutes: e.target.value })} /></label><label className="wide">Descrição<textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Objetivo, público, unidade, curso ou regra de acionamento" /></label><button><Plus size={17} />Criar campanha</button></form><Notice msg={msg} /></div><div className="panel listPanel"><h3>Campanhas cadastradas</h3>{error && <Notice msg={{ type: 'err', text: error }} />}{loading ? <p>Carregando...</p> : <DataTable rows={data || []} columns={[{ key: 'name', label: 'Campanha' }, { key: 'status', label: 'Status' }, { key: 'allowedCallStart', label: 'Início' }, { key: 'allowedCallEnd', label: 'Fim' }, { key: 'maxAttemptsPerLead', label: 'Tent.' }]} />}</div></section>;
}

function ImportLeads() {
  const { data: camps, reload } = useLoad<any[]>(() => api('/campaigns'), []);
  const [campaignId, setCampaignId] = useState('');
  const [msg, setMsg] = useState<Msg>(null);
  useEffect(() => { if (!campaignId && camps?.[0]?.id) setCampaignId(camps[0].id); }, [camps]);
  async function up(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f || !campaignId) return;
    const fd = new FormData(); fd.append('file', f);
    try {
      const r = await fetch(`/api/imports/${campaignId}/upload`, { method: 'POST', headers: { Authorization: `Bearer ${token()}` }, body: fd });
      const d = await r.json();
      if (!r.ok) throw new Error(d.message || 'Erro ao importar');
      setMsg({ type: 'ok', text: `Importação concluída: ${d.totalImported} importados, ${d.duplicates} duplicados, ${d.invalid} inválidos, ${d.blocked} bloqueados.` });
    } catch (x: any) { setMsg({ type: 'err', text: x.message }); }
  }
  return <section className="twoCols"><div className="panel"><h3>Importar base de leads</h3><p className="muted">Aceita CSV ou XLSX. Selecione uma campanha ativa antes do envio.</p><label>Campanha<select value={campaignId} onChange={e => setCampaignId(e.target.value)}>{(camps || []).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label><label className="uploadBox"><Upload size={30} /><span>Selecionar arquivo CSV/XLSX</span><input type="file" accept=".csv,.xlsx" onChange={up} /></label><Notice msg={msg} /><button onClick={reload}><RefreshCw size={17} />Atualizar campanhas</button></div><div className="panel"><h3>Modelo de colunas recomendado</h3><div className="tags">{['nome', 'telefone', 'cpf', 'email', 'curso', 'origem', 'observacao'].map(x => <span key={x}>{x}</span>)}</div><p className="muted">O telefone é obrigatório. Leads duplicados dentro da mesma campanha são ignorados automaticamente.</p><div className="miniGuide"><b>Antes de importar</b><span>Confirme origem e finalidade da base.</span><span>Remova contatos sem autorização.</span><span>Use campanha específica para rastrear resultado.</span></div></div></section>;
}

function Leads() {
  const [q, setQ] = useState<any>({ status: '', nome: '', telefone: '' });
  const [rows, setRows] = useState<any[]>([]);
  const [msg, setMsg] = useState<Msg>(null);
  async function load() {
    const params = new URLSearchParams();
    Object.entries(q).forEach(([k, v]: any) => { if (v) params.set(k, v); });
    try { setRows(await api(`/leads?${params.toString()}`)); } catch (e: any) { setMsg({ type: 'err', text: e.message }); }
  }
  useEffect(() => { load(); }, []);
  return <><div className="panel filters"><label>Status<select value={q.status} onChange={e => setQ({ ...q, status: e.target.value })}><option value="">Todos</option>{statuses.map(s => <option key={s}>{s}</option>)}</select></label><label>Nome<input value={q.nome} onChange={e => setQ({ ...q, nome: e.target.value })} /></label><label>Telefone<input value={q.telefone} onChange={e => setQ({ ...q, telefone: e.target.value })} /></label><button onClick={load}><Search size={17} />Buscar</button></div><Notice msg={msg} /><DataTable rows={rows} columns={[{ key: 'name', label: 'Nome' }, { key: 'phoneNormalized', label: 'Telefone' }, { key: 'course', label: 'Curso' }, { key: 'origin', label: 'Origem' }, { key: 'status', label: 'Status' }, { key: 'attemptsCount', label: 'Tent.' }]} /></>;
}

function Operator() {
  const [queue, setQueue] = useState<any[]>([]), [lead, setLead] = useState<any>(null), [call, setCall] = useState<any>(null), [notes, setNotes] = useState(''), [msg, setMsg] = useState<Msg>(null);
  async function loadQueue() { const r = await api('/leads?status=EM_FILA'); setQueue(r); setLead(r[0] || null); setCall(null); }
  useEffect(() => { loadQueue().catch(e => setMsg({ type: 'err', text: e.message })); }, []);
  async function start() { try { setCall(await api('/calls/start', { method: 'POST', body: JSON.stringify({ leadId: lead.id }) })); setMsg({ type: 'ok', text: 'Chamada iniciada no provedor mock. Registre o desfecho ao finalizar.' }); } catch (e: any) { setMsg({ type: 'err', text: e.message }); } }
  async function finish(s: string) { try { await api(`/calls/${call.id}/finish`, { method: 'POST', body: JSON.stringify({ finalDisposition: s, notes, doNotCall: s === 'NAO_LIGAR_NOVAMENTE' }) }); setMsg({ type: 'ok', text: `Resultado ${s} salvo.` }); setNotes(''); await loadQueue(); } catch (e: any) { setMsg({ type: 'err', text: e.message }); } }
  return <section className="operatorLayout"><div className="panel leadCard"><h3>Mesa do operador</h3><Notice msg={msg} />{lead ? <><div className="person"><small>Lead atual</small><h2>{lead.name}</h2><p>{lead.phoneNormalized}</p><span>{lead.course || 'Curso não informado'} • {lead.origin || 'Origem não informada'}</span></div><div className="callActions"><button className="callBtn" onClick={start} disabled={!!call}><PhoneCall size={22} />{call ? 'Chamada em andamento' : 'Iniciar chamada'}</button><textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Resumo do atendimento, objeções, próximo passo..." /></div><div className="dispositions">{dispositions.map(s => <button key={s} disabled={!call} onClick={() => finish(s)}>{s.replaceAll('_', ' ')}</button>)}</div></> : <Empty text="Não há leads em fila. Importe uma base ou altere status para EM_FILA." />}</div><div className="panel"><h3>Fila em espera</h3><p className="muted">{queue.length} lead(s) disponíveis para contato.</p>{queue.slice(0, 8).map((l: any) => <button className="queueItem" key={l.id} onClick={() => { setLead(l); setCall(null); }}><b>{l.name}</b><span>{l.phoneNormalized}</span></button>)}</div></section>;
}

function Reports() {
  const { data, loading, error, reload } = useLoad<any[]>(() => api('/reports/calls'), []);
  async function exportCsv() {
    const r = await fetch('/api/reports/calls/export', { headers: { Authorization: `Bearer ${token()}` } });
    const text = await r.text();
    const blob = new Blob([text], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'referencia-discador-relatorio.csv'; a.click();
  }
  return <><div className="heroPanel"><div><small>Relatórios</small><h2>Chamadas, operadores e desfechos</h2><p>Acompanhe tentativas, status e exporte os registros para análise externa.</p></div><button onClick={exportCsv}><FileDown size={17} />Exportar CSV</button></div>{error && <Notice msg={{ type: 'err', text: error }} />}{loading ? <p>Carregando...</p> : <DataTable rows={data || []} columns={[{ key: 'status', label: 'Status' }, { key: 'finalDisposition', label: 'Desfecho' }, { key: 'durationSeconds', label: 'Duração' }, { key: 'provider', label: 'Provedor' }, { key: 'createdAt', label: 'Criado em' }]} />}<button className="mt" onClick={reload}><RefreshCw size={17} />Atualizar</button></>;
}

function UsersPage() {
  const { data, reload } = useLoad<any[]>(() => api('/users'), []);
  const [form, setForm] = useState<any>({ name: '', email: '', password: '', role: 'OPERADOR', extension: '' });
  const [msg, setMsg] = useState<Msg>(null);
  async function create(e: React.FormEvent) { e.preventDefault(); try { await api('/users', { method: 'POST', body: JSON.stringify(form) }); setMsg({ type: 'ok', text: 'Usuário criado.' }); setForm({ name: '', email: '', password: '', role: 'OPERADOR', extension: '' }); reload(); } catch (x: any) { setMsg({ type: 'err', text: x.message }); } }
  return <section className="pageGrid"><div className="panel"><h3>Novo usuário</h3><form className="formGrid" onSubmit={create}><label>Nome<input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></label><label>E-mail<input value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></label><label>Senha<input type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} /></label><label>Perfil<select value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}><option>OPERADOR</option><option>SUPERVISOR</option><option>ADMIN</option></select></label><label>Ramal<input value={form.extension} onChange={e => setForm({ ...form, extension: e.target.value })} placeholder="1001" /></label><button>Criar usuário</button></form><Notice msg={msg} /></div><div className="panel listPanel"><h3>Equipe</h3><DataTable rows={data || []} columns={[{ key: 'name', label: 'Nome' }, { key: 'email', label: 'E-mail' }, { key: 'role', label: 'Perfil' }, { key: 'extension', label: 'Ramal' }, { key: 'active', label: 'Ativo' }]} /></div></section>;
}

function DoNotCall() {
  const { data, loading, error } = useLoad<any[]>(() => api('/do-not-call'), []);
  return <><div className="panel accent"><h3>Lista Não Ligar</h3><p>Contatos bloqueados por solicitação do titular ou regra de conformidade. O sistema impede nova importação/chamada desses telefones.</p></div>{error && <Notice msg={{ type: 'err', text: error }} />}{loading ? <p>Carregando...</p> : <DataTable rows={data || []} columns={[{ key: 'phoneNormalized', label: 'Telefone' }, { key: 'reason', label: 'Motivo' }, { key: 'blockedAt', label: 'Bloqueado em' }]} />}</>;
}

function VoipConfig() {
  const [form, setForm] = useState<any>({ provider: 'mock', asteriskHost: '', asteriskPort: 5038, asteriskContext: 'from-internal', asteriskTrunk: '', operatorPrefix: '' });
  const [msg, setMsg] = useState<Msg>(null);
  async function test() { try { const r = await api('/voip/test', { method: 'POST', body: JSON.stringify({ operatorExtension: '1000', destinationNumber: '11999999999' }) }); setMsg({ type: 'ok', text: `Teste enviado: ${r.providerCallId || 'mock'}` }); } catch (e: any) { setMsg({ type: 'err', text: e.message }); } }
  return <section className="twoCols"><div className="panel"><h3>Configuração VoIP</h3><p className="muted">Por enquanto o provedor mock permite validar o fluxo operacional. Depois pode conectar Asterisk/SIP.</p><div className="formGrid"><label>Provedor<select value={form.provider} onChange={e => setForm({ ...form, provider: e.target.value })}><option>mock</option><option>asterisk</option></select></label><label>Host Asterisk<input value={form.asteriskHost} onChange={e => setForm({ ...form, asteriskHost: e.target.value })} /></label><label>Porta<input value={form.asteriskPort} onChange={e => setForm({ ...form, asteriskPort: e.target.value })} /></label><label>Contexto<input value={form.asteriskContext} onChange={e => setForm({ ...form, asteriskContext: e.target.value })} /></label><button onClick={test}>Testar discagem</button></div><Notice msg={msg} /></div><div className="panel"><h3>Checklist para produção</h3><div className="miniGuide"><span>Definir provedor SIP/Asterisk.</span><span>Cadastrar ramais por operador.</span><span>Configurar horários permitidos por campanha.</span><span>Validar gravação/consentimento conforme política interna.</span></div></div></section>;
}

function App() {
  const [ok, setOk] = useState(!!localStorage.getItem('token'));
  const [page, setPage] = useState('Dashboard');
  if (!ok) return <Login on={() => setOk(true)} />;
  const content = page === 'Dashboard' ? <Dashboard setPage={setPage} /> : page === 'Campanhas' ? <Campaigns /> : page === 'Importar Leads' ? <ImportLeads /> : page === 'Leads' ? <Leads /> : page === 'Mesa do Operador' ? <Operator /> : page === 'Relatórios' ? <Reports /> : page === 'Não Ligar' ? <DoNotCall /> : page === 'Usuários' ? <UsersPage /> : <VoipConfig />;
  return <Shell page={page} setPage={setPage}>{content}</Shell>;
}

createRoot(document.getElementById('root')!).render(<App />);
