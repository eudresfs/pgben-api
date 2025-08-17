import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { AcaoAprovacao, SolicitacaoAprovacao, Aprovador } from '../entities';
import { CriarSolicitacaoDto, ProcessarAprovacaoDto, CriarAcaoAprovacaoDto } from '../dtos';
import { StatusSolicitacao, TipoAcaoCritica, EstrategiaAprovacao } from '../enums';
import { ConfiguracaoAprovacao } from '../decorators';
import { NotificacaoService } from '../../notificacao/services/notificacao.service';
import { UsuarioService } from '../../usuario/services/usuario.service';
import { AuditEventEmitter } from '../../auditoria/events/emitters/audit-event.emitter';
import { AblyService } from '../../notificacao/services/ably.service';
import { ExecucaoAcaoService } from './execucao-acao.service';
import { PermissionService } from '../../../auth/services/permission.service';
import { SYSTEM_USER_UUID } from '../../../shared/constants/system.constants';

/**
 * Serviço principal consolidado para gerenciamento de aprovações
 * Centraliza toda a lógica de aprovação em um único serviço
 */
@Injectable()
export class AprovacaoService {
  private readonly logger = new Logger(AprovacaoService.name);

  constructor(
    @InjectRepository(AcaoAprovacao)
    private readonly acaoAprovacaoRepository: Repository<AcaoAprovacao>,
    
    @InjectRepository(SolicitacaoAprovacao)
    private readonly solicitacaoRepository: Repository<SolicitacaoAprovacao>,
    
    @InjectRepository(Aprovador)
    private readonly aprovadorRepository: Repository<Aprovador>,
    
    private readonly notificacaoService: NotificacaoService,
    private readonly usuarioService: UsuarioService,
    private readonly eventEmitter: EventEmitter2,
    private readonly auditEventEmitter: AuditEventEmitter,
    private readonly ablyService: AblyService,
    private readonly execucaoAcaoService: ExecucaoAcaoService,
    private readonly permissionService: PermissionService
  ) {}

  /**
   * Verifica se uma ação requer aprovação
   */
  async requerAprovacao(tipoAcao: TipoAcaoCritica): Promise<boolean> {
    const configuracao = await this.acaoAprovacaoRepository.findOne({
      where: { tipo_acao: tipoAcao, ativo: true }
    });
    
    return !!configuracao;
  }

  /**
   * Obtém a configuração de aprovação para um tipo de ação
   */
  async obterConfiguracaoAprovacao(tipoAcao: TipoAcaoCritica): Promise<AcaoAprovacao> {
    const configuracao = await this.acaoAprovacaoRepository.findOne({
      where: { tipo_acao: tipoAcao, ativo: true },
      relations: ['aprovadores']
    });

    if (!configuracao) {
      throw new NotFoundException(`Configuração de aprovação não encontrada para: ${tipoAcao}`);
    }

    return configuracao;
  }

  /**
   * Busca solicitação pendente para o mesmo item (independente da ação)
   * Implementa validação correta: apenas uma solicitação por item por vez
   */
  async buscarSolicitacaoPendente(
    solicitanteId: string,
    tipoAcao: TipoAcaoCritica,
    dadosAcao?: Record<string, any>
  ): Promise<SolicitacaoAprovacao | null> {
    const query = this.solicitacaoRepository
      .createQueryBuilder('solicitacao')
      .innerJoin('solicitacao.acao_aprovacao', 'acao')
      .where('solicitacao.solicitante_id = :solicitanteId', { solicitanteId })
      .andWhere('solicitacao.status IN (:...statusPendentes)', {
        statusPendentes: [StatusSolicitacao.PENDENTE]
      });

    // Validação principal: verifica se já existe solicitação pendente para o mesmo item
    // O ID do item está sempre em dados_acao.params.id
    if (dadosAcao?.params?.id) {
      query.andWhere("solicitacao.dados_acao->'params'->>'id' = :itemId", {
        itemId: dadosAcao.params.id
      });
    } else {
      // Fallback: se não há ID específico do item, valida por tipo de ação
      // (para ações que não afetam um item específico)
      query.andWhere('acao.tipo_acao = :tipoAcao', { tipoAcao });
    }

    return query.getOne();
  }

  /**
   * Valida se pode criar uma nova solicitação
   * Implementa regra: apenas uma solicitação pendente por item por vez
   */
  async validarCriacaoSolicitacao(
    dto: CriarSolicitacaoDto,
    solicitanteId: string
  ): Promise<void> {
    // Verifica se já existe solicitação pendente para este item
    const solicitacaoPendente = await this.buscarSolicitacaoPendente(
      solicitanteId,
      dto.tipo_acao,
      dto.dados_acao
    );

    if (solicitacaoPendente) {
      const itemId = dto.dados_acao?.params?.id;
      const mensagem = itemId 
        ? `Já existe uma solicitação pendente para este item (ID: ${itemId}, Código: ${solicitacaoPendente.codigo}). ` +
          `Aguarde a conclusão da aprovação ou cancele a solicitação anterior.`
        : `Já existe uma solicitação pendente para esta ação (Código: ${solicitacaoPendente.codigo}). ` +
          `Aguarde a conclusão da aprovação ou cancele a solicitação anterior.`;
      
      throw new BadRequestException(mensagem);
    }
  }

