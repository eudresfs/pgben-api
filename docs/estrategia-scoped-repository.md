# Estratégia ScopedRepository - Implementação Definitiva

## Visão Geral

A estratégia **ScopedRepository** é uma solução elegante e minimalista para implementar controle de escopo de dados, baseada em herança do TypeORM Repository com aplicação automática de filtros.

### Princípios Fundamentais

- **Simplicidade**: ~100 linhas de código core vs ~2000 da estratégia anterior
- **Transparência**: Desenvolvedores sabem exatamente o que acontece
- **Automatização**: Filtros aplicados automaticamente sem intervenção manual
- **Flexibilidade**: Casos especiais tratáveis com decorators e métodos específicos
- **Database Agnostic**: Funciona com qualquer banco de dados suportado pelo TypeORM
- **Testabilidade**: Fácil de mockar e testar isoladamente

---

## Arquitetura da Solução

### Componentes Principais

1. **RequestContextHolder**: Gerencia contexto da requisição usando AsyncLocalStorage
2. **ScopedRepository<T>**: Classe base que herda de Repository<T> e aplica filtros automaticamente
3. **ScopeContextMiddleware**: Middleware simples para extrair contexto do JWT
4. **ScopeType**: Enum com tipos de escopo (GLOBAL, UNIDADE, PROPRIO)
5. **IScopeContext**: Interface do contexto de escopo

### Fluxo de Funcionamento

```
Request → Middleware → RequestContextHolder → ScopedRepository → Database
    ↓         ↓              ↓                    ↓              ↓
  JWT    Extrai        Armazena           Aplica Filtros    Query Filtrada
        Contexto      Contexto           Automaticamente
```

---

## Implementação Detalhada

### 1. Tipos e Interfaces

```typescript
// src/enums/scope-type.enum.ts
export enum ScopeType {
  GLOBAL = 'GLOBAL',     // Acesso a todos os dados
  UNIDADE = 'UNIDADE',   // Acesso apenas à própria unidade
  PROPRIO = 'PROPRIO'    // Acesso apenas aos próprios dados
}

// src/common/interfaces/scope-context.interface.ts
export interface IScopeContext {
  tipo: ScopeType;
  user_id: string;
  unidade_id?: string;  // Obrigatório para UNIDADE
}

// src/common/exceptions/scope.exceptions.ts
export class ScopeViolationException extends ForbiddenException {
  constructor(message = 'Acesso negado: fora do escopo permitido') {
    super(message);
  }
}

export class InvalidScopeContextException extends BadRequestException {
  constructor(message = 'Contexto de escopo inválido') {
    super(message);
  }
}
```

### 2. RequestContextHolder

```typescript
// src/common/services/request-context-holder.service.ts
import { AsyncLocalStorage } from 'async_hooks';
import { Injectable } from '@nestjs/common';
import { IScopeContext } from '../interfaces/scope-context.interface';

@Injectable()
export class RequestContextHolder {
  private static asyncLocalStorage = new AsyncLocalStorage<IScopeContext>();

  /**
   * Define o contexto para a requisição atual
   */
  static set(context: IScopeContext): void {
    this.asyncLocalStorage.enterWith(context);
  }

  /**
   * Obtém o contexto da requisição atual
   */
  static get(): IScopeContext | undefined {
    return this.asyncLocalStorage.getStore();
  }

  /**
   * Obtém o contexto da requisição atual ou lança exceção
   */
  static getRequired(): IScopeContext {
    const context = this.get();
    if (!context) {
      throw new InvalidScopeContextException(
        'Contexto de escopo não encontrado. Verifique se o middleware está configurado.'
      );
    }
    return context;
  }

  /**
   * Executa uma função com um contexto específico
   */
  static run<T>(context: IScopeContext, fn: () => T): T {
    return this.asyncLocalStorage.run(context, fn);
  }

  /**
   * Limpa o contexto atual
   */
  static clear(): void {
    this.asyncLocalStorage.disable();
  }
}
```

