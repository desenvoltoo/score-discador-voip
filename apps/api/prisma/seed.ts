import { PrismaClient } from '@prisma/client'; import bcrypt from 'bcryptjs';
const prisma=new PrismaClient();
async function main(){ const passwordHash=await bcrypt.hash('Score@123',10); for(const u of [{name:'Admin SCORE',email:'admin@score.com.br',role:'ADMIN',extension:'1000'},{name:'Supervisor SCORE',email:'supervisor@score.com.br',role:'SUPERVISOR',extension:'1001'},{name:'Operador SCORE',email:'operador@score.com.br',role:'OPERADOR',extension:'1002'}] as const){await prisma.user.upsert({where:{email:u.email},update:{},create:{...u,passwordHash}})} await prisma.voipConfig.create({data:{provider:process.env.VOIP_PROVIDER||'mock'}}).catch(()=>undefined); }
main().finally(()=>prisma.$disconnect());
