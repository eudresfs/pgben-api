import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TipoBeneficio } from '../entities/tipo-beneficio.entity';
import { RequisitoDocumento } from '../entities/requisito-documento.entity';
import { FluxoBeneficio } from '../entities/fluxo-beneficio.entity';
import { CreateTipoBeneficioDto } from '../dto/create-tipo-beneficio.dto';
import { UpdateTipoBeneficioDto } from '../dto/update-tipo-beneficio.dto';
import { CreateRequisitoDocumentoDto } from '../dto/create-requisito-documento.dto';
import { ConfigurarFluxoDto } from '../dto/configurar-fluxo.dto';

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
  ) {}

  /**
   * Lista todos os tipos de benefícios com paginação e filtros
   */
  async findAll(options: {
    page?: number;
    limit?: number;
    search?: string;
    ativo?: boolean;
  }) {
    const { page = 1, limit = 10, search, ativo } = options;
    
    const queryBuilder = this.tipoBeneficioRepository.createQueryBuilder('tipo_beneficio');
    
    // Aplicar filtros
    if (search) {
      queryBuilder.where('tipo_beneficio.nome ILIKE :search', { search: `%${search}%` });
    }
    
    if (ativo !== undefined) {
      queryBuilder.andWhere('tipo_beneficio.ativo = :ativo', { ativo });
    }
    
    // Calcular paginação
    const skip = (page - 1) * limit;
    queryBuilder.skip(skip).take(limit);
    
    // Ordenação padrão
    queryBuilder.orderBy('tipo_beneficio.created_at', 'DESC');
    
    // Executar consulta
    const [items, total] = await queryBuilder.getManyAndCount();
    
    return {
      items,
      meta: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Busca um tipo de benefício pelo ID
   */
  async findById(id: string) {
    const tipoBeneficio = await this.tipoBeneficioRepository.findOne({
      where: { id },
      relations: ['requisitos_documentos'],
    });
    
    if (!tipoBeneficio) {
      throw new NotFoundException(`Tipo de benefício com ID ${id} não encontrado`);
    }
    
    return tipoBeneficio;
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
      throw new ConflictException(`Já existe um tipo de benefício com o nome '${createTipoBeneficioDto.nome}'`);
    }
    
    // Criar novo tipo de benefício
    const tipoBeneficio = this.tipoBeneficioRepository.create(createTipoBeneficioDto);
    return this.tipoBeneficioRepository.save(tipoBeneficio);
  }

  /**
   * Atualiza um tipo de benefício existente
   */
  async update(id: string, updateTipoBeneficioDto: UpdateTipoBeneficioDto) {
    // Verificar se o benefício existe
    const tipoBeneficio = await this.findById(id);
    
    // Se estiver alterando o nome, verificar se já existe outro com o mesmo nome
    if (updateTipoBeneficioDto.nome && updateTipoBeneficioDto.nome !== tipoBeneficio.nome) {
      const existingBeneficio = await this.tipoBeneficioRepository.findOne({
        where: { nome: updateTipoBeneficioDto.nome },
      });
      
      if (existingBeneficio && existingBeneficio.id !== id) {
        throw new ConflictException(`Já existe um tipo de benefício com o nome '${updateTipoBeneficioDto.nome}'`);
      }
    }
    
    // Atualizar e salvar
    Object.assign(tipoBeneficio, updateTipoBeneficioDto);
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
      order: { obrigatorio: 'DESC', nome: 'ASC' },
    });
  }

  /**
   * Adiciona requisito documental a um benefício
   */
  async addRequisito(beneficioId: string, createRequisitoDocumentoDto: CreateRequisitoDocumentoDto) {
    // Verificar se o benefício existe
    const tipoBeneficio = await this.findById(beneficioId);
    
    // Verificar se já existe um requisito com o mesmo nome para este benefício
    const existingRequisito = await this.requisitoDocumentoRepository.findOne({
      where: { 
        nome: createRequisitoDocumentoDto.nome,
        tipo_beneficio: { id: beneficioId }
      },
    });
    
    if (existingRequisito) {
      throw new ConflictException(`Já existe um requisito com o nome '${createRequisitoDocumentoDto.nome}' para este benefício`);
    }
    
    // Criar e salvar o requisito
    const requisito = this.requisitoDocumentoRepository.create({
      ...createRequisitoDocumentoDto,
      tipo_beneficio: tipoBeneficio,
    });
    
    return this.requisitoDocumentoRepository.save(requisito);
  }

  /**
   * Configura fluxo de aprovação de um benefício
   */
  async configurarFluxo(beneficioId: string, configurarFluxoDto: ConfigurarFluxoDto) {
    // Verificar se o benefício existe
    const tipoBeneficio = await this.findById(beneficioId);
    
    // Validar etapas do fluxo
    if (!configurarFluxoDto.etapas || configurarFluxoDto.etapas.length === 0) {
      throw new BadRequestException('O fluxo deve conter pelo menos uma etapa');
    }
    
    // Verificar se já existe um fluxo para este benefício
    let fluxo = await this.fluxoBeneficioRepository.findOne({
      where: { tipo_beneficio: { id: beneficioId } },
    });
    
    if (fluxo) {
      // Atualizar fluxo existente
      fluxo.etapas = configurarFluxoDto.etapas;
      fluxo.descricao = configurarFluxoDto.descricao;
    } else {
      // Criar novo fluxo
      fluxo = this.fluxoBeneficioRepository.create({
        tipo_beneficio: tipoBeneficio,
        etapas: configurarFluxoDto.etapas,
        descricao: configurarFluxoDto.descricao,
      });
    }
    
    return this.fluxoBeneficioRepository.save(fluxo);
  }
}
