# Filtros Avançados - Exemplos Práticos

## 📋 Cenários Reais de Implementação

### 1. Módulo de Solicitações

#### DTO Completo

```typescript
// src/shared/dtos/filtros/solicitacao-filtros.dto.ts
import { IsOptional, IsArray, IsString, IsEnum } from 'class-validator';
import { Transform } from 'class-transformer';
import { BaseFiltrosDto } from './base-filtros.dto';
import { transformToArray } from '../../utils/array-transform.util';
import { StatusSolicitacao, TipoSolicitacao } from '../../enums';

export class SolicitacaoFiltrosDto extends BaseFiltrosDto {
  @IsOptional()
  @IsArray()
  @Transform(transformToArray)
  status?: StatusSolicitacao[];

  @IsOptional()
  @IsArray()
  @Transform(transformToArray)
  tipo?: TipoSolicitacao[];

  @IsOptional()
  @IsString()
  cidadao_cpf?: string;

  @IsOptional()
  @IsString()
  protocolo?: string;

  @IsOptional()
  @IsArray()
  @Transform(transformToArray)
  unidade_id?: string[];

  @IsOptional()
  @IsArray()
  @Transform(transformToArray)
  responsavel_id?: string[];
}
```

#### Controller

```typescript
// src/modules/solicitacao/solicitacao.controller.ts
@Controller('solicitacoes')
@ApiTags('Solicitações')
export class SolicitacaoController {
  constructor(private readonly solicitacaoService: SolicitacaoService) {}

  @Get()
  @ApiOperation({ summary: 'Listar solicitações com filtros avançados' })
  @ApiQuery({ name: 'status', required: false, isArray: true, enum: StatusSolicitacao })
  @ApiQuery({ name: 'tipo', required: false, isArray: true, enum: TipoSolicitacao })
  @ApiQuery({ name: 'search', required: false, description: 'Busca por protocolo, CPF ou nome' })
  @ApiQuery({ name: 'data_inicio', required: false, type: 'string', format: 'date' })
  @ApiQuery({ name: 'data_fim', required: false, type: 'string', format: 'date' })
  @ApiQuery({ name: 'page', required: false, type: 'number', example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: 'number', example: 10 })
  async findAll(@Query() filtros: SolicitacaoFiltrosDto) {
    return this.solicitacaoService.findAll(filtros);
  }
}
```

#### Service

```typescript
// src/modules/solicitacao/solicitacao.service.ts
@Injectable()
export class SolicitacaoService {
  constructor(
    @InjectRepository(Solicitacao)
    private solicitacaoRepository: Repository<Solicitacao>,
    private filtrosAvancadosService: FiltrosAvancadosService,
  ) {}

  async findAll(filtros: SolicitacaoFiltrosDto) {
    const query = this.solicitacaoRepository
      .createQueryBuilder('solicitacao')
      .leftJoinAndSelect('solicitacao.cidadao', 'cidadao')
      .leftJoinAndSelect('solicitacao.unidade', 'unidade')
      .leftJoinAndSelect('solicitacao.responsavel', 'responsavel');

    // Filtros específicos do domínio
    if (filtros.cidadao_cpf) {
      query.andWhere('cidadao.cpf = :cpf', { cpf: filtros.cidadao_cpf });
    }

    if (filtros.protocolo) {
      query.andWhere('solicitacao.protocolo ILIKE :protocolo', {
        protocolo: `%${filtros.protocolo}%`
      });
    }

    // Configurar campos de busca textual
    const filtrosComBusca = {
      ...filtros,
      searchFields: [
        'solicitacao.protocolo',
        'solicitacao.descricao',
        'cidadao.nome',
        'cidadao.cpf'
      ]
    };

    return this.filtrosAvancadosService.aplicarFiltros(query, filtrosComBusca);
  }
}
```

### 2. Módulo de Pagamentos

#### DTO com Filtros Numéricos

