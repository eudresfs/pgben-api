import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AcaoAprovacao, SolicitacaoAprovacao } from '../entities';
import { ConfiguracaoAprovador } from '../entities/configuracao-aprovador.entity';
import { SolicitacaoAprovador } from '../entities/solicitacao-aprovador.entity';
import { CriarSolicitacaoDto, CriarAcaoAprovacaoDto } from '../dtos';
import { StatusSolicitacao, TipoAcaoCritica, EstrategiaAprovacao } from '../enums';
import { ConfiguracaoAprovacao } from '../decorators';
import { UsuarioService } from '../../usuario/services/usuario.service';
import { AuditEventEmitter } from '../../auditoria/events/emitters/audit-event.emitter';
import { ExecucaoAcaoService } from './execucao-acao.service';
import { PermissionService } from '../../../auth/services/permission.service';
import { SYSTEM_USER_UUID } from '../../../shared/constants/system.constants';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { TipoEscopo } from '../../../entities/user-permission.entity';

/**
 * Serviço principal consolidado para gerenciamento de aprovações
 * Centraliza toda a lógica de aprovação em um único serviço
 */
@Injectable()
export class AprovacaoService {
  /**
   * Logger instanciado diretamente para evitar problemas de injeção
   */
  private readonly logger = new Logger(AprovacaoService.name);

  constructor(
    @InjectRepository(AcaoAprovacao)
    private readonly acaoAprovacaoRepository: Repository<AcaoAprovacao>,
    
    @InjectRepository(SolicitacaoAprovacao)
    private readonly solicitacaoRepository: Repository<SolicitacaoAprovacao>,
    
    @InjectRepository(ConfiguracaoAprovador)
    private readonly configuracaoAprovadorRepository: Repository<ConfiguracaoAprovador>,
    
    @InjectRepository(SolicitacaoAprovador)
    private readonly solicitacaoAprovadorRepository: Repository<SolicitacaoAprovador>,
    
    private readonly usuarioService: UsuarioService,
    private readonly eventEmitter: EventEmitter2,
    private readonly auditEventEmitter: AuditEventEmitter,
    private readonly execucaoAcaoService: ExecucaoAcaoService,
    private readonly permissionService: PermissionService
  ) {}

  /**
   * Verifica se uma ação requer aprovação
   * Inclui verificações de segurança para garantir operação correta
   */
  async requerAprovacao(tipoAcao: TipoAcaoCritica): Promise<boolean> {
    try {
      this.logger.debug(`Verificando se ação ${tipoAcao} requer aprovação`);
      
      // Verificação de segurança do repository
      if (!this.acaoAprovacaoRepository) {
        this.logger.error('acaoAprovacaoRepository não está disponível');
        throw new Error('Dependência crítica não disponível: acaoAprovacaoRepository');
      }

      const configuracao = await this.acaoAprovacaoRepository.findOne({
        where: { tipo_acao: tipoAcao, ativo: true }
      });
      
      const requerAprovacao = !!configuracao;
      this.logger.debug(`Ação ${tipoAcao} ${requerAprovacao ? 'requer' : 'não requer'} aprovação`);
      
      return requerAprovacao;
    } catch (error) {
      this.logger.error(`Erro ao verificar se ação ${tipoAcao} requer aprovação:`, error);
      // Em caso de erro, assumir que requer aprovação por segurança
      return true;
    }
  }

