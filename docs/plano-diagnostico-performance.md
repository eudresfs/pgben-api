# Plano de Diagnóstico e Resolução de Problemas de Performance na API

## 1. Diagnóstico do Problema

### Sintomas Identificados:
- Tempos de resposta extremamente longos (100+ segundos) em endpoints específicos
- Problemas principalmente em consultas de cidadãos por CPF/NIS
- Outros endpoints funcionando normalmente

### Possíveis Causas:
1. **Interceptor de Auditoria LGPD** - O `CidadaoAuditInterceptor` pode estar causando bloqueios
2. **Cache Redis** - Problemas de timeout na conexão com Redis (já verificado)
3. **Validações Pesadas** - Validadores como `CPFValidator` podem estar causando atrasos
4. **Consultas Ineficientes** - Possível problema com índices ou estrutura da consulta
5. **Serviço de Auditoria Bloqueante** - O `AuditoriaQueueService` pode estar bloqueando a thread principal

## 2. Estratégia de Diagnóstico

### Método 1: API de Diagnóstico Independente
Criamos um controlador separado para diagnóstico (`DiagnosticoController`) que realiza consultas diretas ao banco de dados sem passar por interceptors, validações, ou cache.

```typescript
@Get('busca-rapida')
@Public() // Pula autenticação e interceptors
async diagnosticoBuscaRapida(@Query('cpf') cpf: string, @Res() response: any): Promise<void> {
  // Consulta direta ao banco sem cache, interceptors ou validação pesada
  const cidadao = await this.cidadaoRepository.createQueryBuilder('c')...
}
```

### Método 2: Logs de Timing em Componentes Críticos
Implementamos logs de tempo detalhados em pontos críticos do fluxo:

```typescript
console.time(`CPF-${cpf.substr(-4)}-${Date.now()}`);
// Código que queremos medir
console.timeEnd(`CPF-${cpf.substr(-4)}-${Date.now()}`);
```

### Método 3: Versão Não-Bloqueante de Operações de Cache
Implementamos uma versão não-bloqueante de operações de cache com timeout para evitar bloqueios:

```typescript
try {
  // Timeout de 100ms para cache
  const cachePromise = this.cacheService.get<CidadaoResponseDto>(cacheKey);
  const timeoutPromise = new Promise<undefined>((resolve) => {
    setTimeout(() => resolve(undefined), 50); 
  });
  cachedCidadao = await Promise.race([cachePromise, timeoutPromise]);
} catch (cacheError) {
  // Continua com a operação principal
}
```

## 3. Possíveis Correções

### Correção 1: Interceptor Não-Bloqueante
Modificar o `CidadaoAuditInterceptor` para usar um modelo não-bloqueante:

```typescript
private registerAuditEvent(event: any): void {
  // Executa assincronamente sem bloquear
  setTimeout(async () => {
    try {
      // Código de auditoria
    } catch (error) {
      // Apenas logs, sem afetar o fluxo principal
    }
  }, 5);
}
```

### Correção 2: Otimização de Consultas
Revisar e otimizar as consultas SQL, garantindo uso correto de índices:

```typescript
// Exemplo de consulta otimizada
const cidadao = await this.cidadaoRepository
  .createQueryBuilder('c')
  .select(['c.id', 'c.nome', 'c.cpf'])
  .where('c.cpf = :cpf', { cpf: cpfLimpo })
  .getOne();
```

### Correção 3: Operações de Cache com Timeout
Implementar um sistema de timeout para todas as operações de cache:

```typescript
const armazenarNoCache = async (key, value, ttl) => {
  try {
    const timeout = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Cache timeout')), 100));
    await Promise.race([cache.set(key, value, ttl), timeout]);
  } catch (error) {
    // Apenas log, não afeta o fluxo principal
  }
};
```

## 4. Análise de Resultados

Após implementar cada possível correção, precisamos observar:

1. **Tempo de resposta** - Redução significativa do tempo total
2. **Logs de performance** - Ver qual componente estava causando o atraso
3. **Comportamento sob carga** - Verificar como se comporta com múltiplas requisições

## 5. Próximos Passos

1. Usar o endpoint de diagnóstico `/diagnostico/cidadao/busca-rapida?cpf=123456789` para testar performance sem interceptors
2. Comparar com o endpoint normal para identificar o gargalo
3. Implementar um conjunto específico de correções com base nos resultados
4. Considerar se há problemas estruturais na arquitetura que precisam ser revisados
