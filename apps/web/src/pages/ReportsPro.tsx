import React, { useEffect, useMemo, useState } from 'react';
import { Activity, BarChart3, Download, PieChart, RefreshCw, Search, Target, Users } from 'lucide-react';
import { api } from '../services/api';
import Notice, { type NoticeMessage } from '../components/Notice';
import StatusBadge from '../components/StatusBadge';
import { useAsyncAction } from '../hooks/useAsyncAction';
import { exportCsv } from '../utils/exportCsv';
import { formatDateTime, formatNumber, formatPercent, formatStatus } from '../utils/format';
import '../ops-pages.css';
import '../crm-polish.css';

type EntitySummary = { id?: string; name?: string };
type LeadSummary = { id?: string; name?: string; phoneNormalized?: string; status?: string; campaign?: EntitySummary };
type ReportCall = {
  id: string;
  status?: string;
  finalDisposition?: string;
  createdAt?: string;
  campaign?: EntitySummary;
  operator?: EntitySummary;
  lead?: LeadSummary;
};

type LeadRow = { id?: string; status?: string; campaign?: EntitySummary; createdAt?: string };
type RankRow = { name: string; count: number };

function groupCount(rows: ReportCall[], getter: (row: ReportCall) => string | undefined): RankRow[] {
  const grouped = rows.reduce<Record<string, number>>((acc, row) => {
    const key = getter(row)?.trim() || 'Sem informação';
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
  return Object.entries(grouped).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);
}

function ProgressRow({ name, count, max }: { name: string; count: number; max: number }) {
  const width = max ? Math.max(6, Math.round((count / max) * 100)) : 0;
  return <div className="progressRow"><div><span title={name}>{formatStatus(name)}</span><b>{formatNumber(count)}</b></div><i style={{ width: `${width}%` }} /></div>;
}

function inDateRange(value: string | undefined, from: string, to: string) {
  if (!value || (!from && !to)) return true;
  const time = new Date(value).getTime();
  if (Number.isNaN(time)) return true;
  const min = from ? new Date(`${from}T00:00:00`).getTime() : Number.NEGATIVE_INFINITY;
  const max = to ? new Date(`${to}T23:59:59.999`).getTime() : Number.POSITIVE_INFINITY;
  return time >= min && time <= max;
}

export default function ReportsPro() {
  const [calls, setCalls] = useState<ReportCall[]>([]);
  const [leads, setLeads] = useState<LeadRow[]>([]);
  const [campaign, setCampaign] = useState('');
  const [operator, setOperator] = useState('');
  const [status, setStatus] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [msg, setMsg] = useState<NoticeMessage>(null);
  const { pending: loading, run } = useAsyncAction();

  async function load() {
    await run(async () => {
      try {
        const [callsRows, leadsRows] = await Promise.all([api('/reports/calls'), api('/leads')]);
        setCalls(Array.isArray(callsRows) ? callsRows : []);
        setLeads(Array.isArray(leadsRows) ? leadsRows : []);
        setPage(1);
      } catch (error: unknown) {
        const text = error instanceof Error ? error.message : 'Não foi possível carregar relatórios.';
        setMsg({ type: 'err', text });
      }
    });
  }

  useEffect(() => { void load(); }, []);

  const filteredCalls = useMemo(() => calls.filter((row) => {
    const okCampaign = !campaign || row.campaign?.name === campaign;
    const okOperator = !operator || row.operator?.name === operator;
    const okStatus = !status || row.finalDisposition === status || row.status === status || row.lead?.status === status;
    return okCampaign && okOperator && okStatus && inDateRange(row.createdAt, dateFrom, dateTo);
  }), [calls, campaign, operator, status, dateFrom, dateTo]);

  useEffect(() => { setPage(1); }, [campaign, operator, status, dateFrom, dateTo, pageSize]);

  const campaigns = useMemo(() => Array.from(new Set(calls.map((item) => item.campaign?.name).filter((value): value is string => Boolean(value)))).sort(), [calls]);
  const operators = useMemo(() => Array.from(new Set(calls.map((item) => item.operator?.name).filter((value): value is string => Boolean(value)))).sort(), [calls]);
  const statuses = useMemo(() => Array.from(new Set(calls.flatMap((item) => [item.status, item.finalDisposition, item.lead?.status]).filter((value): value is string => Boolean(value)))).sort(), [calls]);

  const visibleCampaigns = useMemo(() => new Set(filteredCalls.map((item) => item.campaign?.name).filter(Boolean)), [filteredCalls]);
  const filteredLeads = useMemo(() => leads.filter((lead) => {
    if (campaign && lead.campaign?.name && lead.campaign.name !== campaign) return false;
    if (campaign && !lead.campaign?.name && visibleCampaigns.size) return false;
    return inDateRange(lead.createdAt, dateFrom, dateTo);
  }), [leads, campaign, dateFrom, dateTo, visibleCampaigns]);

  const matriculas = filteredLeads.filter((lead) => lead.status === 'MATRICULADO').length;
  const interessados = filteredLeads.filter((lead) => lead.status === 'INTERESSADO').length;
  const atendidos = filteredLeads.filter((lead) => ['ATENDIDO', 'INTERESSADO', 'MATRICULADO'].includes(lead.status || '')).length;
  const campaignRank = groupCount(filteredCalls, (row) => row.campaign?.name).slice(0, 8);
  const operatorRank = groupCount(filteredCalls, (row) => row.operator?.name).slice(0, 8);
  const dispositionRank = groupCount(filteredCalls, (row) => row.finalDisposition || row.status).slice(0, 8);
  const maxCampaign = Math.max(...campaignRank.map((row) => row.count), 0);
  const maxOperator = Math.max(...operatorRank.map((row) => row.count), 0);
  const maxDisposition = Math.max(...dispositionRank.map((row) => row.count), 0);

  const totalPages = Math.max(1, Math.ceil(filteredCalls.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageRows = filteredCalls.slice((safePage - 1) * pageSize, safePage * pageSize);

  function clearFilters() {
    setCampaign(''); setOperator(''); setStatus(''); setDateFrom(''); setDateTo(''); setPage(1);
  }

  function download() {
    exportCsv('relatorio-atendimentos-referencia.csv', ['campanha', 'operador', 'lead', 'telefone', 'status_chamada', 'desfecho', 'status_lead', 'data'], filteredCalls.map((row) => [row.campaign?.name, row.operator?.name, row.lead?.name, row.lead?.phoneNormalized, row.status, row.finalDisposition, row.lead?.status, row.createdAt]));
  }

  return <section className="reportsPro polishPage">
    <div className="polishHero reportsHero"><div><small>Relatórios executivos</small><h2>Produtividade, conversão e desfechos em visão gerencial</h2><p>KPIs principais, rankings visuais e tabela de auditoria para gestão comercial acompanhar campanha, operador e qualidade do funil.</p></div><div className="heroStack"><button className="ghostBtn" onClick={() => void load()} disabled={loading}><RefreshCw size={17} />{loading ? 'Atualizando...' : 'Atualizar'}</button><button onClick={download} disabled={!filteredCalls.length}><Download size={17} />Exportar CSV</button></div></div>
    <Notice msg={msg} />
    <div className="polishKpis reportsKpis"><div><small>Leads no recorte</small><strong>{formatNumber(filteredLeads.length)}</strong><span>base considerada</span></div><div><small>Chamadas</small><strong>{formatNumber(filteredCalls.length)}</strong><span>no filtro atual</span></div><div><small>Atendimento</small><strong>{formatPercent(atendidos, filteredLeads.length)}</strong><span>atendidos / leads</span></div><div><small>Conversão</small><strong>{formatPercent(matriculas, filteredLeads.length)}</strong><span>{formatNumber(matriculas)} matrículas</span></div></div>

    <div className="panel filtersPanel"><div className="panelHeader"><h3><Search size={20} />Filtros de gestão</h3><button className="ghostBtn" onClick={clearFilters}>Limpar filtros</button></div><div className="filters reportFilters polishFilters reportFiltersExtended">
      <label>Campanha<select value={campaign} onChange={(event) => setCampaign(event.target.value)}><option value="">Todas</option>{campaigns.map((value) => <option key={value}>{value}</option>)}</select></label>
      <label>Operador<select value={operator} onChange={(event) => setOperator(event.target.value)}><option value="">Todos</option>{operators.map((value) => <option key={value}>{value}</option>)}</select></label>
      <label>Status/desfecho<select value={status} onChange={(event) => setStatus(event.target.value)}><option value="">Todos</option>{statuses.map((value) => <option key={value}>{formatStatus(value)}</option>)}</select></label>
      <label>De<input type="date" value={dateFrom} max={dateTo || undefined} onChange={(event) => setDateFrom(event.target.value)} /></label>
      <label>Até<input type="date" value={dateTo} min={dateFrom || undefined} onChange={(event) => setDateTo(event.target.value)} /></label>
      <button onClick={() => void load()} disabled={loading}><RefreshCw size={16} />{loading ? 'Buscando...' : 'Buscar'}</button>
    </div></div>

    <div className="reportGrid reportGridPolish"><div className="panel rankingPanel"><h3><BarChart3 size={20} />Campanhas com mais chamadas</h3><div className="progressList">{campaignRank.map((row) => <ProgressRow key={row.name} {...row} max={maxCampaign} />)}{!campaignRank.length && <p className="muted">Sem dados no filtro.</p>}</div></div><div className="panel rankingPanel"><h3><Users size={20} />Operadores</h3><div className="progressList">{operatorRank.map((row) => <ProgressRow key={row.name} {...row} max={maxOperator} />)}{!operatorRank.length && <p className="muted">Sem dados no filtro.</p>}</div></div><div className="panel rankingPanel"><h3><PieChart size={20} />Desfechos</h3><div className="progressList">{dispositionRank.map((row) => <ProgressRow key={row.name} {...row} max={maxDisposition} />)}{!dispositionRank.length && <p className="muted">Sem dados no filtro.</p>}</div></div><div className="panel accent commercialSummary"><h3><Target size={20} />Resumo comercial</h3><div className="summaryTiles"><span><b>{formatNumber(interessados)}</b><small>Interessados</small></span><span><b>{formatNumber(matriculas)}</b><small>Matrículas</small></span><span><b>{formatPercent(matriculas, interessados)}</b><small>Matrícula/interessado</small></span></div><p className="muted">Os indicadores agora respeitam o período e a campanha selecionados quando a base fornece essas relações.</p></div></div>

    <div className="panel mt executiveTable"><div className="panelHeader"><h3><Activity size={20} />Últimos atendimentos</h3><span className="muted">{loading ? 'Carregando...' : `${filteredCalls.length} registros`}</span></div><div className="tableWrap"><table><thead><tr><th>Campanha</th><th>Operador</th><th>Lead</th><th>Telefone</th><th>Status</th><th>Desfecho</th><th>Data</th></tr></thead><tbody>{pageRows.map((row) => <tr key={row.id}><td>{row.campaign?.name || '—'}</td><td>{row.operator?.name || '—'}</td><td>{row.lead?.name || '—'}</td><td>{row.lead?.phoneNormalized || '—'}</td><td><StatusBadge status={row.status} /></td><td>{formatStatus(row.finalDisposition)}</td><td>{formatDateTime(row.createdAt)}</td></tr>)}</tbody></table>{!filteredCalls.length && <div className="empty"><BarChart3 size={34} /><strong>Nenhum atendimento encontrado</strong><span>Faça chamadas ou ajuste os filtros.</span></div>}</div>
      {!!filteredCalls.length && <div className="paginationBar"><label>Linhas<select value={pageSize} onChange={(event) => setPageSize(Number(event.target.value))}><option value={25}>25</option><option value={50}>50</option><option value={100}>100</option></select></label><span>Página {safePage} de {totalPages}</span><div><button className="ghostBtn" disabled={safePage <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>Anterior</button><button className="ghostBtn" disabled={safePage >= totalPages} onClick={() => setPage((value) => Math.min(totalPages, value + 1))}>Próxima</button></div></div>}
    </div>
  </section>;
}
