import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';

// Entities
import { ConfiguracaoAprovacao } from '../entities/configuracao-aprovacao.entity';
import { AcaoCritica } from '../entities/acao-critica.entity';
import { Aprovador } from '../entities/aprovador.entity';

// DTOs
import { CreateConfiguracaoAprovacaoDto } from '../dtos/create-configuracao-aprovacao.dto';
import { UpdateConfiguracaoAprovacaoDto } from '../dtos/update-configuracao-aprovacao.dto';
import { CreateAprovadorDto } from '../dtos/create-aprovador.dto';
import { UpdateAprovadorDto } from '../dtos/update-aprovador.dto';
import { RespostaPaginadaDto } from '../dtos/resposta-paginada.dto';

// Enums
import { EstrategiaAprovacao, TipoAcaoCritica } from '../enums/aprovacao.enums';

/**
 * Serviço para gerenciamento de configurações de aprovação.
 * 
 * Responsabilidades:
 * - Criar e gerenciar configurações de aprovação por tipo de ação
 * - Definir estratégias de aprovação (unanime, maioria, hierárquica, etc.)
 * - Gerenciar aprovadores por configuração
 * - Configurar prazos, escalação e auto-aprovação
 * - Validar regras de negócio das configurações
 */
@Injectable()
export class ConfiguracaoAprovacaoService {
  private readonly logger = new Logger(ConfiguracaoAprovacaoService.name);

