# Configuração e Deployment - Sistema de Aprovação de Ações Críticas

## Configurações de Ambiente

### Variáveis de Ambiente

```bash
# .env
# Configurações do Sistema de Aprovação
APROVACAO_PRAZO_PADRAO_HORAS=24
APROVACAO_ESCALACAO_ATIVA=true
APROVACAO_PRAZO_ESCALACAO_HORAS=48
APROVACAO_MAX_TENTATIVAS_NOTIFICACAO=3
APROVACAO_INTERVALO_VERIFICACAO_PRAZO=300000

# Configurações de Notificação
NOTIFICACAO_APROVACAO_EMAIL_TEMPLATE=aprovacao_pendente
NOTIFICACAO_APROVACAO_SMS_TEMPLATE=aprovacao_sms
NOTIFICACAO_ESCALACAO_EMAIL_TEMPLATE=aprovacao_escalada

# Configurações de Fila
APROVACAO_QUEUE_NAME=aprovacao-acoes-criticas
APROVACAO_QUEUE_CONCURRENCY=5
APROVACAO_QUEUE_DELAY_MS=1000

# Configurações de Cache
APROVACAO_CACHE_TTL=3600
APROVACAO_CACHE_PREFIX=aprovacao:

# Configurações de Auditoria
APROVACAO_AUDITORIA_DETALHADA=true
APROVACAO_LOG_LEVEL=info
```

### Configuração do Módulo

```typescript
// config/aprovacao.config.ts
import { registerAs } from '@nestjs/config';

export default registerAs('aprovacao', () => ({
  // Configurações de Prazo
  prazoPadraoHoras: parseInt(process.env.APROVACAO_PRAZO_PADRAO_HORAS) || 24,
  escalacaoAtiva: process.env.APROVACAO_ESCALACAO_ATIVA === 'true',
  prazoEscalacaoHoras: parseInt(process.env.APROVACAO_PRAZO_ESCALACAO_HORAS) || 48,
  
  // Configurações de Notificação
  maxTentativasNotificacao: parseInt(process.env.APROVACAO_MAX_TENTATIVAS_NOTIFICACAO) || 3,
  intervaloVerificacaoPrazo: parseInt(process.env.APROVACAO_INTERVALO_VERIFICACAO_PRAZO) || 300000,
  
  // Templates de Notificação
  templates: {
    emailAprovacao: process.env.NOTIFICACAO_APROVACAO_EMAIL_TEMPLATE || 'aprovacao_pendente',
    smsAprovacao: process.env.NOTIFICACAO_APROVACAO_SMS_TEMPLATE || 'aprovacao_sms',
    emailEscalacao: process.env.NOTIFICACAO_ESCALACAO_EMAIL_TEMPLATE || 'aprovacao_escalada',
  },
  
  // Configurações de Fila
  queue: {
    name: process.env.APROVACAO_QUEUE_NAME || 'aprovacao-acoes-criticas',
    concurrency: parseInt(process.env.APROVACAO_QUEUE_CONCURRENCY) || 5,
    delayMs: parseInt(process.env.APROVACAO_QUEUE_DELAY_MS) || 1000,
  },
  
  // Configurações de Cache
  cache: {
    ttl: parseInt(process.env.APROVACAO_CACHE_TTL) || 3600,
    prefix: process.env.APROVACAO_CACHE_PREFIX || 'aprovacao:',
  },
  
  // Configurações de Auditoria
  auditoria: {
    detalhada: process.env.APROVACAO_AUDITORIA_DETALHADA === 'true',
    logLevel: process.env.APROVACAO_LOG_LEVEL || 'info',
  },
}));
```

## Scripts de Migração

### Migração Principal

