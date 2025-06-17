# PLANO DE INTEGRAÇÃO E CORREÇÃO DE NOTIFICAÇÕES SSE NOS WORKFLOWS

## RESUMO EXECUTIVO

Este documento apresenta um plano abrangente para revisar, corrigir e implementar notificações SSE em tempo real nos workflows de solicitação, pendências e pagamentos do Sistema SEMTAS. O objetivo é garantir que todos os eventos críticos sejam notificados aos usuários em tempo real, melhorando a experiência do usuário e a eficiência operacional.

## ANÁLISE ATUAL

### ✅ IMPLEMENTAÇÕES EXISTENTES

#### 1. Módulo de Pendências
- **Arquivo**: `src/modules/solicitacao/services/pendencia.service.ts`
- **Implementação Atual**:
  ```typescript
  // Linha 139 - Pendência criada
  this.eventEmitter.emit('sse.notificacao', {
    userId: solicitacao.tecnico_id,
    tipo: 'pendencia_criada',
    dados: {
      pendenciaId: pendenciaSalva.id,
      solicitacaoId: solicitacao.id,
      protocolo: solicitacao.protocolo, 
      descricao: pendenciaSalva.descricao,
      prioridade: 'high',
    },
  });
  ```
- **Status**: ✅ Implementado parcialmente
- **Problemas Identificados**:
  - Falta notificação para pendência resolvida
  - Falta notificação para pendência cancelada
  - Falta notificação quando todas as pendências são sanadas

#### 2. Módulo de Notificação de Solicitação
- **Arquivo**: `src/modules/solicitacao/services/notificacao.service.ts`
- **Implementação Atual**:
  ```typescript
  // Linha 126 - Notificação geral
  this.eventEmitter.emit('sse.notificacao', {
    userId: notificacao.destinatarioId,
    tipo: 'solicitacao_notificacao',
    dados: {
      titulo: notificacao.titulo,
      mensagem: notificacao.mensagem,
      solicitacaoId: notificacao.solicitacaoId,
      protocolo: notificacao.protocolo,
      prioridade: notificacao.prioridade,
    },
  });
  ```
- **Status**: ✅ Implementado

### ✅ IMPLEMENTAÇÕES CONCLUÍDAS NA FASE 1

#### 1. Módulo de Pendências - CORRIGIDO
- **Arquivo**: `src/modules/solicitacao/services/pendencia.service.ts`
- **Implementações Adicionadas**:
  - ✅ Notificação SSE para pendência resolvida (`pendencia_resolvida`)
  - ✅ Notificação SSE para pendência cancelada (`pendencia_cancelada`)
  - ✅ Notificação quando todas pendências são sanadas (`pendencias_sanadas`)
- **Status**: ✅ Implementado completamente

### ❌ IMPLEMENTAÇÕES FALTANTES

#### 1. Workflow de Solicitação
- **Arquivo**: `src/modules/solicitacao/services/workflow-solicitacao.service.ts`
- **Eventos sem notificação SSE**:
  - Transições de estado (realizarTransicao)
  - Aprovação de solicitação (aprovarSolicitacao)
  - Rejeição de solicitação (rejeitarSolicitacao)
  - Liberação de solicitação (liberarSolicitacao)
  - Criação de rascunho (criarRascunho)
  - Submissão de rascunho (submeterRascunho)

#### 2. Serviço de Pagamentos
- **Arquivo**: `src/modules/pagamento/services/pagamento.service.ts`
- **Eventos sem notificação SSE**:
  - Criação de pagamento pendente (createPagamentoPendente)
  - Criação de pagamento (createPagamento)
  - Atualização de status (updateStatus)
  - Cancelamento de pagamento (cancelarPagamento)
  - Mudanças de status específicas (LIBERADO, CONFIRMADO, AGENDADO, etc.)

## PLANO DE AÇÃO

### FASE 1: CORREÇÃO DO MÓDULO DE PENDÊNCIAS (Prioridade: ALTA)