  constructor(
    @InjectRepository(ConfiguracaoAprovacao)
    private readonly configuracaoRepository: Repository<ConfiguracaoAprovacao>,
    @InjectRepository(AcaoCritica)
    private readonly acaoCriticaRepository: Repository<AcaoCritica>,
    @InjectRepository(Aprovador)
    private readonly aprovadorRepository: Repository<Aprovador>,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Cria uma nova configuração de aprovação
   * 
   * @param dados - Dados da configuração
   * @returns Promise<ConfiguracaoAprovacao> - Configuração criada
   */
  async criarConfiguracao(
    dados: CreateConfiguracaoAprovacaoDto,
  ): Promise<ConfiguracaoAprovacao> {
    try {
      this.logger.debug(
        `Criando configuração de aprovação para ação ${dados.acao_critica_id}`,
      );

      // Verificar se a ação crítica existe
      const acaoCritica = await this.acaoCriticaRepository.findOne({
        where: { id: dados.acao_critica_id },
      });

      if (!acaoCritica) {
        throw new NotFoundException(
          `Ação crítica ${dados.acao_critica_id} não encontrada`,
        );
      }

      // Verificar se já existe configuração ativa para esta ação
      const configuracaoExistente = await this.configuracaoRepository.findOne({
        where: {
          acao_critica_id: acaoCritica.id,
          ativa: true,
        },
      });

      if (configuracaoExistente) {
        throw new ConflictException(
          `Já existe uma configuração ativa para a ação ${dados.acao_critica_id}`,
        );
      }

      // Validar dados da configuração
      this.validarDadosConfiguracao(dados);

      // Criar configuração
      const configuracao = this.configuracaoRepository.create({
        ...dados,
        acao_critica_id: acaoCritica.id,
        ativa: true,
      });

      const configuracaoSalva = await this.configuracaoRepository.save(configuracao) as ConfiguracaoAprovacao;

      this.logger.log(
        `Configuração de aprovação ${configuracaoSalva.id} criada com sucesso`,
      );

      // Emitir evento
      this.eventEmitter.emit('configuracao-aprovacao.criada', {
        configuracao: configuracaoSalva,
        acao_critica: acaoCritica,
      });

      return configuracaoSalva;
    } catch (error) {
      this.logger.error(
        `Erro ao criar configuração de aprovação: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Atualiza uma configuração de aprovação existente
   * 
   * @param id - ID da configuração
   * @param dados - Dados para atualização
   * @returns Promise<ConfiguracaoAprovacao> - Configuração atualizada
   */
  async atualizarConfiguracao(
    id: string,
    dados: UpdateConfiguracaoAprovacaoDto,
  ): Promise<ConfiguracaoAprovacao> {
    try {
      this.logger.debug(`Atualizando configuração de aprovação ${id}`);

      const configuracao = await this.buscarConfiguracaoPorId(id);

      // Validar dados se fornecidos
      if (dados.estrategia || dados.min_aprovacoes) {
        this.validarDadosConfiguracao(dados as CreateConfiguracaoAprovacaoDto);
      }

      // Atualizar campos
      Object.assign(configuracao, dados);

      const configuracaoAtualizada = await this.configuracaoRepository.save(configuracao);

      this.logger.log(
        `Configuração de aprovação ${id} atualizada com sucesso`,
      );

      // Emitir evento
      this.eventEmitter.emit('configuracao-aprovacao.atualizada', {
        configuracao: configuracaoAtualizada,
        dados_alterados: dados,
      });

      return configuracaoAtualizada;
    } catch (error) {
      this.logger.error(
        `Erro ao atualizar configuração ${id}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Busca uma configuração por ID
   * 
   * @param id - ID da configuração
   * @returns Promise<ConfiguracaoAprovacao> - Configuração encontrada
   */
  async buscarConfiguracaoPorId(id: string): Promise<ConfiguracaoAprovacao> {
    const configuracao = await this.configuracaoRepository.findOne({
      where: { id },
      relations: ['acao_critica'],
    });

    if (!configuracao) {
      throw new NotFoundException(`Configuração ${id} não encontrada`);
    }

    return configuracao;
  }

  /**
   * Busca configuração por código da ação crítica
   * 
   * @param codigoAcao - Código da ação crítica
   * @returns Promise<ConfiguracaoAprovacao | null> - Configuração encontrada ou null
   */
  async buscarConfiguracaoPorAcao(
    codigoAcao: TipoAcaoCritica,
  ): Promise<ConfiguracaoAprovacao | null> {
    const acaoCritica = await this.acaoCriticaRepository.findOne({
      where: { codigo: codigoAcao },
    });

    if (!acaoCritica) {
      return null;
    }

    return this.configuracaoRepository.findOne({
      where: {
        acao_critica_id: acaoCritica.id,
        ativa: true,
      },
      relations: ['acao_critica'],
    });
  }

  /**
   * Lista todas as configurações com paginação
   * 
   * @param pagina - Número da página
   * @param limite - Limite de itens por página
   * @param ativo - Filtrar por status ativo
   * @returns Promise<RespostaPaginadaDto<ConfiguracaoAprovacao>> - Lista paginada
   */
  async listarConfiguracoes(
    pagina: number = 1,
    limite: number = 20,
    ativo?: boolean,
  ): Promise<RespostaPaginadaDto<ConfiguracaoAprovacao>> {
    try {
      const queryBuilder = this.configuracaoRepository
        .createQueryBuilder('c')
        .leftJoinAndSelect('c.acao_critica', 'ac')
        .orderBy('c.created_at', 'DESC');

      if (ativo !== undefined) {
        queryBuilder.andWhere('c.ativa = :ativa', { ativa: ativo });
      }

      const offset = (pagina - 1) * limite;
      queryBuilder.skip(offset).take(limite);

      const [configuracoes, total] = await queryBuilder.getManyAndCount();

      return new RespostaPaginadaDto(
        configuracoes,
        total,
        pagina,
        limite,
        { ativo },
      );
    } catch (error) {
      this.logger.error(
        `Erro ao listar configurações: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Ativa ou desativa uma configuração
   * 
   * @param id - ID da configuração
   * @param ativo - Status ativo
   * @returns Promise<ConfiguracaoAprovacao> - Configuração atualizada
   */
  async alterarStatusConfiguracao(
    id: string,
    ativo: boolean,
  ): Promise<ConfiguracaoAprovacao> {
    const configuracao = await this.buscarConfiguracaoPorId(id);
    configuracao.ativa = ativo;

    const configuracaoAtualizada = await this.configuracaoRepository.save(configuracao);

    this.logger.log(
      `Configuração ${id} ${ativo ? 'ativada' : 'desativada'} com sucesso`,
    );

    return configuracaoAtualizada;
  }

  /**
   * Remove uma configuração (soft delete)
   * 
   * @param id - ID da configuração
   * @returns Promise<void>
   */
  async removerConfiguracao(id: string): Promise<void> {
    const configuracao = await this.buscarConfiguracaoPorId(id);
    
    // Desativar ao invés de deletar para manter histórico
    configuracao.ativa = false;
    await this.configuracaoRepository.save(configuracao);

    this.logger.log(`Configuração ${id} removida com sucesso`);

    // Emitir evento
    this.eventEmitter.emit('configuracao-aprovacao.removida', {
      configuracao_id: id,
    });
  }

  // Métodos para gerenciar aprovadores

  /**
   * Adiciona um aprovador a uma configuração
   * 
   * @param configuracaoId - ID da configuração
   * @param dados - Dados do aprovador
   * @returns Promise<Aprovador> - Aprovador criado
   */
  async adicionarAprovador(
    configuracaoId: string,
    dados: CreateAprovadorDto,
  ): Promise<Aprovador> {
    try {
      this.logger.debug(
        `Adicionando aprovador à configuração ${configuracaoId}`,
      );

      // Verificar se a configuração existe
      await this.buscarConfiguracaoPorId(configuracaoId);

      // Verificar se já existe aprovador com os mesmos critérios
      const aprovadorExistente = await this.aprovadorRepository.findOne({
        where: {
          configuracao_aprovacao_id: configuracaoId,
          usuario_id: dados.usuario_id,
          ativo: true,
        },
      });

      if (aprovadorExistente) {
        throw new ConflictException(
          'Usuário já é aprovador para esta configuração',
        );
      }

      // Criar aprovador
      const aprovador = this.aprovadorRepository.create({
        configuracao_aprovacao_id: configuracaoId,
        tipo: dados.tipo,
        usuario_id: dados.usuario_id,
        perfil: dados.perfil_id,
        unidade: dados.unidade_id,
        referencia_id: dados.hierarquia_id,
        ativo: dados.ativo ?? true,
        ordem_aprovacao: dados.ordem || 0,
        peso_aprovacao: dados.peso || 1.0,
        valor_maximo_aprovacao: dados.limite_valor,
        horario_funcionamento: dados.horario_funcionamento,
        canais_notificacao: dados.canais_notificacao,
        configuracoes: dados.configuracoes,
      });

      const aprovadorSalvo = await this.aprovadorRepository.save(aprovador);

      this.logger.log(
        `Aprovador ${aprovadorSalvo.id} adicionado à configuração ${configuracaoId}`,
      );

      return aprovadorSalvo;
    } catch (error) {
      this.logger.error(
        `Erro ao adicionar aprovador: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Lista aprovadores de uma configuração
   * 
   * @param configuracaoId - ID da configuração
   * @param ativo - Filtrar por status ativo
   * @returns Promise<Aprovador[]> - Lista de aprovadores
   */
  async listarAprovadores(
    configuracaoId: string,
    ativo: boolean = true,
  ): Promise<Aprovador[]> {
    const where: FindOptionsWhere<Aprovador> = {
      configuracao_aprovacao_id: configuracaoId,
    };

    if (ativo !== undefined) {
      where.ativo = ativo;
    }

    return this.aprovadorRepository.find({
      where,
      order: {
        ordem_aprovacao: 'ASC',
        peso_aprovacao: 'DESC',
      },
    });
  }

  /**
   * Atualiza um aprovador
   * 
   * @param aprovadorId - ID do aprovador
   * @param dados - Dados para atualização
   * @returns Promise<Aprovador> - Aprovador atualizado
   */
  async atualizarAprovador(
    aprovadorId: string,
    dados: UpdateAprovadorDto,
  ): Promise<Aprovador> {
    const aprovador = await this.aprovadorRepository.findOne({
      where: { id: aprovadorId },
    });

    if (!aprovador) {
      throw new NotFoundException(`Aprovador ${aprovadorId} não encontrado`);
    }

    Object.assign(aprovador, dados);
    return this.aprovadorRepository.save(aprovador);
  }

  /**
   * Remove um aprovador
   * 
   * @param aprovadorId - ID do aprovador
   * @returns Promise<void>
   */
  async removerAprovador(aprovadorId: string): Promise<void> {
    const aprovador = await this.aprovadorRepository.findOne({
      where: { id: aprovadorId },
    });

    if (!aprovador) {
      throw new NotFoundException(`Aprovador ${aprovadorId} não encontrado`);
    }

    // Desativar ao invés de deletar
    aprovador.ativo = false;
    await this.aprovadorRepository.save(aprovador);

    this.logger.log(`Aprovador ${aprovadorId} removido com sucesso`);
  }

  // Métodos auxiliares privados

  /**
   * Lista configurações com filtros
   */
  async listarComFiltros(filtros: any): Promise<RespostaPaginadaDto<ConfiguracaoAprovacao>> {
    const { page = 1, limit = 10, acao_critica_id, role, estrategia, ativo } = filtros;
    
    const queryBuilder = this.configuracaoRepository
      .createQueryBuilder('c')
      .leftJoinAndSelect('c.acao_critica', 'ac')
      .orderBy('c.created_at', 'DESC');

    if (acao_critica_id) {
      queryBuilder.andWhere('c.acao_critica_id = :acao_critica_id', { acao_critica_id });
    }

    if (estrategia) {
      queryBuilder.andWhere('c.estrategia = :estrategia', { estrategia });
    }

    if (ativo !== undefined) {
      queryBuilder.andWhere('c.ativa = :ativa', { ativa: ativo });
    }

    const offset = (page - 1) * limit;
    queryBuilder.skip(offset).take(limit);

    const [configuracoes, total] = await queryBuilder.getManyAndCount();

    return new RespostaPaginadaDto(
      configuracoes,
      total,
      page,
      limit,
      filtros,
    );
  }

  /**
   * Obtém configuração por ID
   */
  async obterPorId(id: string): Promise<ConfiguracaoAprovacao> {
    return this.buscarConfiguracaoPorId(id);
  }

  /**
   * Cria nova configuração
   */
  async criar(dados: CreateConfiguracaoAprovacaoDto): Promise<ConfiguracaoAprovacao> {
    return this.criarConfiguracao(dados);
  }

  /**
   * Atualiza configuração
   */
  async atualizar(id: string, dados: UpdateConfiguracaoAprovacaoDto): Promise<ConfiguracaoAprovacao> {
    return this.atualizarConfiguracao(id, dados);
  }

  /**
   * Desativa configuração
   */
  async desativar(id: string): Promise<void> {
    await this.alterarStatusConfiguracao(id, false);
  }

  /**
   * Clona uma configuração existente
   */
  async clonar(id: string, novosDados?: Partial<CreateConfiguracaoAprovacaoDto>): Promise<ConfiguracaoAprovacao> {
    const configuracaoOriginal = await this.buscarConfiguracaoPorId(id);
    
    const dadosClone: CreateConfiguracaoAprovacaoDto = {
      acao_critica_id: configuracaoOriginal.acao_critica_id,
      nome: `${configuracaoOriginal.nome} (Cópia)`,
      descricao: configuracaoOriginal.descricao,
      estrategia: configuracaoOriginal.estrategia,
      min_aprovacoes: configuracaoOriginal.min_aprovacoes,

      tempo_limite_horas: configuracaoOriginal.tempo_limite_horas,
      permite_aprovacao_paralela: configuracaoOriginal.permite_aprovacao_paralela,
      permite_auto_aprovacao: configuracaoOriginal.permite_auto_aprovacao,
      requer_justificativa_aprovacao: configuracaoOriginal.requer_justificativa_aprovacao,
      valor_minimo: configuracaoOriginal.valor_minimo,
      condicoes_adicionais: configuracaoOriginal.condicoes_adicionais,
      canais_notificacao: configuracaoOriginal.canais_notificacao,
      horario_funcionamento: configuracaoOriginal.horario_funcionamento ? {
        ...configuracaoOriginal.horario_funcionamento,
        fuso_horario: configuracaoOriginal.horario_funcionamento.fuso_horario || 'America/Sao_Paulo'
      } : undefined,
      perfil_solicitante: configuracaoOriginal.perfil_solicitante,
      unidade: configuracaoOriginal.unidade,
      prioridade: configuracaoOriginal.prioridade,
      ...novosDados,
    };

    return this.criarConfiguracao(dadosClone);
  }

  /**
   * Valida os dados de uma configuração de aprovação
   */
  private validarDadosConfiguracao(dados: CreateConfiguracaoAprovacaoDto): void {
    // Validar campos obrigatórios
    if (!dados.estrategia) {
      throw new BadRequestException('Estratégia de aprovação é obrigatória');
    }

    if (!dados.min_aprovacoes || dados.min_aprovacoes < 1) {
      throw new BadRequestException('Número de aprovações deve ser maior que zero');
    }

    if (dados.tempo_limite_horas && dados.tempo_limite_horas < 1) {
      throw new BadRequestException('Tempo limite deve ser maior que zero horas');
    }

    // Validar estratégias específicas
    if (dados.estrategia === EstrategiaAprovacao.MAIORIA && dados.min_aprovacoes < 2) {
      throw new BadRequestException('Estratégia de maioria requer pelo menos 2 aprovações');
    }
  }
}