```typescript
// migrations/1700000000000-CreateAprovacaoAcoesCriticas.ts
import { MigrationInterface, QueryRunner, Table, Index, ForeignKey } from 'typeorm';

export class CreateAprovacaoAcoesCriticas1700000000000 implements MigrationInterface {
  name = 'CreateAprovacaoAcoesCriticas1700000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Tabela acao_critica
    await queryRunner.createTable(
      new Table({
        name: 'acao_critica',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'codigo',
            type: 'varchar',
            length: '100',
            isUnique: true,
          },
          {
            name: 'nome',
            type: 'varchar',
            length: '200',
          },
          {
            name: 'descricao',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'categoria',
            type: 'varchar',
            length: '50',
          },
          {
            name: 'nivel_criticidade',
            type: 'enum',
            enum: ['BAIXO', 'MEDIO', 'ALTO', 'CRITICO'],
            default: "'MEDIO'",
          },
          {
            name: 'ativa',
            type: 'boolean',
            default: true,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            onUpdate: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    // Tabela configuracao_aprovacao
    await queryRunner.createTable(
      new Table({
        name: 'configuracao_aprovacao',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'acao_critica_id',
            type: 'uuid',
          },
          {
            name: 'estrategia_aprovacao',
            type: 'enum',
            enum: ['UNANIME', 'MAIORIA', 'QUALQUER_UM', 'HIERARQUICA', 'PERSONALIZADA'],
            default: "'QUALQUER_UM'",
          },
          {
            name: 'numero_aprovadores_necessarios',
            type: 'integer',
            default: 1,
          },
          {
            name: 'prazo_horas',
            type: 'integer',
            default: 24,
          },
          {
            name: 'permite_auto_aprovacao',
            type: 'boolean',
            default: false,
          },
          {
            name: 'condicoes_auto_aprovacao',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'escalacao_ativa',
            type: 'boolean',
            default: false,
          },
          {
            name: 'prazo_escalacao_horas',
            type: 'integer',
            isNullable: true,
          },
          {
            name: 'configuracao_escalacao',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'ativa',
            type: 'boolean',
            default: true,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            onUpdate: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    // Tabela solicitacao_aprovacao
    await queryRunner.createTable(
      new Table({
        name: 'solicitacao_aprovacao',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'acao_critica_id',
            type: 'uuid',
          },
          {
            name: 'entidade_alvo',
            type: 'varchar',
            length: '100',
          },
          {
            name: 'entidade_id',
            type: 'varchar',
            length: '100',
          },
          {
            name: 'solicitante_id',
            type: 'uuid',
          },
          {
            name: 'justificativa',
            type: 'text',
          },
          {
            name: 'dados_contexto',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'status',
            type: 'enum',
            enum: ['PENDENTE', 'EM_ANALISE', 'APROVADO', 'NEGADO', 'EXPIRADO', 'ESCALADO'],
            default: "'PENDENTE'",
          },
          {
            name: 'prazo_limite',
            type: 'timestamp',
          },
          {
            name: 'data_processamento',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'resultado_execucao',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            onUpdate: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    // Tabela aprovador
    await queryRunner.createTable(
      new Table({
        name: 'aprovador',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'configuracao_aprovacao_id',
            type: 'uuid',
          },
          {
            name: 'usuario_id',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'role_aprovador',
            type: 'varchar',
            length: '50',
            isNullable: true,
          },
          {
            name: 'permissao_aprovador',
            type: 'varchar',
            length: '100',
            isNullable: true,
          },
          {
            name: 'escopo_aprovacao',
            type: 'varchar',
            length: '50',
            isNullable: true,
          },
          {
            name: 'escopo_id',
            type: 'varchar',
            length: '100',
            isNullable: true,
          },
          {
            name: 'ordem_hierarquica',
            type: 'integer',
            default: 1,
          },
          {
            name: 'ativo',
            type: 'boolean',
            default: true,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    // Tabela historico_aprovacao
    await queryRunner.createTable(
      new Table({
        name: 'historico_aprovacao',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'solicitacao_aprovacao_id',
            type: 'uuid',
          },
          {
            name: 'aprovador_id',
            type: 'uuid',
          },
          {
            name: 'acao',
            type: 'enum',
            enum: ['APROVADO', 'NEGADO', 'DELEGADO', 'ESCALADO'],
          },
          {
            name: 'justificativa',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'dados_adicionais',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'ip_origem',
            type: 'varchar',
            length: '45',
            isNullable: true,
          },
          {
            name: 'user_agent',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    // Criar índices
    await queryRunner.createIndex(
      'acao_critica',
      new Index('IDX_acao_critica_codigo', ['codigo']),
    );

    await queryRunner.createIndex(
      'configuracao_aprovacao',
      new Index('IDX_configuracao_aprovacao_acao_critica', ['acao_critica_id']),
    );

    await queryRunner.createIndex(
      'solicitacao_aprovacao',
      new Index('IDX_solicitacao_aprovacao_status', ['status']),
    );

    await queryRunner.createIndex(
      'solicitacao_aprovacao',
      new Index('IDX_solicitacao_aprovacao_prazo', ['prazo_limite']),
    );

    await queryRunner.createIndex(
      'solicitacao_aprovacao',
      new Index('IDX_solicitacao_aprovacao_entidade', ['entidade_alvo', 'entidade_id']),
    );

    await queryRunner.createIndex(
      'aprovador',
      new Index('IDX_aprovador_configuracao', ['configuracao_aprovacao_id']),
    );

    await queryRunner.createIndex(
      'historico_aprovacao',
      new Index('IDX_historico_aprovacao_solicitacao', ['solicitacao_aprovacao_id']),
    );

    // Criar foreign keys
    await queryRunner.createForeignKey(
      'configuracao_aprovacao',
      new ForeignKey({
        columnNames: ['acao_critica_id'],
        referencedTableName: 'acao_critica',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'solicitacao_aprovacao',
      new ForeignKey({
        columnNames: ['acao_critica_id'],
        referencedTableName: 'acao_critica',
        referencedColumnNames: ['id'],
        onDelete: 'RESTRICT',
      }),
    );

    await queryRunner.createForeignKey(
      'solicitacao_aprovacao',
      new ForeignKey({
        columnNames: ['solicitante_id'],
        referencedTableName: 'usuario',
        referencedColumnNames: ['id'],
        onDelete: 'RESTRICT',
      }),
    );

    await queryRunner.createForeignKey(
      'aprovador',
      new ForeignKey({
        columnNames: ['configuracao_aprovacao_id'],
        referencedTableName: 'configuracao_aprovacao',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'aprovador',
      new ForeignKey({
        columnNames: ['usuario_id'],
        referencedTableName: 'usuario',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
      }),
    );

    await queryRunner.createForeignKey(
      'historico_aprovacao',
      new ForeignKey({
        columnNames: ['solicitacao_aprovacao_id'],
        referencedTableName: 'solicitacao_aprovacao',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'historico_aprovacao',
      new ForeignKey({
        columnNames: ['aprovador_id'],
        referencedTableName: 'usuario',
        referencedColumnNames: ['id'],
        onDelete: 'RESTRICT',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('historico_aprovacao');
    await queryRunner.dropTable('aprovador');
    await queryRunner.dropTable('solicitacao_aprovacao');
    await queryRunner.dropTable('configuracao_aprovacao');
    await queryRunner.dropTable('acao_critica');
  }
}
```

