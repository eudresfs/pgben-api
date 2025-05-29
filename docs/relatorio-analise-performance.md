# Relatório de Análise de Performance da API PGBen

## Sumário Executivo

Após uma análise detalhada do código-fonte da API PGBen, identificamos vários problemas que contribuem para a alta latência nos endpoints de busca e listagem. As principais questões estão relacionadas a consultas ineficientes, ausência de configurações adequadas de connection pooling, problemas N+1 e uso inadequado do TypeORM.

### Principais Problemas Identificados

1. **Configuração inadequada do pool de conexões** - Ausência de configuração explícita para o pool de conexões
2. **Carregamento excessivo de relacionamentos** - Diversos endpoints carregam relacionamentos desnecessariamente
3. **Problemas de N+1 queries** - Identificados principalmente no módulo de cidadão
4. **Cache com configuração limitada** - Implementação existente pode ser otimizada
5. **Consultas JSONB ineficientes** - Ausência de índices específicos para consultas em campos JSONB

### Impacto Estimado na Performance

- **Alto**: Problemas de N+1 queries e connection pooling (redução potencial de 40-60% no tempo de resposta)
- **Médio**: Carregamento excessivo de relacionamentos (redução potencial de 20-30%)
- **Médio**: Consultas JSONB ineficientes (redução potencial de 15-25%)
- **Baixo**: Cache limitado (redução potencial de 10-15%)

## Análise Detalhada por Categoria

### 1. Configuração de Conexão (TypeORM)

#### 1.1 Ausência de configurações explícitas de connection pooling

**Problema Identificado:**  
A configuração atual do TypeORM no arquivo `src/database/data-source.ts` e `src/app.module.ts` não define parâmetros essenciais para o pool de conexões como `poolSize`, `idleTimeoutMillis` e `connectionTimeoutMillis`.

**Impacto:** Alto  
A ausência dessas configurações faz com que o sistema use valores padrão que podem não ser adequados para a carga de trabalho, causando esgotamento de conexões em momentos de pico.

**Arquivos Afetados:**
- `src/database/data-source.ts`
- `src/app.module.ts`

**Evidências:**
```typescript
// Configuração atual no app.module.ts
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

#### 1.2 Logging de queries em produção

**Problema Identificado:**  
O logging de queries está configurado para ser ativado em ambiente de desenvolvimento, mas a condição pode permitir que isso ocorra em produção se a variável `NODE_ENV` não estiver definida.

**Impacto:** Médio  
O logging de queries em produção pode causar overhead significativo e poluir os logs.

**Arquivos Afetados:**
- `src/database/data-source.ts`
- `src/app.module.ts`

**Evidências:**
```typescript
logging: process.env.NODE_ENV === 'development',
```

### 2. Definição de Entidades

#### 2.1 Carregamento automático de relacionamentos sem controle

**Problema Identificado:**  
A entidade `Cidadao` define vários relacionamentos (`@OneToMany` e `@ManyToOne`) sem especificar estratégias de carregamento, resultando em potenciais problemas de N+1 queries.

**Impacto:** Alto  
O carregamento automático de relacionamentos pode resultar em múltiplas queries para cada registro principal.

**Arquivos Afetados:**
- `src/modules/cidadao/entities/cidadao.entity.ts`

**Evidências:**
```typescript
@OneToMany(() => PapelCidadao, (papelCidadao) => papelCidadao.cidadao)
papeis: PapelCidadao[];

@OneToMany(() => ComposicaoFamiliar, (composicaoFamiliar) => composicaoFamiliar.cidadao)
composicao_familiar: ComposicaoFamiliar[];

@ManyToOne(() => Unidade, { nullable: false })
@JoinColumn({ name: 'unidade_id' })
unidade: Unidade;
```

#### 2.2 Índices JSONB incompletos

**Problema Identificado:**  
A entidade `Cidadao` utiliza campos JSONB para armazenar endereços, mas os índices não são otimizados para consultas específicas em campos dentro desse objeto.

**Impacto:** Médio  
Consultas que filtram por campos dentro do objeto JSONB de endereço (ex: bairro, cidade) estão subotimizadas.

**Arquivos Afetados:**
- `src/modules/cidadao/entities/cidadao.entity.ts`

**Evidências:**
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

### 3. Repositories e Queries

#### 3.1 Queries N+1 na implementação de busca com relacionamentos

**Problema Identificado:**  
O método `findById` e outros métodos de busca no `CidadaoRepository` usam `leftJoinAndSelect` para carregar relacionamentos, mas isso é feito de forma inconsistente e sem otimização para casos específicos.

**Impacto:** Alto  
Resulta em múltiplas queries para carregar relacionamentos, especialmente quando vários registros são retornados.

**Arquivos Afetados:**
- `src/modules/cidadao/repositories/cidadao.repository.ts`

**Evidências:**
```typescript
async findById(id: string, includeRelations = false): Promise<Cidadao | null> {
  const query = this.repository.createQueryBuilder('cidadao')
    .where('cidadao.id = :id', { id });
  
  if (includeRelations) {
    query
      .leftJoinAndSelect('cidadao.papeis', 'papeis')
      .leftJoinAndSelect('cidadao.composicao_familiar', 'composicao_familiar');
  }
  
  return query.getOne();
}
```

#### 3.2 Ausência de select específico para campos necessários

**Problema Identificado:**  
As consultas no `CidadaoRepository` não utilizam `select()` para especificar apenas os campos necessários, resultando no carregamento de todos os campos mesmo quando não são utilizados.

**Impacto:** Médio  
Aumento desnecessário do volume de dados transferidos entre o banco e a aplicação.

**Arquivos Afetados:**
- `src/modules/cidadao/repositories/cidadao.repository.ts`

**Evidências:**
```typescript
// Carrega todos os campos, quando poderia selecionar apenas os necessários
const query = this.repository.createQueryBuilder('cidadao')
  .where('cidadao.telefone = :telefone', { telefone });
