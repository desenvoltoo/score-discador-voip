import React, { useMemo, useState } from 'react';
import { Activity, Bot, Brain, CalendarClock, CheckCircle2, Gauge, Megaphone, MessageSquare, PhoneCall, Rocket, ShieldCheck, Sparkles, Target, Users, Zap } from 'lucide-react';
import './growth-command-center.css';

const playbooks = [
  { title: 'Power Dialer controlado', impact: '+18% produtividade', detail: 'Após salvar desfecho, o próximo lead prioritário entra automaticamente na tela do operador.' },
  { title: 'Resumo pós-ligação com IA', impact: '-40% tempo de pós-atendimento', detail: 'Gera resumo, objeção, status sugerido e próxima ação sem o consultor digitar tudo.' },
  { title: 'WhatsApp de continuidade', impact: '+12% retorno', detail: 'Cria mensagem pronta com curso, unidade, CTA e link de matrícula.' },
  { title: 'Auditoria LGPD ativa', impact: 'risco menor', detail: 'Bloqueio Não Ligar, motivo obrigatório e trilha auditável por atendimento.' },
];

const operatorRows = [
  ['Supervisão', '9001', 'Online', '7', '32%', '1 matrícula'],
  ['Consultor 02', '9002', 'Pausado', '4', '21%', '3 interessados'],
  ['Consultor 03', '9003', 'Online', '9', '28%', '2 retornos'],
  ['Consultor 04', '9004', 'Offline', '0', '—', 'aguardando login'],
];

const automations = [
  'Distribuir lead por curso, unidade e disponibilidade do consultor',
  'Reagendar retorno com alerta e prioridade na fila',
  'Detectar lead quente por origem + recência + tentativas',
  'Gerar texto de WhatsApp após cada desfecho',
  'Sinalizar promessa indevida ou atendimento fora do script',
];

export default function GrowthCommandCenter() {
  const [mode, setMode] = useState<'preview' | 'power' | 'assistido'>('preview');
  const score = useMemo(() => mode === 'power' ? 91 : mode === 'assistido' ? 87 : 78, [mode]);
  return (
    <section className="growthCenter">
      <div className="growthHero">
        <div>
          <small>Central de crescimento</small>
          <h2>Controle executivo da operação com IA, discagem e conversão</h2>
          <p>Uma visão de gestão para acompanhar operação ao vivo, priorizar o próximo desenvolvimento e transformar o discador em uma plataforma comercial acima do padrão do mercado.</p>
        </div>
        <div className="growthScore"><Gauge size={28}/><strong>{score}%</strong><span>maturidade operacional</span></div>
      </div>

      <div className="modeSwitch">
        <button className={mode === 'preview' ? 'active' : ''} onClick={() => setMode('preview')}><PhoneCall size={17}/>Preview Dialer</button>
        <button className={mode === 'power' ? 'active' : ''} onClick={() => setMode('power')}><Zap size={17}/>Power Dialer</button>
        <button className={mode === 'assistido' ? 'active' : ''} onClick={() => setMode('assistido')}><Brain size={17}/>IA assistida</button>
      </div>

      <div className="growthKpis">
        <div><small>Operadores online</small><b>3/4</b><span>ramais WebRTC monitorados</span></div>
        <div><small>Leads em fila</small><b>128</b><span>ordenados por prioridade</span></div>
        <div><small>Chamadas hoje</small><b>86</b><span>tendência acima da média</span></div>
        <div><small>Conversão estimada</small><b>29%</b><span>com follow-up ativo</span></div>
      </div>

      <div className="growthGrid">
        <div className="growthPanel wide">
          <h3><Activity size={20}/>Wallboard da operação</h3>
          <div className="operatorWall">
            {operatorRows.map((r) => <div key={r[0]} className="operatorRow"><b>{r[0]}</b><span>Ramal {r[1]}</span><em className={r[2] === 'Online' ? 'ok' : r[2] === 'Offline' ? 'bad' : ''}>{r[2]}</em><strong>{r[3]} chamadas</strong><span>{r[4]} conv.</span><small>{r[5]}</small></div>)}
          </div>
        </div>

        <div className="growthPanel">
          <h3><Sparkles size={20}/>Próximas vantagens competitivas</h3>
          <div className="playbookList">
            {playbooks.map((p) => <article key={p.title}><div><b>{p.title}</b><span>{p.detail}</span></div><strong>{p.impact}</strong></article>)}
          </div>
        </div>

        <div className="growthPanel accentGrowth">
          <h3><Bot size={20}/>Motor de IA planejado</h3>
          <div className="aiRoadmap">
            <span><CheckCircle2 size={16}/>Resumo automático</span>
            <span><MessageSquare size={16}/>Mensagem WhatsApp</span>
            <span><Target size={16}/>Score de conversão</span>
            <span><ShieldCheck size={16}/>Auditoria LGPD</span>
            <span><CalendarClock size={16}/>Retorno inteligente</span>
          </div>
        </div>

        <div className="growthPanel wide">
          <h3><Rocket size={20}/>Fila de implantação recomendada</h3>
          <div className="automationTimeline">
            {automations.map((a, i) => <div key={a}><span>{i + 1}</span><p>{a}</p><button>{i < 2 ? 'Próximo sprint' : 'Backlog'}</button></div>)}
          </div>
        </div>

        <div className="growthPanel">
          <h3><Users size={20}/>Gestão comercial</h3>
          <p className="growthText">A próxima entrega deve ligar o cockpit do operador com esta central: cada chamada gera evento, resumo, desfecho, próxima ação e produtividade por consultor.</p>
        </div>

        <div className="growthPanel">
          <h3><Megaphone size={20}/>Omnichannel</h3>
          <p className="growthText">Depois da ligação, o sistema deve sugerir WhatsApp, e-mail ou retorno agendado. Isso reduz esquecimento e aumenta conversão.</p>
        </div>
      </div>
    </section>
  );
}
