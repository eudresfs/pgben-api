import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { IsCPF, IsNIS, IsCEP, IsTelefone } from '../../../src/shared/validators/br-validators';

// Classes de teste para cada validador
class TestCPF {
  @IsCPF()
  cpf: string;
}

class TestNIS {
  @IsNIS()
  nis: string;
}

class TestCEP {
  @IsCEP()
  cep: string;
}

class TestTelefone {
  @IsTelefone()
  telefone: string;
}

describe('Validadores Brasileiros', () => {
  describe('CPF Validator', () => {
    it('deve validar CPFs corretos', async () => {
      const cpfsValidos = [
        '529.982.247-25',
        '52998224725',
        '111.444.777-35'
      ];

      for (const cpf of cpfsValidos) {
        const testObj = plainToInstance(TestCPF, { cpf });
        const errors = await validate(testObj);
        expect(errors.length).toBe(0);
      }
    });

    it('deve rejeitar CPFs inválidos', async () => {
      const cpfsInvalidos = [
        '111.111.111-11', // Dígitos repetidos
        '123.456.789-10', // Inválido
        '529.982.247-26', // Dígito verificador errado
        '123456', // Tamanho inválido
        'abc.def.ghi-jk', // Não numérico
        '' // Vazio
      ];

      for (const cpf of cpfsInvalidos) {
        const testObj = plainToInstance(TestCPF, { cpf });
        const errors = await validate(testObj);
        expect(errors.length).toBeGreaterThan(0);
      }
    });
  });

  describe('NIS Validator', () => {
    it('deve validar NIS corretos', async () => {
      const nisValidos = [
        '170.82167.34-9',
        '1708216734-9',
        '17082167349'
      ];

      for (const nis of nisValidos) {
        const testObj = plainToInstance(TestNIS, { nis });
        const errors = await validate(testObj);
        expect(errors.length).toBe(0);
      }
    });

    it('deve rejeitar NIS inválidos', async () => {
      const nisInvalidos = [
        '111.11111.11-1', // Dígitos repetidos
        '123.45678.90-1', // Inválido
        '170.82167.34-8', // Dígito verificador errado
        '123456', // Tamanho inválido
        'abc.defgh.ij-k', // Não numérico
        '' // Vazio
      ];

      for (const nis of nisInvalidos) {
        const testObj = plainToInstance(TestNIS, { nis });
        const errors = await validate(testObj);
        expect(errors.length).toBeGreaterThan(0);
      }
    });
  });

  describe('CEP Validator', () => {
    it('deve validar CEPs corretos', async () => {
      const cepsValidos = [
        '59000-000',
        '59000000',
        '01001-000'
      ];

      for (const cep of cepsValidos) {
        const testObj = plainToInstance(TestCEP, { cep });
        const errors = await validate(testObj);
        expect(errors.length).toBe(0);
      }
    });

    it('deve rejeitar CEPs inválidos', async () => {
      const cepsInvalidos = [
        '5900-000', // Tamanho inválido
        '590000000', // Tamanho inválido
        'abcde-fgh', // Não numérico
        '' // Vazio
      ];

      for (const cep of cepsInvalidos) {
        const testObj = plainToInstance(TestCEP, { cep });
        const errors = await validate(testObj);
        expect(errors.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Telefone Validator', () => {
    it('deve validar telefones corretos', async () => {
      const telefonesValidos = [
        '(84) 3222-5678', // Fixo com DDD
        '8432225678', // Fixo com DDD sem formatação
        '(84) 99999-8888', // Celular com DDD
        '84999998888', // Celular com DDD sem formatação
        '99999-8888', // Celular sem DDD (não recomendado, mas válido pelo validador)
        '999998888' // Celular sem DDD sem formatação
      ];

      for (const telefone of telefonesValidos) {
        const testObj = plainToInstance(TestTelefone, { telefone });
        const errors = await validate(testObj);
        expect(errors.length).toBe(0);
      }
    });

    it('deve rejeitar telefones inválidos', async () => {
      const telefonesInvalidos = [
        '999-8888', // Tamanho inválido
        '999988', // Tamanho inválido
        '(84) 999-8888', // Formato inválido
        '(84) 9999-88888', // Tamanho inválido
        'abcde-fghij', // Não numérico
        '' // Vazio
      ];

      for (const telefone of telefonesInvalidos) {
        const testObj = plainToInstance(TestTelefone, { telefone });
        const errors = await validate(testObj);
        expect(errors.length).toBeGreaterThan(0);
      }
    });
  });
});