### Script de Dados Iniciais

```typescript
// seeds/aprovacao-dados-iniciais.seed.ts
import { DataSource } from 'typeorm';
import { AcaoCritica } from '../src/modules/aprovacao/entities/acao-critica.entity';
import { ConfiguracaoAprovacao } from '../src/modules/aprovacao/entities/configuracao-aprovacao.entity';
import { Aprovador } from '../src/modules/aprovacao/entities/aprovador.entity';

export class AprovacaoDadosIniciaisSeed {
  public async run(dataSource: DataSource): Promise<void> {
    const acaoCriticaRepository = dataSource.getRepository(AcaoCritica);
    const configuracaoRepository = dataSource.getRepository(ConfiguracaoAprovacao);
    const aprovadorRepository = dataSource.getRepository(Aprovador);

    // Criar ações críticas padrão
    const acoesIniciais = [
      {
        codigo: 'CANCELAR_SOLICITACAO',
        nome: 'Cancelar Solicitação',
        descricao: 'Cancelamento de solicitação de benefício',
        categoria: 'SOLICITACAO',
        nivel_criticidade: 'MEDIO',
      },
      {
        codigo: 'SUSPENDER_BENEFICIO',
        nome: 'Suspender Benefício',
        descricao: 'Suspensão temporária de benefício',
        categoria: 'BENEFICIO',
        nivel_criticidade: 'ALTO',
      },
      {
        codigo: 'BLOQUEAR_USUARIO',
        nome: 'Bloquear Usuário',
        descricao: 'Bloqueio de acesso ao sistema',
        categoria: 'USUARIO',
        nivel_criticidade: 'ALTO',
      },
      {
        codigo: 'EXCLUIR_DADOS',
        nome: 'Excluir Dados',
        descricao: 'Exclusão permanente de dados',
        categoria: 'DADOS',
        nivel_criticidade: 'CRITICO',
      },
      {
        codigo: 'ALTERAR_CONFIGURACAO_SISTEMA',
        nome: 'Alterar Configuração do Sistema',
        descricao: 'Modificação de configurações críticas',
        categoria: 'SISTEMA',
        nivel_criticidade: 'CRITICO',
      },
    ];

    const acoesCreated = await acaoCriticaRepository.save(acoesIniciais);

    // Criar configurações padrão
    const configuracoes = [
      {
        acao_critica_id: acoesCreated.find(a => a.codigo === 'CANCELAR_SOLICITACAO')?.id,
        estrategia_aprovacao: 'QUALQUER_UM',
        numero_aprovadores_necessarios: 1,
        prazo_horas: 24,
        permite_auto_aprovacao: true,
        condicoes_auto_aprovacao: {
          roles: ['GESTOR', 'ADMIN'],
          permissoes: ['CANCELAR_SOLICITACAO_DIRETA'],
        },
        escalacao_ativa: true,
        prazo_escalacao_horas: 48,
        configuracao_escalacao: {
          estenderPrazo: true,
          horasAdicionais: 24,
          novaEstrategia: 'MAIORIA',
          aprovadoresEscalacao: ['DIRETOR', 'SUPERINTENDENTE'],
        },
      },
      {
        acao_critica_id: acoesCreated.find(a => a.codigo === 'SUSPENDER_BENEFICIO')?.id,
        estrategia_aprovacao: 'MAIORIA',
        numero_aprovadores_necessarios: 2,
        prazo_horas: 48,
        permite_auto_aprovacao: false,
        escalacao_ativa: true,
        prazo_escalacao_horas: 72,
      },
      {
        acao_critica_id: acoesCreated.find(a => a.codigo === 'EXCLUIR_DADOS')?.id,
        estrategia_aprovacao: 'UNANIME',
        numero_aprovadores_necessarios: 3,
        prazo_horas: 72,
        permite_auto_aprovacao: false,
        escalacao_ativa: false,
      },
    ];

    const configuracoesCreated = await configuracaoRepository.save(configuracoes);

    // Criar aprovadores padrão
    const aprovadores = [
      // Para cancelamento de solicitação
      {
        configuracao_aprovacao_id: configuracoesCreated[0].id,
        role_aprovador: 'GESTOR',
        escopo_aprovacao: 'UNIDADE',
        ordem_hierarquica: 1,
      },
      {
        configuracao_aprovacao_id: configuracoesCreated[0].id,
        role_aprovador: 'COORDENADOR',
        escopo_aprovacao: 'REGIONAL',
        ordem_hierarquica: 2,
      },
      // Para suspensão de benefício
      {
        configuracao_aprovacao_id: configuracoesCreated[1].id,
        role_aprovador: 'COORDENADOR',
        escopo_aprovacao: 'REGIONAL',
        ordem_hierarquica: 1,
      },
      {
        configuracao_aprovacao_id: configuracoesCreated[1].id,
        role_aprovador: 'DIRETOR',
        escopo_aprovacao: 'ESTADUAL',
        ordem_hierarquica: 1,
      },
      // Para exclusão de dados
      {
        configuracao_aprovacao_id: configuracoesCreated[2].id,
        role_aprovador: 'DIRETOR',
        escopo_aprovacao: 'ESTADUAL',
        ordem_hierarquica: 1,
      },
      {
        configuracao_aprovacao_id: configuracoesCreated[2].id,
        role_aprovador: 'SUPERINTENDENTE',
        escopo_aprovacao: 'ESTADUAL',
        ordem_hierarquica: 1,
      },
      {
        configuracao_aprovacao_id: configuracoesCreated[2].id,
        role_aprovador: 'ADMIN',
        permissao_aprovador: 'ADMIN_SISTEMA',
        ordem_hierarquica: 1,
      },
    ];

    await aprovadorRepository.save(aprovadores);

    console.log('✅ Dados iniciais do sistema de aprovação criados com sucesso!');
  }
}
```

