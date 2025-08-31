# Sistema de Escopo: Diagnóstico e Correção Completa

## Contexto do Problema

Você está analisando um sistema NestJS com TypeORM que implementa controle de acesso baseado em escopo (GLOBAL, UNIDADE, PRÓPRIO). O sistema utiliza:

- **ScopeContextInterceptor**: Define contexto baseado no usuário JWT
- **ScopedRepository**: Aplica filtros automáticos nas queries
- **MetricasDashboardService**: Calcula métricas com escopo aplicado
- **FiltrosQueryHelper**: Utilitário para aplicar filtros dinâmicos

## Problema Identificado

**Sintoma**: Usuários com escopos diferentes (GLOBAL vs UNIDADE) retornam dados idênticos nos dashboards.

**Status Atual**: 
- ✅ Contexto sendo definido corretamente
- ✅ Queries aplicando filtros de escopo
- ❌ Resultados finais ainda idênticos

## Sua Missão

Execute esta análise em 3 fases sequenciais:

### FASE 1: Diagnóstico da Distribuição de Dados

Execute estas queries SQL para entender a distribuição real:

```sql
-- Query 1: Distribuição de solicitações por unidade
SELECT 
  u.nome as unidade,
  u.id as unidade_id,
  COUNT(s.*) as total_solicitacoes,
  ROUND(COUNT(s.*) * 100.0 / SUM(COUNT(s.*)) OVER(), 1) as percentual
FROM solicitacao s
JOIN cidadao c ON s.beneficiario_id = c.id
JOIN unidade u ON c.unidade_id = u.id
WHERE s.removed_at IS NULL
GROUP BY u.id, u.nome
ORDER BY total_solicitacoes DESC;

-- Query 2: Verificar unidade específica do usuário de teste
SELECT 
  u.nome as unidade_nome,
  u.id as unidade_id,
  COUNT(c.*) as total_beneficiarios,
  COUNT(s.*) as total_solicitacoes
FROM unidade u
LEFT JOIN cidadao c ON c.unidade_id = u.id AND c.removed_at IS NULL
LEFT JOIN solicitacao s ON s.beneficiario_id = c.id AND s.removed_at IS NULL
WHERE u.id = '67c08fb3-8b72-4338-9889-e450f7e1b40f'
GROUP BY u.id, u.nome;

-- Query 3: Comparar resultados GLOBAL vs UNIDADE
-- GLOBAL (todos os dados):
SELECT COUNT(*) as total_global FROM solicitacao WHERE removed_at IS NULL;

-- UNIDADE específica:
SELECT COUNT(*) as total_unidade
FROM solicitacao s
JOIN cidadao c ON s.beneficiario_id = c.id
WHERE s.removed_at IS NULL 
AND c.unidade_id = '67c08fb3-8b72-4338-9889-e450f7e1b40f';
```

**Analise os resultados e determine:**
- Se a unidade do usuário UNIDADE concentra a maioria dos dados
- Se existe diferença significativa entre os totais
- Se há problemas de mapeamento entre unidades

### FASE 2: Validação do Sistema de Escopo

Se a distribuição de dados explica a similaridade, **valide o sistema** criando cenário de teste:

```sql
-- Criar dados de teste para validação
INSERT INTO unidade (id, nome) VALUES 
('test-unit-001', 'Unidade Teste Pequena') 
ON CONFLICT (id) DO NOTHING;

-- Criar beneficiário de teste
INSERT INTO cidadao (id, nome, unidade_id) VALUES 
('test-beneficiary-001', 'Beneficiário Teste', 'test-unit-001')
ON CONFLICT (id) DO NOTHING;

-- Criar solicitações de teste (apenas 2-3)
INSERT INTO solicitacao (id, beneficiario_id, tipo_beneficio_id, status, data_abertura) VALUES 
('test-sol-001', 'test-beneficiary-001', (SELECT id FROM tipo_beneficio LIMIT 1), 'APROVADA', NOW()),
('test-sol-002', 'test-beneficiary-001', (SELECT id FROM tipo_beneficio LIMIT 1), 'APROVADA', NOW())
ON CONFLICT (id) DO NOTHING;
```

