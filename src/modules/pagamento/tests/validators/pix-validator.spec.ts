import { Test, TestingModule } from '@nestjs/testing';
import { PixValidator } from '../../validators/pix-validator';

/**
 * Testes unitários para o validador de chaves PIX
 * 
 * Verifica o funcionamento correto das validações para diferentes tipos de chaves PIX,
 * incluindo CPF, e-mail, telefone e chave aleatória.
 * 
 * @author Equipe PGBen
 */
describe('PixValidator', () => {
  let validator: PixValidator;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PixValidator],
    }).compile();

    validator = module.get<PixValidator>(PixValidator);
  });

  describe('validarChavePix', () => {
    it('deve retornar false para chave vazia', () => {
      expect(validator.validarChavePix('', 'cpf')).toBe(false);
      expect(validator.validarChavePix(null, 'email')).toBe(false);
      expect(validator.validarChavePix(undefined, 'telefone')).toBe(false);
    });

    it('deve retornar false para tipo inválido', () => {
      expect(validator.validarChavePix('12345678900', 'tipo_invalido')).toBe(false);
    });

    it('deve validar corretamente chave CPF', () => {
      // CPF válido
      expect(validator.validarChavePix('12345678909', 'cpf')).toBe(true);
      
      // CPF com formatação
      expect(validator.validarChavePix('123.456.789-09', 'cpf')).toBe(true);
      
      // CPF inválido (tamanho incorreto)
      expect(validator.validarChavePix('1234567890', 'cpf')).toBe(false);
      
      // CPF inválido (caracteres não numéricos)
      expect(validator.validarChavePix('1234567890a', 'cpf')).toBe(false);
    });

    it('deve validar corretamente chave e-mail', () => {
      // E-mail válido
      expect(validator.validarChavePix('usuario@dominio.com', 'email')).toBe(true);
      
      // E-mail com subdomínio
      expect(validator.validarChavePix('usuario@sub.dominio.com.br', 'email')).toBe(true);
      
      // E-mail inválido (sem @)
      expect(validator.validarChavePix('usuariodominio.com', 'email')).toBe(false);
      
      // E-mail inválido (sem domínio)
      expect(validator.validarChavePix('usuario@', 'email')).toBe(false);
      
      // E-mail inválido (caracteres especiais não permitidos)
      expect(validator.validarChavePix('usuario!@dominio.com', 'email')).toBe(false);
    });

    it('deve validar corretamente chave telefone', () => {
      // Telefone válido (formato completo)
      expect(validator.validarChavePix('+5584999999999', 'telefone')).toBe(true);
      
      // Telefone válido (sem +)
      expect(validator.validarChavePix('5584999999999', 'telefone')).toBe(true);
      
      // Telefone válido (com formatação)
      expect(validator.validarChavePix('+55 (84) 99999-9999', 'telefone')).toBe(true);
      
      // Telefone inválido (poucos dígitos)
      expect(validator.validarChavePix('559999', 'telefone')).toBe(false);
      
      // Telefone inválido (caracteres não permitidos)
      expect(validator.validarChavePix('5584999999a99', 'telefone')).toBe(false);
    });

    it('deve validar corretamente chave aleatória', () => {
      // UUID válido
      expect(validator.validarChavePix('123e4567-e89b-12d3-a456-426614174000', 'aleatoria')).toBe(true);
      
      // Chave aleatória inválida (formato incorreto)
      expect(validator.validarChavePix('123e4567e89b12d3a456426614174000', 'aleatoria')).toBe(false);
      
      // Chave aleatória inválida (tamanho incorreto)
      expect(validator.validarChavePix('123e4567-e89b-12d3-a456', 'aleatoria')).toBe(false);
    });
  });

  describe('mascaraChavePix', () => {
    it('deve mascarar corretamente chave CPF', () => {
      const mascarado = validator.mascaraChavePix('12345678909', 'cpf');
      expect(mascarado).toBe('***.456.789-**');
    });

    it('deve mascarar corretamente chave e-mail', () => {
      const mascarado = validator.mascaraChavePix('usuario@dominio.com', 'email');
      expect(mascarado).toMatch(/^u\*+@d\*+\.com$/);
    });

    it('deve mascarar corretamente chave telefone', () => {
      const mascarado = validator.mascaraChavePix('5584999999999', 'telefone');
      expect(mascarado).toMatch(/^\(\*\*\) \*\*\*\*\*\-\d{4}$/);
    });

    it('deve mascarar corretamente chave aleatória', () => {
      const chave = '123e4567-e89b-12d3-a456-426614174000';
      const mascarado = validator.mascaraChavePix(chave, 'aleatoria');
      expect(mascarado.length).toBe(chave.length);
      expect(mascarado).toContain('123e4567');
      expect(mascarado).not.toBe(chave);
    });

    it('deve retornar string vazia para chave vazia', () => {
      expect(validator.mascaraChavePix('', 'cpf')).toBe('');
      expect(validator.mascaraChavePix(null, 'email')).toBe('');
      expect(validator.mascaraChavePix(undefined, 'telefone')).toBe('');
    });
  });

  describe('obterTipoChavePix', () => {
    it('deve identificar corretamente o tipo de chave CPF', () => {
      expect(validator.obterTipoChavePix('12345678909')).toBe('cpf');
      expect(validator.obterTipoChavePix('123.456.789-09')).toBe('cpf');
    });

    it('deve identificar corretamente o tipo de chave e-mail', () => {
      expect(validator.obterTipoChavePix('usuario@dominio.com')).toBe('email');
      expect(validator.obterTipoChavePix('usuario@sub.dominio.com.br')).toBe('email');
    });

    it('deve identificar corretamente o tipo de chave telefone', () => {
      expect(validator.obterTipoChavePix('+5584999999999')).toBe('telefone');
      expect(validator.obterTipoChavePix('5584999999999')).toBe('telefone');
    });

    it('deve identificar corretamente o tipo de chave aleatória', () => {
      expect(validator.obterTipoChavePix('123e4567-e89b-12d3-a456-426614174000')).toBe('aleatoria');
    });

    it('deve retornar "desconhecido" para chave de formato não reconhecido', () => {
      expect(validator.obterTipoChavePix('formato_desconhecido')).toBe('desconhecido');
    });
  });
});
