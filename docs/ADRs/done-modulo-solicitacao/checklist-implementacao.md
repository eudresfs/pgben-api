# Checklist de Implementação para o Módulo de Solicitação

## 1. Implementação do Método `logStatusChange()`

- [ ] Adicionar propriedades temporárias na entidade `Solicitacao`:
  ```typescript
  @Column({ select: false, insert: false, update: false })
  private statusAnterior: StatusSolicitacao;

  @Column({ select: false, insert: false, update: false })
  private usuarioAlteracao: string;

  @Column({ select: false, insert: false, update: false })
  private observacaoAlteracao: string;

  @Column({ select: false, insert: false, update: false })
  private ipUsuario: string;
  ```

- [ ] Implementar método `prepararAlteracaoStatus`:
  ```typescript
  prepararAlteracaoStatus(novoStatus: StatusSolicitacao, usuario: string, observacao: string, ip: string) {
    this.statusAnterior = this.status;
    this.status = novoStatus;
    this.usuarioAlteracao = usuario;
    this.observacaoAlteracao = observacao;
    this.ipUsuario = ip;
  }
  ```

- [ ] Implementar método `logStatusChange` com decorator `@AfterUpdate()`:
  ```typescript
  @AfterUpdate()
  async logStatusChange() {
    // Verificar se houve mudança de status
    if (this.statusAnterior !== this.status) {
      const historicoRepository = getRepository(HistoricoSolicitacao);
      
      await historicoRepository.save({
        solicitacao_id: this.id,
        status_anterior: this.statusAnterior,
        status_atual: this.status,
        usuario_id: this.usuarioAlteracao,
        observacao: this.observacaoAlteracao,
        dados_alterados: {
          status: {
            de: this.statusAnterior,
            para: this.status
          }
        },
        ip_usuario: this.ipUsuario
      });
    }
  }
  ```

- [ ] Atualizar o serviço `SolicitacaoService` para usar o método `prepararAlteracaoStatus`:
  ```typescript
  async alterarStatus(id: string, novoStatus: StatusSolicitacao, usuarioId: string, observacao: string, ipUsuario: string) {
    const solicitacao = await this.solicitacaoRepository.findOne({ where: { id } });
    if (!solicitacao) {
      throw new NotFoundException(`Solicitação com ID ${id} não encontrada`);
    }
    
    solicitacao.prepararAlteracaoStatus(novoStatus, usuarioId, observacao, ipUsuario);
    return this.solicitacaoRepository.save(solicitacao);
  }
  ```

## 2. Validação de Esquema para Dados Complementares

- [ ] Definir interfaces para esquemas de dados complementares:
  ```typescript
  // src/modules/solicitacao/interfaces/dados-complementares.interface.ts
  export interface DadosComplementaresCestaBasica {
    rendaFamiliar: number;
    numeroMembros: number;
    situacaoMoradia: string;
    observacoes?: string;
  }

  export interface DadosComplementaresAuxilioFuneral {
    nomeFalecido: string;
    dataFalecimento: Date;
    grauParentesco: string;
    localSepultamento: string;
    observacoes?: string;
  }

  // Adicionar mais interfaces conforme necessário
  ```

- [ ] Criar validador personalizado:
  ```typescript
  // src/modules/solicitacao/validators/dados-complementares.validator.ts
  import { ValidatorConstraint, ValidatorConstraintInterface, ValidationArguments } from 'class-validator';
  import * as Joi from 'joi';
  import { TipoBeneficio } from '../../beneficio/entities/tipo-beneficio.entity';

  @ValidatorConstraint({ name: 'dadosComplementaresValidator', async: true })
  export class DadosComplementaresValidator implements ValidatorConstraintInterface {
    private schemas = {
      'CESTA_BASICA': Joi.object({
        rendaFamiliar: Joi.number().required(),
        numeroMembros: Joi.number().integer().required(),
        situacaoMoradia: Joi.string().required(),
        observacoes: Joi.string().optional()
      }),
      'AUXILIO_FUNERAL': Joi.object({
        nomeFalecido: Joi.string().required(),
        dataFalecimento: Joi.date().required(),
        grauParentesco: Joi.string().required(),
        localSepultamento: Joi.string().required(),
        observacoes: Joi.string().optional()
      })
      // Adicionar mais esquemas conforme necessário
    };

    async validate(dados: any, args: ValidationArguments) {
      const { tipoBeneficio } = args.object as any;
      if (!tipoBeneficio || !tipoBeneficio.codigo) {
        return false;
      }

      const schema = this.schemas[tipoBeneficio.codigo];
      if (!schema) {
        return true; // Se não houver esquema definido, consideramos válido
      }

      const { error } = schema.validate(dados);
      return !error;
    }

    defaultMessage(args: ValidationArguments) {
      return 'Dados complementares inválidos para o tipo de benefício';
    }
  }
  ```