```typescript
// src/shared/dtos/filtros/pagamento-filtros.dto.ts
export class PagamentoFiltrosDto extends BaseFiltrosDto {
  @IsOptional()
  @IsArray()
  @Transform(transformToArray)
  status?: StatusPagamento[];

  @IsOptional()
  @IsArray()
  @Transform(transformToArray)
  forma_pagamento?: FormaPagamento[];

  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => value ? parseFloat(value) : undefined)
  valor_minimo?: number;

  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => value ? parseFloat(value) : undefined)
  valor_maximo?: number;

  @IsOptional()
  @IsString()
  beneficiario_cpf?: string;

  @IsOptional()
  @IsArray()
  @Transform(transformToArray)
  banco_codigo?: string[];
}
```

#### Service com Filtros Complexos

```typescript
@Injectable()
export class PagamentoService {
  async findAll(filtros: PagamentoFiltrosDto) {
    const query = this.pagamentoRepository
      .createQueryBuilder('pagamento')
      .leftJoinAndSelect('pagamento.beneficiario', 'beneficiario')
      .leftJoinAndSelect('pagamento.conta_bancaria', 'conta');

    // Filtros de valor
    if (filtros.valor_minimo !== undefined) {
      query.andWhere('pagamento.valor >= :valor_minimo', {
        valor_minimo: filtros.valor_minimo
      });
    }

    if (filtros.valor_maximo !== undefined) {
      query.andWhere('pagamento.valor <= :valor_maximo', {
        valor_maximo: filtros.valor_maximo
      });
    }

    // Filtro por CPF do beneficiário
    if (filtros.beneficiario_cpf) {
      query.andWhere('beneficiario.cpf = :cpf', {
        cpf: filtros.beneficiario_cpf
      });
    }

    // Filtro por código do banco
    if (filtros.banco_codigo?.length) {
      query.andWhere('conta.banco_codigo IN (:...bancos)', {
        bancos: filtros.banco_codigo
      });
    }

    const filtrosComBusca = {
      ...filtros,
      searchFields: [
        'pagamento.numero_documento',
        'beneficiario.nome',
        'beneficiario.cpf'
      ]
    };

    return this.filtrosAvancadosService.aplicarFiltros(query, filtrosComBusca);
  }
}
```

### 3. Módulo de Usuários com Perfis

#### DTO com Relacionamentos

```typescript
export class UsuarioFiltrosDto extends BaseFiltrosDto {
  @IsOptional()
  @IsArray()
  @Transform(transformToArray)
  status?: StatusUsuario[];

  @IsOptional()
  @IsArray()
  @Transform(transformToArray)
  perfil_id?: string[];

  @IsOptional()
  @IsArray()
  @Transform(transformToArray)
  unidade_id?: string[];

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return undefined;
  })
  primeiro_acesso?: boolean;

  @IsOptional()
  @IsDateString()
  ultimo_acesso_inicio?: string;

  @IsOptional()
  @IsDateString()
  ultimo_acesso_fim?: string;
}
```

#### Service com Subqueries

```typescript
@Injectable()
export class UsuarioService {
  async findAll(filtros: UsuarioFiltrosDto) {
    const query = this.usuarioRepository
      .createQueryBuilder('usuario')
      .leftJoinAndSelect('usuario.perfis', 'perfil')
      .leftJoinAndSelect('usuario.unidades', 'unidade');

    // Filtro por perfil
    if (filtros.perfil_id?.length) {
      query.andWhere('perfil.id IN (:...perfis)', {
        perfis: filtros.perfil_id
      });
    }

    // Filtro por unidade
    if (filtros.unidade_id?.length) {
      query.andWhere('unidade.id IN (:...unidades)', {
        unidades: filtros.unidade_id
      });
    }

    // Filtro por primeiro acesso
    if (filtros.primeiro_acesso !== undefined) {
      if (filtros.primeiro_acesso) {
        query.andWhere('usuario.ultimo_acesso IS NULL');
      } else {
        query.andWhere('usuario.ultimo_acesso IS NOT NULL');
      }
    }

    // Filtros de data de último acesso
    if (filtros.ultimo_acesso_inicio) {
      query.andWhere('usuario.ultimo_acesso >= :inicio', {
        inicio: filtros.ultimo_acesso_inicio
      });
    }

    if (filtros.ultimo_acesso_fim) {
      query.andWhere('usuario.ultimo_acesso <= :fim', {
        fim: filtros.ultimo_acesso_fim
      });
    }

    const filtrosComBusca = {
      ...filtros,
      searchFields: [
        'usuario.nome',
        'usuario.email',
        'usuario.cpf'
      ]
    };

    return this.filtrosAvancadosService.aplicarFiltros(query, filtrosComBusca);
  }
}
```

