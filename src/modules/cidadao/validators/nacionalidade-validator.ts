import {
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from 'class-validator';

/**
 * Lista de nacionalidades válidas aceitas pelo sistema
 * Baseada nas nacionalidades mais comuns no Brasil
 */
const NACIONALIDADES_VALIDAS = [
  'Brasileira',
  'Argentina',
  'Boliviana',
  'Chilena',
  'Colombiana',
  'Equatoriana',
  'Paraguaia',
  'Peruana',
  'Uruguaia',
  'Venezuelana',
  'Portuguesa',
  'Italiana',
  'Espanhola',
  'Alemã',
  'Francesa',
  'Japonesa',
  'Chinesa',
  'Coreana',
  'Libanesa',
  'Síria',
  'Haitiana',
  'Angolana',
  'Cabo-verdiana',
  'Guineense',
  'Moçambicana',
  'São-tomense',
  'Americana',
  'Canadense',
  'Mexicana',
  'Cubana',
  'Dominicana',
  'Jamaicana',
  'Outra'
];

@ValidatorConstraint({ name: 'nacionalidadeValidator', async: false })
export class NacionalidadeValidator implements ValidatorConstraintInterface {
  /**
   * Valida se a nacionalidade informada está na lista de nacionalidades aceitas
   * @param nacionalidade - A nacionalidade a ser validada
   * @param args - Argumentos de validação
   * @returns true se a nacionalidade for válida, false caso contrário
   */
  validate(nacionalidade: string, args: ValidationArguments): boolean {
    // Se não foi informada nacionalidade, considera válido (campo opcional)
    if (!nacionalidade) {
      return true;
    }

    // Remove espaços extras e normaliza a string
    const nacionalidadeNormalizada = nacionalidade.trim();

    // Verifica se não está vazia após normalização
    if (nacionalidadeNormalizada.length === 0) {
      return false;
    }

    // Verifica se o comprimento está dentro do limite
    if (nacionalidadeNormalizada.length > 50) {
      return false;
    }

    // Verifica se contém apenas letras, espaços, hífens e acentos
    const regexNacionalidade = /^[a-zA-ZÀ-ÿ\s\-]+$/;
    if (!regexNacionalidade.test(nacionalidadeNormalizada)) {
      return false;
    }

    // Verifica se a nacionalidade está na lista de nacionalidades válidas
    // Comparação case-insensitive
    return NACIONALIDADES_VALIDAS.some(
      (nacionalidadeValida) => 
        nacionalidadeValida.toLowerCase() === nacionalidadeNormalizada.toLowerCase()
    );
  }

  /**
   * Mensagem de erro padrão quando a validação falha
   * @param args - Argumentos de validação
   * @returns Mensagem de erro
   */
  defaultMessage(args: ValidationArguments): string {
    return 'Nacionalidade inválida. Deve ser uma nacionalidade reconhecida pelo sistema';
  }
}

/**
 * Decorator para validação de nacionalidade
 * Uso: @IsNacionalidade()
 */
export function IsNacionalidade(validationOptions?: any) {
  return function (object: any, propertyName: string) {
    const { registerDecorator } = require('class-validator');
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: NacionalidadeValidator,
    });
  };
}

/**
 * Função utilitária para obter a lista de nacionalidades válidas
 * @returns Array com as nacionalidades aceitas pelo sistema
 */
export function getNacionalidadesValidas(): string[] {
  return [...NACIONALIDADES_VALIDAS];
}

/**
 * Função utilitária para verificar se uma nacionalidade é válida
 * @param nacionalidade - A nacionalidade a ser verificada
 * @returns true se a nacionalidade for válida, false caso contrário
 */
export function isNacionalidadeValida(nacionalidade: string): boolean {
  if (!nacionalidade) {
    return false;
  }
  
  const nacionalidadeNormalizada = nacionalidade.trim();
  return NACIONALIDADES_VALIDAS.some(
    (nacionalidadeValida) => 
      nacionalidadeValida.toLowerCase() === nacionalidadeNormalizada.toLowerCase()
  );
}