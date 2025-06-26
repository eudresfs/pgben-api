import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { Repository, DataSource } from 'typeorm';
import { Cidadao } from '../../../entities/cidadao.entity';

export interface FindAllOptions {
  skip?: number;
  take?: number;
  search?: string;
  bairro?: string;
  unidade_id?: string;
  includeRelations?: boolean;
}

@Injectable()
export class CidadaoRepository {
  private repository: Repository<Cidadao>;

  constructor(private readonly dataSource: DataSource) {
    this.repository = this.dataSource.getRepository(Cidadao);
  }

  // Método principal simplificado
  async findAll(options: FindAllOptions = {}): Promise<[Cidadao[], number]> {
    const {
      skip = 0,
      take = 10,
      search,
      bairro,
      unidade_id,
      includeRelations = false
    } = options;

    const query = this.repository.createQueryBuilder('cidadao');

    // Filtro por unidade
    if (unidade_id) {
      query.andWhere('cidadao.unidade_id = :unidade_id', { unidade_id });
    }

    // Busca por nome/CPF/NIS - melhorada
    if (search && search.trim() !== '') {
      const searchTerm = search.trim();
      const searchClean = searchTerm.replace(/\D/g, ''); // Remove formatação para CPF/NIS
      
      // Log para debug
      console.log('🔍 Search term:', searchTerm);
      console.log('🔍 Search clean:', searchClean);
      
      const conditions: string[] = [];
      const parameters: any = {};

      // Busca por nome (case insensitive)
      conditions.push('LOWER(cidadao.nome) LIKE LOWER(:searchName)');
      parameters.searchName = `%${searchTerm}%`;

      // Busca por CPF (se o termo tem dígitos)
      if (searchClean.length > 0) {
        conditions.push('cidadao.cpf LIKE :searchCpf');
        parameters.searchCpf = `%${searchClean}%`;
      }

      // Busca por NIS (se o termo tem dígitos)
      if (searchClean.length > 0) {
        conditions.push('cidadao.nis LIKE :searchNis');
        parameters.searchNis = `%${searchClean}%`;
      }

      // Aplicar condições OR
      if (conditions.length > 0) {
        query.andWhere(`(${conditions.join(' OR ')})`, parameters);
      }
    }

    // Filtro por bairro
    if (bairro && bairro.trim() !== '') {
      query.andWhere("cidadao.endereco->>'bairro' ILIKE :bairro", {
        bairro: `%${bairro.trim()}%`
      });
    }

    // Relacionamentos
    if (includeRelations) {
      query.leftJoinAndSelect('cidadao.unidade', 'unidade');
      query.leftJoinAndSelect('cidadao.papeis', 'papeis');
      query.leftJoinAndSelect('cidadao.composicao_familiar', 'composicao_familiar');
    } else {
      // Sempre incluir unidade, mesmo quando includeRelations for false
      query.leftJoinAndSelect('cidadao.unidade', 'unidade');
    }

    // Log da query para debug
    const [sql, params] = query.getQueryAndParameters();
    console.log('🔍 SQL:', sql);
    console.log('🔍 Params:', params);

    return query
      .orderBy('cidadao.created_at', 'DESC')
      .skip(skip)
      .take(Math.min(take, 100))
      .getManyAndCount();
  }

  async findById(id: string, includeRelations = false): Promise<Cidadao | null> {
    const relations = includeRelations ? ['unidade', 'papeis', 'composicao_familiar'] : ['unidade'];
    return this.repository.findOne({
      where: { id },
      relations
    });
  }

  async findByCpf(cpf: string, includeRelations = false): Promise<Cidadao | null> {
    const cpfClean = cpf.replace(/\D/g, '');
    const relations = includeRelations ? ['unidade', 'papeis', 'composicao_familiar'] : ['unidade'];
    return this.repository.findOne({
      where: { cpf: cpfClean },
      relations
    });
  }

  async findByNis(nis: string, includeRelations = false): Promise<Cidadao | null> {
    const nisClean = nis.replace(/\D/g, '');
    const relations = includeRelations ? ['unidade', 'papeis', 'composicao_familiar'] : ['unidade'];
    return this.repository.findOne({
      where: { nis: nisClean },
      relations
    });
  }

  async create(data: Partial<Cidadao>): Promise<Cidadao> {
    // Verificar duplicatas
    if (data.cpf) {
      const existingCpf = await this.findByCpf(data.cpf);
      if (existingCpf) {
        throw new ConflictException('CPF já cadastrado');
      }
    }

    if (data.nis) {
      const existingNis = await this.findByNis(data.nis);
      if (existingNis) {
        throw new ConflictException('NIS já cadastrado');
      }
    }

    const cidadao = this.repository.create(data);
    return this.repository.save(cidadao);
  }

  async update(id: string, data: Partial<Cidadao>): Promise<Cidadao> {
    const exists = await this.repository.exist({ where: { id } });
    if (!exists) {
      throw new NotFoundException('Cidadão não encontrado');
    }

    await this.repository.update(id, data);
    return this.findById(id, true) as Promise<Cidadao>;
  }

  async remove(id: string): Promise<void> {
    const result = await this.repository.softDelete(id);
    if (result.affected === 0) {
      throw new NotFoundException('Cidadão não encontrado');
    }
  }

  async findAllBairros(): Promise<string[]> {
    try {
      const result = await this.dataSource.query(
        `SELECT DISTINCT (endereco->>'bairro') as bairro 
         FROM cidadao 
         WHERE endereco->>'bairro' IS NOT NULL 
           AND endereco->>'bairro' <> '' 
           AND removed_at IS NULL
         ORDER BY bairro ASC`
      );

      return result.map(item => item.bairro);
    } catch (error) {
      throw new Error('Erro ao buscar bairros');
    }
  }
}