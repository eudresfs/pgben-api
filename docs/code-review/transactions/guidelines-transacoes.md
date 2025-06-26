# Guidelines para Uso Seguro de Transações

## Objetivo

Este documento estabelece diretrizes para o uso seguro de transações no sistema PGBEN, visando reduzir o risco de deadlocks, melhorar a performance e aumentar a estabilidade do sistema.

## Princípios Fundamentais

1. **Escopo Mínimo**: Transações devem ter o menor escopo possível, englobando apenas operações de escrita que precisam ser atômicas.
2. **Separação de Responsabilidades**: Leituras, validações e operações externas devem ser realizadas fora do contexto transacional.
3. **Tipagem Correta**: Sempre use repositórios tipados dentro de transações para garantir segurança de tipos.
4. **Monitoramento**: Todas as transações devem ser adequadamente logadas para facilitar o diagnóstico de problemas.

## Padrão Recomendado

### 1. Estrutura Básica

```typescript
async minhaOperacao(id: string, dados: any): Promise<Resultado> {
  this.logger.info(`Iniciando operação: ${id}`);
  
  try {
    // ===== VALIDAÇÕES E LEITURAS FORA DA TRANSAÇÃO =====
    const entidadeExistente = await this.repository.findOne({ where: { id } });
    
    if (!entidadeExistente) {
      throw new NotFoundException(`Entidade ${id} não encontrada`);
    }
    
    // Validações de regras de negócio
    if (entidadeExistente.status !== StatusPermitido) {
      throw new BadRequestException(`Status inválido para operação`);
    }
    
    // Preparar dados para atualização
    const dadosAtualizacao = {
      // ... dados a serem atualizados
      data_atualizacao: new Date()
    };
    
    // ===== TRANSAÇÃO MÍNIMA APENAS PARA OPERAÇÕES DE ESCRITA =====
    await executeMinimalTransaction(this.dataSource, {
      writeOperation: async (manager) => {
        // Usar repositórios tipados
        const repo = getTypedRepository(MinhaEntidade, manager);
        const historicoRepo = getTypedRepository(Historico, manager);
        
        // Operações de escrita
        await repo.update(id, dadosAtualizacao);
        
        // Registrar histórico
        const historico = historicoRepo.create({
          // ... dados do histórico
        });
        await historicoRepo.save(historico);
      },
      operationId: `minha-operacao-${id}`,
      logger: this.logger
    });
    
    // ===== CONSULTA PÓS-TRANSAÇÃO =====
    const resultado = await this.repository.findOne({ 
      where: { id },
      relations: ['relacionamentos', 'necessarios']
    });
    
    this.logger.info(`Operação ${id} concluída com sucesso`);
    return resultado;
  } catch (error) {
    this.logger.error(`Erro na operação ${id}: ${error.message}`, error.stack);
    throw error;
  }
}
```

### 2. Checklist de Implementação

- [ ] Todas as validações são realizadas fora da transação
- [ ] Todas as leituras iniciais são realizadas fora da transação
- [ ] A transação contém apenas operações de escrita
- [ ] Repositórios dentro da transação são obtidos via `getTypedRepository`
- [ ] Logs adequados são implementados (início, sucesso, erro)
- [ ] Tratamento de erros é implementado corretamente
- [ ] Consultas pós-transação são realizadas fora da transação

## Antipadrões a Evitar

1. **Transações Longas**: Evite manter transações abertas por muito tempo, especialmente durante operações de I/O ou chamadas externas.

```typescript
// ERRADO
return this.connection.transaction(async (manager) => {
  const entidade = await this.repository.findOne({ where: { id } }); // Leitura dentro da transação
  
  if (!entidade) {
    throw new NotFoundException(); // Validação dentro da transação
  }
  
  // ... mais validações e lógica de negócio
  
  await manager.save(entidade);
  
  return entidade;
});
```

2. **Duplicação de Leituras**: Evite ler a mesma entidade fora e dentro da transação.

```typescript
// ERRADO
const entidade = await this.repository.findOne({ where: { id } });

return this.connection.transaction(async (manager) => {
  const entidadeNaTransacao = await manager.findOne(Entidade, { where: { id } }); // Leitura duplicada
  
  // ... operações
});
```

3. **Falta de Tipagem**: Evite usar o manager diretamente sem tipagem adequada.

```typescript
// ERRADO
await manager.save(entidade); // Sem tipagem explícita

// CORRETO
const repo = manager.getRepository(Entidade);
await repo.save(entidade);

// MELHOR AINDA
const repo = getTypedRepository(Entidade, manager);
await repo.save(entidade);
```

## Utilitários Disponíveis

Para facilitar a implementação desse padrão, utilize os utilitários disponíveis em `src/shared/utils/safe-transaction.util.ts`:

1. `executeMinimalTransaction`: Executa uma transação com escopo mínimo
2. `getTypedRepository`: Obtém um repositório tipado a partir do EntityManager

## Monitoramento e Diagnóstico

Para facilitar o diagnóstico de problemas relacionados a transações:

1. Use identificadores únicos para cada operação transacional
2. Implemente logs detalhados antes, durante e após a transação
3. Registre o tempo de execução das transações para identificar gargalos

## Referências

- [TypeORM Transactions Documentation](https://typeorm.io/#/transactions)
- [PostgreSQL Transaction Isolation](https://www.postgresql.org/docs/current/transaction-iso.html)
- [Deadlock Prevention Strategies](https://www.postgresql.org/docs/current/explicit-locking.html#LOCKING-DEADLOCKS)
