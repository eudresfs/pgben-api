# Checklist de Implementação para o Módulo de Notificação

## 1. Implementação de Sistema de Fila

- [ ] Instalar dependências:
  ```bash
  npm install @nestjs/bull bull
  npm install @types/bull --save-dev
  ```

- [ ] Configurar Bull no módulo:
  ```typescript
  // src/modules/notificacao/notificacao.module.ts
  import { Module } from '@nestjs/common';
  import { TypeOrmModule } from '@nestjs/typeorm';
  import { BullModule } from '@nestjs/bull';
  import { NotificacaoController } from './controllers/notificacao.controller';
  import { NotificacaoService } from './services/notificacao.service';
  import { NotificacaoProcessor } from './processors/notificacao.processor';
  import { Notificacao } from './entities/notificacao.entity';

  @Module({
    imports: [
      TypeOrmModule.forFeature([Notificacao]),
      BullModule.registerQueue({
        name: 'notificacoes',
        defaultJobOptions: {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 1000,
          },
          removeOnComplete: true,
          removeOnFail: false,
        },
      }),
    ],
    controllers: [NotificacaoController],
    providers: [NotificacaoService, NotificacaoProcessor],
    exports: [NotificacaoService],
  })
  export class NotificacaoModule {}
  ```

- [ ] Criar processador de fila:
  ```typescript
  // src/modules/notificacao/processors/notificacao.processor.ts
  import { Process, Processor } from '@nestjs/bull';
  import { Logger } from '@nestjs/common';
  import { InjectRepository } from '@nestjs/typeorm';
  import { Repository } from 'typeorm';
  import { Job } from 'bull';
  import { Notificacao, StatusNotificacao } from '../entities/notificacao.entity';

  @Processor('notificacoes')
  export class NotificacaoProcessor {
    private readonly logger = new Logger(NotificacaoProcessor.name);

    constructor(
      @InjectRepository(Notificacao)
      private notificacaoRepository: Repository<Notificacao>,
    ) {}

    @Process('enviar')
    async handleEnvio(job: Job<{ notificacaoId: string }>) {
      this.logger.debug(`Processando notificação: ${job.data.notificacaoId}`);
      
      try {
        const notificacao = await this.notificacaoRepository.findOne({
          where: { id: job.data.notificacaoId }
        });
        
        if (!notificacao) {
          throw new Error(`Notificação não encontrada: ${job.data.notificacaoId}`);
        }
        
        // Lógica de envio da notificação
        // ...
        
        // Atualizar status
        notificacao.status = StatusNotificacao.ENVIADA;
        notificacao.data_envio = new Date();
        await this.notificacaoRepository.save(notificacao);
        
        this.logger.debug(`Notificação enviada: ${job.data.notificacaoId}`);
        return { success: true };
      } catch (error) {
        this.logger.error(`Erro ao processar notificação: ${error.message}`);
        throw error;
      }
    }
  }
  ```

- [ ] Modificar serviço para usar a fila:
  ```typescript
  // src/modules/notificacao/services/notificacao.service.ts
  import { Injectable } from '@nestjs/common';
  import { InjectRepository } from '@nestjs/typeorm';
  import { Repository } from 'typeorm';
  import { InjectQueue } from '@nestjs/bull';
  import { Queue } from 'bull';
  import { Notificacao, StatusNotificacao } from '../entities/notificacao.entity';
  import { CreateNotificacaoDto } from '../dto/create-notificacao.dto';

  @Injectable()
  export class NotificacaoService {
    constructor(
      @InjectRepository(Notificacao)
      private notificacaoRepository: Repository<Notificacao>,
      @InjectQueue('notificacoes')
      private notificacoesQueue: Queue,
    ) {}

    async create(createNotificacaoDto: CreateNotificacaoDto) {
      const notificacao = this.notificacaoRepository.create({
        ...createNotificacaoDto,
        status: StatusNotificacao.PENDENTE,
      });
      
      const savedNotificacao = await this.notificacaoRepository.save(notificacao);
      
      // Adicionar à fila para processamento assíncrono
      await this.notificacoesQueue.add('enviar', {
        notificacaoId: savedNotificacao.id,
      });
      
      return savedNotificacao;
    }
  }
  ```

## 2. Criação de Sistema de Templates

