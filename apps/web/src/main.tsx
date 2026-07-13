import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  Activity, BarChart3, CalendarClock, ClipboardCheck, ClipboardList, FileSpreadsheet,
  Headphones, LayoutDashboard, LogOut, Phone, PhoneCall, Plus, RefreshCw, Settings,
  ShieldBan, Sparkles, Target, TrendingUp, Upload,
  type LucideIcon,
} from 'lucide-react';
import { api } from './services/api';
import Notice, { type NoticeMessage } from './components/Notice';
import StatusBadge from './components/StatusBadge';
import GrowthCommandCenter from './GrowthCommandCenter';
import ImportLeadsPro from './ImportLeadsPro';
import LeadsPro from './pages/LeadsPro';
import OperatorDeskPro from './pages/OperatorDeskPro';
import ReturnsPage from './pages/ReturnsPage';
import ImportHistoryPage from './pages/ImportHistoryPage';
import ReportsPro from './pages/ReportsPro';
import QualityCenterPage from './pages/QualityCenterPage';
import DoNotCallPro from './pages/DoNotCallPro';
import ConfigurationsPage from './pages/ConfigurationsPage';
import './style.css';

const APP_NAME = 'ReferencIA Discador';
type Role = 'ADMIN' | 'SUPERVISOR' | 'OPERADOR';
type SessionUser = { id: string; name: string; email: string; role: Role; extension?: string | null };
type MenuItem = { label: string; icon: LucideIcon; roles: Role[] };

const menu: MenuItem[] = [
  { label: 'Dashboard', icon: LayoutDashboard, roles: ['ADMIN', 'SUPERVISOR', 'OPERADOR'] },
  { label: 'Central IA', icon: TrendingUp, roles: ['ADMIN', 'SUPERVISOR'] },
  { label: 'Campanhas', icon: Target, roles: ['ADMIN', 'SUPERVISOR'] },
  { label: 'Importar Leads', icon: Upload, roles: ['ADMIN'] },
  { label: 'Hist. Importações', icon: FileSpreadsheet, roles: ['ADMIN', 'SUPERVISOR'] },
  { label: 'Leads', icon: Phone, roles: ['ADMIN', 'SUPERVISOR', 'OPERADOR'] },
  { label: 'Retornos', icon: CalendarClock, roles: ['ADMIN', 'SUPERVISOR', 'OPERADOR'] },
  { label: 'Mesa do Operador', icon: Headphones, roles: ['ADMIN', 'SUPERVISOR', 'OPERADOR'] },
  { label: 'Relatórios', icon: BarChart3, roles: ['ADMIN', 'SUPERVISOR'] },
  { label: 'Qualidade', icon: ClipboardCheck, roles: ['ADMIN', 'SUPERVISOR'] },
  { label: 'Não Ligar', icon: ShieldBan, roles: ['ADMIN', 'SUPERVISOR'] },
  { label: 'Configurações', icon: Settings, roles: ['ADMIN', 'SUPERVISOR'] },
];

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

