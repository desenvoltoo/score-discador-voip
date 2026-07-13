import { Router } from 'express';
import { prisma } from '../prisma.js';
import { auth } from '../middlewares/auth.js';
import { audit } from '../services/audit.js';
import { getVoipService } from '../services/voip.js';
import { finishCallSchema } from '../schemas.js';

const router = Router();

function saoPauloMinutes(date = new Date()) {
  const parts = new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(date);
  const hour = Number(parts.find((part) => part.type === 'hour')?.value || 0);
  const minute = Number(parts.find((part) => part.type === 'minute')?.value || 0);
  return hour * 60 + minute;
}

function parseClock(value: string) {
  const [hour, minute] = value.split(':').map(Number);
  if (!Number.isInteger(hour) || !Number.isInteger(minute)) return undefined;
  return hour * 60 + minute;
}

router.post('/calls/start', auth, async (req, res) => {
  const leadId = typeof req.body?.leadId === 'string' ? req.body.leadId : '';
  if (!leadId) return res.status(400).json({ message: 'Lead obrigatório' });

  const [lead, operator] = await Promise.all([
    prisma.lead.findUnique({ where: { id: leadId }, include: { campaign: true } }),
    prisma.user.findUnique({ where: { id: req.user!.id } }),
  ]);

  if (!lead) return res.status(404).json({ message: 'Lead não encontrado' });
  if (!operator?.active) return res.status(403).json({ message: 'Operador inativo' });
  if (lead.doNotCall || lead.status === 'NAO_LIGAR_NOVAMENTE') return res.status(400).json({ message: 'Lead bloqueado para ligação' });
  if (lead.campaign.status !== 'ATIVA') return res.status(400).json({ message: 'A campanha não está ativa' });
  if (req.user!.role === 'OPERADOR' && lead.operatorId && lead.operatorId !== req.user!.id) return res.status(403).json({ message: 'Lead atribuído a outro operador' });
  if (lead.attemptsCount >= lead.campaign.maxAttemptsPerLead) return res.status(400).json({ message: 'Limite de tentativas atingido para este lead' });

  if (lead.lastAttemptAt) {
    const elapsedMinutes = (Date.now() - lead.lastAttemptAt.getTime()) / 60000;
    if (elapsedMinutes < lead.campaign.minIntervalMinutes) {
      const remaining = Math.ceil(lead.campaign.minIntervalMinutes - elapsedMinutes);
      return res.status(400).json({ message: `Aguarde mais ${remaining} minuto(s) antes de tentar novamente` });
    }
  }

  const start = parseClock(lead.campaign.allowedCallStart);
  const end = parseClock(lead.campaign.allowedCallEnd);
  const nowMinutes = saoPauloMinutes();
  if (start !== undefined && end !== undefined && (nowMinutes < start || nowMinutes > end)) {
    return res.status(400).json({ message: `Chamadas permitidas somente entre ${lead.campaign.allowedCallStart} e ${lead.campaign.allowedCallEnd}` });
  }

  const extension = operator.extension || (typeof req.body?.operatorExtension === 'string' ? req.body.operatorExtension : '');
  if (!extension) return res.status(400).json({ message: 'Ramal do operador não configurado' });

  try {
    const output = await getVoipService().originateCall(extension, lead.phoneNormalized);
    const now = new Date();
    const call = await prisma.$transaction(async (tx) => {
      const created = await tx.callAttempt.create({
        data: {
          leadId: lead.id,
          campaignId: lead.campaignId,
          operatorId: req.user!.id,
          provider: process.env.VOIP_PROVIDER || 'mock',
          providerCallId: output.providerCallId,
          status: 'STARTED',
          startedAt: now,
        },
      });
      await tx.lead.update({
        where: { id: lead.id },
        data: {
          operatorId: lead.operatorId || req.user!.id,
          status: 'LIGANDO',
          lastAttemptAt: now,
          attemptsCount: { increment: 1 },
        },
      });
      return created;
    });
    await audit(req.user!.id, 'CALL_STARTED', 'CallAttempt', call.id, { leadId: lead.id, campaignId: lead.campaignId });
    res.status(201).json(call);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Não foi possível iniciar a chamada';
    await audit(req.user!.id, 'CALL_START_FAILED', 'Lead', lead.id, { message });
    res.status(400).json({ message });
  }
});

router.post('/calls/:id/finish', auth, async (req, res) => {
  const body = finishCallSchema.parse(req.body);
  if (body.finalDisposition === 'RETORNO' && !body.callbackAt) {
    return res.status(400).json({ message: 'Data e horário do retorno são obrigatórios' });
  }

  const current = await prisma.callAttempt.findUnique({ where: { id: req.params.id }, include: { lead: true } });
  if (!current) return res.status(404).json({ message: 'Chamada não encontrada' });
  if (req.user!.role === 'OPERADOR' && current.operatorId !== req.user!.id) return res.status(403).json({ message: 'Sem permissão para finalizar esta chamada' });
  if (current.status === 'COMPLETED') return res.status(409).json({ message: 'Esta chamada já foi finalizada' });

  const shouldBlock = Boolean(body.doNotCall || body.finalDisposition === 'NAO_LIGAR_NOVAMENTE');
  const endedAt = new Date();
  const durationSeconds = body.durationSeconds ?? (current.startedAt ? Math.max(0, Math.round((endedAt.getTime() - current.startedAt.getTime()) / 1000)) : undefined);

  const call = await prisma.$transaction(async (tx) => {
    const updated = await tx.callAttempt.update({
      where: { id: current.id },
      data: {
        status: 'COMPLETED',
        endedAt,
        durationSeconds,
        finalDisposition: body.finalDisposition,
        notes: body.notes,
      },
    });
    await tx.lead.update({
      where: { id: current.leadId },
      data: {
        status: body.finalDisposition,
        notes: body.notes,
        callbackAt: body.callbackAt ? new Date(body.callbackAt) : null,
        doNotCall: shouldBlock,
      },
    });
    if (shouldBlock) {
      await tx.doNotCall.upsert({
        where: { phoneNormalized: current.lead.phoneNormalized },
        create: { phoneNormalized: current.lead.phoneNormalized, blockedById: req.user!.id, reason: 'Solicitação registrada no atendimento' },
        update: { blockedById: req.user!.id, blockedAt: endedAt, reason: 'Solicitação registrada no atendimento' },
      });
    }
    return updated;
  });

  await audit(req.user!.id, 'CALL_FINISHED', 'CallAttempt', call.id, {
    leadId: current.leadId,
    disposition: body.finalDisposition,
    callbackAt: body.callbackAt,
    doNotCall: shouldBlock,
  });
  res.json(call);
});

export default router;
