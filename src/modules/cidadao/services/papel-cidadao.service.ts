import { Injectable, Logger, NotFoundException, BadRequestException, ConflictException, InternalServerErrorException, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { PapelCidadao } from '../../../entities/papel-cidadao.entity';
import { Cidadao } from '../../../entities/cidadao.entity';
import { CreatePapelCidadaoDto } from '../dto/create-papel-cidadao.dto';
import { TipoPapel, PaperType } from '../../../enums/tipo-papel.enum';
import { CidadaoService } from './cidadao.service';
import { VerificacaoPapelService } from './verificacao-papel.service';
import { normalizeEnumFields } from '../../../shared/utils/enum-normalizer.util';

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
    @Inject(forwardRef(() => CidadaoService))
    private readonly cidadaoService: CidadaoService,
    private readonly verificacaoPapelService: VerificacaoPapelService,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Cria um novo papel para um cidadão
   * @param createPapelCidadaoDto Dados para criação do papel
   * @returns Papel criado
   */
  async create(createPapelCidadaoDto: CreatePapelCidadaoDto): Promise<PapelCidadao> {
    // Verificar se o cidadão existe
    const cidadaoExistente = await this.cidadaoService.findById(createPapelCidadaoDto.cidadao_id, false);
    if (!cidadaoExistente) {
      throw new NotFoundException('Cidadão não encontrado');
    }

    // Verificar se já existe um papel ativo para este cidadão
    const papelExistente = await this.papelCidadaoRepository.findOne({
      where: {
        cidadao_id: createPapelCidadaoDto.cidadao_id,
        tipo_papel: createPapelCidadaoDto.tipo_papel,
        ativo: true,
      },
    });

    if (papelExistente) {
      throw new ConflictException('Cidadão já possui este papel ativo');
    }

    return this.dataSource.transaction(async (manager) => {
      // Buscar o cidadão novamente dentro da transação
      const cidadaoNaTransacao = await manager.findOne(Cidadao, {
        where: { id: createPapelCidadaoDto.cidadao_id },
      });

      if (!cidadaoNaTransacao) {
        throw new NotFoundException('Cidadão não encontrado');
      }

      // Validar metadados específicos do tipo de papel
      this.validarMetadados(createPapelCidadaoDto.tipo_papel, createPapelCidadaoDto.metadados);

      // Normalizar campos de enum antes de criar
      const dadosNormalizados = normalizeEnumFields({
        cidadao_id: createPapelCidadaoDto.cidadao_id,
        tipo_papel: createPapelCidadaoDto.tipo_papel,
        metadados: createPapelCidadaoDto.metadados,
        ativo: true,
      });

      const papel = manager.create(PapelCidadao, dadosNormalizados);

      const savedPapel = await manager.save(papel);

      return savedPapel;
    });
  }

  /**
   * Cria múltiplos papéis para um cidadão
   * @param cidadaoId ID do cidadão
   * @param papeis Lista de papéis a serem criados
   * @returns Lista de papéis criados
   * @throws NotFoundException se o cidadão não for encontrado
   * @throws ConflictException se houver conflito de papéis
   * @throws BadRequestException se os dados forem inválidos
   */
  async createMany(cidadaoId: string, papeis: Omit<CreatePapelCidadaoDto, 'cidadao_id'>[]): Promise<PapelCidadao[]> {
    this.logger.log(`Criando ${papeis.length} papéis para cidadão ${cidadaoId}`);

    if (!papeis || papeis.length === 0) {
      throw new BadRequestException('Lista de papéis não pode estar vazia');
    }

    return this.dataSource.transaction(async (manager) => {
      // Verificar se o cidadão existe
      const cidadao = await this.cidadaoService.findById(cidadaoId, false);
      if (!cidadao) {
        throw new NotFoundException('Cidadão não encontrado');
      }

      const papeisParaCriar = papeis.map(papel => ({
        ...papel,
        cidadao_id: cidadaoId,
      }));

      // Verificar papéis duplicados na lista
      const tiposPapeis = papeisParaCriar.map(p => p.tipo_papel);
      const tiposUnicos = new Set(tiposPapeis);
      if (tiposUnicos.size !== tiposPapeis.length) {
        throw new BadRequestException('Lista contém papéis duplicados');
      }

      // Buscar CPF do cidadão uma única vez para verificar conflitos
      const cidadaoParaConflito = await manager.findOne(Cidadao, {
        where: { id: cidadaoId },
      });

      if (!cidadaoParaConflito) {
        throw new NotFoundException('Cidadão não encontrado');
      }

      // Verificar conflitos para cada papel
      for (const papel of papeisParaCriar) {
        // Verificar se já possui o papel
        const papelExistente = await manager.findOne(PapelCidadao, {
          where: {
            cidadao_id: cidadaoId,
            tipo_papel: papel.tipo_papel,
            ativo: true,
          },
        });

        if (papelExistente) {
          throw new ConflictException(`Cidadão já possui o papel ${papel.tipo_papel} ativo`);
        }

        const conflitos = await this.verificacaoPapelService.verificarConflitoPapeis(
          cidadaoParaConflito.cpf,
        );

        if (conflitos.temConflito) {
          throw new ConflictException(`Conflito de papel detectado para ${papel.tipo_papel}: ${conflitos.detalhes}`);
        }

        // Validar metadados
        this.validarMetadados(papel.tipo_papel, papel.metadados);
      }

      // Normalizar campos de enum antes de criar as entidades
      const papeisNormalizados = papeisParaCriar.map(papel => 
        normalizeEnumFields({
          ...papel,
          ativo: true,
        })
      );

      const papeisEntities = manager.create(PapelCidadao, papeisNormalizados);
      return manager.save(papeisEntities);
    });
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
    tipoPapel: PaperType,
  ): Promise<boolean> {
    const papel = await this.papelCidadaoRepository.findOne({
      where: {
        cidadao_id: cidadaoId,
        tipo_papel: tipoPapel,
        ativo: true,
      },
    });

    return !!papel;
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
    tipoPapel: PaperType,
    options: {
      page?: number;
      limit?: number;
      includeInactive?: boolean;
    } = {},
  ): Promise<{
    data: Array<{
      cidadao: Cidadao;
      papel: PapelCidadao;
    }>;
    total: number;
    page: number;
    limit: number;
  }> {
    const { page = 1, limit = 10, includeInactive = false } = options;
    const skip = (page - 1) * limit;

    const whereCondition: any = {
      tipo_papel: tipoPapel,
    };

    if (!includeInactive) {
      whereCondition.ativo = true;
    }

    const [papeis, total] = await this.papelCidadaoRepository.findAndCount({
      where: whereCondition,
      relations: ['cidadao'],
      skip,
      take: limit,
      order: {
        created_at: 'DESC',
      },
    });

    const data = papeis.map((papel) => ({
      cidadao: papel.cidadao,
      papel,
    }));

    return {
      data,
      total,
      page,
      limit,
    };
  }

  /**
   * Cria um novo papel para um cidadão (alias para o método create)
   * @param createPapelCidadaoDto Dados do papel a ser criado
   * @returns Papel criado
   */
  async criarPapel(
createPapelCidadaoDto: CreatePapelCidadaoDto, usuarioId: string, manager: unknown,
  ): Promise<PapelCidadao> {
    return this.create(createPapelCidadaoDto);
  }

  /**
   * Inativa um papel de cidadão (alias para o método desativar)
   * @param papelId ID do papel a ser inativado
   * @returns Papel inativado
   */
  async inativarPapel(papelId: string): Promise<PapelCidadao> {
    return this.desativar(papelId);
  }

  /**
   * Atualiza os papéis de um cidadão
   * @param cidadaoId ID do cidadão
   * @param updatePapeisDto Dados para atualização dos papéis
   * @returns Papéis atualizados
   */
  async updatePapeis(
    cidadaoId: string,
    updatePapeisDto: { papeis: CreatePapelCidadaoDto[] },
  ): Promise<PapelCidadao[]> {
    return await this.dataSource.transaction(async (manager) => {
      // Verificar se o cidadão existe
      const cidadaoExistente = await manager.findOne(Cidadao, {
        where: { id: cidadaoId },
      });

      if (!cidadaoExistente) {
        throw new NotFoundException('Cidadão não encontrado');
      }

      // Buscar papéis ativos atuais
      const papeisAtuais = await manager.find(PapelCidadao, {
        where: {
          cidadao_id: cidadaoId,
          ativo: true,
        },
      });

      // Desativar todos os papéis atuais
      for (const papel of papeisAtuais) {
        papel.ativo = false;
        papel.updated_at = new Date();
        await manager.save(papel);
      }

      // Criar novos papéis
      const papeisParaCriar = updatePapeisDto.papeis.map((papelDto: any) => {
        // Validar metadados específicos do tipo de papel
        this.validarMetadados(papelDto.tipo_papel, papelDto.metadados);
        
        return {
          cidadao_id: cidadaoId,
          tipo_papel: papelDto.tipo_papel,
          metadados: papelDto.metadados,
          ativo: true,
        };
      });

      const papeisEntities = manager.create(PapelCidadao, papeisParaCriar);
      const novosPapeis = await manager.save(papeisEntities);

      return novosPapeis;
    });
  }

  /**
   * Valida os metadados específicos de cada tipo de papel
   * @param tipoPapel - Tipo do papel a ser validado
   * @param metadados - Metadados a serem validados
   * @throws BadRequestException se os metadados forem inválidos
   */
  private validarMetadados(tipoPapel: PaperType, metadados?: any): void {
    if (!metadados) {
      metadados = {};
    }

    switch (tipoPapel) {
      case 'representante_legal':
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

      case 'requerente':
        if (!metadados.grau_parentesco) {
          throw new BadRequestException(
            'Grau de parentesco é obrigatório para requerentes',
          );
        }
        break;

      case 'beneficiario':
        // Não há metadados obrigatórios para beneficiários
        break;

      default:
        break;
    }
  }
}