  /**
   * Obtém a configuração de aprovação para um tipo de ação
   * Inclui verificações de segurança e tratamento de erros robusto
   */
  async obterConfiguracaoAprovacao(tipoAcao: TipoAcaoCritica): Promise<AcaoAprovacao> {
    try {
      this.logger.debug(`Obtendo configuração de aprovação para: ${tipoAcao}`);
      
      // Verificação de segurança do repository
      if (!this.acaoAprovacaoRepository) {
        this.logger.error('acaoAprovacaoRepository não está disponível');
        throw new Error('Dependência crítica não disponível: acaoAprovacaoRepository');
      }

      // Validação do parâmetro de entrada
      if (!tipoAcao) {
        this.logger.error('Tipo de ação não fornecido');
        throw new BadRequestException('Tipo de ação é obrigatório');
      }

      const configuracao = await this.acaoAprovacaoRepository.findOne({
        where: { tipo_acao: tipoAcao, ativo: true },
        relations: ['configuracao_aprovadores']
      });

      if (!configuracao) {
        this.logger.warn(`Configuração de aprovação não encontrada para: ${tipoAcao}`);
        throw new NotFoundException(`Configuração de aprovação não encontrada para: ${tipoAcao}`);
      }

      // Verificação adicional de integridade
      if (!configuracao.configuracao_aprovadores || configuracao.configuracao_aprovadores.length === 0) {
        this.logger.warn(`Configuração encontrada mas sem aprovadores para: ${tipoAcao}`);
        throw new BadRequestException(`Configuração de aprovação sem aprovadores definidos para: ${tipoAcao}`);
      }

      this.logger.debug(`Configuração obtida com sucesso para ${tipoAcao}: ${configuracao.configuracao_aprovadores.length} aprovadores`);
      return configuracao;
    } catch (error) {
      this.logger.error(`Erro ao obter configuração de aprovação para ${tipoAcao}:`, error);
      
      // Re-lançar erros conhecidos
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      
      // Tratar erros inesperados
      throw new Error(`Erro interno ao obter configuração de aprovação: ${error.message}`);
    }
  }

  /**
   * Busca solicitação pendente para o mesmo item (independente da ação)
   * Implementa validação correta: apenas uma solicitação por item por vez
   * Inclui verificações de segurança e tratamento de erros
   */
  async buscarSolicitacaoPendente(
    solicitanteId: string,
    tipoAcao: TipoAcaoCritica,
    dadosAcao?: Record<string, any>
  ): Promise<SolicitacaoAprovacao | null> {
    try {
      this.logger.debug(`Buscando solicitação pendente ou em execução para solicitante ${solicitanteId}, ação ${tipoAcao}`);
      
      // Verificação de segurança do repository
      if (!this.solicitacaoRepository) {
        this.logger.error('solicitacaoRepository não está disponível');
        throw new Error('Dependência crítica não disponível: solicitacaoRepository');
      }

      // Validação dos parâmetros de entrada
      if (!solicitanteId) {
        this.logger.error('ID do solicitante não fornecido');
        throw new BadRequestException('ID do solicitante é obrigatório');
      }

      if (!tipoAcao) {
        this.logger.error('Tipo de ação não fornecido');
        throw new BadRequestException('Tipo de ação é obrigatório');
      }

      const query = this.solicitacaoRepository
        .createQueryBuilder('solicitacao')
        .innerJoin('solicitacao.acao_aprovacao', 'acao')
        .where('solicitacao.solicitante_id = :solicitanteId', { solicitanteId })
        .andWhere('solicitacao.status IN (:...statusPendentes)', {
          statusPendentes: [StatusSolicitacao.PENDENTE, StatusSolicitacao.APROVADA]
        });

      // Validação principal: verifica se já existe solicitação pendente para o mesmo item
      // O ID do item está sempre em dados_acao.params.id
      if (dadosAcao?.params?.id) {
        query.andWhere("solicitacao.dados_acao->'params'->>'id' = :itemId", {
          itemId: dadosAcao.params.id
        });
        this.logger.debug(`Buscando por item específico: ${dadosAcao.params.id}`);
      } else {
        // Fallback: se não há ID específico do item, valida por tipo de ação
        // (para ações que não afetam um item específico)
        query.andWhere('acao.tipo_acao = :tipoAcao', { tipoAcao });
        this.logger.debug(`Buscando por tipo de ação: ${tipoAcao}`);
      }

      const solicitacao = await query.getOne();
      
      if (solicitacao) {
        this.logger.debug(`Solicitação ${solicitacao.status} encontrada: ${solicitacao.id}`);
      } else {
        this.logger.debug('Nenhuma solicitação pendente ou em execução encontrada');
      }

      return solicitacao;
    } catch (error) {
      this.logger.error(`Erro ao buscar solicitação pendente para ${solicitanteId}:`, error);
      
      // Re-lançar erros conhecidos
      if (error instanceof BadRequestException) {
        throw error;
      }
      
      // Tratar erros inesperados
      throw new Error(`Erro interno ao buscar solicitação pendente: ${error.message}`);
    }
  }

