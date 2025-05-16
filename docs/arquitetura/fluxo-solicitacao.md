# Fluxo de Solicitação de Benefícios

## Visão Geral

O módulo de solicitação de benefícios implementa um fluxo completo para gerenciar o ciclo de vida das solicitações, desde a submissão inicial até a aprovação final, com suporte a campos dinâmicos específicos para cada tipo de benefício.

## Componentes do Fluxo

### 1. Submissão de Solicitação

A submissão de uma solicitação de benefício envolve:

- Validação dos dados básicos do cidadão
- Validação dos dados dinâmicos específicos do tipo de benefício
- Processamento e sanitização dos dados
- Armazenamento da solicitação com status inicial "PENDENTE"
- Registro da versão do schema utilizada para garantir compatibilidade futura

### 2. Fluxo de Aprovação

O fluxo de aprovação segue um processo definido:

1. **PENDENTE**: Estado inicial da solicitação após a submissão
2. **EM_ANALISE**: Solicitação está sendo analisada por um responsável
3. **APROVADO**: Solicitação foi aprovada e o benefício concedido
4. **REJEITADO**: Solicitação foi rejeitada por não atender aos requisitos
5. **CANCELADO**: Solicitação foi cancelada (pode ocorrer em qualquer estágio)

As transições de status são controladas por regras específicas:
- De PENDENTE → EM_ANALISE, CANCELADO
- De EM_ANALISE → APROVADO, REJEITADO, CANCELADO
- De APROVADO → CANCELADO
- De REJEITADO → EM_ANALISE, CANCELADO
- De CANCELADO → (nenhuma transição permitida)

### 3. Histórico de Mudanças

Cada mudança de status é registrada no histórico, incluindo:
- Status anterior e novo status
- Usuário que realizou a mudança
- Data e hora da mudança
- Justificativa para a mudança

### 4. Exportação de Dados

O sistema permite exportar dados de solicitações em formato CSV para análise e relatórios:
- Filtros por cidadão, tipo de benefício, status e período
- Inclusão de todos os campos dinâmicos específicos de cada tipo de benefício
- Formatação adequada para processamento em ferramentas de análise de dados

## Diagrama de Estados

```
+------------+    +-------------+    +------------+
| PENDENTE   |--->| EM_ANALISE  |--->| APROVADO   |
+------------+    +-------------+    +------------+
      |                 |                  |
      |                 v                  |
      |            +-----------+           |
      +----------->| REJEITADO |<----------+
      |            +-----------+           |
      |                 |                  |
      v                 v                  v
+------------+
| CANCELADO  |
+------------+
```

## Entidades Principais

### SolicitacaoBeneficio

Armazena os dados da solicitação, incluindo:
- Referência ao cidadão solicitante
- Referência ao tipo de benefício
- Dados dinâmicos específicos do tipo de benefício
- Status atual
- Versão do schema utilizada

### HistoricoSolicitacao

Registra o histórico de mudanças de status, incluindo:
- Referência à solicitação
- Status anterior e novo status
- Usuário responsável pela mudança
- Justificativa
- Data e hora da mudança

## Endpoints Principais

### Solicitação

- `POST /solicitacao`: Criar nova solicitação de benefício
- `GET /solicitacao`: Listar solicitações com filtros
- `GET /solicitacao/:id`: Obter detalhes de uma solicitação específica
- `PATCH /solicitacao/:id/status`: Atualizar status de uma solicitação
- `GET /solicitacao/:id/historico`: Obter histórico de mudanças de status

### Formulário Dinâmico

- `GET /beneficio/:tipoBeneficioId/formulario`: Obter estrutura de formulário dinâmico

### Exportação

- `GET /beneficio/exportacao/csv`: Exportar solicitações em formato CSV

## Considerações de Segurança

- Todas as transições de status são validadas para garantir a integridade do fluxo
- O histórico completo é mantido para auditoria
- As permissões são controladas por perfis de usuário (RBAC)
- A versão do schema é armazenada para garantir compatibilidade com dados existentes

## Exemplos de Uso

Para exemplos detalhados de uso do fluxo de solicitação, consulte:
- [Exemplos de Uso de Campos Dinâmicos](../exemplos/uso-campos-dinamicos.md)
