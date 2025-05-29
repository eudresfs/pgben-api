# Plano de Ação - Implementação de Seeds de Permissões Faltantes

## Situação Atual

Após análise completa do sistema de permissões, foram identificados **8 módulos** que não possuem seeds de permissões implementados, comprometendo o controle de acesso e segurança do sistema.

## Módulos Identificados sem Seeds

### ✅ Prioridade CRÍTICA (Permissões root já definidas)
1. **Notificação** - Permissão root `notificacao.*` existe, mas seed específico ausente
2. **Métrica** - Permissão root `metrica.*` existe, mas seed específico ausente

### 🔶 Prioridade ALTA (Módulos críticos para operação)
3. **Pagamento** - Essencial para processamento de benefícios
4. **Judicial** - Necessário para determinações judiciais
5. **Integrador** - Fundamental para integrações externas

### 🔸 Prioridade MÉDIA (Módulos complementares)
6. **Ocorrência** - Importante para gestão de demandas
7. **Recurso** - Necessário para processo de recursos
8. **Relatórios Unificado** - Complementar ao módulo de relatórios existente

## Estratégia de Implementação

### Fase 1: Correção de Inconsistências (Prioridade CRÍTICA)
- **Objetivo**: Corrigir inconsistências entre permissões root e seeds específicos
- **Prazo**: Imediato
- **Ações**:
  1. Criar `permission-notificacao.seed.ts`
  2. Criar `permission-metrica.seed.ts`
  3. Atualizar `permission.seed.ts` para incluir execução dos novos seeds
  4. Atualizar `permission-role-mapping.seed.ts` com novas permissões

### Fase 2: Módulos Críticos (Prioridade ALTA)
- **Objetivo**: Implementar permissões para módulos essenciais
- **Prazo**: 1-2 dias
- **Ações**:
  1. Criar `permission-pagamento.seed.ts`
  2. Criar `permission-judicial.seed.ts`
  3. Criar `permission-integrador.seed.ts`
  4. Adicionar permissões root no `permission.seed.ts`
  5. Atualizar mapeamento de roles

### Fase 3: Módulos Complementares (Prioridade MÉDIA)
- **Objetivo**: Completar cobertura de permissões
- **Prazo**: 2-3 dias
- **Ações**:
  1. Criar `permission-ocorrencia.seed.ts`
  2. Criar `permission-recurso.seed.ts`
  3. Criar `permission-relatorios-unificado.seed.ts`
  4. Finalizar atualizações de mapeamento

## Estrutura Padrão dos Seeds

Cada seed deve seguir o padrão estabelecido:

```typescript
/**
 * Seed de permissões para o módulo [NOME_MODULO]
 */
export class Permission[ModuloName]Seed {
  static async run(dataSource: DataSource): Promise<void> {
    // 1. Verificar estrutura da tabela
    // 2. Criar permissão composta (modulo.*)
    // 3. Criar permissões granulares
    // 4. Definir escopos apropriados
  }
}
```

## Permissões por Módulo

### Notificação
- `notificacao.*` (composta)
- `notificacao.listar`
- `notificacao.visualizar`
- `notificacao.criar`
- `notificacao.editar`
- `notificacao.excluir`
- `notificacao.enviar`
- `notificacao.template.listar`
- `notificacao.template.criar`
- `notificacao.template.editar`
- `notificacao.template.excluir`

### Métrica
- `metrica.*` (composta)
- `metrica.listar`
- `metrica.visualizar`
- `metrica.configurar`
- `metrica.gerar_relatorio`
- `metrica.exportar`
- `metrica.alertas.listar`
- `metrica.alertas.configurar`
- `metrica.alertas.ativar`
- `metrica.alertas.desativar`

### Pagamento
- `pagamento.*` (composta)
- `pagamento.listar`
- `pagamento.visualizar`
- `pagamento.processar`
- `pagamento.confirmar`
- `pagamento.cancelar`
- `pagamento.comprovante.gerar`
- `pagamento.comprovante.visualizar`
- `pagamento.comprovante.download`

### Judicial
- `judicial.*` (composta)
- `judicial.listar`
- `judicial.visualizar`
- `judicial.criar`
- `judicial.editar`
- `judicial.excluir`
- `judicial.processo.vincular`
- `judicial.processo.desvincular`
- `judicial.determinacao.criar`
- `judicial.determinacao.editar`