## 🧪 Exemplos de Testes

### Teste de Filtros Básicos

```typescript
describe('SolicitacaoService - Filtros', () => {
  let service: SolicitacaoService;
  let repository: Repository<Solicitacao>;
  let queryBuilder: any;

  beforeEach(async () => {
    queryBuilder = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      getCount: jest.fn().mockResolvedValue(50),
      getMany: jest.fn().mockResolvedValue([]),
    };

    const mockRepository = {
      createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
    };

    const module = await Test.createTestingModule({
      providers: [
        SolicitacaoService,
        FiltrosAvancadosService,
        {
          provide: getRepositoryToken(Solicitacao),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<SolicitacaoService>(SolicitacaoService);
    repository = module.get<Repository<Solicitacao>>(getRepositoryToken(Solicitacao));
  });

  it('deve aplicar filtro de status', async () => {
    const filtros = {
      status: [StatusSolicitacao.PENDENTE, StatusSolicitacao.EM_ANALISE]
    };

    await service.findAll(filtros);

    expect(queryBuilder.andWhere).toHaveBeenCalledWith(
      'solicitacao.status IN (:...status)',
      { status: filtros.status }
    );
  });

  it('deve aplicar filtro de CPF do cidadão', async () => {
    const filtros = {
      cidadao_cpf: '12345678901'
    };

    await service.findAll(filtros);

    expect(queryBuilder.andWhere).toHaveBeenCalledWith(
      'cidadao.cpf = :cpf',
      { cpf: '12345678901' }
    );
  });

  it('deve aplicar busca textual', async () => {
    const filtros = {
      search: 'João Silva'
    };

    await service.findAll(filtros);

    expect(queryBuilder.andWhere).toHaveBeenCalledWith(
      expect.stringContaining('ILIKE'),
      expect.objectContaining({ search: '%João Silva%' })
    );
  });
});
```

### Teste de Filtros Numéricos

```typescript
describe('PagamentoService - Filtros Numéricos', () => {
  it('deve aplicar filtro de valor mínimo', async () => {
    const filtros = {
      valor_minimo: 100.50
    };

    await service.findAll(filtros);

    expect(queryBuilder.andWhere).toHaveBeenCalledWith(
      'pagamento.valor >= :valor_minimo',
      { valor_minimo: 100.50 }
    );
  });

  it('deve aplicar filtro de valor máximo', async () => {
    const filtros = {
      valor_maximo: 1000.00
    };

    await service.findAll(filtros);

    expect(queryBuilder.andWhere).toHaveBeenCalledWith(
      'pagamento.valor <= :valor_maximo',
      { valor_maximo: 1000.00 }
    );
  });

  it('deve aplicar filtro de faixa de valores', async () => {
    const filtros = {
      valor_minimo: 100.00,
      valor_maximo: 500.00
    };

    await service.findAll(filtros);

    expect(queryBuilder.andWhere).toHaveBeenCalledWith(
      'pagamento.valor >= :valor_minimo',
      { valor_minimo: 100.00 }
    );
    expect(queryBuilder.andWhere).toHaveBeenCalledWith(
      'pagamento.valor <= :valor_maximo',
      { valor_maximo: 500.00 }
    );
  });
});
```

