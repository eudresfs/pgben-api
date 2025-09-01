import { Injectable } from '@nestjs/common';
import { Repository, DataSource, Like, MoreThan } from 'typeorm';
import { Tag } from '../entities/tag.entity';
import { TagFilterDto } from '../dto/tag.dto';

/**
 * Repository customizado para a entidade Tag
 */
@Injectable()
export class TagRepository extends Repository<Tag> {
  constructor(private dataSource: DataSource) {
    super(Tag, dataSource.createEntityManager());
  }

  /**
   * Busca tags com filtros
   */
  async findWithFilters(filters: TagFilterDto): Promise<Tag[]> {
    const {
      nome,
      categoria,
      ativo,
      popular,
      uso_minimo,
      limite = 50
    } = filters;

    const queryBuilder = this.createQueryBuilder('tag');

    // Aplicar filtros
    if (nome) {
      queryBuilder.andWhere('tag.nome ILIKE :nome', { nome: `%${nome}%` });
    }

    if (categoria) {
      queryBuilder.andWhere('tag.categoria = :categoria', { categoria });
    }

    if (typeof ativo === 'boolean') {
      queryBuilder.andWhere('tag.ativo = :ativo', { ativo });
    }

    if (popular) {
      queryBuilder.andWhere('tag.contador_uso >= :popular_threshold', {
        popular_threshold: 10
      });
    }

    if (uso_minimo !== undefined) {
      queryBuilder.andWhere('tag.contador_uso >= :uso_minimo', { uso_minimo });
    }

    // Ordenar por uso e ordem de exibição
    queryBuilder
      .orderBy('tag.ordem_exibicao', 'ASC')
      .addOrderBy('tag.contador_uso', 'DESC')
      .addOrderBy('tag.nome', 'ASC');

    // Aplicar limite
    queryBuilder.take(limite);

    return queryBuilder.getMany();
  }

  /**
   * Busca tags ativas ordenadas por popularidade
   */
  async findAtivas(limite: number = 50): Promise<Tag[]> {
    return this.find({
      where: { ativo: true },
      order: {
        ordem_exibicao: 'ASC',
        contador_uso: 'DESC',
        nome: 'ASC'
      },
      take: limite
    });
  }

  /**
   * Busca tags populares (usadas mais de 10 vezes)
   */
  async findPopulares(limite: number = 20): Promise<Tag[]> {
    return this.find({
      where: {
        ativo: true,
        contador_uso: MoreThan(10)
      },
      order: {
        contador_uso: 'DESC',
        nome: 'ASC'
      },
      take: limite
    });
  }

  /**
   * Busca tags por categoria
   */
  async findByCategoria(categoria: string, limite: number = 30): Promise<Tag[]> {
    return this.find({
      where: {
        categoria,
        ativo: true
      },
      order: {
        ordem_exibicao: 'ASC',
        contador_uso: 'DESC',
        nome: 'ASC'
      },
      take: limite
    });
  }

  /**
   * Busca tags por nome (busca parcial)
   */
  async findByNome(nome: string, limite: number = 20): Promise<Tag[]> {
    return this.find({
      where: {
        nome: Like(`%${nome.toLowerCase()}%`),
        ativo: true
      },
      order: {
        contador_uso: 'DESC',
        nome: 'ASC'
      },
      take: limite
    });
  }

  /**
   * Busca ou cria uma tag pelo nome
   */
  async findOrCreate(nome: string, categoria?: string): Promise<Tag> {
    const nomeNormalizado = nome.toLowerCase().trim();
    
    let tag = await this.findOne({
      where: { nome: nomeNormalizado }
    });

    if (!tag) {
      tag = this.create({
        nome: nomeNormalizado,
        categoria: categoria?.toLowerCase().trim(),
        ativo: true,
        contador_uso: 0,
        sugerida_sistema: false,
        ordem_exibicao: 0
      });
      tag = await this.save(tag);
    }

    return tag;
  }

  /**
   * Incrementa o contador de uso de uma tag
   */
  async incrementarUso(id: string): Promise<void> {
    await this.increment({ id }, 'contador_uso', 1);
  }

  /**
   * Decrementa o contador de uso de uma tag
   */
  async decrementarUso(id: string): Promise<void> {
    await this.createQueryBuilder()
      .update(Tag)
      .set({
        contador_uso: () => 'GREATEST(contador_uso - 1, 0)'
      })
      .where('id = :id', { id })
      .execute();
  }

