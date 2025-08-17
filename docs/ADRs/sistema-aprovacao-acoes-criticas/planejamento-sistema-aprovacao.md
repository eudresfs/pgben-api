# Sistema Genérico de Aprovação de Ações Críticas - PGBen

## Status
**⚠️ OBSOLETO - MIGRADO PARA V2** 

> **IMPORTANTE**: Este documento descreve o sistema original de aprovação que foi **refatorado e simplificado**.
> 
> **Para a implementação atual, consulte:**
> - 📋 [Documentação Técnica do Módulo v2](../../modules/aprovacao-v2/README.md)
> - 🔄 [Guia de Migração](../../modules/aprovacao-v2/guia-migracao-aprovacao-v2.md)
> 
> **Data da Migração**: Janeiro 2025  
> **Motivo**: Simplificação da arquitetura (6 → 3 entidades) e melhoria de performance

---

## Documento Original - Sistema v1 (Obsoleto)

## Visão Geral

Este documento apresenta o planejamento arquitetural para implementação de um sistema genérico de aprovação de ações críticas no PGBen, seguindo os padrões estabelecidos na codebase existente e integrando-se perfeitamente com os módulos de auditoria, notificação, permissões e workflow já implementados.

## Contexto e Motivação

O sistema deve permitir que qualquer ação sensível (cancelamento, suspensão, bloqueio, desbloqueio, liberação, reativação, exclusão, etc.) seja configurada para exigir ou não aprovação prévia, conforme o tipo da ação e o perfil do solicitante.

### Requisitos Funcionais

1. **Configuração por tipo de ação**: Cada tipo de ação pode ser configurado para exigir aprovação ou ser executado automaticamente
2. **Regras baseadas em perfil**: Usuários com perfis específicos podem executar ações diretamente ou ser designados como aprovadores
3. **Workflow de aprovação**: Registro, notificação, aprovação/negação e execução automática
4. **Auditoria completa**: Todo o ciclo deve ser auditável e rastreável
5. **Escalabilidade**: Suporte a múltiplas ações simultâneas e múltiplos aprovadores
6. **Fallbacks e prazos**: Configuração de prazos máximos com escalação automática
7. **Interface programática e visual**: API completa e interface de gestão

## Arquitetura Proposta

### Integração com Arquitetura Existente

O sistema seguirá os padrões arquiteturais já estabelecidos no PGBen:

- **Clean Architecture com DDD**: Organização por domínio de negócio
- **Event-Driven Architecture**: Integração com sistema de eventos existente
- **ABAC (Attribute-Based Access Control)**: Uso do sistema de permissões granulares
- **Auditoria Automática**: Integração com interceptors de auditoria
- **Notificações Assíncronas**: Uso do sistema de filas BullMQ e templates
- **Scoped Repository Pattern**: Contexto de unidade e escopo

### Estrutura de Módulos

```
src/modules/aprovacao/
├── config/
│   ├── aprovacao.config.ts
│   └── workflow.config.ts
├── constants/
│   ├── acao-critica.constants.ts
│   ├── status-aprovacao.constants.ts
│   └── tipo-aprovador.constants.ts
├── controllers/
│   ├── aprovacao.controller.ts
│   ├── configuracao-aprovacao.controller.ts
│   ├── solicitacao-aprovacao.controller.ts
│   └── workflow-aprovacao.controller.ts
├── decorators/
│   ├── requer-aprovacao.decorator.ts
│   ├── acao-critica.decorator.ts
│   └── aprovador-autorizado.decorator.ts
├── dtos/
│   ├── criar-solicitacao-aprovacao.dto.ts
│   ├── processar-aprovacao.dto.ts
│   ├── configurar-acao-critica.dto.ts
│   └── definir-aprovadores.dto.ts
├── entities/
│   ├── acao-critica.entity.ts
│   ├── solicitacao-aprovacao.entity.ts
│   ├── configuracao-aprovacao.entity.ts
│   ├── aprovador.entity.ts
│   ├── historico-aprovacao.entity.ts
│   └── escalacao-aprovacao.entity.ts
├── enums/
│   ├── tipo-acao-critica.enum.ts
│   ├── status-solicitacao-aprovacao.enum.ts
│   ├── tipo-aprovacao.enum.ts
│   └── estrategia-aprovacao.enum.ts
├── events/
│   ├── solicitacao-aprovacao-criada.event.ts
│   ├── aprovacao-processada.event.ts
│   ├── acao-executada.event.ts
│   └── prazo-expirado.event.ts
├── exceptions/
│   ├── aprovacao-negada.exception.ts
│   ├── prazo-expirado.exception.ts
│   └── aprovador-nao-autorizado.exception.ts
├── guards/
│   ├── aprovacao-pendente.guard.ts
│   └── aprovador-autorizado.guard.ts
├── interceptors/
│   ├── acao-critica.interceptor.ts
│   └── auditoria-aprovacao.interceptor.ts
├── interfaces/
│   ├── acao-executavel.interface.ts
│   ├── aprovador.interface.ts
│   └── configuracao-workflow.interface.ts
├── listeners/
│   ├── aprovacao-events.listener.ts
│   ├── notificacao-aprovacao.listener.ts
│   └── escalacao-aprovacao.listener.ts
├── processors/
│   ├── aprovacao-queue.processor.ts
│   ├── escalacao-queue.processor.ts
│   └── execucao-acao.processor.ts
├── repositories/
│   ├── acao-critica.repository.ts
│   ├── solicitacao-aprovacao.repository.ts
│   ├── configuracao-aprovacao.repository.ts
│   └── historico-aprovacao.repository.ts
├── services/
│   ├── aprovacao.service.ts
│   ├── configuracao-aprovacao.service.ts
│   ├── workflow-aprovacao.service.ts
│   ├── escalacao.service.ts
│   ├── executor-acao.service.ts
│   └── aprovacao-metrics.service.ts
├── strategies/
│   ├── aprovacao-unanime.strategy.ts
│   ├── aprovacao-maioria.strategy.ts
│   ├── aprovacao-qualquer-um.strategy.ts
│   └── aprovacao-hierarquica.strategy.ts
└── aprovacao.module.ts
```

## Design de Entidades

### 1. AcaoCritica

```typescript
@Entity('acoes_criticas')
export class AcaoCritica {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  codigo: string; // Ex: 'CANCELAR_SOLICITACAO', 'SUSPENDER_BENEFICIO'

  @Column()
  nome: string;

  @Column({ type: 'text', nullable: true })
  descricao: string;

  @Column({ type: 'varchar', length: 100 })
  modulo: string; // Ex: 'solicitacao', 'beneficio', 'cidadao'

  @Column({ type: 'varchar', length: 100 })
  entidade_alvo: string; // Ex: 'Solicitacao', 'Beneficio'

  @Column({ type: 'boolean', default: true })
  requer_aprovacao: boolean;

  @Column({ type: 'boolean', default: true })
  ativo: boolean;

  @Column({ type: 'jsonb', nullable: true })
  metadados: Record<string, any>;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
```

