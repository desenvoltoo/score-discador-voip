import React, { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, KeyRound, Mail, PhoneCall, Plus, RefreshCw, Search, ShieldCheck, UserCog, Users, XCircle } from 'lucide-react';
import { api } from '../services/api';
import Notice, { type NoticeMessage } from '../components/Notice';
import '../crm-polish.css';

type Role = 'ADMIN' | 'SUPERVISOR' | 'OPERADOR';

function fmt(v: any) {
  if (v === null || v === undefined || v === '') return '—';
  if (typeof v === 'boolean') return v ? 'Ativo' : 'Inativo';
  if (String(v).includes('T')) return String(v).replace('T', ' ').slice(0, 16);
  return String(v).replaceAll('_', ' ');
}

function roleHint(role: string) {
  if (role === 'ADMIN') return 'Acesso total, usuários, campanhas, importações e configurações.';
  if (role === 'SUPERVISOR') return 'Acompanha operação, relatórios, qualidade e retornos.';
  return 'Foco em Mesa do Operador, leads, ligações e registros.';
}

export default function UsersPro({ role }: { role: Role }) {
  const [rows, setRows] = useState<any[]>([]);
  const [form, setForm] = useState<any>({ name: '', email: '', password: '', role: 'OPERADOR', extension: '' });
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<NoticeMessage>(null);

  async function load() {
    try {
      setLoading(true);
      setRows(await api('/users'));
    } catch (e: any) {
      setMsg({ type: 'err', text: e.message || 'Não foi possível carregar usuários.' });
    } finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (role !== 'ADMIN') return;
    try {
      if (!form.name || !form.email || !form.password) {
        setMsg({ type: 'info', text: 'Preencha nome, e-mail e senha para criar o usuário.' });
        return;
      }
      await api('/users', { method: 'POST', body: JSON.stringify(form) });
      setMsg({ type: 'ok', text: 'Usuário criado com sucesso.' });
      setForm({ name: '', email: '', password: '', role: 'OPERADOR', extension: '' });
      load();
    } catch (e: any) { setMsg({ type: 'err', text: e.message }); }
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((user) => !q || [user.name, user.email, user.role, user.extension].join(' ').toLowerCase().includes(q));
  }, [rows, query]);

  const totals = useMemo(() => ({
    total: rows.length,
    admins: rows.filter((user) => user.role === 'ADMIN').length,
    supervisors: rows.filter((user) => user.role === 'SUPERVISOR').length,
    operators: rows.filter((user) => user.role === 'OPERADOR').length,
  }), [rows]);

  return <section className="usersPro polishPage">
    <div className="polishHero usersHero">
      <div>
        <small>Gestão de acessos · {role}</small>
        <h2>{role === 'ADMIN' ? 'Crie usuários com perfil, ramal e contexto operacional' : 'Consulte a equipe e os acessos cadastrados'}</h2>
        <p>{role === 'ADMIN' ? 'Cadastre a equipe, defina perfis e associe ramais.' : 'Supervisores podem consultar a equipe, mas a criação e alteração de usuários permanecem restritas ao administrador.'}</p>
      </div>
      <button onClick={load}><RefreshCw size={17} />Atualizar equipe</button>
    </div>

    <Notice msg={msg} />

    <div className="polishKpis">
      <div><small>Usuários</small><strong>{totals.total}</strong><span>cadastrados</span></div>
      <div><small>Admins</small><strong>{totals.admins}</strong><span>acesso total</span></div>
      <div><small>Supervisores</small><strong>{totals.supervisors}</strong><span>gestão operacional</span></div>
      <div><small>Operadores</small><strong>{totals.operators}</strong><span>atendimento</span></div>
    </div>

    <section className="usersLayout">
      {role === 'ADMIN' && <div className="panel userCreatePanel">
        <div className="panelHeader"><h3><UserCog size={20} />Novo usuário</h3><span className="muted">Perfil: {form.role}</span></div>
        <form className="userForm" onSubmit={save}>
          <label>Nome<input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Nome do colaborador" /></label>
          <label>E-mail<input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="email@empresa.com" /></label>
          <label>Senha<input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Senha temporária" /></label>
          <label>Ramal<input value={form.extension} onChange={(e) => setForm({ ...form, extension: e.target.value })} placeholder="Ex.: 9001" /></label>
          <label className="wide">Perfil<select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}><option>ADMIN</option><option>SUPERVISOR</option><option>OPERADOR</option></select></label>
          <div className="rolePreview wide"><ShieldCheck size={18} /><div><b>{form.role}</b><span>{roleHint(form.role)}</span></div></div>
          <button className="wide"><Plus size={17} />Criar usuário</button>
        </form>
      </div>}

      <div className="panel usersListPanel">
        <div className="panelHeader"><h3><Users size={20} />Equipe</h3><span className="muted">{loading ? 'Carregando...' : `${filtered.length} exibidos`}</span></div>
        <div className="filters singleFilter usersFilter"><label>Buscar<input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Nome, e-mail, perfil ou ramal" /></label><button onClick={load}><Search size={16} />Buscar</button></div>
        <div className="userCards">
          {filtered.map((user) => <article key={user.id} className="userCard">
            <div className="userAvatar">{String(user.name || 'U').slice(0, 2).toUpperCase()}</div>
            <div className="userMain">
              <div className="userTop"><b>{user.name}</b><span className={`rolePill role-${String(user.role).toLowerCase()}`}>{user.role}</span></div>
              <p><Mail size={14} />{user.email}</p>
              <p><PhoneCall size={14} />Ramal: {fmt(user.extension)}</p>
            </div>
            <div className={`userState ${user.active ? 'ok' : 'bad'}`}>{user.active ? <CheckCircle2 size={15} /> : <XCircle size={15} />}{fmt(user.active)}</div>
          </article>)}
          {!filtered.length && <div className="empty"><KeyRound size={34} /><strong>Nenhum usuário encontrado</strong><span>Crie um usuário ou ajuste a busca.</span></div>}
        </div>
      </div>
    </section>
  </section>;
}