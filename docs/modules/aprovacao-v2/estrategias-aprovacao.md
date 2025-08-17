# Estratégias de Aprovação - Sistema de Aprovação v2

## 📋 Visão Geral

As estratégias de aprovação definem como as solicitações de ações críticas são processadas e aprovadas no sistema. Cada estratégia implementa uma lógica específica para determinar quando uma solicitação deve ser considerada aprovada ou rejeitada.

## 🎯 Estratégias Disponíveis

### 1. SIMPLES (Qualquer Aprovador)

**Descrição**: Qualquer aprovador configurado pode aprovar a solicitação. A primeira aprovação é suficiente para executar a ação.

**Quando usar**:
- Ações de baixo risco
- Processos que precisam de agilidade
- Quando há confiança nos aprovadores

**Configuração**:
```typescript
{
  estrategia: EstrategiaAprovacao.SIMPLES,
  min_aprovadores: 1,
  aprovadores_ids: ['uuid-coordenador-1', 'uuid-coordenador-2', 'uuid-supervisor-1']
}
```

**Exemplo Prático**:
```typescript
// Configuração para cancelamento de solicitação
const configuracao = {
  tipo_acao: TipoAcaoCritica.CANCELAMENTO_SOLICITACAO,
  nome: 'Cancelamento de Solicitação',
  descricao: 'Cancelamento de solicitação de benefício por erro de preenchimento',
  estrategia: EstrategiaAprovacao.SIMPLES,
  min_aprovadores: 1,
  aprovadores_ids: [
    'uuid-coordenador-setor-a',
    'uuid-coordenador-setor-b',
    'uuid-supervisor-geral'
  ]
};

// Uso no controller
@RequerAprovacao({
  tipo: TipoAcaoCritica.CANCELAMENTO_SOLICITACAO,
  descricao: 'Cancelamento de solicitação por erro'
})
@Delete(':id/cancelar')
async cancelarSolicitacao(
  @Param('id') id: string,
  @Body() dados: CancelarSolicitacaoDto
) {
  return this.solicitacaoService.cancelar(id, dados);
}
```

**Fluxo de Aprovação**:
1. Solicitação criada
2. Notificação enviada para todos os aprovadores
3. Primeiro aprovador que decidir define o resultado
4. Se aprovado: ação é executada
5. Se rejeitado: solicitação é finalizada

---

### 2. MAIORIA (Maioria Simples)

**Descrição**: A maioria dos aprovadores deve aprovar para que a ação seja executada. Requer mais de 50% de aprovações.

**Quando usar**:
- Ações de risco médio
- Decisões que impactam múltiplos setores
- Quando é necessário consenso parcial

**Configuração**:
```typescript
{
  estrategia: EstrategiaAprovacao.MAIORIA,
  min_aprovadores: 3, // Mínimo de 3 aprovadores para maioria
  aprovadores_ids: ['uuid-1', 'uuid-2', 'uuid-3', 'uuid-4', 'uuid-5']
}
```

**Exemplo Prático**:
```typescript
// Configuração para suspensão de benefício
const configuracao = {
  tipo_acao: TipoAcaoCritica.SUSPENSAO_BENEFICIO,
  nome: 'Suspensão de Benefício',
  descricao: 'Suspensão temporária de benefício por irregularidade',
  estrategia: EstrategiaAprovacao.MAIORIA,
  min_aprovadores: 3,
  aprovadores_ids: [
    'uuid-coordenador-juridico',
    'uuid-coordenador-tecnico',
    'uuid-coordenador-social',
    'uuid-diretor-regional',
    'uuid-supervisor-auditoria'
  ]
};

// Uso no controller
@RequerAprovacao({
  tipo: TipoAcaoCritica.SUSPENSAO_BENEFICIO,
  descricao: 'Suspensão de benefício por irregularidade'
})
@Patch(':id/suspender')
async suspenderBeneficio(
  @Param('id') id: string,
  @Body() dados: SuspenderBeneficioDto
) {
  return this.beneficioService.suspender(id, dados);
}
```