#### Tarefa 1.1: Implementar notificação SSE para pendência resolvida
- **Arquivo**: `src/modules/solicitacao/services/pendencia.service.ts`
- **Localização**: Método `resolverPendencia` (após linha 250)
- **Implementação**:
```typescript
// Emitir notificação SSE para pendência resolvida
this.eventEmitter.emit('sse.notificacao', {
  userId: pendencia.registrado_por_id,
  tipo: 'pendencia_resolvida',
  dados: {
    pendenciaId: pendencia.id,
    solicitacaoId: pendencia.solicitacao_id,
    protocolo: pendencia.solicitacao?.protocolo,
    resolucao: resolverPendenciaDto.resolucao,
    prioridade: 'medium',
    dataResolucao: new Date(),
  },
});

// Se todas as pendências foram sanadas, notificar técnico
if (todasPendenciasSanadas) {
  this.eventEmitter.emit('sse.notificacao', {
    userId: solicitacao.tecnico_id,
    tipo: 'pendencias_sanadas',
    dados: {
      solicitacaoId: solicitacao.id,
      protocolo: solicitacao.protocolo,
      prioridade: 'high',
      statusNovo: StatusSolicitacao.EM_ANALISE,
    },
  });
}
```

#### Tarefa 1.2: Implementar notificação SSE para pendência cancelada
- **Arquivo**: `src/modules/solicitacao/services/pendencia.service.ts`
- **Localização**: Método `cancelarPendencia` (após linha 350)
- **Implementação**:
```typescript
// Emitir notificação SSE para pendência cancelada
this.eventEmitter.emit('sse.notificacao', {
  userId: pendencia.registrado_por_id,
  tipo: 'pendencia_cancelada',
  dados: {
    pendenciaId: pendencia.id,
    solicitacaoId: pendencia.solicitacao_id,
    protocolo: pendencia.solicitacao?.protocolo,
    motivo: cancelarPendenciaDto.motivo_cancelamento,
    prioridade: 'medium',
  },
});
```

### FASE 2: IMPLEMENTAÇÃO NO WORKFLOW DE SOLICITAÇÃO (Prioridade: ALTA)

#### Tarefa 2.1: Implementar notificações SSE para transições de estado
- **Arquivo**: `src/modules/solicitacao/services/workflow-solicitacao.service.ts`
- **Localização**: Método `realizarTransicao` (após linha 200)
- **Implementação**:
```typescript
// Após a transação bem-sucedida, emitir notificação SSE
if (resultado.sucesso && resultado.solicitacao) {
  // Notificar o técnico responsável
  if (resultado.solicitacao.tecnico_id) {
    this.eventEmitter.emit('sse.notificacao', {
      userId: resultado.solicitacao.tecnico_id,
      tipo: 'transicao_estado',
      dados: {
        solicitacaoId: solicitacaoId,
        protocolo: resultado.solicitacao.protocolo,
        statusAnterior: estadoAtual,
        statusNovo: novoEstado,
        observacao: observacao,
        prioridade: this.definirPrioridadeTransicao(novoEstado),
        timestamp: new Date(),
      },
    });
  }

  // Notificar supervisores para estados críticos
  if (this.isEstadoCritico(novoEstado)) {
    this.eventEmitter.emit('sse.notificacao', {
      userId: 'supervisores', // Broadcast para supervisores
      tipo: 'estado_critico',
      dados: {
        solicitacaoId: solicitacaoId,
        protocolo: resultado.solicitacao.protocolo,
        statusNovo: novoEstado,
        prioridade: 'urgent',
      },
    });
  }
}
```

