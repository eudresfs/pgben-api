import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import {
  TipoDadosBeneficio,
  ICreateDadosBeneficioDto,
  IDadosBeneficio,
  IUpdateDadosBeneficioDto,
} from '../interfaces/dados-beneficio.interface';
import { DadosAluguelSocialService } from './dados-aluguel-social.service';
import { DadosCestaBasicaService } from './dados-cesta-basica.service';
import { DadosFuneralService } from './dados-funeral.service';
import { DadosNatalidadeService } from './dados-natalidade.service';
import { AbstractDadosBeneficioService } from './base/abstract-dados-beneficio.service';
import { TipoBeneficioRepository } from '../repositories/tipo-beneficio.repository';
import { Status } from '@/enums';
import { TipoBeneficioSchema } from '@/entities';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

/**
 * Factory service para gerenciar diferentes tipos de dados de benefício.
 * Fornece uma interface unificada para operações CRUD em dados específicos de benefícios.
 */
@Injectable()
export class DadosBeneficioFactoryService {
  private readonly serviceMap: Map<
    TipoDadosBeneficio,
    AbstractDadosBeneficioService<any, any, any>
  >;
  private readonly codigoToTipoMap: Map<string, TipoDadosBeneficio>;

  constructor(
    private readonly aluguelSocialService: DadosAluguelSocialService,
    private readonly cestaBasicaService: DadosCestaBasicaService,
    private readonly funeralService: DadosFuneralService,
    private readonly natalidadeService: DadosNatalidadeService,
    private readonly tipoBeneficioRepository: TipoBeneficioRepository,

    @InjectRepository(TipoBeneficioSchema)
    private tipoBeneficioSchemaRepository: Repository<TipoBeneficioSchema>,
  ) {
    // Mapear tipos de benefício para seus respectivos serviços
    this.serviceMap = new Map();
    this.serviceMap.set(
      TipoDadosBeneficio.ALUGUEL_SOCIAL,
      this.aluguelSocialService,
    );
    this.serviceMap.set(
      TipoDadosBeneficio.CESTA_BASICA,
      this.cestaBasicaService,
    );
    this.serviceMap.set(TipoDadosBeneficio.FUNERAL, this.funeralService);
    this.serviceMap.set(TipoDadosBeneficio.NATALIDADE, this.natalidadeService);

    // Mapear códigos para tipos de benefício
    this.codigoToTipoMap = new Map([
      ['aluguel-social', TipoDadosBeneficio.ALUGUEL_SOCIAL],
      ['cesta-basica', TipoDadosBeneficio.CESTA_BASICA],
      ['funeral', TipoDadosBeneficio.FUNERAL],
      ['natalidade', TipoDadosBeneficio.NATALIDADE],
    ]);
  }

  /**
   * Criar dados específicos de benefício
   */
  async create(
    codigoOrId: string,
    createDto: ICreateDadosBeneficioDto,
  ): Promise<IDadosBeneficio> {
    const tipoBeneficio = await this.resolveTipoFromCodigoOrId(codigoOrId);
    const service = this.getService(tipoBeneficio);
    // Garantir que o serviço específico receba o createDto contendo o usuario_id
    return service.create(createDto);
  }

  /**
   * Obter o serviço específico para um tipo de benefício
   */
  private getService(
    tipo: TipoDadosBeneficio,
  ): AbstractDadosBeneficioService<any, any, any> {
    const service = this.serviceMap.get(tipo);
    if (!service) {
      throw new BadRequestException(
        `Serviço não encontrado para o tipo de benefício: ${tipo}`,
      );
    }
    return service;
  }

  /**
   * Resolver tipo de benefício a partir de código ou ID
   */
  private async resolveTipoFromCodigoOrId(
    codigoOrId: string,
  ): Promise<TipoDadosBeneficio> {
    if (!codigoOrId?.trim()) {
      throw new BadRequestException(
        'Código ou ID do tipo de benefício é obrigatório',
      );
    }

    const codigo = codigoOrId.trim();

    // Primeiro, tentar como código
    const tipoPorCodigo = this.codigoToTipoMap.get(codigo);
    if (tipoPorCodigo) {
      return tipoPorCodigo;
    }

    // Se não encontrou por código, tentar como ID
    const tipoBeneficio = await this.tipoBeneficioRepository.findOne({
      where: { id: codigo },
    });

    if (!tipoBeneficio) {
      const codigosDisponiveis = Array.from(this.codigoToTipoMap.keys()).join(
        ', ',
      );
      throw new NotFoundException(
        `Tipo de benefício não encontrado: ${codigo}. Códigos disponíveis: ${codigosDisponiveis}`,
      );
    }

    const tipo = this.codigoToTipoMap.get(tipoBeneficio.codigo);
    if (!tipo) {
      throw new BadRequestException(
        `Código de benefício não mapeado: ${tipoBeneficio.codigo}`,
      );
    }

    return tipo;
  }

  /**
   * Buscar dados específicos por ID
   */
  async findOne(codigoOrId: string, id: string): Promise<IDadosBeneficio> {
    const tipo = await this.resolveTipoFromCodigoOrId(codigoOrId);
    const service = this.getService(tipo);
    return service.findOne(id);
  }

  /**
   * Buscar dados específicos por solicitação
   */
  async findBySolicitacao(
    codigoOrId: string,
    solicitacaoId: string,
  ): Promise<IDadosBeneficio | null> {
    try {
      const tipo = await this.resolveTipoFromCodigoOrId(codigoOrId);
      const service = this.getService(tipo);
      return await service.findBySolicitacao(solicitacaoId);
    } catch (error) {
      if (error instanceof NotFoundException) {
        return null;
      }
      throw error;
    }
  }

