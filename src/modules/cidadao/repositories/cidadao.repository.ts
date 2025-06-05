import {
  Injectable,
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Repository, DataSource } from 'typeorm';
import { Cidadao } from '../../../entities/cidadao.entity';
import { ComposicaoFamiliar } from '../../../entities/composicao-familiar.entity';
import { EntityNotFoundException } from '../../../shared/exceptions';

/**
 * Repositório de cidadãos
 *
 * Responsável por operações de acesso a dados relacionadas a cidadãos
 */
@Injectable()
export class CidadaoRepository {
  private repository: Repository<Cidadao>;

  constructor(private dataSource: DataSource) {
    this.repository = this.dataSource.getRepository(Cidadao);
  }

  /**
   * Busca todos os cidadãos com filtros e paginação tradicional por offset
   * @param options Opções de filtro e paginação
   * @returns Lista de cidadãos paginada e contagem total
   */
  async findAll(options?: {
    skip?: number;
    take?: number;
    where?: any;
    order?: any;
    includeRelations?: boolean;
    specificFields?: string[];
  }): Promise<[Cidadao[], number]> {
    const {
      skip = 0,
      take = 10,
      where = {},
      order = { created_at: 'DESC' },
      includeRelations = false,
      specificFields = [],
    } = options || {};

    const queryBuilder = this.repository.createQueryBuilder('cidadao');

    // Selecionar apenas campos necessários se especificados
    if (specificFields.length > 0) {
      const fields = specificFields.map((field) => `cidadao.${field}`);
      queryBuilder.select(fields);
    }

    // Aplicar filtros de busca otimizados
    if (where.$or) {
      const searchConditions = where.$or.map(
        (condition: any, index: number) => {
          const paramKey = `search_${index}`;
          if (condition.nome) {
            queryBuilder.setParameter(
              paramKey,
              condition.nome.$iLike.replace(/%/g, ''),
            );
            return `cidadao.nome ILIKE '%' || :${paramKey} || '%'`;
          }
          if (condition.cpf) {
            queryBuilder.setParameter(
              paramKey,
              condition.cpf.$iLike.replace(/%/g, ''),
            );
            return `cidadao.cpf ILIKE '%' || :${paramKey} || '%'`;
          }
          if (condition.nis) {
            queryBuilder.setParameter(
              paramKey,
              condition.nis.$iLike.replace(/%/g, ''),
            );
            return `cidadao.nis ILIKE '%' || :${paramKey} || '%'`;
          }
          return '1=0';
        },
      );
      queryBuilder.andWhere(`(${searchConditions.join(' OR ')})`);
      delete where.$or;
    }

    // Aplicar filtros de endereço
    if (where['endereco.bairro']) {
      queryBuilder.andWhere("cidadao.endereco->>'bairro' ILIKE :bairro", {
        bairro: `%${where['endereco.bairro'].$iLike.replace(/%/g, '')}%`,
      });
      delete where['endereco.bairro'];
    }

    // Aplicar outros filtros
    Object.keys(where).forEach((key) => {
      if (where[key] !== undefined) {
        queryBuilder.andWhere(`cidadao.${key} = :${key}`, {
          [key]: where[key],
        });
      }
    });

    // Incluir relacionamentos apenas se necessário
    if (includeRelations) {
      queryBuilder
        .leftJoinAndSelect(
          'cidadao.papeis',
          'papeis',
          'papeis.ativo = :papelAtivo',
          { papelAtivo: true },
        )
        .leftJoinAndSelect('cidadao.composicao_familiar', 'composicao_familiar')
        .leftJoinAndSelect('cidadao.unidade', 'unidade')
        .leftJoinAndSelect('cidadao.solicitacoes', 'solicitacoes')
        .leftJoinAndSelect('solicitacoes.tipo_beneficio', 'tipo_beneficio')
        .leftJoinAndSelect('solicitacoes.documentos', 'solicitacao_documentos')
        .leftJoinAndSelect('cidadao.documentos', 'documentos')
        .leftJoinAndSelect('cidadao.dados_sociais', 'dados_sociais');
    }

    // Aplicar ordenação
    Object.keys(order).forEach((key) => {
      queryBuilder.addOrderBy(`cidadao.${key}`, order[key]);
    });

    // Aplicar paginação
    queryBuilder.skip(skip).take(take);

    // Gerar log da query em desenvolvimento para debug
    if (process.env.NODE_ENV === 'development') {
      const [query, parameters] = queryBuilder.getQueryAndParameters();
      console.log('Query gerada:', query);
      console.log('Parâmetros:', parameters);
    }

    return queryBuilder.getManyAndCount();
  }

