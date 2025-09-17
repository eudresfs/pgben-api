import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { CidadaoRepository } from '../repositories/cidadao.repository';
import { CreateCidadaoDto } from '../dto/create-cidadao.dto';
import {
  CidadaoResponseDto,
  CidadaoPaginatedResponseDto,
} from '../dto/cidadao-response.dto';
import { plainToInstance } from 'class-transformer';
import { ContatoService } from './contato.service';
import { EnderecoService } from './endereco.service';
import { DadosSociaisService } from './dados-sociais.service';
import { SituacaoMoradiaService } from './situacao-moradia.service';
import { InfoBancariaService } from './info-bancaria.service';
import { ComposicaoFamiliarService } from './composicao-familiar.service';
import { ConfigService } from '@nestjs/config';
import { AuditEventEmitter, AuditEventType } from '../../auditoria';
import { Cidadao } from '../../../entities/cidadao.entity';
import { TransferirUnidadeDto } from '../dto/transferir-unidade.dto';
import {
  PortalTransparenciaResponseDto,
  DadosPortalTransparenciaDto,
  NovoBolsaFamiliaSacadoResponseDto,
} from '../dto/portal-transparencia-response.dto';
import { EnhancedCacheService } from '../../../shared/cache/enhanced-cache.service';
import { CidadaoFiltrosAvancadosDto, CidadaoFiltrosResponseDto } from '../dto/cidadao-filtros-avancados.dto';
import { SYSTEM_USER_UUID } from '../../../shared/constants/system.constants';

@Injectable()
export class CidadaoService {
  private readonly logger = new Logger(CidadaoService.name);

  constructor(
    private readonly cidadaoRepository: CidadaoRepository,
    private readonly contatoService: ContatoService,
    private readonly enderecoService: EnderecoService,
    private readonly dadosSociaisService: DadosSociaisService,
    private readonly situacaoMoradiaService: SituacaoMoradiaService,
    private readonly infoBancariaService: InfoBancariaService,
    private readonly composicaoFamiliarService: ComposicaoFamiliarService,
    private readonly configService: ConfigService,
    private readonly auditEmitter: AuditEventEmitter,
    private readonly httpService: HttpService,
    private readonly enhancedCacheService: EnhancedCacheService,
  ) { }

  async findAll(
    options: {
      page?: number;
      limit?: number;
      search?: string;
      bairro?: string;
      unidade_id?: string;
      includeRelations?: boolean;
      include_removed?: boolean;
    } = {},
  ): Promise<CidadaoPaginatedResponseDto> {
    const {
      page = 1,
      limit = 10,
      search,
      bairro,
      unidade_id,
      includeRelations = false,
      include_removed = false,
    } = options;

    const skip = (page - 1) * limit;
    const take = Math.min(limit, 100);

    const [cidadaos, total] = await this.cidadaoRepository.findAllWithFilters({
      skip,
      take,
      search,
      bairro,
      unidade_id,
      includeRelations,
      include_removed,
    });

    const items = cidadaos.map((cidadao) =>
      plainToInstance(CidadaoResponseDto, cidadao, {
        excludeExtraneousValues: true,
      }),
    );

    return {
      items,
      meta: {
        total,
        page,
        limit: take,
        pages: Math.ceil(total / take),
        hasNext: page < Math.ceil(total / take),
        hasPrev: page > 1,
      },
    };
  }

  async findById(
    id: string,
    includeRelations = false,
    userId?: string,
    includeRemoved = false,
  ): Promise<CidadaoResponseDto> {
    if (!id || typeof id !== 'string') {
      throw new BadRequestException('ID inválido');
    }

    const cidadao = await this.cidadaoRepository.findById(id, includeRelations, includeRemoved);
    if (!cidadao) {
      throw new NotFoundException('Cidadão não encontrado');
    }

    // Verificar se o cidadão foi removido e includeRemoved é false
    if (!includeRemoved && cidadao.foiRemovido()) {
      throw new NotFoundException('Cidadão não encontrado');
    }

    // Auditoria de acesso a dados sensíveis
    await this.auditEmitter.emitEntityAccessed('Cidadao', id, userId);

    return plainToInstance(CidadaoResponseDto, cidadao, {
      excludeExtraneousValues: true,
    });
  }

