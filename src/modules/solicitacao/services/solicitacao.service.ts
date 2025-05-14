import { 
  Injectable, 
  NotFoundException, 
  BadRequestException, 
  UnauthorizedException 
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, ILike } from 'typeorm';
import { Solicitacao, StatusSolicitacao } from '../entities/solicitacao.entity';
import { HistoricoSolicitacao } from '../entities/historico-solicitacao.entity';
import { Pendencia, StatusPendencia } from '../entities/pendencia.entity';
import { CreateSolicitacaoDto } from '../dto/create-solicitacao.dto';
import { UpdateSolicitacaoDto } from '../dto/update-solicitacao.dto';
import { AvaliarSolicitacaoDto } from '../dto/avaliar-solicitacao.dto';
import { Role } from '../../auth/enums/role.enum';

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
      user 
    } = options;
    
    const queryBuilder = this.solicitacaoRepository.createQueryBuilder('solicitacao');
    
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
      queryBuilder.andWhere('solicitacao.unidade_id = :unidade_id', { unidade_id });
    } else if (![Role.ADMIN, Role.GESTOR_SEMTAS].includes(user.role)) {
      // Usuários que não são admin ou gestor SEMTAS só podem ver solicitações da sua unidade
      queryBuilder.andWhere('solicitacao.unidade_id = :unidade_id', { unidade_id: user.unidade_id });
    }
    
    if (beneficio_id) {
      queryBuilder.andWhere('solicitacao.tipo_beneficio_id = :beneficio_id', { beneficio_id });
    }
    
    if (protocolo) {
      queryBuilder.andWhere('solicitacao.protocolo ILIKE :protocolo', { protocolo: `%${protocolo}%` });
    }
    
    // Filtro por período
    if (data_inicio && data_fim) {
      const inicio = new Date(data_inicio);
      const fim = new Date(data_fim);
      fim.setHours(23, 59, 59, 999); // Ajusta para o final do dia
      
      queryBuilder.andWhere('solicitacao.data_abertura BETWEEN :inicio AND :fim', { 
        inicio, 
        fim 
      });
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
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Busca uma solicitação pelo ID
   */
  async findById(id: string) {
    const solicitacao = await this.solicitacaoRepository.findOne({
      where: { id },
      relations: [
        'beneficiario', 
        'tipo_beneficio', 
        'unidade', 
        'tecnico', 
        'aprovador',
        'liberador',
        'documentos'
      ],
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
    
    // Usuários da mesma unidade podem acessar
    return user.unidade_id === solicitacao.unidade_id;
  }

  /**
   * Cria uma nova solicitação
   */
  async create(createSolicitacaoDto: CreateSolicitacaoDto, user: any) {
    // Verificar se o usuário tem permissão para criar solicitação na unidade especificada
    if (![Role.ADMIN, Role.GESTOR_SEMTAS].includes(user.role) && 
        user.unidade_id !== createSolicitacaoDto.unidade_id) {
      throw new UnauthorizedException('Você não tem permissão para criar solicitações nesta unidade');
    }
    
    // Criar a solicitação usando a instância direta da entidade para evitar problemas de tipagem
    const solicitacao = new Solicitacao();
    
    // Preencher os campos da solicitação
    solicitacao.beneficiario_id = createSolicitacaoDto.beneficiario_id;
    solicitacao.tipo_beneficio_id = createSolicitacaoDto.tipo_beneficio_id;
    solicitacao.unidade_id = createSolicitacaoDto.unidade_id;
    solicitacao.tecnico_id = user.id;
    solicitacao.data_abertura = new Date();
    solicitacao.status = StatusSolicitacao.RASCUNHO;
    
    // Campos opcionais
    if (createSolicitacaoDto.observacoes) {
      solicitacao.observacoes = createSolicitacaoDto.observacoes;
    }
    
    if (createSolicitacaoDto.dados_complementares) {
      solicitacao.dados_complementares = createSolicitacaoDto.dados_complementares;
    }
    
    // Salvar a solicitação
    const savedSolicitacao = await this.solicitacaoRepository.save(solicitacao);
    
    // Registrar no histórico
    await this.registrarHistorico(
      savedSolicitacao.id,
      user.id,
      'Solicitação criada',
      'Solicitação criada como rascunho'
    );
    
    return this.findById(savedSolicitacao.id);
  }

  /**
   * Atualiza uma solicitação existente
   */
  async update(id: string, updateSolicitacaoDto: UpdateSolicitacaoDto, user: any) {
    // Buscar a solicitação
    const solicitacao = await this.findById(id);
    
    // Verificar se o usuário tem permissão para atualizar esta solicitação
    if (!this.canAccessSolicitacao(solicitacao, user)) {
      throw new UnauthorizedException('Você não tem permissão para atualizar esta solicitação');
    }
    
    // Verificar se a solicitação está em estado que permite atualização
    if (solicitacao.status !== StatusSolicitacao.RASCUNHO && 
        solicitacao.status !== StatusSolicitacao.AGUARDANDO_DOCUMENTOS) {
      throw new BadRequestException(`Não é possível atualizar uma solicitação com status ${solicitacao.status}`);
    }
    
    // Atualizar os campos permitidos
    if (updateSolicitacaoDto.tipo_beneficio_id) {
      solicitacao.tipo_beneficio_id = updateSolicitacaoDto.tipo_beneficio_id;
    }
    
    if (updateSolicitacaoDto.unidade_id) {
      // Verificar se o usuário tem permissão para mudar para esta unidade
      if (![Role.ADMIN, Role.GESTOR_SEMTAS].includes(user.role) && 
          user.unidade_id !== updateSolicitacaoDto.unidade_id) {
        throw new UnauthorizedException('Você não tem permissão para mudar a solicitação para esta unidade');
      }
      solicitacao.unidade_id = updateSolicitacaoDto.unidade_id;
    }
    
    if (updateSolicitacaoDto.observacoes !== undefined) {
      solicitacao.observacoes = updateSolicitacaoDto.observacoes;
    }
    
    if (updateSolicitacaoDto.dados_complementares) {
      solicitacao.dados_complementares = {
        ...solicitacao.dados_complementares,
        ...updateSolicitacaoDto.dados_complementares
      };
    }
    
    // Salvar a solicitação atualizada
    await this.solicitacaoRepository.save(solicitacao);
    
    // Registrar no histórico
    await this.registrarHistorico(
      id,
      user.id,
      'Solicitação atualizada',
      'Dados da solicitação foram atualizados'
    );
    
    return this.findById(id);
  }

  /**
   * Submete uma solicitação para análise
   */
  async submeterSolicitacao(id: string, user: any) {
    // Buscar a solicitação
    const solicitacao = await this.findById(id);
    
    // Verificar se o usuário tem permissão
    if (!this.canAccessSolicitacao(solicitacao, user)) {
      throw new UnauthorizedException('Você não tem permissão para submeter esta solicitação');
    }
    
    // Verificar se a solicitação está em estado que permite submissão
    if (solicitacao.status !== StatusSolicitacao.RASCUNHO) {
      throw new BadRequestException(`Não é possível submeter uma solicitação com status ${solicitacao.status}`);
    }
    
    // Atualizar o status
    solicitacao.status = StatusSolicitacao.PENDENTE;
    await this.solicitacaoRepository.save(solicitacao);
    
    // Registrar no histórico
    await this.registrarHistorico(
      id,
      user.id,
      'Solicitação submetida',
      'Solicitação enviada para análise'
    );
    
    return this.findById(id);
  }

  /**
   * Avalia uma solicitação (aprovar/pendenciar)
   */
  async avaliarSolicitacao(id: string, avaliarSolicitacaoDto: AvaliarSolicitacaoDto, user: any) {
    // Buscar a solicitação
    const solicitacao = await this.findById(id);
    
    // Verificar se o usuário tem permissão
    if (!this.canAccessSolicitacao(solicitacao, user)) {
      throw new UnauthorizedException('Você não tem permissão para avaliar esta solicitação');
    }
    
    // Verificar se a solicitação está em estado que permite avaliação
    if (solicitacao.status !== StatusSolicitacao.PENDENTE && 
        solicitacao.status !== StatusSolicitacao.EM_ANALISE) {
      throw new BadRequestException(`Não é possível avaliar uma solicitação com status ${solicitacao.status}`);
    }
    
    // Atualizar o status com base na avaliação
    if (avaliarSolicitacaoDto.aprovado) {
      solicitacao.status = StatusSolicitacao.APROVADA;
      solicitacao.parecer_semtas = avaliarSolicitacaoDto.parecer;
      solicitacao.aprovador_id = user.id;
      solicitacao.data_aprovacao = new Date();
    } else {
      solicitacao.status = StatusSolicitacao.AGUARDANDO_DOCUMENTOS;
      
      // Registrar pendências
      if (avaliarSolicitacaoDto.pendencias && avaliarSolicitacaoDto.pendencias.length > 0) {
        for (const descricaoTexto of avaliarSolicitacaoDto.pendencias) {
          // Criar uma nova instância de Pendencia diretamente para evitar problemas de tipagem
          const pendencia = new Pendencia();
          pendencia.solicitacao_id = id;
          pendencia.descricao = descricaoTexto;
          pendencia.status = StatusPendencia.ABERTA;
          pendencia.registrado_por_id = user.id;
          
          await this.pendenciaRepository.save(pendencia);
        }
      }
    }
    
    await this.solicitacaoRepository.save(solicitacao);
    
    // Registrar no histórico
    const acao = avaliarSolicitacaoDto.aprovado ? 'Solicitação aprovada' : 'Solicitação pendenciada';
    await this.registrarHistorico(
      id,
      user.id,
      acao,
      avaliarSolicitacaoDto.parecer
    );
    
    return this.findById(id);
  }

  /**
   * Libera um benefício aprovado
   */
  async liberarBeneficio(id: string, user: any) {
    // Buscar a solicitação
    const solicitacao = await this.findById(id);
    
    // Verificar se o usuário tem permissão
    if (![Role.ADMIN, Role.GESTOR_SEMTAS].includes(user.role)) {
      throw new UnauthorizedException('Você não tem permissão para liberar benefícios');
    }
    
    // Verificar se a solicitação está aprovada
    if (solicitacao.status !== StatusSolicitacao.APROVADA) {
      throw new BadRequestException('Apenas solicitações aprovadas podem ser liberadas');
    }
    
    // Atualizar o status
    solicitacao.status = StatusSolicitacao.LIBERADA;
    solicitacao.liberador_id = user.id;
    solicitacao.data_liberacao = new Date();
    
    await this.solicitacaoRepository.save(solicitacao);
    
    // Registrar no histórico
    await this.registrarHistorico(
      id,
      user.id,
      'Benefício liberado',
      'Benefício liberado para pagamento/entrega'
    );
    
    return this.findById(id);
  }

  /**
   * Cancela uma solicitação
   */
  async cancelarSolicitacao(id: string, user: any) {
    // Buscar a solicitação
    const solicitacao = await this.findById(id);
    
    // Verificar se o usuário tem permissão
    if (![Role.ADMIN, Role.GESTOR_SEMTAS, Role.TECNICO_SEMTAS].includes(user.role)) {
      throw new UnauthorizedException('Você não tem permissão para cancelar solicitações');
    }
    
    // Verificar se a solicitação pode ser cancelada
    if (solicitacao.status === StatusSolicitacao.LIBERADA) {
      throw new BadRequestException('Não é possível cancelar uma solicitação já liberada');
    }
    
    // Atualizar o status
    solicitacao.status = StatusSolicitacao.CANCELADA;
    await this.solicitacaoRepository.save(solicitacao);
    
    // Registrar no histórico
    await this.registrarHistorico(
      id,
      user.id,
      'Solicitação cancelada',
      'Solicitação cancelada pelo usuário'
    );
    
    return this.findById(id);
  }

  /**
   * Registra uma entrada no histórico da solicitação
   */
  private async registrarHistorico(
    solicitacaoId: string,
    usuarioId: string,
    acao: string,
    descricao: string
  ) {
    // Buscar a solicitação para obter o status atual
    const solicitacao = await this.solicitacaoRepository.findOne({
      where: { id: solicitacaoId }
    });
    
    if (!solicitacao) {
      throw new NotFoundException(`Solicitação com ID ${solicitacaoId} não encontrada`);
    }
    
    // Criar uma nova instância de HistoricoSolicitacao
    const historico = new HistoricoSolicitacao();
    historico.solicitacao_id = solicitacaoId;
    historico.usuario_id = usuarioId;
    historico.status_anterior = solicitacao.status;
    historico.status_atual = solicitacao.status;
    historico.observacao = `${acao}: ${descricao}`;
    
    return this.historicoRepository.save(historico);
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
