import React, { useEffect, useMemo, useState } from 'react';
import { CalendarClock, ClipboardList, Copy, MessageSquare, PhoneCall, RefreshCw, Save, ShieldBan, SkipForward, Sparkles, Target, Zap } from 'lucide-react';
import { api } from '../services/api';
import SipSoftphone from '../SipSoftphone';
import Notice, { type NoticeMessage } from '../components/Notice';
import StatusBadge from '../components/StatusBadge';
import { formatDateTime, formatNumber, formatStatus } from '../utils/format';
import '../crm-polish.css';
import '../operator-layout-fixes.css';

const dispositions = ['ATENDIDO', 'NAO_ATENDEU', 'INTERESSADO', 'SEM_INTERESSE', 'MATRICULADO', 'RETORNO', 'OCUPADO', 'CAIXA_POSTAL', 'NUMERO_INVALIDO'] as const;
type Disposition = typeof dispositions[number] | 'NAO_LIGAR_NOVAMENTE';

type CampaignSummary = {
  id?: string;
  name?: string;
  status?: string;
  allowedCallStart?: string;
  allowedCallEnd?: string;
  maxAttemptsPerLead?: number;
  minIntervalMinutes?: number;
};

type OperatorLead = {
  id: string;
  name?: string;
  phoneNormalized?: string;
  course?: string;
  origin?: string;
  status?: string;
  notes?: string;
  attemptsCount?: number;
  callbackAt?: string | null;
  campaign?: CampaignSummary;
};

type CallAttempt = { id: string; status?: string; startedAt?: string };

function whatsappFor(lead: OperatorLead, disposition?: string) {
  const nome = lead.name || 'tudo bem';
  const curso = lead.course ? ` no curso de ${lead.course}` : '';
  if (disposition === 'INTERESSADO') return `Olá, ${nome}. Conforme conversamos, vou te ajudar com o próximo passo da sua inscrição${curso}.`;
  if (disposition === 'NAO_ATENDEU') return `Olá, ${nome}. Tentei contato sobre sua inscrição${curso}. Qual o melhor horário para falarmos?`;
  if (disposition === 'RETORNO') return `Olá, ${nome}. Conforme combinado, retorno no horário marcado para falarmos da sua inscrição${curso}.`;
  return `Olá, ${nome}. Estou entrando em contato sobre sua inscrição${curso}.`;
}

