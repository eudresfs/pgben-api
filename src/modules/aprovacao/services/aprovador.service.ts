import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Aprovador } from '../entities/aprovador.entity';
import { TipoAprovador } from '../enums/aprovacao.enums';
import { CreateAprovadorDto } from '../dtos/create-aprovador.dto';
import { UpdateAprovadorDto } from '../dtos/update-aprovador.dto';

/**
 * Serviço responsável pelo gerenciamento de aprovadores
 * Gerencia os usuários que podem aprovar solicitações no sistema
 */
@Injectable()
export class AprovadorService {
  constructor(
    @InjectRepository(Aprovador)
    private readonly aprovadorRepository: Repository<Aprovador>,
  ) {}

  /**
   * Cria um novo aprovador
   * @param createAprovadorDto - Dados para criação do aprovador
   * @returns Aprovador criado
   */
  async create(createAprovadorDto: CreateAprovadorDto): Promise<Aprovador> {
    // Verifica se já existe um aprovador com o mesmo usuário e configuração
    const existingAprovador = await this.aprovadorRepository.findOne({
      where: {
        usuario_id: createAprovadorDto.usuario_id,
        configuracao_aprovacao_id: createAprovadorDto.configuracao_aprovacao_id,
      },
    });

    if (existingAprovador) {
      throw new BadRequestException(
        'Já existe um aprovador para este usuário nesta configuração',
      );
    }

    const aprovador = this.aprovadorRepository.create(createAprovadorDto);
    return await this.aprovadorRepository.save(aprovador);
  }

  /**
   * Lista todos os aprovadores
   * @param ativo - Filtro por status ativo/inativo
   * @returns Lista de aprovadores
   */
  async findAll(ativo?: boolean): Promise<Aprovador[]> {
    const where = ativo !== undefined ? { ativo } : {};
    return await this.aprovadorRepository.find({
      where,
      relations: ['configuracao_aprovacao'],
      order: { ordem_aprovacao: 'ASC', peso_aprovacao: 'DESC' },
    });
  }

  /**
   * Busca um aprovador por ID
   * @param id - ID do aprovador
   * @returns Aprovador encontrado
   */
  async findOne(id: string): Promise<Aprovador> {
    const aprovador = await this.aprovadorRepository.findOne({
      where: { id },
      relations: ['configuracao_aprovacao'],
    });

    if (!aprovador) {
      throw new NotFoundException(`Aprovador com ID ${id} não encontrado`);
    }

    return aprovador;
  }

  /**
   * Busca aprovadores por configuração de aprovação
   * @param configuracaoId - ID da configuração de aprovação
   * @param ativo - Filtro por status ativo/inativo
   * @returns Lista de aprovadores da configuração
   */
  async findByConfiguracao(
    configuracaoId: string,
    ativo: boolean = true,
  ): Promise<Aprovador[]> {
    return await this.aprovadorRepository.find({
      where: {
        configuracao_aprovacao_id: configuracaoId,
        ativo,
      },
      order: { ordem_aprovacao: 'ASC', peso_aprovacao: 'DESC' },
    });
  }

  /**
   * Busca aprovadores por usuário
   * @param usuarioId - ID do usuário
   * @param ativo - Filtro por status ativo/inativo
   * @returns Lista de aprovadores do usuário
   */
  async findByUsuario(
    usuarioId: string,
    ativo: boolean = true,
  ): Promise<Aprovador[]> {
    return await this.aprovadorRepository.find({
      where: {
        usuario_id: usuarioId,
        ativo,
      },
      relations: ['configuracao_aprovacao'],
      order: { ordem_aprovacao: 'ASC', peso_aprovacao: 'DESC' },
    });
  }

  /**
   * Busca aprovadores por unidade
   * @param unidade - Unidade organizacional
   * @param ativo - Filtro por status ativo/inativo
   * @returns Lista de aprovadores da unidade
   */
  async findByUnidade(
    unidade: string,
    ativo: boolean = true,
  ): Promise<Aprovador[]> {
    return await this.aprovadorRepository.find({
      where: {
        unidade,
        ativo,
      },
      relations: ['configuracao_aprovacao'],
      order: { ordem_aprovacao: 'ASC', peso_aprovacao: 'DESC' },
    });
  }

  /**
   * Busca aprovadores por tipo
   * @param tipo - Tipo do aprovador
   * @param ativo - Filtro por status ativo/inativo
   * @returns Lista de aprovadores do tipo
   */
  async findByTipo(
    tipo: TipoAprovador,
    ativo: boolean = true,
  ): Promise<Aprovador[]> {
    return await this.aprovadorRepository.find({
      where: {
        tipo,
        ativo,
      },
      relations: ['configuracao_aprovacao'],
      order: { ordem_aprovacao: 'ASC', peso_aprovacao: 'DESC' },
    });
  }

