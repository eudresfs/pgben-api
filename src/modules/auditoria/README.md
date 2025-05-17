# Módulo de Auditoria

## Visão Geral

O módulo de auditoria é responsável por registrar e gerenciar logs de todas as operações realizadas no Sistema de Gestão de Benefícios Eventuais, garantindo rastreabilidade, compliance com LGPD e segurança da informação. Projetado para lidar com grandes volumes de dados, o módulo implementa técnicas avançadas de otimização, monitoramento e proteção de integridade.

## Características Principais

- **Registro automático de operações**: Intercepta requisições HTTP e registra operações CRUD
- **Suporte a LGPD**: Identifica e registra acesso a dados sensíveis
- **Assinatura de logs**: Garante integridade e não-repúdio dos registros usando JWT
- **Particionamento de tabelas**: Melhora performance com grandes volumes de dados
- **Compressão de dados**: Reduz espaço em disco para logs com dados grandes
- **Múltiplas formas de implementação**: Middleware, interceptor e decoradores
- **Exportação de logs**: Suporte a múltiplos formatos (JSON, CSV, Excel, PDF)
- **Monitoramento em tempo real**: Estatísticas, métricas de performance e alertas
- **Processamento assíncrono**: Filas para operações de alta carga
- **Testes de carga**: Scripts para validação de performance

## Estrutura do Módulo

```
auditoria/
├── controllers/
│   ├── auditoria.controller.ts
│   ├── auditoria-exportacao.controller.ts
│   └── auditoria-monitoramento.controller.ts
├── decorators/
│   └── audit.decorator.ts
├── dto/
│   ├── create-log-auditoria.dto.ts
│   └── query-log-auditoria.dto.ts
├── entities/
│   └── log-auditoria.entity.ts
├── enums/
│   └── tipo-operacao.enum.ts
├── examples/
│   └── auditoria-controller.example.ts
├── interceptors/
│   └── audit.interceptor.ts
├── interfaces/
│   └── audit-event.interface.ts
├── middlewares/
│   └── auditoria.middleware.ts
├── repositories/
│   └── log-auditoria.repository.ts
├── services/
│   ├── auditoria-queue.processor.ts
│   ├── auditoria-queue.service.ts
│   ├── auditoria-signature.service.ts
│   ├── auditoria-exportacao.service.ts
│   ├── auditoria-monitoramento.service.ts
│   └── auditoria.service.ts
├── tests/
│   ├── auditoria.service.spec.ts
│   ├── auditoria-load-test.ts
│   └── middlewares/
│       ├── auditoria.middleware.fixed.ts
│       └── auditoria.middleware.spec.ts
├── auditoria.module.ts
└── README.md
```

## Migração do Banco de Dados

O módulo inclui uma migração (`1090001-CreateAuditoriaSchema.ts`) que cria:

- Tipo enumerado para operações de auditoria
- Tabela principal de logs com particionamento por data
- Tabela de histórico para logs antigos
- Índices para melhorar a performance das consultas
- Partições iniciais para os próximos 12 meses
- Funções para manutenção automática de partições

## Como Utilizar

### 1. Middleware Global

Para auditar todas as requisições HTTP automaticamente:

```typescript
// main.ts
import { AuditoriaMiddleware } from './modules/auditoria/middlewares/auditoria.middleware';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.use(app.get(AuditoriaMiddleware).use.bind(app.get(AuditoriaMiddleware)));
  await app.listen(3000);
}
```

### 2. Middleware por Módulo

Para auditar apenas rotas específicas:

```typescript
// seu-modulo.module.ts
import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { AuditoriaMiddleware } from '../auditoria/middlewares/auditoria.middleware';

@Module({
  // ...
})
export class SeuModulo implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(AuditoriaMiddleware)
      .forRoutes('sua-rota');
  }
}
```

### 3. Interceptor por Controlador

Para auditar todas as rotas de um controlador:

```typescript
// seu-controlador.controller.ts
import { Controller, UseInterceptors } from '@nestjs/common';
import { AuditInterceptor } from '../auditoria/interceptors/audit.interceptor';

@Controller('sua-rota')
@UseInterceptors(AuditInterceptor)
export class SeuControlador {
  // ...
}
```

### 4. Decoradores por Método

Para auditar métodos específicos com configuração personalizada:

```typescript
// seu-controlador.controller.ts
import { Controller, Post, Body } from '@nestjs/common';
import { AuditCreate } from '../auditoria/decorators/audit.decorator';

@Controller('sua-rota')
export class SeuControlador {
  @Post()
  @AuditCreate('SuaEntidade', 'Criação de entidade')
  async criar(@Body() createDto: any) {
    // ...
  }
}
```

## Decoradores Disponíveis

