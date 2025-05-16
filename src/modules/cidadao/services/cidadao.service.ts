import { 
  Injectable, 
  NotFoundException, 
  ConflictException, 
  BadRequestException,
  InternalServerErrorException
} from '@nestjs/common';
import { CidadaoRepository } from '../repositories/cidadao.repository';
import { CreateCidadaoDto } from '../dto/create-cidadao.dto';
import { UpdateCidadaoDto } from '../dto/update-cidadao.dto';
import { CidadaoResponseDto, CidadaoPaginatedResponseDto } from '../dto/cidadao-response.dto';
import { plainToInstance } from 'class-transformer';

/**
 * Serviço de cidadãos
 * 
 * Responsável pela lógica de negócio relacionada a cidadãos/beneficiários
 */
@Injectable()
export class CidadaoService {
  constructor(
    private readonly cidadaoRepository: CidadaoRepository,
  ) {}

  /**
   * Busca todos os cidadãos com filtros e paginação
   * @param options Opções de filtro e paginação
   * @returns Lista de cidadãos paginada
   */
  async findAll(options?: {
    page?: number;
    limit?: number;
    search?: string;
    bairro?: string;
    unidadeId?: string;
    ativo?: boolean;
  }): Promise<CidadaoPaginatedResponseDto> {
    const { 
      page = 1, 
      limit = 10, 
      search, 
      bairro, 
      unidadeId, 
      ativo 
    } = options || {};
    
    // Construir filtros
    const where: any = {};
    
    // Aplicar filtro de busca (nome, CPF ou NIS)
    if (search) {
      where.$or = [
        { nome: { $iLike: `%${search}%` } },
        { cpf: { $iLike: `%${search.replace(/\D/g, '')}%` } },
        { nis: { $iLike: `%${search.replace(/\D/g, '')}%` } },
      ];
    }
    
    // Aplicar filtro de bairro
    if (bairro) {
      where['endereco.bairro'] = { $iLike: `%${bairro}%` };
    }

    // Aplicar filtro de status (ativo/inativo)
    if (ativo !== undefined) {
      where.ativo = ativo;
    }
    
    // Aplicar filtro de unidade (se fornecido)
    if (unidadeId) {
      where.unidadeId = unidadeId;
    }
    
    // Calcular skip para paginação
    const skip = (page - 1) * limit;
    
    try {
      // Buscar cidadãos
      const [cidadaos, total] = await this.cidadaoRepository.findAll({
        where,
        skip,
        take: limit,
        order: { nome: 'ASC' },
      });
      
      // Calcular totais para paginação
      const pages = Math.ceil(total / limit);
      const hasNext = page < pages;
      const hasPrev = page > 1;
      
      // Mapear para o DTO de resposta
      const items = cidadaos.map(cidadao => 
        plainToInstance(CidadaoResponseDto, cidadao, { 
          excludeExtraneousValues: true,
          enableImplicitConversion: true 
        })
      );
      
      return {
        items,
        meta: {
          total,
          page,
          limit,
          pages,
          hasNext,
          hasPrev,
        },
      };
    } catch (error) {
      throw new InternalServerErrorException('Erro ao buscar cidadãos');
    }
  }

  /**
   * Busca um cidadão pelo ID
   * @param id ID do cidadão
   * @returns Dados do cidadão
   * @throws NotFoundException se o cidadão não for encontrado
   */
  async findById(id: string): Promise<CidadaoResponseDto> {
    try {
      const cidadao = await this.cidadaoRepository.findById(id);
      
      if (!cidadao) {
        throw new NotFoundException('Cidadão não encontrado');
      }
      
      return plainToInstance(CidadaoResponseDto, cidadao, { 
        excludeExtraneousValues: true,
        enableImplicitConversion: true 
      });
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException('Erro ao buscar cidadão');
    }
  }

