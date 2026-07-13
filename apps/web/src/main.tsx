import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  Activity, BarChart3, CalendarClock, ClipboardCheck, ClipboardList, FileSpreadsheet,
  Headphones, LayoutDashboard, LogOut, Phone, PhoneCall, Plus, RefreshCw, Settings,
  ShieldBan, Sparkles, Target, TrendingUp, Upload, Users,
} from 'lucide-react';
import { api } from './services/api';
import Notice, { type NoticeMessage } from './components/Notice';
import StatusBadge from './components/StatusBadge';
import SipSoftphone from './SipSoftphone';
import GrowthCommandCenter from './GrowthCommandCenter';
import ImportLeadsPro from './ImportLeadsPro';
import LeadsPro from './pages/LeadsPro';
import OperatorDeskPro from './pages/OperatorDeskPro';
import ReturnsPage from './pages/ReturnsPage';
import ImportHistoryPage from './pages/ImportHistoryPage';
import ReportsPro from './pages/ReportsPro';
import QualityCenterPage from './pages/QualityCenterPage';
import './style.css';

const APP_NAME = 'ReferencIA Discador';
const DEFAULT_LOGIN = 'admin@score.com.br';
const DEFAULT_PASSWORD = 'Admin@123456';
const menu = [
  ['Dashboard', LayoutDashboard], ['Central IA', TrendingUp], ['Campanhas', Target], ['Importar Leads', Upload],
  ['Hist. Importações', FileSpreadsheet], ['Leads', Phone], ['Retornos', CalendarClock], ['Mesa do Operador', Headphones],
  ['Softphone SIP', PhoneCall], ['Relatórios', BarChart3], ['Qualidade', ClipboardCheck], ['Não Ligar', ShieldBan], ['Usuários', Users], ['VoIP', Settings],
] as const;

type Column = { key: string; label: string; render?: (row: any) => React.ReactNode };

function fmt(v: any) {
  if (v === null || v === undefined || v === '') return '—';
  if (typeof v === 'number') return v.toLocaleString('pt-BR', { maximumFractionDigits: 2 });
  if (typeof v === 'boolean') return v ? 'Sim' : 'Não';
  if (typeof v === 'object') return '—';
  if (String(v).includes('T')) return String(v).replace('T', ' ').slice(0, 16);
  return String(v).replaceAll('_', ' ');
}

function useLoad<T>(loader: () => Promise<T>, deps: React.DependencyList = []) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  async function reload() {
    try { setLoading(true); setError(''); setData(await loader()); }
    catch (e: any) { setError(e.message || 'Falha ao carregar'); }
    finally { setLoading(false); }
  }
  useEffect(() => { reload(); }, deps);
  return { data, loading, error, reload };
}

function Empty({ text }: { text: string }) {
  return <div className="empty"><ClipboardList size={36} /><strong>Nenhum registro encontrado</strong><span>{text}</span></div>;
}

function DataTable({ rows, columns }: { rows: any[]; columns: Column[] }) {
  if (!rows?.length) return <Empty text="Crie, importe ou filtre dados para visualizar aqui." />;
  return <div className="tableWrap"><table><thead><tr>{columns.map((c) => <th key={c.key}>{c.label}</th>)}</tr></thead><tbody>{rows.map((r, i) => <tr key={r.id || i}>{columns.map((c) => <td key={c.key}>{c.render ? c.render(r) : fmt(r[c.key])}</td>)}</tr>)}</tbody></table></div>;
}

