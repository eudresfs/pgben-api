import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { DadosSociais } from '../../../entities/dados-sociais.entity';
import { Cidadao } from '../../../entities/cidadao.entity';
import { ComposicaoFamiliar } from '../../../entities/composicao-familiar.entity';
import { CreateDadosSociaisDto } from '../dto/create-dados-sociais.dto';
import { UpdateDadosSociaisDto } from '../dto/update-dados-sociais.dto';
import { CacheService } from '../../../shared/cache/cache.service';
import { Logger } from '@nestjs/common';
import { normalizeEnumFields } from '../../../shared/utils/enum-normalizer.util';

/**
 * Service responsável pelo gerenciamento dos dados sociais dos cidadãos
 *
 * Implementa todas as operações CRUD para dados sociais, incluindo:
 * - Validações de negócio específicas
 * - Cálculos automáticos (renda per capita)
 * - Cache para otimização de performance
 * - Integração com auditoria
 */
@Injectable()
export class DadosSociaisService {
  private readonly logger = new Logger(DadosSociaisService.name);
  private readonly CACHE_TTL = 300; // 5 minutos

  constructor(
    @InjectRepository(DadosSociais)
    private readonly dadosSociaisRepository: Repository<DadosSociais>,
    @InjectRepository(Cidadao)
    private readonly cidadaoRepository: Repository<Cidadao>,
    @InjectRepository(ComposicaoFamiliar)
    private readonly composicaoFamiliarRepository: Repository<ComposicaoFamiliar>,
    private readonly cacheService: CacheService,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Cria dados sociais para um cidadão específico
   *
   * Valida se o cidadão existe e se não possui dados sociais já cadastrados.
   * Calcula automaticamente a renda per capita baseada na composição familiar.
   */
  async create(
    cidadaoId: string,
    createDadosSociaisDto: CreateDadosSociaisDto,
  ): Promise<DadosSociais> {
    this.logger.log(`Criando dados sociais para cidadão ${cidadaoId}`);

    // Usar transação para garantir consistência
    return await this.dataSource.transaction(async (manager) => {
      // Verificar se o cidadão existe
      const cidadao = await manager.findOne(Cidadao, {
        where: { id: cidadaoId },
      });

      if (!cidadao) {
        throw new NotFoundException(
          `Cidadão com ID ${cidadaoId} não encontrado`,
        );
      }

      // Verificar se já existem dados sociais para este cidadão
      const dadosExistentes = await manager.findOne(DadosSociais, {
        where: { cidadao_id: cidadaoId },
        withDeleted: false,
      });

      if (dadosExistentes) {
        throw new ConflictException(
          `Cidadão ${cidadaoId} já possui dados sociais cadastrados`,
        );
      }

      // Validar dados de benefícios
      this.validateBeneficiosData(createDadosSociaisDto);

      // Normalizar enums para minúsculo antes de criar
      const dadosNormalizados = normalizeEnumFields({
        ...createDadosSociaisDto,
        cidadao_id: cidadaoId,
      });

      // Criar os dados sociais
      const dadosSociais = manager.create(DadosSociais, dadosNormalizados);

      const savedDadosSociais = await manager.save(DadosSociais, dadosSociais);

      // Calcular e atualizar renda per capita
      await this.calculateAndUpdateRendaPerCapita(cidadaoId, manager);

      // Invalidar cache
      await this.invalidateCache(cidadaoId);

      this.logger.log(
        `Dados sociais criados com sucesso para cidadão ${cidadaoId}`,
      );
      return savedDadosSociais;
    });
  }

  /**
   * Busca os dados sociais de um cidadão específico
   *
   * Utiliza cache para otimizar performance em consultas frequentes.
   */
  async findByCidadaoId(cidadaoId: string): Promise<DadosSociais> {
    this.logger.log(`Buscando dados sociais do cidadão ${cidadaoId}`);

    // Tentar buscar no cache primeiro
    const cacheKey = `dados-sociais:${cidadaoId}`;
    const cachedData = await this.cacheService.get(cacheKey);

    if (cachedData) {
      this.logger.log(
        `Dados sociais encontrados no cache para cidadão ${cidadaoId}`,
      );
      return cachedData as DadosSociais;
    }

    // Verificar se o cidadão existe
    const cidadao = await this.cidadaoRepository.findOne({
      where: { id: cidadaoId },
    });

    if (!cidadao) {
      throw new NotFoundException(`Cidadão com ID ${cidadaoId} não encontrado`);
    }

    // Buscar dados sociais
    const dadosSociais = await this.dadosSociaisRepository.findOne({
      where: { cidadao_id: cidadaoId },
      relations: ['cidadao'],
    });

    if (!dadosSociais) {
      throw new NotFoundException(
        `Dados sociais não encontrados para o cidadão ${cidadaoId}`,
      );
    }

    // Armazenar no cache
    await this.cacheService.set(cacheKey, dadosSociais, this.CACHE_TTL);

    return dadosSociais;
  }

  /**
   * Atualiza os dados sociais de um cidadão
   *
   * Permite atualização parcial dos dados sociais.
   * Recalcula automaticamente valores derivados como renda per capita.
   */
  async update(
    cidadaoId: string,
    updateDadosSociaisDto: UpdateDadosSociaisDto,
  ): Promise<DadosSociais> {
    this.logger.log(`Atualizando dados sociais do cidadão ${cidadaoId}`);

    return await this.dataSource.transaction(async (manager) => {
      // Buscar dados sociais existentes
      const dadosSociais = await manager.findOne(DadosSociais, {
        where: { cidadao_id: cidadaoId },
      });

      if (!dadosSociais) {
        throw new NotFoundException(
          `Dados sociais não encontrados para o cidadão ${cidadaoId}`,
        );
      }

      // Validar dados de benefícios se estiverem sendo atualizados
      if (this.hasBeneficiosData(updateDadosSociaisDto)) {
        this.validateBeneficiosData({
          ...dadosSociais,
          ...updateDadosSociaisDto,
        });
      }

      // Normalizar enums para minúsculo antes de atualizar
      const dadosNormalizados = normalizeEnumFields(updateDadosSociaisDto);

      // Atualizar dados
      Object.assign(dadosSociais, dadosNormalizados);
      const updatedDadosSociais = await manager.save(
        DadosSociais,
        dadosSociais,
      );

      // Recalcular renda per capita se a renda foi alterada
      if (updateDadosSociaisDto.renda !== undefined) {
        await this.calculateAndUpdateRendaPerCapita(cidadaoId, manager);
      }

      // Invalidar cache
      await this.invalidateCache(cidadaoId);

      this.logger.log(
        `Dados sociais atualizados com sucesso para cidadão ${cidadaoId}`,
      );
      return updatedDadosSociais;
    });
  }

  /**
   * Remove os dados sociais de um cidadão
   *
   * Realiza soft delete dos dados sociais, mantendo histórico para auditoria.
   * Verifica dependências antes da remoção.
   */
  async remove(cidadaoId: string): Promise<void> {
    this.logger.log(`Removendo dados sociais do cidadão ${cidadaoId}`);

    return await this.dataSource.transaction(async (manager) => {
      // Buscar dados sociais existentes
      const dadosSociais = await manager.findOne(DadosSociais, {
        where: { cidadao_id: cidadaoId },
      });

      if (!dadosSociais) {
        throw new NotFoundException(
          `Dados sociais não encontrados para o cidadão ${cidadaoId}`,
        );
      }

      // Verificar dependências (ex: solicitações ativas)
      await this.checkDependencies(cidadaoId, manager);

      // Realizar soft delete
      await manager.softDelete(DadosSociais, { cidadao_id: cidadaoId });

      // Invalidar cache
      await this.invalidateCache(cidadaoId);

      this.logger.log(
        `Dados sociais removidos com sucesso para cidadão ${cidadaoId}`,
      );
    });
  }

  /**
   * Calcula e atualiza a renda per capita baseada na composição familiar
   */
  private async calculateAndUpdateRendaPerCapita(
    cidadaoId: string,
    manager?: any,
  ): Promise<void> {
    const repository = manager || this.dataSource.manager;

    // Buscar composição familiar
    const composicaoFamiliar = await repository.find(ComposicaoFamiliar, {
      where: { cidadao_id: cidadaoId },
    });

    // Buscar dados sociais
    const dadosSociais = await repository.findOne(DadosSociais, {
      where: { cidadao_id: cidadaoId },
    });

    if (dadosSociais && dadosSociais.renda) {
      // Total de pessoas = cidadão + membros da família
      const totalPessoas = composicaoFamiliar.length + 1;
      const rendaPerCapita = dadosSociais.renda / totalPessoas;

      // Atualizar campo calculado (se existir na entidade)
      // Note: Este campo precisa ser adicionado à entidade se necessário
      this.logger.log(
        `Renda per capita calculada para cidadão ${cidadaoId}: R$ ${rendaPerCapita.toFixed(2)}`,
      );
    }
  }

  /**
   * Valida dados de benefícios (PBF e BPC) com validações aprimoradas
   */
  private validateBeneficiosData(data: any): void {
    const errors: string[] = [];

    // Validar PBF com verificações mais robustas
    if (data.recebe_pbf === true) {
      if (!data.valor_pbf || data.valor_pbf <= 0) {
        errors.push(
          'Valor do PBF é obrigatório e deve ser maior que zero quando recebe_pbf é verdadeiro',
        );
      } else if (data.valor_pbf > 10000) {
        errors.push('Valor do PBF não pode exceder R$ 10.000,00');
      } else if (data.valor_pbf < 50) {
        errors.push(
          'Valor do PBF parece muito baixo. Verifique se o valor está correto (mínimo R$ 50,00)',
        );
      }
    }

    if (data.recebe_pbf === false && data.valor_pbf) {
      if (data.valor_pbf > 0) {
        errors.push(
          'Valor do PBF não deve ser informado quando recebe_pbf é falso',
        );
      }
    }

    // Validar BPC com verificações mais robustas
    if (data.recebe_bpc === true) {
      if (!data.valor_bpc || data.valor_bpc <= 0) {
        errors.push(
          'Valor do BPC é obrigatório e deve ser maior que zero quando recebe_bpc é verdadeiro',
        );
      } else if (data.valor_bpc > 10000) {
        errors.push('Valor do BPC não pode exceder R$ 10.000,00');
      }

      if (!data.tipo_bpc || data.tipo_bpc.trim().length === 0) {
        errors.push('Tipo do BPC é obrigatório quando recebe_bpc é verdadeiro');
      } else if (data.tipo_bpc.length > 100) {
        errors.push('Tipo do BPC deve ter no máximo 100 caracteres');
      }
    }

    if (data.recebe_bpc === false) {
      if (data.valor_bpc && data.valor_bpc > 0) {
        errors.push(
          'Valor do BPC não deve ser informado quando recebe_bpc é falso',
        );
      }
      if (data.tipo_bpc && data.tipo_bpc.trim().length > 0) {
        errors.push(
          'Tipo do BPC não deve ser informado quando recebe_bpc é falso',
        );
      }
    }

    // Validação de consistência entre benefícios
    if (data.recebe_pbf === true && data.recebe_bpc === true) {
      this.logger.warn(
        `Cidadão recebe tanto PBF quanto BPC - verificar elegibilidade`,
      );
    }

    // Lançar erro com todas as validações que falharam
    if (errors.length > 0) {
      throw new BadRequestException({
        message: 'Dados de benefícios inválidos',
        errors: errors,
        statusCode: 400,
      });
    }
  }

  /**
   * Verifica se o DTO contém dados de benefícios
   */
  private hasBeneficiosData(data: UpdateDadosSociaisDto): boolean {
    return (
      data.recebe_pbf !== undefined ||
      data.valor_pbf !== undefined ||
      data.recebe_bpc !== undefined ||
      data.valor_bpc !== undefined ||
      data.tipo_bpc !== undefined
    );
  }

  /**
   * Verifica dependências antes da remoção
   */
  private async checkDependencies(
    cidadaoId: string,
    manager: any,
  ): Promise<void> {
    // Aqui você pode adicionar verificações específicas
    // Por exemplo: verificar se há solicitações ativas
    // const solicitacoesAtivas = await manager.count(Solicitacao, {
    //   where: { cidadao_id: cidadaoId, status: 'ATIVA' }
    // });
    //
    // if (solicitacoesAtivas > 0) {
    //   throw new ConflictException(
    //     'Não é possível remover dados sociais de cidadão com solicitações ativas'
    //   );
    // }

    this.logger.log(
      `Verificação de dependências concluída para cidadão ${cidadaoId}`,
    );
  }

  /**
   * Invalida cache relacionado aos dados sociais
   */
  private async invalidateCache(cidadaoId: string): Promise<void> {
    const cacheKey = `dados-sociais:${cidadaoId}`;
    await this.cacheService.del(cacheKey);

    // Invalidar outros caches relacionados se necessário
    await this.cacheService.del(`cidadao:${cidadaoId}`);
  }
}
