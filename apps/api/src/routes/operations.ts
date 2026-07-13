import { Router } from 'express';
import type { Prisma } from '@prisma/client';
import { prisma } from '../prisma.js';
import { auth, permit } from '../middlewares/auth.js';

const router = Router();

function positiveInt(value: unknown, fallback: number, max = 200) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) return fallback;
  return Math.min(parsed, max);
}

function dateBoundary(value: unknown, endOfDay = false) {
  if (typeof value !== 'string' || !value.trim()) return undefined;
  const date = new Date(`${value}${value.includes('T') ? '' : endOfDay ? 'T23:59:59.999' : 'T00:00:00.000'}`);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

router.get('/leads/paged', auth, async (req, res) => {
  const page = positiveInt(req.query.page, 1, 100000);
  const pageSize = positiveInt(req.query.pageSize ?? req.query.limit, 25, 100);
  const createdFrom = dateBoundary(req.query.dateFrom);
  const createdTo = dateBoundary(req.query.dateTo, true);
  const callbackFrom = dateBoundary(req.query.callbackFrom);
  const callbackTo = dateBoundary(req.query.callbackTo, true);

  const where: Prisma.LeadWhereInput = {
    campaignId: typeof req.query.campaignId === 'string' ? req.query.campaignId : undefined,
    status: typeof req.query.status === 'string' ? req.query.status as Prisma.EnumLeadStatusFilter : undefined,
    operatorId: typeof req.query.operatorId === 'string' ? req.query.operatorId : undefined,
    doNotCall: req.query.doNotCall === 'true' ? true : req.query.doNotCall === 'false' ? false : undefined,
    phoneNormalized: typeof req.query.telefone === 'string' ? { contains: req.query.telefone.replace(/\D/g, '') } : undefined,
    name: typeof req.query.nome === 'string' ? { contains: req.query.nome, mode: 'insensitive' } : undefined,
    origin: typeof req.query.origem === 'string' ? { contains: req.query.origem, mode: 'insensitive' } : undefined,
    createdAt: createdFrom || createdTo ? { gte: createdFrom, lte: createdTo } : undefined,
    callbackAt: callbackFrom || callbackTo ? { gte: callbackFrom, lte: callbackTo } : undefined,
  };

  const [items, total] = await prisma.$transaction([
    prisma.lead.findMany({
      where,
      include: { campaign: true, operator: true },
      orderBy: [{ callbackAt: 'asc' }, { createdAt: 'desc' }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.lead.count({ where }),
  ]);

  res.json({ items, page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) });
});

router.get('/reports/calls/paged', auth, async (req, res) => {
  const page = positiveInt(req.query.page, 1, 100000);
  const pageSize = positiveInt(req.query.pageSize ?? req.query.limit, 25, 100);
  const dateFrom = dateBoundary(req.query.dateFrom);
  const dateTo = dateBoundary(req.query.dateTo, true);

  const where: Prisma.CallAttemptWhereInput = {
    campaignId: typeof req.query.campaignId === 'string' ? req.query.campaignId : undefined,
    operatorId: typeof req.query.operatorId === 'string' ? req.query.operatorId : undefined,
    status: typeof req.query.callStatus === 'string' ? req.query.callStatus as Prisma.EnumCallStatusFilter : undefined,
    finalDisposition: typeof req.query.disposition === 'string' ? req.query.disposition as Prisma.EnumLeadStatusNullableFilter : undefined,
    createdAt: dateFrom || dateTo ? { gte: dateFrom, lte: dateTo } : undefined,
  };

  const [items, total] = await prisma.$transaction([
    prisma.callAttempt.findMany({
      where,
      include: { campaign: true, operator: true, lead: true },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.callAttempt.count({ where }),
  ]);

  res.json({ items, page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) });
});

router.get('/callbacks', auth, async (req, res) => {
  const now = new Date();
  const from = dateBoundary(req.query.dateFrom) ?? new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const to = dateBoundary(req.query.dateTo, true) ?? new Date(now.getFullYear(), now.getMonth(), now.getDate() + 7, 23, 59, 59, 999);
  const page = positiveInt(req.query.page, 1, 100000);
  const pageSize = positiveInt(req.query.pageSize, 25, 100);

  const where: Prisma.LeadWhereInput = {
    callbackAt: { gte: from, lte: to },
    doNotCall: false,
    operatorId: req.user?.role === 'OPERADOR' ? req.user.id : typeof req.query.operatorId === 'string' ? req.query.operatorId : undefined,
  };

  const [items, total, overdue] = await prisma.$transaction([
    prisma.lead.findMany({ where, include: { campaign: true, operator: true }, orderBy: { callbackAt: 'asc' }, skip: (page - 1) * pageSize, take: pageSize }),
    prisma.lead.count({ where }),
    prisma.lead.count({ where: { ...where, callbackAt: { lt: now } } }),
  ]);

  res.json({ items, page, pageSize, total, overdue, totalPages: Math.max(1, Math.ceil(total / pageSize)) });
});

router.get('/leads/:id/timeline', auth, async (req, res) => {
  const lead = await prisma.lead.findUnique({ where: { id: req.params.id }, select: { id: true, createdAt: true, updatedAt: true, status: true, callbackAt: true, operatorId: true } });
  if (!lead) return res.status(404).json({ message: 'Lead não encontrado' });

  if (req.user?.role === 'OPERADOR' && lead.operatorId && lead.operatorId !== req.user.id) {
    return res.status(403).json({ message: 'Sem permissão para acessar este lead' });
  }

  const [calls, audits] = await Promise.all([
    prisma.callAttempt.findMany({ where: { leadId: lead.id }, include: { operator: { select: { id: true, name: true } } }, orderBy: { createdAt: 'asc' } }),
    prisma.auditLog.findMany({ where: { entityId: lead.id }, orderBy: { createdAt: 'asc' } }),
  ]);

  const events = [
    { id: `lead-created-${lead.id}`, type: 'LEAD_CREATED', at: lead.createdAt, title: 'Lead criado', metadata: { status: lead.status } },
    ...calls.flatMap((call) => [
      { id: `${call.id}-started`, type: 'CALL_STARTED', at: call.startedAt ?? call.createdAt, title: 'Ligação iniciada', metadata: { operator: call.operator?.name, provider: call.provider, status: call.status } },
      ...(call.endedAt ? [{ id: `${call.id}-finished`, type: 'CALL_FINISHED', at: call.endedAt, title: 'Ligação finalizada', metadata: { disposition: call.finalDisposition, durationSeconds: call.durationSeconds, notes: call.notes } }] : []),
    ]),
    ...audits.map((item) => ({ id: item.id, type: item.action, at: item.createdAt, title: item.action.replaceAll('_', ' '), metadata: item.metadata })),
    ...(lead.callbackAt ? [{ id: `callback-${lead.id}`, type: 'CALLBACK_SCHEDULED', at: lead.callbackAt, title: 'Retorno agendado', metadata: { status: lead.status } }] : []),
  ].sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());

  res.json({ leadId: lead.id, events });
});

router.get('/audit', auth, permit('ADMIN', 'SUPERVISOR'), async (req, res) => {
  const page = positiveInt(req.query.page, 1, 100000);
  const pageSize = positiveInt(req.query.pageSize, 25, 100);
  const dateFrom = dateBoundary(req.query.dateFrom);
  const dateTo = dateBoundary(req.query.dateTo, true);
  const where: Prisma.AuditLogWhereInput = {
    userId: typeof req.query.userId === 'string' ? req.query.userId : undefined,
    action: typeof req.query.action === 'string' ? { contains: req.query.action, mode: 'insensitive' } : undefined,
    entity: typeof req.query.entity === 'string' ? req.query.entity : undefined,
    createdAt: dateFrom || dateTo ? { gte: dateFrom, lte: dateTo } : undefined,
  };

  const [items, total] = await prisma.$transaction([
    prisma.auditLog.findMany({ where, include: { user: { select: { id: true, name: true, email: true, role: true } } }, orderBy: { createdAt: 'desc' }, skip: (page - 1) * pageSize, take: pageSize }),
    prisma.auditLog.count({ where }),
  ]);

  res.json({ items, page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) });
});

export default router;
