import {
  PipeTransform,
  Injectable,
  ArgumentMetadata,
  BadRequestException,
} from '@nestjs/common';
import { validate } from 'class-validator';
import { plainToClass } from 'class-transformer';
import { CreateResultadoBeneficioCessadoDto } from '../dto/create-resultado-beneficio-cessado.dto';
import { CreateResultadoBeneficioCessadoWithFilesDto } from '../dto/create-resultado-beneficio-cessado-with-files.dto';
import { MotivoEncerramentoBeneficio } from '../../../enums/motivo-encerramento-beneficio.enum';
import { StatusVulnerabilidade } from '../../../enums/status-vulnerabilidade.enum';
import { TipoDocumentoComprobatorio } from '../../../enums/tipo-documento-comprobatorio.enum';

/**
 * Pipe para validação específica de dados de resultado de benefício cessado
 * conforme regulamentação do SUAS e Lei de Benefícios Eventuais
 */
@Injectable()
export class ResultadoBeneficioValidationPipe implements PipeTransform<any> {
  async transform(value: any, { metatype }: ArgumentMetadata) {
    if (!metatype || !this.toValidate(metatype)) {
      return value;
    }

    const object = plainToClass(metatype, value);
    
    // Para CreateResultadoBeneficioCessadoWithFilesDto, não validar documentosComprobatorios
    // pois eles serão criados pelo interceptor a partir dos arquivos
    if (metatype.name === 'CreateResultadoBeneficioCessadoWithFilesDto') {
      // Validações padrão do class-validator, exceto documentosComprobatorios
      const errors = await validate(object, {
        skipMissingProperties: true,
      });
      
      // Filtrar erros relacionados a documentosComprobatorios
      const filteredErrors = errors.filter(error => 
        error.property !== 'documentosComprobatorios'
      );
      
      if (filteredErrors.length > 0) {
        const errorMessages = filteredErrors.map(error => 
          Object.values(error.constraints || {}).join(', ')
        ).join('; ');
        throw new BadRequestException(`Dados inválidos: ${errorMessages}`);
      }
      
      return object;
    }
    
    // Validações padrão do class-validator para outros DTOs
    const errors = await validate(object);
    if (errors.length > 0) {
      const errorMessages = errors.map(error => 
        Object.values(error.constraints || {}).join(', ')
      ).join('; ');
      throw new BadRequestException(`Dados inválidos: ${errorMessages}`);
    }

    // Validações específicas do SUAS
    if (metatype === CreateResultadoBeneficioCessadoDto) {
      await this.validarDadosSUAS(object as CreateResultadoBeneficioCessadoDto);
    }

    return object;
  }

  /**
   * Validações específicas conforme regulamentação SUAS
   */
  private async validarDadosSUAS(dto: CreateResultadoBeneficioCessadoDto): Promise<void> {
    // Validar combinação motivo + status vulnerabilidade
    this.validarCombinacaoMotivoStatus(dto.motivoEncerramento, dto.statusVulnerabilidade);

    // Validar documentos obrigatórios por motivo
    this.validarDocumentosObrigatoriosPorMotivo(dto.motivoEncerramento, dto.documentosComprobatorios || []);

    // Validar observações técnicas conforme contexto
    this.validarobservacoes(dto.motivoEncerramento, dto.observacoes);

    // Validar dados específicos por status de vulnerabilidade
    this.validarDadosPorStatusVulnerabilidade(dto.statusVulnerabilidade, dto);
  }

  /**
   * Valida combinações válidas entre motivo de encerramento e status de vulnerabilidade
   */
  private validarCombinacaoMotivoStatus(
    motivo: MotivoEncerramentoBeneficio,
    status: StatusVulnerabilidade
  ): void {
    const combinacoesInvalidas = new Map<MotivoEncerramentoBeneficio, StatusVulnerabilidade[]>([
      [MotivoEncerramentoBeneficio.SUPERACAO_VULNERABILIDADE, [
        StatusVulnerabilidade.AGRAVADA,
        StatusVulnerabilidade.MANTIDA
      ]],
      [MotivoEncerramentoBeneficio.AGRAVAMENTO_SITUACAO, [
        StatusVulnerabilidade.SUPERADA,
        StatusVulnerabilidade.TEMPORARIAMENTE_RESOLVIDA
      ]],
      [MotivoEncerramentoBeneficio.OBITO_BENEFICIARIO, [
        StatusVulnerabilidade.EM_SUPERACAO,
        StatusVulnerabilidade.NECESSITA_REAVALIACAO
      ]],
    ]);

    const statusInvalidos = combinacoesInvalidas.get(motivo);
    if (statusInvalidos && statusInvalidos.includes(status)) {
      throw new BadRequestException(
        `Combinação inválida: motivo "${motivo}" não é compatível com status "${status}"`
      );
    }
  }

  /**
   * Valida documentos obrigatórios baseado no motivo de encerramento
   */
  private validarDocumentosObrigatoriosPorMotivo(
    motivo: MotivoEncerramentoBeneficio,
    documentos: any[]
  ): void {
    const tiposPresentes = documentos.map(doc => doc.tipo);

    switch (motivo) {
      case MotivoEncerramentoBeneficio.SUPERACAO_VULNERABILIDADE:
        this.validarDocumentosSuperacao(tiposPresentes);
        break;
      case MotivoEncerramentoBeneficio.MUDANCA_MUNICIPIO:
        this.validarDocumentosMudanca(tiposPresentes);
        break;
      case MotivoEncerramentoBeneficio.OBITO_BENEFICIARIO:
        this.validarDocumentosObito(tiposPresentes);
        break;
      case MotivoEncerramentoBeneficio.DESCUMPRIMENTO_CONDICIONALIDADES:
        this.validarDocumentosDescumprimento(tiposPresentes);
        break;
      case MotivoEncerramentoBeneficio.MELHORIA_SOCIOECONOMICA:
        this.validarDocumentosRenda(tiposPresentes);
        break;
    }
  }