function Login({ on }: { on: (user: SessionUser) => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [msg, setMsg] = useState<NoticeMessage>(null);
  const [loading, setLoading] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    try {
      setLoading(true);
      const data = await api('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
      localStorage.setItem('token', data.token);
      localStorage.setItem('sessionUser', JSON.stringify(data.user));
      on(data.user as SessionUser);
    } catch (error: any) { setMsg({ type: 'err', text: error.message || 'Não foi possível entrar' }); }
    finally { setLoading(false); }
  }
  return <main className="loginPage"><section className="loginHero"><div className="brandMark">IA</div><h1>{APP_NAME}</h1><p>Central inteligente de campanhas, telefone WebRTC, fila comercial, IA de atendimento, produtividade e compliance.</p><div className="heroBullets"><span>WebRTC</span><span>Agent Assist</span><span>Power Dialer</span><span>LGPD</span></div></section><form onSubmit={submit} className="loginCard"><small>Acesso restrito</small><h2>Entrar na operação</h2><label>E-mail<input value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" /></label><label>Senha<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" /></label><Notice msg={msg} /><button disabled={loading}>{loading ? 'Entrando...' : 'Entrar'}</button><p className="muted">Use apenas credenciais autorizadas. Todas as ações relevantes devem ser auditáveis.</p></form></main>;
}

function Shell({ children, page, setPage, user }: { children: React.ReactNode; page: string; setPage: (page: string) => void; user: SessionUser }) {
  const allowedMenu = menu.filter((item) => item.roles.includes(user.role));
  return <div className="appShell"><aside className="sidebar"><div className="logo"><span>Referenc</span><b>IA</b><small>Discador comercial</small></div><nav>{allowedMenu.map(({ label, icon: Icon }) => <button key={label} className={page === label ? 'active' : ''} onClick={() => setPage(label)}><Icon size={18} />{label}</button>)}</nav><button className="logout" onClick={() => { localStorage.clear(); location.reload(); }}><LogOut size={18} />Sair</button></aside><main className="content"><header className="topbar"><div><small>Operação ativa · {user.role}</small><h1>{page}</h1></div><div className="statusGroup"><div className="statusPill"><span />{user.name}</div><button className="ghostBtn" onClick={() => setPage('Mesa do Operador')}><PhoneCall size={16} />Mesa</button></div></header>{children}</main></div>;
}

function Dashboard({ setPage, role }: { setPage: (page: string) => void; role: Role }) {
  const { data, loading, error, reload } = useLoad<any>(() => api('/dashboard/summary'), []);
  const cards = [['Total de leads', data?.total, 'Base disponível'], ['Novos', data?.newLeads, 'Aguardando ação'], ['Chamadas hoje', data?.callsToday, 'Tentativas registradas'], ['Atendidos', data?.atendidos, 'Contatos humanos'], ['Interessados', data?.interessados, 'Potencial comercial'], ['Matrículas', data?.matriculas, 'Conversão final'], ['Não ligar', data?.blocked, 'Bloqueios LGPD'], ['Conversão', `${fmt((data?.taxaConversao || 0) * 100)}%`, 'Matrículas / leads']];
  return <><div className="heroPanel heroPremium"><div><small>Visão geral</small><h2>Operação comercial com compliance, qualidade e relatórios</h2><p>Campanha, base, fila, chamada no navegador, retorno agendado, desfecho, LGPD, qualidade e relatório executivo no mesmo fluxo.</p></div><button onClick={reload}><RefreshCw size={17} />Atualizar</button></div><div className="pipeline"><div>Base importada</div><div>Retornos</div><div>Não Ligar</div><div>Relatório</div><div>Qualidade</div></div>{error && <Notice msg={{ type: 'err', text: error }} />}<div className="kpiGrid">{cards.map(([a, b, c]) => <div className="kpi" key={a}><small>{a}</small><strong>{loading ? '...' : fmt(b)}</strong><span>{c}</span></div>)}</div><section className="twoCols"><div className="panel"><h3><Sparkles size={19} />Atalhos operacionais</h3><div className="steps"><button onClick={() => setPage('Mesa do Operador')}>1. Mesa premium</button>{role !== 'OPERADOR' && <button onClick={() => setPage('Relatórios')}>2. Relatório executivo</button>}{role !== 'OPERADOR' && <button onClick={() => setPage('Qualidade')}>3. Auditoria de qualidade</button>}{role !== 'OPERADOR' && <button onClick={() => setPage('Configurações')}>4. Configurações e usuários</button>}</div></div><div className="panel accent"><h3><Activity size={19} />Perfil ativo</h3><p>Você está usando o perfil {role}. Menus e ações administrativas são exibidos conforme suas permissões.</p></div></section></>;
}

function Campaigns({ role }: { role: Role }) {
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
    } catch (error: any) { setMsg({ type: 'err', text: error.message }); }
  }
  return <section className={role === 'ADMIN' ? 'pageGrid' : 'polishPage'}>{role === 'ADMIN' && <div className="panel"><h3>Nova campanha</h3><p className="muted">Crie uma operação por base, canal, curso, consultor ou período.</p><form className="formGrid" onSubmit={save}><label>Nome<input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ex.: Vestibular Julho" /></label><label>Status<select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}><option>ATIVA</option><option>RASCUNHO</option><option>PAUSADA</option><option>ENCERRADA</option></select></label><label>Tentativas por lead<input type="number" value={form.maxAttemptsPerLead} onChange={(e) => setForm({ ...form, maxAttemptsPerLead: e.target.value })} /></label><label>Intervalo mínimo min.<input type="number" value={form.minIntervalMinutes} onChange={(e) => setForm({ ...form, minIntervalMinutes: e.target.value })} /></label><label className="wide">Descrição<textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></label><button><Plus size={17} />Criar campanha</button></form><Notice msg={msg} /></div>}<div className="panel listPanel"><h3>Campanhas cadastradas</h3>{error && <Notice msg={{ type: 'err', text: error }} />}{loading ? <p>Carregando...</p> : <DataTable rows={data || []} columns={[{ key: 'name', label: 'Campanha' }, { key: 'status', label: 'Status', render: (row) => <StatusBadge status={row.status} /> }, { key: 'allowedCallStart', label: 'Início' }, { key: 'allowedCallEnd', label: 'Fim' }, { key: 'maxAttemptsPerLead', label: 'Tent.' }]} />}</div></section>;
}