- [ ] Criar entidade para templates:
  ```typescript
  // src/modules/notificacao/entities/template-notificacao.entity.ts
  import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';
  import { IsNotEmpty, Length } from 'class-validator';

  @Entity('template_notificacao')
  export class TemplateNotificacao {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    @IsNotEmpty({ message: 'Código é obrigatório' })
    @Length(3, 50, { message: 'Código deve ter entre 3 e 50 caracteres' })
    codigo: string;

    @Column()
    @IsNotEmpty({ message: 'Nome é obrigatório' })
    @Length(3, 100, { message: 'Nome deve ter entre 3 e 100 caracteres' })
    nome: string;

    @Column()
    @IsNotEmpty({ message: 'Título é obrigatório' })
    @Length(3, 200, { message: 'Título deve ter entre 3 e 200 caracteres' })
    titulo: string;

    @Column({ type: 'text' })
    @IsNotEmpty({ message: 'Conteúdo é obrigatório' })
    conteudo: string;

    @Column({ type: 'jsonb', nullable: true })
    variaveis: any;

    @CreateDateColumn()
    created_at: Date;

    @UpdateDateColumn()
    updated_at: Date;
  }
  ```

- [ ] Implementar serviço de template:
  ```typescript
  // src/modules/notificacao/services/template-notificacao.service.ts
  import { Injectable, NotFoundException } from '@nestjs/common';
  import { InjectRepository } from '@nestjs/typeorm';
  import { Repository } from 'typeorm';
  import { TemplateNotificacao } from '../entities/template-notificacao.entity';

  @Injectable()
  export class TemplateNotificacaoService {
    constructor(
      @InjectRepository(TemplateNotificacao)
      private templateRepository: Repository<TemplateNotificacao>,
    ) {}

    async findByCodigo(codigo: string): Promise<TemplateNotificacao> {
      const template = await this.templateRepository.findOne({
        where: { codigo },
      });
      
      if (!template) {
        throw new NotFoundException(`Template com código ${codigo} não encontrado`);
      }
      
      return template;
    }

    async renderizarTemplate(codigo: string, dados: any): Promise<{ titulo: string; conteudo: string }> {
      const template = await this.findByCodigo(codigo);
      
      let titulo = template.titulo;
      let conteudo = template.conteudo;
      
      // Substituir variáveis
      Object.keys(dados).forEach(key => {
        const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
        titulo = titulo.replace(regex, dados[key]);
        conteudo = conteudo.replace(regex, dados[key]);
      });
      
      return { titulo, conteudo };
    }
  }
  ```

## 3. Implementação de Mecanismo de Retry

- [ ] Adicionar campos para controle de tentativas:
  ```typescript
  // src/modules/notificacao/entities/notificacao.entity.ts
  @Column({ default: 0 })
  tentativas: number;

  @Column({ nullable: true })
  ultimo_erro: string;

  @Column({ nullable: true })
  proxima_tentativa: Date;
  ```

- [ ] Atualizar processador para gerenciar retries:
  ```typescript
  // src/modules/notificacao/processors/notificacao.processor.ts
  @Process('enviar')
  async handleEnvio(job: Job<{ notificacaoId: string }>) {
    this.logger.debug(`Processando notificação: ${job.data.notificacaoId}`);
    
    try {
      const notificacao = await this.notificacaoRepository.findOne({
        where: { id: job.data.notificacaoId }
      });
      
      if (!notificacao) {
        throw new Error(`Notificação não encontrada: ${job.data.notificacaoId}`);
      }
      
      // Incrementar tentativas
      notificacao.tentativas += 1;
      
      // Lógica de envio da notificação
      // ...
      
      // Atualizar status
      notificacao.status = StatusNotificacao.ENVIADA;
      notificacao.data_envio = new Date();
      notificacao.ultimo_erro = null;
      notificacao.proxima_tentativa = null;
      await this.notificacaoRepository.save(notificacao);
      
      this.logger.debug(`Notificação enviada: ${job.data.notificacaoId}`);
      return { success: true };
    } catch (error) {
      this.logger.error(`Erro ao processar notificação: ${error.message}`);
      
      // Atualizar notificação com erro
      const notificacao = await this.notificacaoRepository.findOne({
        where: { id: job.data.notificacaoId }
      });
      
      if (notificacao) {
        notificacao.ultimo_erro = error.message;
        
        // Se atingiu o número máximo de tentativas
        if (job.attemptsMade >= job.opts.attempts - 1) {
          notificacao.status = StatusNotificacao.FALHA;
        } else {
          notificacao.status = StatusNotificacao.PENDENTE;
          notificacao.proxima_tentativa = new Date(Date.now() + Math.pow(2, job.attemptsMade) * 1000);
        }
        
        await this.notificacaoRepository.save(notificacao);
      }
      
      throw error;
    }
  }
  ```