  async findByCpf(
    cpf: string,
    includeRelations = false,
    userId?: string,
    includeRemoved = false,
  ): Promise<CidadaoResponseDto | DadosPortalTransparenciaDto> {
    if (!cpf || cpf.trim() === '') {
      throw new BadRequestException('CPF é obrigatório');
    }

    const cpfClean = cpf.replace(/\D/g, '');
    if (cpfClean.length !== 11) {
      throw new BadRequestException('CPF deve ter 11 dígitos');
    }

    // Primeiro, tentar encontrar na base local
    const cidadao = await this.cidadaoRepository.findByCpfGlobal(
      cpfClean,
      includeRelations,
      includeRemoved,
    );

    if (cidadao) {
      // Verificar se o cidadão foi removido e includeRemoved é false
      if (!includeRemoved && cidadao.foiRemovido()) {
        // Continuar para busca no Portal da Transparência se cidadão foi removido
      } else {
        // Cidadão encontrado na base local
        // Auditoria de acesso a dados sensíveis por CPF
        await this.auditEmitter.emitSensitiveDataEvent(
          AuditEventType.SENSITIVE_DATA_ACCESSED,
          'Cidadao',
          cidadao.id,
          userId || SYSTEM_USER_UUID,
          ['cpf'],
          'Consulta por CPF - Base Local',
        );

        return plainToInstance(CidadaoResponseDto, cidadao, {
          excludeExtraneousValues: true,
        });
      }
    }

    // Fallback: consultar Portal da Transparência se não encontrado localmente
    this.logger.debug(`Cidadão não encontrado na base local para CPF: ${cpfClean.substring(0, 3)}***. Consultando Portal da Transparência...`);

    const dadosPortalTransparencia = await this.consultarPortalTransparencia(
      cpfClean,
      userId,
    );

    if (dadosPortalTransparencia) {
      this.logger.debug(`Dados encontrados no Portal da Transparência para CPF: ${cpfClean.substring(0, 3)}***`);
      return dadosPortalTransparencia;
    }

    // Se não encontrado em nenhuma fonte, lançar exceção
    this.logger.warn(`Cidadão não encontrado em nenhuma fonte para CPF: ${cpfClean.substring(0, 3)}***`);
    throw new NotFoundException('Cidadão não encontrado na base local nem no Portal da Transparência');
  }

  async findByNis(
    nis: string,
    includeRelations = false,
    userId?: string,
    includeRemoved = false,
  ): Promise<CidadaoResponseDto> {
    if (!nis || nis.trim() === '') {
      throw new BadRequestException('NIS é obrigatório');
    }

    const nisClean = nis.replace(/\D/g, '');
    if (nisClean.length !== 11) {
      throw new BadRequestException('NIS deve ter 11 dígitos');
    }

    const cidadao = await this.cidadaoRepository.findByNis(
      nisClean,
      includeRelations,
      includeRemoved,
    );
    if (!cidadao) {
      throw new NotFoundException('Cidadão não encontrado');
    }

    // Verificar se o cidadão foi removido e includeRemoved é false
    if (!includeRemoved && cidadao.foiRemovido()) {
      throw new NotFoundException('Cidadão não encontrado');
    }

    // Auditoria de acesso a dados sensíveis por NIS
    await this.auditEmitter.emitSensitiveDataEvent(
      AuditEventType.SENSITIVE_DATA_ACCESSED,
      'Cidadao',
      cidadao.id,
      userId || SYSTEM_USER_UUID,
      ['nis'],
      'Consulta por NIS',
    );

    return plainToInstance(CidadaoResponseDto, cidadao, {
      excludeExtraneousValues: true,
    });
  }

  /**
   * Consulta dados de pessoa física no Portal da Transparência
   * @param cpf CPF da pessoa física (apenas números)
   * @param userId ID do usuário que está fazendo a consulta (para auditoria)
   * @returns Dados consolidados do Portal da Transparência
   */
  async consultarPortalTransparencia(
    cpf: string,
    userId?: string,
  ): Promise<DadosPortalTransparenciaDto | null> {
    try {
      // Validar CPF
      if (!cpf || cpf.trim() === '') {
        throw new BadRequestException('CPF é obrigatório');
      }

      const cpfClean = cpf.replace(/\D/g, '');
      if (cpfClean.length !== 11) {
        throw new BadRequestException('CPF deve ter 11 dígitos');
      }

      // Verificar cache primeiro
      const cacheKey = `portal_transparencia:${cpfClean}`;
      const dadosCache = await this.enhancedCacheService.get<DadosPortalTransparenciaDto>(
        cacheKey,
        'portal_transparencia'
      );

      if (dadosCache) {
        this.logger.debug(`Dados encontrados no cache para CPF: ${cpfClean.substring(0, 3)}***`);
        return dadosCache;
      }

      // Obter chave da API do Portal da Transparência
      const apiKey = this.configService.get<string>('API_PORTAL_TRANSPARENCIA');
      if (!apiKey) {
        this.logger.warn('Chave da API do Portal da Transparência não configurada');
        return null;
      }

      // Configurar URL e headers da requisição
      const url = 'https://api.portaldatransparencia.gov.br/api-de-dados/pessoa-fisica';
      const headers = {
        'chave-api-dados': apiKey,
        'Accept': '*/json',
        'User-Agent': 'PGBEN-Server/1.0',
      };

      const params = {
        cpf: cpfClean,
      };

      // Realizar requisição HTTP
      const response = await firstValueFrom(
        this.httpService.get<PortalTransparenciaResponseDto>(url, {
          headers,
          params,
          timeout: 8000,
        }),
      );

      if (!response.data) {
        this.logger.warn('Portal da Transparência retornou resposta vazia');
        return null;
      }

      // Processar e consolidar dados
      const dadosConsolidados = await this.processarDadosPortalTransparencia(response.data, userId);
      dadosConsolidados.cpf = cpfClean;

      // Armazenar no cache com TTL de 6 horas (dados do Portal da Transparência são relativamente estáveis)
      await this.enhancedCacheService.set(
        cacheKey,
        dadosConsolidados,
        'portal_transparencia',
        6 * 60 * 60 // 6 horas em segundos
      );

      // Auditoria da consulta externa
      await this.auditEmitter.emitSensitiveDataEvent(
        AuditEventType.SENSITIVE_DATA_ACCESSED,
        'PortalTransparencia',
        cpfClean,
        userId || SYSTEM_USER_UUID,
        ['cpf', 'nome', 'nis', 'naturalidade'],
        'Consulta no Portal da Transparência',
      );

      this.logger.debug(`Dados obtidos do Portal da Transparência para CPF: ${dadosConsolidados.cpf}`);

      return dadosConsolidados;
    } catch (error) {
      // Log do erro sem expor dados sensíveis
      this.logger.error(
        `Erro ao consultar Portal da Transparência: ${error.message}`,
        error.stack,
      );

      // Se for erro de API (401, 403, etc.), retornar null ao invés de lançar exceção
      if (error.response?.status >= 400 && error.response?.status < 500) {
        this.logger.warn(
          `Erro de autenticação/autorização no Portal da Transparência: ${error.response.status}`,
        );
        return null;
      }

      // Para outros erros, também retornar null para não quebrar o fluxo
      return null;
    }
  }