### 2. SolicitacaoAprovacao

```typescript
@Entity('solicitacoes_aprovacao')
export class SolicitacaoAprovacao {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => AcaoCritica)
  @JoinColumn({ name: 'acao_critica_id' })
  acao_critica: AcaoCritica;

  @Column({ type: 'uuid' })
  acao_critica_id: string;

  @Column({ type: 'uuid' })
  solicitante_id: string;

  @Column({ type: 'uuid' })
  entidade_alvo_id: string;

  @Column({ type: 'varchar', length: 100 })
  entidade_alvo_tipo: string;

  @Column({ type: 'text' })
  justificativa: string;

  @Column({ type: 'jsonb' })
  dados_contexto: Record<string, any>;

  @Column({ type: 'jsonb' })
  dados_acao: Record<string, any>; // Parâmetros para execução da ação

  @Column({
    type: 'enum',
    enum: StatusSolicitacaoAprovacao,
    default: StatusSolicitacaoAprovacao.PENDENTE
  })
  status: StatusSolicitacaoAprovacao;

  @Column({ type: 'timestamp', nullable: true })
  prazo_limite: Date;

  @Column({ type: 'timestamp', nullable: true })
  data_processamento: Date;

  @Column({ type: 'timestamp', nullable: true })
  data_execucao: Date;

  @Column({ type: 'text', nullable: true })
  observacoes_processamento: string;

  @Column({ type: 'uuid', nullable: true })
  processado_por: string;

  @Column({ type: 'varchar', length: 45, nullable: true })
  ip_origem: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  user_agent: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
```

### 3. ConfiguracaoAprovacao

```typescript
@Entity('configuracoes_aprovacao')
export class ConfiguracaoAprovacao {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => AcaoCritica)
  @JoinColumn({ name: 'acao_critica_id' })
  acao_critica: AcaoCritica;

  @Column({ type: 'uuid' })
  acao_critica_id: string;

  @Column({
    type: 'enum',
    enum: EstrategiaAprovacao,
    default: EstrategiaAprovacao.QUALQUER_UM
  })
  estrategia_aprovacao: EstrategiaAprovacao;

  @Column({ type: 'int', default: 1 })
  numero_aprovadores_necessarios: number;

  @Column({ type: 'int', default: 24 })
  prazo_horas: number;

  @Column({ type: 'boolean', default: false })
  permite_auto_aprovacao: boolean;

  @Column({ type: 'jsonb', nullable: true })
  condicoes_auto_aprovacao: Record<string, any>;

  @Column({ type: 'boolean', default: true })
  escalacao_ativa: boolean;

  @Column({ type: 'int', default: 48 })
  prazo_escalacao_horas: number;

  @Column({ type: 'jsonb', nullable: true })
  configuracao_escalacao: Record<string, any>;

  @Column({ type: 'boolean', default: true })
  ativo: boolean;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
```

### 4. Aprovador

```typescript
@Entity('aprovadores')
export class Aprovador {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => ConfiguracaoAprovacao)
  @JoinColumn({ name: 'configuracao_aprovacao_id' })
  configuracao_aprovacao: ConfiguracaoAprovacao;

  @Column({ type: 'uuid' })
  configuracao_aprovacao_id: string;

  @Column({ type: 'uuid', nullable: true })
  usuario_id: string; // Aprovador específico

  @Column({ type: 'varchar', length: 50, nullable: true })
  role_aprovador: string; // Role que pode aprovar

  @Column({ type: 'varchar', length: 100, nullable: true })
  permissao_aprovador: string; // Permissão específica

  @Column({
    type: 'enum',
    enum: TipoEscopo,
    default: TipoEscopo.GLOBAL
  })
  escopo_aprovacao: TipoEscopo;

  @Column({ type: 'uuid', nullable: true })
  escopo_id: string; // ID da unidade, se escopo for UNIDADE

  @Column({ type: 'int', default: 1 })
  ordem_hierarquica: number;

  @Column({ type: 'boolean', default: true })
  ativo: boolean;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
```

### 5. HistoricoAprovacao

```typescript
@Entity('historico_aprovacao')
export class HistoricoAprovacao {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => SolicitacaoAprovacao)
  @JoinColumn({ name: 'solicitacao_aprovacao_id' })
  solicitacao_aprovacao: SolicitacaoAprovacao;

  @Column({ type: 'uuid' })
  solicitacao_aprovacao_id: string;

  @Column({ type: 'uuid' })
  aprovador_id: string;

  @Column({
    type: 'enum',
    enum: TipoAcaoAprovacao,
  })
  acao: TipoAcaoAprovacao; // APROVADO, NEGADO, ESCALADO

  @Column({ type: 'text', nullable: true })
  justificativa: string;

  @Column({ type: 'jsonb', nullable: true })
  dados_contexto: Record<string, any>;

  @Column({ type: 'varchar', length: 45, nullable: true })
  ip_origem: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  user_agent: string;

  @CreateDateColumn()
  created_at: Date;
}
```

## Enums e Constantes

### StatusSolicitacaoAprovacao

```typescript
export enum StatusSolicitacaoAprovacao {
  PENDENTE = 'pendente',
  EM_ANALISE = 'em_analise',
  APROVADO = 'aprovado',
  NEGADO = 'negado',
  EXPIRADO = 'expirado',
  ESCALADO = 'escalado',
  EXECUTADO = 'executado',
  CANCELADO = 'cancelado'
}
```

### EstrategiaAprovacao

```typescript
export enum EstrategiaAprovacao {
  QUALQUER_UM = 'qualquer_um',        // Qualquer aprovador pode aprovar
  UNANIME = 'unanime',                 // Todos os aprovadores devem aprovar
  MAIORIA = 'maioria',                 // Maioria dos aprovadores
  HIERARQUICA = 'hierarquica',         // Seguir ordem hierárquica
  NUMERO_MINIMO = 'numero_minimo'      // Número mínimo de aprovações
}
```

### TipoAcaoCritica

```typescript
export enum TipoAcaoCritica {
  // Solicitações
  CANCELAR_SOLICITACAO = 'CANCELAR_SOLICITACAO',
  SUSPENDER_SOLICITACAO = 'SUSPENDER_SOLICITACAO',
  REATIVAR_SOLICITACAO = 'REATIVAR_SOLICITACAO',
  
  // Benefícios
  SUSPENDER_BENEFICIO = 'SUSPENDER_BENEFICIO',
  BLOQUEAR_BENEFICIO = 'BLOQUEAR_BENEFICIO',
  DESBLOQUEAR_BENEFICIO = 'DESBLOQUEAR_BENEFICIO',
  LIBERAR_BENEFICIO = 'LIBERAR_BENEFICIO',
  CANCELAR_BENEFICIO = 'CANCELAR_BENEFICIO',
  
  // Cidadãos
  INATIVAR_CIDADAO = 'INATIVAR_CIDADAO',
  REATIVAR_CIDADAO = 'REATIVAR_CIDADAO',
  EXCLUIR_CIDADAO = 'EXCLUIR_CIDADAO',
  
  // Usuários
  INATIVAR_USUARIO = 'INATIVAR_USUARIO',
  REATIVAR_USUARIO = 'REATIVAR_USUARIO',
  ALTERAR_PERMISSOES = 'ALTERAR_PERMISSOES',
  
  // Documentos
  EXCLUIR_DOCUMENTO = 'EXCLUIR_DOCUMENTO',
  SUBSTITUIR_DOCUMENTO = 'SUBSTITUIR_DOCUMENTO',
  
  // Configurações
  ALTERAR_CONFIGURACAO_CRITICA = 'ALTERAR_CONFIGURACAO_CRITICA'
}
```

