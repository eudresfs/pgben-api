import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PapelCidadao, TipoPapel } from '../entities/papel-cidadao.entity';
import { Cidadao } from '../entities/cidadao.entity';
import { CreatePapelCidadaoDto } from '../dto/create-papel-cidadao.dto';

/**
 * Serviço de Papéis de Cidadão
 *
 * Responsável pela lógica de negócio relacionada aos papéis que os cidadãos
 * podem assumir no sistema (beneficiário, requerente, representante legal).
 */
@Injectable()
export class PapelCidadaoService {
  private readonly logger = new Logger(PapelCidadaoService.name);

  constructor(
    @InjectRepository(PapelCidadao)
    private readonly papelCidadaoRepository: Repository<PapelCidadao>,
    @InjectRepository(Cidadao)
    private readonly cidadaoRepository: Repository<Cidadao>,
  ) {}

  /**
   * Cria um novo papel para um cidadão
   * @param createPapelCidadaoDto Dados do papel a ser criado
   * @returns Papel criado
   */
  async create(
    createPapelCidadaoDto: CreatePapelCidadaoDto,
  ): Promise<PapelCidadao> {
    try {
      // Verificar se o cidadão existe
      const cidadao = await this.cidadaoRepository.findOne({
        where: { id: createPapelCidadaoDto.cidadao_id },
      });

      if (!cidadao) {
        throw new NotFoundException(
          `Cidadão com ID ${createPapelCidadaoDto.cidadao_id} não encontrado`,
        );
      }

      // Verificar se o cidadão já possui este papel
      const papelExistente = await this.papelCidadaoRepository.findOne({
        where: {
          cidadao_id: createPapelCidadaoDto.cidadao_id,
          tipo_papel: createPapelCidadaoDto.tipo_papel,
        },
      });

      if (papelExistente) {
        throw new ConflictException(
          `Cidadão já possui o papel ${createPapelCidadaoDto.tipo_papel}`,
        );
      }

      // Validar metadados específicos do papel
      this.validarMetadados(
        createPapelCidadaoDto.tipo_papel,
        createPapelCidadaoDto.metadados,
      );

      // Criar o papel
      const novoPapel = this.papelCidadaoRepository.create({
        cidadao_id: createPapelCidadaoDto.cidadao_id,
        tipo_papel: createPapelCidadaoDto.tipo_papel,
        metadados: createPapelCidadaoDto.metadados || {},
        ativo: true,
      });

      return this.papelCidadaoRepository.save(novoPapel);
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof ConflictException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }

      this.logger.error(
        `Erro ao criar papel para cidadão: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException(
        'Erro ao criar papel para cidadão',
      );
    }
  }

  /**
   * Cria múltiplos papéis para um cidadão
   * @param cidadaoId ID do cidadão
   * @param papeis Lista de papéis a serem criados
   * @returns Lista de papéis criados
   */
  async createMany(
    cidadaoId: string,
    papeis: { tipo_papel: TipoPapel; metadados?: any }[],
  ): Promise<PapelCidadao[]> {
    try {
      const papeisPromises = papeis.map((papel) =>
        this.create({
          cidadao_id: cidadaoId,
          tipo_papel: papel.tipo_papel,
          metadados: papel.metadados,
        }),
      );

      return Promise.all(papeisPromises);
    } catch (error) {
      this.logger.error(
        `Erro ao criar múltiplos papéis para cidadão: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Busca todos os papéis de um cidadão
   * @param cidadaoId ID do cidadão
   * @returns Lista de papéis do cidadão
   */
  async findByCidadaoId(cidadaoId: string): Promise<PapelCidadao[]> {
    try {
      return this.papelCidadaoRepository.find({
        where: { cidadao_id: cidadaoId, ativo: true },
      });
    } catch (error) {
      this.logger.error(
        `Erro ao buscar papéis do cidadão: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException(
        'Erro ao buscar papéis do cidadão',
      );
    }
  }

  /**
   * Verifica se um cidadão possui um determinado papel
   * @param cidadaoId ID do cidadão
   * @param tipoPapel Tipo de papel a verificar
   * @returns true se o cidadão possui o papel, false caso contrário
   */
  async verificarPapel(
    cidadaoId: string,
    tipoPapel: TipoPapel,
  ): Promise<boolean> {
    try {
      const papel = await this.papelCidadaoRepository.findOne({
        where: { cidadao_id: cidadaoId, tipo_papel: tipoPapel, ativo: true },
      });

      return !!papel;
    } catch (error) {
      this.logger.error(
        `Erro ao verificar papel do cidadão: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException(
        'Erro ao verificar papel do cidadão',
      );
    }
  }

  /**
   * Desativa um papel de um cidadão
   * @param id ID do papel a ser desativado
   * @returns Papel desativado
   */
  async desativar(id: string): Promise<PapelCidadao> {
    try {
      const papel = await this.papelCidadaoRepository.findOne({
        where: { id },
      });

      if (!papel) {
        throw new NotFoundException(`Papel com ID ${id} não encontrado`);
      }

      papel.ativo = false;
      return this.papelCidadaoRepository.save(papel);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }

      this.logger.error(
        `Erro ao desativar papel: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException('Erro ao desativar papel');
    }
  }

  /**
   * Busca cidadãos por tipo de papel
   * @param tipoPapel Tipo de papel a buscar
   * @param options Opções de filtro e paginação
   * @returns Lista de cidadãos com o papel especificado
   */
  async findCidadaosByTipoPapel(
    tipoPapel: TipoPapel,
    options?: {
      page?: number;
      limit?: number;
      search?: string;
    },
  ): Promise<{ items: Cidadao[]; total: number }> {
    const { page = 1, limit = 10, search } = options || {};
    const skip = (page - 1) * limit;

    try {
      const query = this.papelCidadaoRepository
        .createQueryBuilder('papel')
        .innerJoinAndSelect('papel.cidadao', 'cidadao')
        .where('papel.tipo_papel = :tipoPapel', { tipoPapel })
        .andWhere('papel.ativo = true');

      if (search) {
        query.andWhere(
          '(cidadao.nome ILIKE :search OR cidadao.cpf ILIKE :search)',
          {
            search: `%${search}%`,
          },
        );
      }

      const [papeis, total] = await query
        .skip(skip)
        .take(limit)
        .getManyAndCount();

      const cidadaos = papeis.map((papel) => papel.cidadao);

      return { items: cidadaos, total };
    } catch (error) {
      this.logger.error(
        `Erro ao buscar cidadãos por tipo de papel: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException(
        'Erro ao buscar cidadãos por tipo de papel',
      );
    }
  }

  /**
   * Valida os metadados específicos de cada tipo de papel
   * @param tipoPapel Tipo de papel
   * @param metadados Metadados a serem validados
   * @throws BadRequestException se os metadados forem inválidos
   */
  private validarMetadados(tipoPapel: TipoPapel, metadados?: any): void {
    if (!metadados) {
      metadados = {};
    }

    switch (tipoPapel) {
      case TipoPapel.REPRESENTANTE_LEGAL:
        if (!metadados.documento_representacao) {
          throw new BadRequestException(
            'Documento de representação é obrigatório para representantes legais',
          );
        }
        if (!metadados.data_validade_representacao) {
          throw new BadRequestException(
            'Data de validade da representação é obrigatória para representantes legais',
          );
        }
        break;

      case TipoPapel.REQUERENTE:
        if (!metadados.grau_parentesco) {
          throw new BadRequestException(
            'Grau de parentesco é obrigatório para requerentes',
          );
        }
        break;

      case TipoPapel.BENEFICIARIO:
        // Não há metadados obrigatórios para beneficiários
        break;

      default:
        break;
    }
  }
}