## Scripts de Deployment

### Script de Build e Deploy

```bash
#!/bin/bash
# scripts/deploy-aprovacao.sh

set -e

echo "🚀 Iniciando deployment do Sistema de Aprovação de Ações Críticas"

# Verificar se está na branch correta
CURRENT_BRANCH=$(git branch --show-current)
if [ "$CURRENT_BRANCH" != "main" ] && [ "$CURRENT_BRANCH" != "production" ]; then
  echo "⚠️  Aviso: Você não está na branch main ou production"
  read -p "Deseja continuar? (y/N): " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 1
  fi
fi

# Executar testes
echo "🧪 Executando testes..."
npm run test:aprovacao
if [ $? -ne 0 ]; then
  echo "❌ Testes falharam. Deployment cancelado."
  exit 1
fi

# Build da aplicação
echo "🔨 Fazendo build da aplicação..."
npm run build
if [ $? -ne 0 ]; then
  echo "❌ Build falhou. Deployment cancelado."
  exit 1
fi

# Executar migrações
echo "📊 Executando migrações do banco de dados..."
npm run migration:run
if [ $? -ne 0 ]; then
  echo "❌ Migrações falharam. Deployment cancelado."
  exit 1
fi

# Executar seeds
echo "🌱 Executando seeds de dados iniciais..."
npm run seed:aprovacao
if [ $? -ne 0 ]; then
  echo "⚠️  Seeds falharam, mas continuando deployment..."
fi

# Reiniciar serviços
echo "🔄 Reiniciando serviços..."
sudo systemctl restart pgben-api
sudo systemctl restart pgben-worker

# Verificar saúde da aplicação
echo "🏥 Verificando saúde da aplicação..."
sleep 10
HEALTH_CHECK=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/health)
if [ "$HEALTH_CHECK" != "200" ]; then
  echo "❌ Health check falhou. Código: $HEALTH_CHECK"
  exit 1
fi

echo "✅ Deployment concluído com sucesso!"
echo "📋 Logs disponíveis em: /var/log/pgben/"
echo "🌐 API disponível em: http://localhost:3000"
echo "📊 Dashboard de aprovações: http://localhost:3000/admin/aprovacoes"
```

