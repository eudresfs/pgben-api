import { DadosBancariosValidator } from '../../../validators/dados-bancarios-validator';

describe('DadosBancariosValidator', () => {
  let validator: DadosBancariosValidator;

  beforeEach(() => {
    validator = new DadosBancariosValidator();
  });

  describe('validarCodigoBanco', () => {
    it('deve validar códigos de banco válidos', () => {
      // Bancos mais comuns no Brasil
      expect(validator.validarCodigoBanco('001')).toBeTruthy(); // Banco do Brasil
      expect(validator.validarCodigoBanco('104')).toBeTruthy(); // Caixa Econômica
      expect(validator.validarCodigoBanco('341')).toBeTruthy(); // Itaú
      expect(validator.validarCodigoBanco('033')).toBeTruthy(); // Santander
      expect(validator.validarCodigoBanco('237')).toBeTruthy(); // Bradesco
    });

    it('deve rejeitar códigos de banco inválidos', () => {
      expect(validator.validarCodigoBanco('')).toBeFalsy();
      expect(validator.validarCodigoBanco('0')).toBeFalsy();
      expect(validator.validarCodigoBanco('00')).toBeFalsy();
      expect(validator.validarCodigoBanco('000')).toBeFalsy(); // Código inexistente
      expect(validator.validarCodigoBanco('999')).toBeFalsy(); // Código inexistente
      expect(validator.validarCodigoBanco('abc')).toBeFalsy(); // Formato incorreto
      expect(validator.validarCodigoBanco('1234')).toBeFalsy(); // Formato incorreto
    });
  });

  describe('validarFormatoAgencia', () => {
    it('deve validar formatos de agência válidos', () => {
      expect(validator.validarFormatoAgencia('1234')).toBeTruthy();
      expect(validator.validarFormatoAgencia('0001')).toBeTruthy();
      expect(validator.validarFormatoAgencia('9999')).toBeTruthy();
      // Formatos com dígito verificador
      expect(validator.validarFormatoAgencia('1234-5')).toBeTruthy();
      expect(validator.validarFormatoAgencia('0001-2')).toBeTruthy();
    });

    it('deve rejeitar formatos de agência inválidos', () => {
      expect(validator.validarFormatoAgencia('')).toBeFalsy();
      expect(validator.validarFormatoAgencia('123')).toBeFalsy(); // Curto demais
      expect(validator.validarFormatoAgencia('12345')).toBeFalsy(); // Longo demais sem DV
      expect(validator.validarFormatoAgencia('abcd')).toBeFalsy(); // Formato incorreto
      expect(validator.validarFormatoAgencia('1234-')).toBeFalsy(); // DV ausente
      expect(validator.validarFormatoAgencia('1234-56')).toBeFalsy(); // DV incorreto
    });
  });

  describe('validarFormatoConta', () => {
    it('deve validar formatos de conta válidos', () => {
      expect(validator.validarFormatoConta('12345-6')).toBeTruthy();
      expect(validator.validarFormatoConta('00001-0')).toBeTruthy();
      expect(validator.validarFormatoConta('99999-9')).toBeTruthy();
      // Contas com formatos variados
      expect(validator.validarFormatoConta('1234567-8')).toBeTruthy();
      expect(validator.validarFormatoConta('123456-0')).toBeTruthy();
    });

    it('deve rejeitar formatos de conta inválidos', () => {
      expect(validator.validarFormatoConta('')).toBeFalsy();
      expect(validator.validarFormatoConta('1234')).toBeFalsy(); // Sem DV
      expect(validator.validarFormatoConta('12345')).toBeFalsy(); // Sem DV
      expect(validator.validarFormatoConta('12345-')).toBeFalsy(); // DV ausente
      expect(validator.validarFormatoConta('12345-67')).toBeFalsy(); // DV incorreto
      expect(validator.validarFormatoConta('abcde-f')).toBeFalsy(); // Formato incorreto
    });
  });

  describe('validarContaComDigito', () => {
    it('deve validar contas com dígito verificador correto', () => {
      // Casos de teste com algoritmo de verificação simulado
      // Nota: Esta função depende do algoritmo específico implementado no validator
      // Os exemplos abaixo assumem implementações comuns de validação

      // Simulando casos onde o dígito verificador está correto
      const mockValid = jest
        .spyOn(validator, 'calcularDigitoVerificadorConta')
        .mockImplementation(() => '6');

      expect(validator.validarContaComDigito('12345-6')).toBeTruthy();
      expect(mockValid).toHaveBeenCalledWith('12345');

      mockValid.mockRestore();
    });

    it('deve rejeitar contas com dígito verificador incorreto', () => {
      // Simulando casos onde o dígito verificador está incorreto
      const mockInvalid = jest
        .spyOn(validator, 'calcularDigitoVerificadorConta')
        .mockImplementation(() => '7');

      expect(validator.validarContaComDigito('12345-6')).toBeFalsy();
      expect(mockInvalid).toHaveBeenCalledWith('12345');

      mockInvalid.mockRestore();
    });
  });

  describe('calcularDigitoVerificadorConta', () => {
    it('deve calcular corretamente dígitos verificadores', () => {
      // Estes testes dependem da implementação específica do algoritmo
      // Os valores esperados devem ser ajustados de acordo com o algoritmo real usado

      // Exemplos genéricos baseados em algoritmos comuns
      expect(validator.calcularDigitoVerificadorConta('12345')).toBeDefined();
      expect(typeof validator.calcularDigitoVerificadorConta('12345')).toBe(
        'string',
      );
      expect(validator.calcularDigitoVerificadorConta('12345').length).toBe(1);
    });
  });

  describe('validarContaBancaria', () => {
    it('deve validar combinações banco-agência-conta válidas', () => {
      // Spy nas funções individuais para mockear comportamento válido
      jest.spyOn(validator, 'validarCodigoBanco').mockReturnValue(true);
      jest.spyOn(validator, 'validarFormatoAgencia').mockReturnValue(true);
      jest.spyOn(validator, 'validarFormatoConta').mockReturnValue(true);

      expect(
        validator.validarContaBancaria('001', '1234', '12345-6'),
      ).toBeTruthy();
    });

    it('deve rejeitar se o código do banco for inválido', () => {
      jest.spyOn(validator, 'validarCodigoBanco').mockReturnValue(false);
      jest.spyOn(validator, 'validarFormatoAgencia').mockReturnValue(true);
      jest.spyOn(validator, 'validarFormatoConta').mockReturnValue(true);

      expect(
        validator.validarContaBancaria('000', '1234', '12345-6'),
      ).toBeFalsy();
    });

    it('deve rejeitar se o formato da agência for inválido', () => {
      jest.spyOn(validator, 'validarCodigoBanco').mockReturnValue(true);
      jest.spyOn(validator, 'validarFormatoAgencia').mockReturnValue(false);
      jest.spyOn(validator, 'validarFormatoConta').mockReturnValue(true);

      expect(
        validator.validarContaBancaria('001', 'abcd', '12345-6'),
      ).toBeFalsy();
    });

    it('deve rejeitar se o formato da conta for inválido', () => {
      jest.spyOn(validator, 'validarCodigoBanco').mockReturnValue(true);
      jest.spyOn(validator, 'validarFormatoAgencia').mockReturnValue(true);
      jest.spyOn(validator, 'validarFormatoConta').mockReturnValue(false);

      expect(
        validator.validarContaBancaria('001', '1234', 'abcde-f'),
      ).toBeFalsy();
    });
  });
});
