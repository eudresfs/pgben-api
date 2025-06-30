import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull, Not } from 'typeorm';
import { plainToInstance } from 'class-transformer';
import { ComposicaoFamiliar } from '../../../entities/composicao-familiar.entity';
import { Cidadao } from '../../../entities/cidadao.entity';
import { CreateComposicaoFamiliarDto } from '../dto/create-composicao-familiar.dto';
import { UpdateComposicaoFamiliarDto } from '../dto/update-composicao-familiar.dto';
import {
  ComposicaoFamiliarResponseDto,
  ComposicaoFamiliarPaginatedResponseDto,
} from '../dto/composicao-familiar-response.dto';

@Injectable()
export class ComposicaoFamiliarService {
  constructor(
    @InjectRepository(ComposicaoFamiliar)
    private readonly composicaoFamiliarRepository: Repository<ComposicaoFamiliar>,
    @InjectRepository(Cidadao)
    private readonly cidadaoRepository: Repository<Cidadao>,
  ) {}

  async create(
    createComposicaoFamiliarDto: CreateComposicaoFamiliarDto,
    userId: string,
  ): Promise<ComposicaoFamiliarResponseDto> {
    // Validar se o cidadão existe
    const cidadao = await this.cidadaoRepository.findOne({
      where: { id: createComposicaoFamiliarDto.cidadao_id },
    });

    if (!cidadao) {
      throw new NotFoundException('Cidadão não encontrado');
    }

    // Validar e limpar CPF
    const cpfLimpo = createComposicaoFamiliarDto.cpf.replace(/\D/g, '');
    if (cpfLimpo.length !== 11) {
      throw new BadRequestException('CPF deve ter 11 dígitos');
    }

    // Verificar duplicatas
    const membroExistente = await this.composicaoFamiliarRepository.findOne({
      where: {
        cidadao_id: createComposicaoFamiliarDto.cidadao_id,
        cpf: cpfLimpo,
        removed_at: IsNull(),
      },
    });

    if (membroExistente) {
      throw new ConflictException('Já existe um membro com este CPF na composição familiar');
    }

    // Verificar se CPF não é igual ao do cidadão responsável
    if (cidadao.cpf === cpfLimpo) {
      throw new ConflictException('O CPF do membro não pode ser igual ao CPF do cidadão responsável');
    }

    // Criar membro
    const novoMembro = this.composicaoFamiliarRepository.create({
      ...createComposicaoFamiliarDto,
      cpf: cpfLimpo,
    });

    try {
      const membroSalvo = await this.composicaoFamiliarRepository.save(novoMembro);

      return plainToInstance(ComposicaoFamiliarResponseDto, membroSalvo, {
        excludeExtraneousValues: true,
      });
    } catch (error) {
      // Capturar erro específico do constraint de exclusividade de papéis
      if (error.message?.includes('Cidadão não pode ser adicionado à composição familiar, pois já é beneficiário')) {
        throw new ConflictException({
          code: 'VAL_2004',
          message: 'Conflito de papéis: O cidadão já possui papel de beneficiário ativo no sistema',
          details: {
            cpf: cpfLimpo,
            reason: 'O cidadão já possui papel de beneficiário ativo no sistema',
            action: 'Remova o papel de beneficiário antes de adicionar à composição familiar',
          },
          localizedMessage: 'Cidadão não pode ser beneficiário principal e membro da composição familiar simultaneamente',
        });
      }

      // Re-lançar outros erros não tratados
      throw error;
    }
  }