  /**
   * Cria uma nova solicitação de aprovação
   */
  async criarSolicitacao(
    dto: CriarSolicitacaoDto,
    solicitanteId: string
  ): Promise<SolicitacaoAprovacao> {
    // Valida se pode criar a solicitação (evita duplicatas)
    await this.validarCriacaoSolicitacao(dto, solicitanteId);

    // Verifica se existe configuração para o tipo de ação
    const configuracao = await this.obterConfiguracaoAprovacao(dto.tipo_acao);

    // Gera código único para a solicitação
    const codigo = await this.gerarCodigoSolicitacao();

    // Cria a solicitação
    const solicitacao = this.solicitacaoRepository.create({
      codigo,
      status: StatusSolicitacao.PENDENTE,
      solicitante_id: solicitanteId,
      justificativa: dto.justificativa,
      dados_acao: dto.dados_acao,
      metodo_execucao: dto.metodo_execucao,
      prazo_aprovacao: dto.prazo_aprovacao ? new Date(dto.prazo_aprovacao) : null,
      anexos: dto.anexos || [],
      acao_aprovacao_id: configuracao.id
    });

    const solicitacaoSalva = await this.solicitacaoRepository.save(solicitacao);

    // Registra auditoria da criação da solicitação
    await this.auditEventEmitter.emitEntityCreated(
      'SolicitacaoAprovacao',
      solicitacaoSalva.id,
      {
        codigo: solicitacaoSalva.codigo,
        tipo_acao: dto.tipo_acao,
        justificativa: dto.justificativa,
        dados_acao: dto.dados_acao,
        anexos_count: dto.anexos?.length || 0,
        solicitante_id: solicitanteId
      },
      solicitanteId
    );

    // Cria registros de aprovadores para esta solicitação
    await this.criarAprovadoresParaSolicitacao(solicitacaoSalva.id, configuracao.aprovadores);

    // Emitir evento de criação via Ably
    await this.ablyService.publishMessage('aprovacao', 'solicitacao.criada', {
      solicitacao: solicitacaoSalva,
      solicitanteId,
      configuracao,
      aprovadores: configuracao.aprovadores.map(a => a.usuario_id),
      timestamp: new Date()
    });

    // Manter EventEmitter para compatibilidade com listeners internos
    this.eventEmitter.emit('solicitacao.criada', {
      solicitacao: solicitacaoSalva,
      solicitanteId,
      configuracao,
      aprovadores: configuracao.aprovadores.map(a => a.usuario_id),
      timestamp: new Date()
    });

    // Notifica os aprovadores sobre a nova solicitação
    await this.notificarAprovadores(solicitacaoSalva.id, 'NOVA_SOLICITACAO');

    this.logger.log(`Solicitação criada: ${codigo} para ação: ${dto.tipo_acao}`);
    
    return this.obterSolicitacao(solicitacaoSalva.id);
  }

  /**
   * Cria uma nova solicitação de aprovação com estratégia específica
   */
  async criarSolicitacaoComEstrategia(
    dto: CriarSolicitacaoDto,
    solicitanteId: string,
    configuracaoDecorator: ConfiguracaoAprovacao
  ): Promise<SolicitacaoAprovacao> {
    // Valida se pode criar a solicitação (evita duplicatas)
    await this.validarCriacaoSolicitacao(dto, solicitanteId);

    // Verifica se existe configuração para o tipo de ação
    const configuracao = await this.obterConfiguracaoAprovacao(dto.tipo_acao);

    // Gera código único para a solicitação
    const codigo = await this.gerarCodigoSolicitacao();

    // Cria a solicitação
    const solicitacao = this.solicitacaoRepository.create({
      codigo,
      status: StatusSolicitacao.PENDENTE,
      solicitante_id: solicitanteId,
      justificativa: dto.justificativa,
      dados_acao: dto.dados_acao,
      metodo_execucao: dto.metodo_execucao,
      prazo_aprovacao: dto.prazo_aprovacao ? new Date(dto.prazo_aprovacao) : null,
      anexos: dto.anexos || [],
      acao_aprovacao_id: configuracao.id
    });

    const solicitacaoSalva = await this.solicitacaoRepository.save(solicitacao);

    // Cria aprovadores baseado na estratégia
    await this.criarAprovadoresComEstrategia(
      solicitacaoSalva.id, 
      configuracao, 
      configuracaoDecorator,
      solicitanteId
    );

    // Notifica os aprovadores sobre a nova solicitação
    await this.notificarAprovadores(solicitacaoSalva.id, 'NOVA_SOLICITACAO');

    this.logger.log(`Solicitação criada: ${codigo} para ação: ${dto.tipo_acao} com estratégia: ${configuracao.estrategia}`);
    
    return this.obterSolicitacao(solicitacaoSalva.id);
  }

  /**
   * Processa aprovação ou rejeição de uma solicitação
   */
  async processarAprovacao(
    solicitacaoId: string,
    aprovadorId: string,
    aprovado: boolean,
    justificativa?: string,
    anexos?: {
      nome: string;
      url: string;
      tipo: string;
      tamanho: number;
      uploadedAt: Date;
    }[]
  ): Promise<SolicitacaoAprovacao> {
    // Busca a solicitação
    const solicitacao = await this.obterSolicitacao(solicitacaoId);
    
    if (solicitacao.status !== StatusSolicitacao.PENDENTE) {
      throw new BadRequestException('Solicitação já foi processada');
    }

    // Validação: impedir que usuário aprove sua própria solicitação (exceto para autoaprovação)
    if (solicitacao.solicitante_id === aprovadorId && 
        solicitacao.acao_aprovacao.estrategia !== EstrategiaAprovacao.AUTOAPROVACAO_PERFIL) {
      throw new BadRequestException('Usuário não pode aprovar sua própria solicitação');
    }

    // Busca o aprovador
    const aprovador = await this.aprovadorRepository.findOne({
      where: {
        solicitacao_aprovacao_id: solicitacaoId,
        usuario_id: aprovadorId,
        ativo: true
      }
    });

    if (!aprovador) {
      throw new NotFoundException('Aprovador não encontrado para esta solicitação');
    }

    if (aprovador.jaDecidiu()) {
      throw new BadRequestException('Aprovador já tomou uma decisão');
    }

    // Registra auditoria da decisão antes de processar
    await this.auditEventEmitter.emitEntityUpdated(
      'Aprovador',
      aprovador.id,
      {
          aprovado: aprovador.aprovado
        },
        {
          solicitacao_id: solicitacaoId,
          aprovador_id: aprovadorId,
          decisao: aprovado ? 'APROVADA' : 'REJEITADA',
          justificativa,
          anexos_count: anexos?.length || 0
        },
        aprovadorId
    );

    // Registra a decisão
    if (aprovado) {
      aprovador.aprovar(justificativa, anexos);
    } else {
      aprovador.rejeitar(justificativa || 'Rejeitado', anexos);
    }

    await this.aprovadorRepository.save(aprovador);

    // Atualiza o status da solicitação
    const solicitacaoAtualizada = await this.atualizarStatusSolicitacao(solicitacao);

    // Emite evento de mudança de status da solicitação via Ably
    await this.ablyService.publishMessage('aprovacao', 'solicitacao.status.alterado', {
      solicitacaoId,
      codigo: solicitacao.codigo,
      statusAnterior: solicitacao.status,
      novoStatus: solicitacaoAtualizada.status,
      aprovadorId,
      solicitanteId: solicitacao.solicitante_id,
      decisao: aprovado ? 'APROVADA' : 'REJEITADA',
      justificativa,
      timestamp: new Date()
    });

    // Manter EventEmitter para compatibilidade com listeners internos
    this.eventEmitter.emit('solicitacao.status.alterado', {
      solicitacao: solicitacaoAtualizada,
      solicitacaoId,
      codigo: solicitacao.codigo,
      statusAnterior: solicitacao.status,
      novoStatus: solicitacaoAtualizada.status,
      aprovadorId,
      solicitanteId: solicitacao.solicitante_id,
      aprovadores: solicitacao.aprovadores.map(a => a.usuario_id),
      decisao: aprovado ? 'APROVADA' : 'REJEITADA',
      justificativa,
      timestamp: new Date()
    });

    // Se a solicitação foi aprovada, executa a ação automaticamente
    if (solicitacaoAtualizada.status === StatusSolicitacao.APROVADA) {
      await this.executarAcaoAprovada(solicitacaoAtualizada);
      
      // Emite evento específico de aprovação final via Ably
      await this.ablyService.publishMessage('aprovacao', 'solicitacao.aprovada', {
        solicitacao: solicitacaoAtualizada,
        aprovadorId,
        solicitanteId: solicitacaoAtualizada.solicitante_id,
        justificativa,
        timestamp: new Date()
      });
      
      // Manter EventEmitter para compatibilidade com listeners internos
      this.eventEmitter.emit('solicitacao.aprovada', {
        solicitacao: solicitacaoAtualizada,
        aprovadorId,
        solicitanteId: solicitacaoAtualizada.solicitante_id,
        justificativa,
        timestamp: new Date()
      });
    } else if (solicitacaoAtualizada.status === StatusSolicitacao.REJEITADA) {
      // Emite evento específico de rejeição via Ably
      await this.ablyService.publishMessage('aprovacao', 'solicitacao.rejeitada', {
        solicitacao: solicitacaoAtualizada,
        aprovadorId,
        solicitanteId: solicitacaoAtualizada.solicitante_id,
        justificativa,
        timestamp: new Date()
      });
      
      // Manter EventEmitter para compatibilidade com listeners internos
      this.eventEmitter.emit('solicitacao.rejeitada', {
        solicitacao: solicitacaoAtualizada,
        aprovadorId,
        solicitanteId: solicitacaoAtualizada.solicitante_id,
        justificativa,
        timestamp: new Date()
      });
    }

    // Notifica o solicitante sobre a decisão
    await this.notificarSolicitante(solicitacaoId, aprovado ? 'APROVADA' : 'REJEITADA');

    // Notifica outros aprovadores sobre a decisão (se houver)
    await this.notificarOutrosAprovadores(solicitacaoId, aprovadorId, aprovado ? 'APROVADA' : 'REJEITADA');

    // Emitir evento para notificações SSE aos outros aprovadores
    const outrosAprovadores = solicitacao.aprovadores
      .filter(a => a.usuario_id !== aprovadorId && !a.decidido_em)
      .map(a => a.usuario_id);

    this.eventEmitter.emit('aprovador.decisao_tomada', {
      solicitacaoId: solicitacao.id,
      codigo: solicitacao.codigo,
      aprovadorId,
      decisao: aprovado ? 'APROVADA' : 'REJEITADA',
      justificativa,
      outrosAprovadores,
      timestamp: new Date()
    });

    this.logger.log(
      `Solicitação ${solicitacao.codigo} ${aprovado ? 'aprovada' : 'rejeitada'} por ${aprovadorId}`
    );

    return this.obterSolicitacao(solicitacaoId);
  }

