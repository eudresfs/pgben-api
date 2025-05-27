# Plano de Ação - Implementação de Recursos Faltantes

## 1. Visão Geral

Este documento descreve o plano detalhado para implementação dos seguintes itens:

1. Recurso de Primeira Instância (FR-006.5)
2. Painéis de Controle (FR-007.3)
3. Interface de Logs (FR-008.4)
4. Gestão de Setores (FR-001.5)

### 1.1 Contexto do Projeto

O Sistema de Gestão de Benefícios Eventuais (PGBen) é uma plataforma para gerenciamento de benefícios sociais temporários concedidos pelo poder público. O sistema já possui funcionalidades básicas implementadas, mas necessita de aprimoramentos para atender completamente aos requisitos funcionais estabelecidos.

### 1.2 Objetivos do MVP

- Implementar o recurso de primeira instância para garantir o direito de defesa dos cidadãos
- Aprimorar os painéis de controle para melhor visualização de dados e tomada de decisão
- Criar interface de logs para auditoria e rastreabilidade
- Melhorar a gestão de setores com hierarquia e integração com permissões do módulo auth (src/auth)

### 1.3 Stakeholders

- Gestores municipais: Necessitam de dashboards e relatórios
- Técnicos sociais: Utilizam o sistema para análise de solicitações e recursos
- Cidadãos: Precisam acompanhar solicitações e interpor recursos
- Auditores: Necessitam de logs e rastreabilidade

## 2. Estrutura do Banco de Dados

### 2.1 Tabela de Recursos

```sql
CREATE TABLE recurso (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    solicitacao_id UUID NOT NULL REFERENCES solicitacao(id),
    justificativa TEXT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDENTE',
    data_criacao TIMESTAMP NOT NULL DEFAULT NOW(),
    data_analise TIMESTAMP,
    analista_id UUID REFERENCES usuario(id),
    parecer TEXT,
    documentos_adicionais JSONB, -- Documentos adicionais enviados pelo cidadão
    motivo_indeferimento VARCHAR(100), -- Motivo do indeferimento original
    prazo_analise INTEGER NOT NULL DEFAULT 5, -- Prazo em dias úteis para análise
    setor_responsavel_id UUID REFERENCES setor(id),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Tabela de histórico de recursos
CREATE TABLE recurso_historico (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    recurso_id UUID NOT NULL REFERENCES recurso(id),
    status_anterior VARCHAR(20) NOT NULL,
    status_novo VARCHAR(20) NOT NULL,
    usuario_id UUID REFERENCES usuario(id),
    observacao TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Índices para melhorar performance
CREATE INDEX idx_recurso_solicitacao_id ON recurso(solicitacao_id);
CREATE INDEX idx_recurso_status ON recurso(status);
CREATE INDEX idx_recurso_setor ON recurso(setor_responsavel_id);
CREATE INDEX idx_recurso_analista ON recurso(analista_id);
CREATE INDEX idx_recurso_historico_recurso ON recurso_historico(recurso_id);
```

#### 2.1.1 Regras de Negócio - Recursos

1. **Prazos**:
   - O cidadão tem até 10 dias úteis após o indeferimento para interpor recurso
   - A análise do recurso deve ser realizada em até 5 dias úteis (configurável)
   - Recursos não analisados no prazo são escalados automaticamente

2. **Estados do Recurso**:
   - `PENDENTE`: Aguardando análise
   - `EM_ANALISE`: Em processo de análise
   - `DEFERIDO`: Recurso aceito
   - `INDEFERIDO`: Recurso negado
   - `CANCELADO`: Cancelado pelo cidadão

3. **Fluxo de Trabalho**:
   - Cidadão submete recurso → Status PENDENTE
   - Técnico inicia análise → Status EM_ANALISE
   - Técnico conclui análise → Status DEFERIDO ou INDEFERIDO
   - Se DEFERIDO → Solicitação original é reaberta e aprovada
   - Se INDEFERIDO → Processo é encerrado

### 2.2 Tabela de Logs de Auditoria