### 3. ScopeContextMiddleware

```typescript
// src/common/middleware/scope-context.middleware.ts
import { Injectable, NestMiddleware, UnauthorizedException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { RequestContextHolder } from '../services/request-context-holder.service';
import { ScopeType } from '../../enums/scope-type.enum';

@Injectable()
export class ScopeContextMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const user = req.user; // Extraído do JWT pelo AuthGuard
    
    if (!user) {
      throw new UnauthorizedException('Usuário não autenticado');
    }

    // Extrair contexto do usuário autenticado
    const context = {
      tipo: user.escopo as ScopeType,
      user_id: user.id,
      unidade_id: user.unidade_id
    };

    // Validar contexto
    this.validateContext(context);

    // Definir contexto para a requisição
    RequestContextHolder.set(context);
    
    next();
  }

  private validateContext(context: any): void {
    if (context.tipo === ScopeType.UNIDADE && !context.unidade_id) {
      throw new InvalidScopeContextException(
        'Escopo UNIDADE requer unidade_id'
      );
    }
    
    if (!context.user_id) {
      throw new InvalidScopeContextException(
        'Contexto requer user_id'
      );
    }
  }
}
```

### 4. ScopedRepository

```typescript
// src/common/repositories/scoped-repository.base.ts
import { Repository, FindManyOptions, FindOneOptions, SelectQueryBuilder } from 'typeorm';
import { RequestContextHolder } from '../services/request-context-holder.service';
import { ScopeType } from '../../enums/scope-type.enum';
import { IScopeContext } from '../interfaces/scope-context.interface';

/**
 * Repository base que aplica filtros de escopo automaticamente
 */
export class ScopedRepository<Entity> extends Repository<Entity> {
  
  /**
   * Aplica filtros de escopo às opções de busca
   */
  private applyScopeToFindOptions<T extends FindManyOptions<Entity> | FindOneOptions<Entity>>(
    options: T = {} as T
  ): T {
    const context = RequestContextHolder.get();
    
    // Se não há contexto, retorna opções sem modificação
    if (!context) {
      return options;
    }

    // Aplica filtro baseado no tipo de escopo
    switch (context.tipo) {
      case ScopeType.GLOBAL:
        // Sem filtros para escopo global
        return options;
        
      case ScopeType.UNIDADE:
        return {
          ...options,
          where: {
            ...options.where,
            unidade_id: context.unidade_id
          }
        };
        
      case ScopeType.PROPRIO:
        return {
          ...options,
          where: {
            ...options.where,
            criado_por: context.user_id
          }
        };
        
      default:
        return options;
    }
  }

  /**
   * Aplica filtros de escopo ao QueryBuilder
   */
  private applyScopeToQueryBuilder(
    queryBuilder: SelectQueryBuilder<Entity>,
    alias: string = 'entity'
  ): SelectQueryBuilder<Entity> {
    const context = RequestContextHolder.get();
    
    if (!context) {
      return queryBuilder;
    }

    switch (context.tipo) {
      case ScopeType.GLOBAL:
        return queryBuilder;
        
      case ScopeType.UNIDADE:
        return queryBuilder.andWhere(`${alias}.unidade_id = :unidade_id`, {
          unidade_id: context.unidade_id
        });
        
      case ScopeType.PROPRIO:
        return queryBuilder.andWhere(`${alias}.criado_por = :user_id`, {
          user_id: context.user_id
        });
        
      default:
        return queryBuilder;
    }
  }

  /**
   * Define campos de criação baseados no contexto
   */
  private setCreationFields(entity: Partial<Entity>): Partial<Entity> {
    const context = RequestContextHolder.get();
    
    if (!context) {
      return entity;
    }

    // Define criado_por se não estiver definido
    if (!entity['criado_por']) {
      entity['criado_por'] = context.user_id;
    }

    // Define unidade_id para escopo UNIDADE se não estiver definido
    if (context.tipo === ScopeType.UNIDADE && !entity['unidade_id']) {
      entity['unidade_id'] = context.unidade_id;
    }

    return entity;
  }

  // ========== MÉTODOS SOBRESCRITOS COM ESCOPO ==========

  async find(options?: FindManyOptions<Entity>): Promise<Entity[]> {
    const scopedOptions = this.applyScopeToFindOptions(options);
    return super.find(scopedOptions);
  }

  async findOne(options: FindOneOptions<Entity>): Promise<Entity | null> {
    const scopedOptions = this.applyScopeToFindOptions(options);
    return super.findOne(scopedOptions);
  }

  async findOneBy(where: any): Promise<Entity | null> {
    return this.findOne({ where });
  }

  async findBy(where: any): Promise<Entity[]> {
    return this.find({ where });
  }

  async findAndCount(options?: FindManyOptions<Entity>): Promise<[Entity[], number]> {
    const scopedOptions = this.applyScopeToFindOptions(options);
    return super.findAndCount(scopedOptions);
  }

  async count(options?: FindManyOptions<Entity>): Promise<number> {
    const scopedOptions = this.applyScopeToFindOptions(options);
    return super.count(scopedOptions);
  }

  async save<T extends Entity>(entity: T): Promise<T> {
    const entityWithFields = this.setCreationFields(entity) as T;
    return super.save(entityWithFields);
  }

  async save<T extends Entity>(entities: T[]): Promise<T[]> {
    const entitiesWithFields = entities.map(entity => 
      this.setCreationFields(entity) as T
    );
    return super.save(entitiesWithFields);
  }

  // ========== MÉTODOS UTILITÁRIOS ==========

  /**
   * Retorna QueryBuilder com escopo aplicado
   */
  getScopedQueryBuilder(alias?: string): SelectQueryBuilder<Entity> {
    const queryBuilder = this.createQueryBuilder(alias);
    return this.applyScopeToQueryBuilder(queryBuilder, alias);
  }

  /**
   * Métodos sem escopo para casos especiais
   */
  async findAllGlobal(options?: FindManyOptions<Entity>): Promise<Entity[]> {
    return super.find(options);
  }

  async findOneGlobal(options: FindOneOptions<Entity>): Promise<Entity | null> {
    return super.findOne(options);
  }

  async countGlobal(options?: FindManyOptions<Entity>): Promise<number> {
    return super.count(options);
  }

  /**
   * Obtém contexto atual
   */
  getCurrentContext(): IScopeContext | undefined {
    return RequestContextHolder.get();
  }

  /**
   * Verifica se há contexto ativo
   */
  hasActiveContext(): boolean {
    return !!RequestContextHolder.get();
  }
}
```

