import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  BarChart3,
  CheckCircle2,
  FileBarChart,
  Headphones,
  LayoutDashboard,
  LogOut,
  Phone,
  Settings,
  ShieldBan,
  Sparkles,
  Target,
  Upload,
  Users,
} from 'lucide-react';
import { api, token } from './services/api';
import './style.css';

const API_BASE = '/api';

const menu = [
  ['Dashboard', LayoutDashboard],
  ['Campanhas', Target],
  ['Importar Leads', Upload],
  ['Leads', Phone],
  ['Operador', Headphones],
  ['Relatórios', FileBarChart],
  ['Lista Não Ligar', ShieldBan],
  ['Usuários', Users],
  ['Configurações VoIP', Settings],
] as const;

type Page = (typeof menu)[number][0];

type AnyRow = Record<string, any>;

const labels: Record<string, string> = {
  total: 'Total de leads',
  newLeads: 'Novos leads',
  callsToday: 'Ligações hoje',
  atendidos: 'Atendidos',
  naoAtenderam: 'Não atenderam',
  interessados: 'Interessados',
  matriculas: 'Matrículas',
  blocked: 'Bloqueados LGPD',
  taxaAtendimento: 'Taxa de atendimento',
  taxaConversao: 'Taxa de conversão',
};

function fmt(value: any) {
  if (typeof value === 'number') {
    if (value > 0 && value < 1) return `${(value * 100).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`;
    return value.toLocaleString('pt-BR', { maximumFractionDigits: 2 });
  }
  return String(value ?? '—');
}

