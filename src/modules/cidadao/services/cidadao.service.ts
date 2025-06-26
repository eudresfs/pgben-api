import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { CidadaoRepository } from '../repositories/cidadao.repository';
import { CreateCidadaoDto } from '../dto/create-cidadao.dto';
import { CidadaoResponseDto, CidadaoPaginatedResponseDto } from '../dto/cidadao-response.dto';
import { plainToInstance } from 'class-transformer';

@Injectable()
export class CidadaoService {
  constructor(private readonly cidadaoRepository: CidadaoRepository) {}

  async findAll(options: {
    page?: number;
    limit?: number;
    search?: string;
    bairro?: string;
    unidade_id?: string;
    includeRelations?: boolean;
  } = {}): Promise<CidadaoPaginatedResponseDto> {
    const {
      page = 1,
      limit = 10,
      search,
      bairro,
      unidade_id,
      includeRelations = false,
    } = options;

    // Log para debug
    console.log('🔧 Service params:', { 
      page, 
      limit, 
      search, 
      bairro, 
      unidade_id, 
      includeRelations 
    });

    const skip = (page - 1) * limit;
    const take = Math.min(limit, 100);

    const [cidadaos, total] = await this.cidadaoRepository.findAll({
      skip,
      take,
      search,
      bairro,
      unidade_id,
      includeRelations,
    });

    console.log('📊 Results:', { found: cidadaos.length, total });

    const items = cidadaos.map(cidadao =>
      plainToInstance(CidadaoResponseDto, cidadao, {
        excludeExtraneousValues: true,
      })
    );

    return {
      items,
      meta: {
        total,
        page,
        limit: take,
        pages: Math.ceil(total / take),
        hasNext: page < Math.ceil(total / take),
        hasPrev: page > 1,
      },
    };
  }

  async findById(id: string, includeRelations = false): Promise<CidadaoResponseDto> {
    if (!id || typeof id !== 'string') {
      throw new BadRequestException('ID inválido');
    }

    const cidadao = await this.cidadaoRepository.findById(id, includeRelations);
    if (!cidadao) {
      throw new NotFoundException('Cidadão não encontrado');
    }

    return plainToInstance(CidadaoResponseDto, cidadao, {
      excludeExtraneousValues: true,
    });
  }

  async findByCpf(cpf: string, includeRelations = false): Promise<CidadaoResponseDto> {
    if (!cpf || cpf.trim() === '') {
      throw new BadRequestException('CPF é obrigatório');
    }

    const cpfClean = cpf.replace(/\D/g, '');
    if (cpfClean.length !== 11) {
      throw new BadRequestException('CPF deve ter 11 dígitos');
    }

    const cidadao = await this.cidadaoRepository.findByCpf(cpfClean, includeRelations);
    if (!cidadao) {
      throw new NotFoundException('Cidadão não encontrado');
    }

    return plainToInstance(CidadaoResponseDto, cidadao, {
      excludeExtraneousValues: true,
    });
  }

  async findByNis(nis: string, includeRelations = false): Promise<CidadaoResponseDto> {
    if (!nis || nis.trim() === '') {
      throw new BadRequestException('NIS é obrigatório');
    }

    const nisClean = nis.replace(/\D/g, '');
    if (nisClean.length !== 11) {
      throw new BadRequestException('NIS deve ter 11 dígitos');
    }

    const cidadao = await this.cidadaoRepository.findByNis(nisClean, includeRelations);
    if (!cidadao) {
      throw new NotFoundException('Cidadão não encontrado');
    }

    return plainToInstance(CidadaoResponseDto, cidadao, {
      excludeExtraneousValues: true,
    });
  }

