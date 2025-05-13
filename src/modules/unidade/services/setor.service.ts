import { Injectable, NotFoundException } from '@nestjs/common';
import { SetorRepository } from '../repositories/setor.repository';
import { UnidadeRepository } from '../repositories/unidade.repository';
import { CreateSetorDto } from '../dto/create-setor.dto';
import { UpdateSetorDto } from '../dto/update-setor.dto';

/**
 * Serviço de setores
 * 
 * Responsável pela lógica de negócio relacionada a setores
 */
@Injectable()
export class SetorService {
  constructor(
    private readonly setorRepository: SetorRepository,
    private readonly unidadeRepository: UnidadeRepository
  ) {}

  /**
   * Cria um novo setor
   * @param createSetorDto Dados do setor
   * @returns Setor criado
   */
  async create(createSetorDto: CreateSetorDto) {
    // Verificar se a unidade existe
    const unidade = await this.unidadeRepository.findById(createSetorDto.unidadeId);
    if (!unidade) {
      throw new NotFoundException('Unidade não encontrada');
    }
    
    // Criar setor
    const setor = await this.setorRepository.create(createSetorDto);
    
    return setor;
  }

  /**
   * Atualiza um setor existente
   * @param id ID do setor
   * @param updateSetorDto Dados a serem atualizados
   * @returns Setor atualizado
   */
  async update(id: string, updateSetorDto: UpdateSetorDto) {
    // Verificar se setor existe
    const setor = await this.setorRepository.findById(id);
    if (!setor) {
      throw new NotFoundException('Setor não encontrado');
    }
    
    // Verificar se a unidade existe (se fornecida)
    if (updateSetorDto.unidadeId) {
      const unidade = await this.unidadeRepository.findById(updateSetorDto.unidadeId);
      if (!unidade) {
        throw new NotFoundException('Unidade não encontrada');
      }
    }
    
    // Atualizar setor
    const setorAtualizado = await this.setorRepository.update(id, updateSetorDto);
    
    return setorAtualizado;
  }

  /**
   * Busca um setor pelo ID
   * @param id ID do setor
   * @returns Setor encontrado
   */
  async findById(id: string) {
    const setor = await this.setorRepository.findById(id);
    
    if (!setor) {
      throw new NotFoundException('Setor não encontrado');
    }
    
    return setor;
  }

  /**
   * Busca setores por unidade
   * @param unidadeId ID da unidade
   * @returns Lista de setores da unidade
   */
  async findByUnidadeId(unidadeId: string) {
    // Verificar se a unidade existe
    const unidade = await this.unidadeRepository.findById(unidadeId);
    if (!unidade) {
      throw new NotFoundException('Unidade não encontrada');
    }
    
    // Buscar setores
    const setores = await this.setorRepository.findByUnidadeId(unidadeId);
    
    return setores;
  }
}