### 5. Decorator @NoScope (Opcional)

```typescript
// src/common/decorators/no-scope.decorator.ts
import { SetMetadata } from '@nestjs/common';

export const NO_SCOPE_KEY = 'no_scope';
export const NoScope = () => SetMetadata(NO_SCOPE_KEY, true);
```

### 6. Provider Factory

```typescript
// src/common/providers/scoped-repository.provider.ts
import { Provider } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { ScopedRepository } from '../repositories/scoped-repository.base';

/**
 * Cria provider para ScopedRepository
 */
export function createScopedRepositoryProvider<Entity>(
  entity: new () => Entity
): Provider {
  return {
    provide: `SCOPED_${getRepositoryToken(entity)}`,
    useFactory: (dataSource: DataSource) => {
      const baseRepository = dataSource.getRepository(entity);
      
      // Cria instância do ScopedRepository com o mesmo manager e metadata
      const scopedRepository = new ScopedRepository<Entity>();
      Object.setPrototypeOf(scopedRepository, ScopedRepository.prototype);
      
      // Copia propriedades do repository base
      Object.assign(scopedRepository, baseRepository);
      
      return scopedRepository;
    },
    inject: [DataSource]
  };
}

/**
 * Decorator para injetar ScopedRepository
 */
export const InjectScopedRepository = (entity: new () => any) => {
  return (target: any, propertyKey: string | symbol | undefined, parameterIndex: number) => {
    const token = `SCOPED_${getRepositoryToken(entity)}`;
    return Inject(token)(target, propertyKey, parameterIndex);
  };
};
```

