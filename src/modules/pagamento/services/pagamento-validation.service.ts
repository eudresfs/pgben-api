import { Injectable, BadRequestException } from '@nestjs/common';
import { StatusPagamentoEnum } from '../../../enums/status-pagamento.enum';
import { PagamentoCreateDto } from '../dtos/pagamento-create.dto';
import { StatusTransitionValidator } from '../validators/status-transition-validator';
import { DadosBancariosValidator } from '../validators/dados-bancarios-validator';
import { PixValidator } from '../validators/pix-validator';

/**
 * Resultado de validação
 */
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings?: string[];
}

/**
 * Informações bancárias para validação
 */
export interface BankingInfo {
  banco?: string;
  agencia?: string;
  conta?: string;
  chavePix?: string;
  tipoChavePix?: 'CPF' | 'CNPJ' | 'EMAIL' | 'TELEFONE' | 'ALEATORIA';
}

/**
 * Serviço consolidado para todas as validações do módulo de pagamento.
 * 
 * Este serviço centraliza todas as validações relacionadas a pagamentos,
 * incluindo validações de criação, transições de status e dados bancários.
 * 
 * @author Equipe PGBen
 */
@Injectable()
export class PagamentoValidationService {
  constructor(
    private readonly statusTransitionValidator: StatusTransitionValidator,
    private readonly dadosBancariosValidator: DadosBancariosValidator,
    private readonly pixValidator: PixValidator,
  ) {}

  /**
   * Valida os dados para criação de um novo pagamento
   * 
   * @param data - Dados do pagamento a ser criado
   * @returns Resultado da validação
   */
  validatePaymentCreation(data: PagamentoCreateDto): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validação de valor
    if (!data.valor || data.valor <= 0) {
      errors.push('Valor do pagamento deve ser maior que zero');
    }

    // Validação de valor máximo (exemplo: R$ 50.000)
    if (data.valor && data.valor > 50000) {
      warnings.push('Valor do pagamento é superior a R$ 50.000 - requer aprovação especial');
    }

    // Validação de solicitação
    if (!data.solicitacaoId) {
      errors.push('ID da solicitação é obrigatório');
    }

    // Validação de informação bancária
    if (!data.infoBancariaId) {
      errors.push('Informação bancária é obrigatória');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  }

  /**
   * Valida transição de status de pagamento
   * 
   * @param from - Status atual
   * @param to - Status desejado
   * @returns Resultado da validação
   */
  validateStatusTransition(from: StatusPagamentoEnum, to: StatusPagamentoEnum): ValidationResult {
    try {
      const isValid = this.statusTransitionValidator.canTransition(from, to);
      
      if (!isValid) {
        return {
          isValid: false,
          errors: [`Transição de status inválida: ${from} → ${to}`],
        };
      }

      return {
        isValid: true,
        errors: [],
      };
    } catch (error) {
      return {
        isValid: false,
        errors: [error.message || 'Erro na validação de transição de status'],
      };
    }
  }

  /**
   * Valida dados bancários
   * 
   * @param data - Informações bancárias
   * @returns Resultado da validação
   */
  validateBankingData(data: BankingInfo): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Validação de dados bancários tradicionais
      if (data.banco && data.agencia && data.conta) {
        // Validar cada componente dos dados bancários
        const bancoValido = this.dadosBancariosValidator.validarCodigoBanco(data.banco);
        const agenciaValida = this.dadosBancariosValidator.validarAgencia(data.agencia, data.banco);
        const contaValida = this.dadosBancariosValidator.validarConta(data.conta, data.banco);
        
        const bankValidation = {
          valido: bancoValido && agenciaValida && contaValida,
          erros: [
            ...(!bancoValido ? ['Código do banco inválido'] : []),
            ...(!agenciaValida ? ['Número da agência inválido'] : []),
            ...(!contaValida ? ['Número da conta inválido'] : [])
          ]
        };

        if (!bankValidation.valido) {
          errors.push(...bankValidation.erros);
        }
      }

      // Validação de PIX
      if (data.chavePix && data.tipoChavePix) {
        const pixValidation = this.pixValidator.validarChavePix(
          data.chavePix,
          data.tipoChavePix,
        );
        
        const pixResult = {
          valido: pixValidation,
          erros: pixValidation ? [] : ['Chave PIX inválida']
        };

        if (!pixResult.valido) {
          errors.push(...pixResult.erros);
        }
      }

      // Verificação de completude
      const hasTraditionalData = data.banco && data.agencia && data.conta;
      const hasPixData = data.chavePix && data.tipoChavePix;

      if (!hasTraditionalData && !hasPixData) {
        errors.push('É necessário fornecer dados bancários tradicionais ou chave PIX');
      }

      return {
        isValid: errors.length === 0,
        errors,
        warnings: warnings.length > 0 ? warnings : undefined,
      };
    } catch (error) {
      return {
        isValid: false,
        errors: [error.message || 'Erro na validação de dados bancários'],
      };
    }
  }

  /**
   * Valida se um pagamento pode ser liberado
   * 
   * @param pagamentoId - ID do pagamento
   * @param currentStatus - Status atual do pagamento
   * @returns Resultado da validação
   */
  validatePaymentRelease(pagamentoId: string, currentStatus: StatusPagamentoEnum): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Verificar se o status permite liberação
    const canRelease = this.validateStatusTransition(currentStatus, StatusPagamentoEnum.LIBERADO);
    if (!canRelease.isValid) {
      errors.push(...canRelease.errors);
    }

    // Validações adicionais específicas para liberação
    if (currentStatus === StatusPagamentoEnum.CANCELADO) {
      errors.push('Não é possível liberar um pagamento cancelado');
    }

    if (currentStatus === StatusPagamentoEnum.VENCIDO) {
      warnings.push('Liberando pagamento que estava vencido');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  }

  /**
   * Valida múltiplas regras de negócio de uma vez
   * 
   * @param validations - Array de funções de validação
   * @returns Resultado consolidado
   */
  validateMultiple(validations: (() => ValidationResult)[]): ValidationResult {
    const allErrors: string[] = [];
    const allWarnings: string[] = [];

    for (const validation of validations) {
      const result = validation();
      allErrors.push(...result.errors);
      if (result.warnings) {
        allWarnings.push(...result.warnings);
      }
    }

    return {
      isValid: allErrors.length === 0,
      errors: allErrors,
      warnings: allWarnings.length > 0 ? allWarnings : undefined,
    };
  }

  /**
   * Lança exceção se a validação falhar
   * 
   * @param result - Resultado da validação
   * @param context - Contexto para a mensagem de erro
   */
  throwIfInvalid(result: ValidationResult, context: string = 'Validação'): void {
    if (!result.isValid) {
      throw new BadRequestException({
        message: `${context} falhou`,
        errors: result.errors,
        warnings: result.warnings,
      });
    }
  }
}