  /**
   * Busca um cidadão pelo ID com relacionamentos otimizados
   * @param id ID do cidadão
   * @param includeRelations Se deve incluir relacionamentos (papéis, composição familiar)
   * @returns Cidadão encontrado ou null
   */
  async findById(
    id: string,
    includeRelations = false,
    specificFields?: string[],
  ): Promise<Cidadao | null> {
    const query = this.repository
      .createQueryBuilder('cidadao')
      .where('cidadao.id = :id', { id });

    // Selecionar apenas campos específicos se solicitado
    if (specificFields && specificFields.length > 0) {
      const fields = specificFields.map((field) => `cidadao.${field}`);
      query.select(fields);
    }

    if (includeRelations) {
      query
        .leftJoinAndSelect(
          'cidadao.papeis',
          'papeis',
          'papeis.ativo = :papelAtivo',
          { papelAtivo: true },
        )
        .leftJoinAndSelect('cidadao.composicao_familiar', 'composicao_familiar')
        .leftJoinAndSelect('cidadao.unidade', 'unidade')
        .leftJoinAndSelect('cidadao.solicitacoes', 'solicitacoes')
        .leftJoinAndSelect('solicitacoes.tipo_beneficio', 'tipo_beneficio')
        .leftJoinAndSelect('solicitacoes.documentos', 'solicitacao_documentos')
        .leftJoinAndSelect('cidadao.documentos', 'documentos')
        .leftJoinAndSelect('cidadao.dados_sociais', 'dados_sociais');
    }

    // Log em ambiente de desenvolvimento
    if (process.env.NODE_ENV === 'development') {
      const [queryStr, parameters] = query.getQueryAndParameters();
      console.log('Query findById:', queryStr);
      console.log('Parâmetros:', parameters);
    }

    return query.getOne();
  }

  /**
   * Busca um cidadão pelo CPF
   * @param cpf CPF do cidadão
   * @param includeRelations Se deve incluir relacionamentos (papéis, composição familiar)
   * @returns Cidadão encontrado ou null
   */
  async findByCpf(
    cpf: string,
    includeRelations = false,
    specificFields?: string[],
  ): Promise<Cidadao | null> {
    // Normaliza o CPF removendo caracteres não numéricos
    const cpfNormalizado = cpf.replace(/\D/g, '');

    const query = this.repository
      .createQueryBuilder('cidadao')
      .where('cidadao.cpf = :cpf', { cpf: cpfNormalizado });

    // Selecionar apenas campos específicos se solicitado
    if (specificFields && specificFields.length > 0) {
      const fields = specificFields.map((field) => `cidadao.${field}`);
      query.select(fields);
    }

    if (includeRelations) {
      query
        .leftJoinAndSelect(
          'cidadao.papeis',
          'papeis',
          'papeis.ativo = :papelAtivo',
          { papelAtivo: true },
        )
        .leftJoinAndSelect('cidadao.composicao_familiar', 'composicao_familiar')
        .leftJoinAndSelect('cidadao.unidade', 'unidade')
        .leftJoinAndSelect('cidadao.solicitacoes', 'solicitacoes')
        .leftJoinAndSelect('solicitacoes.tipo_beneficio', 'tipo_beneficio')
        .leftJoinAndSelect('solicitacoes.documentos', 'solicitacao_documentos')
        .leftJoinAndSelect('cidadao.documentos', 'documentos')
        .leftJoinAndSelect('cidadao.dados_sociais', 'dados_sociais');
    }

    // Usar cache para CPF (identificador único e frequentemente consultado)
    query.cache(true);

    return query.getOne();
  }