  /**
   * Atualiza um aprovador
   * @param id - ID do aprovador
   * @param updateAprovadorDto - Dados para atualização
   * @returns Aprovador atualizado
   */
  async update(
    id: string,
    updateAprovadorDto: UpdateAprovadorDto,
  ): Promise<Aprovador> {
    const aprovador = await this.findOne(id);

    // Se está alterando usuário, verifica duplicação
    if (
      updateAprovadorDto.usuario_id &&
      updateAprovadorDto.usuario_id !== aprovador.usuario_id
    ) {
      const existingAprovador = await this.aprovadorRepository.findOne({
        where: {
          usuario_id: updateAprovadorDto.usuario_id,
          configuracao_aprovacao_id: aprovador.configuracao_aprovacao_id,
        },
      });

      if (existingAprovador && existingAprovador.id !== id) {
        throw new BadRequestException(
          'Já existe um aprovador para este usuário nesta configuração',
        );
      }
    }

    Object.assign(aprovador, updateAprovadorDto);
    return await this.aprovadorRepository.save(aprovador);
  }

  /**
   * Remove um aprovador
   * @param id - ID do aprovador
   */
  async remove(id: string): Promise<void> {
    const aprovador = await this.findOne(id);
    await this.aprovadorRepository.remove(aprovador);
  }

  /**
   * Ativa ou desativa um aprovador
   * @param id - ID do aprovador
   * @param ativo - Status ativo/inativo
   * @returns Aprovador atualizado
   */
  async toggleStatus(id: string, ativo: boolean): Promise<Aprovador> {
    const aprovador = await this.findOne(id);
    aprovador.ativo = ativo;
    return await this.aprovadorRepository.save(aprovador);
  }

  /**
   * Verifica se um usuário é aprovador em uma configuração específica
   * @param usuarioId - ID do usuário
   * @param configuracaoId - ID da configuração
   * @returns True se o usuário é aprovador
   */
  async isAprovador(
    usuarioId: string,
    configuracaoId: string,
  ): Promise<boolean> {
    const aprovador = await this.aprovadorRepository.findOne({
      where: {
        usuario_id: usuarioId,
        configuracao_aprovacao_id: configuracaoId,
        ativo: true,
      },
    });

    return !!aprovador;
  }

  /**
   * Busca aprovadores substitutos
   * @param aprovadorId - ID do aprovador principal
   * @returns Lista de aprovadores substitutos
   */
  async findSubstitutos(aprovadorId: string): Promise<Aprovador[]> {
    return await this.aprovadorRepository.find({
      where: {
        aprovador_substituto_id: aprovadorId,
        ativo: true,
      },
      relations: ['configuracao_aprovacao'],
      order: { ordem_aprovacao: 'ASC', peso_aprovacao: 'DESC' },
    });
  }

  /**
   * Define um aprovador substituto
   * @param aprovadorId - ID do aprovador principal
   * @param substitutoId - ID do aprovador substituto
   * @returns Aprovador atualizado
   */
  async setSubstituto(
    aprovadorId: string,
    substitutoId: string,
  ): Promise<Aprovador> {
    const aprovador = await this.findOne(aprovadorId);
    const substituto = await this.findOne(substitutoId);

    // Verifica se o substituto está na mesma configuração
    if (
      aprovador.configuracao_aprovacao_id !==
      substituto.configuracao_aprovacao_id
    ) {
      throw new BadRequestException(
        'O substituto deve estar na mesma configuração de aprovação',
      );
    }

    aprovador.aprovador_substituto_id = substitutoId;
    return await this.aprovadorRepository.save(aprovador);
  }

  /**
   * Remove um aprovador substituto
   * @param aprovadorId - ID do aprovador principal
   * @returns Aprovador atualizado
   */
  async removeSubstituto(aprovadorId: string): Promise<Aprovador> {
    const aprovador = await this.findOne(aprovadorId);
    aprovador.aprovador_substituto_id = null;
    return await this.aprovadorRepository.save(aprovador);
  }

  /**
   * Busca aprovadores por nível hierárquico
   * @param nivelHierarquico - Nível hierárquico
   * @param ativo - Filtro por status ativo/inativo
   * @returns Lista de aprovadores do nível
   */
  async findByNivelHierarquico(
    nivelHierarquico: number,
    ativo: boolean = true,
  ): Promise<Aprovador[]> {
    return await this.aprovadorRepository.find({
      where: {
        nivel_hierarquico: nivelHierarquico,
        ativo,
      },
      relations: ['configuracao_aprovacao'],
      order: { ordem_aprovacao: 'ASC', peso_aprovacao: 'DESC' },
    });
  }
}