  /**
   * Atualizar dados específicos
   */
  async update(
    codigoOrId: string,
    id: string,
    updateDto: IUpdateDadosBeneficioDto,
  ): Promise<IDadosBeneficio> {
    const tipo = await this.resolveTipoFromCodigoOrId(codigoOrId);
    const service = this.getService(tipo);
    return service.update(id, updateDto);
  }

  /**
   * Remover dados específicos
   */
  async remove(codigoOrId: string, id: string): Promise<void> {
    const tipo = await this.resolveTipoFromCodigoOrId(codigoOrId);
    const service = this.getService(tipo);
    return service.delete(id);
  }

  /**
   * Verificar se existem dados por solicitação
   */
  async existsBySolicitacao(
    codigoOrId: string,
    solicitacaoId: string,
  ): Promise<boolean> {
    try {
      const tipo = await this.resolveTipoFromCodigoOrId(codigoOrId);
      const service = this.getService(tipo);
      return await service.existsBySolicitacao(solicitacaoId);
    } catch (error) {
      if (error instanceof NotFoundException) {
        return false;
      }
      throw error;
    }
  }

  /**
   * Obter tipos de benefício suportados
   */
  getSupportedTypes(): string[] {
    return Array.from(this.codigoToTipoMap.keys());
  }

  /**
   * Obter metadados de um tipo específico
   */
  getTypeMetadata(codigo: string): {
    codigo: string;
    nome: string;
    descricao?: string;
  } {
    const tipo = this.codigoToTipoMap.get(codigo);
    if (!tipo) {
      throw new NotFoundException(
        `Tipo de benefício não encontrado: ${codigo}`,
      );
    }

    // Mapear tipos para metadados
    const metadataMap = {
      [TipoDadosBeneficio.ALUGUEL_SOCIAL]: {
        codigo: 'aluguel-social',
        nome: 'Aluguel Social',
        descricao: 'Auxílio para pagamento de aluguel',
      },
      [TipoDadosBeneficio.CESTA_BASICA]: {
        codigo: 'cesta-basica',
        nome: 'Cesta Básica',
        descricao: 'Auxílio alimentação',
      },
      [TipoDadosBeneficio.FUNERAL]: {
        codigo: 'funeral',
        nome: 'Auxílio Funeral',
        descricao: 'Auxílio para despesas funerárias',
      },
      [TipoDadosBeneficio.NATALIDADE]: {
        codigo: 'natalidade',
        nome: 'Auxílio Natalidade',
        descricao: 'Auxílio para nascimento de criança',
      },
    };

    return metadataMap[tipo];
  }

  /**
   * Validar dados e obter campos obrigatórios faltantes
   */
  async validateAndGetMissingFields(
    codigoOrId: string,
    data: any,
  ): Promise<{ isValid: boolean; missingFields: string[]; errors: string[] }> {
    try {
      const tipo = await this.resolveTipoFromCodigoOrId(codigoOrId);
      const service = this.getService(tipo);

      // Tentar validar os dados
      try {
        await service['validateCreateData'](data);
        return {
          isValid: true,
          missingFields: [],
          errors: [],
        };
      } catch (error) {
        // Extrair campos faltantes e erros da exceção
        const missingFields: string[] = [];
        const errors: string[] = [];

        if (error.message) {
          errors.push(error.message);
        }

        // Verificar campos obrigatórios básicos
        const requiredFields = ['solicitacao_id'];
        for (const field of requiredFields) {
          if (!data[field]) {
            missingFields.push(field);
          }
        }

        return {
          isValid: false,
          missingFields,
          errors,
        };
      }
    } catch (error) {
      return {
        isValid: false,
        missingFields: [],
        errors: [error.message || 'Erro na validação'],
      };
    }
  }

  /**
   * Obtém o schema ativo de um tipo de benefício
   *
   * @param codigoOrId ID ou código do tipo de benefício
   * @returns Schema ativo
   */
  async getSchemaAtivo(codigoOrId: string) {
    try {
      // Usar o método existente para resolver o tipo de benefício
      const tipoBeneficio = await this.resolveTipoFromCodigoOrId(codigoOrId);

      // Obter metadados do tipo para buscar o código correto no banco
      const metadata = this.getTypeMetadata(tipoBeneficio);

      // Buscar o tipo de benefício no banco pelo código
      const tipoBeneficioEntity = await this.tipoBeneficioRepository.findOne({
        where: { codigo: metadata.codigo },
      });

      if (!tipoBeneficioEntity) {
        throw new NotFoundException(
          `Tipo de benefício com código '${metadata.codigo}' não encontrado no banco de dados`,
        );
      }

      // Buscar schema ativo
      const schemaAtivo = await this.tipoBeneficioSchemaRepository.findOne({
        where: {
          tipo_beneficio_id: tipoBeneficioEntity.id,
          status: Status.ATIVO,
        },
      });

      if (!schemaAtivo) {
        throw new NotFoundException(
          `Schema ativo não encontrado para o tipo de benefício '${metadata.nome}'`,
        );
      }

      return schemaAtivo;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException(
        `Erro ao buscar schema ativo para o tipo de benefício ${codigoOrId}: ${error.message}`,
      );
    }
  }
}
