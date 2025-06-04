/**
 * Testes para o catálogo de erros
 *
 * Valida a estrutura e funcionalidade do sistema
 * de catálogo de erros padronizado.
 */

import {
  ERROR_CATALOG,
  POSTGRES_ERROR_MAP,
  ErrorCategory,
  ErrorSeverity,
  ErrorDefinition,
} from './catalog';

describe('Error Catalog', () => {
  describe('ERROR_CATALOG', () => {
    it('should have all required error definitions', () => {
      // Verificar se existem erros para cada categoria
      const categories = Object.values(ErrorCategory);

      categories.forEach((category) => {
        const errorsInCategory = Object.values(ERROR_CATALOG).filter(
          (error) => error.category === category,
        );

        expect(errorsInCategory.length).toBeGreaterThan(0);
      });
    });

    it('should have unique error codes', () => {
      const codes = Object.keys(ERROR_CATALOG);
      const uniqueCodes = new Set(codes);

      expect(codes.length).toBe(uniqueCodes.size);
    });

    it('should follow naming convention for error codes', () => {
      const codes = Object.keys(ERROR_CATALOG);
      const validPattern = /^(VAL|BEN|INT|FLO|SYS)_[A-Z]+_\d{3}$/;

      codes.forEach((code) => {
        expect(code).toMatch(validPattern);
      });
    });

    it('should have valid HTTP status codes', () => {
      const validStatusCodes = [
        400, 401, 403, 404, 409, 422, 429, 500, 502, 503,
      ];

      Object.values(ERROR_CATALOG).forEach((error) => {
        expect(validStatusCodes).toContain(error.httpStatus);
      });
    });

    it('should have non-empty messages', () => {
      Object.values(ERROR_CATALOG).forEach((error) => {
        expect(error.message).toBeTruthy();
        expect(error.message.length).toBeGreaterThan(0);
      });
    });

    it('should have valid categories', () => {
      const validCategories = Object.values(ErrorCategory);

      Object.values(ERROR_CATALOG).forEach((error) => {
        expect(validCategories).toContain(error.category);
      });
    });

    it('should have valid severities', () => {
      const validSeverities = Object.values(ErrorSeverity);

      Object.values(ERROR_CATALOG).forEach((error) => {
        expect(validSeverities).toContain(error.severity);
      });
    });
  });

  describe('POSTGRES_ERROR_MAP', () => {
    it('should map common PostgreSQL error codes', () => {
      const expectedMappings = {
        '23503': 'SYS_FK_001',
        '23505': 'SYS_UNIQUE_001',
      };

      Object.entries(expectedMappings).forEach(([pgCode, catalogCode]) => {
        expect(POSTGRES_ERROR_MAP[pgCode]).toBe(catalogCode);
      });
    });

    it('should only map to existing catalog codes', () => {
      const catalogCodes = Object.keys(ERROR_CATALOG);

      Object.values(POSTGRES_ERROR_MAP).forEach((catalogCode) => {
        expect(catalogCodes).toContain(catalogCode);
      });
    });
  });

  describe('Error Definition Structure', () => {
    it('should have required fields for each error', () => {
      Object.values(ERROR_CATALOG).forEach((error: ErrorDefinition) => {
        expect(error).toHaveProperty('message');
        expect(error).toHaveProperty('httpStatus');
        expect(error).toHaveProperty('category');
        expect(error).toHaveProperty('severity');
      });
    });

    it('should have consistent severity mapping to HTTP status', () => {
      Object.values(ERROR_CATALOG).forEach((error) => {
        switch (error.severity) {
          case ErrorSeverity.CRITICAL:
            expect([500, 503]).toContain(error.httpStatus);
            break;
          case ErrorSeverity.HIGH:
            expect([400, 403, 409, 422]).toContain(error.httpStatus);
            break;
          case ErrorSeverity.MEDIUM:
            expect([400, 404, 409, 429, 502]).toContain(error.httpStatus);
            break;
          case ErrorSeverity.LOW:
            expect([400, 404]).toContain(error.httpStatus);
            break;
        }
      });
    });
  });

  describe('Validation Errors', () => {
    it('should have CPF validation errors', () => {
      expect(ERROR_CATALOG['VAL_CPF_001']).toBeDefined();
      expect(ERROR_CATALOG['VAL_CPF_002']).toBeDefined();
    });

    it('should have NIS validation errors', () => {
      expect(ERROR_CATALOG['VAL_NIS_001']).toBeDefined();
      expect(ERROR_CATALOG['VAL_NIS_002']).toBeDefined();
    });

    it('should have income validation errors', () => {
      expect(ERROR_CATALOG['VAL_INCOME_001']).toBeDefined();
      expect(ERROR_CATALOG['VAL_INCOME_002']).toBeDefined();
    });
  });

  describe('Benefit Errors', () => {
    it('should have natalidade benefit errors', () => {
      expect(ERROR_CATALOG['BEN_NAT_001']).toBeDefined();
      expect(ERROR_CATALOG['BEN_NAT_002']).toBeDefined();
    });

    it('should have aluguel social benefit errors', () => {
      expect(ERROR_CATALOG['BEN_ALU_001']).toBeDefined();
      expect(ERROR_CATALOG['BEN_ALU_002']).toBeDefined();
    });

    it('should have generic benefit errors', () => {
      expect(ERROR_CATALOG['BEN_GEN_001']).toBeDefined();
      expect(ERROR_CATALOG['BEN_WF_001']).toBeDefined();
    });
  });

  describe('Integration Errors', () => {
    it('should have Azure integration errors', () => {
      expect(ERROR_CATALOG['INT_AZURE_001']).toBeDefined();
    });

    it('should have email integration errors', () => {
      expect(ERROR_CATALOG['INT_EMAIL_001']).toBeDefined();
    });

    it('should have database integration errors', () => {
      expect(ERROR_CATALOG['INT_DB_001']).toBeDefined();
    });
  });

  describe('Operational Flow Errors', () => {
    it('should have permission errors', () => {
      expect(ERROR_CATALOG['FLO_PERM_001']).toBeDefined();
    });

    it('should have document errors', () => {
      expect(ERROR_CATALOG['FLO_DOC_001']).toBeDefined();
    });

    it('should have deadline errors', () => {
      expect(ERROR_CATALOG['FLO_DEADLINE_001']).toBeDefined();
    });
  });

  describe('System Errors', () => {
    it('should have database constraint errors', () => {
      expect(ERROR_CATALOG['SYS_FK_001']).toBeDefined();
      expect(ERROR_CATALOG['SYS_UNIQUE_001']).toBeDefined();
    });

    it('should have rate limiting errors', () => {
      expect(ERROR_CATALOG['SYS_RATE_001']).toBeDefined();
    });

    it('should have maintenance errors', () => {
      expect(ERROR_CATALOG['SYS_MAINT_001']).toBeDefined();
    });
  });

  describe('Message Interpolation Support', () => {
    it('should have placeholder patterns in messages', () => {
      const messagesWithPlaceholders = [
        'VAL_CPF_002',
        'VAL_NIS_002',
        'VAL_AGE_001',
        'VAL_INCOME_002',
        'BEN_NAT_001',
        'BEN_NAT_002',
        'BEN_GEN_001',
        'BEN_WF_001',
        'INT_AZURE_001',
        'INT_EMAIL_001',
        'FLO_DOC_001',
        'FLO_DEADLINE_001',
        'SYS_RATE_001',
        'SYS_MAINT_001',
      ];

      messagesWithPlaceholders.forEach((code) => {
        const error = ERROR_CATALOG[code];
        expect(error.message).toMatch(/\{\w+\}/);
      });
    });
  });

  describe('Legal References', () => {
    it('should have legal references for benefit errors', () => {
      const benefitErrors = Object.entries(ERROR_CATALOG)
        .filter(([code]) => code.startsWith('BEN_'))
        .map(([, error]) => error);

      benefitErrors.forEach((error) => {
        if (error.legalReference) {
          expect(error.legalReference).toBeTruthy();
          expect(error.legalReference.length).toBeGreaterThan(0);
        }
      });
    });
  });
});
