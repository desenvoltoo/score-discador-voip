import React from 'react';

interface Props {
  queueSize: number;
  score?: number;
  callOpen: boolean;
  noteQuality?: string;
  loading: boolean;
}

export default function OperatorMetrics({ queueSize, score, callOpen, noteQuality, loading }: Props) {
  return <div className="liveMetrics operatorMetrics">
    <div><small>Fila</small><b>{queueSize}</b><span>{loading ? 'atualizando' : 'leads em espera'}</span></div>
    <div><small>Prioridade</small><b>{score === undefined ? '—' : `${score}%`}</b><span>score estimado</span></div>
    <div><small>Atendimento</small><b>{callOpen ? 'Aberto' : 'Livre'}</b><span>{callOpen ? 'salve o desfecho' : 'pronto para iniciar'}</span></div>
    <div><small>Obs.</small><b>{noteQuality || '—'}</b><span>qualidade do registro</span></div>
  </div>;
}