- [ ] Atualizar DTO para usar o validador:
  ```typescript
  // src/modules/solicitacao/dto/create-solicitacao.dto.ts
  import { Validate } from 'class-validator';
  import { DadosComplementaresValidator } from '../validators/dados-complementares.validator';

  export class CreateSolicitacaoDto {
    // Outros campos...

    @Validate(DadosComplementaresValidator)
    dados_complementares: any;
  }
  ```

## 3. Otimização de Estratégias de Carregamento

- [ ] Revisar e atualizar relacionamentos na entidade `Solicitacao`:
  ```typescript
  @ManyToOne(() => Cidadao, { eager: false })
  @JoinColumn({ name: 'cidadao_id' })
  cidadao: Cidadao;

  @ManyToOne(() => TipoBeneficio, { eager: false })
  @JoinColumn({ name: 'tipo_beneficio_id' })
  tipoBeneficio: TipoBeneficio;

  @ManyToOne(() => Usuario, { eager: false })
  @JoinColumn({ name: 'usuario_id' })
  usuario: Usuario;

  @OneToMany(() => HistoricoSolicitacao, historico => historico.solicitacao, { eager: false })
  historicos: HistoricoSolicitacao[];

  @OneToMany(() => Documento, documento => documento.solicitacao, { eager: false })
  documentos: Documento[];
  ```

- [ ] Implementar métodos de consulta otimizados no serviço:
  ```typescript
  async findOne(id: string, options?: { relations?: string[] }) {
    return this.solicitacaoRepository.findOne({
      where: { id },
      relations: options?.relations || []
    });
  }

  async findOneWithCidadao(id: string) {
    return this.solicitacaoRepository.findOne({
      where: { id },
      relations: ['cidadao']
    });
  }

  async findOneWithAllRelations(id: string) {
    return this.solicitacaoRepository.findOne({
      where: { id },
      relations: ['cidadao', 'tipoBeneficio', 'usuario', 'historicos', 'documentos']
    });
  }
  ```

- [ ] Implementar seleção específica de campos:
  ```typescript
  async findAllBasic(options?: { page?: number, limit?: number }) {
    const page = options?.page || 1;
    const limit = options?.limit || 10;
    const skip = (page - 1) * limit;

    return this.solicitacaoRepository.createQueryBuilder('solicitacao')
      .select([
        'solicitacao.id',
        'solicitacao.protocolo',
        'solicitacao.status',
        'solicitacao.created_at',
        'cidadao.id',
        'cidadao.nome',
        'cidadao.cpf'
      ])
      .leftJoin('solicitacao.cidadao', 'cidadao')
      .skip(skip)
      .take(limit)
      .getMany();
  }
  ```

## 4. Implementação de Transações

- [ ] Injetar `Connection` no serviço:
  ```typescript
  constructor(
    @InjectRepository(Solicitacao)
    private solicitacaoRepository: Repository<Solicitacao>,
    private connection: Connection
  ) {}
  ```

- [ ] Implementar método de criação com transação:
  ```typescript
  async create(createSolicitacaoDto: CreateSolicitacaoDto, usuarioId: string) {
    return this.connection.transaction(async manager => {
      // Criar solicitação
      const solicitacao = manager.create(Solicitacao, {
        ...createSolicitacaoDto,
        usuario_id: usuarioId,
        status: StatusSolicitacao.PENDENTE
      });
      
      const savedSolicitacao = await manager.save(solicitacao);
      
      // Criar histórico inicial
      const historico = manager.create(HistoricoSolicitacao, {
        solicitacao_id: savedSolicitacao.id,
        status_atual: StatusSolicitacao.PENDENTE,
        usuario_id: usuarioId,
        observacao: 'Solicitação criada'
      });
      
      await manager.save(historico);
      
      return savedSolicitacao;
    });
  }
  ```

