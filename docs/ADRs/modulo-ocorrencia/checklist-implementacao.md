# Checklist de Implementação para o Módulo de Ocorrência

## 1. Correção do Campo `usuario_id`

- [ ] Remover a declaração atual do campo `usuario_id` no final da classe:
  ```typescript
  // Remover esta linha
  usuario_id: string;
  ```

- [ ] Adicionar a declaração correta com decoradores adequados:
  ```typescript
  @Column()
  @IsNotEmpty({ message: 'Usuário responsável é obrigatório' })
  @IsUUID(4, { message: 'ID de usuário inválido' })
  usuario_id: string;

  @ManyToOne(() => Usuario)
  @JoinColumn({ name: 'usuario_id' })
  usuario: Usuario;
  ```

- [ ] Verificar e corrigir referências ao campo em outros arquivos
- [ ] Adicionar validação para o campo nos DTOs

## 2. Melhoria das Validações

- [ ] Atualizar validações no DTO de criação:
  ```typescript
  // src/modules/ocorrencia/dto/create-ocorrencia.dto.ts
  import { IsNotEmpty, IsUUID, IsEnum, IsOptional, IsString, Length, IsIn } from 'class-validator';
  import { TipoOcorrencia, PrioridadeOcorrencia } from '../entities/ocorrencia.entity';
  
  export class CreateOcorrenciaDto {
    @IsNotEmpty({ message: 'Tipo de ocorrência é obrigatório' })
    @IsEnum(TipoOcorrencia, { message: 'Tipo de ocorrência inválido' })
    tipo: TipoOcorrencia;
    
    @IsNotEmpty({ message: 'Descrição é obrigatória' })
    @IsString({ message: 'Descrição deve ser uma string' })
    @Length(10, 2000, { message: 'Descrição deve ter entre 10 e 2000 caracteres' })
    descricao: string;
    
    @IsNotEmpty({ message: 'Prioridade é obrigatória' })
    @IsEnum(PrioridadeOcorrencia, { message: 'Prioridade inválida' })
    prioridade: PrioridadeOcorrencia;
    
    @IsOptional()
    @IsUUID(4, { message: 'ID de cidadão inválido' })
    cidadao_id?: string;
    
    @IsOptional()
    @IsUUID(4, { message: 'ID de solicitação inválido' })
    solicitacao_id?: string;
    
    @IsNotEmpty({ message: 'Responsável é obrigatório' })
    @IsUUID(4, { message: 'ID de responsável inválido' })
    responsavel_id: string;
  }
  ```

- [ ] Implementar validador de transições de status:
  ```typescript
  // src/modules/ocorrencia/validators/status-transition.validator.ts
  import { ValidatorConstraint, ValidatorConstraintInterface, ValidationArguments } from 'class-validator';
  import { StatusOcorrencia } from '../entities/ocorrencia.entity';
  
  @ValidatorConstraint({ name: 'statusTransitionValidator', async: true })
  export class StatusTransitionValidator implements ValidatorConstraintInterface {
    private validTransitions = {
      [StatusOcorrencia.ABERTA]: [StatusOcorrencia.EM_ANDAMENTO, StatusOcorrencia.CANCELADA],
      [StatusOcorrencia.EM_ANDAMENTO]: [StatusOcorrencia.RESOLVIDA, StatusOcorrencia.CANCELADA],
      [StatusOcorrencia.RESOLVIDA]: [StatusOcorrencia.REABERTA],
      [StatusOcorrencia.REABERTA]: [StatusOcorrencia.EM_ANDAMENTO, StatusOcorrencia.CANCELADA],
      [StatusOcorrencia.CANCELADA]: []
    };
    
    async validate(novoStatus: StatusOcorrencia, args: ValidationArguments) {
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
  // src/modules/ocorrencia/dto/update-status.dto.ts
  import { IsNotEmpty, IsEnum, Validate } from 'class-validator';
  import { StatusOcorrencia } from '../entities/ocorrencia.entity';
  import { StatusTransitionValidator } from '../validators/status-transition.validator';
  
  export class UpdateStatusDto {
    @IsNotEmpty({ message: 'Status atual é obrigatório' })
    @IsEnum(StatusOcorrencia, { message: 'Status atual inválido' })
    statusAtual: StatusOcorrencia;
    
    @IsNotEmpty({ message: 'Novo status é obrigatório' })
    @IsEnum(StatusOcorrencia, { message: 'Novo status inválido' })
    @Validate(StatusTransitionValidator)
    novoStatus: StatusOcorrencia;
    
    @IsNotEmpty({ message: 'Observação é obrigatória' })
    observacao: string;
  }
  ```

