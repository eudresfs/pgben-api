import {
  Injectable,
  NotFoundException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HistoricoConversaoPapel } from '../entities/historico-conversao-papel.entity';
import { CreateHistoricoConversaoPapelDto } from '../dto/create-historico-conversao-papel.dto';
import { NotificacaoService } from '../../notificacao/services/notificacao.service';
import { TipoPapel, PaperType } from '../enums/tipo-papel.enum';

/**
 * Serviço de Histórico de Conversão de Papel
 *
 * Responsável por registrar e consultar o histórico de conversões de papéis
 * dos cidadãos no sistema.
 */
@Injectable()
export class HistoricoConversaoPapelService {
  private readonly logger = new Logger(HistoricoConversaoPapelService.name);

  constructor(
    @InjectRepository(HistoricoConversaoPapel)
    private readonly historicoRepository: Repository<HistoricoConversaoPapel>,
    private readonly notificacaoService: NotificacaoService,
  ) {}

  /**
   * Cria um novo registro de histórico de conversão de papel
   * @param createHistoricoDto Dados do histórico a ser criado
   * @param usuarioId ID do usuário que está realizando a conversão
   * @returns Histórico criado
   */
  async create(
    createHistoricoDto: CreateHistoricoConversaoPapelDto,
    usuarioId: string,
  ): Promise<HistoricoConversaoPapel> {
    try {
      // Criar o registro de histórico
      const novoHistorico = this.historicoRepository.create({
        ...createHistoricoDto,
        usuario_id: usuarioId,
        notificacao_enviada: false,
      });

      // Salvar o registro
      const historicoSalvo = await this.historicoRepository.save(novoHistorico);

      // Enviar notificação para o técnico responsável, se fornecido
      if (createHistoricoDto.tecnico_notificado_id) {
        try {
          await this.notificacaoService.enviarNotificacao({
            destinatario_id: createHistoricoDto.tecnico_notificado_id,
            tipo: 'CONVERSAO_PAPEL',
            titulo: 'Conversão de Papel de Cidadão',
            conteudo: `Um cidadão foi convertido de ${createHistoricoDto.papel_anterior} para ${createHistoricoDto.papel_novo}. Justificativa: ${createHistoricoDto.justificativa}`,
            dados: {
              historico_id: historicoSalvo.id,
              cidadao_id: createHistoricoDto.cidadao_id,
              papel_anterior: createHistoricoDto.papel_anterior,
              papel_novo: createHistoricoDto.papel_novo,
            },
          });

          // Atualizar o registro para indicar que a notificação foi enviada
          await this.historicoRepository.update(historicoSalvo.id, {
            notificacao_enviada: true,
          });
        } catch (error) {
          this.logger.error(
            `Erro ao enviar notificação de conversão de papel: ${error.message}`,
            error.stack,
          );
          // Não interromper o fluxo se a notificação falhar
        }
      }

      return historicoSalvo;
    } catch (error) {
      this.logger.error(
        `Erro ao criar histórico de conversão de papel: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException(
        'Erro ao criar histórico de conversão de papel',
      );
    }
  }

  /**
   * Busca o histórico de conversões de papel de um cidadão
   * @param cidadaoId ID do cidadão
   * @returns Lista de registros de histórico
   */
  async findByCidadaoId(cidadaoId: string): Promise<HistoricoConversaoPapel[]> {
    try {
      return this.historicoRepository.find({
        where: { cidadao_id: cidadaoId },
        order: { created_at: 'DESC' },
      });
    } catch (error) {
      this.logger.error(
        `Erro ao buscar histórico de conversão de papel: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException(
        'Erro ao buscar histórico de conversão de papel',
      );
    }
  }

  /**
   * Busca um registro de histórico pelo ID
   * @param id ID do registro
   * @returns Registro de histórico
   * @throws NotFoundException se o registro não for encontrado
   */
  async findById(id: string): Promise<HistoricoConversaoPapel> {
    try {
      const historico = await this.historicoRepository.findOne({
        where: { id },
      });

      if (!historico) {
        throw new NotFoundException('Histórico de conversão não encontrado');
      }

      return historico;
    } catch (error) {
      if (error instanceof NotFoundException) {throw error;}
      this.logger.error(
        `Erro ao buscar histórico de conversão: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException(
        'Erro ao buscar histórico de conversão',
      );
    }
  }

  /**
   * Cria um novo registro de histórico de conversão de papel (alias para o método create)
   * @param createHistoricoDto Dados do histórico a ser criado
   * @param usuarioId ID do usuário que está realizando a conversão
   * @returns Histórico criado
   */
  async criarHistorico(
    createHistoricoDto: CreateHistoricoConversaoPapelDto,
    usuarioId: string,
  ): Promise<HistoricoConversaoPapel> {
    return this.create(createHistoricoDto, usuarioId);
  }

  /**
   * Busca o histórico de conversões de papel por período
   * @param dataInicio Data de início do período
   * @param dataFim Data de fim do período
   * @param options Opções adicionais de filtro
   * @returns Lista de registros de histórico
   */
  async findByPeriodo(
    dataInicio: Date,
    dataFim: Date,
    options?: {
      cidadaoId?: string;
      papelAnterior?: PaperType;
      papelNovo?: PaperType;
      page?: number;
      limit?: number;
    },
  ): Promise<{ items: HistoricoConversaoPapel[]; total: number }> {
    try {
      const { cidadaoId, papelAnterior, papelNovo, page = 1, limit = 10 } = options || {};
      const skip = (page - 1) * limit;

      // Construir a query base
      const queryBuilder = this.historicoRepository.createQueryBuilder('historico')
        .where('historico.created_at BETWEEN :dataInicio AND :dataFim', {
          dataInicio,
          dataFim,
        })
        .orderBy('historico.created_at', 'DESC');

      // Adicionar filtros opcionais
      if (cidadaoId) {
        queryBuilder.andWhere('historico.cidadao_id = :cidadaoId', { cidadaoId });
      }

      if (papelAnterior) {
        queryBuilder.andWhere('historico.papel_anterior = :papelAnterior', { papelAnterior });
      }

      if (papelNovo) {
        queryBuilder.andWhere('historico.papel_novo = :papelNovo', { papelNovo });
      }

      // Executar a query com paginação
      const [items, total] = await queryBuilder
        .skip(skip)
        .take(limit)
        .getManyAndCount();

      return { items, total };
    } catch (error) {
      this.logger.error(
        `Erro ao buscar histórico de conversão por período: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException(
        'Erro ao buscar histórico de conversão por período',
      );
    }
  }
}