  /**
   * Valida se pode criar uma nova solicitação
   * Implementa regra: apenas uma solicitação pendente ou em execução por item por vez
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
      const statusTexto = solicitacaoPendente.status === StatusSolicitacao.PENDENTE 
        ? 'pendente' 
        : 'sendo executada';
      
      const mensagem = itemId 
        ? `Já existe uma solicitação ${statusTexto} para ${solicitacaoPendente.justificativa} (Protocolo: ${solicitacaoPendente.codigo}). ` +
          `${solicitacaoPendente.status === StatusSolicitacao.PENDENTE ? 'Aguarde a decisão do aprovador responsável.' : 'Aguarde a conclusão da execução.'}`
        : `Já existe uma solicitação ${statusTexto} para ${solicitacaoPendente.justificativa} (Protocolo: ${solicitacaoPendente.codigo}). ` +
          `${solicitacaoPendente.status === StatusSolicitacao.PENDENTE ? 'Aguarde a decisão do aprovador.' : 'Aguarde a conclusão da execução.'}`;
      
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
    await this.criarAprovadoresParaSolicitacao(solicitacaoSalva.id, configuracao.configuracao_aprovadores);

    // Emite evento único consolidado (listeners processarão notificações)
    this.eventEmitter.emit('solicitacao.criada', {
      solicitacao: solicitacaoSalva,
      solicitanteId,
      configuracao,
      aprovadores: configuracao.configuracao_aprovadores.map(a => a.usuario_id),
      timestamp: new Date()
    });

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

    // Notificação será processada pelo AprovacaoAblyListener

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
    const aprovador = await this.solicitacaoAprovadorRepository.findOne({
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
      'SolicitacaoAprovador',
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

    await this.solicitacaoAprovadorRepository.save(aprovador);

    // Atualiza o status da solicitação
    const solicitacaoAtualizada = await this.atualizarStatusSolicitacao(solicitacao);

    // Emite evento único consolidado de mudança de status
    const eventoStatus = {
      solicitacao: solicitacaoAtualizada,
      solicitacaoId,
      codigo: solicitacao.codigo,
      statusAnterior: solicitacao.status,
      novoStatus: solicitacaoAtualizada.status,
      aprovadorId,
      solicitanteId: solicitacao.solicitante_id,
      aprovadores: solicitacao.solicitacao_aprovadores.map(a => a.usuario_id),
      decisao: aprovado ? 'APROVADA' : 'REJEITADA',
      justificativa,
      timestamp: new Date()
    };

    // Emite apenas via EventEmitter - listeners processarão notificações
    this.eventEmitter.emit('solicitacao.status.alterado', eventoStatus);

    // Processa ações específicas baseadas no status final
    if (solicitacaoAtualizada.status === StatusSolicitacao.APROVADA) {
      // Executa a ação aprovada de forma assíncrona
      this.executarAcaoAprovada(solicitacaoAtualizada).catch(error => {
        this.logger.error(`Erro na execução assíncrona da ação aprovada: ${error.message}`, error.stack);
      });
      
      // Evento específico de aprovação final
      this.eventEmitter.emit('solicitacao.aprovada', {
        solicitacao: solicitacaoAtualizada,
        aprovadorId,
        solicitanteId: solicitacaoAtualizada.solicitante_id,
        justificativa,
        timestamp: new Date()
      });
      
    } else if (solicitacaoAtualizada.status === StatusSolicitacao.REJEITADA) {
      // Evento específico de rejeição
      this.eventEmitter.emit('solicitacao.rejeitada', {
        solicitacao: solicitacaoAtualizada,
        aprovadorId,
        solicitanteId: solicitacaoAtualizada.solicitante_id,
        justificativa,
        timestamp: new Date()
      });
    }

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
      relations: ['acao_aprovacao', 'solicitacao_aprovadores']
    });

    if (!solicitacao) {
      throw new NotFoundException('Solicitação não encontrada');
    }

    return solicitacao;
  }

  /**
   * Busca uma solicitação por código
   */
  async buscarPorCodigo(codigo: string): Promise<SolicitacaoAprovacao | null> {
    try {
      this.logger.debug(`Buscando solicitação por código: ${codigo}`);
      
      // Validação do código
      if (!codigo || typeof codigo !== 'string') {
        this.logger.warn(`Código inválido fornecido: ${codigo}`);
        return null;
      }

      // Busca a solicitação pelo código
      const solicitacao = await this.solicitacaoRepository.findOne({
        where: { codigo },
        relations: ['acao_aprovacao', 'solicitacao_aprovadores']
      });

      if (!solicitacao) {
        this.logger.debug(`Solicitação com código ${codigo} não encontrada`);
        return null;
      }

      this.logger.debug(`Solicitação encontrada: ID ${solicitacao.id}, Status: ${solicitacao.status}`);
      return solicitacao;
    } catch (error) {
      this.logger.error(`Erro ao buscar solicitação por código ${codigo}:`, error);
      return null;
    }
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
      .leftJoinAndSelect('solicitacao.solicitacao_aprovadores', 'aprovadores')
      .orderBy('solicitacao.created_at', 'DESC');

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
      .leftJoinAndSelect('solicitacao.solicitacao_aprovadores', 'aprovadores')
      .where('solicitacao.status = :status', { status: StatusSolicitacao.PENDENTE })
      .andWhere('aprovadores.usuario_id = :aprovadorId', { aprovadorId })
      .andWhere('aprovadores.ativo = true')
      .andWhere('aprovadores.aprovado IS NULL')
      .orderBy('solicitacao.created_at', 'DESC');

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
       .leftJoinAndSelect('solicitacao.solicitacao_aprovadores', 'aprovadores')
       .where('solicitacao.status = :status', { status: StatusSolicitacao.PENDENTE })
       .andWhere("solicitacao.dados_acao->'params'->>'id' = :entidadeId", { entidadeId })
       .orderBy('solicitacao.created_at', 'DESC');

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
      created_at: solicitacao.created_at,
      acao_aprovacao: {
        id: solicitacao.acao_aprovacao.id,
        tipo_acao: solicitacao.acao_aprovacao.tipo_acao,
        estrategia: solicitacao.acao_aprovacao.estrategia,
        descricao: solicitacao.acao_aprovacao.descricao
      },
      aprovadores: solicitacao.solicitacao_aprovadores
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
      
      // Obter o ID do último aprovador que tomou a decisão
      const ultimoAprovador = solicitacao.solicitacao_aprovadores
        .filter(a => a.aprovado === true && a.decidido_em)
        .sort((a, b) => new Date(b.decidido_em).getTime() - new Date(a.decidido_em).getTime())[0];
      
      const aprovadorId = ultimoAprovador?.usuario_id || SYSTEM_USER_UUID;
      
      // Registra auditoria do início da execução (não-bloqueante)
      this.auditEventEmitter.emitEntityUpdated(
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
          metodo_execucao: solicitacao.metodo_execucao,
          aprovador_responsavel: aprovadorId
        },
        aprovadorId
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
      
      // Atualiza status e registra auditoria em paralelo para melhor performance
      await Promise.all([
        this.solicitacaoRepository.update(solicitacao.id, {
          status: StatusSolicitacao.EXECUTADA,
          executado_em: new Date()
        }),
        this.auditEventEmitter.emitEntityUpdated(
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
            dados_execucao: dadosExecucao,
            aprovador_responsavel: aprovadorId
          },
          aprovadorId
        )
      ]);
      