## 3. Implementação de Histórico de Alterações

- [ ] Criar entidade `HistoricoOcorrencia`:
  ```typescript
  // src/modules/ocorrencia/entities/historico-ocorrencia.entity.ts
  import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
  import { IsNotEmpty } from 'class-validator';
  import { StatusOcorrencia } from './ocorrencia.entity';
  import { Ocorrencia } from './ocorrencia.entity';
  import { Usuario } from '../../usuario/entities/usuario.entity';

  @Entity('historico_ocorrencia')
  export class HistoricoOcorrencia {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    @IsNotEmpty({ message: 'Ocorrência é obrigatória' })
    ocorrencia_id: string;

    @ManyToOne(() => Ocorrencia)
    @JoinColumn({ name: 'ocorrencia_id' })
    ocorrencia: Ocorrencia;

    @Column({ nullable: true })
    status_anterior: StatusOcorrencia;

    @Column()
    @IsNotEmpty({ message: 'Status atual é obrigatório' })
    status_atual: StatusOcorrencia;

    @Column()
    @IsNotEmpty({ message: 'Usuário é obrigatório' })
    usuario_id: string;

    @ManyToOne(() => Usuario)
    @JoinColumn({ name: 'usuario_id' })
    usuario: Usuario;

    @Column({ nullable: true })
    observacao: string;

    @Column({ type: 'jsonb', nullable: true })
    dados_alterados: any;

    @Column({ nullable: true })
    ip_usuario: string;

    @CreateDateColumn()
    created_at: Date;
  }
  ```

- [ ] Atualizar módulo para incluir a nova entidade:
  ```typescript
  // src/modules/ocorrencia/ocorrencia.module.ts
  import { Module } from '@nestjs/common';
  import { TypeOrmModule } from '@nestjs/typeorm';
  import { OcorrenciaController } from './controllers/ocorrencia.controller';
  import { OcorrenciaService } from './services/ocorrencia.service';
  import { Ocorrencia } from './entities/ocorrencia.entity';
  import { HistoricoOcorrencia } from './entities/historico-ocorrencia.entity';

  @Module({
    imports: [TypeOrmModule.forFeature([Ocorrencia, HistoricoOcorrencia])],
    controllers: [OcorrenciaController],
    providers: [OcorrenciaService],
    exports: [OcorrenciaService]
  })
  export class OcorrenciaModule {}
  ```

