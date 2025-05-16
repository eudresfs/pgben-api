# Integração do Módulo Cidadão com o Sistema Centralizado de Auditoria

## Status

Implementado

## Contexto

O módulo de Cidadão continha um interceptor de auditoria independente que registrava operações sensíveis apenas em logs locais. Para atender completamente aos requisitos da LGPD e garantir uma auditoria centralizada e consistente, foi necessário integrar este interceptor com o sistema de auditoria já existente no PGBen.

## Decisão

Implementamos a integração do interceptor de auditoria do módulo de Cidadão com o sistema centralizado de auditoria, utilizando o serviço de fila de auditoria (`AuditoriaQueueService`) para processamento assíncrono dos logs de auditoria.

### Principais Melhorias

1. **Integração com Sistema Centralizado**: O interceptor agora utiliza o `AuditoriaQueueService` para enfileirar logs de auditoria, garantindo que todos os acessos a dados sensíveis sejam registrados de forma centralizada.

2. **Processamento Assíncrono**: Os logs de auditoria são processados de forma assíncrona através de filas, evitando impacto na performance das requisições do usuário.

3. **Detecção Inteligente de Dados Sensíveis**: Implementamos lógica para detectar automaticamente quando uma requisição contém ou acessa dados sensíveis.

4. **Extração de Metadados**: O interceptor extrai automaticamente informações como ID da entidade, tipo de operação e campos sensíveis acessados.

### Implementação Técnica

#### 1. Integração com o Serviço de Fila

```typescript
constructor(private readonly auditoriaQueueService: AuditoriaQueueService) {}
```

#### 2. Registro de Eventos de Auditoria

```typescript
private async registerAuditEvent(event: any): Promise<void> {
  try {
    // Mapear evento para o formato esperado pelo serviço de auditoria
    const logAuditoriaDto = new CreateLogAuditoriaDto();
    
    // Determinar o tipo de operação com base no método HTTP
    switch (event.method) {
      case 'POST':
        logAuditoriaDto.tipo_operacao = TipoOperacao.CREATE;
        break;
      // ...outros casos
    }
    
    // Preencher dados básicos do log
    logAuditoriaDto.entidade_afetada = 'Cidadao';
    logAuditoriaDto.entidade_id = this.extractEntityId(event.url);
    // ...outros campos
    
    // Se houver dados sensíveis, registrar acesso a dados sensíveis
    if (event.body && this.containsSensitiveData(event.body)) {
      const camposSensiveis = this.extractSensitiveFields(event.body);
      
      await this.auditoriaQueueService.enfileirarAcessoDadosSensiveis(
        event.userId,
        'Cidadao',
        logAuditoriaDto.entidade_id,
        camposSensiveis,
        // ...outros parâmetros
      );
    } else {
      // Caso contrário, registrar operação normal
      await this.auditoriaQueueService.enfileirarLogAuditoria(logAuditoriaDto);
    }
  } catch (error) {
    this.logger.error(`Erro ao registrar evento de auditoria: ${error.message}`, error.stack);
  }
}
```

#### 3. Detecção de Dados Sensíveis

```typescript
private containsSensitiveData(body: any): boolean {
  if (!body) return false;
  
  const sensitiveFields = ['cpf', 'nis', 'rg', 'data_nascimento', 'renda', 'composicao_familiar'];
  
  return sensitiveFields.some(field => field in body);
}
```

#### 4. Extração de Campos Sensíveis

```typescript
private extractSensitiveFields(body: any): string[] {
  if (!body) return [];
  
  const sensitiveFields = [
    'cpf', 'nis', 'rg', 'data_nascimento', 'renda', 'composicao_familiar',
    'telefone', 'email', 'endereco'
  ];
  
  return sensitiveFields.filter(field => field in body);
}
```

## Consequências

### Positivas

1. **Compliance com LGPD**: Garantia de que todos os acessos a dados sensíveis são registrados e podem ser auditados.
2. **Centralização de Logs**: Todos os logs de auditoria estão em um único local, facilitando consultas e relatórios.
3. **Performance**: O processamento assíncrono evita impacto na performance das requisições.
4. **Consistência**: O formato dos logs de auditoria é padronizado em toda a aplicação.

### Negativas

1. **Dependência**: O módulo de Cidadão agora depende do módulo de Auditoria.
2. **Complexidade**: A lógica de auditoria se tornou mais complexa.

### Mitigações

- A dependência entre módulos é aceitável considerando os benefícios de centralização.
- A complexidade adicional é compensada pela documentação detalhada e pela separação clara de responsabilidades.

## Alternativas Consideradas

1. **Manter Auditoria Independente**: Consideramos manter o interceptor de auditoria independente, mas isso resultaria em duplicação de código e inconsistência nos logs.
2. **Implementar Webhook**: Consideramos implementar um webhook para enviar eventos de auditoria para um serviço externo, mas a solução interna com filas se mostrou mais eficiente e confiável.

## Referências

- [Documentação da LGPD](http://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/L13709.htm)
- [Documentação do Bull Queue](https://github.com/OptimalBits/bull/blob/master/REFERENCE.md)
- [Documentação do NestJS Interceptors](https://docs.nestjs.com/interceptors)
