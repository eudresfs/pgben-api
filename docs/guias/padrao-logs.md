# Padrão de Logs do PGBen

## Visão Geral

Este documento define as convenções para logging no sistema PGBen. A padronização dos logs facilita a análise, monitoramento e resolução de problemas em todos os ambientes.

## Serviço de Logging Unificado

O PGBen utiliza o `UnifiedLoggerService` que unifica as funcionalidades de logging anteriormente divididas entre `AppLogger` e `LoggingService`. Este serviço mantém compatibilidade com o código existente enquanto fornece uma interface melhorada e consistente.

## Níveis de Log

Os níveis de log seguem a convenção padrão do Winston, em ordem decrescente de severidade:

| Nível    | Uso                                                         |
|----------|-------------------------------------------------------------|
| `error`  | Erros que impedem a operação normal do sistema              |
| `warn`   | Avisos que não interrompem operações, mas exigem atenção    |
| `info`   | Informações operacionais importantes (padrão em produção)   |
| `debug`  | Informações detalhadas úteis para debugging                 |
| `verbose`| Informações extremamente detalhadas para diagnóstico        |

## Quando Usar Cada Nível

### Error

Use para registrar erros críticos que interrompem o fluxo normal da aplicação:
- Falhas de conexão com banco de dados
- Exceções não tratadas
- Falhas de autenticação/autorização críticas
- Timeouts de serviços essenciais

```typescript
logger.error('Falha na conexão com banco de dados', 'DatabaseService', { 
  error: err.message,
  connectionId: 'primary'
});
```

### Warn

Use para situações problemáticas que não interrompem o sistema:
- Retentativas de operações
- Depreciações
- Comportamentos inesperados mas contornáveis
- Validações falhas em dados de entrada

```typescript
logger.warn('Validação falhou para o campo CPF', 'ValidationService', {
  fieldName: 'cpf', 
  value: '123.456.789-XX', // Mascarado para segurança
  userId: user.id
});
```

### Info

Use para registrar eventos operacionais importantes:
- Inicialização de serviços
- Autenticações de usuários
- Operações de negócio importantes
- Alterações de configuração

```typescript
logger.info('Usuário autenticado com sucesso', 'AuthenticationService', {
  userId: user.id,
  method: 'password'
});
```

### Debug

Use para informações detalhadas úteis para debugging:
- Parâmetros de chamadas importantes
- Estados intermediários de processamento
- Respostas de APIs externas
- Consultas SQL (sem dados sensíveis)

```typescript
logger.debug('Chamada para API externa', 'ExternalApiService', {
  endpoint: '/users',
  responseTime: 320,
  statusCode: 200
});
```

### Verbose

Use para informações extremamente detalhadas:
- Trace de execução
- Estados internos detalhados
- Diagnóstico de performance
- Análise passo-a-passo

```typescript
logger.verbose('Processando item da fila', 'QueueProcessor', {
  itemId: item.id,
  attempt: 2,
  payload: item.summary // Resumo do payload, não o payload completo
});
```

## Contextos Especializados

O `UnifiedLoggerService` também fornece métodos especializados para contextos específicos:

### Logs de Banco de Dados

Para operações de banco de dados, use `logDatabase`:

```typescript
logger.logDatabase('SELECT', 'Usuario', 150, 'SELECT * FROM usuarios WHERE id = ?');
```

### Logs de Autenticação

Para operações de autenticação, use `logAuth`:

```typescript
logger.logAuth('LOGIN', '12345', true, '192.168.1.1', 'Mozilla/5.0...');
```

### Logs de Negócio

Para operações de negócio, use `logBusiness`:

```typescript
logger.logBusiness('APROVAR', 'Beneficio', '12345', 'analista-123', { 
  motivo: 'Documentação completa' 
});
```

## Boas Práticas

1. **Nunca logar dados sensíveis** (senhas, tokens, CPF completo, etc.)
2. **Seja específico** nos contextos e mensagens
3. **Inclua informações úteis** para diagnóstico como IDs, timestamps, etc.
4. **Use o nível adequado** para cada tipo de informação
5. **Seja consistente** na estrutura e formato

## Transição do Código Existente

O serviço unificado mantém compatibilidade com o código existente. As duas formas de chamar são suportadas:

### Estilo Antigo (AppLogger)

```typescript
logger.log(requestContext, 'Mensagem de log', { dadosAdicionais: 'valor' });
```

### Estilo Novo (LoggingService)

```typescript
logger.info('Mensagem de log', 'Contexto', { dadosAdicionais: 'valor' });
```

É recomendado migrar gradualmente para o novo estilo quando for conveniente modificar o código existente.

## Configuração

O logger usa o Winston e suporta vários destinos:
- Console (colorizado em desenvolvimento)
- Arquivos rotacionados por data
- Integração com sistemas externos (opcional)

A configuração está centralizada em `src/shared/logging/winston.config.ts`.
