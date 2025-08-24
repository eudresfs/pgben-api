# FAQ - Sistema de Aprovação de Ações Críticas

## 📋 Índice

1. [Visão Geral](#visão-geral)
2. [Pré-requisitos e Configuração Inicial](#pré-requisitos-e-configuração-inicial)
3. [Aprovadores](#aprovadores)
4. [Solicitações de Aprovação](#solicitações-de-aprovação)
5. [Processo de Aprovação](#processo-de-aprovação)
6. [Integração com Outros Módulos](#integração-com-outros-módulos)
7. [Análise e Monitoramento](#análise-e-monitoramento)
8. [Notificações](#notificações)
9. [Troubleshooting](#troubleshooting)

---

## 🎯 Visão Geral

### O que é o Sistema de Aprovação?

O Sistema de Aprovação de Ações Críticas é um módulo genérico que permite controlar e auditar ações sensíveis no sistema PGBen. Ele garante que operações críticas passem por um processo de aprovação antes de serem executadas.

### Quais ações podem ser aprovadas?

- Cancelamento de concessões de benefícios
- Alterações em dados críticos de cidadãos
- Operações financeiras sensíveis
- Mudanças em configurações do sistema
- Qualquer ação configurada como crítica

---

## ⚙️ Pré-requisitos e Configuração Inicial

### Dependências Necessárias

Antes de criar aprovadores e solicitações, certifique-se de que os seguintes componentes estão configurados:

#### 1. Configuração de Aprovação

**Primeiro, você precisa criar uma configuração de aprovação:**

**Endpoint:** `POST /api/v1/aprovacao/configuracao/configuracoes`

```json
{
  "nome": "Aprovação de Cancelamento de Concessões",
  "descricao": "Configuração para aprovação de cancelamentos de benefícios",
  "tipo_acao": "CANCELAR_CONCESSAO",
  "estrategia": "SEQUENCIAL",
  "ativo": true,
  "configuracoes": {
    "requer_unanimidade": false,
    "permite_auto_aprovacao": true,
    "limite_auto_aprovacao": 1000.00,
    "prazo_padrao_horas": 72,
    "escalacao_automatica": true
  }
}
```

**Estratégias disponíveis:**
- `SEQUENCIAL`: Aprovadores devem aprovar em ordem específica
- `PARALELO`: Todos os aprovadores podem aprovar simultaneamente
- `MAIORIA`: Requer aprovação da maioria dos aprovadores
- `UNANIMIDADE`: Requer aprovação de todos os aprovadores
- `HIERARQUICO`: Baseado na hierarquia organizacional
- `PONDERADO`: Baseado em pesos atribuídos aos aprovadores

#### 2. Verificar Configurações Existentes

**Endpoint:** `GET /api/v1/aprovacao/configuracao/configuracoes`

```bash
curl -X GET "http://localhost:3000/api/v1/aprovacao/configuracao/configuracoes" \
  -H "Authorization: Bearer seu-token"
```

**Resposta esperada:**
```json
{
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "nome": "Aprovação de Cancelamento de Concessões",
      "tipo_acao": "CANCELAR_CONCESSAO",
      "estrategia": "SEQUENCIAL",
      "ativo": true,
      "created_at": "2024-01-15T10:00:00Z"
    }
  ],
  "total": 1
}
```

#### 3. Validação de Usuários

Antes de criar aprovadores do tipo `USUARIO`, verifique se os usuários existem:

**Endpoint:** `GET /api/v1/usuarios/:id`

#### 4. Validação de Perfis e Unidades

Para aprovadores dos tipos `PERFIL` ou `UNIDADE`:

**Perfis:** `GET /api/v1/perfis`
**Unidades:** `GET /api/v1/unidades`

### Fluxo de Configuração Inicial

#### Ordem Obrigatória de Criação

**🔢 Passo 1: Criar Configuração de Aprovação**
```bash
# OBRIGATÓRIO: Criar configuração primeiro
POST /api/v1/aprovacao/configuracao/configuracoes

# ✅ Anotar o ID retornado (ex: 550e8400-e29b-41d4-a716-446655440000)
# ❌ SEM ISSO: Não é possível criar aprovadores
```

**🔢 Passo 2: Validar Recursos Dependentes**
```bash
# Para aprovador tipo USUARIO: verificar se usuário existe
GET /api/v1/usuarios/123e4567-e89b-12d3-a456-426614174001

# Para aprovador tipo PERFIL: verificar se perfil existe
GET /api/v1/perfis/SUPERVISOR

# Para aprovador tipo UNIDADE: verificar se unidade existe
GET /api/v1/unidades/DIRETORIA_TECNICA
```

**🔢 Passo 3: Criar Aprovadores**
```bash
# USAR o ID da configuração do Passo 1
POST /api/v1/aprovacao/aprovadores
{
  "configuracao_aprovacao_id": "550e8400-e29b-41d4-a716-446655440000",
  "tipo": "USUARIO",
  "usuario_id": "123e4567-e89b-12d3-a456-426614174001"
}
```

**🔢 Passo 4: Testar o Fluxo**
```bash
# Verificar se ação requer aprovação
POST /api/v1/aprovacao/verificar
{
  "acao": "CANCELAR_CONCESSAO",
  "usuario_id": "123e4567-e89b-12d3-a456-426614174001",
  "dados": { "beneficio_id": "uuid-do-beneficio" }
}
```

#### ⚠️ Dependências Críticas

**Antes de criar APROVADORES:**
- ✅ Configuração de aprovação deve existir
- ✅ Usuário/Perfil/Unidade deve existir (conforme tipo)
- ✅ Permissões adequadas no token de autenticação

**Antes de criar SOLICITAÇÕES:**
- ✅ Configuração de aprovação ativa
- ✅ Pelo menos um aprovador ativo na configuração
- ✅ Ação crítica deve estar mapeada no sistema

**Antes de APROVAR/REJEITAR:**
- ✅ Solicitação deve estar com status PENDENTE
- ✅ Usuário deve ser aprovador válido para a configuração
- ✅ Usuário deve ter permissões de aprovação

### Configurações de Ambiente

#### Variáveis de Ambiente Necessárias

```env
# Redis para filas de processamento
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=sua-senha

# Email para notificações
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=seu-email@gmail.com
SMTP_PASS=sua-senha

# WebSocket para notificações em tempo real
WEBSOCKET_ENABLED=true
WEBSOCKET_PORT=3001
```

#### Verificação de Saúde do Sistema

**Endpoint:** `GET /api/v1/aprovacao/health`

```json
{
  "status": "healthy",
  "services": {
    "database": "connected",
    "redis": "connected",
    "email": "configured",
    "websocket": "active"
  },
  "timestamp": "2024-01-15T10:00:00Z"
}
```

### Permissões Necessárias

#### Para Criar Aprovadores
- Permissão: `aprovacao:aprovadores:create`
- Perfil mínimo: `GESTOR_APROVACAO`

#### Para Criar Solicitações
- Permissão: `aprovacao:solicitacoes:create`
- Perfil mínimo: `USUARIO_SISTEMA`

#### Para Aprovar/Rejeitar
- Permissão: `aprovacao:solicitacoes:approve`
- Deve estar cadastrado como aprovador ativo

### Troubleshooting de Configuração

#### Erro: "Configuração de aprovação não encontrada"
```bash
# Verificar se existem configurações
GET /api/v1/aprovacao/configuracao/configuracoes

# Se vazio, criar uma configuração primeiro
POST /api/v1/aprovacao/configuracao/configuracoes
```

#### Erro: "Usuário não encontrado"
```bash
# Verificar se usuário existe
GET /api/v1/usuarios/{usuario_id}

# Se não existir, criar usuário primeiro ou usar ID válido
```

#### Erro: "Redis não conectado"
```bash
# Verificar se Redis está rodando
redis-cli ping

# Deve retornar: PONG
```

### 📋 Checklist de Validação

#### Antes de Criar Aprovadores

```bash
# ✅ 1. Verificar se configuração existe
GET /api/v1/aprovacao/configuracao/configuracoes
# Deve retornar pelo menos uma configuração ativa

# ✅ 2. Verificar se usuário existe (para tipo USUARIO)
GET /api/v1/usuarios/{usuario_id}
# Deve retornar status 200 com dados do usuário

# ✅ 3. Verificar permissões do token
GET /api/v1/auth/me
# Deve incluir permissão: aprovacao:aprovadores:create

# ✅ 4. Testar criação de aprovador
POST /api/v1/aprovacao/aprovadores
# Payload mínimo válido
```

#### Antes de Criar Solicitações

```bash
# ✅ 1. Verificar se existe configuração ativa para a ação
GET /api/v1/aprovacao/configuracao/configuracoes?tipo_acao=CANCELAR_CONCESSAO
# Deve retornar configuração com ativo=true

# ✅ 2. Verificar se existem aprovadores ativos
GET /api/v1/aprovacao/aprovadores?configuracao_id={config_id}&ativo=true
# Deve retornar pelo menos um aprovador

# ✅ 3. Verificar se ação requer aprovação
POST /api/v1/aprovacao/verificar
# Deve retornar requer_aprovacao=true

# ✅ 4. Testar criação de solicitação
POST /api/v1/aprovacao/solicitacoes
# Payload com dados da ação crítica
```

#### Comandos Úteis de Diagnóstico

```bash
# 🔍 Listar todas as configurações
GET /api/v1/aprovacao/configuracao/configuracoes

# 🔍 Listar aprovadores por configuração
GET /api/v1/aprovacao/aprovadores?configuracao_id={id}

# 🔍 Verificar status do sistema
GET /api/v1/aprovacao/health

# 🔍 Listar solicitações pendentes
GET /api/v1/aprovacao/solicitacoes?status=PENDENTE

# 🔍 Verificar métricas do sistema
GET /api/v1/aprovacao/metricas

# 🔍 Testar notificações
POST /api/v1/aprovacao/notificacoes/teste
```

### 🎯 Cenários Comuns de Configuração

#### Cenário 1: Aprovação Simples (Um Aprovador)

```bash
# 1. Criar configuração
POST /api/v1/aprovacao/configuracao/configuracoes
{
  "nome": "Aprovação Simples - Cancelamento",
  "tipo_acao": "CANCELAR_CONCESSAO",
  "estrategia": "QUALQUER_UM",
  "ativo": true
}

# 2. Criar aprovador
POST /api/v1/aprovacao/aprovadores
{
  "configuracao_aprovacao_id": "{config_id}",
  "tipo": "USUARIO",
  "usuario_id": "{supervisor_id}",
  "ativo": true
}
```

#### Cenário 2: Aprovação Hierárquica (Múltiplos Níveis)

```bash
# 1. Criar configuração
POST /api/v1/aprovacao/configuracao/configuracoes
{
  "nome": "Aprovação Hierárquica - Alto Valor",
  "tipo_acao": "CANCELAR_CONCESSAO",
  "estrategia": "SEQUENCIAL",
  "ativo": true,
  "configuracoes": {
    "prazo_padrao_horas": 48,
    "escalacao_automatica": true
  }
}

# 2. Criar aprovador nível 1 (Supervisor)
POST /api/v1/aprovacao/aprovadores
{
  "configuracao_aprovacao_id": "{config_id}",
  "tipo": "PERFIL",
  "perfil_id": "SUPERVISOR",
  "ordem": 1,
  "limite_valor": 5000.00,
  "ativo": true
}

# 3. Criar aprovador nível 2 (Gerente)
POST /api/v1/aprovacao/aprovadores
{
  "configuracao_aprovacao_id": "{config_id}",
  "tipo": "PERFIL",
  "perfil_id": "GERENTE",
  "ordem": 2,
  "limite_valor": 50000.00,
  "ativo": true
}
```

#### Cenário 3: Aprovação por Unidade

```bash
# 1. Criar configuração
POST /api/v1/aprovacao/configuracao/configuracoes
{
  "nome": "Aprovação por Unidade",
  "tipo_acao": "CANCELAR_CONCESSAO",
  "estrategia": "MAIORIA",
  "ativo": true
}

# 2. Criar aprovadores por unidade
POST /api/v1/aprovacao/aprovadores
{
  "configuracao_aprovacao_id": "{config_id}",
  "tipo": "UNIDADE",
  "unidade_id": "DIRETORIA_BENEFICIOS",
  "peso": 2.0,
  "ativo": true
}

POST /api/v1/aprovacao/aprovadores
{
  "configuracao_aprovacao_id": "{config_id}",
  "tipo": "UNIDADE",
  "unidade_id": "DIRETORIA_JURIDICA",
  "peso": 1.5,
  "ativo": true
}
```

### 🚀 Script de Configuração Completa

```bash
#!/bin/bash
# Script para configurar aprovação de cancelamento de concessões

API_BASE="http://localhost:3000/api/v1"
TOKEN="seu-jwt-token"

echo "🔧 Configurando sistema de aprovação..."

# 1. Verificar saúde do sistema
echo "📊 Verificando saúde do sistema..."
curl -X GET "$API_BASE/aprovacao/health" \
  -H "Authorization: Bearer $TOKEN"

# 2. Criar configuração de aprovação
echo "⚙️ Criando configuração de aprovação..."
CONFIG_RESPONSE=$(curl -X POST "$API_BASE/aprovacao/configuracao/configuracoes" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "nome": "Aprovação Cancelamento Concessões",
    "tipo_acao": "CANCELAR_CONCESSAO",
    "estrategia": "SEQUENCIAL",
    "ativo": true,
    "configuracoes": {
      "prazo_padrao_horas": 72,
      "escalacao_automatica": true
    }
  }')

# Extrair ID da configuração
CONFIG_ID=$(echo $CONFIG_RESPONSE | jq -r '.id')
echo "✅ Configuração criada: $CONFIG_ID"

# 3. Criar aprovador supervisor
echo "👤 Criando aprovador supervisor..."
curl -X POST "$API_BASE/aprovacao/aprovadores" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"configuracao_aprovacao_id\": \"$CONFIG_ID\",
    \"tipo\": \"PERFIL\",
    \"perfil_id\": \"SUPERVISOR\",
    \"ordem\": 1,
    \"limite_valor\": 10000.00,
    \"ativo\": true
  }"

# 4. Criar aprovador gerente
echo "👤 Criando aprovador gerente..."
curl -X POST "$API_BASE/aprovacao/aprovadores" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"configuracao_aprovacao_id\": \"$CONFIG_ID\",
    \"tipo\": \"PERFIL\",
    \"perfil_id\": \"GERENTE\",
    \"ordem\": 2,
    \"limite_valor\": 100000.00,
    \"ativo\": true
  }"

# 5. Verificar configuração
echo "🔍 Verificando configuração final..."
curl -X GET "$API_BASE/aprovacao/aprovadores?configuracao_id=$CONFIG_ID" \
  -H "Authorization: Bearer $TOKEN"

echo "🎉 Configuração concluída!"
```

---

## 👥 Aprovadores

### Como criar um aprovador?

**Endpoint:** `POST /api/v1/aprovacao/aprovadores`

```json
{
  "configuracao_aprovacao_id": "123e4567-e89b-12d3-a456-426614174000",
  "tipo": "USUARIO",
  "usuario_id": "123e4567-e89b-12d3-a456-426614174001",
  "ativo": true,
  "ordem": 1,
  "limite_valor": 10000.00
}
```

**Tipos de aprovador disponíveis:**
- `USUARIO`: Aprovador específico (requer `usuario_id`)
- `PERFIL`: Qualquer usuário com o perfil (requer `perfil_id`)
- `UNIDADE`: Qualquer usuário da unidade (requer `unidade_id`)
- `HIERARQUIA`: Baseado na hierarquia organizacional (requer `hierarquia_id`)

**Campos obrigatórios:**
- `configuracao_aprovacao_id`: UUID da configuração de aprovação
- `tipo`: Valor do enum TipoAprovador

**Campos opcionais:**
- `usuario_id`: UUID do usuário (quando tipo = USUARIO)
- `perfil_id`: ID do perfil (quando tipo = PERFIL)
- `unidade_id`: ID da unidade (quando tipo = UNIDADE)
- `hierarquia_id`: ID da hierarquia (quando tipo = HIERARQUIA)
- `ativo`: Boolean (padrão: true)
- `ordem`: Número para estratégia sequencial (1-100)
- `peso`: Peso para estratégia ponderada (0.1-10.0)
- `limite_valor`: Limite máximo de valor que pode aprovar
- `horario_funcionamento`: Configuração de horário
- `canais_notificacao`: Array de canais preferidos
- `configuracoes`: Configurações específicas
- `metadados`: Metadados adicionais

### Como listar aprovadores?

**Endpoint:** `GET /api/v1/aprovacao/aprovadores`

**Parâmetros de consulta:**
- `ativo`: Filtrar por status ativo/inativo
- `area_competencia`: Filtrar por área de competência
- `nivel_aprovacao`: Filtrar por nível
- `page`: Página (padrão: 1)
- `limit`: Itens por página (padrão: 10)

### Como atualizar um aprovador?

**Endpoint:** `PUT /api/v1/aprovacao/aprovadores/:id`

```json
{
  "nivel_aprovacao": 2,
  "areas_competencia": ["BENEFICIO", "FINANCEIRO", "JUDICIAL"],
  "limite_valor": 25000.00,
  "ativo": true
}
```

### Como desativar um aprovador?

**Endpoint:** `DELETE /api/v1/aprovacao/aprovadores/:id`

Ou atualizar com `"ativo": false`

---

## 📝 Solicitações de Aprovação

### Como criar uma solicitação de aprovação?

**Endpoint:** `POST /api/v1/aprovacao/solicitacoes`

```json
{
  "tipo_acao": "CANCELAR_CONCESSAO",
  "descricao": "Cancelamento de concessão por inconsistência nos dados",
  "dados_acao": {
    "beneficio_id": "uuid-do-beneficio",
    "motivo": "Documentação irregular",
    "valor_impacto": 5000.00
  },
  "justificativa": "Detectada inconsistência na documentação apresentada",
  "prioridade": "ALTA",
  "prazo_aprovacao": "2024-12-31T23:59:59Z",
  "aprovadores": ["uuid-aprovador-1", "uuid-aprovador-2"]
}
```

**Campos obrigatórios:**
- `tipo_acao`: Tipo da ação a ser aprovada
- `descricao`: Descrição da solicitação
- `dados_acao`: Dados específicos da ação
- `justificativa`: Justificativa para a solicitação

### Como listar solicitações?

**Endpoint:** `GET /api/v1/aprovacao/solicitacoes`

**Parâmetros de consulta:**
- `status`: PENDENTE, APROVADA, REJEITADA, CANCELADA
- `tipo_acao`: Filtrar por tipo de ação
- `solicitante_id`: Filtrar por solicitante
- `aprovador_id`: Filtrar por aprovador
- `data_inicio`: Data inicial (ISO 8601)
- `data_fim`: Data final (ISO 8601)
- `prioridade`: BAIXA, MEDIA, ALTA, CRITICA
- `page`: Página
- `limit`: Itens por página

### Como buscar uma solicitação específica?

**Endpoint:** `GET /api/v1/aprovacao/solicitacoes/:id`

Retorna todos os detalhes da solicitação, incluindo histórico de aprovações.

### Como cancelar uma solicitação?

**Endpoint:** `DELETE /api/v1/aprovacao/solicitacoes/:id`

```json
{
  "motivo_cancelamento": "Solicitação criada por engano"
}
```

---

## ✅ Processo de Aprovação

### Como aprovar uma solicitação?

**Endpoint:** `POST /api/v1/aprovacao/solicitacoes/:id/aprovar`

```json
{
  "aprovador_id": "uuid-do-aprovador",
  "justificativa": "Documentação está em conformidade",
  "observacoes": "Aprovado após análise detalhada"
}
```

### Como rejeitar uma solicitação?

**Endpoint:** `POST /api/v1/aprovacao/solicitacoes/:id/rejeitar`

```json
{
  "aprovador_id": "uuid-do-aprovador",
  "justificativa": "Documentação insuficiente",
  "motivo_rejeicao": "Falta comprovante de renda atualizado"
}
```

### Como solicitar informações adicionais?

**Endpoint:** `POST /api/v1/aprovacao/solicitacoes/:id/solicitar-informacoes`

```json
{
  "aprovador_id": "uuid-do-aprovador",
  "informacoes_solicitadas": "Necessário apresentar comprovante de residência atualizado",
  "prazo_resposta": "2024-12-25T17:00:00Z"
}
```

### Como verificar se uma ação requer aprovação?

**Endpoint:** `POST /api/v1/aprovacao/verificar`

```json
{
  "tipo_acao": "CANCELAR_CONCESSAO",
  "dados_acao": {
    "beneficio_id": "uuid-do-beneficio",
    "valor_impacto": 5000.00
  },
  "usuario_id": "uuid-do-usuario"
}
```

**Resposta:**
```json
{
  "requer_aprovacao": true,
  "aprovadores_sugeridos": [
    {
      "id": "uuid-aprovador",
      "nome": "João Silva",
      "nivel_aprovacao": 2,
      "areas_competencia": ["BENEFICIO"]
    }
  ],
  "motivo": "Valor acima do limite permitido para auto-aprovação"
}
```

---

## 🔗 Integração com Outros Módulos

### Como integrar o cancelamento de concessão?

**1. Verificar se requer aprovação:**

```typescript
// No frontend, antes de executar a ação
const verificacao = await api.post('/api/v1/aprovacao/verificar', {
  tipo_acao: 'CANCELAR_CONCESSAO',
  dados_acao: {
    beneficio_id: beneficioId,
    valor_impacto: valorBeneficio
  },
  usuario_id: usuarioLogado.id
});

if (verificacao.data.requer_aprovacao) {
  // Criar solicitação de aprovação
  const solicitacao = await criarSolicitacaoAprovacao({
    tipo_acao: 'CANCELAR_CONCESSAO',
    dados_acao: {
      beneficio_id: beneficioId,
      motivo: motivoCancelamento,
      valor_impacto: valorBeneficio
    },
    justificativa: justificativaUsuario,
    aprovadores: verificacao.data.aprovadores_sugeridos.map(a => a.id)
  });
  
  // Mostrar mensagem de que a ação está pendente de aprovação
  showMessage('Solicitação enviada para aprovação');
} else {
  // Executar ação diretamente
  await cancelarConcessao(beneficioId);
}
```

**2. Processar aprovação (via webhook ou polling):**

```typescript
// Quando a solicitação for aprovada, o sistema executará automaticamente
// a ação através do processador de filas

// Para monitorar o status:
const status = await api.get(`/api/v1/aprovacao/solicitacoes/${solicitacaoId}`);

if (status.data.status === 'APROVADA') {
  // A ação foi executada automaticamente
  showMessage('Concessão cancelada com sucesso');
} else if (status.data.status === 'REJEITADA') {
  showMessage('Solicitação rejeitada: ' + status.data.motivo_rejeicao);
}
```

### Como integrar com outros tipos de ação?

**1. Definir o tipo de ação no enum:**

```typescript
// Em aprovacao.enums.ts
export enum TipoAcaoAprovacao {
  CANCELAR_CONCESSAO = 'CANCELAR_CONCESSAO',
  ALTERAR_DADOS_CIDADAO = 'ALTERAR_DADOS_CIDADAO',
  TRANSFERIR_BENEFICIO = 'TRANSFERIR_BENEFICIO',
  // Adicionar novo tipo
  NOVA_ACAO = 'NOVA_ACAO'
}
```

**2. Implementar o processador da ação:**

```typescript
// No processador de aprovação
private async executarAcao(solicitacao: SolicitacaoAprovacao): Promise<void> {
  switch (solicitacao.tipo_acao) {
    case TipoAcaoAprovacao.NOVA_ACAO:
      await this.processarNovaAcao(solicitacao);
      break;
    // outros casos...
  }
}

private async processarNovaAcao(solicitacao: SolicitacaoAprovacao): Promise<void> {
  // Implementar a lógica específica da nova ação
  const { dados_acao } = solicitacao;
  
  // Executar a ação
  await this.novaAcaoService.executar(dados_acao);
  
  // Log da execução
  this.logger.log(`Nova ação executada para solicitação ${solicitacao.id}`);
}
```

---

## 📊 Análise e Monitoramento

### Como obter estatísticas de solicitações?

**Endpoint:** `GET /api/v1/aprovacao/estatisticas`

**Parâmetros:**
- `data_inicio`: Data inicial
- `data_fim`: Data final
- `tipo_acao`: Filtrar por tipo
- `aprovador_id`: Filtrar por aprovador

**Resposta:**
```json
{
  "total_solicitacoes": 150,
  "aprovadas": 120,
  "rejeitadas": 20,
  "pendentes": 10,
  "tempo_medio_aprovacao": "2.5 horas",
  "por_tipo": {
    "CANCELAR_CONCESSAO": 80,
    "ALTERAR_DADOS_CIDADAO": 70
  },
  "por_aprovador": [
    {
      "aprovador_id": "uuid",
      "nome": "João Silva",
      "total_aprovacoes": 45,
      "tempo_medio": "1.8 horas"
    }
  ]
}
```

### Como obter métricas de aprovadores?

**Endpoint:** `GET /api/v1/aprovacao/metricas/aprovadores`

### Como obter histórico de uma solicitação?

**Endpoint:** `GET /api/v1/aprovacao/solicitacoes/:id/historico`

**Resposta:**
```json
{
  "historico": [
    {
      "id": "uuid",
      "acao": "CRIADA",
      "usuario_id": "uuid-solicitante",
      "data_acao": "2024-01-15T10:00:00Z",
      "observacoes": "Solicitação criada"
    },
    {
      "id": "uuid",
      "acao": "APROVADA",
      "usuario_id": "uuid-aprovador",
      "data_acao": "2024-01-15T14:30:00Z",
      "observacoes": "Aprovado após análise",
      "justificativa": "Documentação em conformidade"
    }
  ]
}
```

### Como gerar relatórios?

**Endpoint:** `GET /api/v1/aprovacao/relatorios`

**Parâmetros:**
- `tipo`: APROVACOES, REJEICOES, PENDENTES, GERAL
- `formato`: JSON, CSV, PDF
- `data_inicio`: Data inicial
- `data_fim`: Data final
- `filtros`: Filtros adicionais

---

## 🔔 Notificações

### Como funcionam as notificações?

O sistema envia notificações automáticas via:
- **Email**: Para aprovadores e solicitantes
- **WebSocket**: Para atualizações em tempo real no frontend
- **Push notifications**: Se configurado

### Eventos que geram notificações:

1. **Nova solicitação criada** → Notifica aprovadores
2. **Solicitação aprovada** → Notifica solicitante
3. **Solicitação rejeitada** → Notifica solicitante
4. **Informações solicitadas** → Notifica solicitante
5. **Prazo próximo do vencimento** → Notifica aprovadores
6. **Solicitação expirada** → Notifica solicitante e aprovadores

### Como configurar notificações no frontend?

```typescript
// Conectar ao WebSocket para notificações em tempo real
const socket = io('/aprovacao');

// Escutar eventos de aprovação
socket.on('solicitacao-criada', (data) => {
  if (data.aprovador_id === usuarioLogado.id) {
    showNotification('Nova solicitação de aprovação', {
      type: 'info',
      action: () => navigateTo(`/aprovacao/solicitacoes/${data.id}`)
    });
  }
});

socket.on('solicitacao-aprovada', (data) => {
  if (data.solicitante_id === usuarioLogado.id) {
    showNotification('Sua solicitação foi aprovada!', {
      type: 'success'
    });
  }
});

socket.on('solicitacao-rejeitada', (data) => {
  if (data.solicitante_id === usuarioLogado.id) {
    showNotification('Sua solicitação foi rejeitada', {
      type: 'error',
      message: data.motivo_rejeicao
    });
  }
});
```

---

## 🔧 Troubleshooting

### Erro: "property nivel_aprovacao should not exist"

**Causa:** Uso de campos obsoletos no DTO de criação de aprovador.

**Solução:** Remover os campos `nivel_aprovacao` e `areas_competencia` do payload. Estes campos não existem mais no DTO atual.

### Erro: "ID da configuração deve ser um UUID válido"
**Causa:** Campo `configuracao_aprovacao_id` não é um UUID válido
**Solução:** 
1. Obter um UUID válido listando as configurações existentes:
   ```bash
   GET /api/v1/aprovacao/configuracao/configuracoes
   ```
2. Ou criar uma nova configuração de aprovação primeiro:
   ```bash
   POST /api/v1/aprovacao/configuracao/configuracoes
   ```
3. Usar o UUID retornado no formato: `123e4567-e89b-12d3-a456-426614174000`

### Erro: "Tipo deve ser um valor válido do enum TipoAprovador"

**Causa:** Campo `tipo` não contém um valor válido do enum.

**Solução:** Usar um dos valores válidos: `USUARIO`, `PERFIL`, `UNIDADE`, `HIERARQUIA`

### Exemplo Completo: Criando um Aprovador Corretamente

**Passo 1:** Listar configurações existentes
```bash
GET /api/v1/aprovacao/configuracao/configuracoes
```

**Passo 2:** Criar aprovador com payload correto
```json
{
  "configuracao_aprovacao_id": "550e8400-e29b-41d4-a716-446655440000",
  "tipo": "USUARIO",
  "usuario_id": "123e4567-e89b-12d3-a456-426614174001",
  "ativo": true,
  "ordem": 1,
  "limite_valor": 10000.00,
  "canais_notificacao": ["email", "sistema"]
}
```

**Campos removidos (não usar):**
- ❌ `nivel_aprovacao`
- ❌ `areas_competencia`

**Campos obrigatórios:**
- ✅ `configuracao_aprovacao_id` (UUID válido)
- ✅ `tipo` (enum: USUARIO, PERFIL, UNIDADE, HIERARQUIA)

**Campos condicionais:**
- `usuario_id`: obrigatório quando `tipo = "USUARIO"`
- `perfil_id`: obrigatório quando `tipo = "PERFIL"`
- `unidade_id`: obrigatório quando `tipo = "UNIDADE"`
- `hierarquia_id`: obrigatório quando `tipo = "HIERARQUIA"`

### Erro: "Usuário não é aprovador válido"

**Causa:** O usuário não está cadastrado como aprovador ou está inativo.

**Solução:**
1. Verificar se o usuário está cadastrado como aprovador
2. Verificar se o aprovador está ativo
3. Verificar se tem competência para a área da solicitação

### Erro: "Solicitação não encontrada"

**Causa:** ID da solicitação inválido ou solicitação foi removida.

**Solução:**
1. Verificar se o ID está correto
2. Verificar se a solicitação não foi cancelada
3. Verificar permissões de acesso

### Erro: "Ação não requer aprovação"

**Causa:** A ação está configurada para não requerer aprovação.

**Solução:**
1. Verificar configurações de aprovação para o tipo de ação
2. Verificar se o usuário tem permissão para executar a ação diretamente
3. Verificar limites de valor configurados

### Solicitação não está sendo processada

**Causa:** Problemas na fila de processamento.

**Solução:**
1. Verificar se o Redis está funcionando
2. Verificar logs do processador de filas
3. Verificar se há workers ativos

### Notificações não estão sendo enviadas

**Causa:** Problemas na configuração de email ou WebSocket.

**Solução:**
1. Verificar configurações de SMTP
2. Verificar conexão WebSocket
3. Verificar se o serviço de notificações está ativo

---

## 📚 Exemplos de Uso Completos

### Exemplo 1: Fluxo completo de cancelamento de concessão

```typescript
// 1. Verificar se requer aprovação
const verificacao = await verificarSeRequerAprovacao({
  tipo_acao: 'CANCELAR_CONCESSAO',
  dados_acao: { beneficio_id: '123', valor_impacto: 5000 },
  usuario_id: 'user-123'
});

if (verificacao.requer_aprovacao) {
  // 2. Criar solicitação
  const solicitacao = await criarSolicitacao({
    tipo_acao: 'CANCELAR_CONCESSAO',
    descricao: 'Cancelamento por inconsistência',
    dados_acao: {
      beneficio_id: '123',
      motivo: 'Documentação irregular'
    },
    justificativa: 'Detectada inconsistência na documentação',
    aprovadores: verificacao.aprovadores_sugeridos.map(a => a.id)
  });
  
  // 3. Monitorar status
  const interval = setInterval(async () => {
    const status = await buscarSolicitacao(solicitacao.id);
    
    if (status.status === 'APROVADA') {
      clearInterval(interval);
      showSuccess('Concessão cancelada com sucesso!');
    } else if (status.status === 'REJEITADA') {
      clearInterval(interval);
      showError('Solicitação rejeitada: ' + status.motivo_rejeicao);
    }
  }, 5000);
} else {
  // Executar diretamente
  await cancelarConcessao('123');
}
```

### Exemplo 2: Dashboard de aprovador

```typescript
// Buscar solicitações pendentes para o aprovador
const solicitacoesPendentes = await listarSolicitacoes({
  status: 'PENDENTE',
  aprovador_id: usuarioLogado.id,
  page: 1,
  limit: 10
});

// Buscar estatísticas
const estatisticas = await obterEstatisticas({
  aprovador_id: usuarioLogado.id,
  data_inicio: '2024-01-01',
  data_fim: '2024-12-31'
});

// Renderizar dashboard
renderDashboard({
  solicitacoesPendentes: solicitacoesPendentes.data,
  totalPendentes: solicitacoesPendentes.total,
  estatisticas: estatisticas
});
```

---

## 🚀 Próximos Passos

Para implementar o sistema de aprovação no seu frontend:

1. **Configure as rotas** para os endpoints de aprovação
2. **Implemente os componentes** de interface para aprovadores
3. **Configure as notificações** WebSocket
4. **Integre com os módulos** existentes
5. **Teste o fluxo completo** de aprovação

Para dúvidas específicas ou problemas não cobertos neste FAQ, consulte a documentação técnica ou entre em contato com a equipe de desenvolvimento.