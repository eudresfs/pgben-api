# Guia do Serviço de Logging Unificado

## Visão Geral

O `UnifiedLoggerService` é um componente central do PGBen que unifica as funcionalidades de logging anteriormente divididas entre `AppLogger` e `LoggingService`. Este serviço fornece uma interface consistente e flexível para registro de logs em toda a aplicação, mantendo compatibilidade com o código existente.

## Funcionalidades Principais

- Registro de logs em diferentes níveis (error, warn, info, debug, verbose)
- Suporte a contextos para melhor organização dos logs
- Logs especializados para operações de banco de dados, autenticação e negócio
- Compatibilidade com código existente que usa os serviços anteriores
- Integração com Winston para armazenamento e formatação de logs

## Configuração e Uso

### Importação do Módulo

O serviço de logging unificado está disponível através do `SharedModule`:

```typescript
import { Module } from '@nestjs/common';
import { SharedModule } from 'src/shared/shared.module';

@Module({
  imports: [SharedModule],
  // ...
})
export class MeuModulo {}
```

### Injeção do Serviço

```typescript
import { Injectable } from '@nestjs/common';
import { UnifiedLoggerService } from 'src/shared/logging/unified-logger.service';

@Injectable()
export class MeuServico {
  constructor(private logger: UnifiedLoggerService) {
    // Definir o contexto para todos os logs deste serviço
    this.logger.setContext(MeuServico.name);
  }
  
  // Métodos do serviço...
}
```

## Exemplos de Uso

### Logs Básicos

```typescript
// Log de nível info
this.logger.info('Operação concluída com sucesso', 'ProcessamentoService', {
  operacaoId: '12345',
  duracao: 150
});

// Log de nível error
this.logger.error('Falha ao processar solicitação', 'ProcessamentoService', 
  'Erro: Conexão recusada', { 
    solicitacaoId: '12345',
    tentativa: 3
  }
);

// Log de nível warn
this.logger.warn('Validação falhou', 'ValidacaoService', {
  campo: 'cpf',
  valor: '123.456.789-XX', // Mascarado para segurança
  motivo: 'Formato inválido'
});

// Log de nível debug
this.logger.debug('Parâmetros da requisição', 'ApiService', {
  endpoint: '/usuarios',
  metodo: 'GET',
  parametros: { limite: 10, pagina: 1 }
});

// Log de nível verbose
this.logger.verbose('Processando item da fila', 'FilaService', {
  itemId: '12345',
  tipo: 'notificacao',
  prioridade: 'alta'
});
```

### Logs Especializados

#### Log de Operação de Banco de Dados

```typescript
// Registrar uma consulta ao banco de dados
this.logger.logDatabase(
  'SELECT',           // Operação
  'Usuario',          // Entidade
  150,                // Duração em ms
  'SELECT * FROM usuarios WHERE id = ?'  // Query (opcional)
);
```

#### Log de Autenticação

```typescript
// Registrar uma operação de autenticação
this.logger.logAuth(
  'LOGIN',            // Operação
  'usuario@email.com',// ID do usuário
  true,               // Sucesso (true/false)
  '192.168.1.1',      // IP (opcional)
  'Mozilla/5.0...'    // User Agent (opcional)
);
```

#### Log de Operação de Negócio

```typescript
// Registrar uma operação de negócio
this.logger.logBusiness(
  'APROVAR',          // Operação
  'Beneficio',        // Entidade
  '12345',            // ID da entidade
  'analista-123',     // ID do usuário
  {                   // Detalhes (opcional)
    motivo: 'Documentação completa',
    observacao: 'Prioridade alta'
  }
);
```

### Compatibilidade com Código Existente

O serviço mantém compatibilidade com o código que usa o `AppLogger` anterior:

```typescript
// Estilo antigo (AppLogger)
this.logger.log(requestContext, 'Mensagem de log', { 
  dadosAdicionais: 'valor' 
});

this.logger.error(requestContext, 'Mensagem de erro', { 
  erro: 'detalhes do erro' 
});
```

## Boas Práticas

### Escolha do Nível de Log

- **error**: Erros que impedem a operação normal do sistema
- **warn**: Avisos que não interrompem operações, mas exigem atenção
- **info**: Informações operacionais importantes (padrão em produção)
- **debug**: Informações detalhadas úteis para debugging
- **verbose**: Informações extremamente detalhadas para diagnóstico

### Estrutura Consistente

Mantenha uma estrutura consistente nos logs:

```typescript
this.logger.info(
  'Descrição clara da operação',  // O que aconteceu
  'Contexto',                     // Onde aconteceu
  {                               // Dados adicionais
    quem: 'ID do usuário',        // Quem realizou
    alvo: 'ID do recurso',        // Em qual recurso
    resultado: 'sucesso/falha',   // Com qual resultado
    detalhes: {}                  // Informações específicas
  }
);
```

### Segurança nos Logs

- **Nunca registre** senhas, tokens ou chaves de acesso
- **Mascare dados sensíveis** como CPF, cartão de crédito, etc.
- **Limite a exposição** de dados pessoais nos logs
- **Considere o contexto** ao decidir o que registrar

### Desempenho

- Evite logs excessivos em código de alta performance
- Use níveis apropriados para controlar o volume de logs
- Considere logging assíncrono para operações críticas

## Configuração Avançada

A configuração do Winston está centralizada em `src/shared/logging/winston.config.ts` e pode ser personalizada para diferentes ambientes:

- Formato de saída (JSON, texto, colorizado)
- Destinos de log (console, arquivo, serviços externos)
- Rotação de arquivos de log
- Níveis de log por ambiente

## Monitoramento e Análise

Os logs gerados pelo `UnifiedLoggerService` podem ser:

1. Coletados por ferramentas como ELK Stack (Elasticsearch, Logstash, Kibana)
2. Analisados para detecção de anomalias e problemas
3. Utilizados para auditoria e compliance com LGPD
4. Visualizados em dashboards para monitoramento em tempo real

## Referências

- [Documentação do Winston](https://github.com/winstonjs/winston)
- [Padrão de Logs do PGBen](./padrao-logs.md)
- [Guia de Monitoramento e Observabilidade](./monitoramento.md)