#### Tarefa 2.2: Melhorar notificações de aprovação e rejeição
- **Arquivo**: `src/modules/solicitacao/services/workflow-solicitacao.service.ts`
- **Localização**: Métodos `aprovarSolicitacao` e `rejeitarSolicitacao`
- **Implementação**:
```typescript
// No método aprovarSolicitacao (após linha 400)
this.eventEmitter.emit('sse.notificacao', {
  userId: solicitacao.tecnico_id,
  tipo: 'solicitacao_aprovada',
  dados: {
    solicitacaoId: solicitacao.id,
    protocolo: solicitacao.protocolo,
    tipoBeneficio: solicitacao.tipo_beneficio?.nome,
    parecerSemtas: parecerSemtas,
    observacao: observacao,
    prioridade: 'high',
    dataAprovacao: new Date(),
    proximaEtapa: 'liberacao_pagamento',
  },
});

// No método rejeitarSolicitacao (após linha 500)
this.eventEmitter.emit('sse.notificacao', {
  userId: solicitacao.tecnico_id,
  tipo: 'solicitacao_rejeitada',
  dados: {
    solicitacaoId: solicitacao.id,
    protocolo: solicitacao.protocolo,
    tipoBeneficio: solicitacao.tipo_beneficio?.nome,
    motivo: motivo,
    prioridade: 'high',
    dataRejeicao: new Date(),
  },
});
```

### FASE 3: IMPLEMENTAÇÃO NO MÓDULO DE PAGAMENTOS (Status: CONCLUÍDA ✅)

#### Tarefa 3.1: Implementar notificações SSE para criação de pagamentos ✅
- **Arquivo**: `src/modules/pagamento/services/pagamento.service.ts`
- **Localização**: Métodos `createPagamentoPendente` e `createPagamento`
- **Status**: CONCLUÍDO
- **Implementação**:
```typescript
// No método createPagamentoPendente (após linha 100)
this.eventEmitter.emit('sse.notificacao', {
  userId: solicitacao.tecnico_id,
  tipo: 'pagamento_pendente_criado',
  dados: {
    pagamentoId: result.id,
    solicitacaoId: createDto.solicitacaoId,
    valor: createDto.valor,
    dataPrevista: createDto.dataPrevistaLiberacao,
    metodoPagamento: createDto.metodoPagamento,
    prioridade: 'medium',
  },
});

// No método createPagamento (após linha 200)
this.eventEmitter.emit('sse.notificacao', {
  userId: solicitacao.tecnico_id,
  tipo: 'pagamento_liberado',
  dados: {
    pagamentoId: result.id,
    solicitacaoId: solicitacaoId,
    valor: createDto.valor,
    dataLiberacao: createDto.dataLiberacao,
    metodoPagamento: createDto.metodoPagamento,
    prioridade: 'high',
  },
});
```

#### Tarefa 3.2: Implementar notificações SSE para mudanças de status ✅
- **Arquivo**: `src/modules/pagamento/services/pagamento.service.ts`
- **Localização**: Método `updateStatus` (após linha 350)
- **Status**: CONCLUÍDO
- **Implementação**:
```typescript
// Emitir notificação SSE específica por status
const tipoNotificacao = this.mapearTipoNotificacaoPagamento(updateDto.status);
const prioridade = this.definirPrioridadePagamento(updateDto.status);

this.eventEmitter.emit('sse.notificacao', {
  userId: pagamento.solicitacao?.tecnico_id,
  tipo: tipoNotificacao,
  dados: {
    pagamentoId: pagamento.id,
    solicitacaoId: pagamento.solicitacaoId,
    statusAnterior: statusAnterior,
    statusNovo: updateDto.status,
    valor: pagamento.valor,
    prioridade: prioridade,
    timestamp: new Date(),
    ...(updateDto.dataAgendamento && { dataAgendamento: updateDto.dataAgendamento }),
    ...(updateDto.comprovanteId && { comprovanteId: updateDto.comprovanteId }),
  },
});

// Notificação especial para pagamento confirmado
if (updateDto.status === StatusPagamentoEnum.CONFIRMADO) {
  this.eventEmitter.emit('sse.notificacao', {
    userId: pagamento.solicitacao?.tecnico_id,
    tipo: 'beneficio_concluido',
    dados: {
      solicitacaoId: pagamento.solicitacaoId,
      tipoBeneficio: pagamento.solicitacao?.tipo_beneficio?.nome,
      valor: pagamento.valor,
      prioridade: 'high',
      dataConclusao: new Date(),
    },
  });
}
```

