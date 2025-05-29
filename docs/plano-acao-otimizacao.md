# Plano de Ação para Otimização de Performance da API PGBen

## Fase 1: Correções Críticas (Execução Imediata)

### 1.1. Configurar adequadamente o pool de conexões

**Arquivos:** `src/database/data-source.ts` e `src/app.module.ts`

**Descrição:** Adicionar configurações explícitas para o pool de conexões, otimizadas para o padrão de uso da aplicação.

**Código Antes:**
```typescript
TypeOrmModule.forRootAsync({
  imports: [ConfigModule],
  inject: [ConfigService],
  useFactory: (configService: ConfigService) => ({
    type: 'postgres',
    host: configService.get('DB_HOST', 'localhost'),
    port: parseInt(configService.get('DB_PORT', '5432')),
    username: configService.get('DB_USER', 'postgres'),
    password: configService.get('DB_PASS', 'postgres'),
    database: configService.get('DB_NAME', 'pgben'),
    entities: [__dirname + '/**/*.entity{.ts,.js}'],
    synchronize: false,
    logging: configService.get('NODE_ENV') === 'development',
  }),
}),
```

**Código Depois:**
```typescript
TypeOrmModule.forRootAsync({
  imports: [ConfigModule],
  inject: [ConfigService],
  useFactory: (configService: ConfigService) => ({
    type: 'postgres',
    host: configService.get('DB_HOST', 'localhost'),
    port: parseInt(configService.get('DB_PORT', '5432')),
    username: configService.get('DB_USER', 'postgres'),
    password: configService.get('DB_PASS', 'postgres'),
    database: configService.get('DB_NAME', 'pgben'),
    entities: [__dirname + '/**/*.entity{.ts,.js}'],
    synchronize: false,
    logging: configService.get('NODE_ENV') === 'development',
    // Configurações de pool otimizadas
    extra: {
      // Pool size adequado para a carga de trabalho
      max: 20, // Máximo de conexões no pool
      min: 5,  // Mínimo de conexões no pool
      // Timeouts
      idleTimeoutMillis: 30000, // 30 segundos
      connectionTimeoutMillis: 5000, // 5 segundos
      // Verificações de saúde do pool
      allowExitOnIdle: false,
    },
    // Uso de transações padrão para maior consistência
    transactionOptions: {
      isolation: 'READ COMMITTED',
      // Timeout para evitar deadlocks prolongados
      transactionTimeout: 10000, // 10 segundos
    },
  }),
}),
```

**Validação:** Monitorar o número de conexões abertas e o tempo de resposta das requisições após a implementação da mudança. Verificar logs para garantir que não há erros de timeout ou de falta de conexões disponíveis.

### 1.2. Resolver problemas de N+1 queries no CidadaoRepository

**Arquivos:** `src/modules/cidadao/repositories/cidadao.repository.ts`

**Descrição:** Otimizar as consultas que carregam relacionamentos para evitar múltiplas queries.

**Código Antes:**
```typescript
async findAll(options?: {
  skip?: number;
  take?: number;
  where?: any;
  order?: any;
  includeRelations?: boolean;
}): Promise<[Cidadao[], number]> {
  // ... lógica existente ...
  
  // Incluir relacionamentos apenas se necessário
  if (includeRelations) {
    queryBuilder
      .leftJoinAndSelect('cidadao.papeis', 'papeis')
      .leftJoinAndSelect('cidadao.composicao_familiar', 'composicao_familiar');
  }
  
  // ... resto da lógica ...
  
  return queryBuilder.getManyAndCount();
}
```