  /**
   * Obtém uma solicitação com todos os relacionamentos
   */
  async obterSolicitacao(id: string): Promise<SolicitacaoAprovacao> {
    const solicitacao = await this.solicitacaoRepository.findOne({
      where: { id },
      relations: ['acao_aprovacao', 'aprovadores']
    });

    if (!solicitacao) {
      throw new NotFoundException('Solicitação não encontrada');
    }

    return solicitacao;
  }

  /**
   * Lista solicitações com filtros
   */
  async listarSolicitacoes(
    filtros: any = {},
    paginacao: { page: number; limit: number } = { page: 1, limit: 10 },
    usuarioId?: string
  ) {
    const { page, limit } = paginacao;
    const queryBuilder = this.solicitacaoRepository
      .createQueryBuilder('solicitacao')
      .leftJoinAndSelect('solicitacao.acao_aprovacao', 'acao')
      .leftJoinAndSelect('solicitacao.aprovadores', 'aprovadores')
      .orderBy('solicitacao.criado_em', 'DESC');

    if (filtros.status) {
      queryBuilder.andWhere('solicitacao.status = :status', { status: filtros.status });
    }

    if (filtros.solicitante_id) {
      queryBuilder.andWhere('solicitacao.solicitante_id = :solicitanteId', { solicitanteId: filtros.solicitante_id });
    }

    if (filtros.tipo_acao) {
      queryBuilder.andWhere('acao.tipo_acao = :tipoAcao', { tipoAcao: filtros.tipo_acao });
    }

    // Se usuário específico, filtra por solicitações que ele pode ver
    if (usuarioId && !filtros.solicitante_id) {
      queryBuilder.andWhere(
        '(solicitacao.solicitante_id = :usuarioId OR aprovadores.usuario_id = :usuarioId)',
        { usuarioId }
      );
    }

    const [solicitacoes, total] = await queryBuilder
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return {
      solicitacoes,
      total
    };
  }

  /**
   * Cria ou atualiza configuração de ação de aprovação
   */
  async criarAcaoAprovacao(dto: CriarAcaoAprovacaoDto): Promise<AcaoAprovacao> {
    // Verifica se já existe configuração para este tipo
    const existente = await this.acaoAprovacaoRepository.findOne({
      where: { tipo_acao: dto.tipo_acao }
    });

    if (existente) {
      throw new BadRequestException(`Configuração já existe para: ${dto.tipo_acao}`);
    }

    const acao = this.acaoAprovacaoRepository.create({
      ...dto,
      ativo: dto.ativo ?? true
    });

    return this.acaoAprovacaoRepository.save(acao);
  }

  /**
   * Lista solicitações pendentes para um aprovador
   */
  async listarSolicitacoesPendentes(
    aprovadorId: string,
    paginacao: { page: number; limit: number } = { page: 1, limit: 10 }
  ) {
    const { page, limit } = paginacao;
    const queryBuilder = this.solicitacaoRepository
      .createQueryBuilder('solicitacao')
      .leftJoinAndSelect('solicitacao.acao_aprovacao', 'acao')
      .leftJoinAndSelect('solicitacao.aprovadores', 'aprovadores')
      .where('solicitacao.status = :status', { status: StatusSolicitacao.PENDENTE })
      .andWhere('aprovadores.usuario_id = :aprovadorId', { aprovadorId })
      .andWhere('aprovadores.ativo = true')
      .andWhere('aprovadores.aprovado IS NULL')
      .orderBy('solicitacao.criado_em', 'DESC');

    const [solicitacoes, total] = await queryBuilder
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return {
      solicitacoes,
      total
    };
  }