  /**
   * Busca cidadão por NIS
   * @param nis NIS do cidadão
   * @param includeRelations Se deve incluir relacionamentos
   * @returns Cidadão encontrado ou null
   */
  async findByNis(
    nis: string,
    includeRelations = false,
    specificFields?: string[],
  ): Promise<Cidadao | null> {
    // Normaliza o NIS removendo caracteres não numéricos
    const nisNormalizado = nis.replace(/\D/g, '');

    const query = this.repository
      .createQueryBuilder('cidadao')
      .where('cidadao.nis = :nis', { nis: nisNormalizado });

    // Selecionar apenas campos específicos se solicitado
    if (specificFields && specificFields.length > 0) {
      const fields = specificFields.map((field) => `cidadao.${field}`);
      query.select(fields);
    }

    if (includeRelations) {
      query
        .leftJoinAndSelect(
          'cidadao.papeis',
          'papeis',
          'papeis.ativo = :papelAtivo',
          { papelAtivo: true },
        )
        .leftJoinAndSelect('cidadao.composicao_familiar', 'composicao_familiar')
        .leftJoinAndSelect('cidadao.unidade', 'unidade')
        .leftJoinAndSelect('cidadao.solicitacoes', 'solicitacoes')
        .leftJoinAndSelect('solicitacoes.tipo_beneficio', 'tipo_beneficio')
        .leftJoinAndSelect('solicitacoes.documentos', 'solicitacao_documentos')
        .leftJoinAndSelect('cidadao.documentos', 'documentos')
        .leftJoinAndSelect('cidadao.dados_sociais', 'dados_sociais');
    }

    // Usar cache para NIS (identificador único e frequentemente consultado)
    query.cache(true);

    return query.getOne();
  }

  /**
   * Busca cidadão por telefone
   * @param telefone Telefone do cidadão
   * @param includeRelations Se deve incluir relacionamentos
   * @returns Cidadão encontrado ou null
   */
  async findByTelefone(
    telefone: string,
    includeRelations = false,
    specificFields?: string[],
  ): Promise<Cidadao | null> {
    // Normaliza o telefone removendo caracteres não numéricos
    const telefoneNormalizado = telefone.replace(/\D/g, '');

    const query = this.repository
      .createQueryBuilder('cidadao')
      .where('cidadao.telefone = :telefone', { telefone: telefoneNormalizado });

    // Selecionar apenas campos específicos se solicitado
    if (specificFields && specificFields.length > 0) {
      const fields = specificFields.map((field) => `cidadao.${field}`);
      query.select(fields);
    }

    if (includeRelations) {
      query
        .leftJoinAndSelect(
          'cidadao.papeis',
          'papeis',
          'papeis.ativo = :papelAtivo',
          { papelAtivo: true },
        )
        .leftJoinAndSelect('cidadao.composicao_familiar', 'composicao_familiar')
        .leftJoinAndSelect('cidadao.unidade', 'unidade')
        .leftJoinAndSelect('cidadao.solicitacoes', 'solicitacoes')
        .leftJoinAndSelect('solicitacoes.tipo_beneficio', 'tipo_beneficio')
        .leftJoinAndSelect('solicitacoes.documentos', 'solicitacao_documentos')
        .leftJoinAndSelect('cidadao.documentos', 'documentos')
        .leftJoinAndSelect('cidadao.dados_sociais', 'dados_sociais');
    }

    return query.getOne();
  }