  async findByCidadao(
    cidadaoId: string,
    options: { page: number; limit: number },
  ): Promise<ComposicaoFamiliarPaginatedResponseDto> {
    const { page, limit } = options;
    const offset = (page - 1) * limit;

    // Verificar se o cidadão existe
    const cidadao = await this.cidadaoRepository.findOne({
      where: { id: cidadaoId },
    });

    if (!cidadao) {
      throw new NotFoundException('Cidadão não encontrado');
    }

    // Buscar membros
    const [membros, total] = await this.composicaoFamiliarRepository.findAndCount({
      where: {
        cidadao_id: cidadaoId,
        removed_at: IsNull(),
      },
      order: {
        created_at: 'DESC',
      },
      skip: offset,
      take: Math.min(limit, 100),
    });

    const data = membros.map((membro) =>
      plainToInstance(ComposicaoFamiliarResponseDto, membro, {
        excludeExtraneousValues: true,
      })
    );

    const totalPages = Math.ceil(total / limit);
    
    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    };
  }

  async findOne(id: string): Promise<ComposicaoFamiliarResponseDto> {
    const membro = await this.composicaoFamiliarRepository.findOne({
      where: {
        id,
        removed_at: IsNull(),
      },
      relations: ['cidadao'],
    });

    if (!membro) {
      throw new NotFoundException('Membro da composição familiar não encontrado');
    }

    return plainToInstance(ComposicaoFamiliarResponseDto, membro, {
      excludeExtraneousValues: true,
    });
  }

  async update(
    id: string,
    updateComposicaoFamiliarDto: UpdateComposicaoFamiliarDto,
    userId: string,
  ): Promise<ComposicaoFamiliarResponseDto> {
    const membro = await this.composicaoFamiliarRepository.findOne({
      where: {
        id,
        removed_at: IsNull(),
      },
      relations: ['cidadao'],
    });

    if (!membro) {
      throw new NotFoundException('Membro da composição familiar não encontrado');
    }

    // Validar CPF se foi alterado
    if (updateComposicaoFamiliarDto.cpf) {
      const cpfLimpo = updateComposicaoFamiliarDto.cpf.replace(/\D/g, '');
      if (cpfLimpo.length !== 11) {
        throw new BadRequestException('CPF deve ter 11 dígitos');
      }

      // Verificar duplicatas
      const membroExistente = await this.composicaoFamiliarRepository.findOne({
        where: {
          cidadao_id: membro.cidadao_id,
          cpf: cpfLimpo,
          id: Not(id),
          removed_at: IsNull(),
        },
      });

      if (membroExistente) {
        throw new ConflictException('Já existe um membro com este CPF na composição familiar');
      }

      // Verificar se CPF não é igual ao do cidadão responsável
      if (membro.cidadao.cpf === cpfLimpo) {
        throw new ConflictException('O CPF do membro não pode ser igual ao CPF do cidadão responsável');
      }

      updateComposicaoFamiliarDto.cpf = cpfLimpo;
    }

    // Validar nome se foi alterado
    if (updateComposicaoFamiliarDto.nome) {
      const nomeExistente = await this.composicaoFamiliarRepository.findOne({
        where: {
          cidadao_id: membro.cidadao_id,
          nome: updateComposicaoFamiliarDto.nome,
          id: Not(id),
          removed_at: IsNull(),
        },
      });

      if (nomeExistente) {
        throw new ConflictException('Já existe um membro com este nome na composição familiar');
      }
    }

    // Atualizar
    Object.assign(membro, updateComposicaoFamiliarDto);
    membro.updated_at = new Date();

    const membroAtualizado = await this.composicaoFamiliarRepository.save(membro);

    return plainToInstance(ComposicaoFamiliarResponseDto, membroAtualizado, {
      excludeExtraneousValues: true,
    });
  }

  async remove(id: string, userId: string): Promise<void> {
    const membro = await this.composicaoFamiliarRepository.findOne({
      where: {
        id,
        removed_at: IsNull(),
      },
    });

    if (!membro) {
      throw new NotFoundException('Membro da composição familiar não encontrado');
    }

    // Soft delete
    membro.removed_at = new Date();
    await this.composicaoFamiliarRepository.save(membro);
  }

  async findByCpf(cpf: string): Promise<ComposicaoFamiliarResponseDto[]> {
    const cpfLimpo = cpf.replace(/\D/g, '');

    if (cpfLimpo.length !== 11) {
      throw new BadRequestException('CPF deve ter 11 dígitos');
    }

    const membros = await this.composicaoFamiliarRepository.find({
      where: {
        cpf: cpfLimpo,
        removed_at: IsNull(),
      },
      relations: ['cidadao'],
      order: {
        created_at: 'DESC',
      },
    });

    return membros.map((membro) =>
      plainToInstance(ComposicaoFamiliarResponseDto, membro, {
        excludeExtraneousValues: true,
      })
    );
  }
}