- [ ] Implementar método de alteração de status com transação:
  ```typescript
  async alterarStatus(id: string, novoStatus: StatusSolicitacao, usuarioId: string, observacao: string, ipUsuario: string) {
    return this.connection.transaction(async manager => {
      const solicitacao = await manager.findOne(Solicitacao, { where: { id } });
      if (!solicitacao) {
        throw new NotFoundException(`Solicitação com ID ${id} não encontrada`);
      }
      
      solicitacao.prepararAlteracaoStatus(novoStatus, usuarioId, observacao, ipUsuario);
      return manager.save(solicitacao);
    });
  }
  ```

## 5. Implementação de Cache

- [ ] Configurar o módulo de cache:
  ```typescript
  // src/app.module.ts
  import { CacheModule } from '@nestjs/common';
  
  @Module({
    imports: [
      // Outros módulos...
      CacheModule.register({
        ttl: 60 * 60, // 1 hora
        max: 100, // máximo de 100 itens no cache
      }),
    ],
  })
  export class AppModule {}
  ```

- [ ] Injetar `CacheManager` no serviço:
  ```typescript
  import { CACHE_MANAGER, Inject } from '@nestjs/common';
  import { Cache } from 'cache-manager';

  constructor(
    @InjectRepository(Solicitacao)
    private solicitacaoRepository: Repository<Solicitacao>,
    private connection: Connection,
    @Inject(CACHE_MANAGER) private cacheManager: Cache
  ) {}
  ```

- [ ] Implementar cache em consultas frequentes:
  ```typescript
  async findOne(id: string, options?: { relations?: string[], useCache?: boolean }) {
    if (options?.useCache) {
      const cacheKey = `solicitacao_${id}_${options.relations?.join('_') || 'none'}`;
      const cachedData = await this.cacheManager.get(cacheKey);
      if (cachedData) {
        return cachedData;
      }
      
      const data = await this.solicitacaoRepository.findOne({
        where: { id },
        relations: options?.relations || []
      });
      
      if (data) {
        await this.cacheManager.set(cacheKey, data, { ttl: 3600 });
      }
      
      return data;
    }
    
    return this.solicitacaoRepository.findOne({
      where: { id },
      relations: options?.relations || []
    });
  }
  ```

- [ ] Implementar invalidação de cache:
  ```typescript
  async invalidateCache(id: string) {
    const keys = [
      `solicitacao_${id}_none`,
      `solicitacao_${id}_cidadao`,
      `solicitacao_${id}_tipoBeneficio`,
      // Outros padrões de chave conforme necessário
    ];
    
    for (const key of keys) {
      await this.cacheManager.del(key);
    }
  }
  ```

- [ ] Atualizar métodos de modificação para invalidar cache:
  ```typescript
  async update(id: string, updateSolicitacaoDto: UpdateSolicitacaoDto) {
    const result = await this.solicitacaoRepository.update(id, updateSolicitacaoDto);
    await this.invalidateCache(id);
    return result;
  }
  ```

## 6. Melhoria das Validações

- [ ] Atualizar validações no DTO de criação:
  ```typescript
  // src/modules/solicitacao/dto/create-solicitacao.dto.ts
  import { IsNotEmpty, IsUUID, IsEnum, IsOptional, ValidateNested, IsObject } from 'class-validator';
  import { Type } from 'class-transformer';
  
  export class CreateSolicitacaoDto {
    @IsNotEmpty({ message: 'Cidadão é obrigatório' })
    @IsUUID(4, { message: 'ID de cidadão inválido' })
    cidadao_id: string;
    
    @IsNotEmpty({ message: 'Tipo de benefício é obrigatório' })
    @IsUUID(4, { message: 'ID de tipo de benefício inválido' })
    tipo_beneficio_id: string;
    
    @IsOptional()
    @IsObject({ message: 'Dados complementares devem ser um objeto' })
    @Validate(DadosComplementaresValidator)
    dados_complementares: any;
    
    // Outros campos...
  }
  ```