**Cálculo da Maioria**:
- 3 aprovadores: necessário 2 aprovações (66%)
- 4 aprovadores: necessário 3 aprovações (75%)
- 5 aprovadores: necessário 3 aprovações (60%)
- 6 aprovadores: necessário 4 aprovações (66%)

**Fluxo de Aprovação**:
1. Solicitação criada
2. Notificação enviada para todos os aprovadores
3. Sistema aguarda decisões até atingir maioria
4. Se maioria aprovar: ação é executada
5. Se maioria rejeitar: solicitação é finalizada
6. Se não houver maioria no prazo: solicitação expira

---

### 3. ESCALONAMENTO_SETOR (Escalonamento por Setor)

**Descrição**: Aprovação hierárquica que segue a estrutura organizacional por setor/unidade. Inicia com aprovadores de nível mais baixo e escala conforme necessário.

**Quando usar**:
- Ações que seguem hierarquia organizacional
- Processos que requerem escalação automática
- Quando há diferentes níveis de autoridade

**Configuração**:
```typescript
{
  estrategia: EstrategiaAprovacao.ESCALONAMENTO_SETOR,
  min_aprovadores: 1,
  aprovadores_ids: [
    'uuid-coordenador-setor',    // Nível 1
    'uuid-diretor-regional',     // Nível 2
    'uuid-diretor-geral'         // Nível 3
  ],
  configuracao_escalonamento: {
    tempo_limite_nivel: 24, // horas
    nivel_maximo: 3
  }
}
```

**Exemplo Prático**:
```typescript
// Configuração para alteração de dados críticos
const configuracao = {
  tipo_acao: TipoAcaoCritica.ALTERACAO_DADOS_CRITICOS,
  nome: 'Alteração de Dados Críticos',
  descricao: 'Alteração de dados sensíveis do cidadão',
  estrategia: EstrategiaAprovacao.ESCALONAMENTO_SETOR,
  min_aprovadores: 1,
  aprovadores_ids: [
    'uuid-analista-responsavel',     // Nível 1 - Analista
    'uuid-coordenador-setor',        // Nível 2 - Coordenador
    'uuid-diretor-regional',         // Nível 3 - Diretor Regional
    'uuid-diretor-geral'             // Nível 4 - Diretor Geral
  ],
  configuracao_escalonamento: {
    tempo_limite_nivel: 48, // 48 horas por nível
    nivel_maximo: 4,
    auto_escalar: true
  }
};

// Uso no controller
@RequerAprovacao({
  tipo: TipoAcaoCritica.ALTERACAO_DADOS_CRITICOS,
  descricao: 'Alteração de dados críticos do cidadão'
})
@Patch('cidadao/:id/dados-criticos')
async alterarDadosCriticos(
  @Param('id') id: string,
  @Body() dados: AlterarDadosCriticosDto
) {
  return this.cidadaoService.alterarDadosCriticos(id, dados);
}
```

**Fluxo de Escalonamento**:
1. Solicitação criada e enviada para Nível 1
2. Aprovador do Nível 1 tem 48h para decidir
3. Se aprovar: ação é executada
4. Se rejeitar: solicitação é finalizada
5. Se não decidir em 48h: escala para Nível 2
6. Processo se repete até o nível máximo

---

### 4. AUTOAPROVACAO_PERFIL (Auto-aprovação por Perfil)

**Descrição**: Permite que usuários com perfis específicos executem ações sem aprovação adicional, baseado em suas permissões e contexto.

**Quando usar**:
- Usuários com alta autoridade
- Ações de emergência
- Processos que precisam de execução imediata

**Configuração**:
```typescript
{
  estrategia: EstrategiaAprovacao.AUTOAPROVACAO_PERFIL,
  min_aprovadores: 0,
  perfis_autoaprovacao: ['DIRETOR_GERAL', 'ADMINISTRADOR_SISTEMA'],
  condicoes_autoaprovacao: {
    horario_comercial: true,
    valor_maximo: 10000,
    unidade_origem: 'mesma_unidade'
  }
}
```

