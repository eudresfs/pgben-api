# ADR-007: Sistema EasyUpload para Captura de Documentos via QR Code

**Status**: Proposto  
**Data**: Janeiro 2025  
**Autores**: Equipe de Desenvolvimento SEMTAS  
**Revisores**: Arquiteto de Software, Product Owner  

## Contexto e Problema

### Situação Atual

No Sistema de Gestão de Benefícios Eventuais da SEMTAS (PGBen), o processo atual de anexação de documentos apresenta sérios problemas operacionais e de segurança:

1. **Fluxo Fragmentado**: Técnicos precisam:
   - Tirar fotos dos documentos com dispositivos pessoais
   - Transferir arquivos para computadores via cabo/email/WhatsApp
   - Fazer upload manual através do módulo de documentos existente
   - Organizar e renomear arquivos manualmente

2. **Riscos de Segurança e Privacidade**:
   - Documentos com dados sensíveis (CPF, RG, comprovantes) ficam temporariamente em dispositivos pessoais
   - Transferência via métodos inseguros (email, WhatsApp)
   - Possível exposição de dados durante o processo
   - Violação potencial da LGPD

3. **Impactos Operacionais**:
   - Tempo médio de 15 minutos para anexar documentos de uma solicitação
   - Interrupção do fluxo de atendimento presencial
   - Erros frequentes na associação documento-solicitação
   - Dependência de conhecimento técnico dos usuários

4. **Problemas de Compliance**:
   - Dificuldade de auditoria sobre onde os documentos estiveram
   - Falta de controle sobre cópias temporárias
   - Não conformidade com princípios de minimização de dados da LGPD

### Impacto nos Stakeholders

- **Técnicos**: Frustração com processo manual demorado
- **Cidadãos**: Atendimento mais lento e menos eficiente
- **SEMTAS**: Risco de compliance e baixa produtividade
- **Gestores**: Dificuldade de monitorar e otimizar processos

## Decisão

### Solução Escolhida: Sistema EasyUpload com QR Code

Implementar um sistema de upload de documentos baseado em tokens únicos acessíveis via QR Code, permitindo captura direta através de dispositivos móveis.

### Arquitetura da Solução

```
[Sistema Desktop] → [Gera Token/QR] → [Interface Mobile] → [Upload Direto] → [Sistema Backend]
```

**Componentes**:
1. **Backend de Tokens**: Geração e validação de tokens seguros
2. **Interface de QR Code**: Integrada ao sistema desktop existente
3. **Endpoint de Upload**: Recepção e processamento de arquivos
4. **Sistema de Notificação**: Feedback em tempo real

## Alternativas Consideradas

### 1. Upload Direto via App Mobile Dedicado
- **Prós**: Experiência nativa, offline capabilities
- **Contras**: Desenvolvimento longo, manutenção de app stores, necessidade de instalação
- **Decisão**: Rejeitada por complexidade e prazo

### 2. Integração com API de WhatsApp Business
- **Prós**: Plataforma já utilizada, familiar aos usuários
- **Contras**: Dependência externa, limitações de API, custos adicionais
- **Decisão**: Rejeitada por dependência e limitações

### 3. Sistema de Email com Links Únicos
- **Prós**: Simples de implementar
- **Contras**: Dependência de email, experiência fragmentada, menos seguro
- **Decisão**: Rejeitada por experiência do usuário inadequada

### 4. Upload via PWA com QR Code (Escolhida)
- **Prós**: Sem instalação, acesso universal, controle total, implementação rápida
- **Contras**: Dependência de browser mobile, necessário internet
- **Decisão**: Aceita por balancear praticidade e controle

## Especificação Técnica