function Login({ on }: { on: () => void }) {
  const [email, setEmail] = useState(DEFAULT_LOGIN);
  const [password, setPassword] = useState(DEFAULT_PASSWORD);
  const [msg, setMsg] = useState<NoticeMessage>(null);
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
  return <><div className="heroPanel heroPremium"><div><small>Visão geral</small><h2>Operação comercial com relatórios, retorno, histórico e auditoria</h2><p>Campanha, base, fila, chamada no navegador, retorno agendado, desfecho, LGPD, qualidade e relatório executivo no mesmo fluxo.</p></div><button onClick={reload}><RefreshCw size={17} />Atualizar</button></div><div className="pipeline"><div>Base importada</div><div>Histórico</div><div>Retornos</div><div>Relatório</div><div>Qualidade</div></div>{error && <Notice msg={{ type: 'err', text: error }} />}<div className="kpiGrid">{cards.map(([a, b, c]) => <div className="kpi" key={a}><small>{a}</small><strong>{loading ? '...' : fmt(b)}</strong><span>{c}</span></div>)}</div><section className="twoCols"><div className="panel"><h3><Sparkles size={19} />Atalhos operacionais</h3><div className="steps"><button onClick={() => setPage('Importar Leads')}>1. Importar leads</button><button onClick={() => setPage('Retornos')}>2. Gerenciar retornos</button><button onClick={() => setPage('Relatórios')}>3. Relatório executivo</button><button onClick={() => setPage('Qualidade')}>4. Auditoria de qualidade</button></div></div><div className="panel accent"><h3><Activity size={19} />Melhoria aplicada</h3><p>Agora há uma central de qualidade para revisar observações fracas, desfechos ausentes, retornos sem data e riscos de compliance.</p></div></section></>;
}

function Campaigns() {
  const { data, loading, error, reload } = useLoad<any[]>(() => api('/campaigns'), []);
  const [form, setForm] = useState<any>({ name: '', description: '', status: 'ATIVA', maxAttemptsPerLead: 3, minIntervalMinutes: 60 });
  const [msg, setMsg] = useState<NoticeMessage>(null);
  async function save(e: React.FormEvent) {
    e.preventDefault();
    try {
      await api('/campaigns', { method: 'POST', body: JSON.stringify({ ...form, maxAttemptsPerLead: Number(form.maxAttemptsPerLead), minIntervalMinutes: Number(form.minIntervalMinutes) }) });
      setForm({ name: '', description: '', status: 'ATIVA', maxAttemptsPerLead: 3, minIntervalMinutes: 60 });
      setMsg({ type: 'ok', text: 'Campanha criada com sucesso.' });
      reload();
    } catch (e: any) { setMsg({ type: 'err', text: e.message }); }
  }
  return <section className="pageGrid"><div className="panel"><h3>Nova campanha</h3><p className="muted">Crie uma operação por base, canal, curso, consultor ou período.</p><form className="formGrid" onSubmit={save}><label>Nome<input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ex.: Vestibular Julho" /></label><label>Status<select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}><option>ATIVA</option><option>RASCUNHO</option><option>PAUSADA</option><option>ENCERRADA</option></select></label><label>Tentativas por lead<input type="number" value={form.maxAttemptsPerLead} onChange={(e) => setForm({ ...form, maxAttemptsPerLead: e.target.value })} /></label><label>Intervalo mínimo min.<input type="number" value={form.minIntervalMinutes} onChange={(e) => setForm({ ...form, minIntervalMinutes: e.target.value })} /></label><label className="wide">Descrição<textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></label><button><Plus size={17} />Criar campanha</button></form><Notice msg={msg} /></div><div className="panel listPanel"><h3>Campanhas cadastradas</h3>{error && <Notice msg={{ type: 'err', text: error }} />}{loading ? <p>Carregando...</p> : <DataTable rows={data || []} columns={[{ key: 'name', label: 'Campanha' }, { key: 'status', label: 'Status', render: (r) => <StatusBadge status={r.status} /> }, { key: 'allowedCallStart', label: 'Início' }, { key: 'allowedCallEnd', label: 'Fim' }, { key: 'maxAttemptsPerLead', label: 'Tent.' }]} />}</div></section>;
}

function DoNotCall() {
  const { data, loading, error } = useLoad<any[]>(() => api('/do-not-call'), []);
  return <><div className="panel accent"><h3>Lista Não Ligar</h3><p>Bloqueie e audite contatos que solicitaram interrupção, mantendo conformidade operacional e LGPD.</p></div><div className="mt">{error && <Notice msg={{ type: 'err', text: error }} />}{loading ? <p>Carregando...</p> : <DataTable rows={data || []} columns={[{ key: 'phoneNormalized', label: 'Telefone' }, { key: 'reason', label: 'Motivo' }, { key: 'blockedAt', label: 'Bloqueado em' }]} />}</div></>;
}

