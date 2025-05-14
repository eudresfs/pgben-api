# **Checklist de Preparação para Desenvolvimento - Backend SEMTAS**

### **1. Clonagem e Instalação do Projeto**

* [ ] Clonar o repositório `monstar-lab-oss/nestjs-starter-rest-api`
* [ ] Verificar documentação oficial do starter para instruções específicas
* [ ] Instalar dependências com `npm install` (ou `yarn install`)
* [ ] Confirmar versão do Node.js: `20.x LTS`
* [ ] Criar um novo repositório git para o projeto SEMTAS
* [ ] Configurar o repositório clonado como origem remota para o novo projeto
* [ ] Fazer commit inicial com a base do starter kit

---

### **2. Configuração do Ambiente de Desenvolvimento**

* [ ] Criar arquivo `.env` baseado no `.env.example`
* [ ] Definir variáveis específicas para o projeto SEMTAS:
  * Banco de dados: `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASS`, `DB_NAME=semtas_beneficios`
  * JWT: `JWT_SECRET`, `JWT_EXPIRATION_TIME=15m`, `JWT_REFRESH_SECRET`, `JWT_REFRESH_EXPIRATION=1d`
  * Email: `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_USER`, `EMAIL_PASSWORD`, `EMAIL_FROM=noreply@semtas.gov.br`
  * MinIO: `MINIO_ENDPOINT`, `MINIO_PORT`, `MINIO_ACCESS_KEY`, `MINIO_SECRET_KEY`, `MINIO_BUCKET=documents`
  * Aplicação: `PORT=3000`, `API_PREFIX=/api`, `NODE_ENV=development`, `APP_NAME=SEMTAS-pgben`
* [ ] Criar `docker-compose.yml` para ambiente de desenvolvimento local:
  * PostgreSQL 14+ com configuração otimizada
  * Redis para cache e filas
  * MinIO para armazenamento de documentos
  * MailHog para testes de email
* [ ] Adicionar script para inicialização do bucket MinIO no docker-compose
* [ ] Inicializar containers com `docker-compose up -d`
* [ ] Verificar logs dos containers para garantir inicialização correta

---

### **3. Banco de Dados**

* [ ] Confirmar que o PostgreSQL está rodando e acessível via `psql` ou GUI
* [ ] Criar banco de dados `pgben` para ambiente de desenvolvimento
* [ ] Adaptar esquemas de tabelas do documento "Schemas e Otimizações PostgreSQL":
  * Revisar tabelas de usuários e adaptá-las para estender o modelo do starter
  * Revisar tabelas de unidade e setor
  * Revisar tabelas de cidadao e dados sociais
  * Revisar tabelas de benefícios e requisitos documentais
  * Revisar tabelas de solicitações e documentos
  * Revisar tabelas de histórico e auditoria
* [ ] Converter esquemas SQL em entidades TypeORM
* [ ] Criar migrations iniciais para estrutura base
* [ ] Preparar seeds para dados iniciais:
  * Unidades (CRAS, CREAS listados na documentação)
  * Tipos de benefícios (Auxílio Natalidade e Aluguel Social)
  * Setores básicos
  * Usuário administrador padrão
* [ ] Executar migrations com `npm run typeorm:migration:run`
* [ ] Verificar estrutura criada via ferramenta de administração (DBeaver, TablePlus)
* [ ] Validar índices recomendados conforme documento de otimização

---

### **4. Organização de Estrutura de Projeto**

* [ ] Analisar estrutura do starter kit e planejar adaptações
* [ ] Criar estrutura para módulos do domínio específico SEMTAS:
  * `src/modules/unidade/` - Gestão de unidade e setor
  * `src/modules/cidadao/` - Cadastro de beneficiários/solicitantes
  * `src/modules/beneficio/` - Tipos de benefícios e requisitos
  * `src/modules/solicitacao/` - Workflow de solicitações
  * `src/modules/documento/` - Gestão de uploads e armazenamento
  * `src/modules/relatorios/` - Endpoints para dashboards e KPIs
  * `src/modules/notificacao/` - Sistema de notificações e emails
  * `src/modules/audit/` - Auditoria de ações
  * `src/modules/ocorrencia/` - Registro de ocorrências
* [ ] Para cada módulo, preparar subdiretórios padrão:
  * `dto/` - Data Transfer Objects com validações
  * `entities/` - Entidades TypeORM 
  * `controllers/` - Endpoints da API
  * `services/` - Lógica de negócio
  * `repositories/` - Camada de acesso a dados
* [ ] Adaptar estrutura do módulo de Auth para incluir RBAC específico SEMTAS
* [ ] Verificar integração dos novos módulos com a estrutura do starter
* [ ] Confirmar configuração correta de injeção de dependências

---

### **5. Verificações Técnicas**

* [ ] Rodar `npm run start:dev` e validar que a aplicação sobe sem erros
* [ ] Acessar rota de health check (`GET /health`)
* [ ] Confirmar se o Swagger está disponível e funcionando em `/docs`
* [ ] Verificar se logs estão sendo gerados corretamente (via Winston)
* [ ] Validar funcionamento do módulo Auth:
  * Teste de registro de usuário
  * Teste de login e obtenção de token JWT
  * Teste de refresh token
  * Teste de rota protegida
* [ ] Verificar configuração de Validation Pipe do NestJS
* [ ] Testar conexão com todos os serviços externos (Redis, MinIO)
* [ ] Validar a integração do TypeORM com o PostgreSQL
* [ ] Verificar se a estratégia de transações está funcionando

---

### **6. Segurança e Validação**