  async create(
    createCidadaoDto: CreateCidadaoDto,
    unidade_id: string,
    usuario_id: string,
  ): Promise<CidadaoResponseDto> {
    // Validações básicas
    if (!createCidadaoDto.cpf) {
      throw new BadRequestException('CPF é obrigatório');
    }

    const cpfClean = createCidadaoDto.cpf.replace(/\D/g, '');
    if (cpfClean.length !== 11) {
      throw new BadRequestException('CPF deve ter 11 dígitos');
    }

    let nisClean: string | undefined = undefined;
    if (createCidadaoDto.nis) {
      nisClean = createCidadaoDto.nis.replace(/\D/g, '');
      if (nisClean.length !== 11) {
        throw new BadRequestException('NIS deve ter 11 dígitos');
      }
    }

    // Separar campos que não pertencem à entidade Cidadao
    const { papeis, composicao_familiar, ...cidadaoData } = createCidadaoDto;

    // Preparar dados para criação
    const dadosParaCriacao = {
      ...cidadaoData,
      cpf: cpfClean,
      nis: nisClean,
      unidade_id,
      usuario_id,
    };

    const cidadao = await this.cidadaoRepository.create(dadosParaCriacao);

    return plainToInstance(CidadaoResponseDto, cidadao, {
      excludeExtraneousValues: true,
    });
  }

  async update(
    id: string,
    updateCidadaoDto: CreateCidadaoDto,
    usuario_id: string,
  ): Promise<CidadaoResponseDto> {
    const cidadao = await this.cidadaoRepository.findById(id);
    if (!cidadao) {
      throw new NotFoundException('Cidadão não encontrado');
    }

    // Separar campos que não pertencem à entidade Cidadao
    const { papeis, composicao_familiar, ...dadosAtualizacao } = updateCidadaoDto;

    // Validar CPF se foi alterado
    if (dadosAtualizacao.cpf) {
      const cpfClean = dadosAtualizacao.cpf.replace(/\D/g, '');
      if (cpfClean !== cidadao.cpf) {
        const existingCpf = await this.cidadaoRepository.findByCpf(cpfClean);
        if (existingCpf) {
          throw new ConflictException('CPF já cadastrado');
        }
        dadosAtualizacao.cpf = cpfClean;
      }
    }

    // Validar NIS se foi alterado
    if ('nis' in dadosAtualizacao && dadosAtualizacao.nis !== cidadao.nis) {
      const nisClean = dadosAtualizacao.nis?.replace(/\D/g, '') || undefined;
      if (nisClean) {
        const existingNis = await this.cidadaoRepository.findByNis(nisClean);
        if (existingNis) {
          throw new ConflictException('NIS já cadastrado');
        }
      }
      dadosAtualizacao.nis = nisClean;
    }

    const cidadaoAtualizado = await this.cidadaoRepository.update(id, dadosAtualizacao);

    return plainToInstance(CidadaoResponseDto, cidadaoAtualizado, {
      excludeExtraneousValues: true,
    });
  }

  async remove(id: string): Promise<void> {
    await this.cidadaoRepository.remove(id);
  }

  /**
   * Verifica se existe relação familiar entre dois cidadãos
   * @param cidadaoId ID do cidadão principal
   * @param familiarId ID do familiar a ser verificado
   * @returns True se existe relação familiar, false caso contrário
   */
  async verificarRelacaoFamiliar(
    cidadaoId: string,
    familiarId: string,
  ): Promise<boolean> {
    if (!cidadaoId || !familiarId) {
      return false;
    }

    try {
      // Buscar cidadão com composição familiar
      const cidadao = await this.cidadaoRepository.findById(cidadaoId, true);

      if (!cidadao || !cidadao.composicao_familiar) {
        return false;
      }

      // Verificar se o familiarId está na composição familiar
      return cidadao.composicao_familiar.some(
        (membro) => membro.id === familiarId,
      );
    } catch (error) {
      return false;
    }
  }

  /**
   * Busca todos os bairros únicos registrados no sistema
   * @returns Lista de bairros únicos ordenados alfabeticamente
   */
  async findAllBairros(): Promise<string[]> {
    try {
      return await this.cidadaoRepository.findAllBairros();
    } catch (error) {
      throw new BadRequestException('Erro ao buscar bairros');
    }
  }
}