function readStoredUser(): SessionUser | null {
  try { return JSON.parse(localStorage.getItem('sessionUser') || 'null') as SessionUser | null; }
  catch { return null; }
}

function App() {
  const [ok, setOk] = useState(!!localStorage.getItem('token'));
  const [user, setUser] = useState<SessionUser | null>(readStoredUser());
  const [sessionLoading, setSessionLoading] = useState(ok && !user);
  const [page, setPage] = useState('Dashboard');

  useEffect(() => {
    if (!ok || user) return;
    api('/auth/me')
      .then((current) => { localStorage.setItem('sessionUser', JSON.stringify(current)); setUser(current as SessionUser); })
      .catch(() => { localStorage.clear(); setOk(false); })
      .finally(() => setSessionLoading(false));
  }, [ok, user]);

  const allowedPages = useMemo(() => user ? menu.filter((item) => item.roles.includes(user.role)).map((item) => item.label) : [], [user]);
  useEffect(() => { if (user && !allowedPages.includes(page)) setPage(user.role === 'OPERADOR' ? 'Mesa do Operador' : 'Dashboard'); }, [user, page, allowedPages]);

  const content = useMemo(() => {
    if (!user) return null;
    return page === 'Dashboard' ? <Dashboard setPage={setPage} role={user.role} />
      : page === 'Central IA' ? <GrowthCommandCenter />
      : page === 'Campanhas' ? <Campaigns role={user.role} />
      : page === 'Importar Leads' ? <ImportLeadsPro />
      : page === 'Hist. Importações' ? <ImportHistoryPage openImport={() => setPage('Importar Leads')} />
      : page === 'Leads' ? <LeadsPro openOperator={() => setPage('Mesa do Operador')} />
      : page === 'Retornos' ? <ReturnsPage openOperator={() => setPage('Mesa do Operador')} />
      : page === 'Mesa do Operador' ? <OperatorDeskPro openPhone={() => setPage('Configurações')} />
      : page === 'Relatórios' ? <ReportsPro />
      : page === 'Qualidade' ? <QualityCenterPage openReports={() => setPage('Relatórios')} />
      : page === 'Não Ligar' ? <DoNotCallPro />
      : <ConfigurationsPage role={user.role} />;
  }, [page, user]);

  if (!ok) return <Login on={(loggedUser) => { setUser(loggedUser); setOk(true); setPage(loggedUser.role === 'OPERADOR' ? 'Mesa do Operador' : 'Dashboard'); }} />;
  if (sessionLoading || !user) return <main className="loginPage"><section className="loginCard"><h2>Validando acesso...</h2><p className="muted">Carregando perfil e permissões.</p></section></main>;
  return <Shell page={page} setPage={setPage} user={user}>{content}</Shell>;
}

createRoot(document.getElementById('root')!).render(<App />);