  /**
   * Busca cidadão por nome (busca parcial)
   * @param nome Nome do cidadão
   * @param includeRelations Se deve incluir relacionamentos
   * @returns Lista de cidadãos encontrados
   */
  async findByNome(
    nome: string,
    includeRelations = false,
    specificFields?: string[],
  ): Promise<Cidadao[]> {
    const query = this.repository
      .createQueryBuilder('cidadao')
      .where('LOWER(cidadao.nome) ILIKE LOWER(:nome)', { nome: `%${nome}%` })
      .orderBy('cidadao.nome', 'ASC')
      .limit(50); // Limitar resultados para performance

    // Selecionar apenas campos específicos se solicitado
    if (specificFields && specificFields.length > 0) {
      const fields = specificFields.map((field) => `cidadao.${field}`);
      query.select(fields);
    }

    if (includeRelations) {
      query
        .leftJoinAndSelect(
          'cidadao.papeis',
          'papeis',
          'papeis.ativo = :papelAtivo',
          { papelAtivo: true },
        )
        .leftJoinAndSelect('cidadao.composicao_familiar', 'composicao_familiar')
        .leftJoinAndSelect('cidadao.unidade', 'unidade')
        .leftJoinAndSelect('cidadao.solicitacoes', 'solicitacoes')
        .leftJoinAndSelect('solicitacoes.tipo_beneficio', 'tipo_beneficio')
        .leftJoinAndSelect('solicitacoes.documentos', 'solicitacao_documentos')
        .leftJoinAndSelect('cidadao.documentos', 'documentos')
        .leftJoinAndSelect('cidadao.dados_sociais', 'dados_sociais');
    }

    // Log em desenvolvimento
    if (process.env.NODE_ENV === 'development') {
      const [queryStr, parameters] = query.getQueryAndParameters();
      console.log('Query findByNome:', queryStr);
    }

    return query.getMany();
  }

