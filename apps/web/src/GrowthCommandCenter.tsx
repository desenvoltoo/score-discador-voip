import React, { useEffect, useMemo, useState } from 'react';
import { Activity, Bot, Brain, CalendarClock, CheckCircle2, Gauge, Megaphone, MessageSquare, PhoneCall, RefreshCw, Rocket, ShieldCheck, Sparkles, Target, Users, Zap } from 'lucide-react';
import { api } from './services/api';
import Notice, { type NoticeMessage } from './components/Notice';
import StatusBadge from './components/StatusBadge';
import './growth-command-center.css';

const playbooks = [
  { title: 'Power Dialer controlado', impact: '+18% produtividade', detail: 'Após salvar desfecho, o próximo lead prioritário entra automaticamente na tela do operador.' },
  { title: 'Resumo pós-ligação com IA', impact: '-40% pós-atendimento', detail: 'Gera resumo, objeção, status sugerido e próxima ação.' },
  { title: 'WhatsApp de continuidade', impact: '+12% retorno', detail: 'Cria mensagem pronta com curso, unidade e próximo passo.' },
  { title: 'Auditoria LGPD ativa', impact: 'risco menor', detail: 'Bloqueio Não Ligar, motivo obrigatório e trilha auditável por atendimento.' },
];

const automations = [
  'Distribuir lead por curso, unidade e disponibilidade do consultor',
  'Reagendar retorno com alerta e prioridade na fila',
  'Detectar lead quente por origem, recência e tentativas',
  'Gerar texto de WhatsApp após cada desfecho',
  'Criar ranking de campanha e operador em tempo real',
];

function pct(num: number, den: number) {
  if (!den) return '0%';
  return `${Math.round((num / den) * 100)}%`;
}