**Exemplo Prático**:
```typescript
// Configuração para aprovação emergencial
const configuracao = {
  tipo_acao: TipoAcaoCritica.APROVACAO_EMERGENCIAL,
  nome: 'Aprovação Emergencial',
  descricao: 'Aprovação emergencial de benefício em situação crítica',
  estrategia: EstrategiaAprovacao.AUTOAPROVACAO_PERFIL,
  min_aprovadores: 0,
  perfis_autoaprovacao: [
    'DIRETOR_GERAL',
    'COORDENADOR_EMERGENCIA',
    'SUPERVISOR_PLANTAO'
  ],
  condicoes_autoaprovacao: {
    situacao_emergencia: true,
    valor_maximo: 5000,
    documentacao_minima: true
  },
  aprovadores_fallback: [
    'uuid-diretor-regional',
    'uuid-coordenador-geral'
  ]
};

// Uso no controller
@RequerAprovacao({
  tipo: TipoAcaoCritica.APROVACAO_EMERGENCIAL,
  descricao: 'Aprovação emergencial de benefício'
})
@Post('beneficio/:id/aprovacao-emergencial')
async aprovarEmergencial(
  @Param('id') id: string,
  @Body() dados: AprovacaoEmergencialDto,
  @GetUser() usuario: Usuario
) {
  return this.beneficioService.aprovarEmergencial(id, dados, usuario);
}
```

**Condições de Auto-aprovação**:
```typescript
// Verificação automática no interceptor
const podeAutoAprovar = (
  usuario.perfis.some(p => configuracao.perfis_autoaprovacao.includes(p)) &&
  dados.valor <= configuracao.condicoes_autoaprovacao.valor_maximo &&
  dados.situacao_emergencia === true &&
  usuario.unidade_id === dados.unidade_origem
);

if (podeAutoAprovar) {
  // Executa ação diretamente
  return next.handle();
} else {
  // Cria solicitação para aprovadores fallback
  return criarSolicitacaoAprovacao();
}
```

---

## 🔧 Configuração Avançada

### Parâmetros Comuns

```typescript
interface ConfiguracaoAprovacao {
  // Identificação
  tipo_acao: TipoAcaoCritica;
  nome: string;
  descricao: string;
  
  // Estratégia
  estrategia: EstrategiaAprovacao;
  min_aprovadores: number;
  
  // Aprovadores
  aprovadores_ids: string[];
  perfis_autoaprovacao?: string[];
  
  // Prazos
  prazo_aprovacao_horas?: number; // Padrão: 72h
  prazo_execucao_horas?: number;  // Padrão: 24h
  
  // Condições especiais
  condicoes_autoaprovacao?: {
    horario_comercial?: boolean;
    valor_maximo?: number;
    unidade_origem?: string;
    situacao_emergencia?: boolean;
    [key: string]: any;
  };
  
  // Escalonamento (apenas para ESCALONAMENTO_SETOR)
  configuracao_escalonamento?: {
    tempo_limite_nivel: number; // horas
    nivel_maximo: number;
    auto_escalar: boolean;
  };
  
  // Fallback
  aprovadores_fallback?: string[];
  
  // Controle
  ativo: boolean;
  data_inicio?: Date;
  data_fim?: Date;
}
```

### Exemplos de Configuração Completa

#### 1. Exclusão de Registro (Estratégia MAIORIA)

```typescript
const configuracaoExclusao = {
  tipo_acao: TipoAcaoCritica.EXCLUSAO_REGISTRO,
  nome: 'Exclusão Permanente de Registro',
  descricao: 'Exclusão permanente de registro do sistema (ação irreversível)',
  estrategia: EstrategiaAprovacao.MAIORIA,
  min_aprovadores: 3,
  aprovadores_ids: [
    'uuid-coordenador-juridico',
    'uuid-coordenador-tecnico',
    'uuid-diretor-regional',
    'uuid-auditor-interno',
    'uuid-dpo' // Data Protection Officer
  ],
  prazo_aprovacao_horas: 120, // 5 dias
  prazo_execucao_horas: 48,   // 2 dias após aprovação
  condicoes_autoaprovacao: {
    // Nenhuma auto-aprovação permitida
  },
  ativo: true
};
```

#### 2. Transferência de Benefício (Estratégia ESCALONAMENTO_SETOR)