  /**
   * Lista aprovações pendentes por ID de entidade
   * Útil para verificar se uma entidade específica possui aprovações pendentes
   */
  async listarAprovacoesPendentesPorEntidade(
    entidadeId: string,
    paginacao: { page: number; limit: number } = { page: 1, limit: 10 }
  ) {
    const { page, limit } = paginacao;
    
    const queryBuilder = this.solicitacaoRepository
       .createQueryBuilder('solicitacao')
       .leftJoinAndSelect('solicitacao.acao_aprovacao', 'acao')
       .leftJoinAndSelect('solicitacao.aprovadores', 'aprovadores')
       .where('solicitacao.status = :status', { status: StatusSolicitacao.PENDENTE })
       .andWhere("solicitacao.dados_acao->'params'->>'id' = :entidadeId", { entidadeId })
       .orderBy('solicitacao.criado_em', 'DESC');

    const [solicitacoes, total] = await queryBuilder
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    // Mapear dados para resposta mais limpa
    const solicitacoesMapeadas = solicitacoes.map(solicitacao => ({
      id: solicitacao.id,
      codigo: solicitacao.codigo,
      status: solicitacao.status,
      dados_acao: solicitacao.dados_acao,
      justificativa: solicitacao.justificativa,
      criado_em: solicitacao.criado_em,
      acao_aprovacao: {
        id: solicitacao.acao_aprovacao.id,
        tipo_acao: solicitacao.acao_aprovacao.tipo_acao,
        estrategia: solicitacao.acao_aprovacao.estrategia,
        descricao: solicitacao.acao_aprovacao.descricao
      },
      aprovadores: solicitacao.aprovadores
         .filter(aprovador => aprovador.ativo)
         .map(aprovador => ({
           id: aprovador.id,
           usuario_id: aprovador.usuario_id,
           aprovado: aprovador.aprovado,
           justificativa_decisao: aprovador.justificativa_decisao,
           decidido_em: aprovador.decidido_em
         }))
    }));

    return {
      solicitacoes: solicitacoesMapeadas,
      total,
      entidade_id: entidadeId
    };
  }

  /**
   * Executa automaticamente a ação após aprovação
   */
  private async executarAcaoAprovada(solicitacao: SolicitacaoAprovacao): Promise<void> {
    try {
      this.logger.log(`Executando ação aprovada para solicitação: ${solicitacao.codigo}`);
      
      // Registra auditoria do início da execução
      await this.auditEventEmitter.emitEntityUpdated(
        'SolicitacaoAprovacao',
        solicitacao.id,
        {
          status: solicitacao.status,
          executado_em: solicitacao.executado_em
        },
        {
          codigo: solicitacao.codigo,
          tipo_acao: solicitacao.acao_aprovacao.tipo_acao,
          status_execucao: 'INICIANDO',
          dados_acao: solicitacao.dados_acao,
          metodo_execucao: solicitacao.metodo_execucao
        },
        SYSTEM_USER_UUID
      );
      
      // Executa a ação usando o serviço de execução
      const resultadoExecucao = await this.execucaoAcaoService.executarAcao(solicitacao);
      
      const dadosExecucao = {
        solicitacao_id: solicitacao.id,
        metodo: solicitacao.metodo_execucao,
        dados: solicitacao.dados_acao,
        resultado: resultadoExecucao,
        executado_em: new Date()
      };
      
      // Atualiza a solicitação como executada
      await this.solicitacaoRepository.update(solicitacao.id, {
        status: StatusSolicitacao.EXECUTADA,
        executado_em: new Date()
      });
      
      // Registra auditoria do sucesso da execução
      await this.auditEventEmitter.emitEntityUpdated(
        'SolicitacaoAprovacao',
        solicitacao.id,
        {
          status: StatusSolicitacao.APROVADA,
          executado_em: null
        },
        {
          codigo: solicitacao.codigo,
          tipo_acao: solicitacao.acao_aprovacao.tipo_acao,
          status_execucao: 'CONCLUIDA',
          status: StatusSolicitacao.EXECUTADA,
          executado_em: dadosExecucao.executado_em,
          dados_execucao: dadosExecucao
        },
        SYSTEM_USER_UUID
      );
      
      // Emitir evento de execução bem-sucedida via Ably
      await this.ablyService.publishMessage('aprovacao', 'solicitacao.executada', {
        solicitacao,
        solicitanteId: solicitacao.solicitante_id,
        dadosExecucao: dadosExecucao,
        timestamp: new Date()
      });

      // Manter EventEmitter para compatibilidade com listeners internos
      this.eventEmitter.emit('solicitacao.executada', {
        solicitacao,
        solicitanteId: solicitacao.solicitante_id,
        dadosExecucao: dadosExecucao,
        timestamp: new Date()
      });
      
      this.logger.log(`Ação executada com sucesso para solicitação: ${solicitacao.codigo}`);
      
      // Auditoria e execução real já implementadas acima
      
    } catch (error) {
      this.logger.error(`Erro ao executar ação para solicitação ${solicitacao.codigo}:`, error);
      
      // Atualiza status para erro de execução
      await this.solicitacaoRepository.update(solicitacao.id, {
        status: StatusSolicitacao.ERRO_EXECUCAO,
        erro_execucao: error.message
      });
      
      // Registra auditoria do erro de execução
      await this.auditEventEmitter.emitEntityUpdated(
        'SolicitacaoAprovacao',
        solicitacao.id,
        {
          status: StatusSolicitacao.APROVADA,
          erro_execucao: null
        },
        {
          codigo: solicitacao.codigo,
          tipo_acao: solicitacao.acao_aprovacao.tipo_acao,
          status_execucao: 'ERRO',
          status: StatusSolicitacao.ERRO_EXECUCAO,
          erro_execucao: error.message
        },
        'SISTEMA'
      );
      
      // Emitir evento de erro de execução via Ably
      await this.ablyService.publishMessage('aprovacao', 'solicitacao.erro_execucao', {
        solicitacao,
        solicitanteId: solicitacao.solicitante_id,
        erro: error.message,
        timestamp: new Date()
      });

      // Manter EventEmitter para compatibilidade com listeners internos
      this.eventEmitter.emit('solicitacao.erro_execucao', {
        solicitacao,
        solicitanteId: solicitacao.solicitante_id,
        erro: error.message,
        timestamp: new Date()
      });
      
      // Notifica sobre o erro
      await this.notificarSolicitante(solicitacao.id, 'ERRO_EXECUCAO');
      
      throw error;
    }
  }