function Login({ on }: { on: () => void }) {
  const [email, setEmail] = useState('admin@score.com.br');
  const [password, setPassword] = useState('Admin@123456');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErr('');
    try {
      const d = await api('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
      localStorage.setItem('token', d.token);
      on();
    } catch (x: any) {
      setErr(x.message || 'Não foi possível entrar.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="login">
      <section className="loginHero">
        <div className="badge"><Sparkles size={16} /> Operação Comercial</div>
        <h1>SCORE Discador</h1>
        <p>Centralize campanhas, importação de leads, fila de ligações, resultados de atendimento e bloqueios de LGPD em um só painel.</p>
        <div className="heroList">
          <span><CheckCircle2 size={17} /> Campanhas e listas</span>
          <span><CheckCircle2 size={17} /> Histórico de chamadas</span>
          <span><CheckCircle2 size={17} /> Não ligar novamente</span>
        </div>
      </section>
      <form onSubmit={submit} className="panel loginBox">
        <h2>Acessar painel</h2>
        <p>Entre com seu usuário administrativo para acompanhar a operação.</p>
        <label>Email<input value={email} onChange={(e) => setEmail(e.target.value)} /></label>
        <label>Senha<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} /></label>
        {err && <b className="err">{err}</b>}
        <button disabled={loading}>{loading ? 'Entrando...' : 'Entrar'}</button>
      </form>
    </main>
  );
}

function Empty({ text }: { text: string }) {
  return <div className="empty">{text}</div>;
}

function Table({ rows, columns }: { rows: AnyRow[]; columns?: string[] }) {
  const keys = columns || Object.keys(rows[0] || {}).slice(0, 7);
  if (!rows.length) return <Empty text="Nenhum registro encontrado por enquanto." />;
  return (
    <div className="table">
      <table>
        <thead><tr>{keys.map((k) => <th key={k}>{k}</th>)}</tr></thead>
        <tbody>
          {rows.slice(0, 25).map((r, i) => (
            <tr key={i}>{keys.map((k) => <td key={k}>{typeof r[k] === 'object' ? '—' : String(r[k] ?? '')}</td>)}</tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Dashboard() {
  const [d, setD] = useState<AnyRow>({});
  useEffect(() => { api('/dashboard/summary').then(setD).catch(() => setD({})); }, []);
  const cards = Object.entries(d);
  return (
    <>
      <div className="pageTitle"><span>Visão geral</span><h2>Dashboard da operação</h2><p>Acompanhe volume de leads, chamadas realizadas, conversões e bloqueios LGPD.</p></div>
      <div className="grid cards">
        {cards.length ? cards.map(([k, v]) => <div className="card" key={k}><small>{labels[k] || k}</small><strong>{fmt(v)}</strong></div>) : ['Leads', 'Chamadas', 'Interessados', 'Matrículas'].map((k) => <div className="card" key={k}><small>{k}</small><strong>0</strong></div>)}
      </div>
      <div className="twoCols">
        <section className="panel"><h3>Fluxo recomendado</h3><ol><li>Crie uma campanha com nome claro.</li><li>Importe a planilha CSV/XLSX.</li><li>Operadores trabalham a fila no módulo Operador.</li><li>Supervisão acompanha resultados em Relatórios.</li></ol></section>
        <section className="panel accent"><h3>Boas práticas LGPD</h3><p>Use os dados somente para finalidade autorizada, respeite pedidos de bloqueio e registre observações relevantes após cada contato.</p></section>
      </div>
    </>
  );
}

function Campaigns() {
  const [rows, setRows] = useState<AnyRow[]>([]);
  const [name, setName] = useState('Campanha Julho - Matrículas');
  const [description, setDescription] = useState('Lista de prospecção comercial para contatos ativos.');
  useEffect(() => { api('/campaigns').then(setRows).catch(() => setRows([])); }, []);
  async function add() {
    await api('/campaigns', { method: 'POST', body: JSON.stringify({ name, description, status: 'ATIVA' }) });
    setRows(await api('/campaigns'));
  }
  return <><div className="pageTitle"><span>Campanhas</span><h2>Organize suas listas de contato</h2><p>Separe leads por ação comercial, mês, origem ou consultor responsável.</p></div><div className="panel formGrid"><label>Nome da campanha<input value={name} onChange={(e) => setName(e.target.value)} /></label><label>Descrição<input value={description} onChange={(e) => setDescription(e.target.value)} /></label><button onClick={add}>Criar campanha</button></div><Table rows={rows} columns={['name', 'status', 'allowedCallStart', 'allowedCallEnd', 'maxAttemptsPerLead', 'createdAt']} /></>;
}

function Import() {
  const [camps, setCamps] = useState<AnyRow[]>([]);
  const [campaignId, setC] = useState('');
  const [msg, setMsg] = useState('Aguardando arquivo.');
  useEffect(() => { api('/campaigns').then((x) => { setCamps(x); setC(x[0]?.id || ''); }).catch(() => setCamps([])); }, []);
  async function up(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f || !campaignId) return setMsg('Selecione uma campanha e um arquivo.');
    const fd = new FormData();
    fd.append('file', f);
    const r = await fetch(`${API_BASE}/imports/${campaignId}/upload`, { method: 'POST', headers: { Authorization: `Bearer ${token()}` }, body: fd });
    setMsg(JSON.stringify(await r.json(), null, 2));
  }
  return <><div className="pageTitle"><span>Importação</span><h2>Subir leads por planilha</h2><p>Arquivos aceitos: CSV e XLSX. Colunas sugeridas: nome, telefone, cpf, email, curso, origem, observacao.</p></div><div className="twoCols"><section className="panel formStack"><label>Campanha<select value={campaignId} onChange={(e) => setC(e.target.value)}>{camps.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label><label>Arquivo<input type="file" accept=".csv,.xlsx" onChange={up} /></label><pre>{msg}</pre></section><section className="panel"><h3>Checklist antes de importar</h3><ul><li>Telefone preenchido e com DDD.</li><li>Remover colunas desnecessárias.</li><li>Validar origem e curso.</li><li>Não importar contatos bloqueados sem base legal.</li></ul></section></div></>;
}

function Leads() {
  const [rows, setRows] = useState<AnyRow[]>([]);
  const [status, setStatus] = useState('');
  useEffect(() => { api(`/leads${status ? `?status=${status}` : ''}`).then(setRows).catch(() => setRows([])); }, [status]);
  return <><div className="pageTitle"><span>Leads</span><h2>Base operacional</h2><p>Consulte os contatos importados e acompanhe o status de cada lead.</p></div><div className="actions"><select value={status} onChange={(e) => setStatus(e.target.value)}><option value="">Todos</option><option value="EM_FILA">Em fila</option><option value="LIGANDO">Ligando</option><option value="INTERESSADO">Interessado</option><option value="MATRICULADO">Matriculado</option><option value="NAO_LIGAR_NOVAMENTE">Não ligar</option></select></div><Table rows={rows} columns={['name', 'phoneNormalized', 'email', 'course', 'origin', 'status', 'attemptsCount']} /></>;
}

function Operator() {
  const [lead, setLead] = useState<AnyRow | undefined>();
  const [call, setCall] = useState<AnyRow | undefined>();
  const [notes, setNotes] = useState('');
  useEffect(() => { api('/leads?status=EM_FILA').then((r) => setLead(r[0])).catch(() => setLead(undefined)); }, []);
  async function start() { if (lead) setCall(await api('/calls/start', { method: 'POST', body: JSON.stringify({ leadId: lead.id }) })); }
  async function finish(s: string) { if (!call) return; await api(`/calls/${call.id}/finish`, { method: 'POST', body: JSON.stringify({ finalDisposition: s, notes, doNotCall: s === 'NAO_LIGAR_NOVAMENTE' }) }); alert('Resultado salvo'); location.reload(); }
  return <><div className="pageTitle"><span>Operador</span><h2>Fila de atendimento</h2><p>Use este módulo para iniciar chamadas e registrar o desfecho comercial.</p></div><div className="panel operator"><p className="warn">Confirme o interesse do aluno, registre observações e respeite pedidos de não contato.</p>{lead ? <><div className="leadBox"><h3>{lead.name}</h3><p>{lead.phoneNormalized} • {lead.course || 'Curso não informado'} • {lead.origin || 'Origem não informada'}</p></div><button className="call" onClick={start}>{call ? 'Chamada iniciada' : 'Iniciar ligação'}</button><textarea placeholder="Observação do atendimento" value={notes} onChange={(e) => setNotes(e.target.value)} /><div className="chips">{['ATENDIDO', 'NAO_ATENDEU', 'INTERESSADO', 'SEM_INTERESSE', 'MATRICULADO', 'RETORNO', 'NAO_LIGAR_NOVAMENTE'].map((s) => <button key={s} disabled={!call} onClick={() => finish(s)}>{s.replaceAll('_', ' ')}</button>)}</div></> : <Empty text="Nenhum lead em fila no momento." />}</div></>;
}

function Reports() {
  const [rows, setRows] = useState<AnyRow[]>([]);
  useEffect(() => { api('/reports/calls').then(setRows).catch(() => setRows([])); }, []);
  return <><div className="pageTitle"><span>Relatórios</span><h2>Resultados de chamadas</h2><p>Acompanhe tentativas, operadores, campanhas e resultados registrados.</p></div><div className="grid cards"><div className="card"><small>Total listado</small><strong>{rows.length}</strong></div><div className="card"><small>Exportação</small><strong>CSV</strong></div><div className="card"><small>Auditoria</small><strong>Ativa</strong></div></div><Table rows={rows} /></>;
}

function Generic({ title, subtitle, path }: { title: string; subtitle: string; path: string }) {
  const [rows, setRows] = useState<AnyRow[]>([]);
  useEffect(() => { api(path).then((r) => setRows(Array.isArray(r) ? r : [r])).catch(() => setRows([])); }, [path]);
  return <><div className="pageTitle"><span>{title}</span><h2>{title}</h2><p>{subtitle}</p></div><Table rows={rows} /></>;
}

function App() {
  const [ok, setOk] = useState(!!localStorage.getItem('token'));
  const [page, setPage] = useState<Page>('Dashboard');
  const content = useMemo(() => {
    if (page === 'Dashboard') return <Dashboard />;
    if (page === 'Campanhas') return <Campaigns />;
    if (page === 'Importar Leads') return <Import />;
    if (page === 'Leads') return <Leads />;
    if (page === 'Operador') return <Operator />;
    if (page === 'Relatórios') return <Reports />;
    if (page === 'Lista Não Ligar') return <Generic title="Lista Não Ligar" subtitle="Contatos bloqueados para novas ações, mantendo conformidade com LGPD." path="/do-not-call" />;
    if (page === 'Usuários') return <Generic title="Usuários" subtitle="Equipe autorizada a acessar o discador." path="/users" />;
    return <Generic title="Configurações VoIP" subtitle="Parâmetros para conexão futura com SIP/Asterisk. O modo atual pode operar como mock." path="/voip/config" />;
  }, [page]);

  if (!ok) return <Login on={() => setOk(true)} />;
  return (
    <div className="app">
      <aside>
        <div className="brand"><div className="logo"><BarChart3 size={22} /></div><h1>SCORE<span>Discador</span></h1></div>
        <nav>{menu.map(([m, I]) => <button key={m} className={page === m ? 'active' : ''} onClick={() => setPage(m)}><I size={18} />{m}</button>)}</nav>
        <button className="logout" onClick={() => { localStorage.clear(); location.reload(); }}><LogOut size={18} />Sair</button>
      </aside>
      <main>{content}</main>
    </div>
  );
}

createRoot(document.getElementById('root')!).render(<App />);