- [ ] Implementar validador de transições de status:
  ```typescript
  // src/modules/solicitacao/validators/status-transition.validator.ts
  import { ValidatorConstraint, ValidatorConstraintInterface, ValidationArguments } from 'class-validator';
  import { StatusSolicitacao } from '../entities/solicitacao.entity';
  
  @ValidatorConstraint({ name: 'statusTransitionValidator', async: true })
  export class StatusTransitionValidator implements ValidatorConstraintInterface {
    private validTransitions = {
      [StatusSolicitacao.PENDENTE]: [StatusSolicitacao.EM_ANALISE, StatusSolicitacao.CANCELADA],
      [StatusSolicitacao.EM_ANALISE]: [StatusSolicitacao.APROVADA, StatusSolicitacao.REJEITADA, StatusSolicitacao.PENDENTE_DOCUMENTACAO],
      [StatusSolicitacao.PENDENTE_DOCUMENTACAO]: [StatusSolicitacao.EM_ANALISE, StatusSolicitacao.CANCELADA],
      [StatusSolicitacao.APROVADA]: [StatusSolicitacao.EM_ATENDIMENTO, StatusSolicitacao.CANCELADA],
      [StatusSolicitacao.EM_ATENDIMENTO]: [StatusSolicitacao.CONCLUIDA, StatusSolicitacao.CANCELADA],
      [StatusSolicitacao.REJEITADA]: [StatusSolicitacao.EM_ANALISE, StatusSolicitacao.CANCELADA],
      [StatusSolicitacao.CONCLUIDA]: [],
      [StatusSolicitacao.CANCELADA]: []
    };
    
    async validate(novoStatus: StatusSolicitacao, args: ValidationArguments) {
      const { statusAtual } = args.object as any;
      if (!statusAtual) {
        return false;
      }
      
      return this.validTransitions[statusAtual].includes(novoStatus);
    }
    
    defaultMessage(args: ValidationArguments) {
      const { statusAtual } = args.object as any;
      const validTransitions = this.validTransitions[statusAtual].join(', ');
      return `Transição de status inválida. De ${statusAtual} só é possível ir para: ${validTransitions}`;
    }
  }
  ```

- [ ] Atualizar DTO de alteração de status:
  ```typescript
  // src/modules/solicitacao/dto/update-status.dto.ts
  import { IsNotEmpty, IsEnum, Validate } from 'class-validator';
  import { StatusSolicitacao } from '../entities/solicitacao.entity';
  import { StatusTransitionValidator } from '../validators/status-transition.validator';
  
  export class UpdateStatusDto {
    @IsNotEmpty({ message: 'Status atual é obrigatório' })
    @IsEnum(StatusSolicitacao, { message: 'Status atual inválido' })
    statusAtual: StatusSolicitacao;
    
    @IsNotEmpty({ message: 'Novo status é obrigatório' })
    @IsEnum(StatusSolicitacao, { message: 'Novo status inválido' })
    @Validate(StatusTransitionValidator)
    novoStatus: StatusSolicitacao;
    
    @IsNotEmpty({ message: 'Observação é obrigatória' })
    observacao: string;
  }
  ```

## 7. Documentação Swagger