### Arquitetura Backend

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend UI   │────│   EasyUpload    │────│   Documento     │
│                 │    │   Module        │    │   Module        │
│ • Gerar QR      │    │                 │    │                 │
│ • Monitor Status│    │ • JWT Tokens    │    │ • File Upload   │
│ • Feedback SSE  │    │ • Validação     │    │ • Associação    │
│ • Notificações  │    │ • Expiração     │    │ • Criptografia  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │                       │
                                ▼                       ▼
                       ┌─────────────────┐    ┌─────────────────┐
                       │   PostgreSQL    │    │   MinIO Storage │
                       │                 │    │                 │
                       │ • Token Store   │    │ • File Storage  │
                       │ • Sessions      │    │ • Criptografia  │
                       │ • Audit Logs    │    │ • Metadados     │
                       │ • Documentos    │    │ • Versionamento │
                       └─────────────────┘    └─────────────────┘
```

### Modelo de Dados

```sql
-- Tokens de upload temporários (nova tabela)
CREATE TABLE upload_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID NOT NULL REFERENCES usuarios(id),
  solicitacao_id UUID REFERENCES solicitacoes(id),
  cidadao_id UUID REFERENCES cidadaos(id),
  token VARCHAR(255) UNIQUE NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  status upload_token_status DEFAULT 'ATIVO',
  max_files INTEGER DEFAULT 10,
  required_documents JSONB, -- Array de tipos de documentos necessários
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES usuarios(id),
  updated_by UUID REFERENCES usuarios(id)
);

-- Sessões de upload ativas (nova tabela)
CREATE TABLE upload_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token_id UUID NOT NULL REFERENCES upload_tokens(id),
  ip_address INET,
  user_agent TEXT,
  device_fingerprint VARCHAR(255),
  files_uploaded INTEGER DEFAULT 0,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  status VARCHAR(20) DEFAULT 'ATIVA'
);

-- Enum para status de token
CREATE TYPE upload_token_status AS ENUM ('ATIVO', 'USADO', 'EXPIRADO', 'REVOGADO');

-- Índices para performance
CREATE INDEX idx_upload_tokens_usuario_id ON upload_tokens(usuario_id);
CREATE INDEX idx_upload_tokens_solicitacao_id ON upload_tokens(solicitacao_id);
CREATE INDEX idx_upload_tokens_status ON upload_tokens(status);
CREATE INDEX idx_upload_tokens_expires_at ON upload_tokens(expires_at);
CREATE INDEX idx_upload_sessions_token_id ON upload_sessions(token_id);
CREATE INDEX idx_upload_sessions_last_activity ON upload_sessions(last_activity_at);

-- Integração com tabela de documentos existente
-- A tabela 'documentos' já existe e será utilizada para armazenar os arquivos
-- Adicionaremos apenas uma coluna para referenciar o token de upload
ALTER TABLE documentos ADD COLUMN upload_token_id UUID REFERENCES upload_tokens(id);
CREATE INDEX idx_documentos_upload_token_id ON documentos(upload_token_id);
```

### APIs Principais

#### 1. Geração de Token
```http
POST /api/v1/easy-upload/tokens
Authorization: Bearer {jwt}
Content-Type: application/json

{
  "solicitacaoId": "uuid",
  "cidadaoId": "uuid",
  "requiredDocuments": ["RG", "CPF", "COMPROVANTE_RESIDENCIA"],
  "expirationMinutes": 30,
  "maxFiles": 10
}

Response:
{
  "success": true,
  "data": {
    "id": "uuid",
    "token": "eyJ...",
    "uploadUrl": "https://app.semtas.com/upload/eyJ...",
    "qrCodeData": "https://app.semtas.com/upload/eyJ...",
    "expiresAt": "2025-01-15T15:30:00Z",
    "maxFiles": 10,
    "requiredDocuments": ["RG", "CPF", "COMPROVANTE_RESIDENCIA"],
    "status": "ATIVO",
    "context": {
      "solicitacaoId": "uuid",
      "cidadaoId": "uuid"
    }
  },
  "message": "Token de upload gerado com sucesso"
}
```

#### 2. Validação de Token
```http
GET /api/v1/easy-upload/tokens/{token}/validate