- [ ] Adicionar endpoint para reprocessamento manual:
  ```typescript
  // src/modules/notificacao/controllers/notificacao.controller.ts
  @Post(':id/reprocessar')
  @UseGuards(JwtAuthGuard)
  async reprocessar(@Param('id') id: string) {
    return this.notificacaoService.reprocessar(id);
  }

  // src/modules/notificacao/services/notificacao.service.ts
  async reprocessar(id: string) {
    const notificacao = await this.notificacaoRepository.findOne({
      where: { id }
    });
    
    if (!notificacao) {
      throw new NotFoundException(`Notificação com ID ${id} não encontrada`);
    }
    
    if (notificacao.status !== StatusNotificacao.FALHA) {
      throw new BadRequestException('Apenas notificações com falha podem ser reprocessadas');
    }
    
    notificacao.status = StatusNotificacao.PENDENTE;
    notificacao.ultimo_erro = null;
    notificacao.proxima_tentativa = null;
    await this.notificacaoRepository.save(notificacao);
    
    // Adicionar à fila para processamento assíncrono
    await this.notificacoesQueue.add('enviar', {
      notificacaoId: notificacao.id,
    }, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 1000,
      },
    });
    
    return notificacao;
  }
  ```

## 4. Implementação de Suporte para Múltiplos Canais

- [ ] Refatorar entidade para suportar múltiplos canais:
  ```typescript
  // src/modules/notificacao/entities/notificacao.entity.ts
  export enum CanalNotificacao {
    APP = 'APP',
    EMAIL = 'EMAIL',
    SMS = 'SMS',
    WHATSAPP = 'WHATSAPP',
  }

  @Column({
    type: 'enum',
    enum: CanalNotificacao,
    default: CanalNotificacao.APP,
  })
  canal: CanalNotificacao;

  @Column({ nullable: true })
  email_destinatario: string;

  @Column({ nullable: true })
  telefone_destinatario: string;
  ```

- [ ] Criar interfaces para adaptadores de canal:
  ```typescript
  // src/modules/notificacao/interfaces/canal-notificacao.interface.ts
  export interface CanalNotificacaoAdapter {
    enviar(notificacao: Notificacao): Promise<boolean>;
    suportaCanal(canal: CanalNotificacao): boolean;
  }
  ```

- [ ] Implementar adaptadores para diferentes canais:
  ```typescript
  // src/modules/notificacao/adapters/app-notificacao.adapter.ts
  import { Injectable } from '@nestjs/common';
  import { CanalNotificacaoAdapter } from '../interfaces/canal-notificacao.interface';
  import { Notificacao, CanalNotificacao } from '../entities/notificacao.entity';

  @Injectable()
  export class AppNotificacaoAdapter implements CanalNotificacaoAdapter {
    async enviar(notificacao: Notificacao): Promise<boolean> {
      // Implementação para enviar notificação in-app
      // ...
      return true;
    }

    suportaCanal(canal: CanalNotificacao): boolean {
      return canal === CanalNotificacao.APP;
    }
  }
  ```

- [ ] Criar factory para seleção do canal:
  ```typescript
  // src/modules/notificacao/factories/canal-notificacao.factory.ts
  import { Injectable } from '@nestjs/common';
  import { CanalNotificacaoAdapter } from '../interfaces/canal-notificacao.interface';
  import { CanalNotificacao } from '../entities/notificacao.entity';

  @Injectable()
  export class CanalNotificacaoFactory {
    constructor(private readonly adapters: CanalNotificacaoAdapter[]) {}

    getAdapter(canal: CanalNotificacao): CanalNotificacaoAdapter {
      const adapter = this.adapters.find(a => a.suportaCanal(canal));
      
      if (!adapter) {
        throw new Error(`Nenhum adaptador encontrado para o canal ${canal}`);
      }
      
      return adapter;
    }
  }
  ```

## 5. Melhoria das Validações