  /**
   * Obtém todas as categorias disponíveis
   */
  async getCategorias(): Promise<string[]> {
    const result = await this.createQueryBuilder('tag')
      .select('DISTINCT tag.categoria', 'categoria')
      .where('tag.categoria IS NOT NULL')
      .andWhere('tag.ativo = :ativo', { ativo: true })
      .orderBy('tag.categoria', 'ASC')
      .getRawMany();

    return result.map(row => row.categoria).filter(Boolean);
  }

  /**
   * Gera sugestões de tags baseadas em texto
   */
  async gerarSugestoes(
    texto: string,
    maxSugestoes: number = 5
  ): Promise<Tag[]> {
    const palavrasChave = this.extrairPalavrasChave(texto);
    const sugestoes: Tag[] = [];
    const tagsEncontradas = new Set<string>();

    // Buscar tags que contenham as palavras-chave
    for (const palavra of palavrasChave) {
      if (sugestoes.length >= maxSugestoes) break;

      const tags = await this.find({
        where: {
          nome: Like(`%${palavra}%`),
          ativo: true
        },
        order: {
          contador_uso: 'DESC',
          nome: 'ASC'
        },
        take: 3
      });

      for (const tag of tags) {
        if (!tagsEncontradas.has(tag.id) && sugestoes.length < maxSugestoes) {
          sugestoes.push(tag);
          tagsEncontradas.add(tag.id);
        }
      }
    }

    // Se não encontrou sugestões suficientes, buscar tags populares
    if (sugestoes.length < maxSugestoes) {
      const tagsPopulares = await this.findPopulares(maxSugestoes - sugestoes.length);
      
      for (const tag of tagsPopulares) {
        if (!tagsEncontradas.has(tag.id) && sugestoes.length < maxSugestoes) {
          sugestoes.push(tag);
          tagsEncontradas.add(tag.id);
        }
      }
    }

    return sugestoes;
  }

  /**
   * Remove tags não utilizadas (contador_uso = 0)
   */
  async removerNaoUtilizadas(): Promise<number> {
    const result = await this.delete({
      contador_uso: 0,
      ativo: true
    });

    return result.affected || 0;
  }

  /**
   * Obtém estatísticas das tags
   */
  async getEstatisticas(): Promise<{
    total: number;
    ativas: number;
    populares: number;
    por_categoria: Record<string, number>;
    mais_usadas: Tag[];
  }> {
    const [total, ativas, populares] = await Promise.all([
      this.count(),
      this.count({ where: { ativo: true } }),
      this.count({ where: { ativo: true, contador_uso: MoreThan(10) } })
    ]);

    // Contar por categoria
    const categorias = await this.getCategorias();
    const porCategoria: Record<string, number> = {};
    
    for (const categoria of categorias) {
      porCategoria[categoria] = await this.count({
        where: { categoria, ativo: true }
      });
    }

    // Tags mais usadas
    const maisUsadas = await this.find({
      where: { ativo: true },
      order: { contador_uso: 'DESC' },
      take: 10
    });

    return {
      total,
      ativas,
      populares,
      por_categoria: porCategoria,
      mais_usadas: maisUsadas
    };
  }

  /**
   * Extrai palavras-chave de um texto para sugestões
   */
  private extrairPalavrasChave(texto: string): string[] {
    // Palavras comuns que devem ser ignoradas
    const stopWords = new Set([
      'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from',
      'has', 'he', 'in', 'is', 'it', 'its', 'of', 'on', 'that', 'the',
      'to', 'was', 'will', 'with', 'o', 'a', 'os', 'as', 'um', 'uma',
      'de', 'do', 'da', 'dos', 'das', 'em', 'no', 'na', 'nos', 'nas',
      'para', 'por', 'com', 'sem', 'que', 'quando', 'onde', 'como'
    ]);

    return texto
      .toLowerCase()
      .replace(/[^a-záàâãéèêíìîóòôõúùûç\s]/g, '') // Remove caracteres especiais
      .split(/\s+/) // Divide por espaços
      .filter(palavra => palavra.length >= 3 && !stopWords.has(palavra)) // Remove palavras curtas e stop words
      .slice(0, 10); // Limita a 10 palavras-chave
  }
}