#### Tarefa 3.3: Implementar notificação SSE para cancelamento
- **Arquivo**: `src/modules/pagamento/services/pagamento.service.ts`
- **Localização**: Método `cancelarPagamento` (após linha 450)
- **Implementação**:
```typescript
this.eventEmitter.emit('sse.notificacao', {
  userId: pagamento.solicitacao?.tecnico_id,
  tipo: 'pagamento_cancelado',
  dados: {
    pagamentoId: pagamento.id,
    solicitacaoId: pagamento.solicitacaoId,
    statusAnterior: statusAnterior,
    motivo: motivoCancelamento,
    valor: pagamento.valor,
    prioridade: 'high',
    dataCancelamento: new Date(),
  },
});
```

### FASE 4: IMPLEMENTAÇÃO DE NOTIFICAÇÕES PROATIVAS (Prioridade: MÉDIA)

#### Tarefa 4.1: Notificações de prazos
- **Implementar**: Alertas para prazos próximos ao vencimento
- **Implementar**: Alertas para prazos vencidos
- **Implementar**: Lembretes de ações pendentes

#### Tarefa 4.2: Notificações de sistema
- **Implementar**: Alertas de manutenção
- **Implementar**: Notificações de atualizações
- **Implementar**: Alertas de segurança

### FASE 5: MELHORIAS E OTIMIZAÇÕES (Prioridade: BAIXA)

#### Tarefa 5.1: Implementar agrupamento de notificações
- **Objetivo**: Evitar spam de notificações
- **Implementação**: Agrupar notificações similares em um período de tempo

#### Tarefa 5.2: Implementar preferências de notificação
- **Objetivo**: Permitir que usuários configurem tipos de notificação
- **Implementação**: Sistema de preferências por usuário

## MÉTODOS AUXILIARES NECESSÁRIOS

### 1. Definir prioridade de transição
```typescript
private definirPrioridadeTransicao(novoEstado: StatusSolicitacao): string {
  const estadosAlta = [StatusSolicitacao.APROVADA, StatusSolicitacao.INDEFERIDA, StatusSolicitacao.LIBERADA];
  const estadosMedia = [StatusSolicitacao.EM_ANALISE, StatusSolicitacao.PENDENTE];
  
  if (estadosAlta.includes(novoEstado)) return 'high';
  if (estadosMedia.includes(novoEstado)) return 'medium';
  return 'low';
}
```

### 2. Verificar estado crítico
```typescript
private isEstadoCritico(estado: StatusSolicitacao): boolean {
  return [StatusSolicitacao.BLOQUEADO, StatusSolicitacao.SUSPENSO, StatusSolicitacao.CANCELADA].includes(estado);
}
```

### 3. Mapear tipo de notificação de pagamento
```typescript
private mapearTipoNotificacaoPagamento(status: StatusPagamentoEnum): string {
  const mapeamento = {
    [StatusPagamentoEnum.PENDENTE]: 'pagamento_pendente',
    [StatusPagamentoEnum.LIBERADO]: 'pagamento_liberado',
    [StatusPagamentoEnum.AGENDADO]: 'pagamento_agendado',
    [StatusPagamentoEnum.PAGO]: 'pagamento_realizado',
    [StatusPagamentoEnum.CONFIRMADO]: 'pagamento_confirmado',
    [StatusPagamentoEnum.CANCELADO]: 'pagamento_cancelado',
  };
  return mapeamento[status] || 'pagamento_atualizado';
}
```

## CHECKLIST DE IMPLEMENTAÇÃO

### ✅ FASE 1: Correção do Módulo de Pendências - **CONCLUÍDA**
- [x] **1.1** Implementar notificação SSE para pendência resolvida ✅
- [x] **1.2** Implementar notificação SSE para pendência cancelada ✅
- [x] **1.3** Implementar notificação quando todas pendências são sanadas ✅
- [ ] **1.4** Testar todas as notificações de pendência (PENDENTE)

