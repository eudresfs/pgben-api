import { ValidatorConstraint, ValidatorConstraintInterface, ValidationArguments } from 'class-validator';

/**
 * Validador personalizado para telefones brasileiros
 * 
 * Aceita formatos:
 * - (00) 00000-0000 (celular)
 * - (00) 0000-0000 (fixo)
 * - 00000000000 (celular sem formatação)
 * - 0000000000 (fixo sem formatação)
 */
@ValidatorConstraint({ name: 'telefoneValidator', async: false })
export class TelefoneValidator implements ValidatorConstraintInterface {
  validate(text: string, args: ValidationArguments) {
    if (!text) return true; // Permite valores vazios (use @IsNotEmpty se quiser tornar obrigatório)
    
    // Remove todos os caracteres não numéricos
    const numeroLimpo = text.replace(/\D/g, '');
    
    // Verifica se o número tem 10 (fixo) ou 11 (celular) dígitos
    if (numeroLimpo.length !== 10 && numeroLimpo.length !== 11) {
      return false;
    }
    
    // Verifica se o DDD é válido (entre 11 e 99)
    const ddd = parseInt(numeroLimpo.substring(0, 2));
    if (ddd < 11 || ddd > 99) {
      return false;
    }
    
    // Verifica se o primeiro dígito do número de celular é 9 (para números de 11 dígitos)
    if (numeroLimpo.length === 11 && numeroLimpo.charAt(2) !== '9') {
      return false;
    }
    
    return true;
  }
  
  defaultMessage(args: ValidationArguments) {
    return 'Telefone inválido. Formatos aceitos: (00) 00000-0000, (00) 0000-0000, 00000000000 ou 0000000000';
  }
}
