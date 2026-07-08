# SCORE Discador

**Gestão de campanhas, ligações e resultados comerciais.**

Ferramenta web para operação comercial controlada de click-to-call. A primeira versão não implementa discador preditivo/agressivo: operadores escolhem leads, clicam em **Ligar**, registram o resultado e respeitam bloqueios LGPD de **não ligar novamente**.

## Stack
- Frontend: React + Vite + TypeScript
- Backend: Node.js + Express + TypeScript
- Banco: PostgreSQL
- ORM: Prisma
- Upload: multer + xlsx/csv-parser
- Auth: JWT + bcrypt
- Deploy: Docker Compose, compatível com VPS/EasyPanel

## Estrutura
```text
apps/web      # React/Vite
apps/api      # Express/Prisma
packages/shared # schemas e tipos compartilhados
docker-compose.yml
.env.example
```

## Rodando localmente
```bash
cp .env.example .env
npm install
npm run build
cd apps/api && npx prisma migrate dev && npm run seed
npm run dev
```

Acessos seed:
- `admin@score.com.br` / `Score@123`
- `supervisor@score.com.br` / `Score@123`
- `operador@score.com.br` / `Score@123`

## Docker Compose
```bash
cp .env.example .env
docker compose up -d --build
```

Serviços:
- Frontend: http://localhost:3000
- Backend: http://localhost:4000
- Healthcheck: http://localhost:4000/health
- Postgres: localhost:5432

## Importação de leads
Use CSV ou XLSX com colunas:
`nome`, `telefone`, `cpf`, `email`, `curso`, `origem`, `observacao`.

A API normaliza telefones brasileiros, remove caracteres especiais, valida celular/fixo com DDD, remove duplicados por telefone dentro da campanha e bloqueia telefones já presentes na lista **Não ligar novamente**. Cada upload gera um `ImportLog` com totais lidos, importados, duplicados, inválidos e bloqueados.

## Modo MOCK VoIP
No `.env` mantenha:
```env
VOIP_PROVIDER=mock
```
O sistema simula a origem da chamada, cria `CallAttempt` como `STARTED` e permite finalizar manualmente pelo operador.

## Integração Asterisk/FreePBX
Para preparar o modo Asterisk:
```env
VOIP_PROVIDER=asterisk
ASTERISK_HOST=seu-host
ASTERISK_PORT=5038
ASTERISK_USERNAME=usuario-ami
ASTERISK_PASSWORD=senha-ami
ASTERISK_CONTEXT=from-internal
ASTERISK_TRUNK=seu-tronco-sip
ASTERISK_OPERATOR_PREFIX=
```

O serviço `AsteriskService` centraliza a função `originateCall(operatorExtension, destinationNumber)`. Configure o ramal do operador no cadastro de usuário (`extension`). O fluxo previsto é: chamar o ramal do operador, ao atender originar chamada para o telefone do lead pelo tronco SIP e conectar ambos. Se credenciais estiverem ausentes, a API retorna erro amigável.

## Funcionalidades
- Login JWT e perfis ADMIN, SUPERVISOR e OPERADOR.
- Campanhas com status, responsável, janelas de chamada e limites de tentativas.
- Upload CSV/XLSX com relatório de importação.
- Filtros e listagem de leads.
- Tela do operador com botão grande **Ligar**, status rápidos e observação.
- Tentativas de chamada e finalização com disposição final.
- Lista **Não ligar novamente**, bloqueio por telefone e auditoria.
- Dashboard com indicadores e endpoints de gráficos.
- Relatórios e exportação CSV.
- Configuração/teste VoIP.

## LGPD e boas práticas
Use os dados apenas para finalidade autorizada, com consentimento/base legal adequada. Registre corretamente resultados, respeite pedidos de exclusão/bloqueio e não use a ferramenta para spam, discagem abusiva ou burla de consentimento. Telefones bloqueados são impedidos de novas importações e chamadas.

## GitHub
```bash
git init
git add .
git commit -m "feat: initial SCORE Discador project"
git branch -M main
git remote add origin git@github.com:SEU_USUARIO/score-discador-voip.git
git push -u origin main
```

## VPS/EasyPanel
1. Crie um app **Docker Compose** no EasyPanel apontando para o repositório.
2. No EasyPanel, selecione o arquivo `docker-compose.yml` da raiz do projeto como arquivo Compose.
3. Mantenha o contexto de build da raiz (`context: .`) para que os Dockerfiles consigam copiar `apps/api`, `apps/web`, `packages/shared` e o `package.json` raiz usados pelos workspaces npm.
4. Configure variáveis de ambiente com base no `.env.example` e substitua segredos como `JWT_SECRET` antes de publicar.
5. Defina domínios para `web` e `api`, usando proxy reverso/SSL do EasyPanel.
6. Garanta volume persistente para `postgres_data` e `api_uploads`.
7. Execute deploy; o serviço `api` roda migrations e seed antes de iniciar.

## Próximos passos recomendados
- Implementar AMI/ARI real com biblioteca aprovada pela infraestrutura VoIP.
- Adicionar testes automatizados end-to-end.
- Criar paginação avançada e permissões por campanha/equipe.
- Adicionar mascaramento de dados sensíveis e rotinas de retenção.