- `@AuditCreate(entidade, descricao?)`: Para operações de criação
- `@AuditRead(entidade, descricao?)`: Para operações de leitura
- `@AuditUpdate(entidade, descricao?)`: Para operações de atualização
- `@AuditDelete(entidade, descricao?)`: Para operações de exclusão
- `@AuditSensitiveAccess(entidade, descricao?)`: Para acesso a dados sensíveis
- `@AuditExport(entidade, descricao?)`: Para exportação de dados
- `@AuditAnonymize(entidade, descricao?)`: Para anonimização de dados
- `@AuditLogin(descricao?)`: Para login no sistema
- `@AuditLogout(descricao?)`: Para logout do sistema
- `@AuditFailedLogin(descricao?)`: Para tentativas de login falhas

## Configuração para LGPD

O módulo inclui suporte para compliance com LGPD, identificando automaticamente campos sensíveis e registrando acessos a esses dados. Os campos sensíveis padrão incluem:

- CPF, RG, passaporte
- Data de nascimento, idade
- Endereço, telefone, email
- Dados de saúde, religião, etnia
- Dados financeiros (renda, salário)
- Credenciais (senha, token)

## Manutenção de Logs

O módulo inclui funções para manutenção automática de logs:

- Criação automática de partições para novos meses
- Arquivamento de logs antigos para tabela histórica
- Compressão de dados grandes para economia de espaço

## Exemplo de Consulta de Logs

```typescript
// Exemplo de consulta de logs por entidade
const logs = await logAuditoriaRepository.findByEntity('Usuario', '123e4567-e89b-12d3-a456-426614174000');

// Exemplo de consulta de logs por usuário
const logs = await logAuditoriaRepository.findByUser('123e4567-e89b-12d3-a456-426614174000');

// Exemplo de consulta de logs de acesso a dados sensíveis
const logs = await logAuditoriaRepository.findSensitiveDataAccess();
```

## Verificação de Integridade

O módulo inclui um serviço para verificar a integridade dos logs, garantindo que não foram adulterados:

```typescript
// Verificar integridade de um conjunto de logs
const resultados = await auditoriaSignatureService.verificarIntegridadeLogs(logs);
```

## Considerações de Performance

- Logs são processados de forma assíncrona para não impactar a performance da aplicação
- Particionamento de tabelas melhora a performance de consultas
- Compressão de dados reduz o espaço em disco para logs grandes
- Índices otimizados para consultas frequentes
- Processamento em lote para operações de alta carga
- Monitoramento contínuo de métricas de performance

## Exportação de Logs

O módulo oferece funcionalidades de exportação de logs em diferentes formatos:

```typescript
// Exportar logs para CSV
await auditoriaExportacaoService.exportarLogs(
  { tipo_operacao: TipoOperacao.CREATE },
  { formato: FormatoExportacao.CSV, comprimido: true }
);

// Exportar logs para Excel
await auditoriaExportacaoService.exportarLogs(
  { entidade_afetada: 'Usuario' },
  { formato: FormatoExportacao.EXCEL }
);

// Exportar logs para PDF
await auditoriaExportacaoService.exportarLogs(
  { data_inicio: '2023-01-01', data_fim: '2023-12-31' },
  { formato: FormatoExportacao.PDF }
);
```

### Formatos Suportados

- **JSON**: Formato padrão, ideal para processamento posterior
- **CSV**: Formato simples para importação em planilhas
- **Excel**: Formato nativo do Microsoft Excel com formatação
- **PDF**: Formato para relatórios formais com layout estruturado

## Monitoramento e Saúde do Sistema

O módulo inclui um serviço de monitoramento que coleta estatísticas e métricas de performance:

```typescript
// Obter estatísticas atuais
const estatisticas = auditoriaMonitoramentoService.getEstatisticas();

// Gerar relatório de saúde
const relatorioSaude = await auditoriaMonitoramentoService.gerarRelatorioSaude();
```

### Métricas Coletadas

- Volume de logs por período (24h, 7 dias, 30 dias)
- Distribuição por tipo de operação e entidade
- Tempo médio de inserção e consulta
- Taxa de erros
- Tamanho do banco de dados e índices
- Uso de partições e eficiência de índices

### Alertas Automáticos

O sistema gera alertas automáticos quando:

- Taxa de erros ultrapassa limites configurados
- Tempo médio de operações excede thresholds
- Volume de logs cresce rapidamente
- Índices não estão sendo utilizados

## Testes de Carga

O módulo inclui scripts para testes de carga que validam a performance com grandes volumes de dados:

```bash
# Executar teste de carga
npm run test:load:auditoria
```

O teste de carga simula diferentes cenários:

- Inserção individual de logs
- Inserção em lote (batch)
- Consultas com diferentes filtros
- Verificação de integridade

### Resultados Esperados

O módulo foi projetado para suportar:

- Até 10.000 operações por minuto em modo assíncrono
- Consultas com tempo de resposta < 500ms para filtros otimizados
- Tempo médio de inserção < 50ms por log em modo batch
- Verificação de integridade < 100ms por log