---

## Configuração e Uso

### 1. Configuração Global

```typescript
// src/app.module.ts
import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { ScopeContextMiddleware } from './common/middleware/scope-context.middleware';
import { RequestContextHolder } from './common/services/request-context-holder.service';

@Module({
  providers: [
    RequestContextHolder,
    // outros providers...
  ],
  // outros módulos...
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(ScopeContextMiddleware)
      .exclude(
        { path: 'auth/login', method: RequestMethod.POST },
        { path: 'health', method: RequestMethod.GET },
        { path: 'docs', method: RequestMethod.GET }
      )
      .forRoutes('*');
  }
}
```

### 2. Configuração do Módulo

```typescript
// src/modules/cidadao/cidadao.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Cidadao } from './entities/cidadao.entity';
import { CidadaoService } from './services/cidadao.service';
import { CidadaoController } from './controllers/cidadao.controller';
import { createScopedRepositoryProvider } from '../../common/providers/scoped-repository.provider';

@Module({
  imports: [TypeOrmModule.forFeature([Cidadao])],
  providers: [
    CidadaoService,
    createScopedRepositoryProvider(Cidadao), // Provider do ScopedRepository
  ],
  controllers: [CidadaoController],
  exports: [CidadaoService]
})
export class CidadaoModule {}
```

### 3. Service Atualizado

```typescript
// src/modules/cidadao/services/cidadao.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { ScopedRepository } from '../../../common/repositories/scoped-repository.base';
import { InjectScopedRepository } from '../../../common/providers/scoped-repository.provider';
import { Cidadao } from '../entities/cidadao.entity';
import { CreateCidadaoDto, UpdateCidadaoDto } from '../dtos';

@Injectable()
export class CidadaoService {
  constructor(
    @InjectScopedRepository(Cidadao)
    private cidadaoRepository: ScopedRepository<Cidadao>
  ) {}

  /**
   * Lista todos os cidadãos (com escopo aplicado automaticamente)
   */
  async findAll(): Promise<Cidadao[]> {
    return this.cidadaoRepository.find({
      order: { nome: 'ASC' }
    });
  }

  /**
   * Busca cidadão por ID (com escopo aplicado automaticamente)
   */
  async findById(id: string): Promise<Cidadao> {
    const cidadao = await this.cidadaoRepository.findOne({
      where: { id },
      relations: ['beneficios', 'documentos']
    });

    if (!cidadao) {
      throw new NotFoundException('Cidadão não encontrado');
    }

    return cidadao;
  }

  /**
   * Cria novo cidadão (campos de escopo definidos automaticamente)
   */
  async create(createDto: CreateCidadaoDto): Promise<Cidadao> {
    const cidadao = this.cidadaoRepository.create(createDto);
    return this.cidadaoRepository.save(cidadao);
  }

  /**
   * Atualiza cidadão (validação de escopo automática)
   */
  async update(id: string, updateDto: UpdateCidadaoDto): Promise<Cidadao> {
    const cidadao = await this.findById(id); // Já valida escopo
    Object.assign(cidadao, updateDto);
    return this.cidadaoRepository.save(cidadao);
  }

  /**
   * Remove cidadão (validação de escopo automática)
   */
  async delete(id: string): Promise<void> {
    const cidadao = await this.findById(id); // Já valida escopo
    await this.cidadaoRepository.remove(cidadao);
  }

  /**
   * Query customizada com escopo
   */
  async findWithBeneficios(): Promise<Cidadao[]> {
    return this.cidadaoRepository
      .getScopedQueryBuilder('cidadao') // QueryBuilder com escopo
      .leftJoinAndSelect('cidadao.beneficios', 'beneficio')
      .orderBy('cidadao.nome', 'ASC')
      .getMany();
  }

  /**
   * Busca sem escopo para casos especiais (usar com cuidado)
   */
  @NoScope()
  async findAllGlobal(): Promise<Cidadao[]> {
    return this.cidadaoRepository.findAllGlobal();
  }

  /**
   * Estatísticas com escopo aplicado
   */
  async getStats(): Promise<{ total: number; ativos: number }> {
    const total = await this.cidadaoRepository.count();
    const ativos = await this.cidadaoRepository.count({
      where: { ativo: true }
    });

    return { total, ativos };
  }
}
```