```typescript
const configuracaoTransferencia = {
  tipo_acao: TipoAcaoCritica.TRANSFERENCIA_BENEFICIO,
  nome: 'Transferência de Benefício',
  descricao: 'Transferência de benefício entre unidades ou responsáveis',
  estrategia: EstrategiaAprovacao.ESCALONAMENTO_SETOR,
  min_aprovadores: 1,
  aprovadores_ids: [
    'uuid-coordenador-origem',    // Nível 1
    'uuid-coordenador-destino',   // Nível 2
    'uuid-diretor-regional',      // Nível 3
    'uuid-diretor-geral'          // Nível 4
  ],
  configuracao_escalonamento: {
    tempo_limite_nivel: 24,
    nivel_maximo: 4,
    auto_escalar: true
  },
  prazo_aprovacao_horas: 96, // 4 dias total
  condicoes_autoaprovacao: {
    valor_maximo: 1000,
    mesma_regional: true
  },
  perfis_autoaprovacao: ['DIRETOR_REGIONAL'],
  ativo: true
};
```

#### 3. Alteração de Valor (Estratégia AUTOAPROVACAO_PERFIL)

```typescript
const configuracaoAlteracaoValor = {
  tipo_acao: TipoAcaoCritica.ALTERACAO_VALOR_BENEFICIO,
  nome: 'Alteração de Valor de Benefício',
  descricao: 'Alteração do valor monetário de benefício já concedido',
  estrategia: EstrategiaAprovacao.AUTOAPROVACAO_PERFIL,
  min_aprovadores: 0,
  perfis_autoaprovacao: [
    'COORDENADOR_FINANCEIRO',
    'DIRETOR_REGIONAL',
    'DIRETOR_GERAL'
  ],
  condicoes_autoaprovacao: {
    percentual_maximo_aumento: 20, // Máximo 20% de aumento
    valor_maximo_absoluto: 2000,
    horario_comercial: true,
    documentacao_completa: true
  },
  aprovadores_fallback: [
    'uuid-diretor-financeiro',
    'uuid-diretor-geral',
    'uuid-auditor-chefe'
  ],
  prazo_aprovacao_horas: 48,
  ativo: true
};
```

---

## 📊 Monitoramento e Métricas

### Métricas por Estratégia

```typescript
// Exemplo de consulta de métricas
const metricas = await aprovacaoService.obterMetricasEstrategia({
  estrategia: EstrategiaAprovacao.MAIORIA,
  periodo: {
    inicio: new Date('2024-01-01'),
    fim: new Date('2024-01-31')
  }
});

// Resultado esperado:
{
  total_solicitacoes: 150,
  aprovadas: 120,
  rejeitadas: 25,
  expiradas: 5,
  tempo_medio_aprovacao: '18.5 horas',
  taxa_aprovacao: '80%',
  aprovadores_mais_ativos: [
    { usuario_id: 'uuid-1', total_decisoes: 45 },
    { usuario_id: 'uuid-2', total_decisoes: 38 }
  ]
}
```

### Dashboard de Aprovações

```typescript
// Endpoint para dashboard
@Get('dashboard/estrategias')
async obterDashboardEstrategias(
  @Query() filtros: FiltrosDashboardDto
) {
  return {
    resumo_geral: {
      total_configuracoes_ativas: 25,
      solicitacoes_pendentes: 12,
      tempo_medio_global: '24.2 horas'
    },
    por_estrategia: {
      [EstrategiaAprovacao.SIMPLES]: {
        configuracoes: 10,
        solicitacoes_mes: 85,
        taxa_aprovacao: '92%'
      },
      [EstrategiaAprovacao.MAIORIA]: {
        configuracoes: 8,
        solicitacoes_mes: 45,
        taxa_aprovacao: '78%'
      },
      [EstrategiaAprovacao.ESCALONAMENTO_SETOR]: {
        configuracoes: 5,
        solicitacoes_mes: 20,
        taxa_aprovacao: '85%'
      },
      [EstrategiaAprovacao.AUTOAPROVACAO_PERFIL]: {
        configuracoes: 2,
        execucoes_diretas: 150,
        taxa_autoaprovacao: '95%'
      }
    }
  };
}
```

---

## 🚨 Boas Práticas

### 1. Escolha da Estratégia Adequada