  /**
   * Processa e consolida dados do Portal da Transparência
   * @param dados Dados brutos retornados pela API
   * @param userId ID do usuário para auditoria
   * @returns Dados consolidados e formatados
   */
  private async processarDadosPortalTransparencia(
    dados: PortalTransparenciaResponseDto,
    userId?: string,
  ): Promise<DadosPortalTransparenciaDto> {
    const beneficiosAtivos: string[] = [];
    const sancoes: string[] = [];
    const vinculosGovernamentais: string[] = [];

    // Mapear benefícios ativos
    if (dados.favorecidoBolsaFamilia) beneficiosAtivos.push('Bolsa Família');
    if (dados.favorecidoNovoBolsaFamilia) beneficiosAtivos.push('Novo Bolsa Família');
    if (dados.favorecidoAuxilioBrasil) beneficiosAtivos.push('Auxílio Brasil');
    if (dados.auxilioEmergencial) beneficiosAtivos.push('Auxílio Emergencial');
    if (dados.favorecidoBpc) beneficiosAtivos.push('BPC');
    if (dados.favorecidoPeti) beneficiosAtivos.push('PETI');
    if (dados.favorecidoSafra) beneficiosAtivos.push('Safra');
    if (dados.favorecidoSeguroDefeso) beneficiosAtivos.push('Seguro Defeso');
    if (dados.favorecidoAuxilioReconstrucao) beneficiosAtivos.push('Auxílio Reconstrução');
    if (dados.favorecidoTransferencias) beneficiosAtivos.push('Transferências Diretas');

    // Mapear sanções
    if (dados.sancionadoCEIS) sancoes.push('CEIS - Cadastro de Empresas Inidôneas e Suspensas');
    if (dados.sancionadoCNEP) sancoes.push('CNEP - Cadastro Nacional de Empresas Punidas');
    if (dados.sancionadoCEAF) sancoes.push('CEAF - Cadastro de Entidades sem Fins Lucrativos Impedidas');

    // Mapear vínculos governamentais
    if (dados.servidor) vinculosGovernamentais.push('Servidor Público Ativo');
    if (dados.servidorInativo) vinculosGovernamentais.push('Servidor Público Inativo');
    if (dados.favorecidoDespesas) vinculosGovernamentais.push('Favorecido de Despesas');
    if (dados.beneficiarioDiarias) vinculosGovernamentais.push('Beneficiário de Diárias');
    if (dados.permissionario) vinculosGovernamentais.push('Permissionário');
    if (dados.contratado) vinculosGovernamentais.push('Contratado');
    if (dados.participanteLicitacao) vinculosGovernamentais.push('Participante de Licitação');
    if (dados.pensionistaOuRepresentanteLegal) vinculosGovernamentais.push('Pensionista ou Representante Legal');
    if (dados.instituidorPensao) vinculosGovernamentais.push('Instituidor de Pensão');

    // Validar e filtrar NIS inválido
    // O Portal da Transparência pode retornar valores inválidos como "00000000000" ou "11111111111"
    const nisValido = this.validarNis(dados.nis);

    // Consultar dados do Novo Bolsa Família se o benefício estiver ativo e NIS for válido
    let novoBolsaFamiliaSacado: NovoBolsaFamiliaSacadoResponseDto[] = [];
    if (dados.favorecidoNovoBolsaFamilia && nisValido) {
      try {
        novoBolsaFamiliaSacado = await this.consultarNovoBolsaFamiliaSacado(
          nisValido,
          '202506',
          1,
          userId,
        );
      } catch (error) {
        this.logger.warn(
          `Erro ao consultar Novo Bolsa Família para NIS ${nisValido}: ${error.message}`,
        );
      }
    }

    return plainToInstance(DadosPortalTransparenciaDto, {
      cpf: dados.cpf,
      nome: dados.nome,
      nis: nisValido || undefined,
      naturalidade: novoBolsaFamiliaSacado.length > 0 ? novoBolsaFamiliaSacado[0].naturalidade : undefined,
      beneficiosAtivos,
      sancoes,
      vinculosGovernamentais,
      dadosBolsaFamilia: novoBolsaFamiliaSacado.length > 0 ? novoBolsaFamiliaSacado : undefined,
    }, {
      excludeExtraneousValues: true,
    });
  }

