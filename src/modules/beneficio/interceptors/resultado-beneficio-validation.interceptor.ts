import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  BadRequestException,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { Reflector } from '@nestjs/core';
import { ValidacaoResultadoBeneficioService } from '../services/validacao-resultado-beneficio.service';
import { CreateResultadoBeneficioCessadoDto } from '../dto/create-resultado-beneficio-cessado.dto';

/**
 * Interceptor para validação automática das regras de negócio
 * conforme Lei de Benefícios Eventuais do SUAS
 */
@Injectable()
export class ResultadoBeneficioValidationInterceptor implements NestInterceptor {
  constructor(
    private readonly validacaoService: ValidacaoResultadoBeneficioService,
    private readonly reflector: Reflector,
  ) {}

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<any>> {
    const request = context.switchToHttp().getRequest();
    const handler = context.getHandler();
    const controller = context.getClass();

    // Verificar se a validação está habilitada para este endpoint
    const skipValidation = this.reflector.getAllAndOverride<boolean>('skipResultadoValidation', [
      handler,
      controller,
    ]);

    if (skipValidation) {
      return next.handle();
    }

    // Aplicar validações específicas baseadas no método
    const methodName = handler.name;
    
    switch (methodName) {
      case 'registrarResultado':
        await this.validarRegistroResultado(request);
        break;
      case 'buscarPorId':
        await this.validarBuscaPorId(request);
        break;
      case 'listar':
        await this.validarListagem(request);
        break;
      case 'buscarPorConcessao':
        await this.validarBuscaPorConcessao(request);
        break;
    }

    return next.handle();
  }

  /**
   * Valida dados para registro de resultado com estratégia otimizada para documentos críticos.
   * 
   * Implementa validação em duas fases:
   * - Fase 1: Validação rápida dos dados essenciais do formulário
   * - Fase 2: Validação completa incluindo arquivos e integridade
   */
  private async validarRegistroResultado(request: any): Promise<void> {
    const usuarioId = request.user?.id;

    if (!usuarioId) {
      throw new BadRequestException('Usuário não identificado');
    }

    // FASE 1: Validação rápida dos dados essenciais
    // Após FileFieldsInterceptor, os dados estão disponíveis em request.body
    const body = request.body;
    
    if (!body) {
      throw new BadRequestException('Dados do formulário são obrigatórios');
    }

    // Validação básica dos campos obrigatórios
    if (!body.concessaoId) {
      throw new BadRequestException('ID da concessão é obrigatório');
    }

    if (!body.motivoEncerramento) {
      throw new BadRequestException('Motivo do encerramento é obrigatório');
    }

    if (!body.statusVulnerabilidade) {
      throw new BadRequestException('Status da vulnerabilidade é obrigatório');
    }

    // Transformar dados para DTO com validação aprimorada
    let dto: CreateResultadoBeneficioCessadoDto;
    
    try {
      dto = this.transformMultipartToDto(body, request.files);
    } catch (error) {
      throw new BadRequestException(`Erro na validação dos dados: ${error.message}`);
    }

    // FASE 2: Validação completa com regras de negócio
    // Validar concessão
    const concessao = await this.validacaoService.validarConcessaoParaCessacao(dto.concessaoId);

    // Validar consistência dos dados
    this.validacaoService.validarConsistenciaDados(dto);

    // Validar prazo para registro
    if (concessao.dataEncerramento) {
      this.validacaoService.validarPrazoRegistro(concessao.dataEncerramento);
    }

    // Validar arquivos críticos se presentes
    this.validarArquivosCriticos(request.files);

    // Adicionar dados validados ao request para uso posterior
    request.concessaoValidada = concessao;
    request.dadosValidados = dto;
  }

