import { PixValidator } from '../../../validators/pix-validator';

describe('PixValidator', () => {
  let validator: PixValidator;

  beforeEach(() => {
    validator = new PixValidator();
  });

  describe('validarChavePix', () => {
    it('deve validar CPF como chave PIX', () => {
      expect(validator.validarChavePix('123.456.789-09', 'CPF')).toBeTruthy();
      expect(validator.validarChavePix('12345678909', 'CPF')).toBeTruthy();
    });

    it('deve rejeitar CPF inválido como chave PIX', () => {
      expect(validator.validarChavePix('123.456.789-00', 'CPF')).toBeFalsy(); // DV inválido
      expect(validator.validarChavePix('00000000000', 'CPF')).toBeFalsy(); // CPF inválido (todos dígitos iguais)
      expect(validator.validarChavePix('1234567890', 'CPF')).toBeFalsy(); // CPF com tamanho incorreto
      expect(validator.validarChavePix('abc.def.ghi-jk', 'CPF')).toBeFalsy(); // Formato incorreto
    });

    it('deve validar email como chave PIX', () => {
      expect(
        validator.validarChavePix('usuario@dominio.com.br', 'EMAIL'),
      ).toBeTruthy();
      expect(
        validator.validarChavePix('nome.sobrenome@empresa.com', 'EMAIL'),
      ).toBeTruthy();
      expect(
        validator.validarChavePix('usuario.123@dominio.net', 'EMAIL'),
      ).toBeTruthy();
    });

    it('deve rejeitar email inválido como chave PIX', () => {
      expect(validator.validarChavePix('usuario@', 'EMAIL')).toBeFalsy(); // Domínio ausente
      expect(validator.validarChavePix('@dominio.com', 'EMAIL')).toBeFalsy(); // Usuário ausente
      expect(validator.validarChavePix('usuario@dominio', 'EMAIL')).toBeFalsy(); // TLD ausente
      expect(validator.validarChavePix('usuario@.com', 'EMAIL')).toBeFalsy(); // Domínio inválido
      expect(
        validator.validarChavePix('usuário@dominio.com', 'EMAIL'),
      ).toBeFalsy(); // Caracteres especiais no usuário
    });

    it('deve validar telefone como chave PIX', () => {
      expect(
        validator.validarChavePix('+5584999999999', 'TELEFONE'),
      ).toBeTruthy();
      expect(
        validator.validarChavePix('+55 84 99999-9999', 'TELEFONE'),
      ).toBeTruthy();
      expect(
        validator.validarChavePix('(84) 99999-9999', 'TELEFONE'),
      ).toBeTruthy();
      expect(validator.validarChavePix('84999999999', 'TELEFONE')).toBeTruthy();
    });

    it('deve rejeitar telefone inválido como chave PIX', () => {
      expect(validator.validarChavePix('+558499', 'TELEFONE')).toBeFalsy(); // Número incompleto
      expect(
        validator.validarChavePix('+558499999999999', 'TELEFONE'),
      ).toBeFalsy(); // Número muito longo
      expect(validator.validarChavePix('abc-def-ghij', 'TELEFONE')).toBeFalsy(); // Formato incorreto
    });

    it('deve validar chave aleatória como chave PIX', () => {
      expect(
        validator.validarChavePix(
          '123e4567-e89b-12d3-a456-426655440000',
          'ALEATORIA',
        ),
      ).toBeTruthy(); // UUID v4
      expect(
        validator.validarChavePix(
          '123e4567e89b12d3a456426655440000',
          'ALEATORIA',
        ),
      ).toBeTruthy(); // UUID sem hifens
    });

    it('deve rejeitar chave aleatória inválida como chave PIX', () => {
      expect(
        validator.validarChavePix('123e4567-e89b-12d3-a456', 'ALEATORIA'),
      ).toBeFalsy(); // UUID incompleto
      expect(
        validator.validarChavePix(
          '123e4567-e89b-12d3-a456-42665544000G',
          'ALEATORIA',
        ),
      ).toBeFalsy(); // Caracteres inválidos
    });

    it('deve rejeitar tipo de chave PIX desconhecido', () => {
      expect(validator.validarChavePix('12345', 'TIPO_INVALIDO')).toBeFalsy();
    });
  });

  describe('validarCPF', () => {
    it('deve validar CPFs com formato correto', () => {
      expect(validator.validarCPF('123.456.789-09')).toBeTruthy();
      expect(validator.validarCPF('12345678909')).toBeTruthy();
      // Adicionar mais exemplos de CPFs válidos com seus respectivos dígitos verificadores corretos
    });

    it('deve rejeitar CPFs com dígito verificador incorreto', () => {
      expect(validator.validarCPF('123.456.789-00')).toBeFalsy();
      expect(validator.validarCPF('12345678900')).toBeFalsy();
    });

    it('deve rejeitar CPFs com formato inválido', () => {
      expect(validator.validarCPF('')).toBeFalsy();
      expect(validator.validarCPF('123')).toBeFalsy();
      expect(validator.validarCPF('12345')).toBeFalsy();
      expect(validator.validarCPF('123456789')).toBeFalsy();
      expect(validator.validarCPF('123456789012')).toBeFalsy();
      expect(validator.validarCPF('abcdefghijk')).toBeFalsy();
    });

    it('deve rejeitar CPFs com todos os dígitos iguais', () => {
      expect(validator.validarCPF('00000000000')).toBeFalsy();
      expect(validator.validarCPF('11111111111')).toBeFalsy();
      expect(validator.validarCPF('22222222222')).toBeFalsy();
      expect(validator.validarCPF('33333333333')).toBeFalsy();
      expect(validator.validarCPF('44444444444')).toBeFalsy();
      expect(validator.validarCPF('55555555555')).toBeFalsy();
      expect(validator.validarCPF('66666666666')).toBeFalsy();
      expect(validator.validarCPF('77777777777')).toBeFalsy();
      expect(validator.validarCPF('88888888888')).toBeFalsy();
      expect(validator.validarCPF('99999999999')).toBeFalsy();
    });
  });

  describe('validarEmail', () => {
    it('deve validar emails com formato correto', () => {
      expect(validator.validarEmail('usuario@dominio.com')).toBeTruthy();
      expect(
        validator.validarEmail('usuario.nome@dominio.com.br'),
      ).toBeTruthy();
      expect(validator.validarEmail('usuario_nome@dominio.net')).toBeTruthy();
      expect(validator.validarEmail('usuario123@dominio.io')).toBeTruthy();
      expect(validator.validarEmail('u@d.co')).toBeTruthy(); // Email curto mas válido
    });

    it('deve rejeitar emails com formato inválido', () => {
      expect(validator.validarEmail('')).toBeFalsy();
      expect(validator.validarEmail('usuario')).toBeFalsy();
      expect(validator.validarEmail('usuario@')).toBeFalsy();
      expect(validator.validarEmail('@dominio.com')).toBeFalsy();
      expect(validator.validarEmail('usuario@dominio')).toBeFalsy();
      expect(validator.validarEmail('usuario@.com')).toBeFalsy();
      expect(validator.validarEmail('usuário@dominio.com')).toBeFalsy(); // Caracteres especiais
      expect(validator.validarEmail('usuario@domínio.com')).toBeFalsy(); // Caracteres especiais no domínio
    });
  });

  describe('validarTelefone', () => {
    it('deve validar telefones com formato correto', () => {
      expect(validator.validarTelefone('+5584999999999')).toBeTruthy();
      expect(validator.validarTelefone('+55 84 99999-9999')).toBeTruthy();
      expect(validator.validarTelefone('(84) 99999-9999')).toBeTruthy();
      expect(validator.validarTelefone('84999999999')).toBeTruthy();
      expect(validator.validarTelefone('84 9 9999 9999')).toBeTruthy();
    });

    it('deve rejeitar telefones com formato inválido', () => {
      expect(validator.validarTelefone('')).toBeFalsy();
      expect(validator.validarTelefone('999')).toBeFalsy(); // Muito curto
      expect(validator.validarTelefone('9999999999999999')).toBeFalsy(); // Muito longo
      expect(validator.validarTelefone('abcdefghijk')).toBeFalsy(); // Formato incorreto
    });
  });

  describe('validarChaveAleatoria', () => {
    it('deve validar UUIDs com formato correto', () => {
      expect(
        validator.validarChaveAleatoria('123e4567-e89b-12d3-a456-426655440000'),
      ).toBeTruthy(); // Com hifens
      expect(
        validator.validarChaveAleatoria('123e4567e89b12d3a456426655440000'),
      ).toBeTruthy(); // Sem hifens
    });

    it('deve rejeitar strings que não são UUIDs válidos', () => {
      expect(validator.validarChaveAleatoria('')).toBeFalsy();
      expect(validator.validarChaveAleatoria('123')).toBeFalsy(); // Muito curto
      expect(
        validator.validarChaveAleatoria('123e4567-e89b-12d3-a456'),
      ).toBeFalsy(); // Incompleto
      expect(
        validator.validarChaveAleatoria('123e4567-e89b-12d3-a456-42665544000G'),
      ).toBeFalsy(); // Caracteres inválidos
      expect(
        validator.validarChaveAleatoria(
          '123e4567-e89b-12d3-a456-4266554400000',
        ),
      ).toBeFalsy(); // Muito longo
    });
  });
});