  /**
   * Valida se o NIS é válido, ignorando valores inválidos conhecidos
   * @param nis Número de Identificação Social
   * @returns NIS válido ou null se inválido
   */
  private validarNis(nis?: string): string | null {
    const nisClean = nis?.replace(/\D/g, '') ?? '';

    if (
      nisClean.length !== 11 ||
      /^(\d)\1{10}$/.test(nisClean) // repete o mesmo dígito 11 vezes
    ) {
      this.logger?.debug?.(`NIS inválido ignorado: ${nisClean}`);
      return null;
    }

    return nisClean;
  }

  /**
   * Consulta dados do Novo Bolsa Família sacado por NIS
   * @param nis Número de Identificação Social
   * @param anoMesReferencia Ano e mês de referência no formato YYYYMM
   * @param pagina Número da página para paginação
   * @param userId ID do usuário para auditoria
   * @returns Dados do Novo Bolsa Família sacado ou null se não encontrado
   */
  private async consultarNovoBolsaFamiliaSacado(
    nis: string,
    anoMesReferencia: string = '202506',
    pagina: number = 1,
    userId?: string,
  ): Promise<NovoBolsaFamiliaSacadoResponseDto[]> {
    try {
      // Obter chave da API do Portal da Transparência
      const apiKey = this.configService.get<string>('API_PORTAL_TRANSPARENCIA');
      if (!apiKey) {
        this.logger.warn('Chave da API do Portal da Transparência não configurada');
        return [];
      }

      // Configurar URL e headers da requisição
      const url = 'https://api.portaldatransparencia.gov.br/api-de-dados/novo-bolsa-familia-sacado-por-nis';
      const headers = {
        'chave-api-dados': apiKey,
        'Accept': 'application/json',
        'User-Agent': 'PGBEN-Server/1.0',
      };

      const params = {
        nis,
        anoMesReferencia,
        pagina: pagina.toString(),
      };

      // Realizar requisição HTTP
      const response = await firstValueFrom(
        this.httpService.get<NovoBolsaFamiliaSacadoResponseDto[]>(url, {
          headers,
          params,
          timeout: 8000,
        }),
      );

      if (!response.data || !Array.isArray(response.data)) {
        this.logger.warn('Portal da Transparência retornou resposta vazia para Novo Bolsa Família');
        return [];
      }

      // Adicionar propriedade naturalidade a cada item
      const dadosComNaturalidade = response.data.map(item => ({
        ...item,
        naturalidade: `${item.municipio.nomeIBGE}/${item.municipio.uf.nome}`,
      }));

      // Auditoria da consulta externa
      await this.auditEmitter.emitSensitiveDataEvent(
        AuditEventType.SENSITIVE_DATA_ACCESSED,
        'PortalTransparencia-NovoBolsaFamilia',
        nis,
        userId || SYSTEM_USER_UUID,
        ['nis', 'nome', 'cpf', 'valorSaque'],
        'Consulta do Novo Bolsa Família sacado por NIS',
      );

      this.logger.debug(`Dados do Novo Bolsa Família obtidos para NIS: ${nis}`);

      return dadosComNaturalidade;
    } catch (error) {
      // Log do erro sem expor dados sensíveis
      this.logger.error(
        `Erro ao consultar Novo Bolsa Família por NIS: ${error.message}`,
        error.stack,
      );

      // Se for erro de API (401, 403, etc.), retornar array vazio ao invés de lançar exceção
      if (error.response?.status >= 400 && error.response?.status < 500) {
        this.logger.warn(
          `Erro de autenticação/autorização no Portal da Transparência (Novo Bolsa Família): ${error.response.status}`,
        );
        return [];
      }

      // Para outros erros, também retornar array vazio para não quebrar o fluxo
      return [];
    }
  }