  /**
   * Busca um cidadão pelo CPF
   * @param cpf CPF do cidadão (com ou sem formatação)
   * @returns Dados do cidadão
   * @throws BadRequestException se o CPF for inválido
   * @throws NotFoundException se o cidadão não for encontrado
   */
  async findByCpf(cpf: string): Promise<CidadaoResponseDto> {
    // Remover formatação do CPF
    const cpfLimpo = cpf.replace(/\D/g, '');
    
    // Validar CPF
    if (cpfLimpo.length !== 11 || !/^\d{11}$/.test(cpfLimpo)) {
      throw new BadRequestException('CPF inválido');
    }
    
    try {
      const cidadao = await this.cidadaoRepository.findByCpf(cpfLimpo);
      
      if (!cidadao) {
        throw new NotFoundException('Cidadão não encontrado');
      }
      
      return plainToInstance(CidadaoResponseDto, cidadao, { 
        excludeExtraneousValues: true,
        enableImplicitConversion: true 
      });
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) throw error;
      throw new InternalServerErrorException('Erro ao buscar cidadão por CPF');
    }
  }

  /**
   * Busca um cidadão pelo NIS
   * @param nis Número do NIS (PIS/PASEP)
   * @returns Dados do cidadão
   * @throws BadRequestException se o NIS for inválido
   * @throws NotFoundException se o cidadão não for encontrado
   */
  async findByNis(nis: string): Promise<CidadaoResponseDto> {
    // Remover formatação do NIS
    const nisLimpo = nis.replace(/\D/g, '');
    
    // Validar NIS
    if (nisLimpo.length !== 11 || !/^\d{11}$/.test(nisLimpo)) {
      throw new BadRequestException('NIS inválido');
    }
    
    try {
      const cidadao = await this.cidadaoRepository.findByNis(nisLimpo);
      
      if (!cidadao) {
        throw new NotFoundException('Cidadão não encontrado');
      }
      
      return plainToInstance(CidadaoResponseDto, cidadao, { 
        excludeExtraneousValues: true,
        enableImplicitConversion: true 
      });
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) throw error;
      throw new InternalServerErrorException('Erro ao buscar cidadão por NIS');
    }
  }

  /**
   * Cria um novo cidadão
   * @param createCidadaoDto Dados do cidadão a ser criado
   * @param unidadeId ID da unidade responsável pelo cadastro
   * @param userId ID do usuário que está realizando o cadastro
   * @returns Cidadão criado
   * @throws ConflictException se já existir um cidadão com o mesmo CPF ou NIS
   */
  async create(
    createCidadaoDto: CreateCidadaoDto, 
    unidadeId: string,
    userId: string
  ): Promise<CidadaoResponseDto> {
    // Remover formatação do CPF e NIS
    const cpfLimpo = createCidadaoDto.cpf.replace(/\D/g, '');
    const nisLimpo = createCidadaoDto.nis?.replace(/\D/g, '') || null;
    
    try {
      // Verificar se já existe cidadão com o mesmo CPF
      const cpfExists = await this.cidadaoRepository.findByCpf(cpfLimpo);
      
      if (cpfExists) {
        throw new ConflictException('Já existe um cidadão cadastrado com este CPF');
      }
      
      // Verificar se já existe cidadão com o mesmo NIS (se fornecido)
      if (nisLimpo) {
        const nisExists = await this.cidadaoRepository.findByNis(nisLimpo);
        
        if (nisExists) {
          throw new ConflictException('Já existe um cidadão cadastrado com este NIS');
        }
      }
      
      // Criar o cidadão
      const cidadaoCriado = await this.cidadaoRepository.create({
        ...createCidadaoDto,
        cpf: cpfLimpo,
        nis: nisLimpo || undefined
      });
      
      return plainToInstance(CidadaoResponseDto, cidadaoCriado, { 
        excludeExtraneousValues: true,
        enableImplicitConversion: true 
      });
    } catch (error) {
      if (error instanceof ConflictException) throw error;
      throw new InternalServerErrorException('Erro ao criar cidadão');
    }
  }

  /**
   * Atualiza um cidadão existente
   * @param id ID do cidadão a ser atualizado
   * @param updateCidadaoDto Dados a serem atualizados
   * @param userId ID do usuário que está realizando a atualização
   * @returns Cidadão atualizado
   * @throws NotFoundException se o cidadão não for encontrado
   * @throws ConflictException se já existir outro cidadão com o mesmo CPF ou NIS
   */
  async update(
    id: string, 
    updateCidadaoDto: UpdateCidadaoDto,
    userId: string
  ): Promise<CidadaoResponseDto> {
    try {
      // Verificar se o cidadão existe
      const cidadao = await this.cidadaoRepository.findById(id);
      
      if (!cidadao) {
        throw new NotFoundException('Cidadão não encontrado');
      }
      
      const updateData: any = { ...updateCidadaoDto };
      
      // Verificar se o CPF foi alterado e se já existe outro cidadão com o novo CPF
      if (updateCidadaoDto.cpf) {
        const cpfLimpo = updateCidadaoDto.cpf.replace(/\D/g, '');
        
        if (cpfLimpo !== cidadao.cpf) {
          const cpfExists = await this.cidadaoRepository.findByCpf(cpfLimpo);
          
          if (cpfExists) {
            throw new ConflictException('Já existe um cidadão cadastrado com este CPF');
          }
          
          // Atualizar o CPF formatado
          updateData.cpf = cpfLimpo;
        }
      }
      
      // Verificar se o NIS foi alterado e se já existe outro cidadão com o novo NIS
      if ('nis' in updateCidadaoDto) {
        const nisLimpo = updateCidadaoDto.nis ? updateCidadaoDto.nis.replace(/\D/g, '') : null;
        
        if (nisLimpo !== cidadao.nis) {
          if (nisLimpo) {
            const nisExists = await this.cidadaoRepository.findByNis(nisLimpo);
            
            if (nisExists) {
              throw new ConflictException('Já existe um cidadão cadastrado com este NIS');
            }
          }
          
          // Atualizar o NIS formatado
          updateData.nis = nisLimpo;
        }
      }
      
      // Adicionar informações de auditoria
      updateData.updatedBy = userId;
      
      // Atualizar o cidadão
      const cidadaoAtualizado = await this.cidadaoRepository.update(id, updateData);
      
      return plainToInstance(CidadaoResponseDto, cidadaoAtualizado, { 
        excludeExtraneousValues: true,
        enableImplicitConversion: true 
      });
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof ConflictException) throw error;
      throw new InternalServerErrorException('Erro ao atualizar cidadão');
    }
  }

  /**
   * Remove um cidadão (soft delete)
   * @param id ID do cidadão a ser removido
   * @param userId ID do usuário que está realizando a remoção
   * @throws NotFoundException se o cidadão não for encontrado
   */
  async remove(id: string, userId: string): Promise<void> {
    try {
      // Verificar se o cidadão existe
      const cidadao = await this.cidadaoRepository.findById(id);
      
      if (!cidadao) {
        throw new NotFoundException('Cidadão não encontrado');
      }
      
      // Realizar soft delete
      await this.cidadaoRepository.update(id, {
        removed_at: new Date()
      });
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException('Erro ao remover cidadão');
    }
  }

  /**
   * Obtém histórico de solicitações de um cidadão
   * @param cidadaoId ID do cidadão
   * @returns Lista de solicitações do cidadão
   * @throws NotFoundException se o cidadão não for encontrado
   */
  async findSolicitacoesByCidadaoId(cidadaoId: string) {
    // Implementação futura
    return [];
  }

  /**
   * Adiciona membro à composição familiar
   * @param cidadaoId ID do cidadão
   * @param createComposicaoFamiliarDto Dados do membro familiar
   * @returns Cidadão atualizado
   * @throws NotFoundException se o cidadão não for encontrado
   */
  async addComposicaoFamiliar(
    cidadaoId: string, 
    createComposicaoFamiliarDto: any,
    userId: string
  ): Promise<CidadaoResponseDto> {
    try {
      // Verificar se o cidadão existe
      const cidadao = await this.cidadaoRepository.findById(cidadaoId);
      
      if (!cidadao) {
        throw new NotFoundException('Cidadão não encontrado');
      }
      
      // Atualizar a composição familiar
      const composicaoAtual = Array.isArray(cidadao.composicao_familiar) 
        ? cidadao.composicao_familiar 
        : [];
      
      const novaComposicao = [
        ...composicaoAtual,
        {
          ...createComposicaoFamiliarDto,
          id: Date.now().toString(), // ID temporário
          criadoEm: new Date(),
          criadoPor: userId,
        }
      ];
      
      // Atualizar o cidadão com a nova composição familiar
      const cidadaoAtualizado = await this.cidadaoRepository.update(cidadaoId, {
        composicao_familiar: novaComposicao
      });
      
      return plainToInstance(CidadaoResponseDto, cidadaoAtualizado, { 
        excludeExtraneousValues: true,
        enableImplicitConversion: true 
      });
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException('Erro ao adicionar membro à composição familiar');
    }
  }
}
