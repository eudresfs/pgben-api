import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Integrador } from '../../../entities/integrador.entity';
import { CreateIntegradorDto } from '../dto/create-integrador.dto';
import { UpdateIntegradorDto } from '../dto/update-integrador.dto';
import { IntegradorResponseDto } from '../dto/integrador-response.dto';

/**
 * Serviço responsável pelo gerenciamento de integradores.
 * Implementa operações CRUD e regras de negócio específicas para integradores.
 */
@Injectable()
export class IntegradorService {
  constructor(
    @InjectRepository(Integrador)
    private integradorRepository: Repository<Integrador>,
  ) {}

  /**
   * Cria um novo integrador na plataforma.
   * @param createIntegradorDto Dados do integrador a ser criado
   * @returns Dados do integrador criado
   */
  async create(
    createIntegradorDto: CreateIntegradorDto,
  ): Promise<IntegradorResponseDto> {
    // Verifica se já existe um integrador com o mesmo nome
    const existingIntegrador = await this.integradorRepository.findOne({
      where: { nome: createIntegradorDto.nome },
    });

    if (existingIntegrador) {
      throw new ConflictException(
        `Já existe um integrador com o nome '${createIntegradorDto.nome}'`,
      );
    }

    const integrador = this.integradorRepository.create(createIntegradorDto);
    const savedIntegrador = await this.integradorRepository.save(integrador);

    return new IntegradorResponseDto(savedIntegrador);
  }

  /**
   * Retorna todos os integradores cadastrados.
   * @returns Lista de integradores
   */
  async findAll(): Promise<IntegradorResponseDto[]> {
    const integradores = await this.integradorRepository.find();
    return integradores.map(
      (integrador) => new IntegradorResponseDto(integrador),
    );
  }

  /**
   * Busca um integrador pelo seu ID.
   * @param id ID do integrador
   * @returns Dados do integrador encontrado
   * @throws NotFoundException se o integrador não for encontrado
   */
  async findById(id: string): Promise<Integrador> {
    const integrador = await this.integradorRepository.findOne({
      where: { id },
    });

    if (!integrador) {
      throw new NotFoundException(`Integrador com ID ${id} não encontrado`);
    }

    return integrador;
  }

  /**
   * Obtém um integrador pelo ID e retorna com o formato de resposta padronizado.
   * @param id ID do integrador
   * @returns Dados do integrador no formato de resposta
   */
  async findOne(id: string): Promise<IntegradorResponseDto> {
    const integrador = await this.findById(id);
    return new IntegradorResponseDto(integrador);
  }

  /**
   * Atualiza os dados de um integrador.
   * @param id ID do integrador a ser atualizado
   * @param updateIntegradorDto Dados a serem atualizados
   * @returns Dados do integrador atualizado
   */
  async update(
    id: string,
    updateIntegradorDto: UpdateIntegradorDto,
  ): Promise<IntegradorResponseDto> {
    // Verifica se o integrador existe
    const integrador = await this.findById(id);

    // Se o nome estiver sendo alterado, verifica se já existe outro com o mesmo nome
    if (
      updateIntegradorDto.nome &&
      updateIntegradorDto.nome !== integrador.nome
    ) {
      const existingIntegrador = await this.integradorRepository.findOne({
        where: { nome: updateIntegradorDto.nome },
      });

      if (existingIntegrador) {
        throw new ConflictException(
          `Já existe um integrador com o nome '${updateIntegradorDto.nome}'`,
        );
      }
    }

    // Atualiza os dados
    Object.assign(integrador, updateIntegradorDto);
    const updatedIntegrador = await this.integradorRepository.save(integrador);

    return new IntegradorResponseDto(updatedIntegrador);
  }

  /**
   * Remove um integrador do sistema.
   * @param id ID do integrador a ser removido
   */
  async remove(id: string): Promise<void> {
    const integrador = await this.findById(id);
    await this.integradorRepository.remove(integrador);
  }

  /**
   * Ativa ou desativa um integrador.
   * @param id ID do integrador
   * @param ativo Novo status de ativação
   * @returns Dados do integrador atualizado
   */
  async toggleAtivo(
    id: string,
    ativo: boolean,
  ): Promise<IntegradorResponseDto> {
    const integrador = await this.findById(id);
    integrador.ativo = ativo;
    const updatedIntegrador = await this.integradorRepository.save(integrador);

    return new IntegradorResponseDto(updatedIntegrador);
  }

  /**
   * Registra um acesso do integrador à API.
   * @param id ID do integrador
   */
  async registrarAcesso(id: string): Promise<void> {
    await this.integradorRepository.update(
      { id },
      { ultimoAcesso: new Date() },
    );
  }
}