Response:
{
  "success": true,
  "data": {
    "id": "uuid",
    "valid": true,
    "expiresAt": "2025-01-15T15:30:00Z",
    "remainingTime": 1800,
    "maxFiles": 10,
    "filesUploaded": 0,
    "remainingFiles": 10,
    "requiredDocuments": ["RG", "CPF", "COMPROVANTE_RESIDENCIA"],
    "uploadedDocuments": [],
    "missingDocuments": ["RG", "CPF", "COMPROVANTE_RESIDENCIA"],
    "status": "ATIVO",
    "context": {
      "solicitacaoId": "uuid",
      "beneficiarioNome": "João Silva",
      "cidadaoId": "uuid"
    }
  },
  "message": "Token válido"
}
```

#### 3. Upload de Arquivo
```http
POST /api/v1/easy-upload/{token}/files
Content-Type: multipart/form-data

file: [binary]
documentType: "RG"
description: "RG do beneficiário"
metadata: {"deviceInfo": "iPhone", "capturedAt": "2025-01-15T14:45:00Z", "page": 1}

Response:
{
  "success": true,
  "data": {
    "id": "uuid",
    "filename": "rg_joao_silva_20250115_144530.jpg",
    "originalName": "IMG_20250115_144530.jpg",
    "size": 2048576,
    "mimeType": "image/jpeg",
    "documentType": "RG",
    "description": "RG do beneficiário",
    "uploadedAt": "2025-01-15T14:45:30Z",
    "checksum": "sha256:abc123...",
    "encrypted": true,
    "virusScanned": true,
    "metadata": {
      "deviceInfo": "iPhone",
      "capturedAt": "2025-01-15T14:45:00Z",
      "page": 1,
      "dimensions": "1920x1080"
    }
  },
  "message": "Arquivo enviado com sucesso"
}
```

#### 4. Status da Sessão
```http
GET /api/v1/easy-upload/sessions/{token}

