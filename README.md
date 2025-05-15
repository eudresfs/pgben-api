# Guia da Estrutura de Código - Sistema de Gestão de Benefícios Eventuais (PGBEN)

## Sumário

1. [Visão Geral da Arquitetura](#visão-geral-da-arquitetura)
2. [Organização de Diretórios](#organização-de-diretórios)
3. [Componentes Principais](#componentes-principais)
4. [Fluxos de Dados](#fluxos-de-dados)
5. [Monitoramento e Observabilidade](#monitoramento-e-observabilidade)
6. [Guia de Modificação e Extensão](#guia-de-modificação-e-extensão)
7. [Deploy com Docker](#deploy-com-docker)
8. [Anexos Técnicos](#anexos-técnicos)

## Visão Geral da Arquitetura

### Estrutura de Alto Nível

O Sistema de Gestão de Benefícios Eventuais - Kit Enxoval da SEMTAS é uma aplicação backend desenvolvida com NestJS, um framework progressivo para Node.js. A arquitetura segue os princípios de desenvolvimento modular, orientação a objetos e injeção de dependências.

### Padrões Arquiteturais Utilizados

- **Arquitetura Modular**: O sistema é dividido em módulos independentes e coesos, cada um responsável por uma funcionalidade específica.
- **Padrão MVC (Model-View-Controller)**: Implementado através da estrutura do NestJS com controllers, services e entities.
- **Injeção de Dependências**: Utilizada para gerenciar as dependências entre os componentes da aplicação.
- **Repository Pattern**: Implementado para abstrair o acesso ao banco de dados.
- **DTO (Data Transfer Objects)**: Utilizados para validação e transferência de dados entre as camadas da aplicação.

### Diagrama Visual da Arquitetura

```
┌─────────────────────────────────────────────────────────────┐
│                      Cliente HTTP                           │
└───────────────────────────┬─────────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────────┐
│                      API Gateway                            │
│                                                             │
│   ┌─────────────┐    ┌──────────────┐    ┌──────────────┐   │
│   │  Swagger    │    │    CORS      │    │  Validação   │   │
│   └─────────────┘    └──────────────┘    └──────────────┘   │
└───────────────────────────┬─────────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────────┐
│                    Módulos da Aplicação                     │
│                                                             │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌───────────────┐   │
│  │   Auth   │ │ Cidadão  │ │Benefício │ │ Solicitação   │   │
│  └──────────┘ └──────────┘ └──────────┘ └───────────────┘   │
│                                                             │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌───────────────┐   │
│  │ Unidade  │ │ Usuário  │ │Documento │ │ Notificação   │   │
│  └──────────┘ └──────────┘ └──────────┘ └───────────────┘   │
└───────────────────────────┬─────────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────────┐
│                   Camada de Persistência                    │
│                                                             │
│  ┌──────────────────────┐      ┌───────────────────────┐    │
│  │    TypeORM           │      │    Migrations         │    │
│  └──────────────────────┘      └───────────────────────┘    │
│                                                             │
│  ┌──────────────────────┐      ┌───────────────────────┐    │
│  │    Entities          │      │    Seeds              │    │
│  └──────────────────────┘      └───────────────────────┘    │
└───────────────────────────┬─────────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────────┐
│                   Banco de Dados PostgreSQL                 │
└─────────────────────────────────────────────────────────────┘
```

## Organização de Diretórios

### Mapeamento da Estrutura de Pastas

```
pgben-server/
├── dist/                    # Código compilado para produção
├── docs/                    # Documentação do projeto
├── logs/                    # Arquivos de log
├── node_modules/            # Dependências do Node.js
├── scripts/                 # Scripts utilitários
├── src/                     # Código-fonte da aplicação
│   ├── auth/                # Módulo de autenticação
│   ├── database/            # Configurações e migrações do banco de dados
│   ├── modules/             # Módulos da aplicação
│   │   ├── audit/           # Módulo de auditoria
│   │   ├── auth/            # Módulo de autenticação
│   │   ├── beneficio/       # Módulo de benefícios
│   │   ├── cidadao/         # Módulo de cidadãos
│   │   ├── documento/       # Módulo de documentos
│   │   ├── notificacao/     # Módulo de notificações
│   │   ├── ocorrencia/      # Módulo de ocorrências
│   │   ├── relatorio/       # Módulo de relatórios
│   │   ├── solicitacao/     # Módulo de solicitações
│   │   ├── unidade/         # Módulo de unidades
│   │   └── usuario/         # Módulo de usuários
│   ├── shared/              # Componentes compartilhados
│   │   ├── configs/         # Configurações globais
│   │   ├── constants/       # Constantes globais
│   │   ├── dtos/            # DTOs compartilhados
│   │   ├── enums/           # Enumerações compartilhadas
│   │   ├── exceptions/      # Exceções personalizadas
│   │   ├── filters/         # Filtros globais
│   │   ├── interceptors/    # Interceptadores globais
│   │   ├── logger/          # Configuração de logs
│   │   ├── logging/         # Serviços de logging
│   │   ├── middlewares/     # Middlewares globais
│   │   ├── monitoring/      # Serviços de monitoramento
│   │   └── request-context/ # Contexto de requisição
│   ├── app.controller.ts    # Controlador principal
│   ├── app.module.ts        # Módulo principal
│   ├── app.service.ts       # Serviço principal
│   ├── data-source.ts       # Configuração da fonte de dados
│   ├── main.ts              # Ponto de entrada da aplicação
│   └── ormconfig.ts         # Configuração do TypeORM
├── test/                    # Testes automatizados
├── .env                     # Variáveis de ambiente
├── .env.example             # Exemplo de variáveis de ambiente
├── .gitignore               # Arquivos ignorados pelo Git
├── .prettierrc              # Configuração do Prettier
├── docker-compose.yml       # Configuração do Docker Compose
├── Dockerfile               # Configuração do Docker
├── jest.config.js           # Configuração do Jest
├── nest-cli.json            # Configuração do NestJS CLI
├── ormconfig.js             # Configuração do TypeORM para CLI
├── ormconfig.json           # Configuração do TypeORM em JSON
├── ormconfig.seed.js        # Configuração do TypeORM para seeds
├── package.json             # Dependências e scripts
├── tsconfig.build.json      # Configuração do TypeScript para build
└── tsconfig.json            # Configuração do TypeScript
```

### Propósito de Cada Diretório Principal

#### `/src`
Contém todo o código-fonte da aplicação, organizado em módulos e componentes.

#### `/src/auth`
Implementa a autenticação e autorização do sistema, incluindo estratégias JWT, guards e decorators.

#### `/src/database`
Contém as migrações e seeds do banco de dados para configuração inicial e atualizações do schema.

#### `/src/modules`
Contém os módulos específicos da aplicação, cada um responsável por uma funcionalidade de negócio.

#### `/src/shared`
Contém componentes, utilitários e configurações compartilhadas entre os módulos.

#### `/docs`
Armazena a documentação do projeto, incluindo manuais, guias e especificações.

#### `/scripts`
Contém scripts utilitários para automação de tarefas, como geração de chaves JWT.

#### `/test`
Contém testes automatizados, incluindo testes unitários e de integração.

### Convenções de Nomenclatura

- **Arquivos**: Utilizam kebab-case (exemplo: `tipo-beneficio.entity.ts`)
- **Classes**: Utilizam PascalCase (exemplo: `TipoBeneficioEntity`)
- **Métodos e Propriedades**: Utilizam camelCase (exemplo: `findById()`)
- **Constantes**: Utilizam SNAKE_CASE_MAIÚSCULO (exemplo: `DEFAULT_CONNECTION`)
- **Interfaces**: Prefixo "I" seguido de PascalCase (exemplo: `IUsuario`)
- **DTOs**: Sufixo "Dto" (exemplo: `CreateUsuarioDto`)
- **Entidades**: Sufixo "Entity" (exemplo: `UsuarioEntity`)

## Componentes Principais

### Backend (APIs, serviços, etc.)

#### Módulo de Autenticação (`/src/auth`)
Responsável pela autenticação e autorização dos usuários no sistema.

- **Controllers**: Gerenciam endpoints de login, refresh token e alteração de senha.
- **Services**: Implementam a lógica de autenticação, geração e validação de tokens.
- **Guards**: Protegem rotas e recursos baseados em roles e permissões.
- **Strategies**: Implementam estratégias de autenticação JWT e local.

#### Módulo de Cidadão (`/src/modules/cidadao`)
Gerencia o cadastro e informações dos cidadãos beneficiários.

- **Entidades**:
  - `cidadao.entity.ts`: Dados pessoais do cidadão
  - `composicao-familiar.entity.ts`: Membros da família do cidadão
  - `dados-sociais.entity.ts`: Informações socioeconômicas
  - `situacao-moradia.entity.ts`: Dados sobre a moradia do cidadão

- **Controllers**: Gerenciam endpoints para CRUD de cidadãos e suas informações relacionadas.
- **Services**: Implementam a lógica de negócio para gerenciamento de cidadãos.

#### Módulo de Benefício (`/src/modules/beneficio`)
Gerencia os tipos de benefícios disponíveis e suas configurações.

- **Entidades**:
  - `tipo-beneficio.entity.ts`: Tipos de benefícios disponíveis
  - `fluxo-beneficio.entity.ts`: Etapas do fluxo de aprovação
  - `requisito-documento.entity.ts`: Documentos necessários para cada benefício

- **Controllers**: Gerenciam endpoints para CRUD de benefícios e configurações.
- **Services**: Implementam a lógica de negócio para gerenciamento de benefícios.

#### Módulo de Solicitação (`/src/modules/solicitacao`)
Gerencia as solicitações de benefícios feitas pelos cidadãos.

- **Entidades**:
  - `solicitacao.entity.ts`: Dados da solicitação
  - `dados-beneficios.entity.ts`: Dados específicos do benefício solicitado
  - `historico-solicitacao.entity.ts`: Histórico de alterações na solicitação
  - `pendencia.entity.ts`: Pendências na solicitação

- **Controllers**: Gerenciam endpoints para CRUD de solicitações e seu fluxo.
- **Services**: Implementam a lógica de negócio para gerenciamento de solicitações.

#### Módulo de Documento (`/src/modules/documento`)
Gerencia os documentos anexados às solicitações.

- **Controllers**: Gerenciam endpoints para upload, download e gerenciamento de documentos.
- **Services**: Implementam a lógica de negócio para gerenciamento de documentos.

#### Módulo de Usuário (`/src/modules/usuario`)
Gerencia os usuários do sistema (funcionários).

- **Controllers**: Gerenciam endpoints para CRUD de usuários.
- **Services**: Implementam a lógica de negócio para gerenciamento de usuários.

#### Módulo de Unidade (`/src/modules/unidade`)
Gerencia as unidades de atendimento da Secretaria.

- **Controllers**: Gerenciam endpoints para CRUD de unidades.
- **Services**: Implementam a lógica de negócio para gerenciamento de unidades.

#### Módulo de Notificação (`/src/modules/notificacao`)
Gerencia o envio e controle de notificações aos cidadãos e usuários.

- **Controllers**: Gerenciam endpoints para envio e consulta de notificações.
- **Services**: Implementam a lógica de negócio para gerenciamento de notificações.

#### Módulo de Relatório (`/src/modules/relatorio`)
Gerencia a geração de relatórios e estatísticas.

- **Controllers**: Gerenciam endpoints para geração de relatórios.
- **Services**: Implementam a lógica de negócio para geração de relatórios.

### Banco de Dados (modelo, migrações, etc.)

#### Modelo de Dados
O sistema utiliza o TypeORM como ORM (Object-Relational Mapping) para interagir com o banco de dados PostgreSQL. As entidades são definidas com decoradores do TypeORM e representam as tabelas no banco de dados.

#### Migrações
As migrações são gerenciadas pelo TypeORM e estão localizadas em `/src/database/migrations`. Elas são responsáveis por criar e atualizar o schema do banco de dados de forma controlada.

#### Seeds
Os seeds estão localizados em `/src/database/seeds` e são responsáveis por popular o banco de dados com dados iniciais, como tipos de benefícios, unidades e usuários administradores.

### Utilitários e Módulos Compartilhados

#### Configurações (`/src/shared/configs`)
Contém configurações globais da aplicação, como Swagger, conexão com banco de dados e variáveis de ambiente.

#### Interceptors (`/src/shared/interceptors`)
Implementam interceptadores globais para transformação de respostas e tratamento de erros.

#### Filters (`/src/shared/filters`)
Implementam filtros globais para tratamento de exceções.

#### Logging (`/src/shared/logging`)
Implementa serviços de logging para registro de atividades e erros.

#### Monitoring (`/src/shared/monitoring`)
Implementa serviços de monitoramento para verificação de saúde e métricas do sistema.

## Fluxos de Dados

### Fluxo de Solicitação de Benefício

1. **Cadastro do Cidadão**:
   - O cidadão é cadastrado no sistema com seus dados pessoais, composição familiar, dados sociais e situação de moradia.

2. **Criação da Solicitação**:
   - Uma solicitação de benefício é criada para o cidadão, associada a um tipo de benefício específico.
   - Os dados específicos do benefício são preenchidos conforme o tipo selecionado.

3. **Upload de Documentos**:
   - Os documentos necessários para o benefício são anexados à solicitação.

4. **Análise da Solicitação**:
   - A solicitação passa por um fluxo de análise, com diferentes etapas conforme configurado para o tipo de benefício.
   - Em cada etapa, a solicitação pode ser aprovada, rejeitada ou ter pendências registradas.

5. **Notificação ao Cidadão**:
   - O cidadão é notificado sobre o status da sua solicitação em cada etapa do processo.

6. **Concessão do Benefício**:
   - Após aprovação em todas as etapas, o benefício é concedido ao cidadão.
   - O histórico da solicitação é atualizado com a concessão do benefício.

### Estruturas de Dados Principais

#### Cidadão
```typescript
{
  id: number;
  nome: string;
  cpf: string;
  dataNascimento: Date;
  sexo: string;
  estadoCivil: string;
  telefone: string;
  email: string;
  endereco: string;
  bairro: string;
  cidade: string;
  uf: string;
  cep: string;
  composicaoFamiliar: ComposicaoFamiliar[];
  dadosSociais: DadosSociais;
  situacaoMoradia: SituacaoMoradia;
  solicitacoes: Solicitacao[];
}
```

#### Solicitação
```typescript
{
  id: number;
  numero: string;
  dataRegistro: Date;
  status: StatusSolicitacao;
  cidadao: Cidadao;
  tipoBeneficio: TipoBeneficio;
  unidade: Unidade;
  usuarioRegistro: Usuario;
  dadosBeneficios: DadosBeneficios;
  documentos: Documento[];
  historico: HistoricoSolicitacao[];
  pendencias: Pendencia[];
}
```

#### Tipo de Benefício
```typescript
{
  id: number;
  nome: string;
  descricao: string;
  ativo: boolean;
  fluxos: FluxoBeneficio[];
  requisitosDocumentos: RequisitoDocumento[];
}
```

### Estados e suas Transições

#### Estados da Solicitação
- **REGISTRADA**: Estado inicial após a criação da solicitação.
- **EM_ANALISE**: A solicitação está sendo analisada.
- **PENDENTE**: A solicitação possui pendências que precisam ser resolvidas.
- **APROVADA**: A solicitação foi aprovada em todas as etapas.
- **REJEITADA**: A solicitação foi rejeitada em alguma etapa.
- **CONCEDIDA**: O benefício foi concedido ao cidadão.
- **CANCELADA**: A solicitação foi cancelada.

#### Transições de Estado
- **REGISTRADA → EM_ANALISE**: Quando a solicitação é enviada para análise.
- **EM_ANALISE → PENDENTE**: Quando são identificadas pendências na solicitação.
- **EM_ANALISE → APROVADA**: Quando a solicitação é aprovada em todas as etapas.
- **EM_ANALISE → REJEITADA**: Quando a solicitação é rejeitada em alguma etapa.
- **PENDENTE → EM_ANALISE**: Quando as pendências são resolvidas.
- **APROVADA → CONCEDIDA**: Quando o benefício é concedido ao cidadão.
- **QUALQUER_ESTADO → CANCELADA**: Quando a solicitação é cancelada.

## Guia de Modificação e Extensão

### Onde Adicionar Novos Recursos

#### Novo Tipo de Benefício
1. Adicione o novo tipo de benefício no seed correspondente em `/src/database/seeds`.
2. Configure os fluxos e requisitos de documentos para o novo tipo de benefício.

#### Novo Módulo
1. Crie um novo diretório em `/src/modules` com o nome do módulo.
2. Crie os arquivos necessários seguindo a estrutura padrão:
   - `entities/`: Entidades do módulo
   - `dto/`: DTOs para validação e transferência de dados
   - `controllers/`: Controladores para endpoints da API
   - `services/`: Serviços para lógica de negócio
   - `tests/`: Testes unitários e de integração
3. Crie o arquivo `nome-modulo.module.ts` para configurar o módulo.
4. Importe o novo módulo no `app.module.ts`.

#### Nova Entidade
1. Crie um novo arquivo em `/src/modules/nome-modulo/entities` com o nome da entidade.
2. Defina a entidade utilizando os decoradores do TypeORM.
3. Crie uma migração para adicionar a nova tabela ao banco de dados.

#### Novo Endpoint
1. Adicione o novo método no controlador correspondente.
2. Implemente a lógica de negócio no serviço correspondente.
3. Adicione a documentação Swagger para o novo endpoint.

### Como Modificar Componentes Existentes

#### Modificar uma Entidade
1. Atualize o arquivo da entidade em `/src/modules/nome-modulo/entities`.
2. Crie uma migração para atualizar a tabela no banco de dados.

#### Modificar um Fluxo de Negócio
1. Atualize o serviço correspondente em `/src/modules/nome-modulo/services`.
2. Atualize os testes unitários e de integração para refletir as mudanças.

#### Modificar uma Configuração Global
1. Atualize o arquivo de configuração em `/src/shared/configs`.
2. Verifique se as mudanças afetam outros componentes da aplicação.

### Padrões a Serem Seguidos

#### Padrões de Código
- Siga as convenções de nomenclatura descritas anteriormente.
- Utilize TypeScript com tipos explícitos para todas as variáveis e parâmetros.
- Documente todas as classes, métodos e propriedades com comentários JSDoc.
- Utilize async/await para operações assíncronas.

#### Padrões de API
- Siga os princípios REST para endpoints da API.
- Utilize DTOs para validação e transferência de dados.
- Documente todos os endpoints com Swagger.
- Implemente tratamento de erros adequado.

#### Padrões de Teste
- Escreva testes unitários para serviços e componentes.
- Escreva testes de integração para endpoints da API.
- Utilize mocks e stubs para isolar componentes durante os testes.
- Mantenha a cobertura de testes acima de 80%.

## Anexos Técnicos

### Referência de Configurações

#### Variáveis de Ambiente
O sistema utiliza variáveis de ambiente para configuração. As principais variáveis são:

- `NODE_ENV`: Ambiente de execução (development, production, test)
- `PORT`: Porta em que a aplicação será executada
- `DB_HOST`: Host do banco de dados
- `DB_PORT`: Porta do banco de dados
- `DB_USER`: Usuário do banco de dados
- `DB_PASS`: Senha do banco de dados
- `DB_NAME`: Nome do banco de dados
- `JWT_SECRET`: Chave secreta para assinatura de tokens JWT
- `JWT_EXPIRATION`: Tempo de expiração dos tokens JWT
- `LOG_LEVEL`: Nível de log (debug, info, warn, error)

#### Configuração do TypeORM
A configuração do TypeORM está definida em `/src/ormconfig.ts` e inclui:

- Conexão com o banco de dados PostgreSQL
- Configuração de entidades, migrações e seeds
- Configuração de logging e sincronização

### Dependências Externas e suas Versões

#### Dependências Principais
- **NestJS**: Framework para construção de aplicações Node.js
- **TypeORM**: ORM para interação com o banco de dados
- **PostgreSQL**: Banco de dados relacional
- **Passport**: Biblioteca para autenticação
- **JWT**: Biblioteca para geração e validação de tokens
- **Swagger**: Biblioteca para documentação da API
- **Winston**: Biblioteca para logging
- **Jest**: Framework para testes

#### Dependências de Desenvolvimento
- **TypeScript**: Linguagem de programação
- **ESLint**: Ferramenta de linting
- **Prettier**: Formatador de código
- **Jest**: Framework para testes
- **Supertest**: Biblioteca para testes de API

### Ferramentas de Build e Deploy

#### Scripts NPM
O sistema utiliza scripts NPM para automação de tarefas:

- `npm run build`: Compila o código TypeScript para JavaScript
- `npm run start`: Inicia a aplicação em modo de produção
- `npm run start:dev`: Inicia a aplicação em modo de desenvolvimento com hot-reload
- `npm run start:debug`: Inicia a aplicação em modo de debug
- `npm run test`: Executa os testes unitários
- `npm run test:e2e`: Executa os testes de integração
- `npm run migration:run`: Executa as migrações do banco de dados
- `npm run seed:run`: Executa os seeds do banco de dados

#### Docker
O sistema pode ser executado em contêineres Docker utilizando o script de deploy:

- `./deploy.sh all` ou `deploy.bat all`: Inicia a aplicação e o sistema de monitoramento
- `./deploy.sh start` ou `deploy.bat start`: Inicia apenas a aplicação
- `./deploy.sh monitoring` ou `deploy.bat monitoring`: Inicia apenas o sistema de monitoramento
- `./deploy.sh stop` ou `deploy.bat stop`: Para todos os serviços
- `./deploy.sh status` ou `deploy.bat status`: Mostra o status dos serviços
- `./deploy.sh logs <serviço>` ou `deploy.bat logs <serviço>`: Mostra os logs de um serviço específico
- `./deploy.sh info` ou `deploy.bat info`: Mostra informações de acesso
- `./deploy.sh help` ou `deploy.bat help`: Mostra a ajuda

---

Este documento foi criado para fornecer uma visão abrangente da estrutura de código do Sistema de Gestão de Benefícios Eventuais - Kit Enxoval da SEMTAS. Ele serve como guia para desenvolvedores novos e existentes, facilitando a compreensão, manutenção e extensão do sistema.

## Monitoramento e Observabilidade

O sistema inclui um módulo completo de monitoramento e observabilidade para garantir a confiabilidade, segurança e conformidade com a LGPD.

### Módulo de Métricas (`/src/modules/metricas`)

Responsável pela coleta e exposição de métricas para monitoramento do sistema.

- **Controllers**: Expõem endpoints para métricas e verificação de saúde do sistema.
- **Services**: Implementam a coleta de métricas de HTTP, negócio e sistema.
- **Middlewares**: Interceptam requisições HTTP para coletar métricas automaticamente.

### Componentes de Monitoramento

#### Prometheus
Coleta e armazena métricas do sistema, com regras de alerta configuradas para:
- Métricas da API (erros, latência, requisições)
- Métricas de segurança (falhas de autenticação, acessos não autorizados a dados LGPD)
- Métricas de documentos (operações com documentos sensíveis)
- Métricas de sistema (CPU, memória, disco)
- Métricas de banco de dados (conexões, consultas lentas)

#### Grafana
Visualização de métricas através de dashboards para:
- Visão geral da API
- Segurança e conformidade com LGPD
- Desempenho do banco de dados
- Operações com documentos
- Recursos do sistema

#### Alertmanager
Gerenciamento de alertas com notificações por e-mail e Slack para problemas detectados no sistema.

### Endpoints de Monitoramento

- `/metricas`: Endpoint para coleta de métricas pelo Prometheus
- `/metricas/health`: Endpoint para verificação da saúde do sistema

## Deploy com Docker

O sistema pode ser facilmente implantado usando Docker e Docker Compose. Foram criados scripts de deploy para facilitar este processo.

### Pré-requisitos

- Docker
- Docker Compose

### Estrutura de Deploy

- `docker-compose.yml`: Configuração principal da aplicação (API, PostgreSQL, Redis, MinIO)
- `docs/monitoramento/docker-compose.monitoring.yml`: Configuração do sistema de monitoramento (Prometheus, Grafana, Alertmanager, Exporters)

### Como Implantar

1. Clone o repositório
2. Configure o arquivo `.env` com as variáveis de ambiente necessárias (ou use o script de deploy que criará um arquivo padrão)
3. Execute o script de deploy:

```bash
# No Linux/macOS
./deploy.sh all

# No Windows
deploy.bat all
```

### Acessando os Serviços

- **API PGBen**: http://localhost:3000
- **Interface MinIO**: http://localhost:9001
- **Interface MailHog**: http://localhost:8025
- **Prometheus**: http://localhost:9090
- **Grafana**: http://localhost:3001 (usuário: admin, senha: admin)
- **Alertmanager**: http://localhost:9093