### Docker Compose para Desenvolvimento

```yaml
# docker-compose.aprovacao.yml
version: '3.8'

services:
  pgben-api:
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=development
      - DATABASE_URL=postgresql://pgben:pgben123@postgres:5432/pgben_dev
      - REDIS_URL=redis://redis:6379
      - APROVACAO_PRAZO_PADRAO_HORAS=24
      - APROVACAO_ESCALACAO_ATIVA=true
      - APROVACAO_QUEUE_CONCURRENCY=3
    depends_on:
      - postgres
      - redis
    volumes:
      - ./src:/app/src
      - ./logs:/app/logs
    networks:
      - pgben-network

  pgben-worker:
    build:
      context: .
      dockerfile: Dockerfile.worker
    environment:
      - NODE_ENV=development
      - DATABASE_URL=postgresql://pgben:pgben123@postgres:5432/pgben_dev
      - REDIS_URL=redis://redis:6379
      - APROVACAO_QUEUE_NAME=aprovacao-acoes-criticas
    depends_on:
      - postgres
      - redis
    volumes:
      - ./logs:/app/logs
    networks:
      - pgben-network

  postgres:
    image: postgres:15-alpine
    environment:
      - POSTGRES_DB=pgben_dev
      - POSTGRES_USER=pgben
      - POSTGRES_PASSWORD=pgben123
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./database/init:/docker-entrypoint-initdb.d
    networks:
      - pgben-network

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    networks:
      - pgben-network

  pgadmin:
    image: dpage/pgadmin4:latest
    environment:
      - PGADMIN_DEFAULT_EMAIL=admin@pgben.com
      - PGADMIN_DEFAULT_PASSWORD=admin123
    ports:
      - "8080:80"
    depends_on:
      - postgres
    networks:
      - pgben-network

volumes:
  postgres_data:
  redis_data:

networks:
  pgben-network:
    driver: bridge
```