## Decorators e Interceptors

### @RequerAprovacao Decorator

```typescript
import { SetMetadata } from '@nestjs/common';
import { TipoAcaoCritica } from '../enums/tipo-acao-critica.enum';

export interface ConfiguracaoAprovacaoMetadata {
  acao: TipoAcaoCritica;
  entidadeAlvo?: string;
  permitirAutoAprovacao?: boolean;
  condicoesAutoAprovacao?: (context: any) => boolean;
}

export const APROVACAO_METADATA_KEY = 'aprovacao_config';

/**
 * Decorator para marcar métodos que requerem aprovação
 * 
 * @param config Configuração da aprovação
 */
export const RequerAprovacao = (config: ConfiguracaoAprovacaoMetadata) =>
  SetMetadata(APROVACAO_METADATA_KEY, config);

// Exemplo de uso:
// @RequerAprovacao({
//   acao: TipoAcaoCritica.CANCELAR_SOLICITACAO,
//   entidadeAlvo: 'Solicitacao',
//   permitirAutoAprovacao: true,
//   condicoesAutoAprovacao: (context) => context.usuario.role === 'ADMIN'
// })
// async cancelarSolicitacao(id: string, justificativa: string) {
//   // Implementação
// }
```

### AcaoCriticaInterceptor

```typescript
import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { AprovacaoService } from '../services/aprovacao.service';
import { APROVACAO_METADATA_KEY, ConfiguracaoAprovacaoMetadata } from '../decorators/requer-aprovacao.decorator';

@Injectable()
export class AcaoCriticaInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    private readonly aprovacaoService: AprovacaoService,
  ) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<any>> {
    const aprovacaoConfig = this.reflector.get<ConfiguracaoAprovacaoMetadata>(
      APROVACAO_METADATA_KEY,
      context.getHandler(),
    );

    if (!aprovacaoConfig) {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest();
    const usuario = request.user;
    const args = context.getArgs();

    // Verificar se a ação requer aprovação
    const requerAprovacao = await this.aprovacaoService.verificarSeRequerAprovacao(
      aprovacaoConfig.acao,
      usuario,
      args,
    );

    if (!requerAprovacao) {
      // Executar ação diretamente
      return next.handle().pipe(
        tap(() => {
          // Registrar execução direta na auditoria
          this.aprovacaoService.registrarExecucaoDireta(
            aprovacaoConfig.acao,
            usuario,
            args,
          );
        }),
      );
    }

    // Criar solicitação de aprovação
    const solicitacao = await this.aprovacaoService.criarSolicitacaoAprovacao({
      acao: aprovacaoConfig.acao,
      solicitante: usuario,
      dadosAcao: args,
      entidadeAlvo: aprovacaoConfig.entidadeAlvo,
    });

    // Retornar informações da solicitação criada
    return new Observable(observer => {
      observer.next({
        message: 'Solicitação de aprovação criada com sucesso',
        solicitacao_id: solicitacao.id,
        status: 'pendente_aprovacao',
        prazo_limite: solicitacao.prazo_limite,
      });
      observer.complete();
    });
  }
}
```

## Serviços Principais

### AprovacaoService

```typescript
@Injectable()
export class AprovacaoService {
  constructor(
    @InjectRepository(SolicitacaoAprovacao)
    private readonly solicitacaoRepository: Repository<SolicitacaoAprovacao>,
    @InjectRepository(ConfiguracaoAprovacao)
    private readonly configuracaoRepository: Repository<ConfiguracaoAprovacao>,
    private readonly workflowService: WorkflowAprovacaoService,
    private readonly notificacaoService: NotificationManagerService,
    private readonly auditoriaService: AuditoriaService,
    private readonly executorService: ExecutorAcaoService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Verifica se uma ação requer aprovação para o usuário específico
   */
  async verificarSeRequerAprovacao(
    tipoAcao: TipoAcaoCritica,
    usuario: Usuario,
    contexto: any,
  ): Promise<boolean> {
    const configuracao = await this.obterConfiguracaoAprovacao(tipoAcao);
    
    if (!configuracao || !configuracao.ativo) {
      return false;
    }

    // Verificar auto-aprovação
    if (configuracao.permite_auto_aprovacao) {
      const podeAutoAprovar = await this.verificarAutoAprovacao(
        configuracao,
        usuario,
        contexto,
      );
      if (podeAutoAprovar) {
        return false;
      }
    }

    return true;
  }

  /**
   * Cria uma nova solicitação de aprovação
   */
  async criarSolicitacaoAprovacao(
    dados: CriarSolicitacaoAprovacaoDto,
  ): Promise<SolicitacaoAprovacao> {
    const configuracao = await this.obterConfiguracaoAprovacao(dados.acao);
    
    if (!configuracao) {
      throw new BadRequestException('Configuração de aprovação não encontrada');
    }

    const prazoLimite = new Date();
    prazoLimite.setHours(prazoLimite.getHours() + configuracao.prazo_horas);

    const solicitacao = this.solicitacaoRepository.create({
      acao_critica_id: configuracao.acao_critica_id,
      solicitante_id: dados.solicitante.id,
      entidade_alvo_id: dados.entidadeAlvoId,
      entidade_alvo_tipo: dados.entidadeAlvoTipo,
      justificativa: dados.justificativa,
      dados_contexto: dados.dadosContexto,
      dados_acao: dados.dadosAcao,
      prazo_limite: prazoLimite,
      ip_origem: dados.ipOrigem,
      user_agent: dados.userAgent,
    });

    const solicitacaoSalva = await this.solicitacaoRepository.save(solicitacao);

    // Emitir evento
    this.eventEmitter.emit('solicitacao-aprovacao.criada', {
      solicitacao: solicitacaoSalva,
      configuracao,
    });

    // Agendar verificação de prazo
    await this.agendarVerificacaoPrazo(solicitacaoSalva);

    return solicitacaoSalva;
  }

  /**
   * Processa uma decisão de aprovação
   */
  async processarAprovacao(
    solicitacaoId: string,
    aprovadorId: string,
    decisao: TipoAcaoAprovacao,
    justificativa?: string,
  ): Promise<SolicitacaoAprovacao> {
    const solicitacao = await this.solicitacaoRepository.findOne({
      where: { id: solicitacaoId },
      relations: ['acao_critica'],
    });

    if (!solicitacao) {
      throw new NotFoundException('Solicitação não encontrada');
    }

    if (solicitacao.status !== StatusSolicitacaoAprovacao.PENDENTE) {
      throw new BadRequestException('Solicitação não está pendente');
    }

    // Verificar se o usuário pode aprovar
    const podeAprovar = await this.verificarPermissaoAprovacao(
      solicitacao,
      aprovadorId,
    );

    if (!podeAprovar) {
      throw new ForbiddenException('Usuário não autorizado a aprovar esta solicitação');
    }

    // Registrar decisão no histórico
    await this.registrarHistoricoAprovacao({
      solicitacao_aprovacao_id: solicitacaoId,
      aprovador_id: aprovadorId,
      acao: decisao,
      justificativa,
    });

    // Processar decisão
    const resultado = await this.workflowService.processarDecisao(
      solicitacao,
      decisao,
      aprovadorId,
    );

    // Atualizar status da solicitação
    solicitacao.status = resultado.novoStatus;
    solicitacao.data_processamento = new Date();
    solicitacao.processado_por = aprovadorId;
    solicitacao.observacoes_processamento = justificativa;

    const solicitacaoAtualizada = await this.solicitacaoRepository.save(solicitacao);

    // Se aprovado, executar ação
    if (resultado.novoStatus === StatusSolicitacaoAprovacao.APROVADO) {
      await this.executorService.executarAcao(solicitacaoAtualizada);
    }

    // Emitir evento
    this.eventEmitter.emit('aprovacao.processada', {
      solicitacao: solicitacaoAtualizada,
      decisao,
      aprovador_id: aprovadorId,
    });

    return solicitacaoAtualizada;
  }
}
```