  async create(
    createCidadaoDto: CreateCidadaoDto,
    unidade_id: string,
    usuario_id: string,
  ): Promise<CidadaoResponseDto> {
    // Validações básicas
    if (!createCidadaoDto.cpf) {
      throw new BadRequestException('CPF é obrigatório');
    }

    const cpfClean = createCidadaoDto.cpf.replace(/\D/g, '');
    if (cpfClean.length !== 11) {
      throw new BadRequestException('CPF deve ter 11 dígitos');
    }

    let nisClean: string | undefined = undefined;
    if (createCidadaoDto.nis) {
      nisClean = createCidadaoDto.nis.replace(/\D/g, '');
      if (nisClean.length !== 11) {
        throw new BadRequestException('NIS deve ter 11 dígitos');
      }
    }

    // Verificar se já existe um cidadão com o CPF informado (incluindo removidos) - busca global
    const cidadaoExistente = await this.cidadaoRepository.findByCpfGlobal(cpfClean, false, true);

    if (cidadaoExistente) {
      // Se o cidadão foi removido, reativá-lo
      if (cidadaoExistente.foiRemovido()) {
        // Preparar dados para reativação
        const dadosReativacao: Partial<Cidadao> = {
          removed_at: null,
        };

        // Se o cidadão está em uma unidade diferente, transferir para a unidade atual
        if (cidadaoExistente.unidade_id !== unidade_id) {
          dadosReativacao.unidade_id = unidade_id;
        }

        // Aplicar dados de reativação ao cidadão existente
        Object.assign(cidadaoExistente, dadosReativacao);
        
        // Reativar o cidadão usando saveWithScope
        await this.cidadaoRepository.saveWithScope(cidadaoExistente);

        // Emitir evento de auditoria para reativação
        await this.auditEmitter.emitEntityUpdated(
          'Cidadao',
          cidadaoExistente.id,
          { 
            removed_at: cidadaoExistente.removed_at,
            unidade_id: cidadaoExistente.unidade_id 
          },
          dadosReativacao,
          usuario_id,
        );
      } else {
        // Cidadão existe e não foi removido - verificar se está na mesma unidade
        if (cidadaoExistente.unidade_id !== unidade_id) {
          throw new ConflictException(
            `CPF ${cpfClean} já está cadastrado em outra unidade. Entre em contato com o administrador para transferência.`
          );
        }
      }

      // Atualizar os dados do cidadão existente (upsert)
      return this.update(cidadaoExistente.id, createCidadaoDto, usuario_id);
    }

    // Separar campos que não pertencem à entidade Cidadao
    const {
      composicao_familiar,
      contatos,
      enderecos,
      dados_sociais,
      situacao_moradia,
      info_bancaria,
      ...cidadaoData
    } = createCidadaoDto;

    // Preparar dados para criação
    const dadosParaCriacao = {
      ...cidadaoData,
      cpf: cpfClean,
      nis: nisClean,
      unidade_id,
      usuario_id,
    };

    // Criar novo cidadão usando saveWithScope diretamente para evitar verificação de conflito
    const cidadaoSalvo = await this.cidadaoRepository.saveWithScope(dadosParaCriacao);

    // Processar contatos normalizados se existirem
    if (contatos && contatos.length > 0) {
      const contatosComCidadaoId = contatos.map((contato) => ({
        ...contato,
        cidadao_id: cidadaoSalvo.id,
      }));
      await this.contatoService.upsertMany(
        cidadaoSalvo.id,
        contatosComCidadaoId,
      );
    }

    // Processar endereços normalizados se existirem
    if (enderecos && enderecos.length > 0) {
      const enderecosComCidadaoId = enderecos.map((endereco) => ({
        ...endereco,
        cidadao_id: cidadaoSalvo.id,
      }));
      await this.enderecoService.upsertMany(
        cidadaoSalvo.id,
        enderecosComCidadaoId,
      );
    }

    // Processar composição familiar se fornecida
    if (composicao_familiar && composicao_familiar.length > 0) {
      const composicaoComCidadaoId = composicao_familiar.map((composicao) => ({
        ...composicao,
        cidadao_id: cidadaoSalvo.id,
      }));
      await this.composicaoFamiliarService.upsertMany(
        cidadaoSalvo.id,
        composicaoComCidadaoId,
        usuario_id,
      );
    }

    // Processar dados sociais se fornecidos
    if (dados_sociais) {
      await this.dadosSociaisService.upsert(cidadaoSalvo.id, dados_sociais);
    }

    // Processar situação de moradia se fornecida
    if (situacao_moradia) {
      await this.situacaoMoradiaService.upsert({
        ...situacao_moradia,
        cidadao_id: cidadaoSalvo.id,
      });
    }

    // Processar informações bancárias se fornecidas
    if (info_bancaria) {
      await this.infoBancariaService.upsert({
        ...info_bancaria,
        cidadao_id: cidadaoSalvo.id,
      });
    }

    // Auditoria de criação de cidadão
    await this.auditEmitter.emitEntityCreated(
      'Cidadao',
      cidadaoSalvo.id,
      {
        cpf: cpfClean,
        nis: nisClean,
        nome: cidadaoSalvo.nome,
        unidade_id,
      },
      usuario_id,
    );

    return plainToInstance(CidadaoResponseDto, cidadaoSalvo, {
      excludeExtraneousValues: true,
    });
  }