function errorText(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export default function OperatorDeskPro({ openPhone }: { openPhone: () => void }) {
  const [queue, setQueue] = useState<OperatorLead[]>([]);
  const [lead, setLead] = useState<OperatorLead | null>(null);
  const [call, setCall] = useState<CallAttempt | null>(null);
  const [notes, setNotes] = useState('');
  const [callbackAt, setCallbackAt] = useState('');
  const [lastDisposition, setLastDisposition] = useState('');
  const [msg, setMsg] = useState<NoticeMessage>(null);
  const [loading, setLoading] = useState(false);
  const [starting, setStarting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [finishing, setFinishing] = useState(false);

  async function load() {
    if (loading) return;
    try {
      setLoading(true);
      const response = await api('/leads/paged?status=EM_FILA&page=1&pageSize=100');
      const rows: OperatorLead[] = Array.isArray(response) ? response : Array.isArray(response?.items) ? response.items : [];
      setQueue(rows);
      setLead((current) => current && rows.some((item) => item.id === current.id) ? current : rows[0] || null);
    } catch (error: unknown) {
      setMsg({ type: 'err', text: errorText(error, 'Não foi possível atualizar a fila.') });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);
  useEffect(() => {
    setNotes(lead?.notes || '');
    setCallbackAt(lead?.callbackAt ? String(lead.callbackAt).slice(0, 16) : '');
    setCall(null);
  }, [lead?.id]);

  const score = useMemo(() => Math.min(97, 54 + Number(lead?.attemptsCount || 0) * 5 + (lead?.course ? 14 : 0) + (lead?.origin ? 8 : 0)), [lead]);
  const noteQuality = notes.trim().length >= 30 ? 'Completa' : notes.trim().length >= 12 ? 'Ok' : 'Fraca';

  async function start() {
    if (!lead || starting || call) return;
    try {
      setStarting(true);
      const started = await api('/calls/start', { method: 'POST', body: JSON.stringify({ leadId: lead.id }) });
      setCall(started);
      setMsg({ type: 'ok', text: 'Atendimento aberto. Faça a ligação, registre a observação e finalize com o desfecho.' });
    } catch (error: unknown) {
      setMsg({ type: 'err', text: errorText(error, 'Não foi possível abrir o atendimento.') });
    } finally {
      setStarting(false);
    }
  }

  async function saveNotes() {
    if (!lead || saving) return;
    try {
      setSaving(true);
      const updated: OperatorLead = await api(`/leads/${lead.id}`, { method: 'PATCH', body: JSON.stringify({ notes }) });
      setLead(updated);
      setQueue((items) => items.map((item) => item.id === updated.id ? { ...item, notes: updated.notes } : item));
      setMsg({ type: 'ok', text: 'Observação salva.' });
    } catch (error: unknown) {
      setMsg({ type: 'err', text: errorText(error, 'Não foi possível salvar a observação.') });
    } finally {
      setSaving(false);
    }
  }

  function nextLead() {
    if (!lead || call || finishing) {
      if (call) setMsg({ type: 'info', text: 'Finalize o atendimento aberto antes de trocar de lead.' });
      return;
    }
    const index = queue.findIndex((item) => item.id === lead.id);
    const next = queue[index + 1] || queue[0] || null;
    setLead(next?.id === lead.id ? null : next);
  }

  async function finish(disposition: Disposition) {
    if (!lead || finishing) return;
    if (!call) {
      setMsg({ type: 'info', text: 'Abra o atendimento antes de salvar o desfecho.' });
      return;
    }
    if (disposition === 'RETORNO' && !callbackAt) {
      setMsg({ type: 'err', text: 'Informe a data e o horário do retorno antes de finalizar.' });
      return;
    }
    if (disposition === 'NAO_LIGAR_NOVAMENTE') {
      const confirmed = window.confirm('Este telefone será bloqueado para novas ligações em todo o sistema. Deseja continuar?');
      if (!confirmed) return;
    }

    try {
      setFinishing(true);
      await api(`/calls/${call.id}/finish`, {
        method: 'POST',
        body: JSON.stringify({
          finalDisposition: disposition,
          notes,
          callbackAt: disposition === 'RETORNO' && callbackAt ? new Date(callbackAt).toISOString() : undefined,
          doNotCall: disposition === 'NAO_LIGAR_NOVAMENTE',
        }),
      });
      setLastDisposition(disposition);
      setMsg({ type: 'ok', text: `Desfecho salvo: ${formatStatus(disposition)}.` });
      setCall(null);
      setNotes('');
      setCallbackAt('');
      const remaining = queue.filter((item) => item.id !== lead.id);
      setQueue(remaining);
      setLead(remaining[0] || null);
    } catch (error: unknown) {
      setMsg({ type: 'err', text: errorText(error, 'Não foi possível finalizar o atendimento.') });
    } finally {
      setFinishing(false);
    }
  }

  async function copyText(text: string, success: string) {
    try {
      await navigator.clipboard.writeText(text);
      setMsg({ type: 'ok', text: success });
    } catch {
      setMsg({ type: 'err', text: 'Não foi possível copiar o conteúdo.' });
    }
  }

  return <section className="operatorCockpit operatorPro operatorPolish">
    <div className="cockpitMain">
      <div className="operatorHero operatorHeroPolish">
        <div><small>Mesa do operador</small><h2>Cockpit de atendimento com foco no próximo passo</h2><p>Lead, telefone, roteiro, observação e desfecho em uma tela mais limpa para reduzir clique e erro operacional.</p></div>
        <div className="heroStack"><button onClick={openPhone}><PhoneCall size={18} />Telefone completo</button><button className="ghostBtn" onClick={() => void load()} disabled={loading}><RefreshCw size={17} />{loading ? 'Atualizando...' : 'Atualizar fila'}</button></div>
      </div>

      <div className="liveMetrics operatorMetrics"><div><small>Fila</small><b>{queue.length}</b><span>{loading ? 'atualizando' : 'leads em espera'}</span></div><div><small>Prioridade</small><b>{lead ? `${score}%` : '—'}</b><span>score estimado</span></div><div><small>Atendimento</small><b>{call ? 'Aberto' : 'Livre'}</b><span>{call ? 'salve o desfecho' : 'pronto para iniciar'}</span></div><div><small>Obs.</small><b>{lead ? noteQuality : '—'}</b><span>qualidade do registro</span></div></div>
      <Notice msg={msg} />

      {lead ? <div className="leadWorkspace proWorkspace operatorLeadCard">
        <div className="leadProfile leadProfilePolish"><div className="leadAvatar">{String(lead.name || 'L').slice(0, 2).toUpperCase()}</div><div><small>Lead atual</small><h2>{lead.name || 'Sem nome'}</h2><p>{lead.phoneNormalized || 'Telefone não informado'}</p><span>{lead.course || 'Curso não informado'} • {lead.origin || 'Origem não informada'}</span></div></div>
        <div className="leadFacts"><StatusBadge status={lead.status} /><span><Target size={15} />Tentativas: {formatNumber(lead.attemptsCount || 0, 0)}</span><span><Zap size={15} />Campanha: {lead.campaign?.name || 'não informada'}</span><span><CalendarClock size={15} />Retorno: {lead.callbackAt ? formatDateTime(lead.callbackAt) : 'não agendado'}</span></div>
        {lead.campaign && <div className="campaignRulesStrip"><span>Horário: {lead.campaign.allowedCallStart || '—'}–{lead.campaign.allowedCallEnd || '—'}</span><span>Máx. tentativas: {lead.campaign.maxAttemptsPerLead ?? '—'}</span><span>Intervalo: {lead.campaign.minIntervalMinutes ?? '—'} min</span><StatusBadge status={lead.campaign.status} /></div>}
        <div className="operatorActionBar stickyActions"><button className="callBtn" onClick={() => void start()} disabled={starting || Boolean(call)}><PhoneCall size={18} />{starting ? 'Abrindo...' : call ? 'Atendimento aberto' : 'Abrir atendimento'}</button><button className="ghostBtn" onClick={() => lead.phoneNormalized && void copyText(lead.phoneNormalized, 'Telefone copiado.')} disabled={!lead.phoneNormalized}><Copy size={16} />Copiar telefone</button><button className="ghostBtn" onClick={() => void copyText(whatsappFor(lead, lastDisposition), 'Mensagem de WhatsApp copiada.')}><MessageSquare size={16} />Copiar WhatsApp</button><button className="ghostBtn" onClick={nextLead} disabled={Boolean(call) || finishing}><SkipForward size={16} />Pular lead</button></div>
        <div className="operatorTwoCols">
          <label className="widePanel">Observação do atendimento<textarea value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Registre objeções, interesse, horário de retorno e próximos passos." /></label>
          <div className="scriptBox operatorScript"><b><Sparkles size={15} />Script rápido</b><span>Confirme curso, modalidade e melhor horário.</span><span>Registre a objeção principal antes do desfecho.</span><span>Para retorno, informe obrigatoriamente data e horário.</span></div>
        </div>
        <div className="callbackPanel"><label>Data e horário do retorno<input type="datetime-local" value={callbackAt} min={new Date().toISOString().slice(0, 16)} onChange={(event) => setCallbackAt(event.target.value)} /></label><span>Este campo é obrigatório apenas quando o desfecho escolhido for Retorno.</span></div>
        <div className="operatorActionBar"><button onClick={() => void saveNotes()} disabled={saving}><Save size={16} />{saving ? 'Salvando...' : 'Salvar observação'}</button><button className="dangerBtn" onClick={() => void finish('NAO_LIGAR_NOVAMENTE')} disabled={!call || finishing}><ShieldBan size={16} />{finishing ? 'Processando...' : 'Não ligar'}</button></div>
        <div className="dispositionBoard">{dispositions.map((disposition) => <button key={disposition} disabled={!call || finishing} onClick={() => void finish(disposition)}>{formatStatus(disposition)}</button>)}</div>
      </div> : <div className="leadWorkspace"><div className="empty"><ClipboardList size={36} /><strong>Fila vazia</strong><span>Importe leads ou atualize a fila.</span><button onClick={() => void load()} disabled={loading}><RefreshCw size={16} />{loading ? 'Atualizando...' : 'Atualizar fila'}</button></div></div>}

      <div className="aiPanel assistPolish"><h3><Sparkles size={20} />ReferencIA Assist</h3><div className="aiCards"><div><small>Script curto</small><p>Confirme nome, curso, modalidade e melhor horário. Salve a observação antes de finalizar.</p></div><div><small>Regras da chamada</small><p>O sistema valida campanha ativa, horário, limite de tentativas, intervalo e bloqueio de contato.</p></div><div><small>Próxima ação</small><p>{lead ? 'Abra o atendimento, ligue, registre a observação e escolha o desfecho.' : 'Atualize a fila ou importe uma nova base.'}</p></div></div></div>
    </div>

    <aside className="cockpitSide"><div className="operatorSoftphone softphonePolish"><SipSoftphone /></div><div className="panel queuePanel queuePolish"><h3><ClipboardList size={19} />Próximos da fila</h3>{queue.slice(0, 12).map((item, index) => <button className={`queueItem ${lead?.id === item.id ? 'active' : ''}`} key={item.id} onClick={() => !call && setLead(item)} disabled={Boolean(call)}><b>{index + 1}. {item.name || 'Sem nome'}</b><span>{item.phoneNormalized || 'Sem telefone'}</span></button>)}{!queue.length && <p className="muted">Nenhum lead em fila.</p>}</div></aside>
  </section>;
}
