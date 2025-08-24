/**
 * Lista de campos sensíveis que não devem ser incluídos nas respostas de erro ou logs
 * Esta lista é usada para sanitização de dados em mensagens de erro e logs
 */
export const SENSITIVE_FIELDS = [
  'senha',
  'password',
  'token',
  'secret',
  'authorization',
  'key',
  'confirmPassword',
  'confirmSenha',
  'currentPassword',
  'senhaAtual',
  'newPassword',
  'novaSenha',
  'cpf',
  'rg',
  'cnpj',
  'cardNumber',
  'cartao',
  'cvv',
  'passaporte',
  'biometria',
];

/**
 * Verifica se um nome de campo é considerado sensível
 * @param field Nome do campo a ser verificado
 * @returns true se o campo for sensível, false caso contrário
 */
export function isSensitiveField(field: string): boolean {
  return SENSITIVE_FIELDS.some((sensitive) =>
    field.toLowerCase().includes(sensitive.toLowerCase()),
  );
}