  async update(
    id: string,
    updateCidadaoDto: CreateCidadaoDto,
    usuario_id: string,
  ): Promise<CidadaoResponseDto> {
    const cidadao = await this.cidadaoRepository.findById(id);
    if (!cidadao) {
      throw new NotFoundException('Cidadão não encontrado');
    }

    // Separar campos que não pertencem à entidade Cidadao
    const {
      composicao_familiar,
      contatos,
      enderecos,
      dados_sociais,
      situacao_moradia,
      info_bancaria,
      ...dadosAtualizacao
    } = updateCidadaoDto;

    // Validar CPF se foi alterado
    if (dadosAtualizacao.cpf) {
      const cpfClean = dadosAtualizacao.cpf.replace(/\D/g, '');
      if (cpfClean !== cidadao.cpf) {
        const existingCpf = await this.cidadaoRepository.findByCpfGlobal(cpfClean, false, true);
        if (existingCpf && existingCpf.id !== id) {
          throw new ConflictException('CPF já cadastrado');
        }
        dadosAtualizacao.cpf = cpfClean;
      }
    }

    // Validar NIS se foi alterado
    if ('nis' in dadosAtualizacao && dadosAtualizacao.nis !== cidadao.nis) {
      const nisClean = dadosAtualizacao.nis?.replace(/\D/g, '') || undefined;
      if (nisClean) {
        const existingNis = await this.cidadaoRepository.findByNis(nisClean, false, true);
        if (existingNis && existingNis.id !== id) {
          throw new ConflictException('NIS já cadastrado');
        }
      }
      dadosAtualizacao.nis = nisClean;
    }

    const cidadaoAtualizado = await this.cidadaoRepository.updateCidadao(
      id,
      dadosAtualizacao,
    );

    // Auditoria de atualização de cidadão
    await this.auditEmitter.emitEntityUpdated(
      'Cidadao',
      id,
      {
        cpf: cidadao.cpf,
        nis: cidadao.nis,
        nome: cidadao.nome,
      },
      {
        cpf: cidadaoAtualizado.cpf,
        nis: cidadaoAtualizado.nis,
        nome: cidadaoAtualizado.nome,
      },
      usuario_id,
    );

    // Processar contatos normalizados se existirem
    if (contatos && contatos.length > 0) {
      const contatosComCidadaoId = contatos.map((contato) => ({
        ...contato,
        cidadao_id: id,
      }));
      await this.contatoService.upsertMany(id, contatosComCidadaoId);
    }

    // Processar endereços normalizados se existirem
    if (enderecos && enderecos.length > 0) {
      const enderecosComCidadaoId = enderecos.map((endereco) => ({
        ...endereco,
        cidadao_id: id,
      }));
      await this.enderecoService.upsertMany(id, enderecosComCidadaoId);
    }

    // Processar composição familiar se fornecida
    if (composicao_familiar && composicao_familiar.length > 0) {
      const composicaoComCidadaoId = composicao_familiar.map((composicao) => ({
        ...composicao,
        cidadao_id: id,
      }));
      await this.composicaoFamiliarService.upsertMany(
        id,
        composicaoComCidadaoId,
        usuario_id,
      );
    }

    // Processar dados sociais se fornecidos
    if (dados_sociais) {
      await this.dadosSociaisService.upsert(id, dados_sociais);
    }

    // Processar situação de moradia se fornecida
    if (situacao_moradia) {
      await this.situacaoMoradiaService.upsert({
        ...situacao_moradia,
        cidadao_id: id,
      });
    }

    // Processar informações bancárias se fornecidas
    if (info_bancaria) {
      await this.infoBancariaService.upsert({
        ...info_bancaria,
        cidadao_id: id,
      });
    }

    return plainToInstance(CidadaoResponseDto, cidadaoAtualizado, {
      excludeExtraneousValues: true,
    });
  }

  /**
   * Remove logicamente um cidadão do sistema (soft delete)
   * 
   * @param id - ID do cidadão a ser removido
   * @param userId - ID do usuário que está realizando a operação
   * @returns Objeto com mensagem de sucesso e data de remoção
   * @throws NotFoundException - Quando o cidadão não é encontrado
   * @throws BadRequestException - Quando o cidadão já foi removido anteriormente
   */
  async remove(id: string, userId?: string): Promise<{ message: string; removedAt: Date }> {
    // Buscar o cidadão incluindo registros removidos para verificar se existe
    const cidadao = await this.cidadaoRepository.findOne({
      where: { id },
      withDeleted: true, // Incluir registros com soft delete
    });

    if (!cidadao) {
      throw new NotFoundException('Cidadão não encontrado');
    }

    // Verificar se já foi removido anteriormente
    if (cidadao.foiRemovido()) {
      throw new BadRequestException('Cidadão já foi removido anteriormente');
    }

    // Realizar o soft delete
    await this.cidadaoRepository.removeCidadao(id);

    // Buscar o cidadão atualizado para obter a data de remoção
    const cidadaoRemovido = await this.cidadaoRepository.findOne({
      where: { id },
      withDeleted: true,
    });

    // Emitir evento de auditoria
    await this.auditEmitter.emitEntityDeleted(
      'Cidadao',
      id,
      {
        nome: cidadao.nome,
        cpf: cidadao.cpf,
        removed_at: null,
      },
      userId || SYSTEM_USER_UUID,
    );

    this.logger.log(`Cidadão ${cidadao.nome} (${cidadao.cpf}) removido com sucesso por usuário ${userId}`);

    return {
      message: 'Cidadão removido com sucesso',
      removedAt: cidadaoRemovido?.removed_at || new Date(),
    };
  }

