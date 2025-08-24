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
import { Solicitacao } from '../../../entities/solicitacao.entity';
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
    @InjectRepository(Solicitacao)
    private readonly solicitacaoRepository: Repository<Solicitacao>,
  ) {}

  async create(
    createComposicaoFamiliarDto: CreateComposicaoFamiliarDto,
    userId: string,
  ): Promise<ComposicaoFamiliarResponseDto> {
    return this.upsert(createComposicaoFamiliarDto, userId);
  }

  async upsert(
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

    // Verificar se CPF não é igual ao do cidadão responsável
    if (cidadao.cpf === cpfLimpo) {
      throw new ConflictException(
        'O CPF do membro não pode ser igual ao CPF do cidadão responsável',
      );
    }

    // Validar se o CPF não possui solicitação como beneficiário
    await this.validarCpfNaoPossuiSolicitacaoComoBeneficiario(cpfLimpo);

    // Buscar membro existente por cidadao_id + nome (índice único)
    const membroExistente = await this.composicaoFamiliarRepository.findOne({
      where: {
        cidadao_id: createComposicaoFamiliarDto.cidadao_id,
        nome: createComposicaoFamiliarDto.nome,
        removed_at: IsNull(),
      },
    });

    if (membroExistente) {
      // Verificar se o CPF é diferente e se já existe outro membro com este CPF
      if (membroExistente.cpf !== cpfLimpo) {
        const cpfDuplicado = await this.composicaoFamiliarRepository.findOne({
          where: {
            cidadao_id: createComposicaoFamiliarDto.cidadao_id,
            cpf: cpfLimpo,
            id: Not(membroExistente.id),
            removed_at: IsNull(),
          },
        });

        if (cpfDuplicado) {
          throw new ConflictException(
            'Já existe um membro com este CPF na composição familiar',
          );
        }
      }

      // Atualizar dados existentes, "limpando" campos não enviados
      const dadosAtualizados = {
        ...membroExistente,
        // Campos obrigatórios sempre atualizados
        nome: createComposicaoFamiliarDto.nome,
        cpf: cpfLimpo,
        idade: createComposicaoFamiliarDto.idade,
        ocupacao: createComposicaoFamiliarDto.ocupacao,
        escolaridade: createComposicaoFamiliarDto.escolaridade,
        parentesco: createComposicaoFamiliarDto.parentesco,

        // Campos opcionais - limpar se não enviados
        nis: createComposicaoFamiliarDto.nis ?? null,
        renda: createComposicaoFamiliarDto.renda ?? null,
        observacoes: createComposicaoFamiliarDto.observacoes ?? null,
        updated_at: new Date(),
      };

      const membroAtualizado =
        await this.composicaoFamiliarRepository.save(dadosAtualizados);

      return plainToInstance(ComposicaoFamiliarResponseDto, membroAtualizado, {
        excludeExtraneousValues: true,
      });
    } else {
      // Verificar se já existe membro com este CPF
      const cpfExistente = await this.composicaoFamiliarRepository.findOne({
        where: {
          cidadao_id: createComposicaoFamiliarDto.cidadao_id,
          cpf: cpfLimpo,
          removed_at: IsNull(),
        },
      });

      if (cpfExistente) {
        throw new ConflictException(
          'Já existe um membro com este CPF na composição familiar',
        );
      }

      // Criar novo membro
      const novoMembro = this.composicaoFamiliarRepository.create({
        ...createComposicaoFamiliarDto,
        cpf: cpfLimpo,
      });

      try {
        const membroSalvo =
          await this.composicaoFamiliarRepository.save(novoMembro);

        return plainToInstance(ComposicaoFamiliarResponseDto, membroSalvo, {
          excludeExtraneousValues: true,
        });
      } catch (error) {
        // Re-lançar outros erros não tratados
        throw error;
      }
    }
  }

  async upsertMany(
    cidadaoId: string,
    membros: CreateComposicaoFamiliarDto[],
    userId: string,
  ): Promise<ComposicaoFamiliarResponseDto[]> {
    // Validar se o cidadão existe
    const cidadao = await this.cidadaoRepository.findOne({
      where: { id: cidadaoId },
    });

    if (!cidadao) {
      throw new NotFoundException('Cidadão não encontrado');
    }

    const resultados: ComposicaoFamiliarResponseDto[] = [];

    // Processar cada membro
    for (const membroDto of membros) {
      const membroComCidadaoId = { ...membroDto, cidadao_id: cidadaoId };
      const resultado = await this.upsert(membroComCidadaoId, userId);
      resultados.push(resultado);
    }

    // Remover membros que não estão na lista enviada
    const nomesEnviados = membros.map((m) => m.nome);
    const membrosExistentes = await this.composicaoFamiliarRepository.find({
      where: {
        cidadao_id: cidadaoId,
        removed_at: IsNull(),
      },
    });

    for (const membroExistente of membrosExistentes) {
      if (!nomesEnviados.includes(membroExistente.nome)) {
        await this.remove(membroExistente.id, userId);
      }
    }

    return resultados;
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
    const [membros, total] =
      await this.composicaoFamiliarRepository.findAndCount({
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
      }),
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
      throw new NotFoundException(
        'Membro da composição familiar não encontrado',
      );
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
      throw new NotFoundException(
        'Membro da composição familiar não encontrado',
      );
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
        throw new ConflictException(
          'Já existe um membro com este CPF na composição familiar',
        );
      }

      // Verificar se CPF não é igual ao do cidadão responsável
      if (membro.cidadao.cpf === cpfLimpo) {
        throw new ConflictException(
          'O CPF do membro não pode ser igual ao CPF do cidadão responsável',
        );
      }

      // Validar se o CPF não possui solicitação como beneficiário
      await this.validarCpfNaoPossuiSolicitacaoComoBeneficiario(cpfLimpo);

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
        throw new ConflictException(
          'Já existe um membro com este nome na composição familiar',
        );
      }
    }

    // Atualizar
    Object.assign(membro, updateComposicaoFamiliarDto);
    membro.updated_at = new Date();

    const membroAtualizado =
      await this.composicaoFamiliarRepository.save(membro);

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
      throw new NotFoundException(
        'Membro da composição familiar não encontrado',
      );
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
      }),
    );
  }

  /**
   * Valida se o CPF não pertence a um cidadão que já possui solicitação como beneficiário
   * @param cpf CPF do membro da composição familiar
   * @throws ConflictException se o CPF já possui solicitação como beneficiário
   */
  private async validarCpfNaoPossuiSolicitacaoComoBeneficiario(
    cpf: string,
  ): Promise<void> {
    // Buscar cidadão pelo CPF
    const cidadaoComCpf = await this.cidadaoRepository.findOne({
      where: { cpf },
    });

    if (cidadaoComCpf) {
      // Verificar se este cidadão possui alguma solicitação como beneficiário
      const solicitacaoExistente = await this.solicitacaoRepository.findOne({
        where: { beneficiario_id: cidadaoComCpf.id },
      });

      if (solicitacaoExistente) {
        throw new ConflictException(
          `Não é possível cadastrar membro com CPF ${cpf}, pois este cidadão já possui uma solicitação como beneficiário.`,
        );
      }
    }
  }
}
