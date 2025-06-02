import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ConflictException,
  InternalServerErrorException,
} from '@nestjs/common';
import { InfoBancariaRepository } from '../repositories/info-bancaria.repository';
import { CidadaoService } from './cidadao.service';
import { CreateInfoBancariaDto } from '../dto/create-info-bancaria.dto';
import { UpdateInfoBancariaDto } from '../dto/update-info-bancaria.dto';
import { InfoBancariaResponseDto } from '../dto/info-bancaria-response.dto';
import { InfoBancaria,  } from '../../../entities/info-bancaria.entity';
import { TipoChavePix } from '../../../enums/info-bancaria.enum';
import { normalizeEnumFields } from '../../../shared/utils/enum-normalizer.util';
/**
 * Service para gerenciamento de informações bancárias
 * 
 * Responsável pela lógica de negócio relacionada às informações bancárias dos cidadãos,
 * incluindo validações específicas para contas poupança social do Banco do Brasil
 * e chaves PIX.
 */
@Injectable()
export class InfoBancariaService {
  private readonly logger = new Logger(InfoBancariaService.name);

  constructor(
    private readonly infoBancariaRepository: InfoBancariaRepository,
    private readonly cidadaoService: CidadaoService,
  ) {}

  /**
   * Cria uma nova informação bancária
   * @param createInfoBancariaDto Dados para criação
   * @returns Informação bancária criada
   */
  async create(createInfoBancariaDto: CreateInfoBancariaDto): Promise<InfoBancariaResponseDto> {
    try {
      this.logger.log(`Criando informação bancária para cidadão ${createInfoBancariaDto.cidadao_id}`);

      // Verifica se o cidadão existe
      const cidadao = await this.cidadaoService.findById(createInfoBancariaDto.cidadao_id);
      if (!cidadao) {
        throw new NotFoundException('Cidadão não encontrado');
      }

      // Verifica se já existe informação bancária ativa para o cidadão
      const existingInfo = await this.infoBancariaRepository.existsActiveByCidadaoId(
        createInfoBancariaDto.cidadao_id
      );
      if (existingInfo) {
        throw new ConflictException('Cidadão já possui informação bancária ativa');
      }

      // Valida chave PIX se fornecida
      if (createInfoBancariaDto.chave_pix) {
        await this.validateChavePix(
          createInfoBancariaDto.chave_pix,
          createInfoBancariaDto.tipo_chave_pix
        );

        // Verifica se a chave PIX já está em uso
        const pixExists = await this.infoBancariaRepository.existsByChavePix(
          createInfoBancariaDto.chave_pix
        );
        if (pixExists) {
          throw new ConflictException('Chave PIX já está em uso');
        }
      }

      // Valida dados específicos do Banco do Brasil se aplicável
      if (createInfoBancariaDto.banco === '001') {
        this.validateBancoBrasil(createInfoBancariaDto);
      }

      const dadosNormalizados = normalizeEnumFields(createInfoBancariaDto);
      const infoBancaria = await this.infoBancariaRepository.create(dadosNormalizados);
      
      this.logger.log(`Informação bancária criada com sucesso: ${infoBancaria.id}`);
      return this.mapToResponseDto(infoBancaria);
    } catch (error) {
      this.logger.error(`Erro ao criar informação bancária: ${error.message}`, error.stack);
      if (error instanceof NotFoundException || 
          error instanceof ConflictException || 
          error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException('Erro interno ao criar informação bancária');
    }
  }

  /**
   * Busca todas as informações bancárias com filtros
   * @param options Opções de filtro e paginação
   * @returns Lista paginada de informações bancárias
   */
  async findAll(options?: {
    skip?: number;
    take?: number;
    cidadao_id?: string;
    banco?: string;
    ativo?: boolean;
    includeRelations?: boolean;
  }): Promise<{ data: InfoBancariaResponseDto[]; total: number }> {
    try {
      const [infosBancarias, total] = await this.infoBancariaRepository.findAll({
        skip: options?.skip,
        take: options?.take,
        where: {
          cidadao_id: options?.cidadao_id,
          banco: options?.banco,
          ativo: options?.ativo,
        },
        includeRelations: options?.includeRelations,
      });

      return {
        data: infosBancarias.map(info => this.mapToResponseDto(info)),
        total,
      };
    } catch (error) {
      this.logger.error(`Erro ao buscar informações bancárias: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Erro interno ao buscar informações bancárias');
    }
  }

  /**
   * Busca informação bancária por ID
   * @param id ID da informação bancária
   * @param includeRelations Se deve incluir relações
   * @returns Informação bancária encontrada
   */
  async findById(id: string, includeRelations = false): Promise<InfoBancariaResponseDto> {
    try {
      const infoBancaria = await this.infoBancariaRepository.findById(id, includeRelations);
      if (!infoBancaria) {
        throw new NotFoundException('Informação bancária não encontrada');
      }
      return this.mapToResponseDto(infoBancaria);
    } catch (error) {
      this.logger.error(`Erro ao buscar informação bancária ${id}: ${error.message}`, error.stack);
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException('Erro interno ao buscar informação bancária');
    }
  }

  /**
   * Busca informação bancária por ID do cidadão
   * @param cidadaoId ID do cidadão
   * @param includeRelations Se deve incluir relações
   * @returns Informação bancária do cidadão
   */
  async findByCidadaoId(cidadaoId: string, includeRelations = false): Promise<InfoBancariaResponseDto | null> {
    try {
      const infoBancaria = await this.infoBancariaRepository.findByCidadaoId(cidadaoId, includeRelations);
      return infoBancaria ? this.mapToResponseDto(infoBancaria) : null;
    } catch (error) {
      this.logger.error(`Erro ao buscar informação bancária do cidadão ${cidadaoId}: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Erro interno ao buscar informação bancária do cidadão');
    }
  }

  /**
   * Atualiza informação bancária
   * @param id ID da informação bancária
   * @param updateInfoBancariaDto Dados para atualização
   * @returns Informação bancária atualizada
   */
  async update(id: string, updateInfoBancariaDto: UpdateInfoBancariaDto): Promise<InfoBancariaResponseDto> {
    try {
      this.logger.log(`Atualizando informação bancária ${id}`);

      // Verifica se a informação bancária existe
      const existingInfo = await this.infoBancariaRepository.findById(id);
      if (!existingInfo) {
        throw new NotFoundException('Informação bancária não encontrada');
      }

      // Valida chave PIX se fornecida
      if (updateInfoBancariaDto.chave_pix) {
        await this.validateChavePix(
          updateInfoBancariaDto.chave_pix,
          updateInfoBancariaDto.tipo_chave_pix
        );

        // Verifica se a chave PIX já está em uso (excluindo a atual)
        const pixExists = await this.infoBancariaRepository.existsByChavePix(
          updateInfoBancariaDto.chave_pix,
          id
        );
        if (pixExists) {
          throw new ConflictException('Chave PIX já está em uso');
        }
      }

      // Valida dados específicos do Banco do Brasil se aplicável
      if (updateInfoBancariaDto.banco === '001') {
        this.validateBancoBrasil(updateInfoBancariaDto);
      }

      const dadosNormalizados = normalizeEnumFields(updateInfoBancariaDto);
      const updatedInfo = await this.infoBancariaRepository.update(id, dadosNormalizados);
      if (!updatedInfo) {
        throw new NotFoundException('Informação bancária não encontrada após atualização');
      }

      this.logger.log(`Informação bancária ${id} atualizada com sucesso`);
      return this.mapToResponseDto(updatedInfo);
    } catch (error) {
      this.logger.error(`Erro ao atualizar informação bancária ${id}: ${error.message}`, error.stack);
      if (error instanceof NotFoundException || 
          error instanceof ConflictException || 
          error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException('Erro interno ao atualizar informação bancária');
    }
  }

  /**
   * Remove informação bancária (soft delete)
   * @param id ID da informação bancária
   */
  async remove(id: string): Promise<void> {
    try {
      this.logger.log(`Removendo informação bancária ${id}`);

      const exists = await this.infoBancariaRepository.findById(id);
      if (!exists) {
        throw new NotFoundException('Informação bancária não encontrada');
      }

      const removed = await this.infoBancariaRepository.remove(id);
      if (!removed) {
        throw new InternalServerErrorException('Falha ao remover informação bancária');
      }

      this.logger.log(`Informação bancária ${id} removida com sucesso`);
    } catch (error) {
      this.logger.error(`Erro ao remover informação bancária ${id}: ${error.message}`, error.stack);
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException('Erro interno ao remover informação bancária');
    }
  }

  /**
   * Desativa informação bancária
   * @param id ID da informação bancária
   * @returns Informação bancária desativada
   */
  async deactivate(id: string): Promise<InfoBancariaResponseDto> {
    try {
      this.logger.log(`Desativando informação bancária ${id}`);

      const deactivated = await this.infoBancariaRepository.deactivate(id);
      if (!deactivated) {
        throw new NotFoundException('Informação bancária não encontrada');
      }

      this.logger.log(`Informação bancária ${id} desativada com sucesso`);
      return this.mapToResponseDto(deactivated);
    } catch (error) {
      this.logger.error(`Erro ao desativar informação bancária ${id}: ${error.message}`, error.stack);
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException('Erro interno ao desativar informação bancária');
    }
  }

  /**
   * Valida chave PIX
   * @param chavePix Chave PIX
   * @param tipoChave Tipo da chave PIX
   */
  private async validateChavePix(chavePix: string, tipoChave?: TipoChavePix): Promise<void> {
    if (!tipoChave) {
      throw new BadRequestException('Tipo de chave PIX é obrigatório quando chave PIX é fornecida');
    }

    switch (tipoChave) {
      case TipoChavePix.CPF:
        if (!/^\d{11}$/.test(chavePix)) {
          throw new BadRequestException('Chave PIX CPF deve conter 11 dígitos');
        }
        break;
      case TipoChavePix.CNPJ:
        if (!/^\d{14}$/.test(chavePix)) {
          throw new BadRequestException('Chave PIX CNPJ deve conter 14 dígitos');
        }
        break;
      case TipoChavePix.EMAIL:
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(chavePix)) {
          throw new BadRequestException('Chave PIX email deve ter formato válido');
        }
        break;
      case TipoChavePix.TELEFONE:
        if (!/^\+?[1-9]\d{1,14}$/.test(chavePix.replace(/\D/g, ''))) {
          throw new BadRequestException('Chave PIX telefone deve ter formato válido');
        }
        break;
      case TipoChavePix.ALEATORIA:
        if (chavePix.length !== 32) {
          throw new BadRequestException('Chave PIX aleatória deve ter 32 caracteres');
        }
        break;
      default:
        throw new BadRequestException('Tipo de chave PIX inválido');
    }
  }

  /**
   * Valida dados específicos do Banco do Brasil
   * @param data Dados bancários
   */
  private validateBancoBrasil(data: any): void {
    // Validações específicas para o Banco do Brasil
    if (data.nome_banco && !data.nome_banco.toLowerCase().includes('banco do brasil')) {
      throw new BadRequestException('Nome do banco inconsistente com código 001 (Banco do Brasil)');
    }

    // Validação de agência do BB (formato específico)
    if (data.agencia && !/^\d{4}(-\d)?$/.test(data.agencia)) {
      throw new BadRequestException('Formato de agência inválido para Banco do Brasil');
    }
  }

  /**
   * Mapeia entidade para DTO de resposta
   * @param infoBancaria Entidade de informação bancária
   * @returns DTO de resposta
   */
  private mapToResponseDto(infoBancaria: InfoBancaria): InfoBancariaResponseDto {
    return {
      id: infoBancaria.id,
      cidadao_id: infoBancaria.cidadao_id,
      banco: infoBancaria.banco,
      nome_banco: infoBancaria.nome_banco,
      agencia: infoBancaria.agencia,
      conta: infoBancaria.conta,
      tipo_conta: infoBancaria.tipo_conta,
      chave_pix: infoBancaria.chave_pix,
      tipo_chave_pix: infoBancaria.tipo_chave_pix,
      ativo: infoBancaria.ativo,
      observacoes: infoBancaria.observacoes,
      created_at: infoBancaria.created_at,
      updated_at: infoBancaria.updated_at,
    };
  }
}