### Integrador
- `integrador.*` (composta)
- `integrador.listar`
- `integrador.visualizar`
- `integrador.criar`
- `integrador.editar`
- `integrador.excluir`
- `integrador.token.gerar`
- `integrador.token.revogar`
- `integrador.token.renovar`

### Ocorrência
- `ocorrencia.*` (composta)
- `ocorrencia.listar`
- `ocorrencia.visualizar`
- `ocorrencia.criar`
- `ocorrencia.editar`
- `ocorrencia.excluir`
- `ocorrencia.resolver`
- `ocorrencia.escalar`
- `ocorrencia.motivo.listar`
- `ocorrencia.motivo.criar`

### Recurso
- `recurso.*` (composta)
- `recurso.listar`
- `recurso.visualizar`
- `recurso.criar`
- `recurso.editar`
- `recurso.analisar`
- `recurso.deferir`
- `recurso.indeferir`
- `recurso.historico.visualizar`

### Relatórios Unificado
- `relatorios_unificado.*` (composta)
- `relatorios_unificado.gerar`
- `relatorios_unificado.exportar`
- `relatorios_unificado.agendar`
- `relatorios_unificado.configurar`
- `relatorios_unificado.historico.visualizar`

## Mapeamento de Roles

### ADMIN
- Todas as permissões de todos os módulos (`*.*`)

### GESTOR
- Permissões de visualização e gestão para todos os módulos
- Permissões específicas de configuração e relatórios

### TECNICO
- Permissões operacionais para módulos de atendimento
- Acesso limitado a configurações

### ASSISTENTE_SOCIAL
- Permissões específicas para atendimento ao cidadão
- Acesso a benefícios, solicitações e documentos

### CIDADAO
- Permissões muito limitadas
- Apenas consulta de próprios dados

## Checklist de Execução

### Fase 1 - Crítica
- [ ] Criar `permission-notificacao.seed.ts`
- [ ] Criar `permission-metrica.seed.ts`
- [ ] Atualizar imports em `permission.seed.ts`
- [ ] Adicionar execução dos seeds em `runModuleSeeders()`
- [ ] Testar execução dos seeds
- [ ] Atualizar `permission-role-mapping.seed.ts`

### Fase 2 - Alta
- [ ] Criar `permission-pagamento.seed.ts`
- [ ] Criar `permission-judicial.seed.ts`
- [ ] Criar `permission-integrador.seed.ts`
- [ ] Adicionar permissões root no array `moduleRoots`
- [ ] Atualizar execução em `runModuleSeeders()`
- [ ] Atualizar mapeamento de roles
- [ ] Testar todas as permissões

### Fase 3 - Média
- [ ] Criar `permission-ocorrencia.seed.ts`
- [ ] Criar `permission-recurso.seed.ts`
- [ ] Criar `permission-relatorios-unificado.seed.ts`
- [ ] Finalizar todas as atualizações
- [ ] Executar testes completos
- [ ] Validar mapeamento final de roles

## Testes e Validação

1. **Teste de Execução de Seeds**
   ```bash
   npm run seed:run
   ```

2. **Validação de Permissões no Banco**
   ```sql
   SELECT modulo, COUNT(*) as total_permissoes 
   FROM permissao 
   GROUP BY modulo 
   ORDER BY modulo;
   ```

3. **Validação de Mapeamento de Roles**
   ```sql
   SELECT r.nome as role, COUNT(rp.permissao_id) as total_permissoes
   FROM role r
   LEFT JOIN role_permissao rp ON r.id = rp.role_id
   GROUP BY r.nome;
   ```

## Riscos e Mitigações

### Riscos Identificados
1. **Inconsistência de dados** durante execução de seeds
2. **Conflitos de permissões** com dados existentes
3. **Falha na execução** de seeds por dependências

### Mitigações
1. **Backup do banco** antes da execução
2. **Execução em ambiente de desenvolvimento** primeiro
3. **Validação de estrutura** antes de cada seed
4. **Logs detalhados** para debugging
5. **Rollback plan** em caso de falha

## Cronograma Estimado

- **Dia 1**: Fase 1 (Crítica) - 4 horas
- **Dia 2**: Fase 2 (Alta) - 6 horas
- **Dia 3**: Fase 3 (Média) - 6 horas
- **Dia 4**: Testes e validação final - 4 horas

**Total estimado**: 20 horas de desenvolvimento

## Próximos Passos

1. Executar Fase 1 imediatamente
2. Validar funcionamento antes de prosseguir
3. Implementar Fases 2 e 3 sequencialmente
4. Documentar alterações realizadas
5. Atualizar documentação de permissões do sistema