- **SIMPLES**: Para ações rotineiras e de baixo risco
- **MAIORIA**: Para decisões importantes que afetam múltiplas áreas
- **ESCALONAMENTO_SETOR**: Para seguir hierarquia organizacional
- **AUTOAPROVACAO_PERFIL**: Para usuários com alta autoridade em situações específicas

### 2. Configuração de Aprovadores

```typescript
// ✅ Bom: Diversidade de perfis
aprovadores_ids: [
  'uuid-coordenador-tecnico',
  'uuid-coordenador-juridico',
  'uuid-diretor-regional'
]

// ❌ Ruim: Todos do mesmo setor
aprovadores_ids: [
  'uuid-analista-1',
  'uuid-analista-2',
  'uuid-analista-3'
]
```

### 3. Definição de Prazos

```typescript
// ✅ Bom: Prazos realistas baseados na complexidade
{
  tipo_acao: TipoAcaoCritica.EXCLUSAO_REGISTRO,
  prazo_aprovacao_horas: 120, // 5 dias para decisão crítica
  prazo_execucao_horas: 48    // 2 dias para executar
}

// ❌ Ruim: Prazos muito apertados
{
  tipo_acao: TipoAcaoCritica.ALTERACAO_DADOS_CRITICOS,
  prazo_aprovacao_horas: 2,   // Muito pouco tempo
  prazo_execucao_horas: 1
}
```

### 4. Condições de Auto-aprovação

```typescript
// ✅ Bom: Condições específicas e limitadas
condicoes_autoaprovacao: {
  valor_maximo: 1000,
  horario_comercial: true,
  mesma_unidade: true,
  documentacao_completa: true
}

// ❌ Ruim: Condições muito amplas
condicoes_autoaprovacao: {
  // Qualquer situação permite auto-aprovação
}
```

---

## 🔍 Troubleshooting

### Problemas Comuns

#### 1. Solicitações Ficando Pendentes

**Sintoma**: Solicitações não são aprovadas nem rejeitadas

**Possíveis Causas**:
- Aprovadores inativos ou sem acesso
- Notificações não sendo entregues
- Configuração incorreta da estratégia

**Solução**:
```typescript
// Verificar aprovadores ativos
const aprovadoresAtivos = await usuarioService.verificarAprovadoresAtivos(
  configuracao.aprovadores_ids
);

// Reenviar notificações
await notificacaoService.reenviarNotificacoesPendentes(solicitacaoId);

// Adicionar aprovadores substitutos
await aprovacaoService.adicionarAprovadoresSubstitutos(
  solicitacaoId,
  ['uuid-substituto-1', 'uuid-substituto-2']
);
```

#### 2. Auto-aprovação Não Funcionando

**Sintoma**: Usuários com perfil adequado não conseguem auto-aprovar

**Verificação**:
```typescript
// Debug das condições
const debug = await aprovacaoService.debugCondicoesAutoaprovacao(
  usuario,
  configuracao,
  dadosAcao
);

console.log('Condições de auto-aprovação:', debug);
// {
//   perfil_adequado: true,
//   valor_dentro_limite: false, // ❌ Problema aqui
//   horario_comercial: true,
//   unidade_correta: true
// }
```

#### 3. Escalonamento Não Funcionando

**Sintoma**: Solicitações não escalam automaticamente

**Verificação**:
```typescript
// Verificar configuração de escalonamento
const statusEscalonamento = await aprovacaoService.verificarEscalonamento(
  solicitacaoId
);

console.log('Status do escalonamento:', statusEscalonamento);
// {
//   nivel_atual: 1,
//   tempo_no_nivel: '25 horas', // ❌ Passou do limite
//   proximo_escalonamento: '1 hora atrás', // ❌ Deveria ter escalado
//   auto_escalar_ativo: false // ❌ Problema aqui
// }
```

---

## 📚 Referências

- [API Reference](./api-reference.md) - Documentação completa da API
- [Guia de Migração](./guia-migracao-aprovacao-v2.md) - Como migrar do sistema anterior
- [Exemplos Avançados](./exemplos-avancados.md) - Casos de uso complexos
- [Auditoria e Logs](./auditoria-logs.md) - Sistema de auditoria integrado