## Sistema de Filas e Processamento Assíncrono

### AprovacaoQueueProcessor

```typescript
import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bull';
import { Injectable, Logger } from '@nestjs/common';
import { APROVACAO_QUEUE } from '../constants/queue.constants';

@Processor(APROVACAO_QUEUE)
@Injectable()
export class AprovacaoQueueProcessor {
  private readonly logger = new Logger(AprovacaoQueueProcessor.name);

  constructor(
    private readonly notificacaoService: NotificationManagerService,
    private readonly escalacaoService: EscalacaoService,
  ) {}

  @Process('notificar-aprovadores')
  async notificarAprovadores(job: Job<{ solicitacaoId: string }>) {
    const { solicitacaoId } = job.data;
    
    try {
      await this.notificacaoService.notificarAprovadores(solicitacaoId);
      this.logger.log(`Aprovadores notificados para solicitação ${solicitacaoId}`);
    } catch (error) {
      this.logger.error(`Erro ao notificar aprovadores: ${error.message}`);
      throw error;
    }
  }

  @Process('verificar-prazo')
  async verificarPrazo(job: Job<{ solicitacaoId: string }>) {
    const { solicitacaoId } = job.data;
    
    try {
      await this.escalacaoService.verificarPrazoExpirado(solicitacaoId);
      this.logger.log(`Prazo verificado para solicitação ${solicitacaoId}`);
    } catch (error) {
      this.logger.error(`Erro ao verificar prazo: ${error.message}`);
      throw error;
    }
  }

  @Process('escalar-aprovacao')
  async escalarAprovacao(job: Job<{ solicitacaoId: string; motivo: string }>) {
    const { solicitacaoId, motivo } = job.data;
    
    try {
      await this.escalacaoService.escalarAprovacao(solicitacaoId, motivo);
      this.logger.log(`Aprovação escalada para solicitação ${solicitacaoId}`);
    } catch (error) {
      this.logger.error(`Erro ao escalar aprovação: ${error.message}`);
      throw error;
    }
  }
}
```

## Integração com Sistema de Notificações

### Templates de Notificação