**Código Depois:**
```typescript
async findAll(options?: {
  skip?: number;
  take?: number;
  where?: any;
  order?: any;
  includeRelations?: boolean;
  specificFields?: string[];
}): Promise<[Cidadao[], number]> {
  // ... lógica existente ...
  
  // Selecionar apenas campos necessários se especificados
  if (options?.specificFields?.length > 0) {
    const fields = options.specificFields.map(field => `cidadao.${field}`);
    queryBuilder.select(fields);
  }
  
  // Incluir relacionamentos com estratégia otimizada
  if (includeRelations) {
    // Usar join com seleção específica para evitar N+1
    queryBuilder
      .leftJoinAndSelect('cidadao.papeis', 'papeis')
      .leftJoinAndSelect('cidadao.composicao_familiar', 'composicao_familiar')
      // Carregar unidade em uma única query
      .leftJoinAndSelect('cidadao.unidade', 'unidade');
  }
  
  // ... resto da lógica ...
  
  // Usar getQueryAndParameters para debug em desenvolvimento
  if (process.env.NODE_ENV === 'development') {
    const [query, parameters] = queryBuilder.getQueryAndParameters();
    console.log('Query gerada:', query);
    console.log('Parâmetros:', parameters);
  }
  
  return queryBuilder.getManyAndCount();
}
```

**Validação:** Executar a query com logging ativado para verificar o número de consultas realizadas. Deve mostrar apenas uma consulta principal para o findAll, mesmo quando includeRelations for true.

### 1.3. Implementar índices GIN otimizados para consultas JSONB

**Arquivos:** `src/modules/cidadao/entities/cidadao.entity.ts` e um novo arquivo de migração

**Descrição:** Adicionar índices GIN específicos para os campos mais consultados dentro do objeto JSONB de endereço.

**Código Antes:**
```typescript
@Column('jsonb')
@IsNotEmpty({ message: 'Endereço é obrigatório' })
@Index()
endereco: {
  logradouro: string;
  numero: string;
  complemento?: string;
  bairro: string;
  cidade: string;
  estado: string;
  cep: string;
};
```

**Código Depois:**
```typescript
@Column('jsonb')
@IsNotEmpty({ message: 'Endereço é obrigatório' })
@Index() // Mantém o índice geral
@Index('idx_cidadao_endereco_bairro', { synchronize: false }) // Será criado via migração
@Index('idx_cidadao_endereco_cidade', { synchronize: false }) // Será criado via migração
endereco: {
  logradouro: string;
  numero: string;
  complemento?: string;
  bairro: string;
  cidade: string;
  estado: string;
  cep: string;
};
```

**Script SQL para a migração:**
```sql
-- Criação de índices GIN para campos específicos do objeto endereco
CREATE INDEX IF NOT EXISTS idx_cidadao_endereco_bairro ON cidadao USING GIN ((endereco->>'bairro') gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_cidadao_endereco_cidade ON cidadao USING GIN ((endereco->>'cidade') gin_trgm_ops);

-- Garante que a extensão necessária esteja instalada
CREATE EXTENSION IF NOT EXISTS pg_trgm;
```

**Validação:** Executar consultas que filtram por bairro ou cidade e verificar o plano de execução com `EXPLAIN ANALYZE` para confirmar que os índices estão sendo utilizados.

## Fase 2: Otimizações Moderadas

### 2.1. Otimizar sistema de cache

**Arquivos:** `src/modules/cidadao/services/cidadao.service.ts`

**Descrição:** Melhorar a implementação de cache para reduzir operações redundantes e otimizar TTLs.

**Código Antes:**
```typescript
// Atualizar cache com novos dados
await this.cacheService.set(
  `${this.CACHE_PREFIX}id:${cidadaoAtualizado.id}`,
  cidadaoDto,
  this.CACHE_TTL,
);
await this.cacheService.set(
  `${this.CACHE_PREFIX}cpf:${cidadaoAtualizado.cpf}`,
  cidadaoDto,
  this.CACHE_TTL,
);

if (cidadaoAtualizado.nis) {
  await this.cacheService.set(
    `${this.CACHE_PREFIX}nis:${cidadaoAtualizado.nis}`,
    cidadaoDto,
    this.CACHE_TTL,
  );
}
```