  /**
   * Cancela uma solicitação pendente
   */
  async cancelarSolicitacao(solicitacaoId: string, usuarioId: string): Promise<SolicitacaoAprovacao> {
    const solicitacao = await this.obterSolicitacao(solicitacaoId);
    
    if (solicitacao.solicitante_id !== usuarioId) {
      throw new BadRequestException('Apenas o solicitante pode cancelar a solicitação');
    }

    if (solicitacao.status !== StatusSolicitacao.PENDENTE) {
      throw new BadRequestException('Apenas solicitações pendentes podem ser canceladas');
    }

    const statusAnterior = solicitacao.status;
    
    // Registra auditoria do cancelamento
    await this.auditEventEmitter.emitEntityUpdated(
      'SolicitacaoAprovacao',
      solicitacao.id,
      {
        status: statusAnterior
      },
      {
        codigo: solicitacao.codigo,
        status_novo: StatusSolicitacao.CANCELADA,
        status_anterior: statusAnterior,
        cancelado_por: usuarioId,
        tipo_acao: solicitacao.acao_aprovacao.nome
      },
      usuarioId
    );

    await this.solicitacaoRepository.update(solicitacaoId, {
      status: StatusSolicitacao.CANCELADA,
      processado_em: new Date(),
      processado_por: usuarioId
    });

    // Emitir evento de cancelamento via Ably
    await this.ablyService.publishMessage('aprovacao', 'solicitacao.cancelada', {
      solicitacao,
      usuarioId,
      aprovadores: solicitacao.aprovadores.map(a => a.usuario_id),
      statusAnterior,
      timestamp: new Date()
    });

    // Manter EventEmitter para compatibilidade com listeners internos
    this.eventEmitter.emit('solicitacao.cancelada', {
      solicitacao,
      usuarioId,
      aprovadores: solicitacao.aprovadores.map(a => a.usuario_id),
      statusAnterior,
      timestamp: new Date()
    });

    // Notifica os aprovadores sobre o cancelamento
    await this.notificarAprovadores(solicitacaoId, 'CANCELADA');

    this.logger.log(`Solicitação ${solicitacao.codigo} cancelada por ${usuarioId}`);
    
    return this.obterSolicitacao(solicitacaoId);
  }

  /**
   * Lista todas as ações de aprovação
   */
  async listarAcoesAprovacao(filtros: any = {}): Promise<AcaoAprovacao[]> {
    const queryBuilder = this.acaoAprovacaoRepository
      .createQueryBuilder('acao')
      .leftJoinAndSelect('acao.aprovadores', 'aprovadores')
      .orderBy('acao.nome', 'ASC');

    if (filtros.ativo !== undefined) {
      queryBuilder.andWhere('acao.ativo = :ativo', { ativo: filtros.ativo });
    }

    if (filtros.tipo_acao) {
      queryBuilder.andWhere('acao.tipo_acao = :tipoAcao', { tipoAcao: filtros.tipo_acao });
    }

    if (filtros.estrategia) {
      queryBuilder.andWhere('acao.estrategia = :estrategia', { estrategia: filtros.estrategia });
    }

    return queryBuilder.getMany();
  }

  /**
   * Obtém uma ação de aprovação por ID
   */
  async obterAcaoAprovacao(id: string): Promise<AcaoAprovacao> {
    const acao = await this.acaoAprovacaoRepository.findOne({
      where: { id },
      relations: ['aprovadores']
    });

    if (!acao) {
      throw new NotFoundException('Configuração de aprovação não encontrada');
    }

    return acao;
  }

  /**
   * Atualiza uma ação de aprovação
   */
  async atualizarAcaoAprovacao(id: string, dto: Partial<CriarAcaoAprovacaoDto>): Promise<AcaoAprovacao> {
    const acao = await this.obterAcaoAprovacao(id);
    
    await this.acaoAprovacaoRepository.update(id, dto);
    
    this.logger.log(`Configuração de aprovação ${id} atualizada`);
    
    return this.obterAcaoAprovacao(id);
  }

  /**
   * Remove uma ação de aprovação (soft delete)
   */
  async removerAcaoAprovacao(id: string): Promise<void> {
    const acao = await this.obterAcaoAprovacao(id);
    
    // Verifica se há solicitações ativas
    const solicitacoesAtivas = await this.solicitacaoRepository.count({
      where: {
        acao_aprovacao_id: id,
        status: StatusSolicitacao.PENDENTE
      }
    });

    if (solicitacoesAtivas > 0) {
      throw new BadRequestException('Não é possível remover configuração com solicitações pendentes');
    }

    await this.acaoAprovacaoRepository.update(id, { ativo: false });
    
    this.logger.log(`Configuração de aprovação ${id} removida`);
  }

  /**
   * Adiciona aprovador a uma configuração
   */
  async adicionarAprovador(acaoId: string, usuarioId: string): Promise<Aprovador> {
    const acao = await this.acaoAprovacaoRepository.findOne({ where: { id: acaoId } });
    
    if (!acao) {
      throw new NotFoundException('Configuração de ação não encontrada');
    }

    // Verifica se o aprovador já existe
    const existente = await this.aprovadorRepository.findOne({
      where: { acao_aprovacao_id: acaoId, usuario_id: usuarioId }
    });

    if (existente) {
      throw new BadRequestException('Aprovador já cadastrado para esta ação');
    }

    const aprovador = this.aprovadorRepository.create({
      acao_aprovacao_id: acaoId,
      usuario_id: usuarioId,
      ativo: true
    });

    return this.aprovadorRepository.save(aprovador);
  }

  /**
   * Lista aprovadores de uma configuração
   */
  async listarAprovadores(acaoId: string, ativo?: boolean): Promise<Aprovador[]> {
    const where: any = { acao_aprovacao_id: acaoId };
    
    if (ativo !== undefined) {
      where.ativo = ativo;
    }

    return this.aprovadorRepository.find({
      where,
      order: { criado_em: 'ASC' }
    });
  }

  /**
   * Remove um aprovador de uma configuração
   */
  async removerAprovador(acaoId: string, aprovadorId: string): Promise<void> {
    const aprovador = await this.aprovadorRepository.findOne({
      where: {
        id: aprovadorId,
        acao_aprovacao_id: acaoId
      }
    });

    if (!aprovador) {
      throw new NotFoundException('Aprovador não encontrado');
    }

    await this.aprovadorRepository.update(aprovadorId, { ativo: false });
    
    this.logger.log(`Aprovador ${aprovadorId} removido da configuração ${acaoId}`);
  }