### 4. Controller (Sem Modificações)

```typescript
// src/modules/cidadao/controllers/cidadao.controller.ts
import { Controller, Get, Post, Patch, Delete, Param, Body } from '@nestjs/common';
import { CidadaoService } from '../services/cidadao.service';
import { CreateCidadaoDto, UpdateCidadaoDto } from '../dtos';
import { RequirePermission } from '../../../auth/decorators/require-permission.decorator';

@Controller('cidadaos')
export class CidadaoController {
  constructor(private readonly cidadaoService: CidadaoService) {}

  @Get()
  @RequirePermission('cidadao.listar')
  async findAll() {
    return this.cidadaoService.findAll();
  }

  @Get(':id')
  @RequirePermission('cidadao.visualizar')
  async findOne(@Param('id') id: string) {
    return this.cidadaoService.findById(id);
  }

  @Post()
  @RequirePermission('cidadao.criar')
  async create(@Body() createDto: CreateCidadaoDto) {
    return this.cidadaoService.create(createDto);
  }

  @Patch(':id')
  @RequirePermission('cidadao.editar')
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateCidadaoDto
  ) {
    return this.cidadaoService.update(id, updateDto);
  }

  @Delete(':id')
  @RequirePermission('cidadao.excluir')
  async delete(@Param('id') id: string) {
    await this.cidadaoService.delete(id);
    return { message: 'Cidadão excluído com sucesso' };
  }

  @Get('stats')
  @RequirePermission('cidadao.estatisticas')
  async getStats() {
    return this.cidadaoService.getStats();
  }
}
```

---

## Casos de Uso Avançados

### 1. Queries Complexas com Múltiplas Entidades

```typescript
// Service com relacionamentos
async findCidadaosComBeneficiosAtivos(): Promise<Cidadao[]> {
  return this.cidadaoRepository
    .getScopedQueryBuilder('cidadao')
    .innerJoinAndSelect('cidadao.beneficios', 'beneficio')
    .innerJoin('beneficio.pagamentos', 'pagamento')
    .where('beneficio.ativo = :ativo', { ativo: true })
    .andWhere('pagamento.status = :status', { status: 'PAGO' })
    .orderBy('cidadao.nome', 'ASC')
    .getMany();
}
```

### 2. Agregações com Escopo

```typescript
async getEstatisticasPorUnidade(): Promise<any[]> {
  return this.cidadaoRepository
    .getScopedQueryBuilder('cidadao')
    .select('cidadao.unidade_id', 'unidade_id')
    .addSelect('COUNT(cidadao.id)', 'total_cidadaos')
    .addSelect('COUNT(CASE WHEN cidadao.ativo = true THEN 1 END)', 'cidadaos_ativos')
    .groupBy('cidadao.unidade_id')
    .getRawMany();
}
```

### 3. Transações com Escopo

```typescript
async transferirCidadao(cidadaoId: string, novaUnidadeId: string): Promise<void> {
  await this.dataSource.transaction(async manager => {
    // Buscar cidadão com escopo
    const cidadao = await this.findById(cidadaoId);
    
    // Atualizar unidade
    cidadao.unidade_id = novaUnidadeId;
    
    // Salvar com contexto preservado
    await manager.save(cidadao);
    
    // Log da transferência
    await manager.save(LogTransferencia, {
      cidadao_id: cidadaoId,
      unidade_origem: cidadao.unidade_id,
      unidade_destino: novaUnidadeId,
      criado_por: RequestContextHolder.getRequired().user_id
    });
  });
}
```