**Código Depois:**
```typescript
// Implementar método de cache em lote
async updateCidadaoCache(cidadao: CidadaoResponseDto): Promise<void> {
  const cacheOperations = [];
  const ttl = this.getTTLByEntityType('cidadao'); // TTL dinâmico baseado no tipo de entidade
  
  // Preparar todas as operações de cache
  cacheOperations.push(
    this.cacheService.set(`${this.CACHE_PREFIX}id:${cidadao.id}`, cidadao, ttl)
  );
  
  cacheOperations.push(
    this.cacheService.set(`${this.CACHE_PREFIX}cpf:${cidadao.cpf}`, cidadao, ttl)
  );
  
  if (cidadao.nis) {
    cacheOperations.push(
      this.cacheService.set(`${this.CACHE_PREFIX}nis:${cidadao.nis}`, cidadao, ttl)
    );
  }
  
  // Executar todas as operações em paralelo
  await Promise.all(cacheOperations);
}

// Método para determinar TTL apropriado
private getTTLByEntityType(entityType: string): number {
  const ttlMap = {
    'cidadao': 3600, // 1 hora
    'cidadao_list': 300, // 5 minutos para listas (mudam mais frequentemente)
    'cidadao_count': 60, // 1 minuto para contagens
  };
  
  return ttlMap[entityType] || this.CACHE_TTL;
}
```

**Validação:** Medir o tempo de resposta antes e depois da implementação para operações que envolvem cache.

### 2.2. Implementar seleção específica de campos

**Arquivos:** `src/modules/cidadao/repositories/cidadao.repository.ts`

**Descrição:** Modificar as queries para selecionar apenas os campos necessários, reduzindo o volume de dados transferidos.

**Código Antes:**
```typescript
async findByNome(nome: string, includeRelations = false): Promise<Cidadao[]> {
  const query = this.repository.createQueryBuilder('cidadao')
    .where('LOWER(cidadao.nome) ILIKE LOWER(:nome)', { nome: `%${nome}%` })
    .orderBy('cidadao.nome', 'ASC')
    .limit(50); // Limitar resultados para performance

  if (includeRelations) {
    query
      .leftJoinAndSelect('cidadao.papeis', 'papeis')
      .leftJoinAndSelect('cidadao.composicao_familiar', 'composicao_familiar');
  }

  return query.getMany();
}
```

**Código Depois:**
```typescript
async findByNome(
  nome: string, 
  includeRelations = false,
  fields: string[] = ['id', 'nome', 'cpf', 'nis', 'unidade_id']
): Promise<Cidadao[]> {
  // Iniciar com query builder
  const query = this.repository.createQueryBuilder('cidadao');
  
  // Selecionar apenas campos necessários
  if (fields && fields.length > 0) {
    const selectedFields = fields.map(field => `cidadao.${field}`);
    query.select(selectedFields);
  }
  
  // Adicionar condição de busca
  query
    .where('LOWER(cidadao.nome) ILIKE LOWER(:nome)', { nome: `%${nome}%` })
    .orderBy('cidadao.nome', 'ASC')
    .limit(50);

  // Adicionar relacionamentos se necessário, com seleção específica
  if (includeRelations) {
    query.leftJoinAndSelect('cidadao.papeis', 'papeis', 'papeis.ativo = :ativo', { ativo: true });
    
    // Selecionar apenas campos necessários do relacionamento
    if (fields.includes('composicao_familiar')) {
      query.leftJoinAndSelect(
        'cidadao.composicao_familiar', 
        'composicao_familiar',
        'composicao_familiar.ativo = :ativo', 
        { ativo: true }
      );
    }
  }

  // Executar query otimizada
  return query.getMany();
}
```

**Validação:** Verificar o tamanho das respostas antes e depois da implementação, além de analisar os planos de execução das queries.

## Fase 3: Melhorias Futuras

### 3.1. Implementar monitoramento contínuo

**Descrição:** Configurar ferramentas de monitoramento para identificar gargalos de performance em tempo real.

**Script de Implementação:**
```bash
# Instalação do pacote de métricas para NestJS
npm install --save @nestjs/terminus @nestjs/prometheus prometheus-api-metrics

# Implementar módulo de health check e métricas
# Criar arquivo src/monitoring/monitoring.module.ts
```