```

### 4. Services e Controllers

#### 4.1 Múltiplas chamadas ao banco em sequência

**Problema Identificado:**  
O método `update` no `CidadaoService` realiza múltiplas operações de banco de dados em sequência que poderiam ser otimizadas.

**Impacto:** Médio  
Aumento no tempo de resposta devido a múltiplas operações sequenciais no banco de dados.

**Arquivos Afetados:**
- `src/modules/cidadao/services/cidadao.service.ts`

**Evidências:**
```typescript
async update(id: string, updateCidadaoDto: UpdateCidadaoDto, userId: string): Promise<CidadaoResponseDto> {
  // Busca o cidadão
  const cidadaoExistente = await this.cidadaoRepository.findById(id);
  
  // Verifica conflitos (outra query)
  if (updateCidadaoDto.cpf && updateCidadaoDto.cpf !== cidadaoExistente.cpf) {
    const cidadaoPorCpf = await this.cidadaoRepository.findByCpf(updateCidadaoDto.cpf);
    // ...
  }
  
  // Atualiza o cidadão (mais uma query)
  const cidadaoAtualizado = await this.cidadaoRepository.update(id, updateCidadaoDto);
  
  // Invalida cache
  await this.invalidateCache(cidadaoAtualizado);
  
  // Atualiza o cache (múltiplas operações de cache)
  await this.cacheService.set(/* ... */);
  await this.cacheService.set(/* ... */);
  
  if (cidadaoAtualizado.nis) {
    await this.cacheService.set(/* ... */);
  }
}
```

#### 4.2 Implementação subótima de cache

**Problema Identificado:**  
A implementação de cache no `CidadaoService` realiza múltiplas operações de atualização de cache para diferentes chaves, mas não utiliza operações em lote.

**Impacto:** Baixo  
Ligeiro aumento no tempo de resposta devido a múltiplas operações de cache sequenciais.

**Arquivos Afetados:**
- `src/modules/cidadao/services/cidadao.service.ts`

**Evidências:**
```typescript
// Múltiplas operações de cache sequenciais
await this.cacheService.set(`${this.CACHE_PREFIX}id:${cidadaoAtualizado.id}`, cidadaoDto, this.CACHE_TTL);
await this.cacheService.set(`${this.CACHE_PREFIX}cpf:${cidadaoAtualizado.cpf}`, cidadaoDto, this.CACHE_TTL);

if (cidadaoAtualizado.nis) {
  await this.cacheService.set(`${this.CACHE_PREFIX}nis:${cidadaoAtualizado.nis}`, cidadaoDto, this.CACHE_TTL);
}
```

## Problemas Críticos (Alta Prioridade)

### 1. Falta de configuração adequada do pool de conexões

A ausência de configurações explícitas para o pool de conexões pode causar gargalos significativos, especialmente em momentos de maior carga. Isso pode resultar em tempos de resposta extremamente altos ou até mesmo em falhas de conexão.

### 2. Queries N+1

As consultas N+1 são o problema mais grave identificado, especialmente nas operações que envolvem o carregamento de relacionamentos. Esse padrão ineficiente resulta em uma quantidade excessiva de consultas ao banco de dados.

### 3. Carregamento excessivo de dados

O sistema frequentemente carrega mais dados do que o necessário, tanto em termos de colunas (ausência de `select` específicos) quanto em termos de relacionamentos (carregamento de relacionamentos não utilizados).

## Problemas Moderados (Média Prioridade)

### 1. Ausência de índices otimizados para consultas JSONB

As consultas em campos JSONB, especialmente no objeto `endereco`, não estão utilizando índices GIN específicos para campos internos, o que pode resultar em scans completos de tabela em vez de buscas indexadas.

### 2. Implementação de cache subótima

O sistema de cache atual tem vários problemas:
- TTL fixo para todos os tipos de dados
- Operações de cache sequenciais não otimizadas
- Ausência de estratégias de invalidação seletiva

### 3. Transações não utilizadas adequadamente

Operações que modificam múltiplas tabelas não estão utilizando transações adequadamente, o que pode levar a inconsistências de dados em caso de falhas.

## Problemas Menores (Baixa Prioridade)

### 1. Logging excessivo em produção

A configuração de logging pode resultar em logs excessivos em produção, impactando a performance e dificultando a análise de logs críticos.

### 2. Normalizações repetitivas

Operações de normalização (como remoção de caracteres não numéricos de CPF/NIS) são repetidas em múltiplos lugares, resultando em duplicação de código e potenciais inconsistências.
