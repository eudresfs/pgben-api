import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not, In } from 'typeorm';
import { TipoBeneficio } from '../../../entities/tipo-beneficio.entity';
import { RequisitoDocumento } from '../../../entities/requisito-documento.entity';
import { FluxoBeneficio } from '../../../entities/fluxo-beneficio.entity';
import { Solicitacao } from '../../../entities/solicitacao.entity';
import { Concessao } from '../../../entities/concessao.entity';
import { Cidadao } from '../../../entities/cidadao.entity';
import { CreateTipoBeneficioDto } from '../dto/create-tipo-beneficio.dto';
import { UpdateTipoBeneficioDto } from '../dto/update-tipo-beneficio.dto';
import { CreateRequisitoDocumentoDto } from '../dto/create-requisito-documento.dto';
import { UpdateRequisitoDocumentoDto } from '../dto/update-requisito-documento.dto';
import { Status, TipoDocumentoEnum, StatusSolicitacao, StatusConcessao } from '@/enums';
import { normalizeEnumFields } from '../../../shared/utils/enum-normalizer.util';
import { TipoBeneficioSchema } from '../../../entities/tipo-beneficio-schema.entity';
import { BeneficioFiltrosAvancadosDto, BeneficioFiltrosResponseDto } from '../dto/beneficio-filtros-avancados.dto';
import { 
  VerificarDisponibilidadeBeneficioResponseDto,
  DisponibilidadeBeneficioDto 
} from '../dto/verificar-disponibilidade-beneficio.dto';
import { FiltrosAvancadosService } from '../../../common/services/filtros-avancados.service';

/**
 * Serviço de Benefícios
 *
 * Responsável pela lógica de negócio relacionada aos tipos de benefícios,
 * requisitos documentais e fluxos de aprovação.
 */
@Injectable()
export class BeneficioService {
  constructor(
    @InjectRepository(TipoBeneficio)
    private tipoBeneficioRepository: Repository<TipoBeneficio>,

    @InjectRepository(RequisitoDocumento)
    private requisitoDocumentoRepository: Repository<RequisitoDocumento>,

    @InjectRepository(FluxoBeneficio)
    private fluxoBeneficioRepository: Repository<FluxoBeneficio>,

    @InjectRepository(TipoBeneficioSchema)
    private tipoBeneficioSchemaRepository: Repository<TipoBeneficioSchema>,

    @InjectRepository(Solicitacao)
    private solicitacaoRepository: Repository<Solicitacao>,

    @InjectRepository(Concessao)
    private concessaoRepository: Repository<Concessao>,

    @InjectRepository(Cidadao)
    private cidadaoRepository: Repository<Cidadao>,

    private filtrosAvancadosService: FiltrosAvancadosService,
  ) {}