Response:
{
  "success": true,
  "data": {
    "id": "uuid",
    "tokenId": "uuid",
    "status": "ATIVA",
    "filesUploaded": 1,
    "maxFiles": 10,
    "remainingFiles": 9,
    "remainingTime": 1500,
    "startedAt": "2025-01-15T14:30:00Z",
    "lastActivity": "2025-01-15T14:45:30Z",
    "completedAt": null,
    "requiredDocuments": ["RG", "CPF", "COMPROVANTE_RESIDENCIA"],
    "uploadedDocuments": ["RG"],
    "missingDocuments": ["CPF", "COMPROVANTE_RESIDENCIA"],
    "files": [
      {
        "id": "uuid",
        "filename": "rg_joao_silva_20250115_144530.jpg",
        "originalName": "IMG_20250115_144530.jpg",
        "documentType": "RG",
        "size": 2048576,
        "uploadedAt": "2025-01-15T14:45:30Z",
        "status": "PROCESSADO"
      }
    ],
    "progress": 33.33
  },
  "message": "Status da sessão recuperado com sucesso"
}
```

## Plano de Implementação

### Fase 1: Backend Foundation (Semana 1)
**Objetivo**: Estrutura base funcional

**Entregáveis**:
- [ ] Migrations para tabelas `upload_tokens` e `upload_sessions`
- [ ] Service `UploadTokenService` com geração de JWT
- [ ] Controller `UploadTokenController` com endpoints básicos
- [ ] Middleware de validação de token
- [ ] Configuração de rate limiting (5 tokens/hora por usuário)
- [ ] Integração com `AuthModule` existente
- [ ] Setup do `EasyUploadModule` no NestJS

**Critérios de Aceite**:
- Token é gerado com expiração configurável
- Validação de token funciona corretamente
- Logs de auditoria são criados para todas as operações
- Integração com módulos existentes funciona

### Fase 2: Upload e Armazenamento (Semana 2)
**Objetivo**: Sistema de upload funcional

**Entregáveis**:
- [ ] Endpoint de upload com validação de arquivo
- [ ] Integração com MinIO/S3 existente via `DocumentoModule`
- [ ] Associação automática de documentos à solicitação
- [ ] Sistema de notificação em tempo real via SSE
- [ ] Reutilização de serviços de criptografia existentes
- [ ] Integração com sistema de validação de vírus

**Critérios de Aceite**:
- Upload aceita apenas PDF/JPG/PNG até 5MB
- Arquivos são salvos na estrutura correta
- Notificações chegam ao frontend em tempo real
- Criptografia e validação de vírus funcionam

### Fase 3: Monitoramento e Segurança (Semana 3)
**Objetivo**: Sistema robusto e seguro

**Entregáveis**:
- [ ] Job de limpeza de tokens expirados com `@nestjs/schedule`
- [ ] Sistema de métricas integrado com Prometheus existente
- [ ] Validação avançada de arquivos (magic bytes, scan antivírus)
- [ ] Rate limiting avançado com `@nestjs/throttler`
- [ ] Integração com `AuditoriaModule` para logs
- [ ] Health checks com `@nestjs/terminus`

**Critérios de Aceite**:
- Tokens expirados são limpos automaticamente
- Arquivos maliciosos são rejeitados
- Métricas estão disponíveis para monitoramento
- Logs de auditoria são gerados corretamente

### Fase 4: Integração e Testes (Semana 4)
**Objetivo**: Sistema pronto para produção

**Entregáveis**:
- [ ] Integração com frontend existente
- [ ] Testes unitários e de integração com Jest
- [ ] Testes E2E com fluxo completo
- [ ] Documentação da API (Swagger)
- [ ] Deploy em ambiente de produção
- [ ] Configuração de variáveis de ambiente

**Critérios de Aceite**:
- Sistema suporta 50 uploads simultâneos
- Todos os testes de segurança passam
- Documentação está completa
- Integração com frontend funciona perfeitamente

## Riscos e Mitigações

### Riscos Técnicos

1. **Performance com Múltiplos Uploads**
   - **Risco**: Sistema pode ficar lento com muitos uploads simultâneos
   - **Mitigação**: Implementar queue system (Bull/Redis) para processamento assíncrono
   - **Probabilidade**: Média | **Impacto**: Alto

2. **Segurança de Tokens**
   - **Risco**: Tokens podem ser interceptados ou reutilizados
   - **Mitigação**: JWT com expiração curta, HTTPS obrigatório, rate limiting
   - **Probabilidade**: Baixa | **Impacto**: Alto

3. **Compatibilidade Mobile**
   - **Risco**: Problemas com câmera em diferentes browsers/dispositivos
   - **Mitigação**: Testes extensivos, fallback para upload de galeria
   - **Probabilidade**: Média | **Impacto**: Médio

### Riscos de Negócio

1. **Adoção pelos Usuários**
   - **Risco**: Técnicos podem resistir à mudança de processo
   - **Mitigação**: Treinamento, documentação clara, rollout gradual
   - **Probabilidade**: Baixa | **Impacto**: Alto

2. **Compliance LGPD**
   - **Risco**: Nova funcionalidade pode introduzir riscos de compliance
   - **Mitigação**: Auditoria jurídica, logs detalhados, consentimento explícito
   - **Probabilidade**: Baixa | **Impacto**: Alto

### Planos de Contingência

1. **Fallback Manual**: Manter processo atual como backup
2. **Rollback Rápido**: Script automatizado para reverter deploy
3. **Suporte Dedicado**: Canal específico para problemas urgentes

## Métricas de Sucesso

### Métricas Técnicas
- **Disponibilidade**: > 99.5%
- **Tempo de Response**: < 2s para geração de token, < 30s para upload
- **Taxa de Erro**: < 1% em uploads válidos
- **Throughput**: 50+ uploads simultâneos

### Métricas de Negócio
- **Redução de Tempo**: 15min → 5min por anexação de documentos
- **Taxa de Adoção**: > 80% dos técnicos usando a feature em 30 dias
- **Satisfação**: > 4.5/5 na pesquisa de usuários
- **Redução de Erros**: -50% em documentos associados incorretamente

### Métricas de Segurança
- **Zero Incidentes**: Nenhum vazamento de dados
- **Auditoria**: 100% das operações logadas
- **Compliance**: Aprovação da equipe jurídica/DPO

## Considerações de Segurança

### Controles Implementados

1. **Autenticação e Autorização**
   - JWT tokens com expiração de 30 minutos
   - Validação de sessão ativa do usuário
   - Rate limiting por usuário e IP

2. **Validação de Arquivos**
   - Whitelist de tipos MIME
   - Verificação de magic bytes
   - Scan antivírus (ClamAV integration)
   - Limite de tamanho (5MB)

3. **Auditoria e Monitoramento**
   - Log de todas as operações
   - Rastreamento de IP e User-Agent
   - Alertas para comportamento anômalo
   - Retenção de logs por 2 anos

4. **Proteção de Dados**
   - HTTPS obrigatório
   - Remoção de metadados EXIF
   - Armazenamento criptografado
   - Exclusão automática de tokens expirados

### Compliance LGPD

- **Base Legal**: Execução de política pública (Art. 7º, III)
- **Finalidade**: Prestação de serviços assistenciais
- **Minimização**: Coleta apenas de documentos necessários
- **Transparência**: Aviso sobre coleta e processamento
- **Retenção**: Mesma política do sistema principal (5 anos)

## Dependências

### Internas (Já Disponíveis)
- `AuthModule` com JWT e Guards
- PostgreSQL com TypeORM configurado
- `DocumentoModule` com MinIO/S3 e criptografia
- `NotificacaoModule` com SSE
- `AuditoriaModule` para logs
- `SharedModule` com serviços comuns
- Sistema de métricas Prometheus
- Rate limiting com Redis

### Externas (Já Instaladas)
- `@nestjs/jwt`: ^11.0.0
- `@nestjs/typeorm`: ^11.0.0
- `@nestjs/throttler`: ^6.4.0
- `@nestjs/schedule`: ^6.0.0
- `@nestjs/bull`: ^11.0.2
- `multer` (via `@nestjs/platform-express`)
- `sharp`: ^0.34.1
- `minio`: ^8.0.5
- `clamscan`: ^2.4.0
- `ioredis`: ^5.6.1
- `bull`: ^4.16.5

### Novas Dependências Necessárias
- `qrcode`: Para geração de QR codes
- `@types/qrcode`: Tipos TypeScript

## Estrutura de Implementação

### Estrutura de Módulos NestJS

```
src/modules/easy-upload/
├── easy-upload.module.ts
├── controllers/
│   └── easy-upload.controller.ts
├── services/
│   ├── easy-upload-token.service.ts
│   ├── easy-upload-session.service.ts
│   └── qr-code.service.ts
├── entities/
│   ├── upload-token.entity.ts
│   └── upload-session.entity.ts
├── dto/
│   ├── create-upload-token.dto.ts
│   ├── upload-file.dto.ts
│   └── upload-status.dto.ts
├── guards/
│   └── upload-token.guard.ts
├── interfaces/
│   └── upload-context.interface.ts
└── tests/
    ├── easy-upload.controller.spec.ts
    ├── easy-upload-token.service.spec.ts
    └── easy-upload.integration.spec.ts