---

## Sistema de Testes

### 1. Testes Unitários

```typescript
// src/common/repositories/__tests__/scoped-repository.spec.ts
import { Test } from '@nestjs/testing';
import { ScopedRepository } from '../scoped-repository.base';
import { RequestContextHolder } from '../../services/request-context-holder.service';
import { ScopeType } from '../../../enums/scope-type.enum';

describe('ScopedRepository', () => {
  let repository: ScopedRepository<any>;
  
  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [ScopedRepository]
    }).compile();
    
    repository = module.get<ScopedRepository<any>>(ScopedRepository);
  });
  
  afterEach(() => {
    RequestContextHolder.clear();
  });
  
  describe('find with scope', () => {
    it('should apply UNIDADE scope filter', async () => {
      // Arrange
      const context = {
        tipo: ScopeType.UNIDADE,
        user_id: 'user-1',
        unidade_id: 'unidade-1'
      };
      
      RequestContextHolder.set(context);
      
      const findSpy = jest.spyOn(repository, 'find').mockResolvedValue([]);
      
      // Act
      await repository.find({ where: { nome: 'João' } });
      
      // Assert
      expect(findSpy).toHaveBeenCalledWith({
        where: {
          nome: 'João',
          unidade_id: 'unidade-1'
        }
      });
    });
    
    it('should not apply filter for GLOBAL scope', async () => {
      // Arrange
      const context = {
        tipo: ScopeType.GLOBAL,
        user_id: 'admin-1'
      };
      
      RequestContextHolder.set(context);
      
      const findSpy = jest.spyOn(repository, 'find').mockResolvedValue([]);
      
      // Act
      await repository.find({ where: { nome: 'João' } });
      
      // Assert
      expect(findSpy).toHaveBeenCalledWith({
        where: { nome: 'João' }
      });
    });
  });
  
  describe('save with scope', () => {
    it('should set creation fields for UNIDADE scope', async () => {
      // Arrange
      const context = {
        tipo: ScopeType.UNIDADE,
        user_id: 'user-1',
        unidade_id: 'unidade-1'
      };
      
      RequestContextHolder.set(context);
      
      const saveSpy = jest.spyOn(repository, 'save').mockResolvedValue({} as any);
      
      const entity = { nome: 'João' };
      
      // Act
      await repository.save(entity);
      
      // Assert
      expect(saveSpy).toHaveBeenCalledWith({
        nome: 'João',
        criado_por: 'user-1',
        unidade_id: 'unidade-1'
      });
    });
  });
});
```

### 2. Testes de Integração

```typescript
// src/modules/cidadao/__tests__/cidadao.service.integration.spec.ts
import { Test } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CidadaoService } from '../services/cidadao.service';
import { Cidadao } from '../entities/cidadao.entity';
import { RequestContextHolder } from '../../../common/services/request-context-holder.service';
import { ScopeType } from '../../../enums/scope-type.enum';

describe('CidadaoService Integration', () => {
  let service: CidadaoService;
  
  beforeEach(async () => {
    const module = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: 'sqlite',
          database: ':memory:',
          entities: [Cidadao],
          synchronize: true
        }),
        TypeOrmModule.forFeature([Cidadao])
      ],
      providers: [
        CidadaoService,
        createScopedRepositoryProvider(Cidadao)
      ]
    }).compile();
    
    service = module.get<CidadaoService>(CidadaoService);
  });
  
  afterEach(() => {
    RequestContextHolder.clear();
  });
  
  it('should isolate data by unidade', async () => {
    // Arrange - Criar dados de teste
    const contextUnidadeA = {
      tipo: ScopeType.UNIDADE,
      user_id: 'user-a',
      unidade_id: 'unidade-a'
    };
    
    const contextUnidadeB = {
      tipo: ScopeType.UNIDADE,
      user_id: 'user-b',
      unidade_id: 'unidade-b'
    };
    
    // Criar cidadão na unidade A
    RequestContextHolder.set(contextUnidadeA);
    await service.create({ nome: 'João da Unidade A', cpf: '11111111111' });
    
    // Criar cidadão na unidade B
    RequestContextHolder.set(contextUnidadeB);
    await service.create({ nome: 'Maria da Unidade B', cpf: '22222222222' });
    
    // Act & Assert - Usuário A só vê dados da unidade A
    RequestContextHolder.set(contextUnidadeA);
    const cidadaosUnidadeA = await service.findAll();
    expect(cidadaosUnidadeA).toHaveLength(1);
    expect(cidadaosUnidadeA[0].nome).toBe('João da Unidade A');
    
    // Usuário B só vê dados da unidade B
    RequestContextHolder.set(contextUnidadeB);
    const cidadaosUnidadeB = await service.findAll();
    expect(cidadaosUnidadeB).toHaveLength(1);
    expect(cidadaosUnidadeB[0].nome).toBe('Maria da Unidade B');
  });
});
```