**Teste com usuário da unidade pequena** e confirme se há diferença nos resultados.

### FASE 3: Implementar Correções (Se Necessário)

Se encontrar problemas reais no sistema, implemente estas correções:

#### A. Adicionar Logging Detalhado

```typescript
// No MetricasDashboardService
private async calcularMetricasComLog(filtros?: MetricasFiltrosAvancadosDto) {
  const context = RequestContextHolder.get();
  
  this.logger.debug('[METRICS-DEBUG] Calculando métricas:', {
    contextType: context?.tipo,
    contextUnidadeId: context?.unidade_id,
    filtrosAplicados: filtros ? Object.keys(filtros).filter(k => filtros[k]) : 'nenhum'
  });

  const query = this.createScopedSolicitacaoQueryBuilder('solicitacao');
  
  // Log da query antes da execução
  this.logger.debug('[METRICS-DEBUG] Query SQL:', {
    sql: query.getQuery(),
    parameters: query.getParameters()
  });
  
  const resultado = await query.getCount();
  
  this.logger.debug('[METRICS-DEBUG] Resultado obtido:', {
    total: resultado,
    contextType: context?.tipo
  });
  
  return resultado;
}
```

#### B. Melhorar Validação de Contexto

```typescript
// No ScopedRepository
private applyScopeToQuery(queryBuilder: SelectQueryBuilder<Entity>, alias: string = 'entity'): void {
  const context = RequestContextHolder.get();

  if (!context) {
    this.logger.error('[SCOPE-ERROR] Contexto ausente - operação bloqueada');
    throw new ScopeContextRequiredException('query execution');
  }

  this.logger.debug('[SCOPE-APPLY] Aplicando escopo:', {
    tipo: context.tipo,
    unidadeId: context.unidade_id,
    entityName: this.metadata.name,
    alias
  });

  switch (context.tipo) {
    case ScopeType.UNIDADE:
      if (!context.unidade_id) {
        throw new Error('Contexto UNIDADE requer unidade_id');
      }
      this.applyCidadaoScopeToQuery(queryBuilder, alias, context.unidade_id);
      
      // Log de validação
      const finalSql = queryBuilder.getQuery();
      const hasUnitFilter = finalSql.includes('unidade_id');
      this.logger.debug('[SCOPE-VALIDATION]:', {
        hasUnitFilter,
        expectedUnidadeId: context.unidade_id,
        finalParameters: queryBuilder.getParameters()
      });
      break;
      
    case ScopeType.GLOBAL:
      this.logger.debug('[SCOPE-GLOBAL] Sem filtros aplicados');
      break;
  }
}
```

#### C. Criar Endpoint de Validação

```typescript
// Controller para debug
@Get('debug/scope-validation')
async debugScopeValidation() {
  const context = RequestContextHolder.get();
  
  const globalCount = await this.solicitacaoRepository
    .createQueryBuilder('s')
    .where('s.removed_at IS NULL')
    .getCount();
    
  const scopedCount = await this.scopedSolicitacaoRepository.countScoped();
  
  return {
    context,
    globalCount,
    scopedCount,
    difference: globalCount - scopedCount,
    scopeWorking: globalCount !== scopedCount || context.tipo === 'GLOBAL'
  };
}
```

## Entregáveis Esperados

1. **Relatório de Diagnóstico** com resultados das queries SQL
2. **Análise da causa raiz** (distribuição vs bug do sistema)
3. **Código das correções implementadas** (se necessário)
4. **Scripts de teste** para validar funcionamento
5. **Recomendações** para monitoramento contínuo

## Critérios de Sucesso

- [ ] Identificar causa exata da similaridade de dados
- [ ] Distinguir entre "funcionamento correto" vs "bug do sistema"  
- [ ] Implementar correções apenas se houver bug real
- [ ] Adicionar logs para monitoramento futuro
- [ ] Criar testes automatizados para validação contínua

Execute cada fase sequencialmente e documente todos os achados antes de prosseguir para a próxima.