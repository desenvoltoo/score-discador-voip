import { prisma } from '../prisma.js';
export const audit=(userId:string|undefined, action:string, entity?:string, entityId?:string, metadata?:object)=> prisma.auditLog.create({data:{userId,action,entity,entityId,metadata: metadata as any}}).catch(()=>undefined);