## 🌐 Exemplos de Requisições HTTP

### Filtros Simples

```bash
# Filtrar por status
GET /api/v1/solicitacoes?status=PENDENTE,EM_ANALISE

# Busca textual
GET /api/v1/solicitacoes?search=João Silva

# Paginação
GET /api/v1/solicitacoes?page=2&limit=20
```

### Filtros Complexos

```bash
# Múltiplos filtros
GET /api/v1/solicitacoes?status=PENDENTE&tipo=BENEFICIO&data_inicio=2024-01-01&data_fim=2024-01-31&page=1&limit=10

# Filtros numéricos
GET /api/v1/pagamentos?valor_minimo=100&valor_maximo=1000&status=APROVADO

# Filtros com arrays
GET /api/v1/usuarios?perfil_id=1,2,3&unidade_id=10,20&status=ATIVO
```

### Ordenação

```bash
# Ordenação simples
GET /api/v1/solicitacoes?orderBy=created_at&orderDirection=DESC

# Ordenação com filtros
GET /api/v1/pagamentos?status=APROVADO&orderBy=valor&orderDirection=ASC
```

## 📊 Exemplos de Respostas

### Resposta Padrão

```json
{
  "items": [
    {
      "id": "uuid-1",
      "protocolo": "2024001234",
      "status": "PENDENTE",
      "tipo": "BENEFICIO",
      "created_at": "2024-01-15T10:30:00Z",
      "cidadao": {
        "id": "uuid-cidadao",
        "nome": "João Silva",
        "cpf": "12345678901"
      }
    }
  ],
  "total": 150,
  "page": 1,
  "limit": 10,
  "totalPages": 15
}
```

### Resposta com Metadados

```json
{
  "items": [...],
  "total": 150,
  "page": 1,
  "limit": 10,
  "totalPages": 15,
  "hasNext": true,
  "hasPrevious": false,
  "filters": {
    "status": ["PENDENTE", "EM_ANALISE"],
    "data_inicio": "2024-01-01",
    "data_fim": "2024-01-31"
  }
}
```

## 🔧 Configurações Avançadas

### Cache de Queries

```typescript
@Injectable()
export class SolicitacaoService {
  async findAll(filtros: SolicitacaoFiltrosDto) {
    // Gerar chave de cache baseada nos filtros
    const cacheKey = `solicitacoes:${JSON.stringify(filtros)}`;
    
    // Verificar cache
    const cached = await this.cacheService.get(cacheKey);
    if (cached) {
      return cached;
    }

    // Executar query
    const query = this.solicitacaoRepository.createQueryBuilder('solicitacao');
    const resultado = await this.filtrosAvancadosService.aplicarFiltros(query, filtros);

    // Salvar no cache por 5 minutos
    await this.cacheService.set(cacheKey, resultado, 300);

    return resultado;
  }
}
```

### Logs de Performance

```typescript
async findAll(filtros: SolicitacaoFiltrosDto) {
  const startTime = Date.now();
  
  try {
    const query = this.solicitacaoRepository.createQueryBuilder('solicitacao');
    const resultado = await this.filtrosAvancadosService.aplicarFiltros(query, filtros);
    
    const duration = Date.now() - startTime;
    this.logger.log(`Query executada em ${duration}ms`, {
      filtros,
      total: resultado.total,
      duration
    });
    
    return resultado;
  } catch (error) {
    const duration = Date.now() - startTime;
    this.logger.error(`Erro na query após ${duration}ms`, {
      filtros,
      error: error.message,
      duration
    });
    throw error;
  }
}
```

---

**💡 Dicas Importantes:**

1. **Performance**: Sempre adicione índices para campos filtráveis
2. **Validação**: Use DTOs com validação adequada
3. **Testes**: Teste todos os cenários de filtros
4. **Cache**: Implemente cache para queries frequentes
5. **Logs**: Monitore performance das queries
6. **Documentação**: Mantenha a documentação da API atualizada