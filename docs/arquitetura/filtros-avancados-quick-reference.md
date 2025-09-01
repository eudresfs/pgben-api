# Filtros Avançados - Referência Rápida

## 🚀 Setup Rápido

### 1. Criar DTO

```typescript
// src/shared/dtos/filtros/meu-modulo-filtros.dto.ts
import { IsOptional, IsArray, IsString } from 'class-validator';
import { Transform } from 'class-transformer';
import { BaseFiltrosDto } from './base-filtros.dto';
import { transformToArray } from '../../utils/array-transform.util';

export class MeuModuloFiltrosDto extends BaseFiltrosDto {
  @IsOptional()
  @IsArray()
  @Transform(transformToArray)
  status?: string[];

  @IsOptional()
  @IsString()
  categoria?: string;
}
```

### 2. Atualizar Controller

```typescript
@Get()
async findAll(@Query() filtros: MeuModuloFiltrosDto) {
  return this.meuModuloService.findAll(filtros);
}
```

### 3. Atualizar Service

```typescript
constructor(
  @InjectRepository(MinhaEntidade)
  private repository: Repository<MinhaEntidade>,
  private filtrosAvancadosService: FiltrosAvancadosService,
) {}

async findAll(filtros: MeuModuloFiltrosDto) {
  const query = this.repository.createQueryBuilder('entidade');
  return this.filtrosAvancadosService.aplicarFiltros(query, filtros);
}
```

## 📋 Checklist de Migração

- [ ] DTO criado e estendendo `BaseFiltrosDto`
- [ ] Decorators de validação aplicados
- [ ] `@Transform(transformToArray)` em campos de array
- [ ] Controller atualizado para usar DTO
- [ ] Service injetando `FiltrosAvancadosService`
- [ ] Método `aplicarFiltros` implementado
- [ ] Testes atualizados
- [ ] Documentação atualizada

## 🔧 Padrões Comuns

### Arrays (Status, Tipos, etc.)

```typescript
@IsOptional()
@IsArray()
@Transform(transformToArray)
status?: string[];
```

### Busca Textual

```typescript
@IsOptional()
@IsString()
search?: string;

// No service:
const filtrosComBusca = {
  ...filtros,
  searchFields: ['entidade.nome', 'entidade.descricao']
};
```

### Datas

```typescript
@IsOptional()
@IsDateString()
data_inicio?: string;

@IsOptional()
@IsDateString()
data_fim?: string;

@IsOptional()
@IsEnum(PeriodoPredefinido)
periodo?: PeriodoPredefinido;
```

### Valores Numéricos

```typescript
@IsOptional()
@IsNumber()
@Transform(({ value }) => value ? parseFloat(value) : undefined)
valor_minimo?: number;

@IsOptional()
@IsNumber()
@Transform(({ value }) => value ? parseFloat(value) : undefined)
valor_maximo?: number;
```

## 🎯 Exemplos por Tipo

### Filtros Simples

```typescript
// DTO
export class SimpleFiltrosDto extends BaseFiltrosDto {
  @IsOptional()
  @IsArray()
  @Transform(transformToArray)
  status?: string[];
}

// Service
async findAll(filtros: SimpleFiltrosDto) {
  const query = this.repository.createQueryBuilder('entidade');
  return this.filtrosAvancadosService.aplicarFiltros(query, filtros);
}
```

### Filtros com Joins

```typescript
async findAll(filtros: ComJoinsFiltrosDto) {
  const query = this.repository
    .createQueryBuilder('principal')
    .leftJoinAndSelect('principal.relacionamento', 'rel');

  const filtrosComBusca = {
    ...filtros,
    searchFields: ['principal.nome', 'rel.descricao']
  };

  return this.filtrosAvancadosService.aplicarFiltros(query, filtrosComBusca);
}
```

### Filtros Complexos

```typescript
async findAll(filtros: ComplexoFiltrosDto) {
  const query = this.repository.createQueryBuilder('entidade');

  // Filtros específicos ANTES dos filtros gerais
  if (filtros.valor_minimo) {
    query.andWhere('entidade.valor >= :valor_minimo', { 
      valor_minimo: filtros.valor_minimo 
    });
  }

  if (filtros.categoria_especial) {
    query.andWhere('entidade.categoria IN (:...categorias)', {
      categorias: ['especial', 'premium']
    });
  }

  return this.filtrosAvancadosService.aplicarFiltros(query, filtros);
}
```