```typescript
// Template para notificação de nova solicitação
export const TEMPLATE_NOVA_SOLICITACAO_APROVACAO = {
  codigo: 'NOVA_SOLICITACAO_APROVACAO',
  nome: 'Nova Solicitação de Aprovação',
  assunto: 'Nova solicitação de aprovação pendente',
  conteudo_email: `
    <h2>Nova Solicitação de Aprovação</h2>
    <p>Uma nova solicitação de aprovação foi criada e requer sua análise:</p>
    
    <div style="background: #f5f5f5; padding: 15px; margin: 10px 0; border-radius: 5px;">
      <strong>Ação:</strong> {{acao_nome}}<br>
      <strong>Solicitante:</strong> {{solicitante_nome}}<br>
      <strong>Justificativa:</strong> {{justificativa}}<br>
      <strong>Prazo Limite:</strong> {{prazo_limite}}
    </div>
    
    <p>Para processar esta solicitação, acesse o sistema através do link abaixo:</p>
    <a href="{{link_aprovacao}}" style="background: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Processar Aprovação</a>
  `,
  conteudo_sms: 'Nova solicitação de aprovação: {{acao_nome}}. Prazo: {{prazo_limite}}. Acesse o sistema para processar.',
  variaveis: [
    'acao_nome',
    'solicitante_nome', 
    'justificativa',
    'prazo_limite',
    'link_aprovacao'
  ]
};

// Template para notificação de aprovação processada
export const TEMPLATE_APROVACAO_PROCESSADA = {
  codigo: 'APROVACAO_PROCESSADA',
  nome: 'Aprovação Processada',
  assunto: 'Sua solicitação de aprovação foi {{status}}',
  conteudo_email: `
    <h2>Solicitação {{status}}</h2>
    <p>Sua solicitação de aprovação foi processada:</p>
    
    <div style="background: #f5f5f5; padding: 15px; margin: 10px 0; border-radius: 5px;">
      <strong>Ação:</strong> {{acao_nome}}<br>
      <strong>Status:</strong> {{status}}<br>
      <strong>Processado por:</strong> {{aprovador_nome}}<br>
      <strong>Data:</strong> {{data_processamento}}<br>
      {{#if justificativa}}<strong>Justificativa:</strong> {{justificativa}}{{/if}}
    </div>
    
    {{#if status_aprovado}}
    <p style="color: green;">✅ Sua solicitação foi aprovada e a ação será executada automaticamente.</p>
    {{else}}
    <p style="color: red;">❌ Sua solicitação foi negada. Entre em contato com o aprovador para mais informações.</p>
    {{/if}}
  `,
  variaveis: [
    'acao_nome',
    'status',
    'aprovador_nome',
    'data_processamento',
    'justificativa',
    'status_aprovado'
  ]
};
```

## Estratégias de Aprovação

### AprovacaoUnânimeStrategy

```typescript
@Injectable()
export class AprovacaoUnânimeStrategy implements EstrategiaAprovacaoInterface {
  async processarDecisao(
    solicitacao: SolicitacaoAprovacao,
    decisao: TipoAcaoAprovacao,
    aprovadorId: string,
  ): Promise<ResultadoProcessamento> {
    const configuracao = await this.obterConfiguracao(solicitacao.acao_critica_id);
    const aprovadores = await this.obterAprovadores(configuracao.id);
    const historicoAprovacao = await this.obterHistoricoAprovacao(solicitacao.id);

    if (decisao === TipoAcaoAprovacao.NEGADO) {
      return {
        novoStatus: StatusSolicitacaoAprovacao.NEGADO,
        finalizada: true,
        motivo: 'Solicitação negada por um dos aprovadores'
      };
    }

    const aprovacoesNecessarias = aprovadores.length;
    const aprovacoesRecebidas = historicoAprovacao.filter(
      h => h.acao === TipoAcaoAprovacao.APROVADO
    ).length + 1; // +1 pela aprovação atual

    if (aprovacoesRecebidas >= aprovacoesNecessarias) {
      return {
        novoStatus: StatusSolicitacaoAprovacao.APROVADO,
        finalizada: true,
        motivo: 'Todos os aprovadores aprovaram a solicitação'
      };
    }

    return {
      novoStatus: StatusSolicitacaoAprovacao.EM_ANALISE,
      finalizada: false,
      motivo: `Aguardando aprovação de ${aprovacoesNecessarias - aprovacoesRecebidas} aprovador(es)`
    };
  }
}
```

## Sistema de Auditoria Integrado

### AuditoriaAprovacaoInterceptor

```typescript
@Injectable()
export class AuditoriaAprovacaoInterceptor implements NestInterceptor {
  constructor(
    private readonly auditoriaService: AuditoriaService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const usuario = request.user;
    const metodo = context.getHandler().name;
    const classe = context.getClass().name;

    return next.handle().pipe(
      tap(async (resultado) => {
        // Registrar operação de aprovação na auditoria
        await this.auditoriaService.registrarOperacao({
          tipo_operacao: TipoOperacao.APPROVAL_ACTION,
          entidade_afetada: 'SolicitacaoAprovacao',
          entidade_id: resultado?.id || resultado?.solicitacao_id,
          usuario_id: usuario?.id,
          descricao: `${metodo} executado em ${classe}`,
          dados_novos: resultado,
          ip_origem: request.ip,
          user_agent: request.headers['user-agent'],
          nivel_risco: 'HIGH', // Operações de aprovação são sempre de alto risco
          dados_sensiveis_acessados: this.extrairDadosSensiveis(resultado),
        });
      }),
      catchError(async (error) => {
        // Registrar tentativa de operação com erro
        await this.auditoriaService.registrarOperacao({
          tipo_operacao: TipoOperacao.APPROVAL_ACTION_FAILED,
          entidade_afetada: 'SolicitacaoAprovacao',
          usuario_id: usuario?.id,
          descricao: `Falha em ${metodo} - ${error.message}`,
          ip_origem: request.ip,
          user_agent: request.headers['user-agent'],
          nivel_risco: 'CRITICAL',
        });
        throw error;
      }),
    );
  }

  private extrairDadosSensiveis(dados: any): string[] {
    const camposSensiveis = [];
    
    if (dados?.dados_acao) {
      camposSensiveis.push('dados_acao');
    }
    
    if (dados?.justificativa) {
      camposSensiveis.push('justificativa');
    }
    
    return camposSensiveis;
  }
}
```

## API Controllers

### AprovacaoController

```typescript
@Controller('aprovacao')
@UseGuards(JwtAuthGuard, PermissionGuard)
@UseInterceptors(AuditoriaAprovacaoInterceptor)
@ApiTags('Aprovação')
export class AprovacaoController {
  constructor(
    private readonly aprovacaoService: AprovacaoService,
  ) {}

  @Get('pendentes')
  @RequiresPermission('LISTAR_APROVACOES_PENDENTES')
  @ApiOperation({ summary: 'Listar aprovações pendentes para o usuário' })
  async listarAprovacoesPendentes(
    @GetUser() usuario: Usuario,
    @Query() filtros: FiltrosAprovacaoDto,
  ) {
    return this.aprovacaoService.listarAprovacoesPendentes(usuario.id, filtros);
  }

  @Get(':id')
  @RequiresPermission('VISUALIZAR_APROVACAO')
  @ApiOperation({ summary: 'Obter detalhes de uma solicitação de aprovação' })
  async obterAprovacao(
    @Param('id', ParseUUIDPipe) id: string,
    @GetUser() usuario: Usuario,
  ) {
    return this.aprovacaoService.obterAprovacao(id, usuario.id);
  }

  @Post(':id/processar')
  @RequiresPermission('PROCESSAR_APROVACAO')
  @ApiOperation({ summary: 'Processar uma solicitação de aprovação' })
  async processarAprovacao(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dados: ProcessarAprovacaoDto,
    @GetUser() usuario: Usuario,
  ) {
    return this.aprovacaoService.processarAprovacao(
      id,
      usuario.id,
      dados.decisao,
      dados.justificativa,
    );
  }

  @Get(':id/historico')
  @RequiresPermission('VISUALIZAR_HISTORICO_APROVACAO')
  @ApiOperation({ summary: 'Obter histórico de uma aprovação' })
  async obterHistoricoAprovacao(
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.aprovacaoService.obterHistoricoAprovacao(id);
  }

  @Post('solicitar')
  @RequiresPermission('SOLICITAR_APROVACAO')
  @ApiOperation({ summary: 'Criar nova solicitação de aprovação manualmente' })
  async solicitarAprovacao(
    @Body() dados: CriarSolicitacaoAprovacaoDto,
    @GetUser() usuario: Usuario,
    @GetClientInfo() clientInfo: ClientInfo,
  ) {
    return this.aprovacaoService.criarSolicitacaoAprovacao({
      ...dados,
      solicitante: usuario,
      ipOrigem: clientInfo.ip,
      userAgent: clientInfo.userAgent,
    });
  }
}
```

### ConfiguracaoAprovacaoController

```typescript
@Controller('aprovacao/configuracao')
@UseGuards(JwtAuthGuard, PermissionGuard)
@UseInterceptors(AuditoriaAprovacaoInterceptor)
@ApiTags('Configuração de Aprovação')
export class ConfiguracaoAprovacaoController {
  constructor(
    private readonly configuracaoService: ConfiguracaoAprovacaoService,
  ) {}

  @Get('acoes-criticas')
  @RequiresPermission('LISTAR_ACOES_CRITICAS')
  @ApiOperation({ summary: 'Listar todas as ações críticas configuradas' })
  async listarAcoesCriticas() {
    return this.configuracaoService.listarAcoesCriticas();
  }

  @Post('acoes-criticas')
  @RequiresPermission('CONFIGURAR_ACAO_CRITICA')
  @ApiOperation({ summary: 'Configurar uma nova ação crítica' })
  async configurarAcaoCritica(
    @Body() dados: ConfigurarAcaoCriticaDto,
  ) {
    return this.configuracaoService.configurarAcaoCritica(dados);
  }

  @Put('acoes-criticas/:id')
  @RequiresPermission('CONFIGURAR_ACAO_CRITICA')
  @ApiOperation({ summary: 'Atualizar configuração de ação crítica' })
  async atualizarConfiguracaoAcao(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dados: AtualizarConfiguracaoAcaoDto,
  ) {
    return this.configuracaoService.atualizarConfiguracaoAcao(id, dados);
  }

  @Post(':acaoId/aprovadores')
  @RequiresPermission('DEFINIR_APROVADORES')
  @ApiOperation({ summary: 'Definir aprovadores para uma ação crítica' })
  async definirAprovadores(
    @Param('acaoId', ParseUUIDPipe) acaoId: string,
    @Body() dados: DefinirAprovadoresDto,
  ) {
    return this.configuracaoService.definirAprovadores(acaoId, dados);
  }

  @Get('relatorio')
  @RequiresPermission('VISUALIZAR_RELATORIO_APROVACAO')
  @ApiOperation({ summary: 'Gerar relatório de aprovações' })
  async gerarRelatorioAprovacoes(
    @Query() filtros: FiltrosRelatorioAprovacaoDto,
  ) {
    return this.configuracaoService.gerarRelatorioAprovacoes(filtros);
  }
}
```

## Exemplo de Uso Prático

### Implementação no Módulo de Solicitação

```typescript
// solicitacao.service.ts
@Injectable()
export class SolicitacaoService {
  constructor(
    @InjectRepository(Solicitacao)
    private readonly solicitacaoRepository: Repository<Solicitacao>,
    private readonly aprovacaoService: AprovacaoService,
  ) {}

  @RequerAprovacao({
    acao: TipoAcaoCritica.CANCELAR_SOLICITACAO,
    entidadeAlvo: 'Solicitacao',
    permitirAutoAprovacao: true,
    condicoesAutoAprovacao: (context) => {
      // Administradores podem cancelar diretamente
      return context.usuario.role === 'ADMIN';
    }
  })
  async cancelarSolicitacao(
    id: string,
    justificativa: string,
    @GetUser() usuario: Usuario,
  ): Promise<Solicitacao> {
    // Esta implementação só será executada se:
    // 1. A ação não requer aprovação OU
    // 2. O usuário tem permissão para auto-aprovação OU
    // 3. A aprovação já foi concedida
    
    const solicitacao = await this.solicitacaoRepository.findOne({
      where: { id },
    });

    if (!solicitacao) {
      throw new NotFoundException('Solicitação não encontrada');
    }

    if (solicitacao.status === StatusSolicitacao.CANCELADA) {
      throw new BadRequestException('Solicitação já está cancelada');
    }

    // Executar cancelamento
    solicitacao.status = StatusSolicitacao.CANCELADA;
    solicitacao.observacoes = justificativa;
    solicitacao.cancelado_por = usuario.id;
    solicitacao.data_cancelamento = new Date();

    const solicitacaoAtualizada = await this.solicitacaoRepository.save(solicitacao);

    // Registrar na auditoria
    await this.auditoriaService.registrarOperacao({
      tipo_operacao: TipoOperacao.UPDATE,
      entidade_afetada: 'Solicitacao',
      entidade_id: id,
      usuario_id: usuario.id,
      descricao: `Solicitação cancelada: ${justificativa}`,
      dados_anteriores: { status: solicitacao.status },
      dados_novos: { status: StatusSolicitacao.CANCELADA },
    });

    return solicitacaoAtualizada;
  }
}
```

## Configuração do Módulo

### AprovacaoModule

```typescript
@Module({
  imports: [
    TypeOrmModule.forFeature([
      AcaoCritica,
      SolicitacaoAprovacao,
      ConfiguracaoAprovacao,
      Aprovador,
      HistoricoAprovacao,
      EscalacaoAprovacao,
    ]),
    BullModule.registerQueue({
      name: APROVACAO_QUEUE,
      defaultJobOptions: {
        removeOnComplete: 100,
        removeOnFail: 50,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
      },
    }),
    EventEmitterModule,
    forwardRef(() => NotificacaoModule),
    forwardRef(() => AuditoriaModule),
    forwardRef(() => UsuarioModule),
  ],
  controllers: [
    AprovacaoController,
    ConfiguracaoAprovacaoController,
    SolicitacaoAprovacaoController,
    WorkflowAprovacaoController,
  ],
  providers: [
    // Serviços principais
    AprovacaoService,
    ConfiguracaoAprovacaoService,
    WorkflowAprovacaoService,
    EscalacaoService,
    ExecutorAcaoService,
    AprovacaoMetricsService,
    
    // Estratégias de aprovação
    AprovacaoUnânimeStrategy,
    AprovacaoMaioriaStrategy,
    AprovacaoQualquerUmStrategy,
    AprovacaoHierarquicaStrategy,
    
    // Processadores de fila
    AprovacaoQueueProcessor,
    EscalacaoQueueProcessor,
    ExecucaoAcaoProcessor,
    
    // Listeners de eventos
    AprovacaoEventsListener,
    NotificacaoAprovacaoListener,
    EscalacaoAprovacaoListener,
    
    // Interceptors
    {
      provide: APP_INTERCEPTOR,
      useClass: AcaoCriticaInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: AuditoriaAprovacaoInterceptor,
    },
    
    // Repositórios
    AcaoCriticaRepository,
    SolicitacaoAprovacaoRepository,
    ConfiguracaoAprovacaoRepository,
    HistoricoAprovacaoRepository,
  ],
  exports: [
    AprovacaoService,
    ConfiguracaoAprovacaoService,
    WorkflowAprovacaoService,
  ],
})
export class AprovacaoModule implements OnModuleInit {
  constructor(
    private readonly configuracaoService: ConfiguracaoAprovacaoService,
  ) {}

  async onModuleInit() {
    // Inicializar configurações padrão
    await this.configuracaoService.inicializarConfiguracoesPadrao();
  }
}
```

## Migrations

### CreateAprovacaoSchema

```typescript
import { MigrationInterface, QueryRunner, Table, Index, ForeignKey } from 'typeorm';

export class CreateAprovacaoSchema1750000000000 implements MigrationInterface {
  name = 'CreateAprovacaoSchema1750000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Criar tabela acoes_criticas
    await queryRunner.createTable(
      new Table({
        name: 'acoes_criticas',
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
            name: 'modulo',
            type: 'varchar',
            length: '100',
          },
          {
            name: 'entidade_alvo',
            type: 'varchar',
            length: '100',
          },
          {
            name: 'requer_aprovacao',
            type: 'boolean',
            default: true,
          },
          {
            name: 'ativo',
            type: 'boolean',
            default: true,
          },
          {
            name: 'metadados',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'timestamptz',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updated_at',
            type: 'timestamptz',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    // Criar índices para acoes_criticas
    await queryRunner.createIndex(
      'acoes_criticas',
      new Index('IDX_acoes_criticas_codigo', ['codigo']),
    );
    await queryRunner.createIndex(
      'acoes_criticas',
      new Index('IDX_acoes_criticas_modulo', ['modulo']),
    );
    await queryRunner.createIndex(
      'acoes_criticas',
      new Index('IDX_acoes_criticas_ativo', ['ativo']),
    );

    // Criar tabela solicitacoes_aprovacao
    await queryRunner.createTable(
      new Table({
        name: 'solicitacoes_aprovacao',
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
            name: 'solicitante_id',
            type: 'uuid',
          },
          {
            name: 'entidade_alvo_id',
            type: 'uuid',
          },
          {
            name: 'entidade_alvo_tipo',
            type: 'varchar',
            length: '100',
          },
          {
            name: 'justificativa',
            type: 'text',
          },
          {
            name: 'dados_contexto',
            type: 'jsonb',
          },
          {
            name: 'dados_acao',
            type: 'jsonb',
          },
          {
            name: 'status',
            type: 'enum',
            enum: [
              'pendente',
              'em_analise',
              'aprovado',
              'negado',
              'expirado',
              'escalado',
              'executado',
              'cancelado',
            ],
            default: "'pendente'",
          },
          {
            name: 'prazo_limite',
            type: 'timestamptz',
            isNullable: true,
          },
          {
            name: 'data_processamento',
            type: 'timestamptz',
            isNullable: true,
          },
          {
            name: 'data_execucao',
            type: 'timestamptz',
            isNullable: true,
          },
          {
            name: 'observacoes_processamento',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'processado_por',
            type: 'uuid',
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
            type: 'varchar',
            length: '500',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'timestamptz',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updated_at',
            type: 'timestamptz',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    // Criar foreign keys
    await queryRunner.createForeignKey(
      'solicitacoes_aprovacao',
      new ForeignKey({
        columnNames: ['acao_critica_id'],
        referencedTableName: 'acoes_criticas',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'solicitacoes_aprovacao',
      new ForeignKey({
        columnNames: ['solicitante_id'],
        referencedTableName: 'usuarios',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'solicitacoes_aprovacao',
      new ForeignKey({
        columnNames: ['processado_por'],
        referencedTableName: 'usuarios',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
      }),
    );

    // Criar índices para solicitacoes_aprovacao
    await queryRunner.createIndex(
      'solicitacoes_aprovacao',
      new Index('IDX_solicitacoes_aprovacao_prazo', ['prazo_limite']),
    );
    await queryRunner.createIndex(
      'solicitacoes_aprovacao',
      new Index('IDX_solicitacoes_aprovacao_entidade', ['entidade_alvo_tipo', 'entidade_alvo_id']),
    );

    // Inserir ações críticas padrão
    await queryRunner.query(`
      INSERT INTO acoes_criticas (codigo, nome, descricao, modulo, entidade_alvo, requer_aprovacao, ativo)
      VALUES 
        ('CANCELAR_SOLICITACAO', 'Cancelar Solicitação', 'Cancelamento de solicitação de benefício', 'solicitacao', 'Solicitacao', true, true),
        ('SUSPENDER_BENEFICIO', 'Suspender Benefício', 'Suspensão temporária de benefício', 'beneficio', 'Beneficio', true, true),
        ('BLOQUEAR_BENEFICIO', 'Bloquear Benefício', 'Bloqueio de benefício por irregularidade', 'beneficio', 'Beneficio', true, true),
        ('DESBLOQUEAR_BENEFICIO', 'Desbloquear Benefício', 'Desbloqueio de benefício', 'beneficio', 'Beneficio', true, true),
        ('INATIVAR_CIDADAO', 'Inativar Cidadão', 'Inativação de cadastro de cidadão', 'cidadao', 'Cidadao', true, true),
        ('EXCLUIR_DOCUMENTO', 'Excluir Documento', 'Exclusão de documento do sistema', 'documento', 'Documento', true, true)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('solicitacoes_aprovacao');
    await queryRunner.dropTable('acoes_criticas');
  }
}
```

## Configurações Padrão

### Inicialização do Sistema

```typescript
@Injectable()
export class ConfiguracaoAprovacaoService {
  async inicializarConfiguracoesPadrao(): Promise<void> {
    const acoesExistentes = await this.acaoCriticaRepository.count();
    
    if (acoesExistentes === 0) {
      await this.criarConfiguracoesPadrao();
    }
  }

  private async criarConfiguracoesPadrao(): Promise<void> {
    const configuracoesPadrao = [
      {
        acao: TipoAcaoCritica.CANCELAR_SOLICITACAO,
        estrategia: EstrategiaAprovacao.QUALQUER_UM,
        prazoHoras: 24,
        aprovadores: [
          { role: 'GESTOR', escopo: TipoEscopo.UNIDADE },
          { role: 'SUPERVISOR', escopo: TipoEscopo.GLOBAL }
        ]
      },
      {
        acao: TipoAcaoCritica.SUSPENDER_BENEFICIO,
        estrategia: EstrategiaAprovacao.MAIORIA,
        prazoHoras: 48,
        aprovadores: [
          { role: 'COORDENADOR', escopo: TipoEscopo.UNIDADE },
          { role: 'DIRETOR', escopo: TipoEscopo.GLOBAL }
        ]
      }
    ];

    for (const config of configuracoesPadrao) {
      await this.criarConfiguracaoCompleta(config);
    }
  }
}
```

## Testes

### Testes Unitários

```typescript
describe('AprovacaoService', () => {
  let service: AprovacaoService;
  let mockRepository: MockRepository<SolicitacaoAprovacao>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        AprovacaoService,
        {
          provide: getRepositoryToken(SolicitacaoAprovacao),
          useValue: createMockRepository(),
        },
      ],
    }).compile();

    service = module.get<AprovacaoService>(AprovacaoService);
    mockRepository = module.get(getRepositoryToken(SolicitacaoAprovacao));
  });

  describe('verificarSeRequerAprovacao', () => {
    it('deve retornar true quando ação requer aprovação', async () => {
      // Arrange
      const tipoAcao = TipoAcaoCritica.CANCELAR_SOLICITACAO;
      const usuario = createMockUsuario({ role: 'USER' });
      
      // Act
      const resultado = await service.verificarSeRequerAprovacao(tipoAcao, usuario, {});
      
      // Assert
      expect(resultado).toBe(true);
    });

    it('deve retornar false quando usuário tem permissão para auto-aprovação', async () => {
      // Arrange
      const tipoAcao = TipoAcaoCritica.CANCELAR_SOLICITACAO;
      const usuario = createMockUsuario({ role: 'ADMIN' });
      
      // Act
      const resultado = await service.verificarSeRequerAprovacao(tipoAcao, usuario, {});
      
      // Assert
      expect(resultado).toBe(false);
    });
  });
});
```

## Métricas e Monitoramento

### AprovacaoMetricsService

```typescript
@Injectable()
export class AprovacaoMetricsService {
  constructor(
    @InjectRepository(SolicitacaoAprovacao)
    private readonly solicitacaoRepository: Repository<SolicitacaoAprovacao>,
  ) {}

