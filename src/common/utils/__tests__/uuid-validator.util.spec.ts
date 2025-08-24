import { BadRequestException } from '@nestjs/common';
import { UuidValidator } from '../uuid-validator.util';

describe('UuidValidator', () => {
  describe('isValid', () => {
    it('deve retornar true para UUID válido', () => {
      const validUuid = '123e4567-e89b-12d3-a456-426614174000';
      expect(UuidValidator.isValid(validUuid)).toBe(true);
    });

    it('deve retornar false para UUID inválido com caracteres não hexadecimais', () => {
      const invalidUuid = '1085b2be-97fb-4e34-bj8f-55b27831fafc';
      expect(UuidValidator.isValid(invalidUuid)).toBe(false);
    });

    it('deve retornar false para string vazia', () => {
      expect(UuidValidator.isValid('')).toBe(false);
    });

    it('deve retornar false para null', () => {
      expect(UuidValidator.isValid(null as any)).toBe(false);
    });

    it('deve retornar false para undefined', () => {
      expect(UuidValidator.isValid(undefined as any)).toBe(false);
    });

    it('deve retornar false para UUID com formato incorreto', () => {
      const invalidFormat = '123e4567-e89b-12d3-a456';
      expect(UuidValidator.isValid(invalidFormat)).toBe(false);
    });

    it('deve retornar true para UUID v4 válido em modo strict', () => {
      const validUuidV4 = '123e4567-e89b-42d3-a456-426614174000';
      expect(UuidValidator.isValid(validUuidV4, true)).toBe(true);
    });

    it('deve retornar false para UUID não v4 em modo strict', () => {
      const nonV4Uuid = '123e4567-e89b-12d3-a456-426614174000';
      expect(UuidValidator.isValid(nonV4Uuid, true)).toBe(false);
    });
  });

  describe('validateOrThrow', () => {
    it('não deve lançar exceção para UUID válido', () => {
      const validUuid = '123e4567-e89b-12d3-a456-426614174000';
      expect(() => UuidValidator.validateOrThrow(validUuid)).not.toThrow();
    });

    it('deve lançar BadRequestException para UUID inválido', () => {
      const invalidUuid = '1085b2be-97fb-4e34-bj8f-55b27831fafc';
      expect(() => UuidValidator.validateOrThrow(invalidUuid, 'test_field'))
        .toThrow(BadRequestException);
    });

    it('deve incluir o nome do campo na mensagem de erro', () => {
      const invalidUuid = '1085b2be-97fb-4e34-bj8f-55b27831fafc';
      try {
        UuidValidator.validateOrThrow(invalidUuid, 'unidade_id');
      } catch (error) {
        expect(error.response.message).toContain('unidade_id');
        expect(error.response.field).toBe('unidade_id');
        expect(error.response.invalidValue).toBe(invalidUuid);
      }
    });
  });

  describe('validateMultipleOrThrow', () => {
    it('não deve lançar exceção para array de UUIDs válidos', () => {
      const validUuids = [
        '123e4567-e89b-12d3-a456-426614174000',
        '987fcdeb-51a2-43d1-9f12-123456789abc'
      ];
      expect(() => UuidValidator.validateMultipleOrThrow(validUuids)).not.toThrow();
    });

    it('deve lançar BadRequestException para array com UUIDs inválidos', () => {
      const mixedUuids = [
        '123e4567-e89b-12d3-a456-426614174000',
        '1085b2be-97fb-4e34-bj8f-55b27831fafc'
      ];
      expect(() => UuidValidator.validateMultipleOrThrow(mixedUuids, 'test_ids'))
        .toThrow(BadRequestException);
    });

    it('deve incluir todos os UUIDs inválidos na resposta de erro', () => {
      const invalidUuids = [
        '1085b2be-97fb-4e34-bj8f-55b27831fafc',
        'invalid-uuid-format'
      ];
      try {
        UuidValidator.validateMultipleOrThrow(invalidUuids, 'test_ids');
      } catch (error) {
        expect(error.response.invalidValues).toEqual(invalidUuids);
        expect(error.response.field).toBe('test_ids');
      }
    });
  });

  describe('sanitizeAndValidate', () => {
    it('deve remover espaços em branco e validar UUID', () => {
      const uuidWithSpaces = '  123e4567-e89b-12d3-a456-426614174000  ';
      const result = UuidValidator.sanitizeAndValidate(uuidWithSpaces);
      expect(result).toBe('123e4567-e89b-12d3-a456-426614174000');
    });

    it('deve lançar exceção para string vazia após sanitização', () => {
      expect(() => UuidValidator.sanitizeAndValidate('   '))
        .toThrow(BadRequestException);
    });

    it('deve lançar exceção para null', () => {
      expect(() => UuidValidator.sanitizeAndValidate(null as any))
        .toThrow(BadRequestException);
    });

    it('deve lançar exceção para undefined', () => {
      expect(() => UuidValidator.sanitizeAndValidate(undefined as any))
        .toThrow(BadRequestException);
    });

    it('deve lançar exceção para UUID inválido após sanitização', () => {
      const invalidUuid = '  1085b2be-97fb-4e34-bj8f-55b27831fafc  ';
      expect(() => UuidValidator.sanitizeAndValidate(invalidUuid, 'test_field'))
        .toThrow(BadRequestException);
    });
  });
});