  /**
   * Verifica se existe relação familiar entre dois cidadãos
   * @param cidadaoId ID do cidadão principal
   * @param familiarId ID do familiar a ser verificado
   * @returns True se existe relação familiar, false caso contrário
   */
  async verificarRelacaoFamiliar(
    cidadaoId: string,
    familiarId: string,
  ): Promise<boolean> {
    if (!cidadaoId || !familiarId) {
      return false;
    }

    try {
      // Buscar cidadão com composição familiar
      const cidadao = await this.cidadaoRepository.findById(cidadaoId, true);

      if (!cidadao || !cidadao.composicao_familiar) {
        return false;
      }

      // Verificar se o familiarId está na composição familiar
      return cidadao.composicao_familiar.some(
        (membro) => membro.id === familiarId,
      );
    } catch (error) {
      return false;
    }
  }

  /**
   * Busca todos os bairros únicos registrados no sistema
   * @returns Lista de bairros únicos ordenados alfabeticamente
   */
  async findAllBairros(): Promise<string[]> {
    try {
      return await this.cidadaoRepository.findAllBairros();
    } catch (error) {
      throw new BadRequestException('Erro ao buscar bairros');
    }
  }

  /**
   * Transfere um cidadão para outra unidade
   * @param cidadaoId ID do cidadão a ser transferido
   * @param transferirUnidadeDto Dados da transferência
   * @param usuarioId ID do usuário que está realizando a transferência
   * @returns Dados atualizados do cidadão
   */
  async transferirUnidade(
    cidadaoId: string,
    transferirUnidadeDto: TransferirUnidadeDto,
    usuarioId: string,
  ): Promise<CidadaoResponseDto> {
    const { unidade_id, endereco, motivo } = transferirUnidadeDto;

    // Verificar se o cidadão existe
    const cidadao = await this.cidadaoRepository.findById(cidadaoId);
    if (!cidadao) {
      throw new NotFoundException('Cidadão não encontrado');
    }

    // Verificar se a nova unidade é diferente da atual
    if (cidadao.unidade_id === unidade_id) {
      throw new BadRequestException(
        'O cidadão já está vinculado a esta unidade',
      );
    }

    // Armazenar dados anteriores para auditoria
    const dadosAnteriores = {
      unidade_id: cidadao.unidade_id,
      nome: cidadao.nome,
      cpf: cidadao.cpf,
    };

    // Executar transferência em transação para garantir consistência
    const queryRunner = this.cidadaoRepository.manager.connection.createQueryRunner();
    
    try {
      await queryRunner.connect();
      
      // Configurar timeout personalizado para a transação
      await queryRunner.query('SET statement_timeout = 15000'); // 15 segundos
      
      await queryRunner.startTransaction();

      // Atualizar a unidade do cidadão
      const updateResult = await queryRunner.manager.update(
        'cidadao',
        { id: cidadaoId },
        { unidade_id, updated_at: new Date() }
      );

      if (updateResult.affected === 0) {
        throw new BadRequestException('Falha ao atualizar unidade do cidadão');
      }

      // Processar novo endereço se fornecido
      if (endereco) {
        // Finalizar endereços atuais (definir data_fim_vigencia)
        const enderecosAtuais =
          await this.enderecoService.findByCidadaoId(cidadaoId);

        const dataAtual = new Date().toISOString().split('T')[0];

        // Finalizar endereços vigentes
        for (const enderecoAtual of enderecosAtuais) {
          if (!enderecoAtual.data_fim_vigencia) {
            await queryRunner.manager.update(
              'endereco',
              { id: enderecoAtual.id },
              { data_fim_vigencia: dataAtual }
            );
          }
        }

        // Criar novo endereço
        await queryRunner.manager.insert('endereco', {
          ...endereco,
          cidadao_id: cidadaoId,
          data_inicio_vigencia: endereco.data_inicio_vigencia || dataAtual,
          created_at: new Date(),
          updated_at: new Date(),
        });
      }

      // Confirmar transação
      await queryRunner.commitTransaction();

      this.logger.log(
        `Unidade do cidadão ${cidadaoId} transferida com sucesso para ${unidade_id}`,
      );

    } catch (error) {
      // Reverter transação em caso de erro
      await queryRunner.rollbackTransaction();
      
      // Log detalhado do erro
      this.logger.error(
        `Erro ao transferir unidade do cidadão ${cidadaoId}:`,
        {
          message: error.message,
          code: error.code,
          stack: error.stack,
          unidadeDestino: unidade_id,
          motivo: motivo
        }
      );

      // Identificar tipo específico de erro
      if (error.code === 'ECONNRESET' || 
          error.code === 'ECONNREFUSED' || 
          error.code === 'ETIMEDOUT' ||
          error.message?.includes('timeout') ||
          error.message?.includes('connection') ||
          error.message?.includes('statement_timeout')) {
        throw new BadRequestException(
          'Erro de conexão com o banco de dados durante a transferência. Tente novamente em alguns instantes.'
        );
      }

      // Erro genérico
      throw new BadRequestException(
        `Falha na transferência de unidade: ${error.message}`,
      );
    } finally {
      // Liberar conexão de forma segura
      try {
        await queryRunner.release();
      } catch (releaseError) {
        this.logger.warn('Erro ao liberar conexão do query runner:', releaseError.message);
      }
    }

    // Buscar cidadão atualizado
    const cidadaoAtualizado = await this.cidadaoRepository.findById(cidadaoId);
    if (!cidadaoAtualizado) {
      throw new NotFoundException('Cidadão não encontrado após atualização');
    }

    // Auditoria da transferência
    await this.auditEmitter.emitEntityUpdated(
      'Cidadao',
      cidadaoId,
      dadosAnteriores,
      {
        unidade_id: cidadaoAtualizado.unidade_id,
        nome: cidadaoAtualizado.nome,
        cpf: cidadaoAtualizado.cpf,
        motivo_transferencia: motivo || 'Transferência de unidade',
      },
      usuarioId,
    );

    // Retornar dados atualizados com relacionamentos
    const cidadaoCompleto = await this.cidadaoRepository.findById(
      cidadaoId,
      true,
    );

    return plainToInstance(CidadaoResponseDto, cidadaoCompleto, {
      excludeExtraneousValues: true,
    });
  }

