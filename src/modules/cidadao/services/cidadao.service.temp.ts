import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { CidadaoRepository } from '../repositories/cidadao.repository';
import { CreateCidadaoDto } from '../dto/create-cidadao.dto';
import { UpdateCidadaoDto } from '../dto/update-cidadao.dto';
import { CreateComposicaoFamiliarDto } from '../dto/create-composicao-familiar.dto';

/**
 * Serviço de cidadãos
 *
 * Responsável pela lógica de negócio relacionada a cidadãos/beneficiários
 */
@Injectable()
export class CidadaoService {
  constructor(
    private readonly cidadaoRepository: CidadaoRepository,
    // Injetar repositório de solicitações quando for implementado
    // private readonly solicitacaoRepository: SolicitacaoRepository
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
  }) {
    const { page = 1, limit = 10, search, bairro, unidadeId } = options || {};

    // Construir filtros
    const where: any = {};

    if (search) {
      where.nome = { $iLike: `%${search}%` };
    }

    if (bairro) {
      where['endereco.bairro'] = { $iLike: `%${bairro}%` };
    }

    // Filtro por unidade será implementado quando houver integração com solicitações

    // Calcular skip para paginação
    const skip = (page - 1) * limit;

    // Buscar cidadãos
    const [cidadaos, total] = await this.cidadaoRepository.findAll({
      skip,
      take: limit,
      where,
    });

    return {
      items: cidadaos,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Busca um cidadão pelo ID
   * @param id ID do cidadão
   * @returns Cidadão encontrado
   */
  async findById(id: string) {
    const cidadao = await this.cidadaoRepository.findById(id);

    if (!cidadao) {
      throw new NotFoundException('Cidadão não encontrado');
    }

    return cidadao;
  }

  /**
   * Cria um novo cidadão
   * @param createCidadaoDto Dados do cidadão
   * @param unidadeId ID da unidade do usuário logado
   * @returns Cidadão criado
   */
  async create(createCidadaoDto: CreateCidadaoDto, unidadeId: string) {
    // Verificar se CPF já existe
    const cpfExistente = await this.cidadaoRepository.findByCpf(
      createCidadaoDto.cpf,
    );
    if (cpfExistente) {
      throw new ConflictException('CPF já está cadastrado');
    }

    // Verificar se NIS já existe (se fornecido)
    if (createCidadaoDto.nis) {
      const nisExistente = await this.cidadaoRepository.findByNis(
        createCidadaoDto.nis,
      );
      if (nisExistente) {
        throw new ConflictException('NIS já está cadastrado');
      }
    }

    // Extrair papéis do DTO para processar separadamente
    const { papeis, ...cidadaoData } = createCidadaoDto;
    
    // Criar cidadão sem os papéis
    const cidadao = await this.cidadaoRepository.create({
      ...cidadaoData,
      // Adicionar unidadeId quando houver integração com unidades
    });
    
    // Processar papéis separadamente se existirem
    // Isso será implementado quando o repositório tiver um método para adicionar papéis

    return cidadao;
  }

  /**
   * Atualiza um cidadão existente
   * @param id ID do cidadão
   * @param updateCidadaoDto Dados a serem atualizados
   * @returns Cidadão atualizado
   */
  async update(id: string, updateCidadaoDto: UpdateCidadaoDto) {
    // Verificar se cidadão existe
    const cidadao = await this.cidadaoRepository.findById(id);
    if (!cidadao) {
      throw new NotFoundException('Cidadão não encontrado');
    }

    // Verificar se NIS já existe (se fornecido e diferente do atual)
    if (updateCidadaoDto.nis && updateCidadaoDto.nis !== cidadao.nis) {
      const nisExistente = await this.cidadaoRepository.findByNis(
        updateCidadaoDto.nis,
      );
      if (nisExistente) {
        throw new ConflictException('NIS já está cadastrado');
      }
    }

    // Atualizar cidadão
    const cidadaoAtualizado = await this.cidadaoRepository.update(
      id,
      updateCidadaoDto,
    );

    return cidadaoAtualizado;
  }

  /**
   * Busca cidadão por CPF
   * @param cpf CPF do cidadão
   * @returns Cidadão encontrado
   */
  async findByCpf(cpf: string) {
    const cidadao = await this.cidadaoRepository.findByCpf(cpf);

    if (!cidadao) {
      throw new NotFoundException('Cidadão não encontrado');
    }

    return cidadao;
  }

  /**
   * Busca cidadão por NIS
   * @param nis NIS do cidadão
   * @returns Cidadão encontrado
   */
  async findByNis(nis: string) {
    const cidadao = await this.cidadaoRepository.findByNis(nis);

    if (!cidadao) {
      throw new NotFoundException('Cidadão não encontrado');
    }

    return cidadao;
  }

  /**
   * Obtém histórico de solicitações de um cidadão
   * @param cidadaoId ID do cidadão
   * @returns Lista de solicitações do cidadão
   */
  async findSolicitacoesByCidadaoId(cidadaoId: string) {
    // Verificar se cidadão existe
    const cidadao = await this.cidadaoRepository.findById(cidadaoId);
    if (!cidadao) {
      throw new NotFoundException('Cidadão não encontrado');
    }

    // Buscar solicitações
    // Implementar quando o módulo de solicitações estiver pronto
    // const solicitacoes = await this.solicitacaoRepository.findByCidadaoId(cidadaoId);

    // Retorno temporário
    return {
      items: [],
      meta: {
        total: 0,
      },
      message:
        'Histórico de solicitações será implementado quando o módulo de solicitações estiver pronto',
    };
  }

  /**
   * Adiciona membro à composição familiar
   * @param cidadaoId ID do cidadão
   * @param createComposicaoFamiliarDto Dados do membro familiar
   * @returns Cidadão atualizado
   */
  async addComposicaoFamiliar(
    cidadaoId: string,
    createComposicaoFamiliarDto: CreateComposicaoFamiliarDto,
  ) {
    // Verificar se cidadão existe
    const cidadao = await this.cidadaoRepository.findById(cidadaoId);
    if (!cidadao) {
      throw new NotFoundException('Cidadão não encontrado');
    }

    // Adicionar membro à composição familiar
    const cidadaoAtualizado =
      await this.cidadaoRepository.addComposicaoFamiliar(
        cidadaoId,
        createComposicaoFamiliarDto,
      );

    return cidadaoAtualizado;
  }

  /**
   * Remove um cidadão (soft delete)
   * @param id ID do cidadão
   */
  async remove(id: string): Promise<void> {
    // Verificar se cidadão existe
    const cidadao = await this.cidadaoRepository.findById(id);
    if (!cidadao) {
      throw new NotFoundException('Cidadão não encontrado');
    }

    // Remover cidadão (soft delete)
    await this.cidadaoRepository.remove(id);
  }
}
