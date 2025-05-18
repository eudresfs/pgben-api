import { Test, TestingModule } from '@nestjs/testing';
import { DadosBancariosValidator } from '../../validators/dados-bancarios-validator';

/**
 * Testes unitários para o validador de dados bancários
 * 
 * Verifica o funcionamento correto das validações para informações bancárias,
 * incluindo códigos de banco, agências, contas e dígitos verificadores.
 * 
 * @author Equipe PGBen
 */
describe('DadosBancariosValidator', () => {
  let validator: DadosBancariosValidator;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DadosBancariosValidator],
    }).compile();

    validator = module.get<DadosBancariosValidator>(DadosBancariosValidator);
  });

  describe('validarCodigoBanco', () => {
    it('deve validar códigos de bancos conhecidos', () => {
      expect(validator.validarCodigoBanco('001')).toBe(true); // Banco do Brasil
      expect(validator.validarCodigoBanco('104')).toBe(true); // Caixa
      expect(validator.validarCodigoBanco('341')).toBe(true); // Itaú
      expect(validator.validarCodigoBanco('033')).toBe(true); // Santander
      expect(validator.validarCodigoBanco('237')).toBe(true); // Bradesco
    });

    it('deve rejeitar códigos de bancos inválidos', () => {
      expect(validator.validarCodigoBanco('000')).toBe(false);
      expect(validator.validarCodigoBanco('999')).toBe(false);
      expect(validator.validarCodigoBanco('ABC')).toBe(false);
    });

    it('deve rejeitar valores vazios ou nulos', () => {
      expect(validator.validarCodigoBanco('')).toBe(false);
      expect(validator.validarCodigoBanco(null)).toBe(false);
      expect(validator.validarCodigoBanco(undefined)).toBe(false);
    });

    it('deve rejeitar códigos com formato incorreto', () => {
      expect(validator.validarCodigoBanco('01')).toBe(false); // muito curto
      expect(validator.validarCodigoBanco('0001')).toBe(false); // muito longo
      expect(validator.validarCodigoBanco('001a')).toBe(false); // caracteres não numéricos
    });
  });

  describe('obterNomeBanco', () => {
    it('deve retornar o nome correto para códigos de bancos conhecidos', () => {
      expect(validator.obterNomeBanco('001')).toBe('Banco do Brasil');
      expect(validator.obterNomeBanco('104')).toBe('Caixa Econômica Federal');
      expect(validator.obterNomeBanco('341')).toBe('Itaú');
      expect(validator.obterNomeBanco('033')).toBe('Santander');
      expect(validator.obterNomeBanco('237')).toBe('Bradesco');
    });

    it('deve retornar "Banco não cadastrado" para códigos desconhecidos', () => {
      expect(validator.obterNomeBanco('999')).toBe('Banco não cadastrado');
      expect(validator.obterNomeBanco('')).toBe('Banco não cadastrado');
      expect(validator.obterNomeBanco(null)).toBe('Banco não cadastrado');
      expect(validator.obterNomeBanco(undefined)).toBe('Banco não cadastrado');
    });
  });

  describe('validarAgencia', () => {
    it('deve validar agências com formato correto', () => {
      expect(validator.validarAgencia('1234')).toBe(true);
      expect(validator.validarAgencia('0001')).toBe(true);
      expect(validator.validarAgencia('12345')).toBe(true); // alguns bancos usam 5 dígitos
    });

    it('deve validar agências com formatação', () => {
      expect(validator.validarAgencia('1234-5')).toBe(true);
      expect(validator.validarAgencia('1.234')).toBe(true);
    });

    it('deve rejeitar agências com formato incorreto', () => {
      expect(validator.validarAgencia('1')).toBe(false); // muito curto
      expect(validator.validarAgencia('123456')).toBe(false); // muito longo
      expect(validator.validarAgencia('123A')).toBe(false); // caracteres não numéricos
    });

    it('deve rejeitar valores vazios ou nulos', () => {
      expect(validator.validarAgencia('')).toBe(false);
      expect(validator.validarAgencia(null)).toBe(false);
      expect(validator.validarAgencia(undefined)).toBe(false);
    });

    it('deve aplicar validações específicas por banco', () => {
      // Banco do Brasil (4 ou 5 dígitos)
      expect(validator.validarAgencia('1234', '001')).toBe(true);
      expect(validator.validarAgencia('12345', '001')).toBe(true);
      
      // Caixa (4 dígitos)
      expect(validator.validarAgencia('1234', '104')).toBe(true);
      expect(validator.validarAgencia('12345', '104')).toBe(false);
      
      // Itaú (4 dígitos)
      expect(validator.validarAgencia('1234', '341')).toBe(true);
      expect(validator.validarAgencia('12345', '341')).toBe(false);
    });
  });

  describe('validarConta', () => {
    it('deve validar contas com formato correto', () => {
      expect(validator.validarConta('12345-6')).toBe(true);
      expect(validator.validarConta('123456')).toBe(true);
      expect(validator.validarConta('00001-X')).toBe(true); // com dígito X
    });

    it('deve validar contas com formatação', () => {
      expect(validator.validarConta('12345-6')).toBe(true);
      expect(validator.validarConta('12.345-6')).toBe(true);
    });

    it('deve rejeitar contas com formato incorreto', () => {
      expect(validator.validarConta('12')).toBe(false); // muito curto
      expect(validator.validarConta('12345678901234')).toBe(false); // muito longo
      expect(validator.validarConta('123A56')).toBe(false); // caracteres não numéricos (exceto X)
    });

    it('deve rejeitar valores vazios ou nulos', () => {
      expect(validator.validarConta('')).toBe(false);
      expect(validator.validarConta(null)).toBe(false);
      expect(validator.validarConta(undefined)).toBe(false);
    });

    it('deve aplicar validações específicas por banco', () => {
      // Banco do Brasil
      expect(validator.validarConta('12345-6', '001')).toBe(true);
      expect(validator.validarConta('123456X', '001')).toBe(true);
      
      // Caixa
      expect(validator.validarConta('123456-7', '104')).toBe(true);
      
      // Itaú
      expect(validator.validarConta('12345-6', '341')).toBe(true);
      expect(validator.validarConta('1234-5', '341')).toBe(true);
    });
  });

  describe('mascaraAgencia', () => {
    it('deve mascarar corretamente agências', () => {
      const mascarado = validator.mascaraAgencia('1234');
      expect(mascarado).toBe('1**4');
    });

    it('deve retornar asteriscos para agências muito curtas', () => {
      const mascarado = validator.mascaraAgencia('12');
      expect(mascarado).toBe('****');
    });

    it('deve manter o primeiro e último dígito visíveis', () => {
      const mascarado = validator.mascaraAgencia('12345');
      expect(mascarado.charAt(0)).toBe('1');
      expect(mascarado.charAt(mascarado.length - 1)).toBe('5');
      expect(mascarado.substring(1, mascarado.length - 1)).not.toContain(/[0-9]/);
    });
  });

  describe('mascaraConta', () => {
    it('deve mascarar corretamente contas', () => {
      const mascarado = validator.mascaraConta('123456');
      expect(mascarado).toBe('12**56');
    });

    it('deve retornar asteriscos para contas muito curtas', () => {
      const mascarado = validator.mascaraConta('123');
      expect(mascarado).toBe('****');
    });

    it('deve manter os dois primeiros e dois últimos dígitos visíveis', () => {
      const mascarado = validator.mascaraConta('1234567890');
      expect(mascarado.substring(0, 2)).toBe('12');
      expect(mascarado.substring(mascarado.length - 2)).toBe('90');
      expect(mascarado.substring(2, mascarado.length - 2)).not.toContain(/[0-9]/);
    });
  });

  describe('formatarAgencia', () => {
    it('deve formatar corretamente agências', () => {
      expect(validator.formatarAgencia('1234')).toBe('1234');
      expect(validator.formatarAgencia('12-34')).toBe('1234');
      expect(validator.formatarAgencia('12.34')).toBe('1234');
    });
  });

  describe('formatarConta', () => {
    it('deve formatar corretamente contas', () => {
      expect(validator.formatarConta('12345X')).toBe('12345-X');
      expect(validator.formatarConta('123456')).toBe('12345-6');
      expect(validator.formatarConta('12345-6')).toBe('12345-6');
    });
  });
});