```

### Integração com Módulos Existentes

- **DocumentoModule**: Reutilização de serviços de upload e validação
- **AuthModule**: Autenticação JWT e Guards
- **AuditoriaModule**: Logs automáticos de operações
- **NotificacaoModule**: Notificações SSE em tempo real
- **SharedModule**: Serviços comuns e configurações

## Impacto em Outros Sistemas

### Sistemas Afetados
- **Frontend**: Integração do componente QR Code
- **DocumentoModule**: Extensão para suportar upload via token
- **AuditoriaModule**: Novos tipos de log para EasyUpload
- **NotificacaoModule**: Novos eventos SSE para upload
- **MetricasModule**: Novas métricas de upload

### Compatibilidade
- **Backward Compatible**: `DocumentoModule` atual continua funcionando
- **Database**: Novas tabelas `upload_tokens` e `upload_sessions`, coluna adicional em `documentos`
- **APIs**: Novos endpoints em `/api/v1/easy-upload/`, sem mudança nos existentes
- **Módulos**: Novo `EasyUploadModule` independente, sem impacto nos existentes

## Cronograma Detalhado

```
Semana 1: Backend Foundation
├── Dia 1-2: Setup de infraestrutura e models
├── Dia 3-4: Implementação de geração/validação de tokens
└── Dia 5: Testes e ajustes