### 3. Testes E2E

```typescript
// test/cidadao.e2e-spec.ts
import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { ScopeType } from '../src/enums/scope-type.enum';

describe('Cidadao E2E', () => {
  let app: INestApplication;
  let jwtService: JwtService;
  
  beforeEach(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule]
    }).compile();
    
    app = moduleFixture.createNestApplication();
    jwtService = moduleFixture.get<JwtService>(JwtService);
    
    await app.init();
  });
  
  it('should isolate cidadaos by unidade', async () => {
    // Tokens para diferentes unidades
    const tokenUnidadeA = jwtService.sign({
      sub: 'user-a',
      unidade_id: 'unidade-a',
      escopo: ScopeType.UNIDADE,
      permissions: ['cidadao.listar', 'cidadao.criar']
    });
    
    const tokenUnidadeB = jwtService.sign({
      sub: 'user-b',
      unidade_id: 'unidade-b',
      escopo: ScopeType.UNIDADE,
      permissions: ['cidadao.listar', 'cidadao.criar']
    });
    
    // Criar cidadão na unidade A
    await request(app.getHttpServer())
      .post('/cidadaos')
      .set('Authorization', `Bearer ${tokenUnidadeA}`)
      .send({ nome: 'João', cpf: '11111111111' })
      .expect(201);
    
    // Criar cidadão na unidade B
    await request(app.getHttpServer())
      .post('/cidadaos')
      .set('Authorization', `Bearer ${tokenUnidadeB}`)
      .send({ nome: 'Maria', cpf: '22222222222' })
      .expect(201);
    
    // Usuário A só vê cidadão da unidade A
    const responseA = await request(app.getHttpServer())
      .get('/cidadaos')
      .set('Authorization', `Bearer ${tokenUnidadeA}`)
      .expect(200);
    
    expect(responseA.body).toHaveLength(1);
    expect(responseA.body[0].nome).toBe('João');
    
    // Usuário B só vê cidadão da unidade B
    const responseB = await request(app.getHttpServer())
      .get('/cidadaos')
      .set('Authorization', `Bearer ${tokenUnidadeB}`)
      .expect(200);
    
    expect(responseB.body).toHaveLength(1);
    expect(responseB.body[0].nome).toBe('Maria');
  });
});
```

---

## Logging e Monitoramento

### 1. Logger de Escopo

```typescript
// src/common/services/scope-logger.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { IScopeContext } from '../interfaces/scope-context.interface';

@Injectable()
export class ScopeLogger {
  private readonly logger = new Logger(ScopeLogger.name);
  
  logRepositoryAccess(
    operation: string,
    entity: string,
    context: IScopeContext,
    resultCount?: number
  ) {
    this.logger.log({
      operation,
      entity,
      scope_type: context.tipo,
      unidade_id: context.unidade_id,
      user_id: context.user_id,
      result_count: resultCount,
      timestamp: new Date().toISOString()
    });
  }
  
  logScopeViolation(
    operation: string,
    entity: string,
    context: IScopeContext,
    attemptedId: string
  ) {
    this.logger.warn({
      operation,
      entity,
      scope_type: context.tipo,
      unidade_id: context.unidade_id,
      user_id: context.user_id,
      attempted_id: attemptedId,
      violation: true,
      timestamp: new Date().toISOString()
    });
  }
}
```

