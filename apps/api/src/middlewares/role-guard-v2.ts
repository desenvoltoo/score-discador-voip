import type { RequestHandler } from 'express';
import { auth } from './auth.js';

type Role = 'ADMIN' | 'SUPERVISOR' | 'OPERADOR';

type Rule = {
  method?: string;
  pattern: RegExp;
  roles: Role[];
};

const rules: Rule[] = [
  { method: 'GET', pattern: /^\/users(?:\/|$)/, roles: ['ADMIN', 'SUPERVISOR'] },
  { pattern: /^\/users(?:\/|$)/, roles: ['ADMIN'] },
  { method: 'POST', pattern: /^\/campaigns$/, roles: ['ADMIN'] },
  { method: 'PATCH', pattern: /^\/campaigns\//, roles: ['ADMIN', 'SUPERVISOR'] },
  { method: 'GET', pattern: /^\/imports$/, roles: ['ADMIN', 'SUPERVISOR'] },
  { pattern: /^\/imports(?:\/|$)/, roles: ['ADMIN'] },
  { method: 'PATCH', pattern: /^\/leads\//, roles: ['ADMIN', 'SUPERVISOR'] },
  { method: 'POST', pattern: /^\/leads\/[^/]+\/assign$/, roles: ['ADMIN', 'SUPERVISOR'] },
  { method: 'GET', pattern: /^\/reports(?:\/|$)/, roles: ['ADMIN', 'SUPERVISOR'] },
  { pattern: /^\/voip(?:\/|$)/, roles: ['ADMIN'] },
  { method: 'GET', pattern: /^\/audit(?:\/|$)/, roles: ['ADMIN', 'SUPERVISOR'] },
  { pattern: /^\/do-not-call(?:\/|$)/, roles: ['ADMIN', 'SUPERVISOR'] },
];

const roleGuard: RequestHandler = (req, res, next) => {
  if (req.path === '/auth/login') return next();

  return auth(req, res, () => {
    const rule = rules.find((item) => (!item.method || item.method === req.method) && item.pattern.test(req.path));
    if (!rule) return next();

    const role = req.user?.role as Role | undefined;
    if (!role || !rule.roles.includes(role)) {
      return res.status(403).json({ message: 'Você não possui permissão para executar esta ação.' });
    }

    return next();
  });
};

export default roleGuard;
