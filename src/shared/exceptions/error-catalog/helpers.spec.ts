/**
 * Testes para as funções helper do catálogo de erros
 *
 * Valida a funcionalidade das funções auxiliares
 * para lançar erros padronizados.
 */

import {
  throwInvalidCpf,
  throwDuplicateCpf,
  throwInvalidNis,
  throwDuplicateNis,
  throwInvalidAge,
  throwInvalidIncome,
  throwIncomeExceedsLimit,
  throwNatalidadeAlreadyReceived,
  throwInvalidBirthDateForNatalidade,
  throwAluguelAlreadyActive,
  throwInvalidPropertyForAluguel,
  throwBenefitNotFound,
  throwInvalidWorkflowTransition,
  throwAzureBlobUploadFailed,
  throwEmailSendFailed,
  throwDatabaseConnectionFailed,
  throwPermissionDenied,
  throwDocumentRequired,
  throwApprovalDeadlineExceeded,
  throwForeignKeyViolation,
  throwUniqueConstraintViolation,
  throwRateLimitExceeded,
  throwMaintenanceMode,
  throwFromPostgresError,
} from './helpers';
import { AppError } from './AppError';

describe('Error Helpers', () => {
  describe('Validation Helpers', () => {
    describe('throwInvalidCpf', () => {
      it('should throw AppError with VAL_CPF_001 code', () => {
        expect(() => throwInvalidCpf('12345678901')).toThrow(AppError);

        try {
          throwInvalidCpf('12345678901');
        } catch (error) {
          expect(error.errorCode).toBe('VAL_CPF_001');
          expect(error.context.cpf).toBe('12345678901');
        }
      });
    });

    describe('throwDuplicateCpf', () => {
      it('should throw AppError with VAL_CPF_002 code', () => {
        expect(() => throwDuplicateCpf('12345678901')).toThrow(AppError);

        try {
          throwDuplicateCpf('12345678901');
        } catch (error) {
          expect(error.errorCode).toBe('VAL_CPF_002');
          expect(error.context.cpf).toBe('12345678901');
          expect(error.message).toContain('12345678901');
        }
      });
    });

    describe('throwInvalidNis', () => {
      it('should throw AppError with VAL_NIS_001 code', () => {
        expect(() => throwInvalidNis('12345678901')).toThrow(AppError);

        try {
          throwInvalidNis('12345678901');
        } catch (error) {
          expect(error.errorCode).toBe('VAL_NIS_001');
          expect(error.context.nis).toBe('12345678901');
        }
      });
    });

    describe('throwDuplicateNis', () => {
      it('should throw AppError with VAL_NIS_002 code', () => {
        expect(() => throwDuplicateNis('12345678901')).toThrow(AppError);

        try {
          throwDuplicateNis('12345678901');
        } catch (error) {
          expect(error.errorCode).toBe('VAL_NIS_002');
          expect(error.context.nis).toBe('12345678901');
          expect(error.message).toContain('12345678901');
        }
      });
    });

    describe('throwInvalidAge', () => {
      it('should throw AppError with VAL_AGE_001 code', () => {
        expect(() => throwInvalidAge(17, 18, 65)).toThrow(AppError);

        try {
          throwInvalidAge(17, 18, 65);
        } catch (error) {
          expect(error.errorCode).toBe('VAL_AGE_001');
          expect(error.context.age).toBe(17);
          expect(error.context.minAge).toBe(18);
          expect(error.context.maxAge).toBe(65);
          expect(error.message).toContain('18');
          expect(error.message).toContain('65');
        }
      });
    });

    describe('throwInvalidIncome', () => {
      it('should throw AppError with VAL_INCOME_001 code', () => {
        expect(() => throwInvalidIncome(-100)).toThrow(AppError);

        try {
          throwInvalidIncome(-100);
        } catch (error) {
          expect(error.errorCode).toBe('VAL_INCOME_001');
          expect(error.context.income).toBe(-100);
        }
      });
    });

    describe('throwIncomeExceedsLimit', () => {
      it('should throw AppError with VAL_INCOME_002 code', () => {
        expect(() =>
          throwIncomeExceedsLimit(1000, 500, 'Auxílio Natalidade'),
        ).toThrow(AppError);

        try {
          throwIncomeExceedsLimit(1000, 500, 'Auxílio Natalidade');
        } catch (error) {
          expect(error.errorCode).toBe('VAL_INCOME_002');
          expect(error.context.income).toBe(1000);
          expect(error.context.limit).toBe(500);
          expect(error.context.benefitType).toBe('Auxílio Natalidade');
          expect(error.message).toContain('1000');
          expect(error.message).toContain('500');
        }
      });
    });
  });

  describe('Benefit Helpers', () => {
    describe('throwNatalidadeAlreadyReceived', () => {
      it('should throw AppError with BEN_NAT_001 code', () => {
        expect(() => throwNatalidadeAlreadyReceived('123', 12)).toThrow(
          AppError,
        );

        try {
          throwNatalidadeAlreadyReceived('123', 12);
        } catch (error) {
          expect(error.errorCode).toBe('BEN_NAT_001');
          expect(error.context.citizenId).toBe('123');
          expect(error.context.months).toBe(12);
          expect(error.message).toContain('12');
        }
      });
    });

    describe('throwInvalidBirthDateForNatalidade', () => {
      it('should throw AppError with BEN_NAT_002 code', () => {
        const birthDate = new Date('2024-01-01');
        const minDate = new Date('2023-12-01');

        expect(() =>
          throwInvalidBirthDateForNatalidade(birthDate, minDate),
        ).toThrow(AppError);

        try {
          throwInvalidBirthDateForNatalidade(birthDate, minDate);
        } catch (error) {
          expect(error.errorCode).toBe('BEN_NAT_002');
          expect(error.context.birthDate).toBe(birthDate);
          expect(error.context.minDate).toBe(minDate);
        }
      });
    });

    describe('throwAluguelAlreadyActive', () => {
      it('should throw AppError with BEN_ALU_001 code', () => {
        expect(() => throwAluguelAlreadyActive('123', 'benefit-456')).toThrow(
          AppError,
        );

        try {
          throwAluguelAlreadyActive('123', 'benefit-456');
        } catch (error) {
          expect(error.errorCode).toBe('BEN_ALU_001');
          expect(error.context.citizenId).toBe('123');
          expect(error.context.activeBenefitId).toBe('benefit-456');
        }
      });
    });

    describe('throwInvalidPropertyForAluguel', () => {
      it('should throw AppError with BEN_ALU_002 code', () => {
        expect(() =>
          throwInvalidPropertyForAluguel('123', 'property-789'),
        ).toThrow(AppError);

        try {
          throwInvalidPropertyForAluguel('123', 'property-789');
        } catch (error) {
          expect(error.errorCode).toBe('BEN_ALU_002');
          expect(error.context.citizenId).toBe('123');
          expect(error.context.propertyId).toBe('property-789');
        }
      });
    });

    describe('throwBenefitNotFound', () => {
      it('should throw AppError with BEN_GEN_001 code', () => {
        expect(() => throwBenefitNotFound('benefit-123')).toThrow(AppError);

        try {
          throwBenefitNotFound('benefit-123');
        } catch (error) {
          expect(error.errorCode).toBe('BEN_GEN_001');
          expect(error.context.benefitId).toBe('benefit-123');
          expect(error.message).toContain('benefit-123');
        }
      });
    });

    describe('throwInvalidWorkflowTransition', () => {
      it('should throw AppError with BEN_WF_001 code', () => {
        expect(() =>
          throwInvalidWorkflowTransition('PENDING', 'CANCELLED', 'benefit-123'),
        ).toThrow(AppError);

        try {
          throwInvalidWorkflowTransition('PENDING', 'CANCELLED', 'benefit-123');
        } catch (error) {
          expect(error.errorCode).toBe('BEN_WF_001');
          expect(error.context.currentStatus).toBe('PENDING');
          expect(error.context.targetStatus).toBe('CANCELLED');
          expect(error.context.benefitId).toBe('benefit-123');
          expect(error.message).toContain('PENDING');
          expect(error.message).toContain('CANCELLED');
        }
      });
    });
  });

  describe('Integration Helpers', () => {
    describe('throwAzureBlobUploadFailed', () => {
      it('should throw AppError with INT_AZURE_001 code', () => {
        const originalError = new Error('Connection timeout');

        expect(() =>
          throwAzureBlobUploadFailed('document.pdf', originalError),
        ).toThrow(AppError);

        try {
          throwAzureBlobUploadFailed('document.pdf', originalError);
        } catch (error) {
          expect(error.errorCode).toBe('INT_AZURE_001');
          expect(error.context.filename).toBe('document.pdf');
          expect(error.context.originalError).toBe(originalError);
          expect(error.message).toContain('document.pdf');
        }
      });
    });

    describe('throwEmailSendFailed', () => {
      it('should throw AppError with INT_EMAIL_001 code', () => {
        const originalError = new Error('SMTP error');

        expect(() =>
          throwEmailSendFailed('user@example.com', originalError),
        ).toThrow(AppError);

        try {
          throwEmailSendFailed('user@example.com', originalError);
        } catch (error) {
          expect(error.errorCode).toBe('INT_EMAIL_001');
          expect(error.context.email).toBe('user@example.com');
          expect(error.context.originalError).toBe(originalError);
          expect(error.message).toContain('user@example.com');
        }
      });
    });

    describe('throwDatabaseConnectionFailed', () => {
      it('should throw AppError with INT_DB_001 code', () => {
        const originalError = new Error('Connection refused');

        expect(() => throwDatabaseConnectionFailed(originalError)).toThrow(
          AppError,
        );

        try {
          throwDatabaseConnectionFailed(originalError);
        } catch (error) {
          expect(error.errorCode).toBe('INT_DB_001');
          expect(error.context.originalError).toBe(originalError);
        }
      });
    });
  });

  describe('Operational Flow Helpers', () => {
    describe('throwPermissionDenied', () => {
      it('should throw AppError with FLO_PERM_001 code', () => {
        expect(() =>
          throwPermissionDenied('user-123', 'DELETE_CITIZEN'),
        ).toThrow(AppError);

        try {
          throwPermissionDenied('user-123', 'DELETE_CITIZEN');
        } catch (error) {
          expect(error.errorCode).toBe('FLO_PERM_001');
          expect(error.context.userId).toBe('user-123');
          expect(error.context.requiredPermission).toBe('DELETE_CITIZEN');
        }
      });
    });

    describe('throwDocumentRequired', () => {
      it('should throw AppError with FLO_DOC_001 code', () => {
        expect(() => throwDocumentRequired('RG', 'benefit-123')).toThrow(
          AppError,
        );

        try {
          throwDocumentRequired('RG', 'benefit-123');
        } catch (error) {
          expect(error.errorCode).toBe('FLO_DOC_001');
          expect(error.context.documentType).toBe('RG');
          expect(error.context.benefitId).toBe('benefit-123');
          expect(error.message).toContain('RG');
        }
      });
    });

    describe('throwApprovalDeadlineExceeded', () => {
      it('should throw AppError with FLO_DEADLINE_001 code', () => {
        expect(() => throwApprovalDeadlineExceeded('benefit-123', 30)).toThrow(
          AppError,
        );

        try {
          throwApprovalDeadlineExceeded('benefit-123', 30);
        } catch (error) {
          expect(error.errorCode).toBe('FLO_DEADLINE_001');
          expect(error.context.benefitId).toBe('benefit-123');
          expect(error.context.days).toBe(30);
          expect(error.message).toContain('30');
        }
      });
    });
  });

  describe('System Helpers', () => {
    describe('throwForeignKeyViolation', () => {
      it('should throw AppError with SYS_FK_001 code', () => {
        expect(() =>
          throwForeignKeyViolation('fk_cidadao_unidade', 'cidadao'),
        ).toThrow(AppError);

        try {
          throwForeignKeyViolation('fk_cidadao_unidade', 'cidadao');
        } catch (error) {
          expect(error.errorCode).toBe('SYS_FK_001');
          expect(error.context.constraint).toBe('fk_cidadao_unidade');
          expect(error.context.table).toBe('cidadao');
        }
      });
    });

    describe('throwUniqueConstraintViolation', () => {
      it('should throw AppError with SYS_UNIQUE_001 code', () => {
        expect(() =>
          throwUniqueConstraintViolation('uk_cidadao_cpf', 'cidadao'),
        ).toThrow(AppError);

        try {
          throwUniqueConstraintViolation('uk_cidadao_cpf', 'cidadao');
        } catch (error) {
          expect(error.errorCode).toBe('SYS_UNIQUE_001');
          expect(error.context.constraint).toBe('uk_cidadao_cpf');
          expect(error.context.table).toBe('cidadao');
        }
      });
    });

    describe('throwRateLimitExceeded', () => {
      it('should throw AppError with SYS_RATE_001 code', () => {
        expect(() => throwRateLimitExceeded('user-123', 60)).toThrow(AppError);

        try {
          throwRateLimitExceeded('user-123', 60);
        } catch (error) {
          expect(error.errorCode).toBe('SYS_RATE_001');
          expect(error.context.userId).toBe('user-123');
          expect(error.context.retryAfter).toBe(60);
          expect(error.message).toContain('60');
        }
      });
    });

    describe('throwMaintenanceMode', () => {
      it('should throw AppError with SYS_MAINT_001 code', () => {
        const estimatedTime = new Date('2024-01-15T12:00:00Z');

        expect(() => throwMaintenanceMode(estimatedTime)).toThrow(AppError);

        try {
          throwMaintenanceMode(estimatedTime);
        } catch (error) {
          expect(error.errorCode).toBe('SYS_MAINT_001');
          expect(error.context.estimatedTime).toBe(estimatedTime);
        }
      });
    });
  });

  describe('Generic Helper', () => {
    describe('throwFromPostgresError', () => {
      it('should throw mapped AppError for known PostgreSQL codes', () => {
        const pgError = {
          code: '23505',
          message: 'duplicate key value violates unique constraint',
          constraint: 'uk_cidadao_cpf',
          table: 'cidadao',
        };

        const context = {
          operationalContext: {
            module: 'cidadao',
            operation: 'create',
          },
        };

        expect(() => throwFromPostgresError('23505', pgError, context)).toThrow(
          AppError,
        );

        try {
          throwFromPostgresError('23505', pgError, context);
        } catch (error) {
          expect(error.errorCode).toBe('SYS_UNIQUE_001');
          expect(error.context.operationalContext).toEqual(
            context.operationalContext,
          );
          expect(error.context.metadata).toEqual({
            constraint: 'uk_cidadao_cpf',
            table: 'cidadao',
            originalError: pgError,
          });
        }
      });

      it('should throw error for unmapped PostgreSQL codes', () => {
        const pgError = {
          code: '99999',
          message: 'unknown error',
        };

        expect(() => throwFromPostgresError('99999', pgError, {})).toThrow(
          'Código PostgreSQL 99999 não mapeado no catálogo',
        );
      });

      it('should handle optional parameters', () => {
        const pgError = {
          code: '23503',
          message: 'foreign key violation',
        };

        expect(() => throwFromPostgresError('23503', pgError)).toThrow(
          AppError,
        );

        try {
          throwFromPostgresError('23503', pgError);
        } catch (error) {
          expect(error.errorCode).toBe('SYS_FK_001');
          expect(error.context).toBeDefined();
        }
      });
    });
  });

  describe('Context Handling', () => {
    it('should merge additional context with helper context', () => {
      const additionalContext = {
        operationalContext: {
          module: 'cidadao',
          operation: 'create',
        },
        requestId: 'req-123',
      };

      try {
        throwDuplicateCpf('12345678901', additionalContext);
      } catch (error) {
        expect(error.context.cpf).toBe('12345678901');
        expect(error.context.operationalContext).toEqual(
          additionalContext.operationalContext,
        );
        expect(error.context.requestId).toBe('req-123');
      }
    });

    it('should handle empty additional context', () => {
      try {
        throwInvalidCpf('12345678901', {});
      } catch (error) {
        expect(error.context.cpf).toBe('12345678901');
      }
    });

    it('should handle undefined additional context', () => {
      try {
        throwInvalidCpf('12345678901');
      } catch (error) {
        expect(error.context.cpf).toBe('12345678901');
      }
    });
  });
});
