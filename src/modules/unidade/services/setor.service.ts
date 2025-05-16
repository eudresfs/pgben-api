import { Injectable, NotFoundException, InternalServerErrorException, Logger, BadRequestException } from '@nestjs/common';
import { SetorRepository } from '../repositories/setor.repository';
import { UnidadeRepository } from '../repositories/unidade.repository';
import { CreateSetorDto } from '../dto/create-setor.dto';
import { UpdateSetorDto } from '../dto/update-setor.dto';
import { Setor } from '../entities/setor.entity';

/**
 * Serviço de setores
 * 
 * Responsável pela lógica de negócio relacionada a setores
 */
@Injectable()
export class SetorService {
  private readonly logger = new Logger(SetorService.name);
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
    this.logger.log(`Iniciando criação de setor: ${JSON.stringify(createSetorDto)}`);
    
    // Validações iniciais
    if (!createSetorDto.unidadeId) {
      this.logger.error('ID da unidade não fornecido');
      throw new BadRequestException('ID da unidade é obrigatório');
    }

    // Verificar se a unidade existe
    this.logger.log(`Buscando unidade com ID: ${createSetorDto.unidadeId}`);
    const unidade = await this.unidadeRepository.findById(createSetorDto.unidadeId);
    if (!unidade) {
      this.logger.error(`Unidade não encontrada: ${createSetorDto.unidadeId}`);
      throw new NotFoundException(`Unidade com ID ${createSetorDto.unidadeId} não encontrada`);
    }
    
    // Mapear DTO para a entidade
    const { unidadeId, ...setorData } = createSetorDto;
    
    // Criar o objeto do setor com os dados básicos
    const setor = new Setor();
    Object.assign(setor, setorData);
    setor.unidade_id = unidadeId;
    
    this.logger.log(`Dados do setor mapeados: ${JSON.stringify(setor)}`);
    
    try {
      // Criar setor
      const setorCriado = await this.setorRepository.create(setor);
      this.logger.log(`Setor criado com sucesso: ${setorCriado.id}`);
      
      return setorCriado;
    } catch (error) {
      this.logger.error(`Erro ao criar setor: ${error.message}`, error.stack);
      
      // Se for um erro de validação do banco de dados
      if (error.code === '23505') { // Código de violação de chave única
        throw new BadRequestException('Já existe um setor com estes dados');
      }
      
      // Se for um erro de chave estrangeira
      if (error.code === '23503') {
        throw new BadRequestException('Dados de relacionamento inválidos');
      }
      
      throw new InternalServerErrorException('Falha ao criar setor. Por favor, tente novamente.');
    }
  }

  /**
   * Atualiza um setor existente
   * @param id ID do setor
   * @param updateSetorDto Dados a serem atualizados
   * @returns Setor atualizado
   */
  async update(id: string, updateSetorDto: UpdateSetorDto) {
    try {
      this.logger.log(`Atualizando setor ${id} com dados: ${JSON.stringify(updateSetorDto)}`);
      
      // Verificar se setor existe
      const setorExistente = await this.setorRepository.findById(id);
      if (!setorExistente) {
        this.logger.error(`Setor não encontrado: ${id}`);
        throw new NotFoundException(`Setor com ID ${id} não encontrado`);
      }
      
      // Verificar se a unidade existe (se fornecida)
      if (updateSetorDto.unidadeId && updateSetorDto.unidadeId !== setorExistente.unidade_id) {
        this.logger.log(`Validando unidade com ID: ${updateSetorDto.unidadeId}`);
        const unidade = await this.unidadeRepository.findById(updateSetorDto.unidadeId);
        if (!unidade) {
          this.logger.error(`Unidade não encontrada: ${updateSetorDto.unidadeId}`);
          throw new NotFoundException(`Unidade com ID ${updateSetorDto.unidadeId} não encontrada`);
        }
        setorExistente.unidade_id = updateSetorDto.unidadeId;
      }
      
      // Atualizar os demais campos
      const { unidadeId, ...setorData } = updateSetorDto;
      Object.assign(setorExistente, setorData);
      
      this.logger.log(`Dados atualizados do setor: ${JSON.stringify(setorExistente)}`);
      
      // Atualizar setor
      const setorAtualizado = await this.setorRepository.update(id, setorExistente);
      this.logger.log(`Setor ${id} atualizado com sucesso`);
      
      return setorAtualizado;
    } catch (error) {
      this.logger.error(`Erro ao atualizar setor ${id}: ${error.message}`, error.stack);
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException('Falha ao atualizar setor. Por favor, tente novamente.');
    }
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