Semana 2: Upload System
├── Dia 1-2: Endpoint de upload e validações
├── Dia 3-4: Integração com armazenamento
└── Dia 5: Sistema de notificações

Semana 3: Segurança e Monitoramento
├── Dia 1-2: Validações avançadas e antivírus
├── Dia 3-4: Sistema de métricas e limpeza
└── Dia 5: Testes de segurança

Semana 4: Finalização
├── Dia 1-2: Integração frontend
├── Dia 3-4: Testes de carga e documentação
└── Dia 5: Deploy e validação
```

## Aprovação e Revisão

**Aprovado por**:
- [ ] Arquiteto de Software
- [ ] Product Owner
- [ ] Responsável por Segurança/DPO
- [ ] Gerente Técnico

**Próximas Revisões**:
- **Pós-Implementação**: 30 dias após deploy
- **Avaliação de Performance**: 60 dias após deploy
- **Revisão de Segurança**: 90 dias após deploy

---

**Histórico de Mudanças**:

### Versão 2.1 - 2025-01-15
- **Atualização Completa para NestJS**: Documento totalmente adaptado para arquitetura NestJS do PGBen
- **APIs RESTful Modernizadas**: Todos os endpoints atualizados com padrão `/api/v1/easy-upload/`
- **Integração Total com Módulos Existentes**: 
  - `DocumentoModule` para upload e armazenamento
  - `AuthModule` para autenticação JWT
  - `AuditoriaModule` para logs e trilha de auditoria
  - `NotificacaoModule` para SSE e notificações
  - `SharedModule` para utilitários comuns
- **Modelo de Dados TypeORM**: 
  - Entidades `UploadToken` e `UploadSession` com TypeORM
  - Nomenclatura padronizada (usuarios, solicitacoes, cidadaos)
  - Índices otimizados para performance
  - Integração com tabela `documentos` existente
- **Plano de Implementação Atualizado**: 
  - Fases adaptadas para reutilização máxima de código
  - Integração com ferramentas existentes (Redis, MinIO, ClamAV)
  - Uso de decorators NestJS e class-validator
- **Notificações em Tempo Real**: Implementação de SSE para atualizações em tempo real
- **Segurança Aprimorada**: Integração com sistema de criptografia e validação de vírus existente

### Versão 2.0 - 2025-01-15
- **Adaptação para Arquitetura NestJS**: Documento adaptado para refletir a arquitetura NestJS existente do PGBen
- **Integração com Módulos Existentes**: Especificada integração com DocumentoModule, AuthModule, AuditoriaModule, NotificacaoModule e SharedModule
- **Atualização do Modelo de Dados**: Adaptado para TypeORM com nomenclatura padrão do sistema
- **Modernização das APIs**: Endpoints atualizados para padrão RESTful com respostas mais detalhadas
- **Otimização de Dependências**: Listadas apenas dependências necessárias, reutilizando bibliotecas existentes
- **Estrutura de Módulos**: Definida estrutura completa do módulo easy-upload com controladores, serviços, entidades, DTOs, guards e interfaces

### Versão 1.1 - 2025-01-10
- Adicionado cronograma detalhado e métricas de segurança
- Especificação de riscos e mitigações
- Plano de implementação em fases

### Versão 1.0 - 2025-01-10
- Versão inicial do documento
- Definição do problema e solução proposta
- Especificação técnica inicial
- Modelo de dados básico
- APIs principais definidas