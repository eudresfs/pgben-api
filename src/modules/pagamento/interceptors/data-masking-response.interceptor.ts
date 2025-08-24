import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { DataMaskingUtil } from '../utils/data-masking.util';

/**
 * Interceptor para mascaramento automático de dados sensíveis em respostas
 *
 * Este interceptor aplica mascaramento de dados bancários e outras informações
 * sensíveis automaticamente nas respostas dos controllers de pagamento.
 *
 * @author Equipe PGBen
 */
@Injectable()
export class DataMaskingResponseInterceptor implements NestInterceptor {
  /**
   * Campos que devem ser mascarados
   */
  private readonly sensitiveFields = [
    'conta',
    'agencia',
    'chavePix',
    'numeroCartao',
    'cvv',
    'cpf',
    'cnpj',
  ];

  /**
   * Campos bancários específicos que requerem mascaramento especial
   */
  private readonly bankingFields = {
    conta: true,
    agencia: true,
    chavePix: true,
  };

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      map((data) => {
        if (!data) return data;

        // Aplicar mascaramento baseado no tipo de dados
        return this.maskSensitiveData(data);
      }),
    );
  }

  /**
   * Aplica mascaramento recursivo em objetos
   *
   * @param data - Dados a serem mascarados
   * @returns Dados com informações sensíveis mascaradas
   */
  private maskSensitiveData(data: any): any {
    if (data === null || data === undefined) {
      return data;
    }

    // Se for array, aplicar mascaramento em cada item
    if (Array.isArray(data)) {
      return data.map((item) => this.maskSensitiveData(item));
    }

    // Se não for objeto, retornar como está
    if (typeof data !== 'object') {
      return data;
    }

    // Criar cópia do objeto para não modificar o original
    const maskedData = { ...data };

    // Aplicar mascaramento em campos específicos
    Object.keys(maskedData).forEach((key) => {
      const value = maskedData[key];

      // Mascaramento de informações bancárias
      if (
        key === 'infoBancaria' &&
        typeof value === 'object' &&
        value !== null
      ) {
        maskedData[key] = this.maskBankingInfo(value);
        return;
      }

      // Mascaramento de campos sensíveis diretos
      if (this.sensitiveFields.includes(key) && typeof value === 'string') {
        maskedData[key] = this.maskField(key, value);
        return;
      }

      // Recursão para objetos aninhados
      if (typeof value === 'object' && value !== null) {
        maskedData[key] = this.maskSensitiveData(value);
      }
    });

    return maskedData;
  }

  /**
   * Mascara informações bancárias específicas
   *
   * @param bankingInfo - Informações bancárias
   * @returns Informações bancárias mascaradas
   */
  private maskBankingInfo(bankingInfo: any): any {
    if (!bankingInfo || typeof bankingInfo !== 'object') {
      return bankingInfo;
    }

    // Usar o método consolidado do DataMaskingUtil
    return DataMaskingUtil.maskDadosBancarios({
      banco: bankingInfo.banco,
      conta: bankingInfo.conta,
      agencia: bankingInfo.agencia,
      pixKey: bankingInfo.chavePix,
      pixTipo: bankingInfo.tipoChavePix,
      titular: bankingInfo.titular,
    });
  }

  /**
   * Aplica mascaramento específico baseado no tipo de campo
   *
   * @param fieldName - Nome do campo
   * @param value - Valor a ser mascarado
   * @returns Valor mascarado
   */
  private maskField(fieldName: string, value: string): string {
    switch (fieldName) {
      case 'conta':
        return DataMaskingUtil.maskConta(value);

      case 'agencia':
        return DataMaskingUtil.maskAgencia(value);

      case 'chavePix':
        // Para chave PIX, assumir tipo 'aleatoria' se não especificado
        return DataMaskingUtil.maskPixKey(value, 'aleatoria');

      case 'cpf':
        return DataMaskingUtil.maskPixKey(value, 'cpf');

      case 'cnpj':
        return DataMaskingUtil.maskPixKey(value, 'cnpj');

      default:
        // Mascaramento genérico: mostrar apenas primeiros e últimos caracteres
        if (value.length <= 4) return value;
        const start = value.substring(0, 2);
        const end = value.substring(value.length - 2);
        const middle = '*'.repeat(Math.max(value.length - 4, 2));
        return start + middle + end;
    }
  }

  /**
   * Verifica se o contexto atual deve aplicar mascaramento
   *
   * @param context - Contexto de execução
   * @returns True se deve aplicar mascaramento
   */
  private shouldApplyMasking(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();

    // Não aplicar mascaramento em endpoints internos ou de debug
    const path = request.url;
    const debugPaths = ['/health', '/metrics', '/debug'];

    return !debugPaths.some((debugPath) => path.includes(debugPath));
  }
}
