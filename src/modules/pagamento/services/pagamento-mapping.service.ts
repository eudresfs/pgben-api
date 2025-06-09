import { Injectable, Logger } from '@nestjs/common';
import { 
  IPagamentoMappingService, 
  IPaginatedResponse, 
  ICriteriosBusca 
} from '../interfaces/mapping.interface';
import { IContextoUsuario } from '../interfaces/integracao-solicitacao.interface';
import { PagamentoCreateDto } from '../dtos/pagamento-create.dto';
import { PagamentoResponseDto } from '../dtos/pagamento-response.dto';
import { Pagamento } from '../../../entities/pagamento.entity';
import { DataMaskingUtil } from '../utils/data-masking.util';
import { SolicitacaoService } from '../../solicitacao/services/solicitacao.service';
import { UsuarioService } from '../../usuario/services/usuario.service';
import { StatusPagamentoEnum } from '../../../enums/status-pagamento.enum';
import { StatusSolicitacao } from '../../../enums/status-solicitacao.enum';

@Injectable()
export class PagamentoMappingService implements IPagamentoMappingService {
  private readonly logger = new Logger(PagamentoMappingService.name);

  constructor(
    private readonly solicitacaoService: SolicitacaoService,
    private readonly usuarioService: UsuarioService,
  ) {}

  /**
   * Mapeia DTO de criação para entidade
   * Regra: Validar solicitação e aplicar dados do usuário
   */
  async mapCreateDtoToEntity(
    dto: PagamentoCreateDto,
    solicitacaoId: string,
    contextoUsuario: IContextoUsuario
  ): Promise<Partial<Pagamento>> {
    this.logger.debug(`Mapeando DTO de criação para entidade - Usuário: ${contextoUsuario.id}`);

    // Buscar e validar solicitação
    const solicitacao = await this.solicitacaoService.findById(solicitacaoId);
    if (!solicitacao) {
      throw new Error('Solicitação não encontrada');
    }

    if (solicitacao.status !== StatusSolicitacao.APROVADA) {
      throw new Error('Solicitação deve estar aprovada para criar pagamento');
    }

    // Mapear dados básicos
    const pagamentoData: Partial<Pagamento> = {
      solicitacaoId: solicitacaoId,
      valor: dto.valor,
      observacoes: dto.observacoes?.trim(),
      status: StatusPagamentoEnum.AGENDADO,
      liberadoPor: contextoUsuario.id,
      dataLiberacao: new Date(),
      metodoPagamento: dto.metodoPagamento,
      // Campos de auditoria
      created_at: new Date(),
      updated_at: new Date()
    };

    return pagamentoData;
  }



  /**
   * Mapeia entidade para DTO de resposta
   * Regra: Aplicar mascaramento baseado no contexto do usuário
   */
  async mapEntityToResponseDto(
    pagamento: Pagamento,
    contextoUsuario: IContextoUsuario
  ): Promise<PagamentoResponseDto> {
    const dto = new PagamentoResponseDto();

    // Dados básicos sempre visíveis
    dto.id = pagamento.id;
    dto.solicitacaoId = pagamento.solicitacaoId;
    dto.valor = pagamento.valor;
    dto.status = pagamento.status;
    dto.observacoes = pagamento.observacoes;
    dto.dataLiberacao = pagamento.dataLiberacao;
    dto.metodoPagamento = pagamento.metodoPagamento;
    dto.createdAt = pagamento.created_at;
    dto.updatedAt = pagamento.updated_at;

    // Dados de auditoria (apenas para usuários autorizados)
    if (contextoUsuario.isAdmin || contextoUsuario.isSupervisor) {
      if (pagamento.liberadoPor) {
        dto.responsavelLiberacao = {
          id: pagamento.liberadoPor,
          nome: 'N/A', // TODO: Buscar nome do usuário
          role: 'N/A'  // TODO: Buscar role do usuário
        };
      }
    }

    // Relacionamentos (se carregados)
    if (pagamento.solicitacao) {
      dto.solicitacao = {
        id: pagamento.solicitacao.id,
        beneficiario: pagamento.solicitacao.beneficiario?.nome || 'N/A',
        tipoBeneficio: pagamento.solicitacao.tipo_beneficio
      };
    }

    return dto;
  }

  /**
   * Mapeia lista de entidades para DTOs de resposta
   */
  async mapEntitiesToResponseDtos(
    pagamentos: Pagamento[],
    contextoUsuario: IContextoUsuario
  ): Promise<PagamentoResponseDto[]> {
    return Promise.all(
      pagamentos.map(pagamento => 
        this.mapEntityToResponseDto(pagamento, contextoUsuario)
      )
    );
  }

  /**
   * Constrói resposta paginada padronizada
   */
  buildPaginatedResponse<T>(
    items: T[],
    total: number,
    page: number,
    limit: number
  ): IPaginatedResponse<T> {
    const totalPages = Math.ceil(total / limit);

    return {
      items,
      total,
      page,
      limit,
      totalPages,
      hasNext: page < totalPages,
      hasPrevious: page > 1
    };
  }

  /**
   * Mapeia filtros de query para critérios de busca
   */
  mapFiltersToCriteria(
    filtros: any,
    contextoUsuario: IContextoUsuario
  ): ICriteriosBusca {
    const where: any = {};
    const relations = ['solicitacao'];
    const order: any = { created_at: 'desc' };

    // Aplicar filtros de acesso baseados no contexto
    if (!contextoUsuario.isAdmin) {
      where.liberadoPor = contextoUsuario.id;
    }

    // Filtros específicos
    if (filtros.status) {
      where.status = filtros.status;
    }

    if (filtros.dataInicio && filtros.dataFim) {
      where.created_at = {
        gte: new Date(filtros.dataInicio),
        lte: new Date(filtros.dataFim)
      };
    }

    if (filtros.valorMinimo || filtros.valorMaximo) {
      where.valor = {};
      if (filtros.valorMinimo) {where.valor.gte = filtros.valorMinimo;}
      if (filtros.valorMaximo) {where.valor.lte = filtros.valorMaximo;}
    }
    
    return {
      where,
      relations,
      order,
      skip: (filtros.page - 1) * filtros.limit,
      take: filtros.limit
    };
  }
}