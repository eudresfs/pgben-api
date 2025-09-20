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
   * Valida dados para registro de resultado
   */
  private async validarRegistroResultado(request: any): Promise<void> {
    const dto: CreateResultadoBeneficioCessadoDto = request.body;
    const usuarioId = request.user?.id;

    if (!dto) {
      throw new BadRequestException('Dados do resultado são obrigatórios');
    }

    if (!usuarioId) {
      throw new BadRequestException('Usuário não identificado');
    }

    // Validar concessão
    const concessao = await this.validacaoService.validarConcessaoParaCessacao(dto.concessaoId);

    // Validar competência do técnico
    await this.validacaoService.validarCompetenciaTecnico(usuarioId, concessao);

    // Validar consistência dos dados
    this.validacaoService.validarConsistenciaDados(dto);

    // Validar prazo para registro
    if (concessao.dataEncerramento) {
      this.validacaoService.validarPrazoRegistro(concessao.dataEncerramento);
    }

    // Adicionar dados validados ao request para uso posterior
    request.concessaoValidada = concessao;
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