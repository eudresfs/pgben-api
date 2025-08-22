import { NacionalidadeValidator, isNacionalidadeValida, getNacionalidadesValidas } from './nacionalidade-validator';
import { ValidationArguments } from 'class-validator';

describe('NacionalidadeValidator', () => {
  let validator: NacionalidadeValidator;
  let mockValidationArguments: ValidationArguments;

  beforeEach(() => {
    validator = new NacionalidadeValidator();
    mockValidationArguments = {
      value: '',
      constraints: [],
      targetName: 'TestClass',
      object: {},
      property: 'nacionalidade',
    };
  });

  describe('validate', () => {
    it('deve retornar true para nacionalidade vazia (campo opcional)', () => {
      expect(validator.validate('', mockValidationArguments)).toBe(true);
      expect(validator.validate(null as any, mockValidationArguments)).toBe(true);
      expect(validator.validate(undefined as any, mockValidationArguments)).toBe(true);
    });

    it('deve retornar true para nacionalidades válidas', () => {
      const nacionalidadesValidas = [
        'Brasileira',
        'Argentina',
        'Portuguesa',
        'Italiana',
        'Japonesa',
        'Americana',
        'Outra'
      ];

      nacionalidadesValidas.forEach(nacionalidade => {
        expect(validator.validate(nacionalidade, mockValidationArguments)).toBe(true);
      });
    });

    it('deve retornar true para nacionalidades válidas com case diferente', () => {
      expect(validator.validate('brasileira', mockValidationArguments)).toBe(true);
      expect(validator.validate('BRASILEIRA', mockValidationArguments)).toBe(true);
      expect(validator.validate('BrAsIlEiRa', mockValidationArguments)).toBe(true);
    });

    it('deve retornar true para nacionalidades válidas com espaços extras', () => {
      expect(validator.validate('  Brasileira  ', mockValidationArguments)).toBe(true);
      expect(validator.validate(' Argentina ', mockValidationArguments)).toBe(true);
    });

    it('deve retornar false para nacionalidades inválidas', () => {
      const nacionalidadesInvalidas = [
        'Marciana',
        'Inexistente',
        'Teste123',
        'Brasil',
        'BR'
      ];

      nacionalidadesInvalidas.forEach(nacionalidade => {
        expect(validator.validate(nacionalidade, mockValidationArguments)).toBe(false);
      });
    });

    it('deve retornar false para string vazia após trim', () => {
      expect(validator.validate('   ', mockValidationArguments)).toBe(false);
      expect(validator.validate('\t\n', mockValidationArguments)).toBe(false);
    });

    it('deve retornar false para nacionalidades muito longas', () => {
      const nacionalidadeLonga = 'A'.repeat(51);
      expect(validator.validate(nacionalidadeLonga, mockValidationArguments)).toBe(false);
    });

    it('deve retornar false para nacionalidades com caracteres especiais inválidos', () => {
      const nacionalidadesInvalidas = [
        'Brasileira123',
        'Brasil@ira',
        'Brasil#ira',
        'Brasil$ira',
        'Brasil%ira'
      ];

      nacionalidadesInvalidas.forEach(nacionalidade => {
        expect(validator.validate(nacionalidade, mockValidationArguments)).toBe(false);
      });
    });

    it('deve retornar true para nacionalidades com acentos e hífens', () => {
      expect(validator.validate('Cabo-verdiana', mockValidationArguments)).toBe(true);
      expect(validator.validate('São-tomense', mockValidationArguments)).toBe(true);
    });
  });

  describe('defaultMessage', () => {
    it('deve retornar a mensagem de erro padrão', () => {
      const message = validator.defaultMessage(mockValidationArguments);
      expect(message).toBe('Nacionalidade inválida. Deve ser uma nacionalidade reconhecida pelo sistema');
    });
  });
});

describe('isNacionalidadeValida', () => {
  it('deve retornar true para nacionalidades válidas', () => {
    expect(isNacionalidadeValida('Brasileira')).toBe(true);
    expect(isNacionalidadeValida('Argentina')).toBe(true);
    expect(isNacionalidadeValida('brasileira')).toBe(true);
  });

  it('deve retornar false para nacionalidades inválidas', () => {
    expect(isNacionalidadeValida('Marciana')).toBe(false);
    expect(isNacionalidadeValida('Inexistente')).toBe(false);
    expect(isNacionalidadeValida('')).toBe(false);
    expect(isNacionalidadeValida(null as any)).toBe(false);
    expect(isNacionalidadeValida(undefined as any)).toBe(false);
  });
});

describe('getNacionalidadesValidas', () => {
  it('deve retornar um array com as nacionalidades válidas', () => {
    const nacionalidades = getNacionalidadesValidas();
    
    expect(Array.isArray(nacionalidades)).toBe(true);
    expect(nacionalidades.length).toBeGreaterThan(0);
    expect(nacionalidades).toContain('Brasileira');
    expect(nacionalidades).toContain('Argentina');
    expect(nacionalidades).toContain('Portuguesa');
    expect(nacionalidades).toContain('Outra');
  });

  it('deve retornar uma cópia do array (não a referência original)', () => {
    const nacionalidades1 = getNacionalidadesValidas();
    const nacionalidades2 = getNacionalidadesValidas();
    
    expect(nacionalidades1).not.toBe(nacionalidades2);
    expect(nacionalidades1).toEqual(nacionalidades2);
  });

  it('não deve permitir modificação do array original', () => {
    const nacionalidades = getNacionalidadesValidas();
    const tamanhoOriginal = nacionalidades.length;
    
    nacionalidades.push('Nova Nacionalidade');
    
    const nacionalidadesNovo = getNacionalidadesValidas();
    expect(nacionalidadesNovo.length).toBe(tamanhoOriginal);
    expect(nacionalidadesNovo).not.toContain('Nova Nacionalidade');
  });
});