### 3.2. Implementar estratégia de paginação via cursor

**Descrição:** Substituir a paginação atual (skip/take) por uma baseada em cursor para melhor performance com grandes volumes de dados.

**Arquivos a Modificar:**
- `src/modules/cidadao/controllers/cidadao.controller.ts`
- `src/modules/cidadao/services/cidadao.service.ts`
- `src/modules/cidadao/repositories/cidadao.repository.ts`
- `src/modules/cidadao/dto/cidadao-response.dto.ts` (adicionar campo de cursor)

### 3.3. Implementar query caching no TypeORM

**Descrição:** Configurar o cache de queries do TypeORM para resultados de consultas frequentes.

**Arquivos a Modificar:**
- `src/database/data-source.ts`
- `src/app.module.ts`

## Scripts SQL Necessários

### 1. Criação de Índices Otimizados

```sql
-- Extensão para pesquisa de texto avançada
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Índices para busca em campos JSONB
CREATE INDEX IF NOT EXISTS idx_cidadao_endereco_bairro 
ON cidadao USING GIN ((endereco->>'bairro') gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_cidadao_endereco_cidade 
ON cidadao USING GIN ((endereco->>'cidade') gin_trgm_ops);

-- Índices para campos frequentemente filtrados
CREATE INDEX IF NOT EXISTS idx_cidadao_nome_trgm
ON cidadao USING GIN (nome gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_cidadao_telefone
ON cidadao (telefone);

-- Índices para campos usados em JOIN
CREATE INDEX IF NOT EXISTS idx_composicao_familiar_cidadao_id
ON composicao_familiar (cidadao_id);
```

### 2. Otimização de Tabelas Existentes

```sql
-- Analisar e otimizar tabelas principais
VACUUM ANALYZE cidadao;
VACUUM ANALYZE composicao_familiar;
VACUUM ANALYZE papel_cidadao;

-- Atualizar estatísticas para o planejador de queries
ANALYZE cidadao;
ANALYZE composicao_familiar;
ANALYZE papel_cidadao;
```

### 3. Comandos de Manutenção

```sql
-- Script para identificar queries lentas (executar periodicamente)
SELECT 
  calls, 
  total_time / 1000 as total_seconds, 
  total_time / calls as avg_ms, 
  query
FROM pg_stat_statements
WHERE query NOT LIKE '%pg_%' AND query NOT LIKE 'VACUUM%'
ORDER BY total_time DESC
LIMIT 20;

-- Reset de estatísticas após otimizações
SELECT pg_stat_statements_reset();
```

## Checklist de Validação

- [ ] Medir tempos de resposta antes e depois das mudanças
- [ ] Verificar planos de execução (EXPLAIN ANALYZE) das queries principais
- [ ] Monitorar uso de CPU e memória do servidor de banco de dados
- [ ] Verificar número de conexões ao banco de dados em momentos de pico
- [ ] Realizar testes de carga para validar melhorias em condições de estresse
- [ ] Monitorar logs de erros após as modificações
- [ ] Validar funcionalidade completa após as mudanças

## Resumo de Arquivos a Serem Criados/Modificados

1. **Modificações:**
   - `src/database/data-source.ts` - Configuração de pool e cache
   - `src/app.module.ts` - Configuração de TypeORM
   - `src/modules/cidadao/entities/cidadao.entity.ts` - Índices e relacionamentos
   - `src/modules/cidadao/repositories/cidadao.repository.ts` - Otimização de queries
   - `src/modules/cidadao/services/cidadao.service.ts` - Otimização de cache e lógica
   - `src/modules/cidadao/controllers/cidadao.controller.ts` - Paginação

2. **Criações:**
   - `src/database/migrations/[timestamp]-add-optimized-indexes.ts` - Migração de índices
   - `src/shared/utils/query-helper.ts` - Utilitários para otimização de queries
   - `src/monitoring/monitoring.module.ts` - Monitoramento de performance