  /**
   * Busca cidadãos com paginação via cursor para melhor performance com grandes volumes de dados
   *
   * @param options Opções de paginação e filtro
   * @returns Lista de cidadãos e informações de paginação via cursor
   */
  async findByCursor(options: {
    cursor?: string;
    limit?: number;
    orderBy?: string;
    orderDirection?: 'ASC' | 'DESC';
    where?: any;
    includeRelations?: boolean;
    specificFields?: string[];
  }): Promise<{
    items: Cidadao[];
    count: number;
    nextCursor?: string;
    hasNextPage: boolean;
  }> {
    const {
      cursor,
      limit = 10,
      orderBy = 'created_at',
      orderDirection = 'DESC',
      where = {},
      includeRelations = false,
      specificFields = [],
    } = options;

    // Validar limite máximo para evitar sobrecarga do banco
    const validLimit = Math.min(limit, 100);

    const queryBuilder = this.repository.createQueryBuilder('cidadao');

    // Selecionar apenas campos específicos se definidos
    if (specificFields.length > 0) {
      const fields = specificFields.map((field) => `cidadao.${field}`);
      queryBuilder.select(fields);
    }

    // Aplicar filtros
    Object.keys(where).forEach((key) => {
      if (where[key] !== undefined) {
        if (key === 'nome' && typeof where[key] === 'string') {
          queryBuilder.andWhere(`LOWER(cidadao.${key}) ILIKE LOWER(:${key})`, {
            [key]: `%${where[key]}%`,
          });
        } else if (
          key === 'endereco.bairro' &&
          typeof where[key] === 'string'
        ) {
          queryBuilder.andWhere("cidadao.endereco->>'bairro' ILIKE :bairro", {
            bairro: `%${where[key]}%`,
          });
        } else if (
          key === 'endereco.cidade' &&
          typeof where[key] === 'string'
        ) {
          queryBuilder.andWhere("cidadao.endereco->>'cidade' ILIKE :cidade", {
            cidade: `%${where[key]}%`,
          });
        } else {
          queryBuilder.andWhere(`cidadao.${key} = :${key}`, {
            [key]: where[key],
          });
        }
      }
    });

    // Aplicar filtro de cursor para paginação
    if (cursor) {
      // Para ordenamento DESC, precisamos obter registros < cursor
      // Para ordenamento ASC, precisamos obter registros > cursor
      const operator = orderDirection === 'DESC' ? '<' : '>';

      // Para timestamps
      if (orderBy === 'created_at' || orderBy === 'updated_at') {
        queryBuilder.andWhere(
          `cidadao.${orderBy} ${operator} (SELECT ${orderBy} FROM cidadao WHERE id = :cursorId)`,
          { cursorId: cursor },
        );
      }
      // Para campos string ou numéricos
      else {
        queryBuilder.andWhere(
          `cidadao.${orderBy} ${operator} (SELECT ${orderBy} FROM cidadao WHERE id = :cursorId)`,
          { cursorId: cursor },
        );
      }
    }

    // Incluir relacionamentos conforme solicitado
    if (includeRelations) {
      queryBuilder
        .leftJoinAndSelect(
          'cidadao.papeis',
          'papeis',
          'papeis.ativo = :papelAtivo',
          { papelAtivo: true },
        )
        .leftJoinAndSelect('cidadao.composicao_familiar', 'composicao_familiar')
        .leftJoinAndSelect('cidadao.unidade', 'unidade');
    }

    // Ordenar resultados
    queryBuilder.orderBy(`cidadao.${orderBy}`, orderDirection);

    // Adicionar ordenação secundária pelo ID para garantir determinismo quando há valores iguais
    queryBuilder.addOrderBy('cidadao.id', orderDirection);

    // Aplicar limite
    queryBuilder.take(validLimit + 1); // +1 para verificar se há mais páginas

    // Executar query
    const items = await queryBuilder.getMany();

    // Verificar se há mais páginas
    const hasNextPage = items.length > validLimit;
    if (hasNextPage) {
      items.pop(); // Remover o item extra que foi usado para verificar se há mais páginas
    }

    // Definir cursor para a próxima página
    const nextCursor = hasNextPage ? items[items.length - 1]?.id : undefined;

    // Obter contagem aproximada para metadados
    const countQuery = this.repository.createQueryBuilder('cidadao');
    // Aplicar os mesmos filtros que a query principal
    Object.keys(where).forEach((key) => {
      if (where[key] !== undefined) {
        if (key === 'nome' && typeof where[key] === 'string') {
          countQuery.andWhere(`LOWER(cidadao.${key}) ILIKE LOWER(:${key})`, {
            [key]: `%${where[key]}%`,
          });
        } else if (
          key === 'endereco.bairro' &&
          typeof where[key] === 'string'
        ) {
          countQuery.andWhere("cidadao.endereco->>'bairro' ILIKE :bairro", {
            bairro: `%${where[key]}%`,
          });
        } else if (
          key === 'endereco.cidade' &&
          typeof where[key] === 'string'
        ) {
          countQuery.andWhere("cidadao.endereco->>'cidade' ILIKE :cidade", {
            cidade: `%${where[key]}%`,
          });
        } else {
          countQuery.andWhere(`cidadao.${key} = :${key}`, {
            [key]: where[key],
          });
        }
      }
    });

    // Usar estimate quando possível para maior performance
    const count = await countQuery.getCount();

    return {
      items,
      count: items.length,
      nextCursor,
      hasNextPage,
    };
  }

  /**
   * Cria um novo cidadão
   * @param data Dados do cidadão
   * @returns Cidadão criado
   */
  async create(data: Partial<Cidadao>): Promise<Cidadao> {
    // Normaliza o CPF removendo caracteres não numéricos
    if (data.cpf) {
      data.cpf = data.cpf.replace(/\D/g, '');
    }

    // Normaliza o NIS removendo caracteres não numéricos
    if (data.nis) {
      data.nis = data.nis.replace(/\D/g, '');
    }

    // Normaliza o enum sexo para minúsculo
    if (data.sexo) {
      data.sexo = data.sexo.toLowerCase() as any;
    }

    const cidadao = this.repository.create(data);
    return this.repository.save(cidadao);
  }

