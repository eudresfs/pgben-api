import { DataMaskingUtil } from '../../../utils/data-masking.util';

/**
 * Testes unitários para o utilitário de mascaramento de dados sensíveis
 * 
 * Estes testes garantem que o mascaramento de dados bancários e chaves PIX
 * funciona corretamente conforme as regras de negócio definidas.
 */
describe('DataMaskingUtil', () => {
  describe('maskConta', () => {
    it('deve mascarar conta bancária mantendo últimos 4 dígitos', () => {
      const conta = '123456789';
      const result = DataMaskingUtil.maskConta(conta);
      
      expect(result).toBe('*****6789');
      expect(result.length).toBe(conta.length);
    });

    it('deve retornar valor original se conta tiver menos de 4 caracteres', () => {
      const conta = '123';
      const result = DataMaskingUtil.maskConta(conta);
      
      expect(result).toBe(conta);
    });

    it('deve retornar valor original se conta for null ou undefined', () => {
      expect(DataMaskingUtil.maskConta(null as any)).toBe(null);
      expect(DataMaskingUtil.maskConta(undefined as any)).toBe(undefined);
      expect(DataMaskingUtil.maskConta('')).toBe('');
    });

    it('deve limitar mascaramento a 12 caracteres para contas muito longas', () => {
      const conta = '12345678901234567890'; // 20 dígitos
      const result = DataMaskingUtil.maskConta(conta);
      
      expect(result).toBe('************7890');
      expect(result.length).toBe(16); // 12 asteriscos + 4 dígitos
    });
  });

  describe('maskAgencia', () => {
    it('deve mascarar agência mantendo últimos 3 dígitos', () => {
      const agencia = '12345';
      const result = DataMaskingUtil.maskAgencia(agencia);
      
      expect(result).toBe('**345');
      expect(result.length).toBe(agencia.length);
    });

    it('deve retornar valor original se agência tiver menos de 3 caracteres', () => {
      const agencia = '12';
      const result = DataMaskingUtil.maskAgencia(agencia);
      
      expect(result).toBe(agencia);
    });

    it('deve retornar valor original se agência for null ou undefined', () => {
      expect(DataMaskingUtil.maskAgencia(null as any)).toBe(null);
      expect(DataMaskingUtil.maskAgencia(undefined as any)).toBe(undefined);
      expect(DataMaskingUtil.maskAgencia('')).toBe('');
    });
  });

  describe('maskPixKey', () => {
    it('deve mascarar chave PIX do tipo CPF', () => {
      const pixKey = '123.456.789-01';
      const result = DataMaskingUtil.maskPixKey(pixKey, 'CPF');
      
      expect(result).toBe('***.***.***-**');
    });

    it('deve mascarar chave PIX do tipo CNPJ', () => {
      const pixKey = '12.345.678/0001-90';
      const result = DataMaskingUtil.maskPixKey(pixKey, 'CNPJ');
      
      expect(result).toBe('**.***.***/****-**');
    });

    it('deve mascarar chave PIX do tipo EMAIL', () => {
      const pixKey = 'usuario@exemplo.com';
      const result = DataMaskingUtil.maskPixKey(pixKey, 'EMAIL');
      
      expect(result).toBe('***@exemplo.com');
    });

    it('deve mascarar chave PIX do tipo TELEFONE', () => {
      const pixKey = '+5511999887766';
      const result = DataMaskingUtil.maskPixKey(pixKey, 'TELEFONE');
      
      expect(result).toBe('+55***********');
    });

    it('deve mascarar chave PIX do tipo ALEATORIA', () => {
      const pixKey = '123e4567-e89b-12d3-a456-426614174000';
      const result = DataMaskingUtil.maskPixKey(pixKey, 'ALEATORIA');
      
      expect(result).toBe('********4000');
    });

    it('deve mascarar completamente para chave muito curta do tipo ALEATORIA', () => {
      const pixKey = '1234';
      const result = DataMaskingUtil.maskPixKey(pixKey, 'ALEATORIA');
      
      expect(result).toBe('****');
    });

    it('deve retornar valor original se chave for null ou undefined', () => {
      expect(DataMaskingUtil.maskPixKey(null as any, 'CPF')).toBe(null);
      expect(DataMaskingUtil.maskPixKey(undefined as any, 'EMAIL')).toBe(undefined);
      expect(DataMaskingUtil.maskPixKey('', 'TELEFONE')).toBe('');
    });

    it('deve mascarar completamente para tipo desconhecido', () => {
      const pixKey = 'chave-qualquer';
      const result = DataMaskingUtil.maskPixKey(pixKey, 'TIPO_INEXISTENTE' as any);
      
      expect(result).toBe('*'.repeat(pixKey.length));
    });
  });

  describe('maskDadosBancarios', () => {
    it('deve mascarar todos os dados bancários sensíveis', () => {
      const dadosBancarios = {
        banco: '001',
        agencia: '12345',
        conta: '987654321',
        pixKey: 'usuario@exemplo.com',
        pixTipo: 'EMAIL' as const
      };
      
      const result = DataMaskingUtil.maskDadosBancarios(dadosBancarios);
      
      expect(result).toEqual({
        banco: '001', // Não mascarado
        agencia: '**345',
        conta: '*****4321',
        pixKey: '***@exemplo.com',
        pixTipo: 'EMAIL'
      });
    });

    it('deve retornar objeto original se for null ou undefined', () => {
      expect(DataMaskingUtil.maskDadosBancarios(null as any)).toBe(null);
      expect(DataMaskingUtil.maskDadosBancarios(undefined as any)).toBe(undefined);
    });

    it('deve lidar com dados bancários parciais', () => {
      const dadosBancarios = {
        banco: '001',
        conta: '123456789'
        // agencia e pixKey ausentes
      };
      
      const result = DataMaskingUtil.maskDadosBancarios(dadosBancarios);
      
      expect(result).toEqual({
        banco: '001',
        conta: '*****6789',
        agencia: undefined,
        pixKey: undefined
      });
    });
  });

  describe('canViewUnmaskedData', () => {
    it('deve permitir que ADMIN veja dados não mascarados', () => {
      const result = DataMaskingUtil.canViewUnmaskedData('ADMIN', []);
      
      expect(result).toBe(true);
    });

    it('deve permitir que SUPERVISOR com permissão específica veja dados não mascarados', () => {
      const result = DataMaskingUtil.canViewUnmaskedData(
        'SUPERVISOR', 
        ['VIEW_SENSITIVE_DATA']
      );
      
      expect(result).toBe(true);
    });

    it('deve permitir usuário com permissão específica para dados bancários', () => {
      const result = DataMaskingUtil.canViewUnmaskedData(
        'OPERADOR', 
        ['VIEW_UNMASKED_BANKING_DATA']
      );
      
      expect(result).toBe(true);
    });

    it('deve negar acesso para SUPERVISOR sem permissão específica', () => {
      const result = DataMaskingUtil.canViewUnmaskedData('SUPERVISOR', []);
      
      expect(result).toBe(false);
    });

    it('deve negar acesso para OPERADOR sem permissão específica', () => {
      const result = DataMaskingUtil.canViewUnmaskedData('OPERADOR', []);
      
      expect(result).toBe(false);
    });

    it('deve negar acesso por padrão para roles desconhecidos', () => {
      const result = DataMaskingUtil.canViewUnmaskedData('ROLE_DESCONHECIDO', []);
      
      expect(result).toBe(false);
    });
  });
});