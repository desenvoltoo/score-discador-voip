import { z } from 'zod';

export const roles = ['ADMIN', 'SUPERVISOR', 'OPERADOR'] as const;
export const campaignStatuses = ['RASCUNHO', 'ATIVA', 'PAUSADA', 'ENCERRADA'] as const;
export const leadStatuses = [
  'NOVO',
  'EM_FILA',
  'LIGANDO',
  'ATENDIDO',
  'NAO_ATENDEU',
  'OCUPADO',
  'NUMERO_INVALIDO',
  'CAIXA_POSTAL',
  'RETORNO',
  'INTERESSADO',
  'SEM_INTERESSE',
  'MATRICULADO',
  'NAO_LIGAR_NOVAMENTE',
  'ERRO_CHAMADA',
] as const;

export const callStatuses = ['CREATED', 'STARTED', 'RINGING', 'ANSWERED', 'COMPLETED', 'FAILED', 'CANCELED'] as const;

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const userSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6).optional(),
  role: z.enum(roles),
  extension: z.string().optional().nullable(),
});

export const campaignSchema = z.object({
  name: z.string().min(2),
  description: z.string().optional().nullable(),
  status: z.enum(campaignStatuses).default('RASCUNHO'),
  allowedCallStart: z.string().default('08:00'),
  allowedCallEnd: z.string().default('18:00'),
  maxAttemptsPerLead: z.number().int().min(1).default(3),
  minIntervalMinutes: z.number().int().min(0).default(60),
  responsibleId: z.string().optional().nullable(),
});

export const finishCallSchema = z.object({
  finalDisposition: z.enum(leadStatuses),
  notes: z.string().optional(),
  callbackAt: z.string().datetime().optional().nullable(),
  doNotCall: z.boolean().default(false),
  durationSeconds: z.number().int().optional(),
});

export type Role = (typeof roles)[number];
