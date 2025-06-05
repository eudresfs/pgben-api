import { Injectable, BadRequestException, NotFoundException, InternalServerErrorException, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { TipoDadosBeneficio, ICreateDadosBeneficioDto, IDadosBeneficio, IUpdateDadosBeneficioDto } from '../interfaces/dados-beneficio.interface';
import { DadosAluguelSocialService } from './dados-aluguel-social.service';
import { DadosCestaBasicaService } from './dados-cesta-basica.service';
import { DadosFuneralService } from './dados-funeral.service';
import { DadosNatalidadeService } from './dados-natalidade.service';
import { AbstractDadosBeneficioService } from './base/abstract-dados-beneficio.service';
import { TipoBeneficioRepository } from '../repositories/tipo-beneficio.repository';
import { TipoBeneficioSchema } from '../../../entities/tipo-beneficio-schema.entity';
import { SolicitacaoService } from '../../solicitacao/services/solicitacao.service';
import { TipoBeneficioSchemaRepository } from '../repositories/tipo-beneficio-schema.repository';

/**
 * Factory service para gerenciar diferentes tipos de dados de benefício
 * Centraliza a criação e validação de dados específicos para cada tipo de benefício
 */
@Injectable()
export class DadosBeneficioFactoryService {
  private readonly logger = new Logger(DadosBeneficioFactoryService.name);
  private readonly serviceMap: Map<TipoDadosBeneficio, AbstractDadosBeneficioService<any, any, any>>;
  private readonly codigoToTipoMap: Map<string, TipoDadosBeneficio>;

  constructor(
    private readonly dataSource: DataSource,
    private readonly aluguelSocialService: DadosAluguelSocialService,
    private readonly cestaBasicaService: DadosCestaBasicaService,
    private readonly funeralService: DadosFuneralService,
    private readonly natalidadeService: DadosNatalidadeService,
    private readonly tipoBeneficioRepository: TipoBeneficioRepository,
    private readonly solicitacaoService: SolicitacaoService,
    private readonly tipoBeneficioSchemaRepository: TipoBeneficioSchemaRepository,
  ) {
    // Mapear tipos de benefício para seus respectivos serviços
    this.serviceMap = new Map();
    this.serviceMap.set(TipoDadosBeneficio.ALUGUEL_SOCIAL, this.aluguelSocialService);
    this.serviceMap.set(TipoDadosBeneficio.CESTA_BASICA, this.cestaBasicaService);
    this.serviceMap.set(TipoDadosBeneficio.FUNERAL, this.funeralService);
    this.serviceMap.set(TipoDadosBeneficio.NATALIDADE, this.natalidadeService);

    // Mapear códigos para tipos de benefício
    this.codigoToTipoMap = new Map([
      ['aluguel-social', TipoDadosBeneficio.ALUGUEL_SOCIAL],
      ['cesta-basica', TipoDadosBeneficio.CESTA_BASICA],
      ['funeral', TipoDadosBeneficio.FUNERAL],
      ['natalidade', TipoDadosBeneficio.NATALIDADE],
      // Manter compatibilidade com códigos antigos (underscore)
      ['aluguel_social', TipoDadosBeneficio.ALUGUEL_SOCIAL],
      ['cesta_basica', TipoDadosBeneficio.CESTA_BASICA],
      ['auxilio_funeral', TipoDadosBeneficio.FUNERAL],
      ['auxilio_natalidade', TipoDadosBeneficio.NATALIDADE],
    ]);
  }

  /**
   * Verificar se uma solicitação já possui dados de benefício
   * Consulta diretamente as tabelas específicas de cada tipo de benefício
   */
  private async verificarSolicitacaoJaPossuiDados(solicitacaoId: string): Promise<boolean> {
    try {
      // Verifica em paralelo todas as tabelas de dados específicos
      // usando EXISTS para máxima performance
      const [natalidade, aluguelSocial, cestaBasica, funeral] = await Promise.all([
        this.dataSource.query(
          'SELECT EXISTS(SELECT 1 FROM dados_natalidade WHERE solicitacao_id = $1) as exists',
          [solicitacaoId]
        ),
        this.dataSource.query(
          'SELECT EXISTS(SELECT 1 FROM dados_aluguel_social WHERE solicitacao_id = $1) as exists',
          [solicitacaoId]
        ),
        this.dataSource.query(
          'SELECT EXISTS(SELECT 1 FROM dados_cesta_basica WHERE solicitacao_id = $1) as exists',
          [solicitacaoId]
        ),
        this.dataSource.query(
          'SELECT EXISTS(SELECT 1 FROM dados_funeral WHERE solicitacao_id = $1) as exists',
          [solicitacaoId]
        ),
      ]);

      // Retorna true se alguma das consultas encontrou dados
      return (
        natalidade[0]?.exists ||
        aluguelSocial[0]?.exists ||
        cestaBasica[0]?.exists ||
        funeral[0]?.exists
      );
    } catch (error) {
      // Se houver erro na consulta, assume que não há dados
      return false;
    }
  }

  /**
   * Validar se o tipo de benefício corresponde ao tipo da solicitação
   */
  private async validarTipoBeneficioSolicitacao(
    solicitacaoId: string,
    tipoBeneficio: TipoDadosBeneficio,
  ): Promise<void> {
    const solicitacao = await this.solicitacaoService.findById(solicitacaoId);
    
    if (!solicitacao.tipo_beneficio_id) {
      throw new BadRequestException('Solicitação não possui tipo de benefício definido');
    }

    const tipoBeneficioEntity = await this.tipoBeneficioRepository.findOne({
      where: { id: solicitacao.tipo_beneficio_id }
    });

    if (!tipoBeneficioEntity) {
      throw new NotFoundException('Tipo de benefício da solicitação não encontrado');
    }

    const tipoEsperado = this.codigoToTipoMap.get(tipoBeneficioEntity.codigo);
    if (tipoEsperado !== tipoBeneficio) {
      throw new BadRequestException(
        `Tipo de benefício ${tipoBeneficio} não corresponde ao tipo da solicitação ${tipoEsperado}`
      );
    }
  }

  /**
   * Criar dados específicos de benefício
   */
  async create(
    codigoOrId: string,
    createDto: ICreateDadosBeneficioDto,
    usuarioId: string,
  ): Promise<any> {
    this.logger.debug(`Iniciando criação de dados de benefício`, {
      codigoOrId,
      solicitacaoId: createDto?.solicitacao_id,
      usuarioId
    });

    try {
      // Validações básicas
      if (!createDto || typeof createDto !== 'object') {
        this.logger.error('Dados do benefício não fornecidos ou inválidos');
        throw new BadRequestException('Dados do benefício são obrigatórios');
      }

      if (!createDto.solicitacao_id) {
        this.logger.error('ID da solicitação não fornecido');
        throw new BadRequestException('ID da solicitação é obrigatório');
      }

      if (!usuarioId) {
        this.logger.error('ID do usuário não fornecido');
        throw new BadRequestException('ID do usuário é obrigatório');
      }

      this.logger.debug('Validações básicas concluídas com sucesso');

      // Resolver o tipo de benefício
      this.logger.debug(`Resolvendo tipo de benefício para: ${codigoOrId}`);
      const tipoBeneficio = await this.resolveTipoFromCodigoOrId(codigoOrId);
      this.logger.debug(`Tipo de benefício resolvido: ${tipoBeneficio}`);

      // Validar se o tipo de benefício corresponde ao da solicitação
      this.logger.debug(`Validando tipo de benefício para solicitação: ${createDto.solicitacao_id}`);
      await this.validarTipoBeneficioSolicitacao(createDto.solicitacao_id, tipoBeneficio);
      this.logger.debug('Tipo de benefício validado com sucesso');

      // Verificar se a solicitação já possui dados de benefício
      this.logger.debug(`Verificando se solicitação já possui dados: ${createDto.solicitacao_id}`);
      const jaPossuiDados = await this.verificarSolicitacaoJaPossuiDados(createDto.solicitacao_id);
      if (jaPossuiDados) {
        this.logger.warn(`Solicitação ${createDto.solicitacao_id} já possui dados de benefício`);
        throw new BadRequestException('Esta solicitação já possui dados de benefício cadastrados');
      }
      this.logger.debug('Verificação de dados existentes concluída');

      // Validar dados e obter campos faltantes
      this.logger.debug('Iniciando validação de dados específicos do benefício');
      const validationResult = await this.validateAndGetMissingFields(codigoOrId, createDto);
      
      if (!validationResult.isValid) {
        this.logger.error('Dados de benefício inválidos', {
          missingFields: validationResult.missingFields,
          errors: validationResult.errors
        });
        throw new BadRequestException({
          message: 'Dados de benefício inválidos ou incompletos',
          missingFields: validationResult.missingFields,
          errors: validationResult.errors
        });
      }
      this.logger.debug('Validação de dados concluída com sucesso');

      // Obter o serviço específico para o tipo de benefício
      this.logger.debug(`Obtendo serviço para tipo: ${tipoBeneficio}`);
      const service = this.getService(tipoBeneficio);
      this.logger.debug('Serviço obtido com sucesso');

      // Criar os dados específicos do benefício
      this.logger.debug('Iniciando criação dos dados específicos do benefício');
      const dadosBeneficio = await service.create(createDto);
      this.logger.debug('Dados de benefício criados com sucesso', {
        id: dadosBeneficio?.id,
        solicitacaoId: dadosBeneficio?.solicitacao_id
      });

      // Atualizar o status da solicitação para AGUARDANDO_DOCUMENTOS
      // await this.solicitacaoService.updateStatus(
      //   createDto.solicitacao_id,
      //   'AGUARDANDO_DOCUMENTOS',
      //   usuarioId,
      // );

      this.logger.debug('Criação de dados de benefício concluída com sucesso');
      return dadosBeneficio;
    } catch (error) {
      this.logger.error('Erro ao criar dados de benefício', {
        error: error.message,
        stack: error.stack,
        codigoOrId,
        solicitacaoId: createDto?.solicitacao_id,
        usuarioId
      });

      if (error instanceof BadRequestException || error instanceof NotFoundException) {
        throw error;
      }
      
      // Para erros inesperados, incluir mais contexto
      throw new InternalServerErrorException(
        `Erro interno ao criar dados do benefício para solicitação ${createDto?.solicitacao_id}`,
        error.message,
      );
    }
  }

  /**
   * Obter o serviço específico para um tipo de benefício
   */
  private getService(tipo: TipoDadosBeneficio): AbstractDadosBeneficioService<any, any, any> {
    const service = this.serviceMap.get(tipo);
    if (!service) {
      throw new BadRequestException(`Serviço não encontrado para o tipo de benefício: ${tipo}`);
    }
    return service;
  }

  /**
   * Resolver tipo de benefício a partir de código ou ID
   */
  private async resolveTipoFromCodigoOrId(codigoOrId: string): Promise<TipoDadosBeneficio> {
    this.logger.debug(`Resolvendo tipo de benefício para: ${codigoOrId}`);
    
    // Validar entrada
    if (!codigoOrId || typeof codigoOrId !== 'string' || codigoOrId.trim() === '') {
      this.logger.error(`Código ou ID inválido: ${codigoOrId}`);
      throw new BadRequestException('Código ou ID do tipo de benefício é obrigatório e deve ser uma string válida');
    }

    const codigoLimpo = codigoOrId.trim();
    
    // Primeiro, tentar como código
    this.logger.debug(`Tentando resolver como código: ${codigoLimpo}`);
    const tipoPorCodigo = this.codigoToTipoMap.get(codigoLimpo);
    if (tipoPorCodigo) {
      this.logger.debug(`Tipo encontrado por código: ${tipoPorCodigo}`);
      return tipoPorCodigo;
    }

    // Se não encontrou por código, tentar como ID
    this.logger.debug(`Não encontrado por código, tentando como ID: ${codigoLimpo}`);
    try {
      const tipoBeneficio = await this.tipoBeneficioRepository.findOne({
        where: { id: codigoLimpo }
      });
      
      if (!tipoBeneficio) {
        this.logger.error(`Tipo de benefício não encontrado no banco: ${codigoLimpo}`);
        const codigosDisponiveis = Array.from(this.codigoToTipoMap.keys()).join(', ');
        throw new NotFoundException(
          `Tipo de benefício não encontrado: ${codigoLimpo}. ` +
          `Códigos disponíveis: ${codigosDisponiveis}`
        );
      }

      this.logger.debug(`Tipo encontrado no banco: ${tipoBeneficio.codigo}`);
      const tipo = this.codigoToTipoMap.get(tipoBeneficio.codigo);
      if (!tipo) {
        this.logger.error(`Código de benefício não mapeado: ${tipoBeneficio.codigo}`);
        throw new BadRequestException(
          `Código de benefício não mapeado: ${tipoBeneficio.codigo}. ` +
          `Verifique se o mapeamento está correto no factory service.`
        );
      }

      this.logger.debug(`Tipo resolvido com sucesso: ${tipo}`);
      return tipo;
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error(`Erro inesperado ao resolver tipo: ${error.message}`, error.stack);
      throw new BadRequestException(
        `Erro interno ao resolver tipo de benefício: ${codigoLimpo}. ` +
        `Verifique se o valor é um código ou ID válido.`
      );
    }
  }

  /**
   * Obter ID do tipo de benefício a partir do código
   */
  private async getTipoBeneficioIdFromCodigo(codigo: string): Promise<string> {
    const tipoBeneficio = await this.tipoBeneficioRepository.findOne({
      where: { codigo }
    });
    
    if (!tipoBeneficio) {
      throw new NotFoundException(`Tipo de benefício com código ${codigo} não encontrado`);
    }
    
    return tipoBeneficio.id;
  }

  /**
   * Validar dados e retornar campos faltantes baseado no schema
   */
  async validateAndGetMissingFields(
    codigoOrId: string,
    createDto: ICreateDadosBeneficioDto,
  ): Promise<{
    isValid: boolean;
    missingFields: Array<{
      nome: string;
      label: string;
      tipo: string;
      obrigatorio: boolean;
      descricao?: string;
    }>;
    errors: Array<{
      campo: string;
      mensagem: string;
    }>;
  }> {
    this.logger.debug(`Iniciando validação de dados para: ${codigoOrId}`);
    
    try {
      // Resolver o tipo de benefício
      this.logger.debug('Resolvendo tipo de benefício');
      const tipoBeneficio = await this.resolveTipoFromCodigoOrId(codigoOrId);
      
      // Buscar o schema do tipo de benefício
      this.logger.debug('Obtendo schema do benefício');
      const tipoBeneficioId = await this.getTipoBeneficioIdFromTipo(tipoBeneficio);
      const schema = await this.tipoBeneficioSchemaRepository.findByTipoBeneficioId(tipoBeneficioId);
      
      if (!schema) {
        this.logger.warn(`Schema não encontrado para: ${codigoOrId}. Considerando válido.`);
        // Se não há schema definido, considerar válido
        return {
          isValid: true,
          missingFields: [],
          errors: []
        };
      }
      
      this.logger.debug('Schema obtido com sucesso');
      const missingFields: any[] = [];
      const errors: any[] = [];
      
      // Verificar campos obrigatórios do schema
      this.logger.debug('Verificando campos obrigatórios');
      const camposObrigatorios = schema.getCamposObrigatorios();
      this.logger.debug(`Encontrados ${camposObrigatorios.length} campos obrigatórios`);
      
      for (const campo of camposObrigatorios) {
        const valor = createDto[campo.nome];
        
        if (valor === undefined || valor === null || 
            (typeof valor === 'string' && valor.trim() === '')) {
          this.logger.debug(`Campo obrigatório faltante: ${campo.nome}`);
          missingFields.push({
            nome: campo.nome,
            label: campo.label || campo.nome,
            tipo: campo.tipo,
            obrigatorio: campo.obrigatorio,
            descricao: campo.descricao
          });
        }
      }
      
      // Validar tipos e formatos dos campos fornecidos
      this.logger.debug('Validando tipos e formatos dos campos');
      for (const campo of schema.schema_estrutura.campos) {
        const valor = createDto[campo.nome];
        
        if (valor !== undefined && valor !== null) {
          // Validar tipo do campo
          const tipoValido = this.validateFieldType(valor, campo.tipo);
          if (!tipoValido) {
            this.logger.debug(`Tipo inválido para campo ${campo.nome}: esperado ${campo.tipo}, recebido ${typeof valor}`);
            errors.push({
              campo: campo.nome,
              mensagem: `O campo ${campo.label || campo.nome} deve ser do tipo ${campo.tipo}`
            });
          }
          
          // Validar regras específicas se existirem
          if (campo.validacoes) {
            const validacaoResult = this.validateFieldRules(valor, campo.validacoes, campo.nome);
            if (!validacaoResult.isValid) {
              this.logger.debug(`Validação de regra falhou para campo ${campo.nome}: ${validacaoResult.message}`);
              errors.push({
                campo: campo.nome,
                mensagem: validacaoResult.message
              });
            }
          }
        }
      }
      
      const isValid = missingFields.length === 0 && errors.length === 0;
      this.logger.debug(`Validação concluída. Válido: ${isValid}, Campos faltantes: ${missingFields.length}, Erros: ${errors.length}`);
      
      if (!isValid) {
        this.logger.debug('Detalhes da validação:', {
          missingFields: missingFields.map(f => f.nome),
          errors: errors.map(e => `${e.campo}: ${e.mensagem}`)
        });
      }
      
      return {
        isValid,
        missingFields,
        errors
      };
      
    } catch (error) {
      this.logger.error('Erro interno ao validar dados', {
        error: error.message,
        stack: error.stack,
        codigoOrId
      });
      
      return {
        isValid: false,
        missingFields: [],
        errors: [{
          campo: 'system',
          mensagem: `Erro interno ao validar dados: ${error.message}`
        }]
      };
    }
  }
  
  /**
   * Validar tipo do campo
   */
  private validateFieldType(valor: any, tipo: string): boolean {
    switch (tipo.toLowerCase()) {
      case 'string':
      case 'text':
        return typeof valor === 'string';
      case 'number':
      case 'integer':
        return typeof valor === 'number' && !isNaN(valor);
      case 'boolean':
        return typeof valor === 'boolean';
      case 'date':
        return valor instanceof Date || 
               (typeof valor === 'string' && !isNaN(Date.parse(valor)));
      case 'array':
        return Array.isArray(valor);
      case 'object':
        return typeof valor === 'object' && valor !== null && !Array.isArray(valor);
      default:
        return true; // Tipo desconhecido, considera válido
    }
  }
  
  /**
   * Validar regras específicas do campo
   */
  private validateFieldRules(valor: any, validacao: any, nomeCampo: string): {
    isValid: boolean;
    message: string;
  } {
    try {
      // Validação de tamanho mínimo
      if (validacao.minLength && typeof valor === 'string' && valor.length < validacao.minLength) {
        return {
          isValid: false,
          message: `O campo ${nomeCampo} deve ter pelo menos ${validacao.minLength} caracteres`
        };
      }
      
      // Validação de tamanho máximo
      if (validacao.maxLength && typeof valor === 'string' && valor.length > validacao.maxLength) {
        return {
          isValid: false,
          message: `O campo ${nomeCampo} deve ter no máximo ${validacao.maxLength} caracteres`
        };
      }
      
      // Validação de valor mínimo
      if (validacao.min && typeof valor === 'number' && valor < validacao.min) {
        return {
          isValid: false,
          message: `O campo ${nomeCampo} deve ser maior ou igual a ${validacao.min}`
        };
      }
      
      // Validação de valor máximo
      if (validacao.max && typeof valor === 'number' && valor > validacao.max) {
        return {
          isValid: false,
          message: `O campo ${nomeCampo} deve ser menor ou igual a ${validacao.max}`
        };
      }
      
      // Validação de padrão regex
      if (validacao.pattern && typeof valor === 'string') {
        const regex = new RegExp(validacao.pattern);
        if (!regex.test(valor)) {
          return {
            isValid: false,
            message: validacao.patternMessage || `O campo ${nomeCampo} não atende ao formato exigido`
          };
        }
      }
      
      return { isValid: true, message: '' };
    } catch (error) {
      return {
        isValid: false,
        message: `Erro ao validar regras do campo ${nomeCampo}`
      };
    }
  }
  
  /**
   * Obter ID do tipo de benefício a partir do enum
   */
  private async getTipoBeneficioIdFromTipo(tipo: TipoDadosBeneficio): Promise<string> {
    // Mapear enum para código (usando códigos novos do banco de dados)
    const codigoMap = {
      [TipoDadosBeneficio.ALUGUEL_SOCIAL]: 'aluguel-social',
      [TipoDadosBeneficio.CESTA_BASICA]: 'cesta-basica',
      [TipoDadosBeneficio.FUNERAL]: 'funeral',
      [TipoDadosBeneficio.NATALIDADE]: 'natalidade'
    };
    
    const codigo = codigoMap[tipo];
    if (!codigo) {
      throw new BadRequestException(`Tipo de benefício ${tipo} não mapeado`);
    }
    
    const tipoBeneficio = await this.tipoBeneficioRepository.findOne({
      where: { codigo }
    });
    
    if (!tipoBeneficio) {
      throw new NotFoundException(`Tipo de benefício com código ${codigo} não encontrado`);
    }
    
    return tipoBeneficio.id;
  }

  /**
   * Obter tipos de benefício suportados
   */
  getSupportedTypes(): TipoDadosBeneficio[] {
    return Object.values(TipoDadosBeneficio);
  }

  /**
   * Obter metadados de um tipo de benefício
   */
  getTypeMetadata(tipo: TipoDadosBeneficio): { nome: string; descricao: string } {
    const metadata = {
      [TipoDadosBeneficio.ALUGUEL_SOCIAL]: {
        nome: 'Aluguel Social',
        descricao: 'Benefício para auxílio com aluguel'
      },
      [TipoDadosBeneficio.CESTA_BASICA]: {
        nome: 'Cesta Básica',
        descricao: 'Benefício de cesta básica'
      },
      [TipoDadosBeneficio.FUNERAL]: {
        nome: 'Auxílio Funeral',
        descricao: 'Benefício para auxílio funeral'
      },
      [TipoDadosBeneficio.NATALIDADE]: {
        nome: 'Auxílio Natalidade',
        descricao: 'Benefício para auxílio natalidade'
      }
    };

    return metadata[tipo] || { nome: tipo, descricao: 'Tipo de benefício' };
   }

   /**
    * Buscar dados específicos por ID
    */
   async findOne(codigoOrId: string, id: string): Promise<IDadosBeneficio> {
     const tipo = await this.resolveTipoFromCodigoOrId(codigoOrId);
     const service = this.getService(tipo);
     return service.findOne(id);
   }

   /**
    * Buscar dados específicos por solicitação
    */
   async findBySolicitacao(codigoOrId: string, solicitacaoId: string): Promise<IDadosBeneficio | null> {
     try {
       const tipo = await this.resolveTipoFromCodigoOrId(codigoOrId);
       const service = this.getService(tipo);
       return await service.findBySolicitacao(solicitacaoId);
     } catch (error) {
       if (error instanceof NotFoundException) {
         return null;
       }
       throw error;
     }
   }

   /**
    * Atualizar dados específicos
    */
   async update(codigoOrId: string, id: string, updateDto: IUpdateDadosBeneficioDto): Promise<IDadosBeneficio> {
     const tipo = await this.resolveTipoFromCodigoOrId(codigoOrId);
     const service = this.getService(tipo);
     return service.update(id, updateDto);
   }

   /**
    * Remover dados específicos
    */
   async remove(codigoOrId: string, id: string): Promise<void> {
     const tipo = await this.resolveTipoFromCodigoOrId(codigoOrId);
     const service = this.getService(tipo);
     return service.delete(id);
   }

   /**
    * Verificar se existem dados por solicitação
    */
   async existsBySolicitacao(codigoOrId: string, solicitacaoId: string): Promise<boolean> {
     try {
       const tipo = await this.resolveTipoFromCodigoOrId(codigoOrId);
       const service = this.getService(tipo);
       await service.findBySolicitacao(solicitacaoId);
       return true;
     } catch (error) {
       if (error instanceof NotFoundException) {
         return false;
       }
       throw error;
     }
   }
 }