  async obterMetricasAprovacao(periodo: PeriodoMetricas): Promise<MetricasAprovacao> {
    const { dataInicio, dataFim } = this.calcularPeriodo(periodo);

    const [totalSolicitacoes, aprovadas, negadas, expiradas, tempoMedioAprovacao] = 
      await Promise.all([
        this.contarSolicitacoesPorStatus(dataInicio, dataFim),
        this.contarSolicitacoesPorStatus(dataInicio, dataFim, StatusSolicitacaoAprovacao.APROVADO),
        this.contarSolicitacoesPorStatus(dataInicio, dataFim, StatusSolicitacaoAprovacao.NEGADO),
        this.contarSolicitacoesPorStatus(dataInicio, dataFim, StatusSolicitacaoAprovacao.EXPIRADO),
        this.calcularTempoMedioAprovacao(dataInicio, dataFim),
      ]);

    return {
      periodo,
      totalSolicitacoes,
      aprovadas,
      negadas,
      expiradas,
      pendentes: totalSolicitacoes - aprovadas - negadas - expiradas,
      taxaAprovacao: (aprovadas / totalSolicitacoes) * 100,
      tempoMedioAprovacao,
    };
  }

  async obterTopAcoesComAprovacao(): Promise<TopAcoesAprovacao[]> {
    return this.solicitacaoRepository
      .createQueryBuilder('s')
      .select('ac.nome', 'acao_nome')
      .addSelect('COUNT(*)', 'total_solicitacoes')
      .innerJoin('s.acao_critica', 'ac')
      .groupBy('ac.id, ac.nome')
      .orderBy('COUNT(*)', 'DESC')
      .limit(10)
      .getRawMany();
  }
}
```

## Segurança e Compliance

### Controles de Segurança

1. **Autenticação e Autorização**
   - Integração com sistema ABAC existente
   - Verificação de permissões granulares
   - Validação de escopo de aprovação

2. **Auditoria Completa**
   - Registro de todas as operações
   - Rastreabilidade completa do ciclo de aprovação
   - Detecção de dados sensíveis

3. **Proteção contra Ataques**
   - Rate limiting em endpoints críticos
   - Validação rigorosa de inputs
   - Sanitização de dados

4. **Compliance LGPD**
   - Anonimização de dados sensíveis em logs
   - Controle de retenção de dados
   - Direito ao esquecimento

## Roadmap de Implementação

### Fase 1: Fundação (Semanas 1-2) ✅ CONCLUÍDA
- [x] Criação das entidades base
  - [x] AcaoCritica - Define tipos de ações que requerem aprovação
  - [x] ConfiguracaoAprovacao - Regras de aprovação por ação/perfil
  - [x] SolicitacaoAprovacao - Solicitações específicas de aprovação
  - [x] Aprovador - Definição de quem pode aprovar
  - [x] HistoricoAprovacao - Log completo de todas as ações
- [x] Configuração do módulo principal (AprovacaoModule)
- [x] Implementação dos enums e constantes
  - [x] TipoAcaoCritica, StatusSolicitacaoAprovacao, EstrategiaAprovacao
  - [x] TipoAprovador, AcaoAprovacao, PrioridadeAprovacao
  - [x] Constantes para filas, jobs, cache, timeouts e limites
- [x] Implementação dos repositórios
  - [x] AcaoCriticaRepository - Operações específicas para ações críticas
  - [x] ConfiguracaoAprovacaoRepository - Gestão de configurações de aprovação
  - [x] SolicitacaoAprovacaoRepository - Operações de solicitações
  - [x] AprovadorRepository - Gestão de aprovadores
  - [x] HistoricoAprovacaoRepository - Operações de histórico e auditoria
- [x] Migrations e seeds iniciais ✅ CONCLUÍDA
- [x] Correção de erros de compilação e validação TypeScript ✅ CONCLUÍDA

### Fase 2: Core Services (Semanas 3-4) ✅ CONCLUÍDA
- [x] DTOs (Data Transfer Objects) ✅ CONCLUÍDA
  - [x] CreateAcaoCriticaDto, UpdateAcaoCriticaDto - DTOs para ações críticas
  - [x] CreateConfiguracaoAprovacaoDto, UpdateConfiguracaoAprovacaoDto - DTOs para configurações
  - [x] CreateSolicitacaoAprovacaoDto, UpdateSolicitacaoAprovacaoDto - DTOs para solicitações
  - [x] CreateAprovadorDto, UpdateAprovadorDto - DTOs para aprovadores
  - [x] AprovarSolicitacaoDto, RejeitarSolicitacaoDto, DelegarSolicitacaoDto - DTOs para ações
  - [x] FiltroSolicitacaoDto - DTO para filtros e consultas
  - [x] RespostaPaginadaDto, RespostaPaginadaSolicitacaoDto, RespostaPaginadaHistoricoDto - DTOs para respostas
- [x] AprovacaoService básico ✅ CONCLUÍDA
  - [x] Verificação se ação requer aprovação
  - [x] Criação de solicitações de aprovação
  - [x] Processamento de aprovações/rejeições
  - [x] Listagem com filtros e paginação
  - [x] Integração com sistema de eventos
- [x] Serviços auxiliares ✅ CONCLUÍDA
  - [x] AcaoCriticaService - Gestão de ações críticas
  - [x] ConfiguracaoAprovacaoService - Gestão de configurações
  - [x] AprovadorService - Gestão de aprovadores
  - [x] HistoricoAprovacaoService - Gestão de histórico

### Fase 3: Integração (Semanas 5-6) ✅ CONCLUÍDA
- [x] Decorators e interceptors ✅ CONCLUÍDO
- [x] Integração com auditoria ✅ CONCLUÍDO
- [x] Sistema de notificações ✅ CONCLUÍDO
- [x] Escalação automática ✅ CONCLUÍDO

### Fase 4: API e Interface (Semanas 7-8) ✅ CONCLUÍDA
- [x] Controllers REST ✅ CONCLUÍDO
- [x] Documentação Swagger ✅ CONCLUÍDO
- [x] Testes unitários e integração ✅ CONCLUÍDO
- [x] Interface de administração ✅ CONCLUÍDO

### Fase 5: Monitoramento e Otimização (Semanas 9-10) 🎯 EM ANDAMENTO
- [ ] Métricas e dashboards 🎯 PRÓXIMA ETAPA
- [ ] Performance tuning
- [ ] Testes de carga
- [ ] Documentação final

## Considerações de Performance

### Otimizações

1. **Índices de Banco**
   - Índices compostos para consultas frequentes
   - Particionamento por data para tabelas de histórico

2. **Cache**
   - Cache de configurações de aprovação
   - Cache de aprovadores por ação

3. **Processamento Assíncrono**
   - Filas para notificações
   - Background jobs para escalação

4. **Paginação**
   - Paginação em todas as listagens
   - Cursor-based pagination para grandes volumes

## Conclusão

Este sistema de aprovação de ações críticas foi projetado para integrar-se perfeitamente com a arquitetura existente do PGBen, seguindo todos os padrões estabelecidos:

- **Clean Architecture com DDD**: Organização por domínio
- **Event-Driven**: Integração com sistema de eventos
- **ABAC**: Controle de acesso granular
- **Auditoria Automática**: Rastreabilidade completa
- **Notificações Assíncronas**: Sistema de filas robusto

O sistema é altamente configurável, escalável e mantém a consistência com os padrões de código, nomenclatura e estrutura já estabelecidos no projeto.