### ✅ FASE 2: Workflow de Solicitação - **CONCLUÍDA**
- [x] **2.1** Implementar notificações SSE para transições de estado ✅
- [x] **2.2** Melhorar notificações de aprovação ✅
- [x] **2.3** Melhorar notificações de rejeição ✅
- [x] **2.4** Implementar notificações para liberação ✅
- [x] **2.5** Implementar métodos auxiliares (prioridade, estado crítico) ✅
- [x] **2.6** Implementar notificação SSE para criação de rascunho ✅
- [x] **2.7** Implementar notificação SSE para submissão de rascunho ✅
- [x] **2.8** Implementar notificação SSE para cancelamento de solicitação ✅
- [x] **2.9** Adicionar EventEmitter2 ao serviço de workflow ✅
- [ ] **2.10** Testar todas as transições de estado (PENDENTE)

### ✅ FASE 3: Módulo de Pagamentos - **CONCLUÍDA**
- [x] **3.1** Implementar notificações para criação de pagamentos ✅
- [x] **3.2** Implementar notificações para mudanças de status ✅
- [x] **3.3** Implementar notificação para cancelamento ✅
- [x] **3.4** Adicionar EventEmitter2 ao serviço de pagamento ✅
- [ ] **3.5** Testar todas as notificações de pagamento (PENDENTE)

### ✅ FASE 4: Notificações Proativas
- [ ] **4.1** Implementar alertas de prazos
- [ ] **4.2** Implementar notificações de sistema
- [ ] **4.3** Configurar monitoramento automático

### ✅ FASE 5: Melhorias e Otimizações
- [ ] **5.1** Implementar agrupamento de notificações
- [ ] **5.2** Implementar preferências de usuário
- [ ] **5.3** Otimizar performance das notificações

## TESTES NECESSÁRIOS

### Testes Unitários
- [ ] Testar emissão de eventos SSE em cada serviço
- [ ] Testar métodos auxiliares de prioridade e mapeamento
- [ ] Testar condições de erro e fallback

### Testes de Integração
- [ ] Testar fluxo completo de notificações SSE
- [ ] Testar recebimento de notificações no frontend
- [ ] Testar performance com múltiplas notificações

### Testes E2E
- [ ] Testar cenários completos de workflow
- [ ] Testar notificações em tempo real
- [ ] Testar comportamento com usuários múltiplos

## ESTIMATIVAS DE TEMPO

| Fase | Tarefas | Estimativa | Status | Prioridade |
|------|---------|------------|--------|------------|
| Fase 1 | Correção Pendências | 8 horas | ✅ CONCLUÍDA | Alta |
| Fase 2 | Workflow Solicitação | 16 horas | ✅ CONCLUÍDA | Alta |
| Fase 3 | Módulo Pagamentos | 12 horas | ✅ CONCLUÍDA | Alta |
| Fase 4 | Notificações Proativas | 20 horas | 🔄 PENDENTE | Média |
| Fase 5 | Melhorias | 16 horas | 🔄 PENDENTE | Baixa |
| **Total** | **Todas as fases** | **72 horas** | **50% Concluído** | - |

## CRITÉRIOS DE ACEITAÇÃO

### Funcionalidade
- [ ] Todas as transições de estado geram notificações SSE
- [ ] Notificações contêm dados relevantes e estruturados
- [ ] Prioridades são definidas corretamente
- [ ] Não há duplicação de notificações

### Performance
- [ ] Notificações são enviadas em menos de 100ms
- [ ] Sistema suporta 100+ usuários simultâneos
- [ ] Não há vazamentos de memória

### Qualidade
- [ ] Cobertura de testes > 90%
- [ ] Logs adequados para debugging
- [ ] Tratamento de erros robusto
- [ ] Documentação atualizada

## PRÓXIMOS PASSOS

1. **Revisar e aprovar** este plano com a equipe
2. **Priorizar** as fases conforme necessidades do negócio
3. **Implementar** Fase 1 (Pendências) como piloto
4. **Testar** e validar implementação piloto
5. **Prosseguir** com as demais fases
6. **Monitorar** performance e ajustar conforme necessário

---

**Documento criado em**: $(date)
**Versão**: 1.0
**Responsável**: Equipe Backend SEMTAS
**Próxima revisão**: Após implementação da Fase 1