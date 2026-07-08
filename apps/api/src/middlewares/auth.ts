import { NextFunction, Request, Response } from 'express'; import jwt from 'jsonwebtoken'; import type { Role } from '@score/shared';
declare global { namespace Express { interface Request { user?: { id:string; role:Role; email:string } } } }
export function auth(req:Request,res:Response,next:NextFunction){const h=req.headers.authorization; if(!h?.startsWith('Bearer ')) return res.status(401).json({message:'Token ausente'}); try{req.user=jwt.verify(h.slice(7),process.env.JWT_SECRET||'dev') as any; next();}catch{return res.status(401).json({message:'Token inválido'});} }
export const permit=(...roles:Role[])=>(req:Request,res:Response,next:NextFunction)=> !req.user||!roles.includes(req.user.role)?res.status(403).json({message:'Sem permissão'}):next();