  /**
   * Lista todos os tipos de benefícios com paginação e filtros
   * Inclui schema ativo e requisitos de documento para cada benefício
   */
  async findAll(options: {
    page?: number;
    limit?: number;
    search?: string;
    status?: Status;
  }) {
    const { page = 1, limit = 10, search, status } = options;

    const queryBuilder = this.tipoBeneficioRepository
      .createQueryBuilder('tipo_beneficio')
      .leftJoinAndSelect(
        'tipo_beneficio.requisito_documento',
        'requisito_documento',
      );

    // Aplicar filtros
    if (search) {
      queryBuilder.where('tipo_beneficio.nome ILIKE :search', {
        search: `%${search}%`,
      });
    }

    if (status !== undefined) {
      queryBuilder.andWhere('tipo_beneficio.status = :status', { status });
    }

    // Calcular paginação
    const skip = (page - 1) * limit;
    queryBuilder.skip(skip).take(limit);

    // Ordenação padrão
    queryBuilder.orderBy('tipo_beneficio.created_at', 'DESC');

    // Executar consulta
    const result = await queryBuilder.getManyAndCount();
    const items = result[0];
    const total = result[1];

    // Enriquecer cada item com schema ativo
    const itemsEnriquecidos = await Promise.all(
      items.map(async (item) => {
        // Obter schema ativo para o tipo de benefício
        const schemaAtivo = await this.tipoBeneficioSchemaRepository.findOne({
          where: { tipo_beneficio_id: item.id, status: Status.ATIVO },
        });

        return {
          ...item,
          schema: schemaAtivo,
        };
      }),
    );

    return {
      items: itemsEnriquecidos,
      meta: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Busca um tipo de benefício por ID com schema
   */
  async findById(id: string) {
    const tipoBeneficio = await this.tipoBeneficioRepository.findOne({
      where: { id },
      relations: ['requisito_documento'],
    });

    if (!tipoBeneficio) {
      throw new NotFoundException(
        `Tipo de benefício com ID ${id} não encontrado`,
      );
    }

    // Obter schema ativo do benefício
    const schema = await this.tipoBeneficioSchemaRepository.findOne({
      where: { tipo_beneficio_id: id, status: Status.ATIVO },
    });

    return {
      ...tipoBeneficio,
      schema: schema ? { ...schema.schema_estrutura } : null,
    };
  }

  /**
   * Cria um novo tipo de benefício
   */
  async create(createTipoBeneficioDto: CreateTipoBeneficioDto) {
    // Verificar se já existe um benefício com o mesmo nome
    const existingBeneficio = await this.tipoBeneficioRepository.findOne({
      where: { nome: createTipoBeneficioDto.nome },
    });

    if (existingBeneficio) {
      throw new ConflictException(
        `Já existe um tipo de benefício com o nome '${createTipoBeneficioDto.nome}'`,
      );
    }

    // Normalizar campos de enum antes de criar
    const normalizedData = normalizeEnumFields(createTipoBeneficioDto);

    // Gera um código se não for fornecido
    if (!normalizedData.codigo) {
      normalizedData.codigo = normalizedData.nome
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // Remove accents
        .toUpperCase()
        .replace(/\s+/g, '_'); // Replace spaces with underscore
    }

    // Define o status como ativo por padrão
    if (!normalizedData.status) {
      normalizedData.status = Status.ATIVO;
    }

    // Criar novo tipo de benefício
    const tipoBeneficio = this.tipoBeneficioRepository.create(normalizedData);
    return this.tipoBeneficioRepository.save(tipoBeneficio);
  }

  /**
   * Atualiza um tipo de benefício existente
   */
  async update(id: string, updateTipoBeneficioDto: UpdateTipoBeneficioDto) {
    // Verificar se o benefício existe
    const tipoBeneficio = await this.findById(id);

    // Se estiver alterando o nome, verificar se já existe outro com o mesmo nome
    if (
      updateTipoBeneficioDto.nome &&
      updateTipoBeneficioDto.nome !== tipoBeneficio.nome
    ) {
      const existingBeneficio = await this.tipoBeneficioRepository.findOne({
        where: { nome: updateTipoBeneficioDto.nome },
      });

      if (existingBeneficio && existingBeneficio.id !== id) {
        throw new ConflictException(
          `Já existe um tipo de benefício com o nome '${updateTipoBeneficioDto.nome}'`,
        );
      }
    }

    // Normalizar campos de enum antes de atualizar
    const normalizedData = normalizeEnumFields(updateTipoBeneficioDto);

    // Atualizar e salvar
    Object.assign(tipoBeneficio, normalizedData);
    return this.tipoBeneficioRepository.save(tipoBeneficio);
  }

  /**
   * Lista requisitos documentais de um benefício
   */
  async findRequisitosByBeneficioId(beneficioId: string) {
    // Verificar se o benefício existe
    await this.findById(beneficioId);

    // Buscar requisitos
    return this.requisitoDocumentoRepository.find({
      where: { tipo_beneficio: { id: beneficioId } },
      order: { obrigatorio: 'DESC', tipo_documento: 'ASC' },
    });
  }

  /**
   * Adiciona requisito documental a um benefício
   */
  async addRequisito(
    beneficioId: string,
    createRequisitoDocumentoDto: CreateRequisitoDocumentoDto,
  ) {
    // Verificar se o benefício existe
    const tipoBeneficio = await this.findById(beneficioId);

    // Verificar se já existe um requisito com o mesmo tipo de documento para este benefício
    const existingRequisito = await this.requisitoDocumentoRepository.findOne({
      where: {
        tipo_documento: createRequisitoDocumentoDto.tipo_documento,
        tipo_beneficio: { id: beneficioId },
      },
    });

    if (existingRequisito) {
      throw new ConflictException(
        `Já existe um requisito com o tipo de documento '${createRequisitoDocumentoDto.tipo_documento}' para este benefício`,
      );
    }

    // Validar URL do template se fornecida
    if (createRequisitoDocumentoDto.template_url) {
      try {
        new URL(createRequisitoDocumentoDto.template_url);
      } catch {
        throw new BadRequestException('URL do template inválida');
      }
    }

    // Criar e salvar o requisito
    const requisito = this.requisitoDocumentoRepository.create({
      ...createRequisitoDocumentoDto,
      tipo_beneficio: tipoBeneficio,
    });

    return this.requisitoDocumentoRepository.save(requisito);
  }

  /**
   * Atualiza um requisito documental de um benefício
   */
  async updateRequisito(
    beneficioId: string,
    requisitoId: string,
    updateRequisitoDocumentoDto: UpdateRequisitoDocumentoDto,
  ) {
    // Verificar se o benefício existe
    await this.findById(beneficioId);

    // Verificar se o requisito existe e pertence ao benefício
    const requisito = await this.requisitoDocumentoRepository.findOne({
      where: {
        id: requisitoId,
        tipo_beneficio: { id: beneficioId },
      },
    });

    if (!requisito) {
      throw new NotFoundException(
        `Requisito com ID ${requisitoId} não encontrado para o benefício ${beneficioId}`,
      );
    }

    // Validar URL do template se fornecida
    if (updateRequisitoDocumentoDto.template_url) {
      try {
        new URL(updateRequisitoDocumentoDto.template_url);
      } catch {
        throw new BadRequestException('URL do template inválida');
      }
    }

    // Verificar se está tentando alterar o tipo de documento para um que já existe
    if (
      updateRequisitoDocumentoDto.tipo_documento &&
      updateRequisitoDocumentoDto.tipo_documento !== requisito.tipo_documento
    ) {
      const existingRequisito = await this.requisitoDocumentoRepository.findOne(
        {
          where: {
            tipo_documento: updateRequisitoDocumentoDto.tipo_documento,
            tipo_beneficio: { id: beneficioId },
            id: Not(requisitoId),
          },
        },
      );

      if (existingRequisito) {
        throw new ConflictException(
          `Já existe um requisito com o tipo de documento '${updateRequisitoDocumentoDto.tipo_documento}' para este benefício`,
        );
      }
    }

    // Atualizar o requisito
    Object.assign(requisito, updateRequisitoDocumentoDto);
    return this.requisitoDocumentoRepository.save(requisito);
  }

  /**
   * Remove um requisito documental de um benefício
   */
  async removeRequisito(beneficioId: string, requisitoId: string) {
    // Verificar se o benefício existe
    await this.findById(beneficioId);

    // Verificar se o requisito existe e pertence ao benefício
    const requisito = await this.requisitoDocumentoRepository.findOne({
      where: {
        id: requisitoId,
        tipo_beneficio: { id: beneficioId },
      },
    });

    if (!requisito) {
      throw new NotFoundException(
        `Requisito com ID ${requisitoId} não encontrado para o benefício ${beneficioId}`,
      );
    }

    // Remover o requisito
    await this.requisitoDocumentoRepository.remove(requisito);

    return {
      message: 'Requisito removido com sucesso',
      requisitoId,
    };
  }

  /**
   * Obtém informações do template de um requisito documental
   */
  async getTemplateInfo(beneficioId: string, requisitoId: string) {
    // Verificar se o benefício existe
    await this.findById(beneficioId);

    // Verificar se o requisito existe e pertence ao benefício
    const requisito = await this.requisitoDocumentoRepository.findOne({
      where: {
        id: requisitoId,
        tipo_beneficio: { id: beneficioId },
      },
    });

    if (!requisito) {
      throw new NotFoundException(
        `Requisito com ID ${requisitoId} não encontrado para o benefício ${beneficioId}`,
      );
    }

    // Retornar informações do template usando os métodos da entidade
    return {
      temTemplate: requisito.temTemplate(),
      template_url: requisito.template_url,
      template_nome: requisito.getNomeTemplate(),
      template_descricao: requisito.getDescricaoTemplate(),
      extensao: requisito.getExtensaoTemplate(),
      ehPdf: requisito.templateEhPdf(),
      ehImagem: requisito.templateEhImagem(),
      ehDocumentoOffice: requisito.templateEhDocumentoOffice(),
      templateCompleto: requisito.templateEstaCompleto(),
      infoTemplate: requisito.getInfoTemplate(),
    };
  }

  /**
   * Aplica filtros avançados para busca de benefícios
   * Implementa busca otimizada com múltiplos critérios e paginação
   * @param filtros Critérios de filtro avançados
   * @returns Resultado paginado com metadados
   */
  async filtrosAvancados(
    filtros: BeneficioFiltrosAvancadosDto,
  ): Promise<BeneficioFiltrosResponseDto> {
    const {
      page = 1,
      limit = 10,
      status,
      periodicidade,
      valor_min,
      valor_max,
      search,
      include_relations,
      data_inicio,
      data_fim,
    } = filtros;

    // Construir query base com relacionamentos opcionais
    const queryBuilder = this.tipoBeneficioRepository
      .createQueryBuilder('tipo_beneficio');

    // Incluir relacionamentos se solicitado
    if (include_relations?.includes('requisito_documento')) {
      queryBuilder.leftJoinAndSelect(
        'tipo_beneficio.requisito_documento',
        'requisito_documento',
      );
    }

    // Aplicar filtros de status
    if (status?.length) {
      queryBuilder.andWhere('tipo_beneficio.status IN (:...status)', {
        status,
      });
    }

    // Aplicar filtros de periodicidade
    if (periodicidade?.length) {
      queryBuilder.andWhere('tipo_beneficio.periodicidade IN (:...periodicidade)', {
        periodicidade,
      });
    }

    // Aplicar filtros de valor
    if (valor_min !== undefined) {
      queryBuilder.andWhere('tipo_beneficio.valor >= :valor_min', {
        valor_min,
      });
    }

    if (valor_max !== undefined) {
      queryBuilder.andWhere('tipo_beneficio.valor <= :valor_max', {
        valor_max,
      });
    }

    // Aplicar busca textual
    if (search) {
      queryBuilder.andWhere(
        '(tipo_beneficio.nome ILIKE :search OR tipo_beneficio.codigo ILIKE :search OR tipo_beneficio.descricao ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    // Aplicar filtros de data de criação
    if (data_inicio) {
      queryBuilder.andWhere('tipo_beneficio.created_at >= :data_inicio', {
        data_inicio,
      });
    }

    if (data_fim) {
      queryBuilder.andWhere('tipo_beneficio.created_at <= :data_fim', {
        data_fim,
      });
    }


    // Aplicar ordenação padrão
    queryBuilder.orderBy('tipo_beneficio.created_at', 'DESC');

    // Calcular paginação
    const offset = (page - 1) * limit;
    queryBuilder.skip(offset).take(limit);

    // Executar consulta
    const [items, total] = await queryBuilder.getManyAndCount();

    // Enriquecer cada item com schema ativo se não incluído nos relacionamentos
    const itemsEnriquecidos = await Promise.all(
      items.map(async (item) => {
        // Obter schema ativo para o tipo de benefício
        const schemaAtivo = await this.tipoBeneficioSchemaRepository.findOne({
          where: { tipo_beneficio_id: item.id, status: Status.ATIVO },
        });

        return {
          ...item,
          schema: schemaAtivo,
        };
      }),
    );

    // Construir filtros aplicados
    const filtros_aplicados: any = {};
    if (status?.length) filtros_aplicados.status = status;
    if (periodicidade?.length) filtros_aplicados.periodicidade = periodicidade;
    if (valor_min !== undefined) filtros_aplicados.valor_min = valor_min;
    if (valor_max !== undefined) filtros_aplicados.valor_max = valor_max;
    if (search) filtros_aplicados.search = search;
    if (include_relations?.length) filtros_aplicados.include_relations = include_relations;
    if (data_inicio) filtros_aplicados.data_inicio = data_inicio;
    if (data_fim) filtros_aplicados.data_fim = data_fim;

    // Construir metadados de paginação
    const pages = Math.ceil(total / limit);
    const hasNext = page < pages;
    const hasPrev = page > 1;

    return {
      items: itemsEnriquecidos,
      total,
      filtros_aplicados,
      meta: {
        limit,
        offset,
        page,
        pages,
        hasNext,
        hasPrev,
      },
      tempo_execucao: 0, // Será preenchido no controlador
    };
  }

  /**
   * Verifica a disponibilidade de todos os benefícios para um cidadão específico
   * @param cidadaoId ID do cidadão
   * @returns Lista de benefícios com informações de disponibilidade
   */
  async verificarDisponibilidade(
    cidadaoId: string,
  ): Promise<VerificarDisponibilidadeBeneficioResponseDto> {
    // Verificar se o cidadão existe
    const cidadao = await this.cidadaoRepository.findOne({
      where: { id: cidadaoId },
    });

    if (!cidadao) {
      throw new NotFoundException('Cidadão não encontrado');
    }

    // Buscar todos os benefícios ativos
    const beneficios = await this.tipoBeneficioRepository.find({
      where: { status: Status.ATIVO }
    });

    // Buscar solicitações em andamento do cidadão
    const solicitacoesEmAndamento = await this.solicitacaoRepository.find({
      where: {
        beneficiario_id: cidadaoId,
        status: In([
          StatusSolicitacao.RASCUNHO,
          StatusSolicitacao.ABERTA,
          StatusSolicitacao.EM_ANALISE,
          StatusSolicitacao.PENDENTE,
        ]),
      },
      relations: ['tipo_beneficio'],
    });

    // Buscar concessões em andamento do cidadão
    const concessoesEmAndamento = await this.concessaoRepository.find({
      where: {
        solicitacao: {
          beneficiario_id: cidadaoId,
        },
        status: In([
          StatusConcessao.APTO,
          StatusConcessao.ATIVO,
          StatusConcessao.SUSPENSO,
          StatusConcessao.BLOQUEADO,
        ]),
      },
      relations: ['solicitacao', 'solicitacao.tipo_beneficio'],
    });

    // Buscar última solicitação de cada benefício
    const ultimasSolicitacoes = await this.solicitacaoRepository
      .createQueryBuilder('solicitacao')
      .select([
        'solicitacao.tipo_beneficio_id',
        'MAX(solicitacao.updated_at) as ultimaData',
      ])
      .where('solicitacao.beneficiario_id = :cidadaoId', { cidadaoId })
      .groupBy('solicitacao.tipo_beneficio_id')
      .getRawMany();

    // Mapear benefícios com informações de disponibilidade
    const beneficiosComDisponibilidade: DisponibilidadeBeneficioDto[] = beneficios.map(
      (beneficio) => {
        // Verificar se há solicitação em andamento para este benefício
        const temSolicitacaoEmAndamento = solicitacoesEmAndamento.some(
          (solicitacao) => solicitacao.tipo_beneficio.id === beneficio.id,
        );

        // Verificar se há concessão em andamento para este benefício
        const temConcessaoEmAndamento = concessoesEmAndamento.some(
          (concessao) => concessao.solicitacao.tipo_beneficio.id === beneficio.id,
        );

        // Determinar disponibilidade
        const disponivel = !temSolicitacaoEmAndamento && !temConcessaoEmAndamento;

        // Buscar data da última solicitação
        const ultimaSolicitacao = ultimasSolicitacoes.find(
          (us) => us.tipo_beneficio_id === beneficio.id,
        );

        // Buscar status da última solicitação
        const ultimaSolicitacaoObj = solicitacoesEmAndamento.find(
          (sol) => sol.tipo_beneficio.id === beneficio.id,
        );

        // Buscar status da última concessão
        const ultimaConcessaoObj = concessoesEmAndamento.find(
          (con) => con.solicitacao.tipo_beneficio.id === beneficio.id,
        );

        return {
          id: beneficio.id,
          codigo: beneficio.codigo,
          nome: beneficio.nome,
          descricao: beneficio.descricao,
          valor: beneficio.valor,
          categoria: beneficio.categoria,
          categoriaLabel: beneficio.getCategoriaLabel(),
          categoriaDescricao: beneficio.getCategoriaDescricao(),
          disponivel,
          dataUltimaSolicitacao: ultimaSolicitacao?.ultimaData || null,
          motivoIndisponibilidade: disponivel ? null : 
            (temSolicitacaoEmAndamento ? 'Existe uma solicitação em andamento' : 
             temConcessaoEmAndamento ? 'Existe uma concessão em andamento' : null),
          statusUltimaSolicitacao: ultimaSolicitacaoObj?.status || null,
          statusUltimaConcessao: ultimaConcessaoObj?.status || null,
        };
      },
    );

    // Calcular estatísticas
    const totalBeneficios = beneficiosComDisponibilidade.length;
    const beneficiosDisponiveis = beneficiosComDisponibilidade.filter(b => b.disponivel).length;
    const beneficiosIndisponiveis = totalBeneficios - beneficiosDisponiveis;

    // Calcular resumo por categoria
    const resumoPorCategoria = beneficiosComDisponibilidade.reduce((acc, beneficio) => {
      const categoria = beneficio.categoria;
      if (!acc[categoria]) {
        acc[categoria] = { total: 0, disponiveis: 0, indisponiveis: 0 };
      }
      acc[categoria].total++;
      if (beneficio.disponivel) {
        acc[categoria].disponiveis++;
      } else {
        acc[categoria].indisponiveis++;
      }
      return acc;
    }, {} as Record<string, { total: number; disponiveis: number; indisponiveis: number }>);

    return {
      cidadaoId,
      dataConsulta: new Date(),
      totalBeneficios,
      beneficiosDisponiveis,
      beneficiosIndisponiveis,
      beneficios: beneficiosComDisponibilidade,
      resumoPorCategoria,
    };
  }
}