  /**
   * Valida documentos para superação de vulnerabilidade
   */
  private validarDocumentosSuperacao(tipos: TipoDocumentoComprobatorio[]): void {
    const obrigatorios = [
      TipoDocumentoComprobatorio.COMPROVANTE_RENDA,
      TipoDocumentoComprobatorio.FOTOGRAFIA
    ];

    const faltantes = obrigatorios.filter(tipo => !tipos.includes(tipo));
    if (faltantes.length > 0) {
      throw new BadRequestException(
        `Para superação de vulnerabilidade são obrigatórios: ${faltantes.join(', ')}`
      );
    }
  }

  /**
   * Valida documentos para mudança de território
   */
  private validarDocumentosMudanca(tipos: TipoDocumentoComprobatorio[]): void {
    const obrigatorios = [
      TipoDocumentoComprobatorio.COMPROVANTE_RESIDENCIA,
      TipoDocumentoComprobatorio.FOTOGRAFIA
    ];

    const faltantes = obrigatorios.filter(tipo => !tipos.includes(tipo));
    if (faltantes.length > 0) {
      throw new BadRequestException(
        `Para mudança de território são obrigatórios: ${faltantes.join(', ')}`
      );
    }
  }

  /**
   * Valida documentos para óbito do beneficiário
   */
  private validarDocumentosObito(tipos: TipoDocumentoComprobatorio[]): void {
    const temCertidaoObito = tipos.includes(TipoDocumentoComprobatorio.DOCUMENTO_PESSOAL);
    const temAtestadoMedico = tipos.includes(TipoDocumentoComprobatorio.LAUDO_MEDICO);

    if (!temCertidaoObito && !temAtestadoMedico) {
      throw new BadRequestException(
        'Para óbito é obrigatório: Certidão de Óbito ou Atestado Médico'
      );
    }
  }

  /**
   * Valida documentos para descumprimento de condicionalidades
   */
  private validarDocumentosDescumprimento(tipos: TipoDocumentoComprobatorio[]): void {
    const obrigatorios = [
      TipoDocumentoComprobatorio.RELATORIO_TECNICO,
      TipoDocumentoComprobatorio.FOTOGRAFIA
    ];

    const faltantes = obrigatorios.filter(tipo => !tipos.includes(tipo));
    if (faltantes.length > 0) {
      throw new BadRequestException(
        `Para descumprimento são obrigatórios: ${faltantes.join(', ')}`
      );
    }
  }

  /**
   * Valida documentos para alteração de renda
   */
  private validarDocumentosRenda(tipos: TipoDocumentoComprobatorio[]): void {
    const temComprovanteRenda = tipos.includes(TipoDocumentoComprobatorio.COMPROVANTE_RENDA);
    const temDeclaracaoRenda = tipos.includes(TipoDocumentoComprobatorio.COMPROVANTE_RENDA);

    if (!temComprovanteRenda && !temDeclaracaoRenda) {
      throw new BadRequestException(
        'Para alteração de renda é obrigatório: Comprovante ou Declaração de Renda'
      );
    }
  }

  /**
   * Valida observações técnicas conforme contexto
   */
  private validarobservacoes(
    motivo: MotivoEncerramentoBeneficio,
    observacoes?: string
  ): void {
    if (!observacoes || observacoes.trim().length < 10) {
      throw new BadRequestException(
        'Observações técnicas são obrigatórias e devem ter pelo menos 10 caracteres'
      );
    }

    // Validações específicas por motivo
    switch (motivo) {
      case MotivoEncerramentoBeneficio.DESCUMPRIMENTO_CONDICIONALIDADES:
        if (!observacoes.toLowerCase().includes('acompanhamento')) {
          throw new BadRequestException(
            'Para descumprimento, observações devem mencionar tentativas de acompanhamento'
          );
        }
        break;
      case MotivoEncerramentoBeneficio.SUPERACAO_VULNERABILIDADE:
        if (observacoes.length < 50) {
          throw new BadRequestException(
            'Para superação de vulnerabilidade, observações devem ser mais detalhadas (mín. 50 caracteres)'
          );
        }
        break;
    }
  }

  /**
   * Valida dados específicos por status de vulnerabilidade
   */
  private validarDadosPorStatusVulnerabilidade(
    status: StatusVulnerabilidade,
    dto: CreateResultadoBeneficioCessadoDto
  ): void {
    switch (status) {
      case StatusVulnerabilidade.NECESSITA_REAVALIACAO:
        if (!dto.observacoes?.includes('reavaliação')) {
          throw new BadRequestException(
            'Status "Necessita Reavaliação" requer justificativa nas observações'
          );
        }
        break;
      case StatusVulnerabilidade.AGRAVADA:
        if (!dto.observacoes?.includes('agravamento')) {
          throw new BadRequestException(
            'Status "Agravada" requer descrição do agravamento nas observações'
          );
        }
        break;
    }
  }

  /**
   * Verifica se o tipo deve ser validado
   */
  private toValidate(metatype: Function): boolean {
    const types: Function[] = [String, Boolean, Number, Array, Object];
    return !types.includes(metatype);
  }
}