function UsersPage() {
  const { data, loading, error, reload } = useLoad<any[]>(() => api('/users'), []);
  const [form, setForm] = useState<any>({ name: '', email: '', password: '', role: 'OPERADOR', extension: '' });
  const [msg, setMsg] = useState<NoticeMessage>(null);
  async function save(e: React.FormEvent) { e.preventDefault(); try { await api('/users', { method: 'POST', body: JSON.stringify(form) }); setMsg({ type: 'ok', text: 'Usuário criado.' }); setForm({ name: '', email: '', password: '', role: 'OPERADOR', extension: '' }); reload(); } catch (e: any) { setMsg({ type: 'err', text: e.message }); } }
  return <section className="pageGrid"><div className="panel"><h3>Novo usuário</h3><form className="formGrid" onSubmit={save}><label>Nome<input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label><label>Email<input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></label><label>Senha<input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></label><label>Perfil<select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}><option>ADMIN</option><option>SUPERVISOR</option><option>OPERADOR</option></select></label><label>Ramal<input value={form.extension} onChange={(e) => setForm({ ...form, extension: e.target.value })} /></label><button><Plus size={17} />Criar</button></form><Notice msg={msg} /></div><div className="panel listPanel"><h3>Equipe</h3>{error && <Notice msg={{ type: 'err', text: error }} />}{loading ? <p>Carregando...</p> : <DataTable rows={data || []} columns={[{ key: 'name', label: 'Nome' }, { key: 'email', label: 'Email' }, { key: 'role', label: 'Perfil' }, { key: 'extension', label: 'Ramal' }, { key: 'active', label: 'Ativo' }]} />}</div></section>;
}

function Voip() {
  const { data } = useLoad<any>(() => api('/voip/config'), []);
  return <section className="twoCols"><div className="panel"><h3>Configuração VoIP</h3><p className="muted">Asterisk validado com MicroSIP e WebRTC/WSS. Use o ramal 9001 no navegador.</p><DataTable rows={[data || { provider: 'Asterisk', asteriskHost: window.location.hostname, asteriskPort: 8089, asteriskContext: 'interno' }]} columns={[{ key: 'provider', label: 'Provider' }, { key: 'asteriskHost', label: 'Host' }, { key: 'asteriskPort', label: 'Porta' }, { key: 'asteriskContext', label: 'Contexto' }]} /></div><div className="panel accent"><h3>Próximas integrações</h3><div className="miniGuide"><span>Power Dialer com próximo lead automático.</span><span>Screen pop em chamada recebida.</span><span>Transcrição e resumo automático.</span><span>Gravação e auditoria por chamada.</span></div></div></section>;
}

function App() {
  const [ok, setOk] = useState(!!localStorage.getItem('token'));
  const [page, setPage] = useState<string>('Dashboard');
  const content = useMemo(() => page === 'Dashboard' ? <Dashboard setPage={setPage} /> : page === 'Central IA' ? <GrowthCommandCenter /> : page === 'Campanhas' ? <Campaigns /> : page === 'Importar Leads' ? <ImportLeadsPro /> : page === 'Hist. Importações' ? <ImportHistoryPage openImport={() => setPage('Importar Leads')} /> : page === 'Leads' ? <LeadsPro openOperator={() => setPage('Mesa do Operador')} /> : page === 'Retornos' ? <ReturnsPage openOperator={() => setPage('Mesa do Operador')} /> : page === 'Mesa do Operador' ? <OperatorDeskPro openPhone={() => setPage('Softphone SIP')} /> : page === 'Softphone SIP' ? <SipSoftphone /> : page === 'Relatórios' ? <ReportsPro /> : page === 'Qualidade' ? <QualityCenterPage openReports={() => setPage('Relatórios')} /> : page === 'Não Ligar' ? <DoNotCall /> : page === 'Usuários' ? <UsersPage /> : <Voip />, [page]);
  if (!ok) return <Login on={() => setOk(true)} />;
  return <Shell page={page} setPage={setPage}>{content}</Shell>;
}

createRoot(document.getElementById('root')!).render(<App />);