- [ ] Adicionar decoradores Swagger no controller:
  ```typescript
  // src/modules/solicitacao/controllers/solicitacao.controller.ts
  import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBody, ApiQuery } from '@nestjs/swagger';
  
  @ApiTags('Solicitações')
  @Controller('solicitacoes')
  export class SolicitacaoController {
    @Post()
    @ApiOperation({ summary: 'Criar nova solicitação', description: 'Cria uma nova solicitação de benefício' })
    @ApiBody({ type: CreateSolicitacaoDto })
    @ApiResponse({ status: 201, description: 'Solicitação criada com sucesso', type: SolicitacaoResponseDto })
    @ApiResponse({ status: 400, description: 'Dados inválidos' })
    @ApiResponse({ status: 401, description: 'Não autorizado' })
    async create(@Body() createSolicitacaoDto: CreateSolicitacaoDto, @Request() req) {
      // Implementação...
    }
    
    @Get()
    @ApiOperation({ summary: 'Listar solicitações', description: 'Retorna uma lista paginada de solicitações' })
    @ApiQuery({ name: 'page', required: false, description: 'Número da página' })
    @ApiQuery({ name: 'limit', required: false, description: 'Itens por página' })
    @ApiResponse({ status: 200, description: 'Lista de solicitações', type: [SolicitacaoResponseDto] })
    async findAll(@Query('page') page: number, @Query('limit') limit: number) {
      // Implementação...
    }
    
    @Get(':id')
    @ApiOperation({ summary: 'Buscar solicitação por ID', description: 'Retorna uma solicitação específica' })
    @ApiParam({ name: 'id', description: 'ID da solicitação' })
    @ApiResponse({ status: 200, description: 'Solicitação encontrada', type: SolicitacaoResponseDto })
    @ApiResponse({ status: 404, description: 'Solicitação não encontrada' })
    async findOne(@Param('id') id: string) {
      // Implementação...
    }
    
    @Patch(':id')
    @ApiOperation({ summary: 'Atualizar solicitação', description: 'Atualiza os dados de uma solicitação' })
    @ApiParam({ name: 'id', description: 'ID da solicitação' })
    @ApiBody({ type: UpdateSolicitacaoDto })
    @ApiResponse({ status: 200, description: 'Solicitação atualizada com sucesso', type: SolicitacaoResponseDto })
    @ApiResponse({ status: 400, description: 'Dados inválidos' })
    @ApiResponse({ status: 404, description: 'Solicitação não encontrada' })
    async update(@Param('id') id: string, @Body() updateSolicitacaoDto: UpdateSolicitacaoDto) {
      // Implementação...
    }
    
    @Patch(':id/status')
    @ApiOperation({ summary: 'Alterar status da solicitação', description: 'Atualiza o status de uma solicitação' })
    @ApiParam({ name: 'id', description: 'ID da solicitação' })
    @ApiBody({ type: UpdateStatusDto })
    @ApiResponse({ status: 200, description: 'Status atualizado com sucesso', type: SolicitacaoResponseDto })
    @ApiResponse({ status: 400, description: 'Transição de status inválida' })
    @ApiResponse({ status: 404, description: 'Solicitação não encontrada' })
    async updateStatus(@Param('id') id: string, @Body() updateStatusDto: UpdateStatusDto, @Request() req) {
      // Implementação...
    }
    
    @Delete(':id')
    @ApiOperation({ summary: 'Remover solicitação', description: 'Remove uma solicitação (soft delete)' })
    @ApiParam({ name: 'id', description: 'ID da solicitação' })
    @ApiResponse({ status: 200, description: 'Solicitação removida com sucesso' })
    @ApiResponse({ status: 404, description: 'Solicitação não encontrada' })
    async remove(@Param('id') id: string) {
      // Implementação...
    }
  }
  ```

- [ ] Criar DTOs de resposta para Swagger:
  ```typescript
  // src/modules/solicitacao/dto/solicitacao-response.dto.ts
  import { ApiProperty } from '@nestjs/swagger';
  import { StatusSolicitacao } from '../entities/solicitacao.entity';
  
  export class CidadaoResponseDto {
    @ApiProperty({ description: 'ID do cidadão' })
    id: string;
    
    @ApiProperty({ description: 'Nome do cidadão' })
    nome: string;
    
    @ApiProperty({ description: 'CPF do cidadão' })
    cpf: string;
  }
  
  export class TipoBeneficioResponseDto {
    @ApiProperty({ description: 'ID do tipo de benefício' })
    id: string;
    
    @ApiProperty({ description: 'Nome do tipo de benefício' })
    nome: string;
    
    @ApiProperty({ description: 'Código do tipo de benefício' })
    codigo: string;
  }
  
  export class SolicitacaoResponseDto {
    @ApiProperty({ description: 'ID da solicitação' })
    id: string;
    
    @ApiProperty({ description: 'Protocolo da solicitação' })
    protocolo: string;
    
    @ApiProperty({ description: 'Status da solicitação', enum: StatusSolicitacao })
    status: StatusSolicitacao;
    
    @ApiProperty({ description: 'Data de criação da solicitação' })
    created_at: Date;
    
    @ApiProperty({ description: 'Data de atualização da solicitação' })
    updated_at: Date;
    
    @ApiProperty({ description: 'Cidadão solicitante', type: CidadaoResponseDto })
    cidadao: CidadaoResponseDto;
    
    @ApiProperty({ description: 'Tipo de benefício solicitado', type: TipoBeneficioResponseDto })
    tipoBeneficio: TipoBeneficioResponseDto;
    
    @ApiProperty({ description: 'Dados complementares da solicitação', type: Object })
    dados_complementares: any;
  }
  ```
