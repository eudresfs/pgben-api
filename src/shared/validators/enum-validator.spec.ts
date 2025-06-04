import { validate } from 'class-validator';
import { plainToClass } from 'class-transformer';
import { IsEnumValue, EnumValidationHelper } from './enum-validator';

/**
 * Enum de teste para validação
 */
enum TestEnum {
  OPTION_A = 'OPTION_A',
  OPTION_B = 'OPTION_B',
  OPTION_C = 'OPTION_C',
}

/**
 * DTO de teste para validação de enum
 */
class TestDto {
  @IsEnumValue(TestEnum, {
    enumName: 'Opção de Teste',
    caseSensitive: false,
  })
  testField: TestEnum;

  @IsEnumValue(TestEnum, {
    enumName: 'Opção Sensível',
    caseSensitive: true,
  })
  sensitiveField: TestEnum;
}

describe('EnumValidator', () => {
  describe('IsEnumValue', () => {
    it('deve validar valores válidos do enum', async () => {
      const dto = plainToClass(TestDto, {
        testField: TestEnum.OPTION_A,
        sensitiveField: TestEnum.OPTION_B,
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('deve rejeitar valores inválidos do enum', async () => {
      const dto = plainToClass(TestDto, {
        testField: 'INVALID_OPTION',
        sensitiveField: 'ANOTHER_INVALID',
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(2);

      const testFieldError = errors.find(
        (error) => error.property === 'testField',
      );
      const sensitiveFieldError = errors.find(
        (error) => error.property === 'sensitiveField',
      );

      expect(testFieldError).toBeDefined();
      expect(sensitiveFieldError).toBeDefined();

      expect(testFieldError.constraints).toHaveProperty('isEnumValue');
      expect(sensitiveFieldError.constraints).toHaveProperty('isEnumValue');
    });

    it('deve funcionar com case-insensitive quando configurado', async () => {
      const dto = plainToClass(TestDto, {
        testField: 'option_a', // case-insensitive habilitado
        sensitiveField: TestEnum.OPTION_B,
      });

      const errors = await validate(dto);

      // testField deve passar (case-insensitive)
      // sensitiveField deve passar (valor correto)
      const testFieldErrors = errors.filter(
        (error) => error.property === 'testField',
      );
      expect(testFieldErrors).toHaveLength(0);
    });

    it('deve falhar com case-sensitive quando configurado', async () => {
      const dto = plainToClass(TestDto, {
        testField: TestEnum.OPTION_A,
        sensitiveField: 'option_b', // case-sensitive habilitado, deve falhar
      });

      const errors = await validate(dto);

      const sensitiveFieldErrors = errors.filter(
        (error) => error.property === 'sensitiveField',
      );
      expect(sensitiveFieldErrors).toHaveLength(1);
    });

    it('deve fornecer mensagens de erro informativas', async () => {
      const dto = plainToClass(TestDto, {
        testField: 'WRONG_VALUE',
        sensitiveField: 'ANOTHER_WRONG',
      });

      const errors = await validate(dto);

      const testFieldError = errors.find(
        (error) => error.property === 'testField',
      );
      expect(testFieldError).toBeDefined();
      const message = testFieldError!.constraints?.isEnumValue;

      expect(message).toContain('testField');
      expect(message).toContain('Opção de Teste');
      expect(message).toContain('OPTION_A, OPTION_B, OPTION_C');
    });

    it('deve sugerir valores similares', async () => {
      const dto = plainToClass(TestDto, {
        testField: 'OPTION_X', // Similar a OPTION_A
        sensitiveField: TestEnum.OPTION_B,
      });

      const errors = await validate(dto);

      const testFieldError = errors.find(
        (error) => error.property === 'testField',
      );
      expect(testFieldError).toBeDefined();
      const message = testFieldError!.constraints?.isEnumValue;

      // Deve sugerir OPTION_A como valor similar
      expect(message).toContain('Você quis dizer');
    });

    it('deve rejeitar valores null e undefined', async () => {
      const dto1 = plainToClass(TestDto, {
        testField: null,
        sensitiveField: TestEnum.OPTION_B,
      });

      const dto2 = plainToClass(TestDto, {
        testField: undefined,
        sensitiveField: TestEnum.OPTION_B,
      });

      const errors1 = await validate(dto1);
      const errors2 = await validate(dto2);

      expect(errors1.length).toBeGreaterThan(0);
      expect(errors2.length).toBeGreaterThan(0);
    });
  });

  describe('EnumValidationHelper', () => {
    describe('createEnumMessage', () => {
      it('deve criar mensagem padronizada para enum', () => {
        const message = EnumValidationHelper.createEnumMessage(
          TestEnum,
          'Opção de Teste',
          'campo de teste',
        );

        expect(message).toContain('campo de teste');
        expect(message).toContain('Opção de Teste');
        expect(message).toContain('OPTION_A, OPTION_B, OPTION_C');
      });

      it('deve usar valores padrão quando não fornecidos', () => {
        const message = EnumValidationHelper.createEnumMessage(TestEnum);

        expect(message).toContain('campo');
        expect(message).toContain('enum');
        expect(message).toContain('OPTION_A, OPTION_B, OPTION_C');
      });
    });

    describe('isValidEnumValue', () => {
      it('deve validar corretamente valores do enum', () => {
        expect(
          EnumValidationHelper.isValidEnumValue(TestEnum.OPTION_A, TestEnum),
        ).toBe(true);
        expect(EnumValidationHelper.isValidEnumValue('INVALID', TestEnum)).toBe(
          false,
        );
        expect(EnumValidationHelper.isValidEnumValue(null, TestEnum)).toBe(
          false,
        );
        expect(EnumValidationHelper.isValidEnumValue(undefined, TestEnum)).toBe(
          false,
        );
      });
    });

    describe('normalizeEnumValue', () => {
      it('deve normalizar valores case-sensitive', () => {
        const result = EnumValidationHelper.normalizeEnumValue(
          TestEnum.OPTION_A,
          TestEnum,
          true,
        );
        expect(result).toBe(TestEnum.OPTION_A);

        const invalidResult = EnumValidationHelper.normalizeEnumValue(
          'option_a',
          TestEnum,
          true,
        );
        expect(invalidResult).toBeUndefined();
      });

      it('deve normalizar valores case-insensitive', () => {
        const result = EnumValidationHelper.normalizeEnumValue(
          'option_a',
          TestEnum,
          false,
        );
        expect(result).toBe(TestEnum.OPTION_A);

        const result2 = EnumValidationHelper.normalizeEnumValue(
          'OPTION_B',
          TestEnum,
          false,
        );
        expect(result2).toBe(TestEnum.OPTION_B);
      });

      it('deve retornar valor original se for null/undefined', () => {
        expect(
          EnumValidationHelper.normalizeEnumValue(null, TestEnum),
        ).toBeNull();
        expect(
          EnumValidationHelper.normalizeEnumValue(undefined, TestEnum),
        ).toBeUndefined();
      });
    });

    describe('getEnumValues', () => {
      it('deve retornar todos os valores do enum', () => {
        const values = EnumValidationHelper.getEnumValues(TestEnum);
        expect(values).toEqual(['OPTION_A', 'OPTION_B', 'OPTION_C']);
      });
    });

    describe('getEnumKeys', () => {
      it('deve retornar todas as chaves do enum', () => {
        const keys = EnumValidationHelper.getEnumKeys(TestEnum);
        expect(keys).toEqual(['OPTION_A', 'OPTION_B', 'OPTION_C']);
      });
    });
  });

  describe('Distância de Levenshtein', () => {
    it('deve calcular distância corretamente', () => {
      // Teste indireto através de sugestões
      const dto = plainToClass(TestDto, {
        testField: 'OPTION_X', // Distância 1 de OPTION_A
        sensitiveField: TestEnum.OPTION_B,
      });

      return validate(dto).then((errors) => {
        const testFieldError = errors.find(
          (error) => error.property === 'testField',
        );
        expect(testFieldError).toBeDefined();
        const message = testFieldError!.constraints?.isEnumValue;

        // Deve sugerir OPTION_A pois tem distância pequena
        expect(message).toContain('OPTION_A');
      });
    });

    it('não deve sugerir valores com distância muito grande', () => {
      const dto = plainToClass(TestDto, {
        testField: 'COMPLETELY_DIFFERENT_VALUE',
        sensitiveField: TestEnum.OPTION_B,
      });

      return validate(dto).then((errors) => {
        const testFieldError = errors.find(
          (error) => error.property === 'testField',
        );
        expect(testFieldError).toBeDefined();
        const message = testFieldError!.constraints?.isEnumValue;

        // Não deve conter sugestões para valores muito diferentes
        expect(message).not.toContain('Você quis dizer');
      });
    });
  });
});