  /**
   * Cria aprovadores baseado na estratégia de aprovação
   */
  private async criarAprovadoresComEstrategia(
    solicitacaoId: string,
    configuracao: AcaoAprovacao,
    configuracaoDecorator: ConfiguracaoAprovacao,
    solicitanteId: string
  ): Promise<void> {
    switch (configuracao.estrategia) {
      case EstrategiaAprovacao.ESCALONAMENTO_SETOR:
        await this.criarAprovadoresEscalonamentoSetor(
          solicitacaoId,
          configuracao,
          configuracaoDecorator
        );
        break;

      case EstrategiaAprovacao.AUTOAPROVACAO_PERFIL:
        await this.criarAprovadoresAutoaprovacaoPerfil(
          solicitacaoId,
          configuracao,
          configuracaoDecorator,
          solicitanteId
        );
        break;

      case EstrategiaAprovacao.SIMPLES:
      case EstrategiaAprovacao.MAIORIA:
      default:
        // Estratégias tradicionais - usa aprovadores configurados
        await this.criarAprovadoresTradicional(solicitacaoId, configuracao);
        break;
    }
  }

  /**
   * Cria aprovadores para estratégia de escalonamento por setor
   */
  /**
   * Cria aprovadores baseado na estratégia de escalonamento por setor
   * Busca usuários do setor específico que possuem a permissão de aprovação
   */
  private async criarAprovadoresEscalonamentoSetor(
    solicitacaoId: string,
    configuracao: AcaoAprovacao,
    configuracaoDecorator: ConfiguracaoAprovacao
  ): Promise<void> {
    const setorEscalonamento = configuracao.setor_escalonamento || configuracaoDecorator.setorEscalonamento;
    const permissaoAprovacao = configuracao.permissao_aprovacao || configuracaoDecorator.permissaoAprovacao;

    if (!setorEscalonamento || !permissaoAprovacao) {
      this.logger.warn(
        `Configuração incompleta para escalonamento por setor. ` +
        `Setor: ${setorEscalonamento}, Permissão: ${permissaoAprovacao}. ` +
        `Usando aprovadores tradicionais como fallback.`
      );
      await this.criarAprovadoresTradicional(solicitacaoId, configuracao);
      return;
    }

    try {
      this.logger.log(
        `Iniciando escalonamento por setor: ${setorEscalonamento} ` +
        `com permissão: ${permissaoAprovacao}`
      );

      // Buscar usuários do setor específico
      const usuariosSetor = await this.usuarioService.buscarPorSetor([setorEscalonamento]);
      
      if (usuariosSetor.length === 0) {
        this.logger.warn(
          `Nenhum usuário encontrado no setor '${setorEscalonamento}'. ` +
          `Usando aprovadores tradicionais como fallback.`
        );
        await this.criarAprovadoresTradicional(solicitacaoId, configuracao);
        return;
      }

      // Buscar usuários com a permissão específica
      const usuariosComPermissao = await this.usuarioService.buscarPorPermissao([permissaoAprovacao]);
      
      if (usuariosComPermissao.length === 0) {
        this.logger.warn(
          `Nenhum usuário encontrado com a permissão '${permissaoAprovacao}'. ` +
          `Usando aprovadores tradicionais como fallback.`
        );
        await this.criarAprovadoresTradicional(solicitacaoId, configuracao);
        return;
      }

      // Encontrar interseção: usuários que estão no setor E possuem a permissão
      const aprovadoresElegiveis = usuariosSetor.filter(usuarioSetor =>
        usuariosComPermissao.some(usuarioPermissao => 
          usuarioPermissao.id === usuarioSetor.id
        )
      );

      if (aprovadoresElegiveis.length === 0) {
        this.logger.warn(
          `Nenhum usuário encontrado no setor '${setorEscalonamento}' ` +
          `com a permissão '${permissaoAprovacao}'. ` +
          `Usando aprovadores tradicionais como fallback.`
        );
        await this.criarAprovadoresTradicional(solicitacaoId, configuracao);
        return;
      }

      // Criar aprovadores para todos os usuários elegíveis
      const aprovadores = aprovadoresElegiveis.map(usuario => 
        this.aprovadorRepository.create({
          solicitacao_aprovacao_id: solicitacaoId,
          acao_aprovacao_id: configuracao.id,
          usuario_id: usuario.id,
          ativo: true
        })
      );

      await this.aprovadorRepository.save(aprovadores);

      this.logger.log(
        `Escalonamento por setor concluído. ` +
        `${aprovadores.length} aprovadores criados para o setor '${setorEscalonamento}' ` +
        `com permissão '${permissaoAprovacao}'.`
      );

    } catch (error) {
      this.logger.error(
        `Erro durante escalonamento por setor: ${error.message}`,
        error.stack
      );
      
      // Em caso de erro, usar aprovadores tradicionais como fallback
      this.logger.warn('Usando aprovadores tradicionais como fallback devido ao erro.');
      await this.criarAprovadoresTradicional(solicitacaoId, configuracao);
    }
   }

  /**
   * Cria aprovadores baseado na estratégia de autoaprovação por perfil
   * Verifica se o solicitante possui algum dos perfis necessários para se autoaprovar
   */
  private async criarAprovadoresAutoaprovacaoPerfil(
    solicitacaoId: string,
    configuracao: AcaoAprovacao,
    configuracaoDecorator: ConfiguracaoAprovacao,
    solicitanteId: string
  ): Promise<void> {
    try {
      // Validar e obter perfis de auto-aprovação
      const perfisAutoAprovacao = this.obterPerfisAutoAprovacao(configuracao, configuracaoDecorator);
      
      if (!perfisAutoAprovacao.length) {
        this.logger.warn(
          `Configuração incompleta para autoaprovação por perfil. ` +
          `Perfis necessários não definidos. ` +
          `Usando aprovadores tradicionais como fallback.`
        );
        await this.criarAprovadoresTradicional(solicitacaoId, configuracao);
        return;
      }

      // Validar dados do solicitante
      const resultadoValidacao = await this.validarSolicitanteParaAutoAprovacao(
        solicitanteId, 
        perfisAutoAprovacao
      );

      if (!resultadoValidacao.podeAutoAprovar) {
        this.logger.warn(
          `Solicitante ${solicitanteId} não atende aos critérios de auto-aprovação: ${resultadoValidacao.motivo}. ` +
          `Usando aprovadores tradicionais como fallback.`
        );
        await this.criarAprovadoresTradicional(solicitacaoId, configuracao);
        return;
      }

      // Criar aprovador sendo o próprio solicitante
      const aprovador = this.aprovadorRepository.create({
        solicitacao_aprovacao_id: solicitacaoId,
        acao_aprovacao_id: configuracao.id,
        usuario_id: solicitanteId,
        ativo: true
      });

      await this.aprovadorRepository.save(aprovador);

      this.logger.log(
        `Autoaprovação por perfil configurada com sucesso. ` +
        `Solicitante ${solicitanteId} com perfil '${resultadoValidacao.perfilSolicitante}' ` +
        `pode autoaprovar (perfis permitidos: [${perfisAutoAprovacao.join(', ')}]).`
      );

    } catch (error) {
      this.logger.error(
        `Erro durante verificação de autoaprovação por perfil: ${error.message}`,
        error.stack
      );
      
      // Em caso de erro, usar aprovadores tradicionais como fallback
      this.logger.warn('Usando aprovadores tradicionais como fallback devido ao erro.');
      await this.criarAprovadoresTradicional(solicitacaoId, configuracao);
    }
  }

