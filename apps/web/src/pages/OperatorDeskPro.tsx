import React, { useEffect, useMemo, useState } from 'react';
import { CalendarClock, CheckCircle2, ClipboardList, Copy, MessageSquare, PhoneCall, RefreshCw, Save, ShieldBan, SkipForward, Sparkles, Target, Zap } from 'lucide-react';
import { api } from '../services/api';
import SipSoftphone from '../SipSoftphone';
import Notice, { type NoticeMessage } from '../components/Notice';
import StatusBadge from '../components/StatusBadge';
import '../crm-polish.css';
import '../operator-layout-fixes.css';

const dispositions = ['ATENDIDO', 'NAO_ATENDEU', 'INTERESSADO', 'SEM_INTERESSE', 'MATRICULADO', 'RETORNO', 'OCUPADO', 'CAIXA_POSTAL', 'NUMERO_INVALIDO', 'NAO_LIGAR_NOVAMENTE'];

function fmt(v: any) {
  if (v === null || v === undefined || v === '') return '—';
  if (typeof v === 'number') return v.toLocaleString('pt-BR');
  return String(v).replaceAll('_', ' ');
}

function whatsappFor(lead: any, disposition?: string) {
  const nome = lead?.name || 'tudo bem';
  const curso = lead?.course ? ` no curso de ${lead.course}` : '';
  if (disposition === 'INTERESSADO') return `Olá, ${nome}. Conforme conversamos, vou te ajudar com o próximo passo da sua inscrição${curso}.`;
  if (disposition === 'NAO_ATENDEU') return `Olá, ${nome}. Tentei contato sobre sua inscrição${curso}. Qual o melhor horário para falarmos?`;
  if (disposition === 'RETORNO') return `Olá, ${nome}. Conforme combinado, retorno no horário combinado para falarmos da sua inscrição${curso}.`;
  return `Olá, ${nome}. Estou entrando em contato sobre sua inscrição${curso}.`;
}

