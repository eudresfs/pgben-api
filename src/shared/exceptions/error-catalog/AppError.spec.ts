/**
 * Testes para a classe AppError
 *
 * Valida a funcionalidade da classe principal
 * de erro do sistema de catálogo.
 */

import { AppError, ErrorContext } from './AppError';
import { ERROR_CATALOG, ErrorSeverity, ErrorCategory } from './catalog';

describe('AppError', () => {
  describe('Constructor', () => {
    it('should create AppError with valid error code', () => {
      const error = new AppError('VAL_CPF_001');

      expect(error).toBeInstanceOf(AppError);
      expect(error.errorCode).toBe('VAL_CPF_001');
      expect(error.definition).toBe(ERROR_CATALOG['VAL_CPF_001']);
      expect(error.getStatus()).toBe(400);
    });

    it('should create AppError with context', () => {
      const context: ErrorContext = {
        cpf: '12345678901',
        operationalContext: {
          module: 'cidadao',
          operation: 'create',
        },
      };

      const error = new AppError('VAL_CPF_001', context);

      expect(error.context).toEqual(context);
    });

    it('should create AppError with custom message', () => {
      const customMessage = 'Mensagem personalizada';
      const error = new AppError('VAL_CPF_001', {}, customMessage);

      expect(error.message).toBe(customMessage);
    });

    it('should throw error for invalid error code', () => {
      expect(() => {
        new AppError('INVALID_CODE');
      }).toThrow('Código de erro INVALID_CODE não encontrado no catálogo');
    });
  });

  describe('Message Interpolation', () => {
    it('should interpolate message with context values', () => {
      const context = { cpf: '12345678901' };
      const error = new AppError('VAL_CPF_002', context);

      expect(error.message).toBe(
        'Já existe um cidadão cadastrado com o CPF 12345678901',
      );
    });

    it('should handle missing context values gracefully', () => {
      const error = new AppError('VAL_CPF_002', {});

      expect(error.message).toBe(
        'Já existe um cidadão cadastrado com o CPF {cpf}',
      );
    });

    it('should interpolate multiple placeholders', () => {
      const context = { minAge: 18, maxAge: 65 };
      const error = new AppError('VAL_AGE_001', context);

      expect(error.message).toBe('Idade deve estar entre 18 e 65 anos');
    });
  });

  describe('Localized Messages', () => {
    it('should return Portuguese message by default', () => {
      const error = new AppError('VAL_CPF_001');

      expect(error.getLocalizedMessage()).toBe('CPF informado é inválido');
    });

    it('should return Portuguese message for pt-BR locale', () => {
      const error = new AppError('VAL_CPF_001');

      expect(error.getLocalizedMessage('pt-BR')).toBe(
        'CPF informado é inválido',
      );
    });

    it('should fallback to default message for unsupported locale', () => {
      const error = new AppError('VAL_CPF_001');

      expect(error.getLocalizedMessage('en-US')).toBe(
        'CPF informado é inválido',
      );
    });
  });

  describe('JSON Representation', () => {
    it('should return complete JSON representation', () => {
      const context: ErrorContext = {
        cpf: '12345678901',
        operationalContext: {
          module: 'cidadao',
          operation: 'create',
        },
      };

      const error = new AppError('VAL_CPF_002', context);
      const json = error.toJSON();

      expect(json).toHaveProperty('errorCode', 'VAL_CPF_002');
      expect(json).toHaveProperty('message');
      expect(json).toHaveProperty('httpStatus', 409);
      expect(json).toHaveProperty('category', ErrorCategory.VALIDATION);
      expect(json).toHaveProperty('severity', ErrorSeverity.MEDIUM);
      expect(json).toHaveProperty('context', context);
      expect(json).toHaveProperty('timestamp');
    });

    it('should include legal reference when available', () => {
      const error = new AppError('BEN_NAT_001');
      const json = error.toJSON();

      if (ERROR_CATALOG['BEN_NAT_001'].legalReference) {
        expect(json).toHaveProperty('legalReference');
      }
    });
  });

  describe('Log Data', () => {
    it('should return sanitized log data', () => {
      const context: ErrorContext = {
        cpf: '12345678901',
        password: 'secret123',
        operationalContext: {
          module: 'cidadao',
          operation: 'create',
        },
      };

      const error = new AppError('VAL_CPF_002', context);
      const logData = error.getLogData();

      expect(logData.context.cpf).toBe('***.***.***-**');
      expect(logData.context.password).toBe('[REDACTED]');
      expect(logData.context.operationalContext).toEqual(
        context.operationalContext,
      );
    });

    it('should include stack trace in log data', () => {
      const error = new AppError('VAL_CPF_001');
      const logData = error.getLogData();

      expect(logData).toHaveProperty('stack');
      expect(logData.stack).toBeTruthy();
    });
  });

  describe('API Data', () => {
    it('should return API-safe data without sensitive information', () => {
      const context: ErrorContext = {
        cpf: '12345678901',
        password: 'secret123',
        operationalContext: {
          module: 'cidadao',
          operation: 'create',
        },
      };

      const error = new AppError('VAL_CPF_002', context);
      const apiData = error.getApiData();

      expect(apiData.context).not.toHaveProperty('password');
      expect(apiData).not.toHaveProperty('stack');
      expect(apiData).toHaveProperty('errorCode');
      expect(apiData).toHaveProperty('message');
      expect(apiData).toHaveProperty('httpStatus');
    });
  });

  describe('Severity and Category Checks', () => {
    it('should correctly identify critical errors', () => {
      const error = new AppError('INT_DB_001');

      expect(error.isCritical()).toBe(true);
      expect(error.isHigh()).toBe(false);
    });

    it('should correctly identify high severity errors', () => {
      const error = new AppError('BEN_NAT_001');

      expect(error.isHigh()).toBe(true);
      expect(error.isCritical()).toBe(false);
    });

    it('should correctly identify validation category', () => {
      const error = new AppError('VAL_CPF_001');

      expect(error.isValidationError()).toBe(true);
      expect(error.isBenefitError()).toBe(false);
    });

    it('should correctly identify benefit category', () => {
      const error = new AppError('BEN_NAT_001');

      expect(error.isBenefitError()).toBe(true);
      expect(error.isValidationError()).toBe(false);
    });
  });

  describe('Static Factory Methods', () => {
    it('should create AppError from PostgreSQL error code', () => {
      const pgError = {
        code: '23505',
        message: 'duplicate key value violates unique constraint',
        constraint: 'uk_cidadao_cpf',
        table: 'cidadao',
      };

      const context: ErrorContext = {
        operationalContext: {
          module: 'cidadao',
          operation: 'create',
        },
      };

      const error = AppError.fromPostgresError('23505', pgError, context);

      expect(error).toBeInstanceOf(AppError);
      expect(error.errorCode).toBe('SYS_UNIQUE_001');
    });

    it('should throw error for unmapped PostgreSQL code', () => {
      const pgError = {
        code: '99999',
        message: 'unknown error',
      };

      expect(() => {
        AppError.fromPostgresError('99999', pgError, {});
      }).toThrow('Código PostgreSQL 99999 não mapeado no catálogo');
    });
  });

  describe('Error Inheritance', () => {
    it('should be instance of Error', () => {
      const error = new AppError('VAL_CPF_001');

      expect(error).toBeInstanceOf(Error);
    });

    it('should have correct name property', () => {
      const error = new AppError('VAL_CPF_001');

      expect(error.name).toBe('AppError');
    });

    it('should have stack trace', () => {
      const error = new AppError('VAL_CPF_001');

      expect(error.stack).toBeTruthy();
    });
  });

  describe('Context Validation', () => {
    it('should handle empty context', () => {
      const error = new AppError('VAL_CPF_001', {});

      expect(error.context).toEqual({});
    });

    it('should handle undefined context', () => {
      const error = new AppError('VAL_CPF_001');

      expect(error.context).toEqual({});
    });

    it('should preserve complex context objects', () => {
      const context: ErrorContext = {
        operationalContext: {
          module: 'cidadao',
          operation: 'create',
          entityType: 'Cidadao',
          entityId: '123',
        },
        metadata: {
          constraint: 'uk_cidadao_cpf',
          table: 'cidadao',
          userAgent: 'Mozilla/5.0...',
        },
      };

      const error = new AppError('VAL_CPF_001', context);

      expect(error.context).toEqual(context);
    });
  });
});
