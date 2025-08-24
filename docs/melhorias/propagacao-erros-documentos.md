# Melhoria na Propagação de Erros - Sistema de Documentos

## Visão Geral

Esta melhoria implementa um sistema robusto de propagação de erros específicos para o módulo de documentos, substituindo exceções genéricas por exceções contextuais que fornecem informações precisas sobre falhas no download e manipulação de documentos.

## Problema Identificado

Anteriormente, o sistema apresentava os seguintes problemas:

1. **Perda de Contexto**: O `MinioService` detectava corretamente erros específicos (arquivo não encontrado, acesso negado, etc.), mas o `DocumentoService` convertia tudo em `InternalServerErrorException` genérico.

2. **Experiência do Usuário Prejudicada**: Usuários recebiam sempre a mesma mensagem de "erro interno" independentemente do problema real.

3. **Dificuldade de Debugging**: Logs mostravam apenas exceções genéricas, dificultando a identificação da causa raiz.

4. **Códigos HTTP Inadequados**: Todos os erros retornavam 500 (Internal Server Error), mesmo para casos como "arquivo não encontrado" que deveriam retornar 404.

## Solução Implementada

### 1. Exceções Específicas para Documentos

Criadas exceções especializadas em `src/modules/documento/exceptions/documento.exceptions.ts`:

- **`DocumentoNaoEncontradoException`** (404): Quando o documento não existe no storage
- **`AcessoNegadoDocumentoException`** (403): Quando há problemas de permissão
- **`IntegridadeDocumentoException`** (400): Quando a integridade do documento foi comprometida
- **`ConfiguracaoStorageException`** (503): Quando há problemas de configuração do storage
- **`DescriptografiaDocumentoException`** (400): Quando falha a descriptografia
- **`StorageIndisponivelException`** (503): Quando o storage está temporariamente indisponível

### 2. Modificação do MinioService

O `MinioService` foi atualizado para:

- Importar e usar as novas exceções específicas
- Mapear erros do MinIO para exceções HTTP apropriadas
- Manter logs detalhados para rastreabilidade
- Tratar novos cenários como problemas de conexão

**Principais melhorias:**
```typescript
// Antes
throw new Error(`Documento não encontrado: ${nomeArquivo}`);

// Depois
throw new DocumentoNaoEncontradoException(undefined, nomeArquivo);
```

### 3. Refatoração do DocumentoService

O método `download` foi refatorado para:

- Remover o `try-catch` genérico que mascarava erros específicos
- Adicionar logs estruturados para melhor rastreabilidade
- Propagar exceções específicas do storage
- Manter compatibilidade com o sistema existente

**Principais melhorias:**
```typescript
// Antes
catch (error) {
  this.logger.error(`Erro ao fazer download do documento ${id}: ${error.message}`);
  throw new InternalServerErrorException('Erro interno do servidor ao processar download');
}

// Depois
catch (error) {
  // Log estruturado com contexto completo
  this.logger.error(`Falha no download do documento ${id}`, {
    documentoId: id,
    usuarioId,
    caminhoStorage: documento.caminho,
    errorType: error.constructor.name,
    errorMessage: error.message,
  });
  
  // Propagar exceção específica
  throw error;
}
```

### 4. Compatibilidade com Interceptors Globais

O sistema mantém total compatibilidade com:

- **`ErrorHandlingInterceptor`**: Trata HttpExceptions corretamente
- **`CatalogAwareExceptionFilter`**: Processa exceções específicas e fornece respostas estruturadas
- **Sistema de logging existente**: Mantém logs estruturados e rastreabilidade

## Benefícios Alcançados

### 1. Experiência do Usuário Melhorada

- **Mensagens Específicas**: "Documento não encontrado" em vez de "Erro interno"
- **Códigos HTTP Corretos**: 404 para não encontrado, 403 para acesso negado, etc.
- **Respostas Estruturadas**: JSON padronizado com informações contextuais

### 2. Melhor Observabilidade

- **Logs Estruturados**: Contexto completo incluindo IDs, caminhos e tipos de erro
- **Rastreabilidade**: Fácil identificação da causa raiz dos problemas
- **Métricas**: Possibilidade de criar alertas específicos por tipo de erro

### 3. Facilidade de Manutenção

- **Código Mais Limpo**: Separação clara de responsabilidades
- **Debugging Simplificado**: Erros específicos facilitam a identificação de problemas
- **Extensibilidade**: Fácil adição de novos tipos de exceção

### 4. Robustez do Sistema

- **Tratamento Granular**: Diferentes estratégias para diferentes tipos de erro
- **Recuperação Inteligente**: Possibilidade de retry apenas para erros temporários
- **Monitoramento Proativo**: Alertas específicos para problemas de infraestrutura

## Exemplos de Uso

### Cenário 1: Documento Não Encontrado

**Antes:**
```json
{
  "statusCode": 500,
  "message": "Erro interno do servidor ao processar download",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

**Depois:**
```json
{
  "statusCode": 404,
  "message": "Documento não encontrado no caminho: documentos/123/arquivo.pdf",
  "error": "Documento Não Encontrado",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### Cenário 2: Problema de Acesso

**Antes:**
```json
{
  "statusCode": 500,
  "message": "Erro interno do servidor ao processar download",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

**Depois:**
```json
{
  "statusCode": 403,
  "message": "Acesso negado ao documento",
  "error": "Acesso Negado",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

## Impacto na Performance

- **Zero Overhead**: As exceções específicas não adicionam latência
- **Logs Otimizados**: Estrutura de logs mais eficiente
- **Menos Debugging**: Redução do tempo gasto investigando problemas

## Compatibilidade

- ✅ **Backward Compatible**: Não quebra funcionalidades existentes
- ✅ **API Estável**: Endpoints mantêm a mesma interface
- ✅ **Interceptors**: Funciona com todos os interceptors globais existentes
- ✅ **Logging**: Integra-se perfeitamente com o sistema de logging atual

## Próximos Passos

1. **Monitoramento**: Implementar dashboards específicos para os novos tipos de erro
2. **Alertas**: Configurar alertas proativos para problemas de infraestrutura
3. **Métricas**: Coletar métricas de taxa de erro por tipo
4. **Documentação**: Atualizar documentação da API com os novos códigos de erro
5. **Testes**: Expandir cobertura de testes para os novos cenários de erro

## Conclusão

Esta melhoria transforma o sistema de tratamento de erros de documentos de um modelo genérico e pouco informativo para um sistema robusto, específico e orientado à experiência do usuário. A implementação mantém total compatibilidade com o sistema existente enquanto fornece informações valiosas para usuários, desenvolvedores e operações.