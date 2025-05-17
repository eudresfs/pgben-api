import {
  Injectable,
  NotFoundException,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, ILike, Connection } from 'typeorm';
import { Solicitacao, StatusSolicitacao } from '../entities/solicitacao.entity';
import { HistoricoSolicitacao } from '../entities/historico-solicitacao.entity';
import { Pendencia, StatusPendencia } from '../entities/pendencia.entity';
import { CreateSolicitacaoDto } from '../dto/create-solicitacao.dto';
import { UpdateSolicitacaoDto } from '../dto/update-solicitacao.dto';
import { AvaliarSolicitacaoDto } from '../dto/avaliar-solicitacao.dto';
import { Role } from '../../../shared/enums/role.enum';

/**
 * Serviço de Solicitações
 *
 * Responsável pela lógica de negócio relacionada às solicitações de benefícios
 */
@Injectable()
export class SolicitacaoService {
  constructor(
    @InjectRepository(Solicitacao)
    private solicitacaoRepository: Repository<Solicitacao>,

    @InjectRepository(HistoricoSolicitacao)
    private historicoRepository: Repository<HistoricoSolicitacao>,

    @InjectRepository(Pendencia)
    private pendenciaRepository: Repository<Pendencia>,

    private connection: Connection,
  ) {}

  /**
   * Lista todas as solicitações com paginação e filtros
   */
  async findAll(options: {
    page?: number;
    limit?: number;
    status?: StatusSolicitacao;
    unidade_id?: string;
    beneficio_id?: string;
    protocolo?: string;
    data_inicio?: string;
    data_fim?: string;
    user: any;
  }) {
    const {
      page = 1,
      limit = 10,
      status,
      unidade_id,
      beneficio_id,
      protocolo,
      data_inicio,
      data_fim,
      user,
    } = options;

    const queryBuilder =
      this.solicitacaoRepository.createQueryBuilder('solicitacao');

    // Joins necessários
    queryBuilder
      .leftJoinAndSelect('solicitacao.beneficiario', 'beneficiario')
      .leftJoinAndSelect('solicitacao.tipo_beneficio', 'tipo_beneficio')
      .leftJoinAndSelect('solicitacao.unidade', 'unidade')
      .leftJoinAndSelect('solicitacao.tecnico', 'tecnico');

    // Aplicar filtros
    if (status) {
      queryBuilder.andWhere('solicitacao.status = :status', { status });
    }

    // Filtro por unidade com verificação de permissão
    if (unidade_id) {
      queryBuilder.andWhere('solicitacao.unidade_id = :unidade_id', {
        unidade_id,
      });
    } else if (![Role.ADMIN, Role.GESTOR_SEMTAS].includes(user.role)) {
      // Usuários que não são admin ou gestor SEMTAS só podem ver solicitações da sua unidade
      queryBuilder.andWhere('solicitacao.unidade_id = :unidade_id', {
        unidade_id: user.unidade_id,
      });
    }

    if (beneficio_id) {
      queryBuilder.andWhere('solicitacao.tipo_beneficio_id = :beneficio_id', {
        beneficio_id,
      });
    }

    if (protocolo) {
      queryBuilder.andWhere('solicitacao.protocolo ILIKE :protocolo', {
        protocolo: `%${protocolo}%`,
      });
    }

    // Filtro por período
    if (data_inicio && data_fim) {
      const inicio = new Date(data_inicio);
      const fim = new Date(data_fim);
      fim.setHours(23, 59, 59, 999); // Ajusta para o final do dia

      queryBuilder.andWhere(
        'solicitacao.data_abertura BETWEEN :inicio AND :fim',
        {
          inicio,
          fim,
        },
      );
    } else if (data_inicio) {
      const inicio = new Date(data_inicio);
      queryBuilder.andWhere('solicitacao.data_abertura >= :inicio', { inicio });
    } else if (data_fim) {
      const fim = new Date(data_fim);
      fim.setHours(23, 59, 59, 999); // Ajusta para o final do dia
      queryBuilder.andWhere('solicitacao.data_abertura <= :fim', { fim });
    }

    // Calcular paginação
    const skip = (page - 1) * limit;
    queryBuilder.skip(skip).take(limit);

    // Ordenação padrão
    queryBuilder.orderBy('solicitacao.data_abertura', 'DESC');

    // Executar consulta
    const [items, total] = await queryBuilder.getManyAndCount();

    return {
      items,
      meta: {
        currentPage: page,
        itemsPerPage: limit,
        totalItems: total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Busca uma solicitação pelo ID
   */
  async findById(id: string): Promise<Solicitacao> {
    const solicitacao = await this.solicitacaoRepository.findOne({
      where: { id },
      relations: ['beneficiario', 'tipo_beneficio', 'unidade', 'tecnico'],
    });

    if (!solicitacao) {
      throw new NotFoundException(`Solicitação com ID ${id} não encontrada`);
    }

    return solicitacao;
  }

  /**
   * Verifica se um usuário tem permissão para acessar uma solicitação
   */
  canAccessSolicitacao(solicitacao: Solicitacao, user: any): boolean {
    // Administradores e gestores SEMTAS podem acessar qualquer solicitação
    if ([Role.ADMIN, Role.GESTOR_SEMTAS].includes(user.role)) {
      return true;
    }

    // Técnicos só podem acessar solicitações da sua unidade
    return solicitacao.unidade_id === user.unidade_id;
  }

  /**
   * Cria uma nova solicitação
   */
  async create(
    createSolicitacaoDto: CreateSolicitacaoDto,
    user: any,
  ): Promise<Solicitacao> {
    return this.connection.transaction(async (manager) => {
      // Criar uma nova instância de Solicitacao
      const solicitacao = new Solicitacao();

      // Preencher os dados básicos
      solicitacao.beneficiario_id = createSolicitacaoDto.beneficiario_id;
      solicitacao.tipo_beneficio_id = createSolicitacaoDto.tipo_beneficio_id;
      solicitacao.unidade_id = user.unidade_id;
      solicitacao.tecnico_id = user.id;
      solicitacao.status = StatusSolicitacao.RASCUNHO;
      solicitacao.data_abertura = new Date();
      solicitacao.dados_complementares =
        createSolicitacaoDto.dados_complementares || {};

      // Salvar a solicitação
      const savedSolicitacao = await manager.save(solicitacao);

      // Registrar no histórico
      const historico = new HistoricoSolicitacao();
      historico.solicitacao_id = savedSolicitacao.id;
      historico.usuario_id = user.id;
      historico.status_anterior = StatusSolicitacao.RASCUNHO;
      historico.status_atual = StatusSolicitacao.RASCUNHO;
      historico.observacao = 'Solicitação criada';
      historico.dados_alterados = { acao: 'criacao' };
      historico.ip_usuario = user.ip || '0.0.0.0';

      await manager.save(historico);

      return this.findById(savedSolicitacao.id);
    });
  }

  /**
   * Atualiza uma solicitação existente
   */
  async update(
    id: string,
    updateSolicitacaoDto: UpdateSolicitacaoDto,
    user: any,
  ): Promise<Solicitacao> {
    return this.connection.transaction(async (manager) => {
      // Buscar a solicitação
      const solicitacao = await this.findById(id);

      // Verificar se o usuário tem permissão
      if (!this.canAccessSolicitacao(solicitacao, user)) {
        throw new UnauthorizedException(
          'Você não tem permissão para atualizar esta solicitação',
        );
      }

      // Verificar se a solicitação está em estado que permite edição
      if (solicitacao.status !== StatusSolicitacao.RASCUNHO) {
        throw new BadRequestException(
          `Não é possível editar uma solicitação com status ${solicitacao.status}`,
        );
      }

      // Atualizar os dados
      // Nota: beneficiario_id não pode ser atualizado conforme definido no DTO

      if (updateSolicitacaoDto.tipo_beneficio_id) {
        solicitacao.tipo_beneficio_id = updateSolicitacaoDto.tipo_beneficio_id;
      }

      if (updateSolicitacaoDto.dados_complementares) {
        solicitacao.dados_complementares =
          updateSolicitacaoDto.dados_complementares;
      }

      // Salvar a solicitação
      await manager.save(solicitacao);

      // Registrar no histórico
      const historico = new HistoricoSolicitacao();
      historico.solicitacao_id = id;
      historico.usuario_id = user.id;
      historico.status_anterior = solicitacao.status;
      historico.status_atual = solicitacao.status;
      historico.observacao = 'Solicitação atualizada';
      historico.dados_alterados = {
        campos_alterados: Object.keys(updateSolicitacaoDto),
      };
      historico.ip_usuario = user.ip || '0.0.0.0';

      await manager.save(historico);

      return this.findById(id);
    });
  }

  /**
   * Submete uma solicitação para análise
   */
  async submeterSolicitacao(id: string, user: any): Promise<Solicitacao> {
    return this.connection.transaction(async (manager) => {
      // Buscar a solicitação
      const solicitacao = await this.findById(id);

      // Verificar se o usuário tem permissão
      if (!this.canAccessSolicitacao(solicitacao, user)) {
        throw new UnauthorizedException(
          'Você não tem permissão para submeter esta solicitação',
        );
      }

      // Verificar se a solicitação está em estado que permite submissão
      if (solicitacao.status !== StatusSolicitacao.RASCUNHO) {
        throw new BadRequestException(
          `Não é possível submeter uma solicitação com status ${solicitacao.status}`,
        );
      }

      // Atualizar o status usando o método preparar
      solicitacao.prepararAlteracaoStatus(
        StatusSolicitacao.PENDENTE,
        user.id,
        'Solicitação submetida para análise',
        user.ip || '0.0.0.0',
      );

      await manager.save(solicitacao);

      // Não é mais necessário registrar manualmente no histórico
      // O método logStatusChange fará isso automaticamente através do listener @AfterUpdate

      return this.findById(id);
    });
  }

  /**
   * Avalia uma solicitação (aprovar/pendenciar)
   */
  async avaliarSolicitacao(
    id: string,
    avaliarSolicitacaoDto: AvaliarSolicitacaoDto,
    user: any,
  ): Promise<Solicitacao> {
    return this.connection.transaction(async (manager) => {
      // Buscar a solicitação
      const solicitacao = await this.findById(id);

      // Verificar se o usuário tem permissão
      if (!this.canAccessSolicitacao(solicitacao, user)) {
        throw new UnauthorizedException(
          'Você não tem permissão para avaliar esta solicitação',
        );
      }

      // Verificar se a solicitação está em estado que permite avaliação
      if (
        solicitacao.status !== StatusSolicitacao.PENDENTE &&
        solicitacao.status !== StatusSolicitacao.EM_ANALISE
      ) {
        throw new BadRequestException(
          `Não é possível avaliar uma solicitação com status ${solicitacao.status}`,
        );
      }

      // Determinar o novo status
      const novoStatus = avaliarSolicitacaoDto.aprovado
        ? StatusSolicitacao.APROVADA
        : StatusSolicitacao.AGUARDANDO_DOCUMENTOS;

      // Atualizar o status usando o método preparar
      solicitacao.prepararAlteracaoStatus(
        novoStatus,
        user.id,
        avaliarSolicitacaoDto.parecer,
        user.ip || '0.0.0.0',
      );

      if (avaliarSolicitacaoDto.aprovado) {
        solicitacao.aprovador_id = user.id;
        solicitacao.data_aprovacao = new Date();
        solicitacao.parecer_semtas = avaliarSolicitacaoDto.parecer;
      } else {
        // Registrar pendências
        if (
          avaliarSolicitacaoDto.pendencias &&
          avaliarSolicitacaoDto.pendencias.length > 0
        ) {
          for (const descricaoTexto of avaliarSolicitacaoDto.pendencias) {
            // Criar uma nova instância de Pendencia diretamente para evitar problemas de tipagem
            const pendencia = new Pendencia();
            pendencia.solicitacao_id = id;
            pendencia.descricao = descricaoTexto;
            pendencia.status = StatusPendencia.ABERTA;
            pendencia.registrado_por_id = user.id; // Usando registrado_por_id conforme definido na entidade

            await manager.save(pendencia);
          }
        }
      }

      // Salvar a solicitação com o manager da transação
      await manager.save(solicitacao);

      // Não é mais necessário registrar manualmente no histórico
      // O método logStatusChange fará isso automaticamente através do listener @AfterUpdate

      return this.findById(id);
    });
  }

  /**
   * Libera um benefício aprovado
   */
  async liberarBeneficio(id: string, user: any): Promise<Solicitacao> {
    return this.connection.transaction(async (manager) => {
      // Buscar a solicitação
      const solicitacao = await this.findById(id);

      // Verificar se o usuário tem permissão
      if (![Role.ADMIN, Role.GESTOR_SEMTAS].includes(user.role)) {
        throw new UnauthorizedException(
          'Você não tem permissão para liberar benefícios',
        );
      }

      // Verificar se a solicitação está aprovada
      if (solicitacao.status !== StatusSolicitacao.APROVADA) {
        throw new BadRequestException(
          'Apenas solicitações aprovadas podem ser liberadas',
        );
      }

      // Atualizar o status usando o método preparar
      solicitacao.prepararAlteracaoStatus(
        StatusSolicitacao.LIBERADA,
        user.id,
        'Benefício liberado para pagamento/entrega',
        user.ip || '0.0.0.0',
      );
      solicitacao.liberador_id = user.id;
      solicitacao.data_liberacao = new Date();

      // Salvar a solicitação com o manager da transação
      await manager.save(solicitacao);

      // Não é mais necessário registrar manualmente no histórico
      // O método logStatusChange fará isso automaticamente através do listener @AfterUpdate

      return this.findById(id);
    });
  }

  /**
   * Cancela uma solicitação
   */
  async cancelarSolicitacao(id: string, user: any): Promise<Solicitacao> {
    return this.connection.transaction(async (manager) => {
      // Buscar a solicitação
      const solicitacao = await this.findById(id);

      // Verificar se o usuário tem permissão
      if (
        ![Role.ADMIN, Role.GESTOR_SEMTAS, Role.TECNICO_SEMTAS].includes(
          user.role,
        )
      ) {
        throw new UnauthorizedException(
          'Você não tem permissão para cancelar solicitações',
        );
      }

      // Verificar se a solicitação pode ser cancelada
      if (solicitacao.status === StatusSolicitacao.LIBERADA) {
        throw new BadRequestException(
          'Não é possível cancelar uma solicitação já liberada',
        );
      }

      // Atualizar o status usando o método preparar
      solicitacao.prepararAlteracaoStatus(
        StatusSolicitacao.CANCELADA,
        user.id,
        'Solicitação cancelada pelo usuário',
        user.ip || '0.0.0.0',
      );

      // Salvar a solicitação com o manager da transação
      await manager.save(solicitacao);

      // Não é mais necessário registrar manualmente no histórico
      // O método logStatusChange fará isso automaticamente através do listener @AfterUpdate

      return this.findById(id);
    });
  }

  /**
   * Lista o histórico de uma solicitação
   */
  async getHistorico(solicitacaoId: string) {
    // Verificar se a solicitação existe
    await this.findById(solicitacaoId);

    // Buscar o histórico
    return this.historicoRepository.find({
      where: { solicitacao_id: solicitacaoId },
      order: { created_at: 'DESC' },
      relations: ['usuario'],
    });
  }

  /**
   * Lista as pendências de uma solicitação
   */
  async getPendencias(solicitacaoId: string) {
    // Verificar se a solicitação existe
    await this.findById(solicitacaoId);

    // Buscar as pendências
    return this.pendenciaRepository.find({
      where: { solicitacao_id: solicitacaoId },
      order: { created_at: 'DESC' },
    });
  }
}