  /**
   * Obtém a lista de perfis permitidos para auto-aprovação
   * Prioriza configuração da entidade, depois decorator
   */
  private obterPerfisAutoAprovacao(
    configuracao: AcaoAprovacao,
    configuracaoDecorator: ConfiguracaoAprovacao
  ): string[] {
    let perfisAutoAprovacao: string[] = [];
    
    // Prioridade 1: Configuração da entidade (array)
    if (configuracao.perfil_auto_aprovacao && Array.isArray(configuracao.perfil_auto_aprovacao)) {
      perfisAutoAprovacao = configuracao.perfil_auto_aprovacao.filter(perfil => 
        perfil && typeof perfil === 'string' && perfil.trim().length > 0
      );
    } 
    // Prioridade 2: Configuração da entidade (string única - compatibilidade)
    else if (configuracao.perfil_auto_aprovacao && typeof configuracao.perfil_auto_aprovacao === 'string') {
      const perfil = (configuracao.perfil_auto_aprovacao as string).trim();
      if (perfil.length > 0) {
        perfisAutoAprovacao = [perfil];
      }
    } 
    // Prioridade 3: Configuração do decorator
    else if (configuracaoDecorator.perfilAutoAprovacao) {
      if (Array.isArray(configuracaoDecorator.perfilAutoAprovacao)) {
        perfisAutoAprovacao = configuracaoDecorator.perfilAutoAprovacao.filter(perfil => 
          perfil && typeof perfil === 'string' && perfil.trim().length > 0
        );
      } else {
        // Como perfilAutoAprovacao é definido como string[] na interface,
        // este bloco não deveria ser executado, mas mantemos para compatibilidade
        const perfilValue = configuracaoDecorator.perfilAutoAprovacao as any;
        if (typeof perfilValue === 'string') {
          const perfil = perfilValue.trim();
          if (perfil.length > 0) {
            perfisAutoAprovacao = [perfil];
          }
        }
      }
    }

    // Normalizar perfis (remover espaços e converter para lowercase para comparação)
    return perfisAutoAprovacao.map(perfil => perfil.trim());
  }

  /**
   * Valida se o solicitante pode realizar auto-aprovação
   * Retorna resultado detalhado da validação
   */
  private async validarSolicitanteParaAutoAprovacao(
    solicitanteId: string,
    perfisAutoAprovacao: string[]
  ): Promise<{
    podeAutoAprovar: boolean;
    perfilSolicitante?: string;
    motivo?: string;
  }> {
    // Buscar dados completos do solicitante
    const solicitante = await this.usuarioService.findById(solicitanteId);
    
    if (!solicitante) {
      return {
        podeAutoAprovar: false,
        motivo: `Solicitante não encontrado: ${solicitanteId}`
      };
    }

    // Verificar se o usuário está ativo
    if (solicitante.status !== 'ativo') {
      return {
        podeAutoAprovar: false,
        perfilSolicitante: solicitante.role?.codigo,
        motivo: 'Usuário não está ativo no sistema'
      };
    }

    // Verificar se possui role/perfil
    const perfilSolicitante = solicitante.role?.codigo;
    
    if (!perfilSolicitante) {
      return {
        podeAutoAprovar: false,
        motivo: 'Perfil do solicitante não encontrado ou não definido'
      };
    }

    // Verificar se a role está ativa
    if (solicitante.role && !solicitante.role.isAtiva()) {
      return {
        podeAutoAprovar: false,
        perfilSolicitante,
        motivo: 'Perfil do solicitante não está ativo'
      };
    }

    // Verificar se o perfil do solicitante está na lista de perfis permitidos
    const podeAutoAprovar = perfisAutoAprovacao.some(perfil => 
      perfil.toLowerCase() === perfilSolicitante.toLowerCase()
    );
    
    if (!podeAutoAprovar) {
      return {
        podeAutoAprovar: false,
        perfilSolicitante,
        motivo: `Perfil '${perfilSolicitante}' não está entre os perfis permitidos [${perfisAutoAprovacao.join(', ')}]`
      };
    }

    return {
      podeAutoAprovar: true,
      perfilSolicitante
    };
  }

  /**
   * Obtém dados do usuário para validação de auto-aprovação
   */
  async obterUsuario(usuarioId: string): Promise<any> {
    try {
      const usuario = await this.usuarioService.findById(usuarioId);
      
      if (!usuario) {
        return null;
      }

      return {
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email,
        perfil: usuario.role?.codigo,
        status: usuario.status === 'ativo' ? 'ATIVO' : 'INATIVO',
        role: usuario.role
      };
    } catch (error) {
      this.logger.error(
        `Erro ao obter dados do usuário ${usuarioId}: ${error.message}`,
        error.stack
      );
      return null;
    }
  }

  /**
   * Verifica se o usuário possui permissões gerais para auto-aprovação
   */
  async verificarPermissaoGeral(usuarioId: string, permissoes: string[]): Promise<boolean> {
    try {
      // Verificar cada permissão na lista
      for (const permissao of permissoes) {
        const temPermissao = await this.permissionService.hasPermission({
          userId: usuarioId,
          permissionName: permissao,
          scopeType: 'GLOBAL' as any,
          scopeId: undefined
        });
        
        if (temPermissao) {
          this.logger.log(
            `Usuário ${usuarioId} possui permissão geral '${permissao}' para auto-aprovação`
          );
          return true;
        }
      }
      
      return false;
    } catch (error) {
      this.logger.error(
        `Erro ao verificar permissões gerais para usuário ${usuarioId}: ${error.message}`,
        error.stack
      );
      return false;
    }
  }

  /**
   * Cria aprovadores para estratégias tradicionais (SIMPLES, MAIORIA)
   */
  private async criarAprovadoresTradicional(
    solicitacaoId: string,
    configuracao: AcaoAprovacao
  ): Promise<void> {
    const aprovadoresConfig = await this.listarAprovadores(configuracao.id, true);
    
    if (aprovadoresConfig.length === 0) {
      throw new BadRequestException('Nenhum aprovador configurado para esta ação');
    }

    await this.criarAprovadoresParaSolicitacao(solicitacaoId, aprovadoresConfig);
  }

  // Métodos privados auxiliares

  /**
   * Gera código único para solicitação
   */
  private async gerarCodigoSolicitacao(): Promise<string> {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `SOL-${timestamp}-${random}`.toUpperCase();
  }