### 2. Interceptor de Logging

```typescript
// src/common/interceptors/scope-logging.interceptor.ts
import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { ScopeLogger } from '../services/scope-logger.service';
import { RequestContextHolder } from '../services/request-context-holder.service';
import { ScopeViolationException } from '../exceptions/scope.exceptions';

@Injectable()
export class ScopeLoggingInterceptor implements NestInterceptor {
  constructor(private scopeLogger: ScopeLogger) {}
  
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const scopeContext = RequestContextHolder.get();
    const controllerName = context.getClass().name;
    const methodName = context.getHandler().name;
    
    return next.handle().pipe(
      tap(result => {
        if (scopeContext) {
          const resultCount = Array.isArray(result) ? result.length : 1;
          this.scopeLogger.logRepositoryAccess(
            methodName,
            controllerName,
            scopeContext,
            resultCount
          );
        }
      }),
      catchError(error => {
        if (error instanceof ScopeViolationException && scopeContext) {
          this.scopeLogger.logScopeViolation(
            methodName,
            controllerName,
            scopeContext,
            request.params?.id
          );
        }
        throw error;
      })
    );
  }
}
```

---

## Migração da Estratégia Anterior

### Componentes a Remover

1. **ScopeHelper** complexo com múltiplos métodos
2. **ScopedService** base com lógica manual
3. **@ScopeContext** decorator nos controllers
4. **ScopeContextMiddleware** complexo
5. Aplicação manual de escopo em cada método de service
6. Validações manuais de escopo

### Componentes a Manter/Adaptar

1. **Enum ScopeType** (manter)
2. **Interface IScopeContext** (simplificar)
3. **Exceções de escopo** (manter)
4. **Campo escopo na entidade Role** (manter)
5. **JWT com escopo** (manter)

### Plano de Migração

1. **Fase 1**: Implementar novos componentes em paralelo
2. **Fase 2**: Migrar um módulo por vez
3. **Fase 3**: Remover componentes antigos
4. **Fase 4**: Testes e validação

---

## Vantagens da Nova Estratégia

### Simplicidade
- **~100 linhas** de código core vs ~2000 da estratégia anterior
- **Zero modificações** em controllers
- **Mudança mínima** em services (apenas injeção)
- **Lógica centralizada** em uma classe

### Transparência
- Desenvolvedores sabem exatamente o que acontece
- Debugging simples e direto
- Logs claros e compreensíveis
- Comportamento previsível

### Flexibilidade
- Métodos sem escopo para casos especiais
- QueryBuilder com escopo para queries complexas
- Decorator @NoScope para exceções
- Suporte a transações

### Testabilidade
- Fácil de mockar
- Testes unitários simples
- Isolamento completo
- Cobertura de testes alta

### Performance
- Filtros aplicados no nível SQL
- Sem overhead de middleware complexo
- AsyncLocalStorage eficiente
- Queries otimizadas

---

## Conclusão

A estratégia **ScopedRepository** oferece uma solução elegante, simples e eficaz para controle de escopo de dados, eliminando a complexidade desnecessária da abordagem anterior enquanto mantém todas as funcionalidades essenciais.

**Benefícios Principais:**
- ✅ Máxima simplicidade (~100 linhas vs ~2000)
- ✅ Zero modificações em controllers
- ✅ Transparência total para desenvolvedores
- ✅ Testabilidade máxima
- ✅ Database agnostic
- ✅ Performance otimizada
- ✅ Flexibilidade para casos especiais

**Implementação Estimada:** 2-3 dias vs semanas da abordagem anterior.

Esta estratégia representa o equilíbrio ideal entre **simplicidade**, **funcionalidade** e **manutenibilidade** para o controle de escopo de dados no sistema.