- [ ] Atualizar validações no DTO de criação:
  ```typescript
  // src/modules/notificacao/dto/create-notificacao.dto.ts
  import { IsNotEmpty, IsUUID, IsEnum, IsOptional, IsString, Length, IsEmail, IsObject, ValidateIf } from 'class-validator';
  import { CanalNotificacao, TipoNotificacao } from '../entities/notificacao.entity';

  export class CreateNotificacaoDto {
    @IsOptional()
    @IsUUID(4, { message: 'ID de destinatário inválido' })
    destinatario_id?: string;

    @ValidateIf(o => o.canal === CanalNotificacao.EMAIL)
    @IsNotEmpty({ message: 'Email do destinatário é obrigatório para canal EMAIL' })
    @IsEmail({}, { message: 'Email do destinatário inválido' })
    email_destinatario?: string;

    @ValidateIf(o => o.canal === CanalNotificacao.SMS || o.canal === CanalNotificacao.WHATSAPP)
    @IsNotEmpty({ message: 'Telefone do destinatário é obrigatório para canais SMS e WHATSAPP' })
    @IsString({ message: 'Telefone do destinatário deve ser uma string' })
    telefone_destinatario?: string;

    @IsNotEmpty({ message: 'Título é obrigatório' })
    @IsString({ message: 'Título deve ser uma string' })
    @Length(3, 200, { message: 'Título deve ter entre 3 e 200 caracteres' })
    titulo: string;

    @IsNotEmpty({ message: 'Conteúdo é obrigatório' })
    @IsString({ message: 'Conteúdo deve ser uma string' })
    conteudo: string;

    @IsNotEmpty({ message: 'Tipo é obrigatório' })
    @IsEnum(TipoNotificacao, { message: 'Tipo inválido' })
    tipo: TipoNotificacao;

    @IsNotEmpty({ message: 'Canal é obrigatório' })
    @IsEnum(CanalNotificacao, { message: 'Canal inválido' })
    canal: CanalNotificacao;

    @IsOptional()
    @IsObject({ message: 'Dados deve ser um objeto' })
    dados?: any;
  }
  ```

## 6. Adição de Índices

- [ ] Adicionar decoradores de índice na entidade:
  ```typescript
  // src/modules/notificacao/entities/notificacao.entity.ts
  import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, DeleteDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';

  @Entity('notificacao')
  @Index('idx_notificacao_destinatario', ['destinatario_id'])
  @Index('idx_notificacao_status', ['status'])
  @Index('idx_notificacao_canal', ['canal'])
  @Index('idx_notificacao_tipo', ['tipo'])
  @Index('idx_notificacao_created_at', ['created_at'])
  export class Notificacao {
    // Propriedades existentes...
  }
  ```

- [ ] Criar migration para adicionar índices:
  ```typescript
  // src/migrations/1621234567890-AddNotificacaoIndices.ts
  import { MigrationInterface, QueryRunner } from 'typeorm';

  export class AddNotificacaoIndices1621234567890 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
      await queryRunner.query(`
        CREATE INDEX IF NOT EXISTS idx_notificacao_destinatario ON notificacao (destinatario_id);
        CREATE INDEX IF NOT EXISTS idx_notificacao_status ON notificacao (status);
        CREATE INDEX IF NOT EXISTS idx_notificacao_canal ON notificacao (canal);
        CREATE INDEX IF NOT EXISTS idx_notificacao_tipo ON notificacao (tipo);
        CREATE INDEX IF NOT EXISTS idx_notificacao_created_at ON notificacao (created_at);
      `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
      await queryRunner.query(`
        DROP INDEX IF EXISTS idx_notificacao_destinatario;
        DROP INDEX IF EXISTS idx_notificacao_status;
        DROP INDEX IF EXISTS idx_notificacao_canal;
        DROP INDEX IF EXISTS idx_notificacao_tipo;
        DROP INDEX IF EXISTS idx_notificacao_created_at;
      `);
    }
  }
  ```

## 7. Documentação Swagger

