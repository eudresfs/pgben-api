import {
  Injectable,
  NotFoundException,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Connection } from 'typeorm';
import { Recurso, StatusRecurso } from '../entities/recurso.entity';
import { RecursoHistorico } from '../entities/recurso-historico.entity';
import { Solicitacao, StatusSolicitacao } from '../../solicitacao/entities/solicitacao.entity';
import { CreateRecursoDto } from '../dto/create-recurso.dto';
import { AnalisarRecursoDto } from '../dto/analisar-recurso.dto';
import { RecursoResponseDto } from '../dto/recurso-response.dto';
import { ROLES } from '../../../shared/constants/roles.constants';

/**
 * Serviço de Recursos de Primeira Instância
 *
 * Responsável pela lógica de negócio relacionada aos recursos de primeira instância
 * para solicitações de benefícios indeferidas
 */
@Injectable()
export class RecursoService {
  constructor(
    @InjectRepository(Recurso)
    private recursoRepository: Repository<Recurso>,

    @InjectRepository(RecursoHistorico)
    private historicoRepository: Repository<RecursoHistorico>,

    @InjectRepository(Solicitacao)
    private solicitacaoRepository: Repository<Solicitacao>,

    private connection: Connection,
  ) {}

  /**
   * Lista todos os recursos com paginação e filtros
   */
  async findAll(options: {
    page?: number;
    limit?: number;
    status?: StatusRecurso;
    solicitacao_id?: string;
    setor_id?: string;
    data_inicio?: string;
    data_fim?: string;
    user: any;
  }) {
    const {
      page = 1,
      limit = 10,
      status,
      solicitacao_id,
      setor_id,
      data_inicio,
      data_fim,
      user,
    } = options;

    const queryBuilder = this.recursoRepository.createQueryBuilder('recurso');

    // Joins necessários
    queryBuilder
      .leftJoinAndSelect('recurso.solicitacao', 'solicitacao')
      .leftJoinAndSelect('solicitacao.beneficiario', 'beneficiario')
      .leftJoinAndSelect('recurso.analista', 'analista')
      .leftJoinAndSelect('recurso.setor_responsavel', 'setor');

    // Aplicar filtros
    if (status) {
      queryBuilder.andWhere('recurso.status = :status', { status });
    }

    if (solicitacao_id) {
      queryBuilder.andWhere('recurso.solicitacao_id = :solicitacao_id', {
        solicitacao_id,
      });
    }

    if (setor_id) {
      queryBuilder.andWhere('recurso.setor_responsavel_id = :setor_id', {
        setor_id,
      });
    }

    // Filtro por período
    if (data_inicio && data_fim) {
      const inicio = new Date(data_inicio);
      const fim = new Date(data_fim);
      fim.setHours(23, 59, 59, 999); // Ajusta para o final do dia

      queryBuilder.andWhere(
        'recurso.created_at BETWEEN :inicio AND :fim',
        {
          inicio,
          fim,
        },
      );
    } else if (data_inicio) {
      const inicio = new Date(data_inicio);
      queryBuilder.andWhere('recurso.created_at >= :inicio', { inicio });
    } else if (data_fim) {
      const fim = new Date(data_fim);
      fim.setHours(23, 59, 59, 999); // Ajusta para o final do dia
      queryBuilder.andWhere('recurso.created_at <= :fim', { fim });
    }

    // Restrições de acesso baseadas no papel do usuário
    if (![ROLES.ADMIN, ROLES.GESTOR].includes(user.role)) {
      // Técnicos só podem ver recursos de solicitações da sua unidade
      queryBuilder.andWhere('solicitacao.unidade_id = :unidade_id', {
        unidade_id: user.unidade_id,
      });
    }

    // Calcular paginação
    const skip = (page - 1) * limit;
    queryBuilder.skip(skip).take(limit);

    // Ordenação padrão
    queryBuilder.orderBy('recurso.created_at', 'DESC');

    // Executar consulta
    const [items, total] = await queryBuilder.getManyAndCount();

    // Mapear resultados para DTOs
    const recursos = items.map(recurso => this.mapToDto(recurso));

    return {
      items: recursos,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Busca um recurso pelo ID
   */
  async findById(id: string): Promise<Recurso> {
    const recurso = await this.recursoRepository.findOne({
      where: { id },
      relations: [
        'solicitacao',
        'solicitacao.beneficiario',
        'analista',
        'setor_responsavel',
      ],
    });

    if (!recurso) {
      throw new NotFoundException(`Recurso com ID ${id} não encontrado`);
    }

    return recurso;
  }

  /**
   * Verifica se um usuário tem permissão para acessar um recurso
   */
  canAccessRecurso(recurso: Recurso, user: any): boolean {
    // Administradores e gestores podem acessar qualquer recurso
    if ([ROLES.ADMIN, ROLES.GESTOR].includes(user.role)) {
      return true;
    }

    // Técnicos só podem acessar recursos de solicitações da sua unidade
    if (user.role === ROLES.TECNICO) {
      return recurso.solicitacao.unidade_id === user.unidade_id;
    }

    // Outros usuários não têm acesso
    return false;
  }

  /**
   * Cria um novo recurso
   */
  async create(createRecursoDto: CreateRecursoDto, user: any): Promise<RecursoResponseDto> {
    return this.connection.transaction(async (manager) => {
      // Buscar a solicitação
      const solicitacao = await this.solicitacaoRepository.findOne({
        where: { id: createRecursoDto.solicitacao_id },
      });

      if (!solicitacao) {
        throw new NotFoundException(
          `Solicitação com ID ${createRecursoDto.solicitacao_id} não encontrada`,
        );
      }

      // Verificar se a solicitação está reprovada
      if (solicitacao.status !== StatusSolicitacao.REPROVADA) {
        throw new BadRequestException(
          'Só é possível criar recursos para solicitações reprovadas',
        );
      }

      // Verificar se já existe um recurso para esta solicitação
      const recursoExistente = await this.recursoRepository.findOne({
        where: { solicitacao_id: createRecursoDto.solicitacao_id },
      });

      if (recursoExistente) {
        throw new BadRequestException(
          'Já existe um recurso para esta solicitação',
        );
      }

      // Criar o recurso
      const recurso = new Recurso();
      recurso.solicitacao_id = createRecursoDto.solicitacao_id;
      recurso.justificativa = createRecursoDto.justificativa;
      recurso.status = StatusRecurso.PENDENTE;
      recurso.created_at = new Date();
      
      // Dados adicionais
      if (createRecursoDto.documentos) {
        recurso.documentos_adicionais = { documentos: createRecursoDto.documentos };
      }
      
      if (createRecursoDto.motivo_indeferimento) {
        recurso.motivo_indeferimento = createRecursoDto.motivo_indeferimento;
      } else {
        // Se não foi informado, usar o parecer da solicitação
        recurso.motivo_indeferimento = solicitacao.parecer_semtas || 'Não especificado';
      }
      
      // Definir setor responsável
      if (createRecursoDto.setor_responsavel_id) {
        recurso.setor_responsavel_id = createRecursoDto.setor_responsavel_id;
      } else {
        // Por padrão, usar o mesmo setor da unidade da solicitação
        recurso.setor_responsavel_id = solicitacao.unidade_id;
      }

      // Salvar o recurso
      const savedRecurso = await manager.save(recurso);

      // Criar histórico
      const historico = new RecursoHistorico();
      historico.recurso_id = savedRecurso.id;
      historico.status_anterior = ''; // Usando string vazia em vez de null
      historico.status_novo = StatusRecurso.PENDENTE;
      historico.usuario_id = user.id;
      historico.observacao = 'Recurso criado';
      
      await manager.save(historico);

      // Retornar o recurso salvo
      const result = await this.findById(savedRecurso.id);
      return this.mapToDto(result);
    });
  }

  /**
   * Inicia a análise de um recurso
   */
  async iniciarAnalise(id: string, user: any): Promise<RecursoResponseDto> {
    return this.connection.transaction(async (manager) => {
      // Buscar o recurso
      const recurso = await this.findById(id);

      // Verificar se o usuário tem permissão
      if (![ROLES.ADMIN, ROLES.GESTOR, ROLES.TECNICO].includes(user.role)) {
        throw new UnauthorizedException(
          'Você não tem permissão para analisar recursos',
        );
      }

      // Verificar se o recurso está pendente
      if (recurso.status !== StatusRecurso.PENDENTE) {
        throw new BadRequestException(
          'Só é possível iniciar análise de recursos pendentes',
        );
      }

      // Atualizar o status
      recurso.prepararAlteracaoStatus(
        StatusRecurso.EM_ANALISE,
        user.id,
        'Análise iniciada',
        user.ip || '0.0.0.0',
      );
      
      recurso.analista_id = user.id;

      // Salvar o recurso
      await manager.save(recurso);

      // Retornar o recurso atualizado
      const result = await this.findById(id);
      return this.mapToDto(result);
    });
  }

  /**
   * Analisa um recurso (deferir/indeferir)
   */
  async analisarRecurso(
    id: string,
    analisarRecursoDto: AnalisarRecursoDto,
    user: any,
  ): Promise<RecursoResponseDto> {
    return this.connection.transaction(async (manager) => {
      // Buscar o recurso
      const recurso = await this.findById(id);

      // Verificar se o usuário tem permissão
      if (![ROLES.ADMIN, ROLES.GESTOR, ROLES.TECNICO].includes(user.role)) {
        throw new UnauthorizedException(
          'Você não tem permissão para analisar recursos',
        );
      }

      // Verificar se o recurso está em análise
      if (recurso.status !== StatusRecurso.EM_ANALISE) {
        throw new BadRequestException(
          'Só é possível concluir análise de recursos em análise',
        );
      }

      // Atualizar o recurso
      recurso.prepararAlteracaoStatus(
        analisarRecursoDto.status,
        user.id,
        analisarRecursoDto.observacao || 'Análise concluída',
        user.ip || '0.0.0.0',
      );
      
      recurso.parecer = analisarRecursoDto.parecer;
      recurso.data_analise = new Date();

      // Se o recurso foi deferido, reabrir a solicitação
      if (analisarRecursoDto.status === StatusRecurso.DEFERIDO) {
        const solicitacao = await this.solicitacaoRepository.findOne({
          where: { id: recurso.solicitacao_id },
        });

        if (solicitacao) {
          solicitacao.prepararAlteracaoStatus(
            StatusSolicitacao.APROVADA,
            user.id,
            'Solicitação aprovada via recurso',
            user.ip || '0.0.0.0',
          );
          
          solicitacao.aprovador_id = user.id;
          solicitacao.data_aprovacao = new Date();
          
          await manager.save(solicitacao);
        }
      }

      // Salvar o recurso
      await manager.save(recurso);

      // Retornar o recurso atualizado
      const result = await this.findById(id);
      return this.mapToDto(result);
    });
  }

  /**
   * Cancela um recurso
   */
  async cancelarRecurso(id: string, user: any): Promise<RecursoResponseDto> {
    return this.connection.transaction(async (manager) => {
      // Buscar o recurso
      const recurso = await this.findById(id);

      // Verificar se o usuário tem permissão
      if (![ROLES.ADMIN, ROLES.GESTOR].includes(user.role)) {
        throw new UnauthorizedException(
          'Você não tem permissão para cancelar recursos',
        );
      }

      // Verificar se o recurso pode ser cancelado
      if ([StatusRecurso.DEFERIDO, StatusRecurso.INDEFERIDO].includes(recurso.status)) {
        throw new BadRequestException(
          'Não é possível cancelar um recurso já analisado',
        );
      }

      // Atualizar o status
      recurso.prepararAlteracaoStatus(
        StatusRecurso.CANCELADO,
        user.id,
        'Recurso cancelado pelo usuário',
        user.ip || '0.0.0.0',
      );

      // Salvar o recurso
      await manager.save(recurso);

      // Retornar o recurso atualizado
      const result = await this.findById(id);
      return this.mapToDto(result);
    });
  }

  /**
   * Lista o histórico de um recurso
   */
  async getHistorico(recursoId: string) {
    // Verificar se o recurso existe
    await this.findById(recursoId);

    // Buscar o histórico
    return this.historicoRepository.find({
      where: { recurso_id: recursoId },
      order: { created_at: 'DESC' },
      relations: ['usuario'],
    });
  }

  /**
   * Mapeia uma entidade Recurso para um DTO de resposta
   */
  private mapToDto(recurso: Recurso): RecursoResponseDto {
    const dto = new RecursoResponseDto();
    dto.id = recurso.id;
    dto.solicitacao_id = recurso.solicitacao_id;
    
    if (recurso.solicitacao) {
      dto.protocolo_solicitacao = recurso.solicitacao.protocolo;
      
      if (recurso.solicitacao.beneficiario) {
        dto.nome_beneficiario = recurso.solicitacao.beneficiario.nome;
      }
    }
    
    dto.justificativa = recurso.justificativa;
    dto.status = recurso.status;
    dto.created_at = recurso.created_at;
    dto.data_analise = recurso.data_analise;
    dto.analista_id = recurso.analista_id;
    
    if (recurso.analista) {
      dto.nome_analista = recurso.analista.nome;
    }
    
    dto.parecer = recurso.parecer;
    dto.documentos_adicionais = recurso.documentos_adicionais;
    dto.motivo_indeferimento = recurso.motivo_indeferimento;
    dto.prazo_analise = recurso.prazo_analise;
    dto.setor_responsavel_id = recurso.setor_responsavel_id;
    
    if (recurso.setor_responsavel) {
      dto.nome_setor_responsavel = recurso.setor_responsavel.nome;
    }
    
    dto.created_at = recurso.created_at;
    dto.updated_at = recurso.updated_at;
    
    return dto;
  }
}