## 🧪 Testes Padrão

```typescript
describe('MeuModuloService', () => {
  let service: MeuModuloService;
  let filtrosService: FiltrosAvancadosService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        MeuModuloService,
        FiltrosAvancadosService,
        {
          provide: getRepositoryToken(MinhaEntidade),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<MeuModuloService>(MeuModuloService);
  });

  it('deve aplicar filtros básicos', async () => {
    const filtros = {
      status: ['ativo'],
      page: 1,
      limit: 10
    };

    const resultado = await service.findAll(filtros);

    expect(resultado.items).toBeDefined();
    expect(resultado.total).toBeDefined();
  });
});
```

## ⚡ Performance Tips

### Índices Recomendados

```sql
-- Para campos de status/enum
CREATE INDEX idx_entidade_status ON entidade(status);

-- Para datas
CREATE INDEX idx_entidade_created_at ON entidade(created_at);

-- Para busca textual
CREATE INDEX idx_entidade_nome_gin ON entidade USING gin(to_tsvector('portuguese', nome));

-- Compostos para filtros frequentes
CREATE INDEX idx_entidade_status_created ON entidade(status, created_at);
```

### Query Optimization

```typescript
// ✅ BOM: Joins específicos
const query = this.repository
  .createQueryBuilder('entidade')
  .leftJoinAndSelect('entidade.relacionamento', 'rel')
  .where('rel.ativo = true'); // Filtro no join

// ❌ RUIM: Select * sem filtros
const query = this.repository
  .createQueryBuilder('entidade')
  .leftJoinAndSelect('entidade.relacionamento', 'rel');
```

## 🐛 Troubleshooting

### Erro: "Transform is not a function"

```typescript
// ❌ Faltando import
import { Transform } from 'class-transformer';

// ✅ Correto
@Transform(transformToArray)
status?: string[];
```

### Erro: "Property does not exist"

```typescript
// ❌ DTO não estende BaseFiltrosDto
export class MeuFiltroDto {
  // ...
}

// ✅ Correto
export class MeuFiltroDto extends BaseFiltrosDto {
  // ...
}
```

### Filtros não funcionam

```typescript
// ❌ Esqueceu de aplicar filtros
async findAll(filtros: MeuFiltroDto) {
  const query = this.repository.createQueryBuilder('entidade');
  return query.getManyAndCount(); // ❌
}

// ✅ Correto
async findAll(filtros: MeuFiltroDto) {
  const query = this.repository.createQueryBuilder('entidade');
  return this.filtrosAvancadosService.aplicarFiltros(query, filtros); // ✅
}
```

## 📚 Recursos Disponíveis

### Campos Automáticos (BaseFiltrosDto)

- `page` - Página atual
- `limit` - Itens por página
- `orderBy` - Campo para ordenação
- `orderDirection` - Direção da ordenação (ASC/DESC)
- `search` - Busca textual
- `data_inicio` - Data de início
- `data_fim` - Data de fim
- `periodo` - Período predefinido
- `incluir_arquivados` - Incluir registros arquivados

### Períodos Predefinidos

- `HOJE`
- `ONTEM`
- `ULTIMOS_7_DIAS`
- `ULTIMOS_30_DIAS`
- `ULTIMOS_90_DIAS`
- `ESTE_MES`
- `MES_PASSADO`
- `ESTE_ANO`
- `ANO_PASSADO`

### Utilitários

- `transformToArray` - Converte string/array para array
- `FiltrosAvancadosService.aplicarFiltros()` - Aplica todos os filtros
- `FiltrosAvancadosService.aplicarPaginacao()` - Aplica apenas paginação
- `FiltrosAvancadosService.normalizarFiltros()` - Normaliza filtros

## 🔗 Links Úteis

- [Guia Completo](./filtros-avancados-guia-completo.md)
- [Arquitetura Detalhada](./arquitetura-filtros-avancados.md)
- [Exemplos de Implementação](../exemplos/filtros-avancados/)
- [Testes de Referência](../../src/shared/services/tests/filtros-avancados.service.spec.ts)

---

**💡 Dica**: Sempre teste seus filtros com dados reais e verifique a performance das queries geradas!