function safeDate(v?: string | null) {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export default function GrowthCommandCenter() {
  const [mode, setMode] = useState<'preview' | 'power' | 'assistido'>('preview');
  const [leads, setLeads] = useState<any[]>([]);
  const [calls, setCalls] = useState<any[]>([]);
  const [imports, setImports] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<NoticeMessage>(null);

  async function load() {
    try {
      setLoading(true);
      setMsg(null);
      const [leadRows, callRows, importRows] = await Promise.all([api('/leads'), api('/calls'), api('/imports')]);
      setLeads(leadRows || []);
      setCalls(callRows || []);
      setImports(importRows || []);
    } catch (e: any) {
      setMsg({ type: 'err', text: e.message || 'Não foi possível carregar a Central IA.' });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const metrics = useMemo(() => {
    const today = startOfToday();
    const callsToday = calls.filter((c) => (safeDate(c.createdAt)?.getTime() || 0) >= today.getTime()).length;
    const queue = leads.filter((l) => ['NOVO', 'EM_FILA'].includes(l.status)).length;
    const interested = leads.filter((l) => l.status === 'INTERESSADO').length;
    const enrolled = leads.filter((l) => l.status === 'MATRICULADO').length;
    const noAnswer = leads.filter((l) => ['NAO_ATENDEU', 'OCUPADO', 'CAIXA_POSTAL'].includes(l.status)).length;
    const blocked = leads.filter((l) => l.doNotCall || l.status === 'NAO_LIGAR_NOVAMENTE').length;
    const overdueReturns = leads.filter((l) => l.status === 'RETORNO' && safeDate(l.callbackAt) && safeDate(l.callbackAt)!.getTime() < Date.now()).length;
    const todayReturns = leads.filter((l) => {
      const d = safeDate(l.callbackAt);
      return l.status === 'RETORNO' && d && d >= today && d.getTime() < today.getTime() + 86400000;
    }).length;
    const totalImported = imports.reduce((acc, r) => acc + Number(r.totalImported || 0), 0);
    const rejected = imports.reduce((acc, r) => acc + Number(r.invalid || 0) + Number(r.blocked || 0), 0);
    return { callsToday, queue, interested, enrolled, noAnswer, blocked, overdueReturns, todayReturns, totalImported, rejected, conversion: pct(enrolled, leads.length) };
  }, [leads, calls, imports]);

  const score = useMemo(() => {
    let base = mode === 'power' ? 82 : mode === 'assistido' ? 86 : 76;
    if (metrics.queue > 0) base += 3;
    if (metrics.callsToday > 0) base += 4;
    if (metrics.overdueReturns === 0) base += 4;
    if (metrics.rejected === 0) base += 2;
    return Math.min(96, base);
  }, [mode, metrics]);

  const statusRows = useMemo(() => {
    const map = leads.reduce<Record<string, number>>((acc, l) => {
      const key = l.status || 'SEM_STATUS';
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 8);
  }, [leads]);

  const campaignRows = useMemo(() => {
    const map = leads.reduce<Record<string, { name: string; total: number; hot: number; queue: number }>>((acc, l) => {
      const key = l.campaign?.id || l.campaignId || 'sem-campanha';
      acc[key] ||= { name: l.campaign?.name || 'Sem campanha', total: 0, hot: 0, queue: 0 };
      acc[key].total += 1;
      if (['INTERESSADO', 'MATRICULADO'].includes(l.status)) acc[key].hot += 1;
      if (['NOVO', 'EM_FILA'].includes(l.status)) acc[key].queue += 1;
      return acc;
    }, {});
    return Object.values(map).sort((a, b) => b.total - a.total).slice(0, 5);
  }, [leads]);

  return (
    <section className="growthCenter">
      <div className="growthHero">
        <div>
          <small>Central IA operacional</small>
          <h2>Controle executivo com dados reais da operação</h2>
          <p>Leads, chamadas, retornos e importações agora alimentam esta visão para orientar prioridade, risco e próximos passos.</p>
        </div>
        <div className="growthScore"><Gauge size={28}/><strong>{loading ? '...' : `${score}%`}</strong><span>maturidade operacional</span></div>
      </div>

      <div className="modeSwitch">
        <button className={mode === 'preview' ? 'active' : ''} onClick={() => setMode('preview')}><PhoneCall size={17}/>Preview Dialer</button>
        <button className={mode === 'power' ? 'active' : ''} onClick={() => setMode('power')}><Zap size={17}/>Power Dialer</button>
        <button className={mode === 'assistido' ? 'active' : ''} onClick={() => setMode('assistido')}><Brain size={17}/>IA assistida</button>
        <button className="ghostBtn" onClick={load}><RefreshCw size={17}/>{loading ? 'Atualizando...' : 'Atualizar dados'}</button>
      </div>

      <Notice msg={msg} />

      <div className="growthKpis">
        <div><small>Leads em fila</small><b>{metrics.queue}</b><span>prontos para operador</span></div>
        <div><small>Chamadas hoje</small><b>{metrics.callsToday}</b><span>tentativas registradas</span></div>
        <div><small>Retornos hoje</small><b>{metrics.todayReturns}</b><span>{metrics.overdueReturns} atrasado(s)</span></div>
        <div><small>Conversão</small><b>{metrics.conversion}</b><span>matrículas / leads</span></div>
      </div>

      <div className="growthGrid">
        <div className="growthPanel wide">
          <h3><Activity size={20}/>Wallboard real da operação</h3>
          <div className="operatorWall">
            <div className="operatorRow"><b>Total de leads</b><span>{leads.length}</span><em className="ok">Base</em><strong>{metrics.totalImported} importados</strong><span>{metrics.rejected} rejeições</span><small>via planilhas</small></div>
            <div className="operatorRow"><b>Oportunidades</b><span>{metrics.interested} interessados</span><em className="ok">Quente</em><strong>{metrics.enrolled} matrículas</strong><span>{metrics.conversion}</span><small>conversão</small></div>
            <div className="operatorRow"><b>Follow-up</b><span>{metrics.noAnswer} sem contato</span><em className={metrics.overdueReturns ? 'bad' : 'ok'}>{metrics.overdueReturns ? 'Ação' : 'OK'}</em><strong>{metrics.todayReturns} hoje</strong><span>{metrics.overdueReturns} atrasados</span><small>retornos</small></div>
          </div>
        </div>

        <div className="growthPanel">
          <h3><Target size={20}/>Status da base</h3>
          <div className="aiRoadmap">
            {statusRows.map(([status, total]) => <span key={status}><StatusBadge status={status} /> {total}</span>)}
            {!statusRows.length && <span>Nenhum lead carregado</span>}
          </div>
        </div>

        <div className="growthPanel accentGrowth">
          <h3><Users size={20}/>Campanhas com maior volume</h3>
          <div className="playbookList">
            {campaignRows.map((c) => <article key={c.name}><div><b>{c.name}</b><span>{c.total} leads • {c.queue} em fila</span></div><strong>{pct(c.hot, c.total)} quente</strong></article>)}
            {!campaignRows.length && <p className="growthText">Crie campanha e importe leads para alimentar o ranking.</p>}
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
            <span><MessageSquare size={16}/>WhatsApp por desfecho</span>
            <span><Target size={16}/>Score de conversão</span>
            <span><ShieldCheck size={16}/>Auditoria LGPD</span>
            <span><CalendarClock size={16}/>Retorno inteligente</span>
            <span><Megaphone size={16}/>Omnichannel</span>
          </div>
        </div>

        <div className="growthPanel wide">
          <h3><Rocket size={20}/>Fila de implantação recomendada</h3>
          <div className="automationTimeline">
            {automations.map((a, i) => <div key={a}><span>{i + 1}</span><p>{a}</p><button>{i < 2 ? 'Próximo sprint' : 'Backlog'}</button></div>)}
          </div>
        </div>
      </div>
    </section>
  );
}