  /**
   * Valida arquivos críticos do processo de cessação de benefícios.
   * 
   * Verifica se os arquivos enviados atendem aos critérios de qualidade
   * e conformidade exigidos pela LOAS/SUAS para documentação de cessação.
   */
  private validarArquivosCriticos(files: any): void {
    if (!files) {
      return; // Arquivos são opcionais, mas se enviados devem ser válidos
    }

    const { provaSocial, documentacaoTecnica } = files;

    // Validar arquivos de prova social
    if (provaSocial && provaSocial.length > 0) {
      if (provaSocial.length > 5) {
        throw new BadRequestException('Máximo de 5 arquivos de prova social permitidos');
      }

      provaSocial.forEach((arquivo: Express.Multer.File, index: number) => {
        if (!arquivo.originalname || arquivo.size === 0) {
          throw new BadRequestException(`Arquivo de prova social ${index + 1} é inválido`);
        }
      });
    }

    // Validar arquivos de documentação técnica
    if (documentacaoTecnica && documentacaoTecnica.length > 0) {
      if (documentacaoTecnica.length > 10) {
        throw new BadRequestException('Máximo de 10 arquivos de documentação técnica permitidos');
      }

      documentacaoTecnica.forEach((arquivo: Express.Multer.File, index: number) => {
        if (!arquivo.originalname || arquivo.size === 0) {
          throw new BadRequestException(`Arquivo de documentação técnica ${index + 1} é inválido`);
        }
      });
    }
  }

