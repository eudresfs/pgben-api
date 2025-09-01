import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Tag } from '../entities/tag.entity';
import { TagRepository } from '../repositories/tag.repository';
import {
  CreateTagDto,
  UpdateTagDto,
  TagFilterDto,
  TagSugestionsDto
} from '../dto/tag.dto';
import { TagResponseDto } from '../dto/tag.dto';

/**
 * Service para gerenciar tags
 */
@Injectable()
export class TagService {
  constructor(
    @InjectRepository(Tag)
    private readonly tagRepository: TagRepository
  ) {}

  /**
   * Cria uma nova tag
   */
  async create(createTagDto: CreateTagDto): Promise<TagResponseDto> {
    const { nome, descricao, categoria, cor, ordem_exibicao } = createTagDto;

    // Verificar se já existe uma tag com o mesmo nome
    const existingTag = await this.tagRepository.findOne({
      where: { nome: nome.toLowerCase().trim() }
    });

    if (existingTag) {
      throw new BadRequestException('Já existe uma tag com este nome');
    }

    // Criar nova tag
    const tag = this.tagRepository.create({
      nome: nome.toLowerCase().trim(),
      descricao,
      categoria: categoria?.toLowerCase().trim(),
      cor,
      ordem_exibicao: ordem_exibicao || 0,
      ativo: true,
      contador_uso: 0,
      sugerida_sistema: false
    });

    const savedTag = await this.tagRepository.save(tag);
    return this.mapToResponseDto(savedTag);
  }

  /**
   * Busca todas as tags com filtros
   */
  async findAll(filters: TagFilterDto): Promise<TagResponseDto[]> {
    const tags = await this.tagRepository.findWithFilters(filters);
    return tags.map(tag => this.mapToResponseDto(tag));
  }

  /**
   * Busca uma tag por ID
   */
  async findOne(id: string): Promise<TagResponseDto> {
    const tag = await this.tagRepository.findOne({
      where: { id, ativo: true }
    });

    if (!tag) {
      throw new NotFoundException('Tag não encontrada');
    }

    return this.mapToResponseDto(tag);
  }

  /**
   * Atualiza uma tag
   */
  async update(id: string, updateTagDto: UpdateTagDto): Promise<TagResponseDto> {
    const tag = await this.tagRepository.findOne({
      where: { id }
    });

    if (!tag) {
      throw new NotFoundException('Tag não encontrada');
    }

    // Verificar se o novo nome já existe (se fornecido)
    if (updateTagDto.nome) {
      const existingTag = await this.tagRepository.findOne({
        where: { nome: updateTagDto.nome.toLowerCase().trim() }
      });

      if (existingTag && existingTag.id !== id) {
        throw new BadRequestException('Já existe uma tag com este nome');
      }
    }

    // Atualizar campos
    Object.assign(tag, {
      ...updateTagDto,
      nome: updateTagDto.nome?.toLowerCase().trim() || tag.nome,
      categoria: updateTagDto.categoria?.toLowerCase().trim() || tag.categoria
    });

    const updatedTag = await this.tagRepository.save(tag);
    return this.mapToResponseDto(updatedTag);
  }

  /**
   * Remove uma tag (marca como inativa)
   */
  async remove(id: string): Promise<void> {
    const tag = await this.tagRepository.findOne({
      where: { id }
    });

    if (!tag) {
      throw new NotFoundException('Tag não encontrada');
    }

    // Verificar se a tag pode ser removida
    if (!tag.podeSerRemovida()) {
      throw new BadRequestException(
        'Esta tag não pode ser removida pois está sendo muito utilizada'
      );
    }

    // Marcar como inativa
    tag.ativo = false;
    await this.tagRepository.save(tag);
  }

  /**
   * Busca tags ativas
   */
  async findAtivas(limite?: number): Promise<TagResponseDto[]> {
    const tags = await this.tagRepository.findAtivas(limite);
    return tags.map(tag => this.mapToResponseDto(tag));
  }

  /**
   * Busca tags populares
   */
  async findPopulares(limite?: number): Promise<TagResponseDto[]> {
    const tags = await this.tagRepository.findPopulares(limite);
    return tags.map(tag => this.mapToResponseDto(tag));
  }

  /**
   * Busca tags por categoria
   */
  async findByCategoria(categoria: string, limite?: number): Promise<TagResponseDto[]> {
    const tags = await this.tagRepository.findByCategoria(categoria, limite);
    return tags.map(tag => this.mapToResponseDto(tag));
  }

  /**
   * Busca tags por nome
   */
  async findByNome(nome: string, limite?: number): Promise<TagResponseDto[]> {
    const tags = await this.tagRepository.findByNome(nome, limite);
    return tags.map(tag => this.mapToResponseDto(tag));
  }

  /**
   * Obtém todas as categorias disponíveis
   */
  async getCategorias(): Promise<string[]> {
    return this.tagRepository.getCategorias();
  }

  /**
   * Gera sugestões de tags baseadas em texto
   */
  async gerarSugestoes(sugestionsDto: TagSugestionsDto): Promise<TagResponseDto[]> {
    const { texto, max_sugestoes } = sugestionsDto;
    const tags = await this.tagRepository.gerarSugestoes(texto, max_sugestoes);
    return tags.map(tag => this.mapToResponseDto(tag));
  }