      // Evento consolidado de execução bem-sucedida
      const eventoExecucao = {
        solicitacao,
        solicitanteId: solicitacao.solicitante_id,
        aprovadorId: aprovadorId,
        dadosExecucao: dadosExecucao,
        timestamp: new Date()
      };

      // Emite evento para processamento pelos listeners
      this.eventEmitter.emit('solicitacao.executada', eventoExecucao);
      
      this.logger.log(`Ação executada com sucesso para solicitação: ${solicitacao.codigo}`);
      
      // Auditoria e execução real já implementadas acima
      
    } catch (error) {
      this.logger.error(`Erro ao executar ação para solicitação ${solicitacao.codigo}:`, error);
      
      // Obter o ID do último aprovador que tomou a decisão
      const ultimoAprovador = solicitacao.solicitacao_aprovadores
        .filter(a => a.aprovado === true && a.decidido_em)
        .sort((a, b) => new Date(b.decidido_em).getTime() - new Date(a.decidido_em).getTime())[0];
      
      const aprovadorId = ultimoAprovador?.usuario_id || SYSTEM_USER_UUID;
      
      // Atualiza status e registra auditoria em paralelo
      await Promise.all([
        this.solicitacaoRepository.update(solicitacao.id, {
          status: StatusSolicitacao.ERRO_EXECUCAO,
          erro_execucao: error.message
        }),
        this.auditEventEmitter.emitEntityUpdated(
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
            erro_execucao: error.message,
            aprovador_responsavel: aprovadorId
          },
          aprovadorId
        )
      ]);
      
      // Evento consolidado de erro
      const eventoErro = {
        solicitacao,
        solicitanteId: solicitacao.solicitante_id,
        aprovadorId: aprovadorId,
        erro: error.message,
        timestamp: new Date()
      };

      // Emite evento para processamento pelos listeners
      this.eventEmitter.emit('solicitacao.erro_execucao', eventoErro);
      
      throw error;
    }
  }

  /**
   * Cancela uma solicitação pendente
   */
  async cancelarSolicitacao(solicitacaoId: string, usuarioId: string, motivo?: string): Promise<SolicitacaoAprovacao> {
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

    // Emite evento para processamento pelos listeners
    this.eventEmitter.emit('solicitacao.cancelada', {
      solicitacao,
      solicitanteId: solicitacao.solicitante_id,
      motivo,
      aprovadores: solicitacao.solicitacao_aprovadores.map(a => a.usuario_id),
      timestamp: new Date()
    });

    this.logger.log(`Solicitação ${solicitacao.codigo} cancelada por ${usuarioId}`);
    
    return this.obterSolicitacao(solicitacaoId);
  }

  /**
   * Lista todas as ações de aprovação
   */
  async listarAcoesAprovacao(filtros: any = {}): Promise<AcaoAprovacao[]> {
    const queryBuilder = this.acaoAprovacaoRepository
      .createQueryBuilder('acao')
      .leftJoinAndSelect('acao.configuracao_aprovadores', 'aprovadores')
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
      relations: ['configuracao_aprovadores']
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
   * Cadastra automaticamente todas as permissões necessárias do módulo de aprovação
   * @param usuarioId ID do usuário que receberá as permissões
   * @param createdBy ID do usuário que está criando as permissões
   */
  private async cadastrarPermissoesAprovacao(usuarioId: string, createdBy: string): Promise<void> {
    // Lista completa de permissões do módulo de aprovação
    const permissoes = [
      // Permissões do AprovacaoController
      { nome: 'aprovacao.criar', descricao: 'Criar solicitações de aprovação' },
      { nome: 'aprovacao.listar', descricao: 'Listar solicitações de aprovação' },
      { nome: 'aprovacao.visualizar', descricao: 'Visualizar detalhes de solicitações de aprovação' },
      { nome: 'aprovacao.processar', descricao: 'Processar (aprovar/rejeitar) solicitações' },
      { nome: 'aprovacao.listar.pendentes', descricao: 'Listar aprovações pendentes' },
      { nome: 'aprovacao.cancelar', descricao: 'Cancelar solicitações de aprovação' }
    ];

    try {
      for (const permissao of permissoes) {
        // Cria a permissão se não existir
        await this.permissionService.createPermissionIfNotExists(
          permissao.nome,
          permissao.descricao,
          createdBy
        );

        // Concede a permissão ao usuário com escopo global
        await this.permissionService.grantPermission(
          usuarioId,
          permissao.nome,
          TipoEscopo.GLOBAL,
          null,
          null, // Sem data de expiração
          createdBy
        );
      }

      this.logger.log(`Permissões de aprovação cadastradas com sucesso para o usuário ${usuarioId}`);
    } catch (error) {
      this.logger.error(`Erro ao cadastrar permissões de aprovação para usuário ${usuarioId}: ${error.message}`, {
        usuarioId,
        createdBy,
        stack: error.stack
      });
      // Não lança erro para não interromper o fluxo principal
    }
  }

  /**
   * Adiciona aprovador a uma configuração e cadastra as permissões necessárias
   */
  async adicionarAprovador(acaoId: string, usuarioId: string): Promise<ConfiguracaoAprovador> {
    const acao = await this.acaoAprovacaoRepository.findOne({ where: { id: acaoId } });
    
    if (!acao) {
      throw new NotFoundException('Configuração de ação não encontrada');
    }

    // Verifica se o aprovador já existe (incluindo inativos)
    const existente = await this.configuracaoAprovadorRepository.findOne({
      where: { 
        acao_aprovacao_id: acaoId, 
        usuario_id: usuarioId
      }
    });

    if (existente) {
      if (existente.ativo) {
        throw new BadRequestException('Aprovador já cadastrado para esta ação');
      } else {
        // Reativa aprovador existente e cadastra permissões
        existente.ativo = true;
        const aprovadorReativado = await this.configuracaoAprovadorRepository.save(existente);
        
        // Cadastra as permissões necessárias para o aprovador
        await this.cadastrarPermissoesAprovacao(usuarioId, SYSTEM_USER_UUID);
        
        return aprovadorReativado;
      }
    }

    try {
      const aprovador = this.configuracaoAprovadorRepository.create({
        acao_aprovacao_id: acaoId,
        usuario_id: usuarioId,
        ativo: true
      });

      const novoAprovador = await this.configuracaoAprovadorRepository.save(aprovador);
      
      // Cadastra as permissões necessárias para o novo aprovador
      await this.cadastrarPermissoesAprovacao(usuarioId, SYSTEM_USER_UUID);
      
      return novoAprovador;
    } catch (error) {
      // Em caso de erro de constraint (duplicata), tenta buscar o registro existente
      if (error.code === '23505') { // Unique constraint violation
        const aprovadorExistente = await this.configuracaoAprovadorRepository.findOne({
          where: { 
            acao_aprovacao_id: acaoId, 
            usuario_id: usuarioId
          }
        });
        
        if (aprovadorExistente) {
          this.logger.warn(`Aprovador duplicado detectado e corrigido para ação ${acaoId} e usuário ${usuarioId}`);
          
          // Cadastra as permissões mesmo para aprovador duplicado
          await this.cadastrarPermissoesAprovacao(usuarioId, SYSTEM_USER_UUID);
          
          return aprovadorExistente;
        }
      }
      throw error;
    }
  }

  /**
   * Lista aprovadores de uma configuração
   */
  async listarAprovadores(acaoId: string, ativo?: boolean): Promise<ConfiguracaoAprovador[]> {
    const where: any = { acao_aprovacao_id: acaoId };
    
    if (ativo !== undefined) {
      where.ativo = ativo;
    }

    return this.configuracaoAprovadorRepository.find({
      where,
      order: { created_at: 'ASC' }
    });
  }

  /**
   * Remove aprovadores duplicados de uma configuração
   * Mantém apenas o primeiro registro de cada usuário por ação
   */
  async removerAprovadoresDuplicados(acaoId?: string): Promise<{ removidos: number }> {
    try {
      const query = this.configuracaoAprovadorRepository.createQueryBuilder('aprovador')
        .select(['aprovador.id', 'aprovador.acao_aprovacao_id', 'aprovador.usuario_id', 'aprovador.created_at']);
      
      if (acaoId) {
        query.andWhere('aprovador.acao_aprovacao_id = :acaoId', { acaoId });
      }
      
      const aprovadores = await query.getMany();
      
      // Agrupa por acao_aprovacao_id + usuario_id
      const grupos = aprovadores.reduce((acc, aprovador) => {
        const chave = `${aprovador.acao_aprovacao_id}-${aprovador.usuario_id}`;
        if (!acc[chave]) {
          acc[chave] = [];
        }
        acc[chave].push(aprovador);
        return acc;
      }, {} as Record<string, any[]>);
      
      // Identifica duplicatas (mantém o primeiro, remove os demais)
      const idsParaRemover: string[] = [];
      Object.values(grupos).forEach(grupo => {
        if (grupo.length > 1) {
          // Ordena por data de criação e remove todos exceto o primeiro
          grupo.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
          idsParaRemover.push(...grupo.slice(1).map(a => a.id));
        }
      });
      
      if (idsParaRemover.length > 0) {
        await this.configuracaoAprovadorRepository.delete(idsParaRemover);
        this.logger.log(`Removidos ${idsParaRemover.length} aprovadores duplicados`);
      }
      
      return { removidos: idsParaRemover.length };
    } catch (error) {
      this.logger.error('Erro ao remover aprovadores duplicados:', error);
      throw error;
    }
  }

  /**
   * Remove um aprovador de uma configuração
   */
  async removerAprovador(acaoId: string, aprovadorId: string): Promise<void> {
    const aprovador = await this.configuracaoAprovadorRepository.findOne({
      where: {
        id: aprovadorId,
        acao_aprovacao_id: acaoId
      }
    });

    if (!aprovador) {
      throw new NotFoundException('Aprovador não encontrado');
    }

    await this.configuracaoAprovadorRepository.update(aprovadorId, { ativo: false });
    
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
        this.solicitacaoAprovadorRepository.create({
          solicitacao_aprovacao_id: solicitacaoId,
          usuario_id: usuario.id,
          ativo: true
        })
      );

      await this.solicitacaoAprovadorRepository.save(aprovadores);

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
      const aprovador = this.solicitacaoAprovadorRepository.create({
        solicitacao_aprovacao_id: solicitacaoId,
        usuario_id: solicitanteId,
        ativo: true
      });

      await this.solicitacaoAprovadorRepository.save(aprovador);

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
    aprovadoresConfig: ConfiguracaoAprovador[]
  ): Promise<void> {
    // Remove duplicatas baseado no usuario_id para evitar aprovadores duplicados
    const aprovadoresUnicos = aprovadoresConfig
      .filter(a => a.ativo)
      .reduce((acc, aprovador) => {
        const existe = acc.find(a => a.usuario_id === aprovador.usuario_id);
        if (!existe) {
          acc.push(aprovador);
        }
        return acc;
      }, [] as ConfiguracaoAprovador[]);

    this.logger.debug(`Aprovadores únicos após deduplicação: ${aprovadoresUnicos.length} de ${aprovadoresConfig.length} originais`);

    const aprovadores = aprovadoresUnicos.map(aprovadorConfig => 
      this.solicitacaoAprovadorRepository.create({
        solicitacao_aprovacao_id: solicitacaoId,
        usuario_id: aprovadorConfig.usuario_id,
        ativo: true
      })
    );

    if (aprovadores.length > 0) {
      await this.solicitacaoAprovadorRepository.save(aprovadores);
      this.logger.log(`Criados ${aprovadores.length} aprovadores únicos para solicitação ${solicitacaoId}`);
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
   * Verifica se o usuário pode auto-aprovar uma ação específica
   */
  async usuarioPodeAutoAprovar(usuarioId: string, tipoAcao: TipoAcaoCritica): Promise<boolean> {
    try {
      // Obter configuração da ação
      const configuracao = await this.acaoAprovacaoRepository.findOne({
        where: { tipo_acao: tipoAcao, ativo: true }
      });

      if (!configuracao) {
        return false;
      }

      // Verificar se o usuário tem permissão específica
      if (configuracao.permissao_aprovacao) {
        return await this.permissionService.hasPermission({
          userId: usuarioId,
          permissionName: configuracao.permissao_aprovacao
        });
      }

      // Verificar por perfil se configurado
      if (configuracao.perfil_auto_aprovacao?.length) {
        const usuario = await this.obterUsuarioComPerfis(usuarioId);
        if (!usuario?.perfis?.length) {
          return false;
        }

        const perfilUsuario = usuario.perfis.map(p => p.nome);
        return configuracao.perfil_auto_aprovacao.some(perfil => 
          perfilUsuario.includes(perfil)
        );
      }

      return false;
    } catch (error) {
      this.logger.error(`Erro ao verificar auto-aprovação para usuário ${usuarioId}:`, error);
      return false;
    }
  }

  /**
   * Obtém usuário com seus perfis/roles
   */
  async obterUsuarioComPerfis(usuarioId: string): Promise<any> {
    try {
      const usuario = await this.usuarioService.findById(usuarioId);
      
      if (!usuario) {
        return null;
      }

      return {
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email,
        status: usuario.status,
        perfis: usuario.role ? [{ nome: usuario.role.codigo }] : []
      };
    } catch (error) {
      this.logger.error(`Erro ao obter usuário com perfis ${usuarioId}:`, error);
      return null;
    }
  }
}