```sql
CREATE TABLE log_auditoria (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    usuario_id UUID REFERENCES usuario(id),
    acao VARCHAR(100) NOT NULL,
    entidade VARCHAR(50) NOT NULL,
    entidade_id VARCHAR(36),
    dados_anteriores JSONB,
    dados_novos JSONB,
    ip_address VARCHAR(45),
    user_agent TEXT,
    modulo VARCHAR(50), -- Módulo do sistema
    criticidade VARCHAR(20) NOT NULL DEFAULT 'NORMAL', -- BAIXA, NORMAL, ALTA, CRITICA
    detalhes TEXT, -- Detalhes adicionais sobre a ação
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Tabela para categorização de logs
CREATE TABLE categoria_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nome VARCHAR(100) NOT NULL,
    descricao TEXT,
    cor VARCHAR(7) DEFAULT '#CCCCCC', -- Código de cor para interface
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Relação entre logs e categorias
CREATE TABLE log_categoria (
    log_id UUID NOT NULL REFERENCES log_auditoria(id),
    categoria_id UUID NOT NULL REFERENCES categoria_log(id),
    PRIMARY KEY (log_id, categoria_id)
);

-- Índices para consultas frequentes
CREATE INDEX idx_log_auditoria_entidade ON log_auditoria(entidade, entidade_id);
CREATE INDEX idx_log_auditoria_usuario ON log_auditoria(usuario_id);
CREATE INDEX idx_log_auditoria_data ON log_auditoria(created_at);
CREATE INDEX idx_log_auditoria_criticidade ON log_auditoria(criticidade);
CREATE INDEX idx_log_auditoria_modulo ON log_auditoria(modulo);
```

#### 2.2.1 Regras de Negócio - Logs

1. **Retenção de Dados**:
   - Logs críticos: retenção por 5 anos
   - Logs normais: retenção por 1 ano
   - Logs de baixa criticidade: retenção por 3 meses

2. **Categorias de Logs**:
   - Segurança: Tentativas de login, alterações de permissões
   - Operação: Criação/alteração de registros
   - Sistema: Erros, avisos, informações
   - Auditoria: Ações de auditores, alterações em configurações

3. **Acesso aos Logs**:
   - Administradores: acesso completo
   - Auditores: acesso de leitura a todos os logs
   - Gestores: acesso a logs operacionais de suas unidades
   - Técnicos: sem acesso aos logs

## 3. Implementação da API

### 3.1 Módulo de Recursos

#### 3.1.1 Estrutura de Pastas
```
src/modules/recurso/
├── controllers/
│   └── recurso.controller.ts
├── services/
│   └── recurso.service.ts
├── dto/
│   ├── create-recurso.dto.ts
│   ├── update-recurso.dto.ts
│   └── recurso-response.dto.ts
├── entities/
│   └── recurso.entity.ts
└── recurso.module.ts
```

#### 3.1.2 Endpoints da API

| Método | Endpoint | Descrição | Permissão Necessária |
|--------|----------|-----------|----------------------|
| POST   | /api/recursos | Cria novo recurso | recurso:criar |
| GET    | /api/recursos | Lista recursos (com filtros) | recurso:ler |
| GET    | /api/recursos/:id | Obtém detalhes de um recurso | recurso:ler |
| PUT    | /api/recursos/:id/analisar | Analisa um recurso | recurso:analisar |
| GET    | /api/solicitacoes/:id/recursos | Lista recursos de uma solicitação | recurso:ler |

### 3.2 Módulo de Painéis de Controle

#### 3.2.1 Estrutura de Pastas
```
src/modules/dashboard/
├── controllers/
│   └── dashboard.controller.ts
├── services/
│   └── dashboard.service.ts
├── dto/
│   └── dashboard-filters.dto.ts
└── dashboard.module.ts
```

#### 3.2.2 Endpoints da API

| Método | Endpoint | Descrição | Permissão Necessária |
|--------|----------|-----------|----------------------|
| GET    | /api/dashboard/resumo | Resumo geral | dashboard:ler |
| GET    | /api/dashboard/graficos | Dados para gráficos | dashboard:ler |
| GET    | /api/dashboard/indicadores | KPIs do sistema | dashboard:ler |

### 3.3 Módulo de Logs

#### 3.3.1 Estrutura de Pastas
```
src/modules/logs/
├── controllers/
│   └── logs.controller.ts
├── services/
│   └── logs.service.ts
├── dto/
│   ├── logs-filter.dto.ts
│   └── log-response.dto.ts
└── logs.module.ts
```

#### 3.3.2 Endpoints da API

| Método | Endpoint | Descrição | Permissão Necessária |
|--------|----------|-----------|----------------------|
| GET    | /api/logs | Lista logs (com filtros) | log:ler |
| GET    | /api/logs/exportar | Exporta logs | log:exportar |
| GET    | /api/logs/entidades | Lista entidades auditáveis | log:ler |

## 4. Sistema de Permissões

### 4.1 Permissões Necessárias

