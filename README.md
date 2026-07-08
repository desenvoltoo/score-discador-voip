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

## Estrutura real do repositório
```text
apps/api/                # Express, Prisma, migrations e seed
apps/api/Dockerfile      # build da API com contexto da raiz
apps/web/                # React/Vite
apps/web/Dockerfile      # build do frontend com contexto da raiz
packages/shared/         # schemas e tipos compartilhados usados pela API
docker-compose.yml       # compose executado a partir da raiz
.env.example
```

O projeto é um monorepo npm workspaces. Os serviços `api` e `web` usam obrigatoriamente `build.context: .` no `docker-compose.yml`, porque os Dockerfiles copiam `package.json`, `apps/*` e `packages/shared` a partir da raiz do repositório.

## Rodando localmente sem Docker
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
Execute sempre a partir da raiz do repositório:

```bash
docker compose build
docker compose up -d
```

Também há atalhos npm:

```bash
npm run compose:build
npm run compose:up
npm run compose:down
```

Serviços:
- Frontend: http://localhost:3000
- Backend: http://localhost:4000
- Healthcheck: http://localhost:4000/health
- Postgres: localhost:5432

Variáveis principais:
- `WEB_PORT` define a porta publicada do frontend; padrão `3000`.
- `API_PORT` define a porta publicada e interna da API; padrão `4000`.
- `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD` e `POSTGRES_PORT` configuram o Postgres.
- `DATABASE_URL` pode sobrescrever a conexão interna padrão.
- `VITE_API_URL` é usado no build do frontend; em EasyPanel, ajuste para a URL pública da API antes do deploy.
- `JWT_SECRET` deve ser alterado em produção.

No start do container da API, o Compose executa `prisma migrate deploy`, `prisma db seed` e então inicia `node dist/server.js`. A pasta `apps/api/prisma/migrations` precisa estar versionada para que o deploy funcione em ambiente limpo.

## Deploy no EasyPanel
1. Crie um app **Docker Compose** no EasyPanel apontando para este repositório.
2. Selecione o arquivo `docker-compose.yml` da raiz do projeto.
3. Não altere o contexto de build: `api` e `web` precisam de `context: .`.
4. Mantenha os Dockerfiles:
   - API: `apps/api/Dockerfile`
   - WEB: `apps/web/Dockerfile`
5. Configure `JWT_SECRET`, `VITE_API_URL` e, se necessário, as variáveis de banco/VoIP no painel.
6. Publique domínios para `web` e `api` usando o proxy/SSL do EasyPanel.
7. Garanta volumes persistentes para `postgres_data` e `api_uploads`.
8. Execute o deploy. O Postgres sobe primeiro, a API aguarda o healthcheck do banco, aplica migrations/seed e o frontend aguarda o healthcheck da API.

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

## LGPD e boas práticas
Use os dados apenas para finalidade autorizada, com consentimento/base legal adequada. Registre corretamente resultados, respeite pedidos de exclusão/bloqueio e não use a ferramenta para spam, discagem abusiva ou burla de consentimento. Telefones bloqueados são impedidos de novas importações e chamadas.

## Próximos passos recomendados
- Implementar AMI/ARI real com biblioteca aprovada pela infraestrutura VoIP.
- Adicionar testes automatizados end-to-end.
- Criar paginação avançada e permissões por campanha/equipe.
- Adicionar mascaramento de dados sensíveis e rotinas de retenção.
