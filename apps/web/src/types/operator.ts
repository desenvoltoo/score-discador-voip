export interface OperatorLead {
  id: string;
  name?: string | null;
  phoneNormalized?: string | null;
  course?: string | null;
  origin?: string | null;
  campaign?: string | null;
  status?: string | null;
  notes?: string | null;
  callbackAt?: string | null;
  attemptsCount?: number | null;
  priority?: number | null;
}

export interface OperatorCall {
  id: string;
  leadId?: string;
  startedAt?: string;
}

export type OperatorBusyAction = 'load' | 'start' | 'save' | 'finish' | null;
