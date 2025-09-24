# Diagnóstico e Solução: Erro de Constraint na Renovação de Benefícios

## 1. Resumo do Problema

**Erro:** `duplicate key value violates unique constraint "UQ_dados_cesta_basica_solicitacao"`

**Contexto:** Durante o processo de renovação de benefício, o sistema falha ao tentar copiar os dados específicos do benefício (cesta básica) da solicitação original para a nova solicitação de renovação.

**Impacto:** A renovação é interrompida e o usuário recebe erro interno do servidor (HTTP 500).

## 2. Análise Técnica

### 2.1 Fatos Confirmados
- ✅ A nova solicitação é criada com sucesso (UUID único: `85cd457e-db31-443d-90a3-ed83ebf3757c`)
- ✅ Não existem registros na tabela `dados_cesta_basica` para a nova solicitação
- ✅ A constraint `UQ_dados_cesta_basica_solicitacao` é simples: `UNIQUE(solicitacao_id)`
- ✅ O processo de validação e criação da solicitação funciona corretamente

### 2.2 Local do Erro
**Arquivo:** `RenovacaoService.copiarDadosEspecificosBeneficio`
**Linha:** ~317 (chamada para `dadosBeneficioFactory.createWithManager`)
**Método:** `AbstractDadosBeneficioService.createWithManager`

## 3. Fluxo Atual (Problemático)

```
1. RenovacaoService.iniciarRenovacao()
   ↓
2. Validação de elegibilidade (✅ Sucesso)
   ↓
3. Criação da nova solicitação (✅ Sucesso)
   ↓
4. copiarDadosEspecificosBeneficio()
   ↓
5. dadosBeneficioFactory.createWithManager()
   ↓
6. AbstractDadosBeneficioService.createWithManager()
   ↓
7. repository.findOne() [Verificação de existência]
   ↓
8. repository.create() e repository.save() [❌ FALHA AQUI]
   ↓
9. ERRO: Constraint violation
```

## 4. Causas Prováveis

### 4.1 Causa Principal Suspeita
**Problema na verificação de existência dentro da transação**

O método `createWithManager` executa:
```typescript
const existingData = await repository.findOne({
  where: { solicitacao_id: createDto.solicitacao_id } as any,
});
```

**Hipótese:** O `findOne` dentro da transação pode não estar funcionando corretamente, sempre retornando `null` mesmo quando dados já foram inseridos anteriormente na mesma transação, causando tentativas múltiplas de inserção.

### 4.2 Outras Possibilidades
1. **Execução múltipla do método:** O `copiarDadosEspecificosBeneficio` pode estar sendo chamado mais de uma vez
2. **Problema com EntityManager:** O `entityManager.getRepository()` pode não estar isolando corretamente as operações
3. **Condição de corrida:** Múltiplas threads executando o mesmo processo simultaneamente

## 5. Soluções Recomendadas

### 5.1 Solução Imediata (Tratamento de Erro)

**Modificar o método `copiarDadosEspecificosBeneficio` para capturar especificamente o erro de constraint:**

```typescript
private async copiarDadosEspecificosBeneficio(
  solicitacaoOriginal: Solicitacao,
  novaSolicitacao: Solicitacao,
  queryRunner?: any,
): Promise<void> {
  try {
    this.logger.log(
      `Copiando dados específicos do benefício da solicitação ${solicitacaoOriginal.id} para ${novaSolicitacao.id}`,
    );

    // Buscar dados específicos da solicitação original
    const dadosOriginais = await this.dadosBeneficioFactory.findBySolicitacao(
      solicitacaoOriginal.tipo_beneficio_id,
      solicitacaoOriginal.id,
    );

    if (!dadosOriginais) {
      this.logger.warn(
        `Nenhum dado específico encontrado para a solicitação original ${solicitacaoOriginal.id}`,
      );
      return;
    }

    // Preparar dados para cópia
    const dadosParaCopia = {
      ...dadosOriginais,
      id: undefined,
      solicitacao_id: novaSolicitacao.id,
      created_at: undefined,
      updated_at: undefined,
    };

    // Usar o EntityManager da transação se disponível
    const entityManager = queryRunner ? queryRunner.manager : this.dataSource.manager;

    // Verificar se já existem dados para evitar duplicação
    const repository = entityManager.getRepository(this.dadosBeneficioFactory.getRepositoryToken(novaSolicitacao.tipo_beneficio_id));
    const existingData = await repository.findOne({
      where: { solicitacao_id: novaSolicitacao.id }
    });

    if (existingData) {
      this.logger.warn(`Dados específicos já existem para a solicitação ${novaSolicitacao.id}. Pulando criação.`);
      return;
    }

    // Criar dados usando o factory com o EntityManager da transação
    await this.dadosBeneficioFactory.createWithManager(
      novaSolicitacao.tipo_beneficio_id,
      dadosParaCopia,
      entityManager,
    );

    this.logger.log(
      `Dados específicos copiados com sucesso para a solicitação ${novaSolicitacao.id}`,
    );
  } catch (error) {
    // Tratamento específico para violação de constraint
    if (error.code === '23505' && error.constraint === 'UQ_dados_cesta_basica_solicitacao') {
      this.logger.warn(
        `Dados específicos já existem para a solicitação ${novaSolicitacao.id}. Continuando processo.`
      );
      return; // Não interromper o processo por dados já existentes
    }

    this.logger.error(
      `Erro ao copiar dados específicos do benefício: ${error.message}`,
      error.stack,
    );
    throw new InternalServerErrorException(
      'Erro interno ao copiar dados específicos do benefício',
    );
  }
}
```

### 5.2 Solução Estrutural (Melhoria do createWithManager)

