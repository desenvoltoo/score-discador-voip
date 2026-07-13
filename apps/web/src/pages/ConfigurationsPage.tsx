import React, { useEffect, useState } from 'react';
import { ChevronDown, Headphones, KeyRound, PhoneCall, Settings, ShieldCheck, Users } from 'lucide-react';
import { api } from '../services/api';
import Notice, { type NoticeMessage } from '../components/Notice';
import SipSoftphone from '../SipSoftphone';
import UsersPro from './UsersPro';
import '../ops-pages.css';
import '../crm-polish.css';
import '../configurations.css';

type ConfigSection = 'VOIP' | 'USERS' | 'SOFTPHONE' | 'PERMISSIONS';

type VoipConfig = {
  provider?: string;
  asteriskHost?: string;
  asteriskPort?: string | number;
  asteriskContext?: string;
  asteriskTrunk?: string;
  operatorPrefix?: string;
};

const sectionOptions: Array<{ value: ConfigSection; label: string; description: string; icon: React.ComponentType<{ size?: number }> }> = [
  { value: 'VOIP', label: 'VoIP', description: 'Servidor, contexto, tronco e integração Asterisk.', icon: PhoneCall },
  { value: 'USERS', label: 'Usuários', description: 'Criação de usuários, perfis, ramais e acesso.', icon: Users },
  { value: 'SOFTPHONE', label: 'Configuração Softphone', description: 'Credenciais e teste do telefone WebRTC usado na Mesa.', icon: Headphones },
  { value: 'PERMISSIONS', label: 'Permissões', description: 'Matriz de acesso por perfil e responsabilidade.', icon: ShieldCheck },
];

function VoipSettings() {
  const [config, setConfig] = useState<VoipConfig>({});
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<NoticeMessage>(null);

  useEffect(() => {
    api('/voip/config')
      .then((data) => setConfig(data || {}))
      .catch((error: unknown) => setMsg({ type: 'err', text: error instanceof Error ? error.message : 'Não foi possível carregar a configuração VoIP.' }))
      .finally(() => setLoading(false));
  }, []);

  return <section className="configContentGrid">
    <div className="panel configPanel">
      <div className="panelHeader"><h3><PhoneCall size={20} />Configuração VoIP</h3><span className="muted">{loading ? 'Carregando...' : config.provider || 'Não configurado'}</span></div>
      <Notice msg={msg} />
      <div className="configFacts">
        <span><small>Provider</small><b>{config.provider || '—'}</b></span>
        <span><small>Host Asterisk</small><b>{config.asteriskHost || '—'}</b></span>
        <span><small>Porta</small><b>{config.asteriskPort || '—'}</b></span>
        <span><small>Contexto</small><b>{config.asteriskContext || '—'}</b></span>
        <span><small>Tronco</small><b>{config.asteriskTrunk || '—'}</b></span>
        <span><small>Prefixo</small><b>{config.operatorPrefix || '—'}</b></span>
      </div>
      <p className="muted">As chamadas usam essas definições em conjunto com o ramal cadastrado em cada usuário.</p>
    </div>
    <aside className="panel accent configHelp">
      <h3><Settings size={20} />Checklist de infraestrutura</h3>
      <div className="miniGuide">
        <span>WSS e certificado válidos no servidor.</span>
        <span>Ramal WebRTC liberado e associado ao usuário.</span>
        <span>Contexto e tronco configurados para chamadas externas.</span>
        <span>Horários e limites definidos em cada campanha.</span>
      </div>
    </aside>
  </section>;
}

function SoftphoneSettings() {
  return <section className="configContentGrid">
    <div className="panel configPanel">
      <div className="panelHeader"><h3><Headphones size={20} />Configuração e teste do Softphone</h3><span className="muted">Uso integrado à Mesa</span></div>
      <p className="muted">O telefone operacional permanece disponível apenas dentro da Mesa do Operador. Esta área serve para configurar, registrar e testar o ramal WebRTC.</p>
      <SipSoftphone />
    </div>
    <aside className="panel accent configHelp">
      <h3><KeyRound size={20} />Boas práticas</h3>
      <div className="miniGuide">
        <span>Use um ramal individual por operador.</span>
        <span>Não compartilhe senha SIP entre usuários.</span>
        <span>Teste microfone e áudio antes do início do turno.</span>
        <span>Mantenha as credenciais restritas à equipe autorizada.</span>
      </div>
    </aside>
  </section>;
}

function PermissionsSettings() {
  const permissions = [
    { role: 'ADMIN', access: 'Acesso total', details: 'Configurações, usuários, campanhas, importações, relatórios, auditoria e operação.' },
    { role: 'SUPERVISOR', access: 'Gestão operacional', details: 'Relatórios, qualidade, retornos, leads, auditoria e acompanhamento da equipe.' },
    { role: 'OPERADOR', access: 'Atendimento', details: 'Mesa do Operador, fila atribuída, retornos próprios, registros e histórico permitido.' },
  ];

  return <section className="panel permissionsPanel">
    <div className="panelHeader"><h3><ShieldCheck size={20} />Matriz de permissões</h3><span className="muted">Controle por perfil</span></div>
    <div className="permissionCards">{permissions.map((item) => <article key={item.role}><span className={`rolePill role-${item.role.toLowerCase()}`}>{item.role}</span><b>{item.access}</b><p>{item.details}</p></article>)}</div>
    <p className="muted">A criação do usuário e a escolha do perfil são feitas na seção Usuários. O backend continua responsável por validar as permissões em cada rota.</p>
  </section>;
}

export default function ConfigurationsPage() {
  const [section, setSection] = useState<ConfigSection>('VOIP');
  const current = sectionOptions.find((item) => item.value === section) || sectionOptions[0];
  const CurrentIcon = current.icon;

  return <section className="configurationsPage polishPage">
    <div className="polishHero configHero">
      <div><small>Administração do sistema</small><h2>Configurações centralizadas em um único lugar</h2><p>VoIP, usuários, softphone, perfis e permissões organizados por categoria para reduzir itens soltos no menu.</p></div>
      <label className="configSelector"><span>Configurações</span><div><CurrentIcon size={18} /><select value={section} onChange={(event) => setSection(event.target.value as ConfigSection)}>{sectionOptions.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select><ChevronDown size={17} /></div></label>
    </div>

    <nav className="configTabs" aria-label="Categorias de configuração">{sectionOptions.map((item) => { const Icon = item.icon; return <button key={item.value} className={section === item.value ? 'active' : ''} onClick={() => setSection(item.value)}><Icon size={18} /><span><b>{item.label}</b><small>{item.description}</small></span></button>; })}</nav>

    {section === 'VOIP' ? <VoipSettings /> : section === 'USERS' ? <UsersPro /> : section === 'SOFTPHONE' ? <SoftphoneSettings /> : <PermissionsSettings />}
  </section>;
}