  /**
   * Cria aprovadores para uma solicitação específica
   */
  private async criarAprovadoresParaSolicitacao(
    solicitacaoId: string,
    aprovadoresConfig: Aprovador[]
  ): Promise<void> {
    const aprovadores = aprovadoresConfig
      .filter(a => a.ativo)
      .map(aprovadorConfig => 
        this.aprovadorRepository.create({
          solicitacao_aprovacao_id: solicitacaoId,
          acao_aprovacao_id: aprovadorConfig.acao_aprovacao_id,
          usuario_id: aprovadorConfig.usuario_id,
          ativo: true
        })
      );

    if (aprovadores.length > 0) {
      await this.aprovadorRepository.save(aprovadores);
    }
  }

  /**
   * Atualiza o status da solicitação baseado nas aprovações
   */
  private async atualizarStatusSolicitacao(solicitacao: SolicitacaoAprovacao): Promise<SolicitacaoAprovacao> {
    // Recarrega a solicitação com aprovadores atualizados
    const solicitacaoAtualizada = await this.obterSolicitacao(solicitacao.id);
    
    let novoStatus = solicitacao.status;

    if (solicitacaoAtualizada.foiRejeitada()) {
      novoStatus = StatusSolicitacao.REJEITADA;
    } else if (solicitacaoAtualizada.podeSerAprovada()) {
      novoStatus = StatusSolicitacao.APROVADA;
    }

    if (novoStatus !== solicitacao.status) {
      await this.solicitacaoRepository.update(solicitacao.id, {
        status: novoStatus,
        processado_em: new Date()
      });

      this.logger.log(`Status da solicitação ${solicitacao.codigo} alterado para: ${novoStatus}`);
      
      // Retorna a solicitação com o status atualizado
      return await this.obterSolicitacao(solicitacao.id);
    }
    
    return solicitacaoAtualizada;
  }

  /**
   * Notifica os aprovadores sobre eventos da solicitação
   */
  private async notificarAprovadores(
    solicitacaoId: string,
    tipoEvento: 'NOVA_SOLICITACAO' | 'CANCELADA'
  ): Promise<void> {
    try {
      const solicitacao = await this.obterSolicitacao(solicitacaoId);
      const aprovadores = solicitacao.aprovadores.filter(a => a.ativo);

      for (const aprovador of aprovadores) {
        let titulo: string;
        let conteudo: string;

        switch (tipoEvento) {
          case 'NOVA_SOLICITACAO':
            titulo = 'Nova Solicitação de Aprovação';
            conteudo = `Uma nova solicitação (${solicitacao.codigo}) aguarda sua aprovação para: ${solicitacao.acao_aprovacao.nome}`;
            break;
          case 'CANCELADA':
            titulo = 'Solicitação Cancelada';
            conteudo = `A solicitação ${solicitacao.codigo} foi cancelada pelo solicitante`;
            break;
        }

        await this.notificacaoService.criarNotificacaoAprovacao({
          destinatario_id: aprovador.usuario_id,
          titulo,
          conteudo,
          solicitacao_id: solicitacaoId,
          link: `/aprovacoes/${solicitacaoId}`
        });
      }

      this.logger.log(`Notificações enviadas para ${aprovadores.length} aprovadores - Evento: ${tipoEvento}`);
    } catch (error) {
      this.logger.error(`Erro ao notificar aprovadores: ${error.message}`, error.stack);
    }
  }

  /**
   * Notifica o solicitante sobre o resultado da aprovação
   */
  private async notificarSolicitante(
    solicitacaoId: string,
    resultado: 'APROVADA' | 'REJEITADA' | 'ERRO_EXECUCAO'
  ): Promise<void> {
    try {
      const solicitacao = await this.obterSolicitacao(solicitacaoId);

      let titulo: string;
      let conteudo: string;

      switch (resultado) {
        case 'APROVADA':
          titulo = 'Solicitação Aprovada';
          conteudo = `Sua solicitação ${solicitacao.codigo} foi aprovada e executada automaticamente`;
          break;
        case 'REJEITADA':
          titulo = 'Solicitação Rejeitada';
          conteudo = `Sua solicitação ${solicitacao.codigo} foi rejeitada`;
          break;
        case 'ERRO_EXECUCAO':
          titulo = 'Erro na Execução';
          conteudo = `Sua solicitação ${solicitacao.codigo} foi aprovada, mas ocorreu um erro durante a execução`;
          break;
      }

      await this.notificacaoService.criarNotificacaoAprovacao({
        destinatario_id: solicitacao.solicitante_id,
        titulo,
        conteudo,
        solicitacao_id: solicitacaoId,
        link: `/aprovacoes/${solicitacaoId}`
      });

      this.logger.log(`Notificação enviada para solicitante - Resultado: ${resultado}`);
    } catch (error) {
      this.logger.error(`Erro ao notificar solicitante: ${error.message}`, error.stack);
    }
  }

  /**
   * Notifica outros aprovadores sobre a decisão tomada
   */
  private async notificarOutrosAprovadores(
    solicitacaoId: string,
    aprovadorQueDecidiu: string,
    decisao: 'APROVADA' | 'REJEITADA'
  ): Promise<void> {
    try {
      const solicitacao = await this.obterSolicitacao(solicitacaoId);
      
      // Busca outros aprovadores que ainda não decidiram
      const outrosAprovadores = solicitacao.aprovadores.filter(
        aprovador => aprovador.usuario_id !== aprovadorQueDecidiu && 
                    aprovador.ativo && 
                    !aprovador.jaDecidiu()
      );

      // Notifica cada aprovador sobre a decisão
      for (const aprovador of outrosAprovadores) {
        const titulo = decisao === 'APROVADA' ? 'Solicitação Aprovada por Outro Aprovador' : 'Solicitação Rejeitada por Outro Aprovador';
        const conteudo = `A solicitação ${solicitacao.codigo} foi ${decisao.toLowerCase()} por outro aprovador. Ação: ${solicitacao.acao_aprovacao.nome}`;

        await this.notificacaoService.criarNotificacaoAprovacao({
          destinatario_id: aprovador.usuario_id,
          titulo,
          conteudo,
          solicitacao_id: solicitacaoId,
          link: `/aprovacoes/${solicitacaoId}`
        });
      }

      if (outrosAprovadores.length > 0) {
        this.logger.log(
          `${outrosAprovadores.length} aprovadores notificados sobre decisão ${decisao} da solicitação ${solicitacao.codigo}`
        );
      }
    } catch (error) {
      this.logger.error(`Erro ao notificar outros aprovadores: ${error.message}`, error.stack);
    }
  }
}