## Monitoramento e Observabilidade

### Configuração do Prometheus

```yaml
# monitoring/prometheus.yml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

rule_files:
  - "aprovacao_rules.yml"

scrape_configs:
  - job_name: 'pgben-api'
    static_configs:
      - targets: ['localhost:3000']
    metrics_path: '/metrics'
    scrape_interval: 30s

  - job_name: 'pgben-worker'
    static_configs:
      - targets: ['localhost:3001']
    metrics_path: '/metrics'
    scrape_interval: 30s

alerting:
  alertmanagers:
    - static_configs:
        - targets:
          - alertmanager:9093
```

### Regras de Alerta

```yaml
# monitoring/aprovacao_rules.yml
groups:
  - name: aprovacao_alerts
    rules:
      - alert: AprovacoesPendentesAlto
        expr: aprovacao_solicitacoes_pendentes > 50
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Alto número de aprovações pendentes"
          description: "Existem {{ $value }} aprovações pendentes há mais de 5 minutos"

      - alert: AprovacaoTempoMedioAlto
        expr: aprovacao_tempo_medio_horas > 48
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "Tempo médio de aprovação muito alto"
          description: "O tempo médio de aprovação está em {{ $value }} horas"

      - alert: AprovacaoFilaParada
        expr: rate(aprovacao_jobs_processados_total[5m]) == 0
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "Fila de aprovação parada"
          description: "Nenhum job de aprovação foi processado nos últimos 5 minutos"

      - alert: AprovacaoErrosAltos
        expr: rate(aprovacao_erros_total[5m]) > 0.1
        for: 3m
        labels:
          severity: warning
        annotations:
          summary: "Taxa de erro alta no sistema de aprovação"
          description: "Taxa de erro: {{ $value }} erros por segundo"
```

### Dashboard Grafana

```json
{
  "dashboard": {
    "title": "Sistema de Aprovação - PGBen",
    "panels": [
      {
        "title": "Aprovações Pendentes",
        "type": "stat",
        "targets": [
          {
            "expr": "aprovacao_solicitacoes_pendentes",
            "legendFormat": "Pendentes"
          }
        ]
      },
      {
        "title": "Tempo Médio de Aprovação",
        "type": "stat",
        "targets": [
          {
            "expr": "aprovacao_tempo_medio_horas",
            "legendFormat": "Horas"
          }
        ]
      },
      {
        "title": "Taxa de Aprovação vs Negação",
        "type": "piechart",
        "targets": [
          {
            "expr": "aprovacao_decisoes_total{decisao=\"aprovado\"}",
            "legendFormat": "Aprovadas"
          },
          {
            "expr": "aprovacao_decisoes_total{decisao=\"negado\"}",
            "legendFormat": "Negadas"
          }
        ]
      },
      {
        "title": "Aprovações por Ação",
        "type": "bargauge",
        "targets": [
          {
            "expr": "sum by (acao) (aprovacao_solicitacoes_total)",
            "legendFormat": "{{ acao }}"
          }
        ]
      }
    ]
  }
}
```

## Testes de Carga

### Script K6