**Modificar o método `createWithManager` no `AbstractDadosBeneficioService`:**

```typescript
async createWithManager(createDto: TCreateDto, entityManager: EntityManager): Promise<TEntity> {
  // Validação específica do benefício
  await this.validateCreateData(createDto);

  // Usar o repository do EntityManager fornecido
  const repository = entityManager.getRepository(this.repository.target);

  // MELHORIA: Usar transação explícita para verificação e criação atômica
  return await entityManager.transaction(async (transactionManager) => {
    // Verificar se já existem dados para esta solicitação dentro da sub-transação
    const existingData = await transactionManager.findOne(this.repository.target, {
      where: { solicitacao_id: createDto.solicitacao_id } as any,
    });

    const usuarioId = createDto.usuario_id || null;
    let savedEntity: TEntity;
    let isUpdate = false;

    if (existingData) {
      // Atualizar dados existentes (upsert)
      isUpdate = true;
      await this.validateUpdateData(createDto as any, existingData);
      
      Object.assign(existingData, createDto, {
        updated_at: new Date(),
      });

      savedEntity = await transactionManager.save(existingData);
      
      this.logger.log(
        `Dados de ${this.entityName} atualizados com sucesso para solicitação ${createDto.solicitacao_id} (transação)`,
      );
    } else {
      // Criar nova entidade
      try {
        const entity = transactionManager.create(this.repository.target, createDto as any);
        savedEntity = (await transactionManager.save(entity)) as unknown as TEntity;

        this.logger.log(
          `Dados de ${this.entityName} criados com sucesso para solicitação ${createDto.solicitacao_id} (transação)`,
        );
      } catch (saveError) {
        if (saveError.code === '23505' && saveError.constraint?.includes('solicitacao')) {
          this.logger.warn(
            `Violação de constraint detectada para ${this.entityName} - solicitação ${createDto.solicitacao_id}. Tentando buscar dados existentes.`,
          );
          
          // Tentar buscar novamente na sub-transação
          const existingDataRetry = await transactionManager.findOne(this.repository.target, {
            where: { solicitacao_id: createDto.solicitacao_id } as any,
          });

          if (existingDataRetry) {
            // Retornar dados existentes sem atualizar
            return existingDataRetry as unknown as TEntity;
          } else {
            // Se ainda não encontrar, há problema mais profundo
            throw new Error(`Constraint violation sem dados existentes detectáveis para solicitação ${createDto.solicitacao_id}`);
          }
        } else {
          throw saveError;
        }
      }
    }

    // Atualizar campos específicos na entidade Solicitacao usando o TransactionManager
    await this.atualizarCamposSolicitacaoWithManager(createDto.solicitacao_id, createDto, transactionManager);

    // Atualizar status apenas se for criação
    if (!isUpdate) {
      await this.atualizarStatusSolicitacaoWithManager(
        createDto.solicitacao_id,
        usuarioId,
        transactionManager,
      );
    }

    return savedEntity as unknown as TEntity;
  });
}
```

### 5.3 Solução de Diagnóstico (Logs Detalhados)

**Adicionar logs específicos para rastrear o problema:**

```typescript
// No início do copiarDadosEspecificosBeneficio
this.logger.debug(`[DEBUG] Iniciando cópia de dados - Solicitação origem: ${solicitacaoOriginal.id}, Destino: ${novaSolicitacao.id}`);

// Antes da chamada ao createWithManager
this.logger.debug(`[DEBUG] Preparando dados para cópia:`, {
  solicitacao_id: novaSolicitacao.id,
  tipo_beneficio_id: novaSolicitacao.tipo_beneficio_id,
  dados_originais_id: dadosOriginais?.id
});

// No createWithManager, antes do findOne
this.logger.debug(`[DEBUG] Verificando existência de dados para solicitação: ${createDto.solicitacao_id}`);

// Após o findOne
this.logger.debug(`[DEBUG] Resultado da verificação:`, { 
  existingData: !!existingData, 
  existingId: existingData?.id 
});
```

## 6. Plano de Implementação

### Fase 1: Implementação Imediata
1. Aplicar a **Solução Imediata** no método `copiarDadosEspecificosBeneficio`
2. Adicionar logs detalhados para diagnóstico
3. Testar a renovação em ambiente de desenvolvimento

### Fase 2: Validação
1. Executar testes de renovação com diferentes tipos de benefício
2. Verificar se o tratamento de erro não mascara outros problemas
3. Monitorar logs para identificar padrões

### Fase 3: Melhoria Estrutural
1. Implementar a **Solução Estrutural** no `createWithManager`
2. Refatorar para usar sub-transações explícitas
3. Realizar testes de carga para verificar condições de corrida

## 7. Validação da Solução

### Critérios de Sucesso
- ✅ Renovações completadas sem erro de constraint
- ✅ Dados específicos do benefício copiados corretamente
- ✅ Logs indicando comportamento esperado
- ✅ Nenhum impacto em outras funcionalidades

### Testes Recomendados
1. **Teste funcional:** Renovação de diferentes tipos de benefício
2. **Teste de concorrência:** Múltiplas renovações simultâneas
3. **Teste de recuperação:** Verificar comportamento após falhas
4. **Teste de regressão:** Garantir que outras funcionalidades não foram afetadas

## 8. Monitoramento Pós-Implementação

### Métricas a Acompanhar
- Taxa de sucesso das renovações
- Frequência de logs de warning sobre dados existentes
- Tempo de processamento das renovações
- Incidência de outros erros relacionados

### Alertas Recomendados
- Erro de constraint violation persistente após a correção
- Aumento no tempo de processamento das renovações
- Falhas em outras operações de dados específicos de benefício