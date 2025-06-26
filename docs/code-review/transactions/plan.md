# Plano de Refatoração: Prevenção de Deadlocks em Transações de Banco de Dados

## 🔍 Análise do Problema

### Problema Identificado
O código atual mantém transações abertas durante operações de leitura e validação, causando:
- **Locks prolongados** no banco de dados
- **Risco de deadlocks** entre transações concorrentes
- **Degradação de performance** em requisições simultâneas
- **Timeout de conexões** em cenários de alta concorrência

### Padrão Problemático Atual
```javascript
// ❌ PROBLEMÁTICO - Validações dentro da transação
return await this.dataSource.transaction(async (manager) => {
  // Operações de leitura dentro da transação
  const dadosSociais = await manager.findOne(DadosSociais, {
    where: { cidadao_id: cidadaoId }
  });
  
  // Validações que podem demorar
  if (!dadosSociais) {
    throw new NotFoundError("Dados não encontrados");
  }
  
  // Mais validações...
  if (this.hasBeneficiosData(updateData)) {
    this.validateBeneficiosData({...});
  }
  
  // Operações de escrita por último
  const updated = await manager.save(DadosSociais, normalized);
});
```

## 🎯 Estratégia de Refatoração

### Princípios Fundamentais
1. **Transações mínimas**: Apenas operações de escrita dentro de transações
2. **Validações externas**: Todas as validações fora do contexto transacional
3. **Leituras preparatórias**: Buscar dados necessários antes da transação
4. **Operações atômicas**: Agrupar apenas escritas relacionadas

### Padrão Recomendado
```javascript
// ✅ RECOMENDADO - Validações fora da transação
async update(cidadaoId: string, updateData: UpdateDadosSociaisDto) {
  // 1. LEITURAS E VALIDAÇÕES FORA DA TRANSAÇÃO
  const dadosExistentes = await this.dadosSociaisRepository.findOne({
    where: { cidadao_id: cidadaoId }
  });
  
  if (!dadosExistentes) {
    throw new NotFoundError(`Dados sociais não encontrados para o cidadão ${cidadaoId}`);
  }
  
  // Validações complexas fora da transação
  if (this.hasBeneficiosData(updateData)) {
    this.validateBeneficiosData({
      ...dadosExistentes,
      ...updateData
    });
  }
  
  const dadosNormalizados = normalizeEnumFields(updateData);
  
  // 2. TRANSAÇÃO APENAS PARA ESCRITA
  return await this.dataSource.transaction(async (manager) => {
    const updatedData = await manager.save(DadosSociais, {
      ...dadosExistentes,
      ...dadosNormalizados
    });
    
    this.logger.log(`Atualizando dados sociais do cidadão ${cidadaoId}`);
    return updatedData;
  });
}
```

## 📋 Plano de Execução

### Fase 1: Auditoria e Mapeamento (Semana 1)
1. **Identificar todos os arquivos com transações**
   ```bash
   # Buscar por padrões de transação
   grep -r "\.transaction(" src/
   grep -r "beginTransaction" src/
   grep -r "@Transaction" src/
   ```

2. **Catalogar padrões problemáticos**
   - Transações com `findOne`, `find`, `count` internos
   - Validações complexas dentro de transações
   - Operações de rede/API dentro de transações
   - Loops com queries dentro de transações

3. **Priorizar por impacto**
   - Endpoints mais utilizados
   - Transações mais longas
   - Módulos críticos do sistema

### Fase 2: Refatoração Crítica (Semana 2-3)
1. **Módulos de alta prioridade**
   - Usuários/Autenticação
   - Transações financeiras
   - Operações de CRUD principais

2. **Padrão de refatoração por arquivo**
   ```javascript
   // Template de refatoração
   async operacao(params) {
     // ETAPA 1: Preparação (fora da transação)
     const dadosExistentes = await this.buscarDados(params);
     this.validarRegrasNegocio(dadosExistentes, params);
     const dadosPreparados = this.prepararDados(dadosExistentes, params);
     
     // ETAPA 2: Transação mínima
     return await this.dataSource.transaction(async (manager) => {
       return await manager.save(Entidade, dadosPreparados);
     });
   }
   ```