export default function OperatorDeskPro({ openPhone }: { openPhone: () => void }) {
  const [queue, setQueue] = useState<any[]>([]);
  const [lead, setLead] = useState<any | null>(null);
  const [call, setCall] = useState<any | null>(null);
  const [notes, setNotes] = useState('');
  const [lastDisposition, setLastDisposition] = useState('');
  const [msg, setMsg] = useState<NoticeMessage>(null);
  const [loading, setLoading] = useState(false);

  async function load() {
    try {
      setLoading(true);
      const rows = await api('/leads?status=EM_FILA');
      setQueue(rows || []);
      setLead((current: any) => current && rows?.some((x: any) => x.id === current.id) ? current : rows?.[0] || null);
    } catch (e: any) {
      setMsg({ type: 'err', text: e.message });
    } finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);
  useEffect(() => { setNotes(lead?.notes || ''); setCall(null); }, [lead?.id]);

  const score = useMemo(() => Math.min(97, 54 + Number(lead?.attemptsCount || 0) * 5 + (lead?.course ? 14 : 0) + (lead?.origin ? 8 : 0)), [lead]);
  const noteQuality = notes.trim().length >= 30 ? 'Completa' : notes.trim().length >= 12 ? 'Ok' : 'Fraca';

  async function start() {
    if (!lead) return;
    try {
      const started = await api('/calls/start', { method: 'POST', body: JSON.stringify({ leadId: lead.id }) });
      setCall(started);
      setMsg({ type: 'ok', text: 'Atendimento aberto. Ligue pelo softphone, registre a observação e finalize com desfecho.' });
    } catch (e: any) { setMsg({ type: 'err', text: e.message }); }
  }

  async function saveNotes() {
    if (!lead) return;
    try {
      const updated = await api(`/leads/${lead.id}`, { method: 'PATCH', body: JSON.stringify({ notes }) });
      setLead(updated);
      setQueue((items) => items.map((x) => x.id === updated.id ? { ...x, notes: updated.notes } : x));
      setMsg({ type: 'ok', text: 'Observação salva.' });
    } catch (e: any) { setMsg({ type: 'err', text: e.message }); }
  }

  function nextLead() {
    if (!lead) return;
    const index = queue.findIndex((x) => x.id === lead.id);
    const next = queue[index + 1] || queue[0] || null;
    setLead(next?.id === lead.id ? null : next);
  }

  async function finish(disposition: string) {
    if (!lead) return;
    if (!call) { setMsg({ type: 'info', text: 'Abra o atendimento antes de salvar o desfecho.' }); return; }
    try {
      await api(`/calls/${call.id}/finish`, { method: 'POST', body: JSON.stringify({ finalDisposition: disposition, notes, doNotCall: disposition === 'NAO_LIGAR_NOVAMENTE' }) });
      setLastDisposition(disposition);
      setMsg({ type: 'ok', text: `Desfecho salvo: ${disposition.replaceAll('_', ' ')}.` });
      setCall(null); setNotes('');
      const remaining = queue.filter((x) => x.id !== lead.id);
      setQueue(remaining);
      setLead(remaining[0] || null);
    } catch (e: any) { setMsg({ type: 'err', text: e.message }); }
  }

  function copyPhone() {
    if (!lead?.phoneNormalized) return;
    navigator.clipboard.writeText(lead.phoneNormalized);
    setMsg({ type: 'ok', text: 'Telefone copiado.' });
  }

  function copyWhatsApp() {
    if (!lead) return;
    navigator.clipboard.writeText(whatsappFor(lead, lastDisposition));
    setMsg({ type: 'ok', text: 'Mensagem de WhatsApp copiada.' });
  }

  return <section className="operatorCockpit operatorPro operatorPolish">
    <div className="cockpitMain">
      <div className="operatorHero operatorHeroPolish">
        <div><small>Mesa do operador</small><h2>Cockpit de atendimento com foco no próximo passo</h2><p>Lead, telefone, roteiro, observação e desfecho em uma tela mais limpa para reduzir clique e erro operacional.</p></div>
        <div className="heroStack"><button onClick={openPhone}><PhoneCall size={18} />Telefone completo</button><button className="ghostBtn" onClick={load}><RefreshCw size={17} />Atualizar fila</button></div>
      </div>

      <div className="liveMetrics operatorMetrics"><div><small>Fila</small><b>{queue.length}</b><span>{loading ? 'atualizando' : 'leads em espera'}</span></div><div><small>Prioridade</small><b>{lead ? `${score}%` : '—'}</b><span>score estimado</span></div><div><small>Atendimento</small><b>{call ? 'Aberto' : 'Livre'}</b><span>{call ? 'salve desfecho' : 'pronto para iniciar'}</span></div><div><small>Obs.</small><b>{lead ? noteQuality : '—'}</b><span>qualidade do registro</span></div></div>
      <Notice msg={msg} />

      {lead ? <div className="leadWorkspace proWorkspace operatorLeadCard">
        <div className="leadProfile leadProfilePolish"><div className="leadAvatar">{String(lead.name || 'L').slice(0, 2).toUpperCase()}</div><div><small>Lead atual</small><h2>{lead.name || 'Sem nome'}</h2><p>{lead.phoneNormalized || 'Telefone não informado'}</p><span>{lead.course || 'Curso não informado'} • {lead.origin || 'Origem não informada'}</span></div></div>
        <div className="leadFacts"><StatusBadge status={lead.status} /><span><Target size={15} />Tentativas: {fmt(lead.attemptsCount)}</span><span><Zap size={15} />Ação sugerida: ligar agora</span><span><CalendarClock size={15} />Retorno: {lead.callbackAt ? fmt(lead.callbackAt) : 'não agendado'}</span></div>
        <div className="operatorActionBar stickyActions"><button className="callBtn" onClick={start}><PhoneCall size={18} />Abrir atendimento</button><button className="ghostBtn" onClick={copyPhone}><Copy size={16} />Copiar telefone</button><button className="ghostBtn" onClick={copyWhatsApp}><MessageSquare size={16} />Copiar WhatsApp</button><button className="ghostBtn" onClick={nextLead}><SkipForward size={16} />Pular lead</button></div>
        <div className="operatorTwoCols">
          <label className="widePanel">Observação do atendimento<textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Registre objeções, interesse, horário de retorno e próximos passos." /></label>
          <div className="scriptBox operatorScript"><b><Sparkles size={15} />Script rápido</b><span>Confirme curso, modalidade e melhor horário.</span><span>Registre objeção principal antes do desfecho.</span><span>Se o aluno pedir retorno, informe data e horário.</span></div>
        </div>
        <div className="operatorActionBar"><button onClick={saveNotes}><Save size={16} />Salvar observação</button><button className="dangerBtn" onClick={() => finish('NAO_LIGAR_NOVAMENTE')} disabled={!call}><ShieldBan size={16} />Não ligar</button></div>
        <div className="dispositionBoard">{dispositions.filter((s) => s !== 'NAO_LIGAR_NOVAMENTE').map((s) => <button key={s} disabled={!call} onClick={() => finish(s)}>{s.replaceAll('_', ' ')}</button>)}</div>
      </div> : <div className="leadWorkspace"><div className="empty"><ClipboardList size={36} /><strong>Fila vazia</strong><span>Importe leads ou atualize a fila.</span><button onClick={load}><RefreshCw size={16} />Atualizar fila</button></div></div>}

      <div className="aiPanel assistPolish"><h3><Sparkles size={20} />ReferencIA Assist</h3><div className="aiCards"><div><small>Script curto</small><p>Confirme nome, curso, modalidade e melhor horário. Evite perder contexto: salve a observação antes de finalizar.</p></div><div><small>Objeções comuns</small><p>Preço, horário, deslocamento e dúvida sobre modalidade.</p></div><div><small>Próxima ação</small><p>{lead ? 'Abrir atendimento, ligar, registrar observação e escolher desfecho.' : 'Atualizar fila ou importar nova base.'}</p></div></div></div>
    </div>

    <aside className="cockpitSide"><div className="operatorSoftphone softphonePolish"><SipSoftphone /></div><div className="panel queuePanel queuePolish"><h3><ClipboardList size={19} />Próximos da fila</h3>{queue.slice(0, 12).map((item, i) => <button className={`queueItem ${lead?.id === item.id ? 'active' : ''}`} key={item.id || i} onClick={() => setLead(item)}><b>{i + 1}. {item.name || 'Sem nome'}</b><span>{item.phoneNormalized}</span></button>)}{!queue.length && <p className="muted">Nenhum lead em fila.</p>}</div></aside>
  </section>;
}
