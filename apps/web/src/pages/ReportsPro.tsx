import React, { useEffect, useMemo, useState } from 'react';
import { BarChart3, Download, FileDown, RefreshCw, Search, TrendingUp, Users } from 'lucide-react';
import { api } from '../services/api';
import Notice, { type NoticeMessage } from '../components/Notice';
import StatusBadge from '../components/StatusBadge';
import '../ops-pages.css';

function fmt(v: any) {
  if (v === null || v === undefined || v === '') return '—';
  if (typeof v === 'number') return v.toLocaleString('pt-BR', { maximumFractionDigits: 2 });
  if (String(v).includes('T')) return String(v).replace('T', ' ').slice(0, 16);
  return String(v).replaceAll('_', ' ');
}

function pct(a: number, b: number) {
  if (!b) return '0%';
  return `${((a / b) * 100).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`;
}

function downloadCsv(name: string, rows: any[]) {
  const headers = ['campanha', 'operador', 'lead', 'telefone', 'status_chamada', 'desfecho', 'status_lead', 'data'];
  const csv = [headers.join(';'), ...rows.map((r) => [
    r.campaign?.name,
    r.operator?.name,
    r.lead?.name,
    r.lead?.phoneNormalized,
    r.status,
    r.finalDisposition,
    r.lead?.status,
    r.createdAt,
  ].map((v) => `"${String(v ?? '').replaceAll('"', '""')}"`).join(';'))].join('\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  a.download = name;
  a.click();
}

function groupCount(rows: any[], getter: (row: any) => string) {
  return Object.entries(rows.reduce<Record<string, number>>((acc, row) => {
    const key = getter(row) || 'Sem informação';
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {})).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);
}

export default function ReportsPro() {
  const [calls, setCalls] = useState<any[]>([]);
  const [leads, setLeads] = useState<any[]>([]);
  const [campaign, setCampaign] = useState('');
  const [operator, setOperator] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<NoticeMessage>(null);

  async function load() {
    try {
      setLoading(true);
      const [callsRows, leadsRows] = await Promise.all([api('/reports/calls'), api('/leads')]);
      setCalls(callsRows || []);
      setLeads(leadsRows || []);
    } catch (e: any) {
      setMsg({ type: 'err', text: e.message || 'Não foi possível carregar relatórios.' });
    } finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  const filteredCalls = useMemo(() => calls.filter((row) => {
    const okCampaign = !campaign || row.campaign?.name === campaign;
    const okOperator = !operator || row.operator?.name === operator;
    const okStatus = !status || row.finalDisposition === status || row.status === status || row.lead?.status === status;
    return okCampaign && okOperator && okStatus;
  }), [calls, campaign, operator, status]);

  const campaigns = useMemo(() => Array.from(new Set(calls.map((c) => c.campaign?.name).filter(Boolean))).sort(), [calls]);
  const operators = useMemo(() => Array.from(new Set(calls.map((c) => c.operator?.name).filter(Boolean))).sort(), [calls]);
  const statuses = useMemo(() => Array.from(new Set(calls.flatMap((c) => [c.status, c.finalDisposition, c.lead?.status]).filter(Boolean))).sort(), [calls]);
  const matriculas = leads.filter((l) => l.status === 'MATRICULADO').length;
  const interessados = leads.filter((l) => l.status === 'INTERESSADO').length;
  const atendidos = leads.filter((l) => ['ATENDIDO', 'INTERESSADO', 'MATRICULADO'].includes(l.status)).length;
  const campaignRank = groupCount(filteredCalls, (r) => r.campaign?.name).slice(0, 8);
  const operatorRank = groupCount(filteredCalls, (r) => r.operator?.name).slice(0, 8);
  const dispositionRank = groupCount(filteredCalls, (r) => r.finalDisposition || r.status).slice(0, 8);

  return <section className="reportsPro">
    <div className="heroPanel heroPremium">
      <div>
        <small>Relatórios executivos</small>
        <h2>Resultado por campanha, operador e desfecho</h2>
        <p>Uma visão mais prática para gestão: produtividade, conversão, qualidade da fila e exportação dos atendimentos.</p>
      </div>
      <div className="heroActions"><button className="ghostBtn" onClick={load}><RefreshCw size={17} />Atualizar</button><button onClick={() => downloadCsv('relatorio-atendimentos-referencia.csv', filteredCalls)}><Download size={17} />Exportar CSV</button></div>
    </div>

    <Notice msg={msg} />

    <div className="kpiGrid compactKpis">
      <div className="kpi"><small>Leads totais</small><strong>{fmt(leads.length)}</strong><span>base disponível</span></div>
      <div className="kpi"><small>Chamadas</small><strong>{fmt(filteredCalls.length)}</strong><span>no filtro atual</span></div>
      <div className="kpi"><small>Atendimento</small><strong>{pct(atendidos, leads.length)}</strong><span>atendidos / leads</span></div>
      <div className="kpi"><small>Conversão</small><strong>{pct(matriculas, leads.length)}</strong><span>{fmt(matriculas)} matrículas</span></div>
    </div>

    <div className="panel">
      <div className="panelHeader"><h3><Search size={20} />Filtros de gestão</h3><button className="ghostBtn" onClick={() => { setCampaign(''); setOperator(''); setStatus(''); }}>Limpar filtros</button></div>
      <div className="filters reportFilters">
        <label>Campanha<select value={campaign} onChange={(e) => setCampaign(e.target.value)}><option value="">Todas</option>{campaigns.map((x) => <option key={x}>{x}</option>)}</select></label>
        <label>Operador<select value={operator} onChange={(e) => setOperator(e.target.value)}><option value="">Todos</option>{operators.map((x) => <option key={x}>{x}</option>)}</select></label>
        <label>Status/desfecho<select value={status} onChange={(e) => setStatus(e.target.value)}><option value="">Todos</option>{statuses.map((x) => <option key={x}>{x}</option>)}</select></label>
        <button onClick={load}><RefreshCw size={16} />Buscar</button>
      </div>
    </div>

    <div className="reportGrid">
      <div className="panel"><h3><BarChart3 size={20} />Campanhas com mais chamadas</h3><div className="rankingList">{campaignRank.map((r) => <div key={r.name}><span>{r.name}</span><b>{fmt(r.count)}</b></div>)}{!campaignRank.length && <p className="muted">Sem dados no filtro.</p>}</div></div>
      <div className="panel"><h3><Users size={20} />Operadores</h3><div className="rankingList">{operatorRank.map((r) => <div key={r.name}><span>{r.name}</span><b>{fmt(r.count)}</b></div>)}{!operatorRank.length && <p className="muted">Sem dados no filtro.</p>}</div></div>
      <div className="panel"><h3><TrendingUp size={20} />Desfechos</h3><div className="rankingList">{dispositionRank.map((r) => <div key={r.name}><span>{fmt(r.name)}</span><b>{fmt(r.count)}</b></div>)}{!dispositionRank.length && <p className="muted">Sem dados no filtro.</p>}</div></div>
      <div className="panel accent"><h3><FileDown size={20} />Resumo comercial</h3><div className="miniGuide"><span>Interessados: <b>{fmt(interessados)}</b></span><span>Matrículas: <b>{fmt(matriculas)}</b></span><span>Taxa matrícula/interessado: <b>{pct(matriculas, interessados)}</b></span><span>Use exportação CSV para enviar à gestão.</span></div></div>
    </div>

    <div className="panel mt">
      <div className="panelHeader"><h3>Últimos atendimentos</h3><span className="muted">{loading ? 'Carregando...' : `${filteredCalls.length} registros`}</span></div>
      <div className="tableWrap"><table><thead><tr><th>Campanha</th><th>Operador</th><th>Lead</th><th>Telefone</th><th>Status</th><th>Desfecho</th><th>Data</th></tr></thead><tbody>{filteredCalls.slice(0, 200).map((row) => <tr key={row.id}><td>{fmt(row.campaign?.name)}</td><td>{fmt(row.operator?.name)}</td><td>{fmt(row.lead?.name)}</td><td>{fmt(row.lead?.phoneNormalized)}</td><td><StatusBadge status={row.status} /></td><td>{fmt(row.finalDisposition)}</td><td>{fmt(row.createdAt)}</td></tr>)}</tbody></table>{!filteredCalls.length && <div className="empty"><BarChart3 size={34} /><strong>Nenhum atendimento encontrado</strong><span>Faça chamadas ou ajuste os filtros.</span></div>}</div>
    </div>
  </section>;
}