  /**
   * Transforma dados multipart em DTO válido com validação aprimorada.
   * 
   * Converte strings do formulário multipart para tipos apropriados
   * e valida a integridade dos dados críticos.
   * Cria array de documentos comprobatórios a partir dos arquivos enviados.
   */
  private transformMultipartToDto(body: any, files?: any): CreateResultadoBeneficioCessadoDto {
    try {
      // Validar campos obrigatórios com mensagens específicas
      if (!body.concessaoId?.trim()) {
        throw new Error('ID da concessão é obrigatório');
      }

      if (!body.motivoEncerramento?.trim()) {
        throw new Error('Motivo do encerramento é obrigatório');
      }

      if (!body.statusVulnerabilidade?.trim()) {
        throw new Error('Status da vulnerabilidade é obrigatório');
      }

      // Validar formato do UUID da concessão
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(body.concessaoId)) {
        throw new Error('ID da concessão deve ser um UUID válido');
      }

      // Converter e validar acompanhamento posterior
      let acompanhamentoPosterior = false;
      if (body.acompanhamentoPosterior) {
        const valor = body.acompanhamentoPosterior.toLowerCase();
        if (valor === 'true' || valor === '1') {
          acompanhamentoPosterior = true;
        } else if (valor === 'false' || valor === '0') {
          acompanhamentoPosterior = false;
        } else {
          throw new Error('Campo acompanhamentoPosterior deve ser true ou false');
        }
      }

      // Validar se acompanhamento posterior requer detalhes
      if (acompanhamentoPosterior && !body.detalhesAcompanhamento?.trim()) {
        throw new Error('Detalhes do acompanhamento são obrigatórios quando acompanhamento posterior é verdadeiro');
      }

      // Criar array de documentos comprobatórios a partir dos arquivos
      const documentosComprobatorios = this.criarDocumentosComprobatorios(files);

      return {
        concessaoId: body.concessaoId.trim(),
        motivoEncerramento: body.motivoEncerramento.trim(),
        descricaoMotivo: body.descricaoMotivo?.trim() || null,
        statusVulnerabilidade: body.statusVulnerabilidade.trim(),
        avaliacaoVulnerabilidade: body.avaliacaoVulnerabilidade?.trim() || null,
        observacoes: body.observacoes?.trim() || null,
        acompanhamentoPosterior,
        detalhesAcompanhamento: body.detalhesAcompanhamento?.trim() || null,
        recomendacoes: body.recomendacoes?.trim() || null,
        documentosComprobatorios,
      };
    } catch (error) {
      throw new Error(`Erro na validação dos dados: ${error.message}`);
    }
  }

  /**
   * Valida parâmetros para busca por ID
   */
  private async validarBuscaPorId(request: any): Promise<void> {
    const { id } = request.params;

    if (!id || typeof id !== 'string') {
      throw new BadRequestException('ID do resultado é obrigatório e deve ser uma string válida');
    }

    // Validar formato UUID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      throw new BadRequestException('ID deve estar no formato UUID válido');
    }
  }

  /**
   * Valida parâmetros para listagem
   */
  private async validarListagem(request: any): Promise<void> {
    const { page, limit, dataInicio, dataFim, motivoEncerramento, statusVulnerabilidade } = request.query;

    // Validar paginação
    if (page && (isNaN(page) || parseInt(page) < 1)) {
      throw new BadRequestException('Página deve ser um número maior que 0');
    }

    if (limit && (isNaN(limit) || parseInt(limit) < 1 || parseInt(limit) > 100)) {
      throw new BadRequestException('Limite deve ser um número entre 1 e 100');
    }

    // Validar filtros de data
    if (dataInicio && !this.isValidDate(dataInicio)) {
      throw new BadRequestException('Data de início deve estar no formato YYYY-MM-DD');
    }

    if (dataFim && !this.isValidDate(dataFim)) {
      throw new BadRequestException('Data de fim deve estar no formato YYYY-MM-DD');
    }

    if (dataInicio && dataFim && new Date(dataInicio) > new Date(dataFim)) {
      throw new BadRequestException('Data de início deve ser anterior à data de fim');
    }

    // Validar período máximo de consulta (1 ano)
    if (dataInicio && dataFim) {
      const inicio = new Date(dataInicio);
      const fim = new Date(dataFim);
      const diffTime = Math.abs(fim.getTime() - inicio.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays > 365) {
        throw new BadRequestException('Período de consulta não pode exceder 1 ano');
      }
    }

    // Validar filtros de enum
    if (motivoEncerramento && !Object.values(require('../../../enums/motivo-encerramento-beneficio.enum').MotivoEncerramentoBeneficio).includes(motivoEncerramento)) {
      throw new BadRequestException('Motivo de encerramento inválido');
    }

    if (statusVulnerabilidade && !Object.values(require('../../../enums/status-vulnerabilidade.enum').StatusVulnerabilidade).includes(statusVulnerabilidade)) {
      throw new BadRequestException('Status de vulnerabilidade inválido');
    }
  }

  /**
   * Valida parâmetros para busca por concessão
   */
  private async validarBuscaPorConcessao(request: any): Promise<void> {
    const { concessaoId } = request.params;

    if (!concessaoId || typeof concessaoId !== 'string') {
      throw new BadRequestException('ID da concessão é obrigatório e deve ser uma string válida');
    }

    // Validar formato UUID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(concessaoId)) {
      throw new BadRequestException('ID da concessão deve estar no formato UUID válido');
    }
  }

  /**
   * Cria array de documentos comprobatórios a partir dos arquivos enviados.
   * 
   * Combina arquivos de prova social e documentação técnica em um único array
   * com metadados apropriados para cada tipo de documento.
   */
  private criarDocumentosComprobatorios(files?: any): any[] {
    const documentos: any[] = [];

    if (!files) {
      return documentos;
    }

    const { provaSocial, documentacaoTecnica } = files;

    // Processar arquivos de prova social
    if (provaSocial && provaSocial.length > 0) {
      provaSocial.forEach((arquivo: Express.Multer.File) => {
        documentos.push({
          nomeArquivo: arquivo.originalname,
          tipo: 'prova_social', // Valor correto do enum TipoDocumentoComprobatorio
          tamanhoArquivo: arquivo.size,
          tipoMime: arquivo.mimetype,
          caminhoArquivo: `/uploads/temp/${arquivo.originalname}`, // Caminho temporário
          buffer: arquivo.buffer,
        });
      });
    }

    // Processar arquivos de documentação técnica
    if (documentacaoTecnica && documentacaoTecnica.length > 0) {
      documentacaoTecnica.forEach((arquivo: Express.Multer.File) => {
        documentos.push({
          nomeArquivo: arquivo.originalname,
          tipo: 'documentacao_tecnica', // Valor correto do enum TipoDocumentoComprobatorio
          tamanhoArquivo: arquivo.size,
          tipoMime: arquivo.mimetype,
          caminhoArquivo: `/uploads/temp/${arquivo.originalname}`, // Caminho temporário
          buffer: arquivo.buffer,
        });
      });
    }

    return documentos;
  }

  /**
   * Valida se uma string é uma data válida no formato YYYY-MM-DD
   */
  private isValidDate(dateString: string): boolean {
    const regex = /^\d{4}-\d{2}-\d{2}$/;
    if (!regex.test(dateString)) {
      return false;
    }

    const date = new Date(dateString);
    return date instanceof Date && !isNaN(date.getTime());
  }
}

/**
 * Decorator para pular validação em endpoints específicos
 */
export const SkipResultadoValidation = () => {
  return (target: any, propertyKey?: string, descriptor?: PropertyDescriptor) => {
    if (descriptor) {
      Reflect.defineMetadata('skipResultadoValidation', true, descriptor.value);
    } else {
      Reflect.defineMetadata('skipResultadoValidation', true, target);
    }
  };
};