- [ ] Adicionar decoradores Swagger no controller:
  ```typescript
  // src/modules/notificacao/controllers/notificacao.controller.ts
  import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request, Query } from '@nestjs/common';
  import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBody, ApiQuery } from '@nestjs/swagger';
  import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
  import { NotificacaoService } from '../services/notificacao.service';
  import { CreateNotificacaoDto } from '../dto/create-notificacao.dto';
  import { UpdateNotificacaoDto } from '../dto/update-notificacao.dto';

  @ApiTags('Notificações')
  @Controller('notificacoes')
  export class NotificacaoController {
    constructor(private readonly notificacaoService: NotificacaoService) {}

    @Post()
    @UseGuards(JwtAuthGuard)
    @ApiOperation({ summary: 'Criar nova notificação', description: 'Cria uma nova notificação no sistema' })
    @ApiBody({ type: CreateNotificacaoDto })
    @ApiResponse({ status: 201, description: 'Notificação criada com sucesso' })
    @ApiResponse({ status: 400, description: 'Dados inválidos' })
    @ApiResponse({ status: 401, description: 'Não autorizado' })
    async create(@Body() createNotificacaoDto: CreateNotificacaoDto) {
      return this.notificacaoService.create(createNotificacaoDto);
    }

    @Get()
    @UseGuards(JwtAuthGuard)
    @ApiOperation({ summary: 'Listar notificações', description: 'Retorna uma lista paginada de notificações' })
    @ApiQuery({ name: 'page', required: false, description: 'Número da página' })
    @ApiQuery({ name: 'limit', required: false, description: 'Itens por página' })
    @ApiQuery({ name: 'status', required: false, description: 'Filtrar por status' })
    @ApiQuery({ name: 'tipo', required: false, description: 'Filtrar por tipo' })
    @ApiResponse({ status: 200, description: 'Lista de notificações' })
    @ApiResponse({ status: 401, description: 'Não autorizado' })
    async findAll(
      @Query('page') page: number,
      @Query('limit') limit: number,
      @Query('status') status: string,
      @Query('tipo') tipo: string,
      @Request() req
    ) {
      return this.notificacaoService.findAll({
        page,
        limit,
        status,
        tipo,
        destinatarioId: req.user.id
      });
    }

    @Get(':id')
    @UseGuards(JwtAuthGuard)
    @ApiOperation({ summary: 'Buscar notificação por ID', description: 'Retorna uma notificação específica' })
    @ApiParam({ name: 'id', description: 'ID da notificação' })
    @ApiResponse({ status: 200, description: 'Notificação encontrada' })
    @ApiResponse({ status: 404, description: 'Notificação não encontrada' })
    @ApiResponse({ status: 401, description: 'Não autorizado' })
    async findOne(@Param('id') id: string) {
      return this.notificacaoService.findOne(id);
    }

    @Patch(':id/marcar-como-lida')
    @UseGuards(JwtAuthGuard)
    @ApiOperation({ summary: 'Marcar notificação como lida', description: 'Atualiza o status de uma notificação para LIDA' })
    @ApiParam({ name: 'id', description: 'ID da notificação' })
    @ApiResponse({ status: 200, description: 'Notificação marcada como lida' })
    @ApiResponse({ status: 404, description: 'Notificação não encontrada' })
    @ApiResponse({ status: 401, description: 'Não autorizado' })
    async marcarComoLida(@Param('id') id: string, @Request() req) {
      return this.notificacaoService.marcarComoLida(id, req.user.id);
    }

    @Post(':id/reprocessar')
    @UseGuards(JwtAuthGuard)
    @ApiOperation({ summary: 'Reprocessar notificação', description: 'Tenta enviar novamente uma notificação que falhou' })
    @ApiParam({ name: 'id', description: 'ID da notificação' })
    @ApiResponse({ status: 200, description: 'Notificação reprocessada' })
    @ApiResponse({ status: 400, description: 'Apenas notificações com falha podem ser reprocessadas' })
    @ApiResponse({ status: 404, description: 'Notificação não encontrada' })
    @ApiResponse({ status: 401, description: 'Não autorizado' })
    async reprocessar(@Param('id') id: string) {
      return this.notificacaoService.reprocessar(id);
    }

    @Delete(':id')
    @UseGuards(JwtAuthGuard)
    @ApiOperation({ summary: 'Remover notificação', description: 'Remove uma notificação (soft delete)' })
    @ApiParam({ name: 'id', description: 'ID da notificação' })
    @ApiResponse({ status: 200, description: 'Notificação removida com sucesso' })
    @ApiResponse({ status: 404, description: 'Notificação não encontrada' })
    @ApiResponse({ status: 401, description: 'Não autorizado' })
    async remove(@Param('id') id: string, @Request() req) {
      return this.notificacaoService.remove(id, req.user.id);
    }
  }
  ```