  /**
   * Atualiza um cidadão existente
   * @param id ID do cidadão
   * @param data Dados a serem atualizados
   * @returns Cidadão atualizado
   * @throws NotFoundException se o cidadão não for encontrado
   */
  async update(id: string, data: Partial<Cidadao>): Promise<Cidadao> {
    // Normaliza o CPF removendo caracteres não numéricos
    if (data.cpf) {
      data.cpf = data.cpf.replace(/\D/g, '');
    }

    // Normaliza o NIS removendo caracteres não numéricos
    if (data.nis) {
      data.nis = data.nis.replace(/\D/g, '');
    }

    // Normaliza o enum sexo para minúsculo
    if (data.sexo) {
      data.sexo = data.sexo.toLowerCase() as any;
    }

    const updateResult = await this.repository.update(id, data);

    if (updateResult.affected === 0) {
      throw new NotFoundException('Cidadão não encontrado');
    }

    const cidadao = await this.findById(id, true);
    if (!cidadao) {
      throw new NotFoundException('Cidadão não encontrado após atualização');
    }
    return cidadao;
  }

  /**
   * Adiciona membro à composição familiar
   * @param id ID do cidadão
   * @param membro Dados do membro familiar
   * @returns Cidadão atualizado
   */
  async addComposicaoFamiliar(id: string, membro: any): Promise<Cidadao> {
    const cidadao = await this.findById(id, false); // Não precisa de relacionamentos para validação

    if (!cidadao) {
      throw new EntityNotFoundException('Cidadão', id);
    }

    // Verificar se já existe membro com o mesmo nome na composição familiar
    const composicaoFamiliarRepository =
      this.dataSource.getRepository(ComposicaoFamiliar);
    const membroExistente = await composicaoFamiliarRepository.findOne({
      where: {
        cidadao_id: id,
        nome: membro.nome,
      },
    });

    if (membroExistente) {
      throw new BadRequestException(
        `Já existe um membro com o nome '${membro.nome}' na composição familiar deste cidadão`,
      );
    }

    // Verificar se já existe membro com o mesmo CPF na composição familiar
    const cpfFormatado = membro.cpf?.replace(/\D/g, '');
    if (cpfFormatado) {
      const membroComMesmoCpf = await composicaoFamiliarRepository.findOne({
        where: {
          cidadao_id: id,
          cpf: cpfFormatado,
        },
      });

      if (membroComMesmoCpf) {
        throw new BadRequestException(
          `Já existe um membro com o CPF '${cpfFormatado}' na composição familiar deste cidadão`,
        );
      }
    }

    // Criar nova entrada na tabela composicao_familiar
    // O cidadao_id vem do parâmetro da rota, não do body
    const novoMembro = composicaoFamiliarRepository.create({
      cidadao_id: id,
      nome: membro.nome,
      cpf: cpfFormatado,
      nis: membro.nis?.replace(/\D/g, ''),
      idade: membro.idade,
      ocupacao: membro.ocupacao,
      escolaridade: membro.escolaridade,
      parentesco: membro.parentesco,
      renda: membro.renda || 0,
      observacoes: membro.observacoes,
    });

    try {
      await composicaoFamiliarRepository.save(novoMembro);
    } catch (error) {
      // Capturar erro específico da trigger de exclusividade de papel
      if (
        error.message &&
        error.message.includes(
          'Cidadão não pode ser adicionado à composição familiar, pois já é beneficiário',
        )
      ) {
        throw new ConflictException(
          'Cidadão não pode ser adicionado à composição familiar pois já possui papel de beneficiário.',
        );
      }

      // Capturar erros de violação de restrição de unicidade
      if (error.code === '23505') {
        // Código PostgreSQL para violação de restrição única
        throw new BadRequestException(
          `Não foi possível adicionar o membro à composição familiar. Já existe um membro com o mesmo nome ou CPF.`,
        );
      }

      // Capturar erros de violação de chave estrangeira
      if (error.code === '23503') {
        throw new BadRequestException(
          'Dados inválidos fornecidos para o membro da composição familiar.',
        );
      }

      throw error;
    }

    // Retornar cidadão atualizado com relacionamentos
    const cidadaoAtualizado = await this.findById(id, true);
    if (!cidadaoAtualizado) {
      throw new EntityNotFoundException('Cidadão', id);
    }
    return cidadaoAtualizado;
  }

  /**
   * Remove um cidadão (soft delete)
   * @param id ID do cidadão
   * @returns Resultado da operação
   */
  async remove(id: string): Promise<void> {
    await this.repository.softDelete(id);
  }
}