  /**
   * Aplica filtros avançados para busca de cidadãos
   * @param filtros Filtros avançados a serem aplicados
   * @param unidadeUsuario ID da unidade do usuário (para controle de escopo)
   * @param usuarioId ID do usuário que está realizando a consulta
   * @returns Resultado paginado com metadados de filtros aplicados
   */
  async aplicarFiltrosAvancados(
    filtros: CidadaoFiltrosAvancadosDto,
    unidadeUsuario: string,
    usuarioId: string,
  ): Promise<CidadaoFiltrosResponseDto> {
    const {
      page = 1,
      limit = 10,
      unidades,
      bairros,
      status,
      search,
      include_relations = false,
      apenas_com_beneficios = false,
      idade_minima,
      idade_maxima,
      ...outrosFiltros
    } = filtros;

    const skip = (page - 1) * limit;
    const take = Math.min(limit, 100);

    // Construir filtros para o repositório
    const filtrosRepositorio = {
      skip,
      take,
      search,
      include_relations,
      unidades: unidades?.length > 0 ? unidades : undefined,
      bairros: bairros?.length > 0 ? bairros : undefined,
      status: status?.length > 0 ? status : undefined,
      apenas_com_beneficios,
      idade_minima,
      idade_maxima,
      unidade_usuario: unidadeUsuario, // Para controle de escopo
    };

    this.logger.debug(
      `Aplicando filtros avançados: ${JSON.stringify(filtrosRepositorio)}`,
    );

    try {
      // Buscar cidadãos com filtros avançados
      const [cidadaos, total] = await this.cidadaoRepository.findWithAdvancedFilters(
        filtrosRepositorio,
      );

      // Transformar dados para resposta
      const items = cidadaos.map((cidadao) =>
        plainToInstance(CidadaoResponseDto, cidadao, {
          excludeExtraneousValues: true,
        }),
      );

      // Calcular metadados de paginação
      const pages = Math.ceil(total / take);
      const hasNext = page < pages;
      const hasPrev = page > 1;

      // Preparar filtros aplicados para resposta
      const filtrosAplicados = {
        unidades: unidades || [],
        bairros: bairros || [],
        status: status || [],
        search: search || null,
        include_relations,
        apenas_com_beneficios,
        idade_minima: idade_minima || null,
        idade_maxima: idade_maxima || null,
        ...outrosFiltros,
      };

      // Auditoria da consulta com filtros avançados
      await this.auditEmitter.emitSystemEvent(
        AuditEventType.SYSTEM_INFO,
        {
          filtros: filtrosAplicados,
          total_encontrados: total,
          pagina: page,
          limite: take,
          usuario_id: usuarioId,
          entidade: 'Cidadao',
        },
      );

      return {
        items,
        total,
        filtros_aplicados: filtrosAplicados,
        meta: {
          limit: take,
          offset: skip,
          page,
          pages,
          hasNext,
          hasPrev,
        }
      };
    } catch (error) {
      this.logger.error(
        `Erro ao aplicar filtros avançados: ${error.message}`,
        error.stack,
      );
      throw new BadRequestException(
        `Erro ao aplicar filtros: ${error.message}`,
      );
    }
  }
}