  /**
   * Busca ou cria tags pelo nome
   */
  async findOrCreateTags(
    nomes: string[],
    categoria?: string
  ): Promise<Tag[]> {
    const tags: Tag[] = [];

    for (const nome of nomes) {
      if (!nome || nome.trim().length === 0) continue;

      const tag = await this.tagRepository.findOrCreate(
        nome.trim(),
        categoria
      );
      tags.push(tag);
    }

    return tags;
  }

  /**
   * Incrementa o contador de uso de múltiplas tags
   */
  async incrementarUsoTags(tagIds: string[]): Promise<void> {
    const promises = tagIds.map(id => 
      this.tagRepository.incrementarUso(id)
    );
    await Promise.all(promises);
  }

  /**
   * Decrementa o contador de uso de múltiplas tags
   */
  async decrementarUsoTags(tagIds: string[]): Promise<void> {
    const promises = tagIds.map(id => 
      this.tagRepository.decrementarUso(id)
    );
    await Promise.all(promises);
  }

  /**
   * Obtém estatísticas das tags
   */
  async getEstatisticas(): Promise<{
    total: number;
    ativas: number;
    populares: number;
    por_categoria: Record<string, number>;
    mais_usadas: TagResponseDto[];
  }> {
    const stats = await this.tagRepository.getEstatisticas();
    
    return {
      ...stats,
      mais_usadas: stats.mais_usadas.map(tag => this.mapToResponseDto(tag))
    };
  }

  /**
   * Remove tags não utilizadas
   */
  async limparTagsNaoUtilizadas(): Promise<number> {
    return this.tagRepository.removerNaoUtilizadas();
  }

  /**
   * Valida uma lista de IDs de tags
   */
  async validateTagIds(tagIds: string[]): Promise<Tag[]> {
    if (!tagIds || tagIds.length === 0) {
      return [];
    }

    const tags = await this.tagRepository.findByIds(tagIds);
    
    // Verificar se todas as tags foram encontradas
    const foundIds = tags.map(tag => tag.id);
    const missingIds = tagIds.filter(id => !foundIds.includes(id));
    
    if (missingIds.length > 0) {
      throw new BadRequestException(
        `Tags não encontradas: ${missingIds.join(', ')}`
      );
    }

    // Verificar se todas as tags estão ativas
    const inactiveTags = tags.filter(tag => !tag.ativo);
    if (inactiveTags.length > 0) {
      throw new BadRequestException(
        `Tags inativas: ${inactiveTags.map(t => t.nome).join(', ')}`
      );
    }

    return tags;
  }

  /**
   * Normaliza nomes de tags
   */
  normalizeTagNames(names: string[]): string[] {
    return names
      .filter(name => name && name.trim().length > 0)
      .map(name => name.toLowerCase().trim())
      .filter((name, index, array) => array.indexOf(name) === index); // Remove duplicatas
  }

  /**
   * Cria tags do sistema baseadas em padrões comuns
   */
  async criarTagsSistema(): Promise<void> {
    const tagsSistema = [
      // Tags de tipo
      { nome: 'bug', categoria: 'tipo', cor: '#dc2626', descricao: 'Problema ou erro no sistema' },
      { nome: 'melhoria', categoria: 'tipo', cor: '#2563eb', descricao: 'Sugestão de melhoria' },
      { nome: 'recurso', categoria: 'tipo', cor: '#16a34a', descricao: 'Nova funcionalidade' },
      { nome: 'dúvida', categoria: 'tipo', cor: '#ca8a04', descricao: 'Dúvida sobre o sistema' },
      
      // Tags de área
      { nome: 'interface', categoria: 'area', cor: '#7c3aed', descricao: 'Interface do usuário' },
      { nome: 'performance', categoria: 'area', cor: '#dc2626', descricao: 'Performance do sistema' },
      { nome: 'segurança', categoria: 'area', cor: '#dc2626', descricao: 'Questões de segurança' },
      { nome: 'usabilidade', categoria: 'area', cor: '#2563eb', descricao: 'Facilidade de uso' },
      
      // Tags de prioridade
      { nome: 'urgente', categoria: 'prioridade', cor: '#dc2626', descricao: 'Requer atenção imediata' },
      { nome: 'importante', categoria: 'prioridade', cor: '#ea580c', descricao: 'Alta prioridade' },
      { nome: 'normal', categoria: 'prioridade', cor: '#16a34a', descricao: 'Prioridade normal' }
    ];

    for (const tagData of tagsSistema) {
      const existingTag = await this.tagRepository.findOne({
        where: { nome: tagData.nome }
      });

      if (!existingTag) {
        const tag = this.tagRepository.create({
          ...tagData,
          ativo: true,
          contador_uso: 0,
          sugerida_sistema: true,
          ordem_exibicao: 0
        });
        
        await this.tagRepository.save(tag);
      }
    }
  }

  /**
   * Mapeia entidade para DTO de resposta
   */
  private mapToResponseDto(tag: Tag): TagResponseDto {
    return {
      id: tag.id,
      nome: tag.nome,
      nome_formatado: tag.getNomeFormatado(),
      descricao: tag.descricao,
      categoria: tag.categoria,
      cor: tag.cor,
      contador_uso: tag.contador_uso,
      ativo: tag.ativo,
      sugerida_sistema: tag.sugerida_sistema,
      ordem_exibicao: tag.ordem_exibicao,
      popular: tag.isPopular(),
      is_popular: tag.isPopular(),
      created_at: tag.created_at,
      updated_at: tag.updated_at
    };
  }
}