* [ ] Revisar configuração de segurança do starter kit
* [ ] Configurar Helmet com headers de segurança recomendados:
  * `Content-Security-Policy`
  * `X-Frame-Options`
  * `X-Content-Type-Options`
  * `Strict-Transport-Security`
  * `Referrer-Policy`
* [ ] Implementar rate limiting para rotas críticas (login, recuperação de senha)
* [ ] Configurar CORS adequadamente para desenvolvimento
* [ ] Verificar configuração de cookies para JWT:
  * HttpOnly
  * Secure (em produção)
  * SameSite
* [ ] Revisão de vulnerabilidades com `npm audit`
* [ ] Configurar sanitização de inputs com class-validator e class-transformer
* [ ] Verificar configurações de timeout para requisições e conexões
* [ ] Configurar validação mais restrita para CPF nos DTOs

---

### **7. Ferramentas de Qualidade de Código**

* [ ] Configurar o editor (VSCode) com extensões recomendadas:
  * ESLint
  * Prettier
  * TypeScript Hero
  * GitLens
  * Docker
  * REST Client
  * Thunder Client
* [ ] Verificar configuração de ESLint e Prettier do starter
* [ ] Adaptar regras de linting para padrões do projeto SEMTAS
* [ ] Configurar Husky para hooks de pré-commit e pré-push:
  * Execução de linting
  * Formatação automática
  * Validação de mensagens de commit
* [ ] Verificar execução de testes unitários (`npm run test`)
* [ ] Configurar Jest para novos módulos específicos
* [ ] Configurar cobertura de testes mínima (meta: 80%)
* [ ] Definir estratégia de testes de integração
* [ ] Verificar funcionamento dos scripts npm do starter

---

### **8. Configuração de Ambiente MinIO/S3**

* [ ] Verificar se MinIO está acessível via console web
* [ ] Criar bucket `documents` para armazenamento de documentos
* [ ] Configurar políticas de acesso para o bucket
* [ ] Criar pasta separada para cada tipo de benefício
* [ ] Testar upload e download manual de arquivos via console
* [ ] Implementar serviço base para operações com MinIO:
  * Uploads seguros
  * Geração de URLs assinadas com expiração
  * Controle de tipos MIME permitidos
  * Limitação de tamanho (5MB)
* [ ] Testar integração básica do serviço de storage com a aplicação

---

### **9. Extensão do Modelo de Usuários**

* [ ] Analisar modelo de User do starter kit
* [ ] Estender entidade User para campos específicos do SEMTAS:
  * CPF (com validação)
  * Telefone
  * Perfil/Role (administrador, gestor_semtas, tecnico_semtas, tecnico_unidade)
  * Relacionamento com unidade
  * Relacionamento com setor
* [ ] Adaptar DTOs de Auth para novos campos
* [ ] Configurar RBAC para novos perfis do sistema
* [ ] Implementar validações específicas para CPF
* [ ] Adaptar service de Auth para regras de negócio específicas
* [ ] Configurar fluxo de primeiro acesso (senha provisória)
* [ ] Testar criação e autenticação com modelo estendido

---

### **10. Alinhamento de Convenções**

* [ ] Definir convenções para nomenclatura de entidades e DTOs:
  * PascalCase para classes (entidades, DTOs)
  * camelCase para propriedades e métodos
  * snake_case para colunas no banco de dados
* [ ] Estabelecer padrão para mensagens de erro:
  * Códigos de erro consistentes
  * Mensagens amigáveis para o usuário
  * Logs detalhados para debug
* [ ] Definir estrutura para responses da API:
  * Formato padronizado de sucesso
  * Formato padronizado de erro
  * Paginação consistente
* [ ] Estabelecer padrão de commits (Conventional Commits):
  * `feat:` para novas funcionalidades
  * `fix:` para correções
  * `docs:` para documentação
  * `chore:` para tarefas de manutenção
  * `refactor:` para refatorações
  * `test:` para testes
* [ ] Definir estratégia de branching (GitFlow ou trunk-based)
* [ ] Criar documento com guidelines de desenvolvimento para a equipe
* [ ] Definir estratégia de revisão de código (pull requests)

---

### **11. Documentação Inicial**

* [ ] Criar README detalhado para o projeto:
  * Visão geral do sistema
  * Requisitos de sistema
  * Instruções de instalação e configuração
  * Scripts disponíveis
  * Estrutura do projeto
* [ ] Configurar documentação Swagger/OpenAPI:
  * Descrição geral da API
  * Tags para agrupamento lógico de endpoints
  * Descrições detalhadas de endpoints
  * Exemplos de requisição/resposta
* [ ] Documentar entidades principais e seus relacionamentos
* [ ] Criar diagrama ER simplificado para referência
* [ ] Documentar regras de negócio específicas para cada tipo de benefício
* [ ] Criar documentação dos fluxos de trabalho (workflows)
* [ ] Definir glossário com termos específicos do domínio

---

### **12. Verificação Final de Prontidão**

* [ ] Executar todos os testes unitários
* [ ] Validar funcionamento do sistema base
* [ ] Verificar conexão com todos os serviços externos
* [ ] Confirmar que todos os containers Docker estão saudáveis
* [ ] Verificar logs de aplicação em busca de erros ou warnings
* [ ] Executar checagem de segurança inicial
* [ ] Verificar se a estrutura está pronta para início do desenvolvimento
* [ ] Criar branches iniciais de desenvolvimento
* [ ] Estabelecer milestones e primeiras issues no sistema de gerenciamento
* [ ] Realizar reunião de kick-off técnico com a equipe