import {
  Injectable,
  Inject,
  forwardRef,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { UseInterceptors } from '@nestjs/common';
import { CacheInterceptor } from '../../../shared/interceptors/cache.interceptor';
import { WorkflowSolicitacaoService } from '../../solicitacao/services/workflow-solicitacao.service';
import { DadosAluguelSocial } from '../../../entities/dados-aluguel-social.entity';
import { CreateDadosAluguelSocialDto } from '../dto/create-dados-aluguel-social.dto';
import { UpdateDadosAluguelSocialDto } from '../dto/update-dados-aluguel-social.dto';
import {
  AbstractDadosBeneficioService,
  IPaginatedResult,
} from './base/abstract-dados-beneficio.service';
import {
  BeneficioErrorContext,
  BeneficioValidationErrorBuilder,
  BENEFICIO_TECH_MESSAGES,
} from '../../../shared/exceptions/error-catalog/domains/beneficio.errors';
import { BENEFICIO_CONSTANTS } from '../../../shared/constants/beneficio.constants';
import { AppError } from '@/shared/exceptions';

/**
 * Serviço para gerenciar dados específicos de Aluguel Social
 * Estende a classe base para reutilizar operações CRUD comuns
 */
@Injectable()
@UseInterceptors(CacheInterceptor)
export class DadosAluguelSocialService extends AbstractDadosBeneficioService<
  DadosAluguelSocial,
  CreateDadosAluguelSocialDto,
  UpdateDadosAluguelSocialDto
> {
  constructor(
    @InjectRepository(DadosAluguelSocial)
    private readonly dadosAluguelSocialRepository: Repository<DadosAluguelSocial>,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
    @Inject(forwardRef(() => WorkflowSolicitacaoService))
    private readonly workflowSolicitacaoService: WorkflowSolicitacaoService,
  ) {
    super(
      dadosAluguelSocialRepository,
      'DadosAluguelSocial',
      workflowSolicitacaoService,
    );
  }

  // Métodos CRUD básicos herdados da classe base
  // create(), findOne(), findBySolicitacao(), update(), remove(), existsBySolicitacao(), findAll()

  /**
   * Buscar dados por público prioritário
   */
  async findByPublicoPrioritario(
    publicoPrioritario: string,
    page: number = 1,
    limit: number = 10,
  ): Promise<{
    data: DadosAluguelSocial[];
    total: number;
    page: number;
    limit: number;
  }> {
    const [data, total] = await this.dadosAluguelSocialRepository.findAndCount({
      where: { publico_prioritario: publicoPrioritario as any },
      relations: ['solicitacao'],
      skip: (page - 1) * limit,
      take: limit,
      order: { created_at: 'DESC' },
    });

    return {
      data,
      total,
      page,
      limit,
    };
  }

  // Implementação dos métodos abstratos da classe base
  /**
   * Construir contexto de erro específico para Aluguel Social
   */
  protected buildErrorContext(data: any): BeneficioErrorContext {
    return {
      data: {
        tipoBeneficio: 'ALUGUEL_SOCIAL',
        solicitacao_id: data.solicitacao_id,
        publico_prioritario: data.publico_prioritario,
        situacao_moradia_atual: data.situacao_moradia_atual,
        especificacoes: data.especificacoes,
      },
    };
  }

  /**
   * Validação específica para criação de dados de Aluguel Social
   */
  protected async validateCreateData(
    data: CreateDadosAluguelSocialDto,
  ): Promise<void> {
    const errorBuilder = new BeneficioValidationErrorBuilder();
    const rules = BENEFICIO_CONSTANTS.BUSINESS_RULES.ALUGUEL_SOCIAL;

    try {
      // Validação de campos obrigatórios
      if (!data.solicitacao_id?.trim()) {
        errorBuilder.add(
          'solicitacao_id',
          BENEFICIO_TECH_MESSAGES.ALUGUEL_SOCIAL.SOLICITACAO_ID_REQUIRED,
        );
      }

      if (!data.publico_prioritario?.trim()) {
        errorBuilder.add(
          'publico_prioritario',
          BENEFICIO_TECH_MESSAGES.ALUGUEL_SOCIAL.PUBLICO_PRIORITARIO_REQUIRED,
        );
      }

      if (!data.situacao_moradia_atual?.trim()) {
        errorBuilder.add(
          'situacao_moradia_atual',
          'Campo situacao_moradia_atual é obrigatório. Validação de campo obrigatório falhou.',
        );
      }

      // Validação de situação de moradia atual
      if (
        data.situacao_moradia_atual &&
        data.situacao_moradia_atual.trim().length < rules.MIN_SITUACAO_MORADIA
      ) {
        errorBuilder.add(
          'situacao_moradia_atual',
          BENEFICIO_TECH_MESSAGES.ALUGUEL_SOCIAL.SITUACAO_MORADIA_MIN_LENGTH,
        );
      }

      // Validação de especificações
      if (data.especificacoes) {
        if (!Array.isArray(data.especificacoes)) {
          errorBuilder.add(
            'especificacoes',
            'Campo especificacoes deve ser um array válido. Validação de tipo falhou.',
          );
        } else if (data.especificacoes.length > rules.MAX_ESPECIFICACOES) {
          errorBuilder.add(
            'especificacoes',
            BENEFICIO_TECH_MESSAGES.ALUGUEL_SOCIAL.MAX_ESPECIFICACOES,
          );
        } else {
          // Validar cada especificação individualmente
          data.especificacoes.forEach((spec, index) => {
            if (!spec || typeof spec !== 'string' || spec.trim().length === 0) {
              errorBuilder.add(
                `especificacoes[${index}]`,
                `Especificação ${index + 1} não pode estar vazia. Validação de conteúdo falhou.`,
              );
            }
          });
        }
      }

      // Validação de campos booleanos obrigatórios
      if (
        data.possui_imovel_interditado === undefined ||
        data.possui_imovel_interditado === null
      ) {
        errorBuilder.add(
          'possui_imovel_interditado',
          'Campo possui_imovel_interditado é obrigatório. Validação de campo obrigatório falhou.',
        );
      }

      // Validação de campos opcionais de processo
      if (
        data.processo_judicializado !== undefined &&
        data.processo_judicializado !== null
      ) {
        if (typeof data.processo_judicializado !== 'string') {
          errorBuilder.add(
            'processo_judicializado',
            'Campo processo_judicializado deve ser uma string. Validação de tipo falhou.',
          );
        } else if (data.processo_judicializado.trim().length === 0) {
          errorBuilder.add(
            'processo_judicializado',
            'Campo processo_judicializado não pode estar vazio. Validação de conteúdo falhou.',
          );
        }
      }

      if (data.numero_processo !== undefined && data.numero_processo !== null) {
        if (typeof data.numero_processo !== 'string') {
          errorBuilder.add(
            'numero_processo',
            'Campo numero_processo deve ser uma string. Validação de tipo falhou.',
          );
        } else if (data.numero_processo.trim().length === 0) {
          errorBuilder.add(
            'numero_processo',
            'Campo numero_processo não pode estar vazio. Validação de conteúdo falhou.',
          );
        }
      }

      // Validação de observações (se fornecidas)
      if (
        data.observacoes &&
        data.observacoes.length > BENEFICIO_CONSTANTS.VALIDATION.MAX_OBSERVACOES
      ) {
        errorBuilder.add(
          'observacoes',
          `Campo observacoes excede o limite máximo de ${BENEFICIO_CONSTANTS.VALIDATION.MAX_OBSERVACOES} caracteres. Validação de tamanho falhou.`,
        );
      }

      // Validação de campos do locador
      if (data.cpf_locador && !/^\d{3}\.\d{3}\.\d{3}-\d{2}$/.test(data.cpf_locador)) {
        errorBuilder.add(
          'cpf_locador',
          'CPF do locador deve estar no formato XXX.XXX.XXX-XX. Validação de formato falhou.',
        );
      }

      if (data.telefone_locador && !/^\(?\d{2}\)?\s?\d{4,5}-?\d{4}$/.test(data.telefone_locador)) {
        errorBuilder.add(
          'telefone_locador',
          'Telefone do locador deve estar em formato válido. Validação de formato falhou.',
        );
      }

      // Validação de determinação judicial
      if (data.determinacao_judicial !== undefined && typeof data.determinacao_judicial !== 'boolean') {
        errorBuilder.add(
          'determinacao_judicial',
          'Campo determinacao_judicial deve ser um booleano. Validação de tipo falhou.',
        );
      }

      // Nota: Removida validação de duplicação para permitir comportamento de upsert
      // A lógica de upsert é tratada no método create() da classe base

      errorBuilder.throwIfHasErrors();
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      this.logger.error('Erro inesperado durante validação de aluguel social', {
        error: error.message,
        stack: error.stack,
        solicitacao_id: data.solicitacao_id,
      });
      throw new InternalServerErrorException(
        'Erro interno durante validação dos dados de aluguel social',
      );
    }
  }

  /**
   * Validação específica para atualização de dados de Aluguel Social
   */
  protected async validateUpdateData(
    data: UpdateDadosAluguelSocialDto,
    entity: DadosAluguelSocial,
  ): Promise<void> {
    const errorBuilder = new BeneficioValidationErrorBuilder();
    const rules = BENEFICIO_CONSTANTS.BUSINESS_RULES.ALUGUEL_SOCIAL;

    try {
      // Validação de público prioritário (se fornecido)
      if (
        data.publico_prioritario !== undefined &&
        !data.publico_prioritario?.trim()
      ) {
        errorBuilder.add(
          'publico_prioritario',
          BENEFICIO_TECH_MESSAGES.ALUGUEL_SOCIAL.PUBLICO_PRIORITARIO_REQUIRED,
        );
      }

      // Validação de situação de moradia atual
      if (data.situacao_moradia_atual !== undefined) {
        if (!data.situacao_moradia_atual?.trim()) {
          errorBuilder.add(
            'situacao_moradia_atual',
            'Campo situacao_moradia_atual não pode estar vazio. Validação de campo obrigatório falhou.',
          );
        } else if (
          data.situacao_moradia_atual.trim().length < rules.MIN_SITUACAO_MORADIA
        ) {
          errorBuilder.add(
            'situacao_moradia_atual',
            BENEFICIO_TECH_MESSAGES.ALUGUEL_SOCIAL.SITUACAO_MORADIA_MIN_LENGTH,
          );
        }
      }

      // Validação de especificações
      if (data.especificacoes !== undefined) {
        if (!Array.isArray(data.especificacoes)) {
          errorBuilder.add(
            'especificacoes',
            'Campo especificacoes deve ser um array válido. Validação de tipo falhou.',
          );
        } else if (data.especificacoes.length > rules.MAX_ESPECIFICACOES) {
          errorBuilder.add(
            'especificacoes',
            BENEFICIO_TECH_MESSAGES.ALUGUEL_SOCIAL.MAX_ESPECIFICACOES,
          );
        } else {
          // Validar cada especificação individualmente
          data.especificacoes.forEach((spec, index) => {
            if (!spec || typeof spec !== 'string' || spec.trim().length === 0) {
              errorBuilder.add(
                `especificacoes[${index}]`,
                `Especificação ${index + 1} não pode estar vazia. Validação de conteúdo falhou.`,
              );
            }
          });
        }
      }

      // Validação de observações (se fornecidas)
      if (
        data.observacoes !== undefined &&
        data.observacoes &&
        data.observacoes.length > BENEFICIO_CONSTANTS.VALIDATION.MAX_OBSERVACOES
      ) {
        errorBuilder.add(
          'observacoes',
          `Campo observacoes excede o limite máximo de ${BENEFICIO_CONSTANTS.VALIDATION.MAX_OBSERVACOES} caracteres. Validação de tamanho falhou.`,
        );
      }

      // Validação de campos do locador
      if (data.cpf_locador !== undefined && data.cpf_locador && !/^\d{3}\.\d{3}\.\d{3}-\d{2}$/.test(data.cpf_locador)) {
        errorBuilder.add(
          'cpf_locador',
          'CPF do locador deve estar no formato XXX.XXX.XXX-XX. Validação de formato falhou.',
        );
      }

      if (data.telefone_locador !== undefined && data.telefone_locador && !/^\(?\d{2}\)?\s?\d{4,5}-?\d{4}$/.test(data.telefone_locador)) {
        errorBuilder.add(
          'telefone_locador',
          'Telefone do locador deve estar em formato válido. Validação de formato falhou.',
        );
      }



      // Validação de determinação judicial
      if (data.determinacao_judicial !== undefined && typeof data.determinacao_judicial !== 'boolean') {
        errorBuilder.add(
          'determinacao_judicial',
          'Campo determinacao_judicial deve ser um booleano. Validação de tipo falhou.',
        );
      }

      errorBuilder.throwIfHasErrors();
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      this.logger.error(
        'Erro inesperado durante validação de atualização de aluguel social',
        {
          error: error.message,
          stack: error.stack,
          entity_id: entity.id,
        },
      );
      throw new InternalServerErrorException(
        'Erro interno durante validação dos dados de aluguel social',
      );
    }
  }
}