```javascript
// tests/load/aprovacao-load-test.js
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

const errorRate = new Rate('errors');

export const options = {
  stages: [
    { duration: '2m', target: 10 }, // Ramp up
    { duration: '5m', target: 50 }, // Stay at 50 users
    { duration: '2m', target: 100 }, // Ramp up to 100
    { duration: '5m', target: 100 }, // Stay at 100
    { duration: '2m', target: 0 }, // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<2000'], // 95% das requests < 2s
    errors: ['rate<0.1'], // Taxa de erro < 10%
  },
};

const BASE_URL = 'http://localhost:3000';
const AUTH_TOKEN = 'Bearer eyJ...';

export function setup() {
  // Autenticar e obter token
  const loginResponse = http.post(`${BASE_URL}/auth/login`, {
    email: 'teste@pgben.com',
    password: 'teste123',
  });
  
  return {
    token: loginResponse.json('access_token'),
  };
}

export default function(data) {
  const headers = {
    'Authorization': `Bearer ${data.token}`,
    'Content-Type': 'application/json',
  };

  // Teste 1: Listar aprovações pendentes
  const listResponse = http.get(
    `${BASE_URL}/aprovacoes/pendentes`,
    { headers }
  );
  
  check(listResponse, {
    'list status is 200': (r) => r.status === 200,
    'list response time < 1000ms': (r) => r.timings.duration < 1000,
  }) || errorRate.add(1);

  sleep(1);

  // Teste 2: Criar solicitação de aprovação
  const createPayload = {
    acao: 'CANCELAR_SOLICITACAO',
    entidadeId: `test-${Math.random()}`,
    justificativa: 'Teste de carga',
  };

  const createResponse = http.post(
    `${BASE_URL}/solicitacoes/123/cancelar`,
    JSON.stringify(createPayload),
    { headers }
  );

  check(createResponse, {
    'create status is 200 or 202': (r) => [200, 202].includes(r.status),
    'create response time < 2000ms': (r) => r.timings.duration < 2000,
  }) || errorRate.add(1);

  sleep(2);

  // Teste 3: Processar aprovação (se aplicável)
  if (createResponse.status === 202) {
    const solicitacaoId = createResponse.json('solicitacao_id');
    
    const processPayload = {
      decisao: 'APROVADO',
      justificativa: 'Aprovado automaticamente no teste',
    };

    const processResponse = http.post(
      `${BASE_URL}/aprovacoes/${solicitacaoId}/processar`,
      JSON.stringify(processPayload),
      { headers }
    );

    check(processResponse, {
      'process status is 200': (r) => r.status === 200,
      'process response time < 1500ms': (r) => r.timings.duration < 1500,
    }) || errorRate.add(1);
  }

  sleep(1);
}

export function teardown(data) {
  // Cleanup se necessário
  console.log('Teste de carga finalizado');
}
```

## Backup e Recuperação

### Script de Backup

```bash
#!/bin/bash
# scripts/backup-aprovacao.sh

set -e

BACKUP_DIR="/backup/pgben/aprovacao"
DATE=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="aprovacao_backup_${DATE}.sql"

echo "📦 Iniciando backup do sistema de aprovação..."

# Criar diretório de backup
mkdir -p $BACKUP_DIR

# Backup das tabelas de aprovação
pg_dump -h localhost -U pgben -d pgben_prod \
  --table=acao_critica \
  --table=configuracao_aprovacao \
  --table=solicitacao_aprovacao \
  --table=aprovador \
  --table=historico_aprovacao \
  --data-only \
  --file="$BACKUP_DIR/$BACKUP_FILE"

if [ $? -eq 0 ]; then
  echo "✅ Backup criado: $BACKUP_DIR/$BACKUP_FILE"
  
  # Comprimir backup
  gzip "$BACKUP_DIR/$BACKUP_FILE"
  echo "🗜️  Backup comprimido: $BACKUP_DIR/$BACKUP_FILE.gz"
  
  # Remover backups antigos (manter últimos 30 dias)
  find $BACKUP_DIR -name "aprovacao_backup_*.sql.gz" -mtime +30 -delete
  echo "🧹 Backups antigos removidos"
  
  # Upload para S3 (se configurado)
  if [ ! -z "$AWS_S3_BUCKET" ]; then
    aws s3 cp "$BACKUP_DIR/$BACKUP_FILE.gz" "s3://$AWS_S3_BUCKET/backups/aprovacao/"
    echo "☁️  Backup enviado para S3"
  fi
else
  echo "❌ Erro no backup"
  exit 1
fi
```

Este documento fornece todas as configurações necessárias para o deployment e operação do sistema de aprovação de ações críticas, incluindo migrações, seeds, scripts de deployment, monitoramento e backup.