### Fase 3: Implementação de Melhores Práticas (Semana 4)
1. **Criar utilitários comuns**
   ```javascript
   // utils/transaction-helpers.ts
   export class TransactionHelper {
     static async executeWithMinimalTransaction<T>(
       dataSource: DataSource,
       preparations: () => Promise<any>,
       transactionOp: (manager: EntityManager, preparedData: any) => Promise<T>
     ): Promise<T> {
       const preparedData = await preparations();
       return await dataSource.transaction(async (manager) => {
         return await transactionOp(manager, preparedData);
       });
     }
   }
   ```

2. **Estabelecer guidelines de código**
   - ESLint rules para detectar padrões problemáticos
   - Templates de código para operações comuns
   - Documentação de melhores práticas

## 🔧 Checklist de Refatoração por Arquivo

### Para cada arquivo com transações:
- [ ] **Identificar operações de leitura dentro de transações**
- [ ] **Mover validações para fora da transação**
- [ ] **Separar preparação de dados da execução**
- [ ] **Minimizar escopo da transação**
- [ ] **Adicionar logs de rastreamento**
- [ ] **Implementar testes de concorrência**
- [ ] **Documentar mudanças**

### Exemplo de transformação:
```javascript
// ANTES - Problemático
async criarUsuario(userData) {
  return await this.dataSource.transaction(async (manager) => {
    // ❌ Validação dentro da transação
    const existeEmail = await manager.findOne(User, {where: {email: userData.email}});
    if (existeEmail) throw new Error("Email já existe");
    
    // ❌ Validação complexa dentro da transação
    await this.validarRegrasComplexas(userData);
    
    // ❌ Operação externa dentro da transação
    const avatarUrl = await this.uploadService.upload(userData.avatar);
    
    return await manager.save(User, {...userData, avatarUrl});
  });
}

// DEPOIS - Otimizado
async criarUsuario(userData) {
  // ✅ Validações fora da transação
  const existeEmail = await this.userRepository.findOne({where: {email: userData.email}});
  if (existeEmail) throw new Error("Email já existe");
  
  await this.validarRegrasComplexas(userData);
  const avatarUrl = await this.uploadService.upload(userData.avatar);
  
  // ✅ Transação mínima apenas para escrita
  return await this.dataSource.transaction(async (manager) => {
    return await manager.save(User, {...userData, avatarUrl});
  });
}
```

## 📊 Métricas de Sucesso

### Antes da Refatoração
- Tempo médio de transação: **X segundos**
- Número de deadlocks/hora: **Y ocorrências**
- Timeout de conexões: **Z%**

### Metas Pós-Refatoração
- Reduzir tempo médio de transação em **80%**
- Eliminar **95%** dos deadlocks
- Reduzir timeouts para **< 1%**

### Monitoramento Contínuo
```javascript
// Middleware de monitoramento
export class TransactionMonitor {
  static logTransaction(operation: string, duration: number) {
    if (duration > 1000) { // > 1 segundo
      logger.warn(`Transação longa detectada: ${operation} - ${duration}ms`);
    }
  }
}
```

## 🚀 Benefícios Esperados

1. **Performance**: Redução significativa no tempo de resposta
2. **Concorrência**: Maior capacidade de processar requisições simultâneas
3. **Estabilidade**: Eliminação de deadlocks e timeouts
4. **Manutenibilidade**: Código mais limpo e separação clara de responsabilidades
5. **Monitoramento**: Melhor visibilidade sobre operações de banco

## ⚠️ Pontos de Atenção

1. **Consistência**: Verificar se a separação não quebra regras de negócio
2. **Race Conditions**: Implementar locks otimistas quando necessário
3. **Rollback**: Considerar cenários de falha após validações
4. **Testes**: Criar testes específicos para cenários de concorrência

## 📝 Cronograma de Implementação

| Semana | Atividade | Responsável | Status |
|--------|-----------|-------------|---------|
| 1 | Auditoria completa do código | Dev Team | 🔄 |
| 2 | Refatoração módulos críticos | Senior Dev | ⏳ |
| 3 | Implementação utilitários | Mid Dev | ⏳ |
| 4 | Testes e documentação | QA Team | ⏳ |
| 5 | Deploy e monitoramento | DevOps | ⏳ |

---

**Próximos Passos:**
1. Executar auditoria completa do código
2. Priorizar arquivos por impacto
3. Iniciar refatoração pelos módulos mais críticos
4. Implementar monitoramento de transações