- [ ] Implementar método para registrar alterações na entidade `Ocorrencia`:
  ```typescript
  // src/modules/ocorrencia/entities/ocorrencia.entity.ts
  import { AfterUpdate, Column } from 'typeorm';
  import { getRepository } from 'typeorm';
  import { HistoricoOcorrencia } from './historico-ocorrencia.entity';

  // Adicionar à classe Ocorrencia
  @Column({ select: false, insert: false, update: false })
  private statusAnterior: StatusOcorrencia;

  @Column({ select: false, insert: false, update: false })
  private usuarioAlteracao: string;

  @Column({ select: false, insert: false, update: false })
  private observacaoAlteracao: string;

  @Column({ select: false, insert: false, update: false })
  private ipUsuario: string;

  // Método para preparar alteração de status
  prepararAlteracaoStatus(novoStatus: StatusOcorrencia, usuario: string, observacao: string, ip: string) {
    this.statusAnterior = this.status;
    this.status = novoStatus;
    this.usuarioAlteracao = usuario;
    this.observacaoAlteracao = observacao;
    this.ipUsuario = ip;
  }

  @AfterUpdate()
  async logStatusChange() {
    // Verificar se houve mudança de status
    if (this.statusAnterior !== this.status) {
      const historicoRepository = getRepository(HistoricoOcorrencia);
      
      await historicoRepository.save({
        ocorrencia_id: this.id,
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

- [ ] Modificar serviço para usar o método de registro de alterações:
  ```typescript
  // src/modules/ocorrencia/services/ocorrencia.service.ts
  async alterarStatus(id: string, updateStatusDto: UpdateStatusDto, usuarioId: string, ipUsuario: string) {
    const ocorrencia = await this.ocorrenciaRepository.findOne({ where: { id } });
    if (!ocorrencia) {
      throw new NotFoundException(`Ocorrência com ID ${id} não encontrada`);
    }
    
    ocorrencia.prepararAlteracaoStatus(
      updateStatusDto.novoStatus,
      usuarioId,
      updateStatusDto.observacao,
      ipUsuario
    );
    
    return this.ocorrenciaRepository.save(ocorrencia);
  }
  ```

- [ ] Adicionar endpoint para consulta de histórico:
  ```typescript
  // src/modules/ocorrencia/controllers/ocorrencia.controller.ts
  @Get(':id/historico')
  @UseGuards(JwtAuthGuard)
  async findHistorico(@Param('id') id: string) {
    return this.ocorrenciaService.findHistorico(id);
  }

  // src/modules/ocorrencia/services/ocorrencia.service.ts
  async findHistorico(id: string) {
    const ocorrencia = await this.ocorrenciaRepository.findOne({ where: { id } });
    if (!ocorrencia) {
      throw new NotFoundException(`Ocorrência com ID ${id} não encontrada`);
    }
    
    return this.historicoOcorrenciaRepository.find({
      where: { ocorrencia_id: id },
      order: { created_at: 'DESC' },
      relations: ['usuario']
    });
  }
  ```

## 4. Adição de Índices

- [ ] Adicionar decoradores de índice na entidade `Ocorrencia`:
  ```typescript
  // src/modules/ocorrencia/entities/ocorrencia.entity.ts
  import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, DeleteDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';

  @Entity('ocorrencia')
  @Index('idx_ocorrencia_tipo', ['tipo'])
  @Index('idx_ocorrencia_status', ['status'])
  @Index('idx_ocorrencia_prioridade', ['prioridade'])
  @Index('idx_ocorrencia_responsavel', ['responsavel_id'])
  @Index('idx_ocorrencia_cidadao', ['cidadao_id'])
  export class Ocorrencia {
    // Propriedades existentes...
  }
  ```

- [ ] Criar migration para adicionar índices no banco de dados:
  ```typescript
  // src/migrations/1621234567890-AddOcorrenciaIndices.ts
  import { MigrationInterface, QueryRunner } from 'typeorm';

  export class AddOcorrenciaIndices1621234567890 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
      await queryRunner.query(`
        CREATE INDEX IF NOT EXISTS idx_ocorrencia_tipo ON ocorrencia (tipo);
        CREATE INDEX IF NOT EXISTS idx_ocorrencia_status ON ocorrencia (status);
        CREATE INDEX IF NOT EXISTS idx_ocorrencia_prioridade ON ocorrencia (prioridade);
        CREATE INDEX IF NOT EXISTS idx_ocorrencia_responsavel ON ocorrencia (responsavel_id);
        CREATE INDEX IF NOT EXISTS idx_ocorrencia_cidadao ON ocorrencia (cidadao_id);
      `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
      await queryRunner.query(`
        DROP INDEX IF EXISTS idx_ocorrencia_tipo;
        DROP INDEX IF EXISTS idx_ocorrencia_status;
        DROP INDEX IF EXISTS idx_ocorrencia_prioridade;
        DROP INDEX IF EXISTS idx_ocorrencia_responsavel;
        DROP INDEX IF EXISTS idx_ocorrencia_cidadao;
      `);
    }
  }
  ```

## 5. Implementação de Notificações Automáticas

- [ ] Modificar serviço de ocorrência para integrar com o serviço de notificação:
  ```typescript
  // src/modules/ocorrencia/services/ocorrencia.service.ts
  import { Injectable } from '@nestjs/common';
  import { InjectRepository } from '@nestjs/typeorm';
  import { Repository } from 'typeorm';
  import { Ocorrencia, PrioridadeOcorrencia } from '../entities/ocorrencia.entity';
  import { NotificacaoService } from '../../notificacao/services/notificacao.service';

  @Injectable()
  export class OcorrenciaService {
    constructor(
      @InjectRepository(Ocorrencia)
      private ocorrenciaRepository: Repository<Ocorrencia>,
      @InjectRepository(HistoricoOcorrencia)
      private historicoOcorrenciaRepository: Repository<HistoricoOcorrencia>,
      private notificacaoService: NotificacaoService
    ) {}

    async create(createOcorrenciaDto: CreateOcorrenciaDto, usuarioId: string) {
      const ocorrencia = this.ocorrenciaRepository.create({
        ...createOcorrenciaDto,
        usuario_id: usuarioId
      });
      
      const savedOcorrencia = await this.ocorrenciaRepository.save(ocorrencia);
      
      // Enviar notificação para ocorrências de alta prioridade
      if (ocorrencia.prioridade === PrioridadeOcorrencia.ALTA) {
        await this.enviarNotificacaoPrioridadeAlta(savedOcorrencia);
      }
      
      return savedOcorrencia;
    }

    private async enviarNotificacaoPrioridadeAlta(ocorrencia: Ocorrencia) {
      // Buscar gestores que devem ser notificados
      const gestores = await this.usuarioRepository.find({
        where: { role: 'GESTOR' }
      });
      
      // Enviar notificação para cada gestor
      for (const gestor of gestores) {
        await this.notificacaoService.create({
          destinatario_id: gestor.id,
          titulo: 'Ocorrência de Alta Prioridade',
          conteudo: `Nova ocorrência de alta prioridade registrada: ${ocorrencia.descricao.substring(0, 100)}...`,
          tipo: 'SISTEMA',
          dados: {
            ocorrenciaId: ocorrencia.id,
            tipo: ocorrencia.tipo,
            prioridade: ocorrencia.prioridade
          }
        });
      }
    }
  }
  ```

- [ ] Atualizar módulo para incluir o serviço de notificação:
  ```typescript
  // src/modules/ocorrencia/ocorrencia.module.ts
  import { Module } from '@nestjs/common';
  import { TypeOrmModule } from '@nestjs/typeorm';
  import { OcorrenciaController } from './controllers/ocorrencia.controller';
  import { OcorrenciaService } from './services/ocorrencia.service';
  import { Ocorrencia } from './entities/ocorrencia.entity';
  import { HistoricoOcorrencia } from './entities/historico-ocorrencia.entity';
  import { NotificacaoModule } from '../notificacao/notificacao.module';
  import { UsuarioModule } from '../usuario/usuario.module';

  @Module({
    imports: [
      TypeOrmModule.forFeature([Ocorrencia, HistoricoOcorrencia]),
      NotificacaoModule,
      UsuarioModule
    ],
    controllers: [OcorrenciaController],
    providers: [OcorrenciaService],
    exports: [OcorrenciaService]
  })
  export class OcorrenciaModule {}
  ```

## 6. Documentação Swagger

- [ ] Adicionar decoradores Swagger no controller:
  ```typescript
  // src/modules/ocorrencia/controllers/ocorrencia.controller.ts
  import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request, Query } from '@nestjs/common';
  import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBody, ApiQuery } from '@nestjs/swagger';
  import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
  import { OcorrenciaService } from '../services/ocorrencia.service';
  import { CreateOcorrenciaDto } from '../dto/create-ocorrencia.dto';
  import { UpdateOcorrenciaDto } from '../dto/update-ocorrencia.dto';
  import { UpdateStatusDto } from '../dto/update-status.dto';

  @ApiTags('Ocorrências')
  @Controller('ocorrencias')
  export class OcorrenciaController {
    constructor(private readonly ocorrenciaService: OcorrenciaService) {}

    @Post()
    @UseGuards(JwtAuthGuard)
    @ApiOperation({ summary: 'Criar nova ocorrência', description: 'Cria uma nova ocorrência no sistema' })
    @ApiBody({ type: CreateOcorrenciaDto })
    @ApiResponse({ status: 201, description: 'Ocorrência criada com sucesso' })
    @ApiResponse({ status: 400, description: 'Dados inválidos' })
    @ApiResponse({ status: 401, description: 'Não autorizado' })
    async create(@Body() createOcorrenciaDto: CreateOcorrenciaDto, @Request() req) {
      return this.ocorrenciaService.create(createOcorrenciaDto, req.user.id);
    }

    @Get()
    @UseGuards(JwtAuthGuard)
    @ApiOperation({ summary: 'Listar ocorrências', description: 'Retorna uma lista paginada de ocorrências' })
    @ApiQuery({ name: 'page', required: false, description: 'Número da página' })
    @ApiQuery({ name: 'limit', required: false, description: 'Itens por página' })
    @ApiQuery({ name: 'tipo', required: false, description: 'Filtrar por tipo de ocorrência' })
    @ApiQuery({ name: 'status', required: false, description: 'Filtrar por status' })
    @ApiQuery({ name: 'prioridade', required: false, description: 'Filtrar por prioridade' })
    @ApiResponse({ status: 200, description: 'Lista de ocorrências' })
    @ApiResponse({ status: 401, description: 'Não autorizado' })
    async findAll(
      @Query('page') page: number,
      @Query('limit') limit: number,
      @Query('tipo') tipo: string,
      @Query('status') status: string,
      @Query('prioridade') prioridade: string
    ) {
      return this.ocorrenciaService.findAll({ page, limit, tipo, status, prioridade });
    }

    @Get(':id')
    @UseGuards(JwtAuthGuard)
    @ApiOperation({ summary: 'Buscar ocorrência por ID', description: 'Retorna uma ocorrência específica' })
    @ApiParam({ name: 'id', description: 'ID da ocorrência' })
    @ApiResponse({ status: 200, description: 'Ocorrência encontrada' })
    @ApiResponse({ status: 404, description: 'Ocorrência não encontrada' })
    @ApiResponse({ status: 401, description: 'Não autorizado' })
    async findOne(@Param('id') id: string) {
      return this.ocorrenciaService.findOne(id);
    }

    @Get(':id/historico')
    @UseGuards(JwtAuthGuard)
    @ApiOperation({ summary: 'Buscar histórico de ocorrência', description: 'Retorna o histórico de alterações de uma ocorrência' })
    @ApiParam({ name: 'id', description: 'ID da ocorrência' })
    @ApiResponse({ status: 200, description: 'Histórico encontrado' })
    @ApiResponse({ status: 404, description: 'Ocorrência não encontrada' })
    @ApiResponse({ status: 401, description: 'Não autorizado' })
    async findHistorico(@Param('id') id: string) {
      return this.ocorrenciaService.findHistorico(id);
    }

    @Patch(':id')
    @UseGuards(JwtAuthGuard)
    @ApiOperation({ summary: 'Atualizar ocorrência', description: 'Atualiza os dados de uma ocorrência' })
    @ApiParam({ name: 'id', description: 'ID da ocorrência' })
    @ApiBody({ type: UpdateOcorrenciaDto })
    @ApiResponse({ status: 200, description: 'Ocorrência atualizada com sucesso' })
    @ApiResponse({ status: 400, description: 'Dados inválidos' })
    @ApiResponse({ status: 404, description: 'Ocorrência não encontrada' })
    @ApiResponse({ status: 401, description: 'Não autorizado' })
    async update(@Param('id') id: string, @Body() updateOcorrenciaDto: UpdateOcorrenciaDto) {
      return this.ocorrenciaService.update(id, updateOcorrenciaDto);
    }

    @Patch(':id/status')
    @UseGuards(JwtAuthGuard)
    @ApiOperation({ summary: 'Alterar status da ocorrência', description: 'Atualiza o status de uma ocorrência' })
    @ApiParam({ name: 'id', description: 'ID da ocorrência' })
    @ApiBody({ type: UpdateStatusDto })
    @ApiResponse({ status: 200, description: 'Status atualizado com sucesso' })
    @ApiResponse({ status: 400, description: 'Transição de status inválida' })
    @ApiResponse({ status: 404, description: 'Ocorrência não encontrada' })
    @ApiResponse({ status: 401, description: 'Não autorizado' })
    async updateStatus(@Param('id') id: string, @Body() updateStatusDto: UpdateStatusDto, @Request() req) {
      return this.ocorrenciaService.alterarStatus(id, updateStatusDto, req.user.id, req.ip);
    }

    @Delete(':id')
    @UseGuards(JwtAuthGuard)
    @ApiOperation({ summary: 'Remover ocorrência', description: 'Remove uma ocorrência (soft delete)' })
    @ApiParam({ name: 'id', description: 'ID da ocorrência' })
    @ApiResponse({ status: 200, description: 'Ocorrência removida com sucesso' })
    @ApiResponse({ status: 404, description: 'Ocorrência não encontrada' })
    @ApiResponse({ status: 401, description: 'Não autorizado' })
    async remove(@Param('id') id: string) {
      return this.ocorrenciaService.remove(id);
    }
  }
  ```