```typescript
export enum PermissionAction {
  // Recursos
  RECURSO_CRIAR = 'recurso:criar',
  RECURSO_LER = 'recurso:ler',
  RECURSO_ANALISAR = 'recurso:analisar',
  
  // Dashboard
  DASHBOARD_LER = 'dashboard:ler',
  
  // Logs
  LOG_LER = 'log:ler',
  LOG_EXPORTAR = 'log:exportar',
  
  // Setores
  SETOR_CRIAR = 'setor:criar',
  SETOR_LER = 'setor:ler',
  SETOR_ATUALIZAR = 'setor:atualizar',
  SETOR_EXCLUIR = 'setor:excluir'
}
```

### 4.2 Papéis e Suas Permissões

| Papel | Permissões |
|-------|------------|
| ADMIN | Todas as permissões |
| GESTOR | recurso:*, dashboard:*, log:ler, setor:* |
| TECNICO | recurso:ler, recurso:criar, dashboard:ler |
| CIDADÃO | recurso:criar (próprio) |

## 5. Cronograma de Implementação

### Fase 1: Infraestrutura (2 semanas)
- [x] Criar migrações do banco de dados
- [x] Implementar entidades e repositórios
- [x] Configurar módulos básicos

### Fase 2: Módulo de Recursos (3 semanas)
- [x] Implementar serviços e controladores
- [x] Criar DTOs e validações
- [x] Implementar regras de negócio
- [ ] Criar testes unitários e de integração

### Fase 3: Painéis de Controle (2 semanas)
- [x] Desenvolver serviços de agregação de dados
- [x] Implementar endpoints da API
- [ ] Criar testes

### Fase 4: Módulo de Logs (1 semana)
- [x] Implementar serviço de consulta de logs
- [x] Criar endpoints de exportação
- [x] Implementar filtros avançados

### Fase 5: Melhorias na Gestão de Setores (2 semanas)
- [ ] Atualizar modelo de dados
- [ ] Implementar hierarquia de setores
- [ ] Integrar com sistema de permissões

### Fase 6: Testes e Ajustes (2 semanas)
- [ ] Testes de integração
- [ ] Testes de carga
- [ ] Ajustes de performance
- [ ] Documentação da API

## 6. Considerações de Segurança

1. **Validação de Entrada**: Todas as entradas devem ser validadas
2. **Autorização**: Verificar permissões em todos os endpoints
3. **Auditoria**: Registrar todas as ações importantes
4. **Rate Limiting**: Implementar limitação de requisições
5. **Logs**: Registrar tentativas de acesso não autorizado

## 7. Resumo da Implementação

### 7.1 Módulo de Recursos de Primeira Instância

Implementamos o módulo completo para gerenciamento de recursos de primeira instância, que permite aos cidadãos contestar decisões de indeferimento de solicitações de benefícios. O módulo inclui:

1. **Entidades e Banco de Dados**:
   - Tabela `recurso` para armazenar os recursos
   - Tabela `recurso_historico` para rastrear mudanças de status
   - Migrações para criar as tabelas e adicionar permissões

2. **API Completa**:
   - Endpoints para criar, listar, visualizar e analisar recursos
   - Filtros avançados para busca
   - Integração com o sistema de permissões

3. **Regras de Negócio**:
   - Fluxo de trabalho para análise de recursos
   - Validações e controle de acesso
   - Integração com o módulo de solicitações

### 7.2 Painéis de Controle (Dashboard)

Implementamos melhorias no módulo de dashboard para fornecer métricas e visualizações mais completas:

1. **Serviço de Dashboard**:
   - Agregação de dados para resumo
   - Cálculo de KPIs importantes
   - Dados para gráficos e visualizações

2. **API de Dashboard**:
   - Endpoints para resumo, KPIs e gráficos
   - Integração com o sistema de permissões
   - Documentação via Swagger

### 7.3 Módulo de Logs

Implementamos um módulo completo para gerenciamento de logs de auditoria:

1. **Entidades e Banco de Dados**:
   - Melhorias na tabela `log_auditoria`
   - Nova tabela `categoria_log` para categorização
   - Migrações para criar tabelas e adicionar permissões

2. **API de Logs**:
   - Endpoints para listar, filtrar e exportar logs
   - Filtros avançados por entidade, usuário, ação, etc.
   - Exportação para CSV

## 8. Próximos Passos

1. Implementar testes unitários e de integração
2. Implementar melhorias na gestão de setores
3. Realizar testes de carga e ajustes de performance
4. Completar a documentação da API
5. Realizar treinamento para os usuários
