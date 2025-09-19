/**
 * Utilitário para tratamento de CPF em parâmetros de busca
 * Detecta quando o parâmetro search contém um CPF e remove caracteres especiais apenas do CPF
 */

/**
 * Regex para detectar padrões de CPF
 * Aceita formatos: xxx.xxx.xxx-xx, xxxxxxxxxxx, xxx xxx xxx xx
 */
const CPF_PATTERNS = [
  /^\d{3}\.\d{3}\.\d{3}-\d{2}$/, // 123.456.789-01
  /^\d{11}$/, // 12345678901
  /^\d{3}\s\d{3}\s\d{3}\s\d{2}$/, // 123 456 789 01
  /^\d{3}\.\d{3}\.\d{3}\.\d{2}$/, // 123.456.789.01 (formato alternativo)
];

/**
 * Detecta se uma string é um CPF baseado em padrões comuns
 * @param text Texto a ser verificado
 * @returns true se o texto parece ser um CPF
 */
export function isCPFPattern(text: string): boolean {
  if (!text || typeof text !== 'string') {
    return false;
  }

  const trimmedText = text.trim();
  
  // Verifica se corresponde a algum padrão de CPF
  return CPF_PATTERNS.some(pattern => pattern.test(trimmedText));
}

/**
 * Remove caracteres especiais de um CPF, mantendo apenas números
 * @param cpf CPF com ou sem formatação
 * @returns CPF apenas com números
 */
export function cleanCPF(cpf: string): string {
  if (!cpf || typeof cpf !== 'string') {
    return cpf;
  }

  // Remove todos os caracteres não numéricos
  return cpf.replace(/\D/g, '');
}

/**
 * Processa parâmetro de busca, limpando caracteres especiais apenas se for um CPF
 * Mantém acentos e caracteres especiais para buscas por nome
 * @param searchParam Parâmetro de busca original
 * @returns Parâmetro processado (limpo se for CPF, original se não for)
 */
export function processSearchParam(searchParam: string): string {
  if (!searchParam || typeof searchParam !== 'string') {
    return searchParam;
  }

  const trimmedParam = searchParam.trim();

  // Se detectar que é um CPF, limpa os caracteres especiais
  if (isCPFPattern(trimmedParam)) {
    return cleanCPF(trimmedParam);
  }

  // Se não for CPF, retorna o parâmetro original (preservando acentos)
  return trimmedParam;
}

/**
 * Cria condições de busca otimizadas para CPF
 * Gera tanto a versão limpa quanto formatada para busca mais eficiente
 * @param searchParam Parâmetro de busca
 * @returns Array com variações do CPF para busca ou string original
 */
export function createCPFSearchVariations(searchParam: string): string[] {
  if (!searchParam || typeof searchParam !== 'string') {
    return [searchParam];
  }

  const trimmedParam = searchParam.trim();

  // Se não for CPF, retorna apenas o parâmetro original
  if (!isCPFPattern(trimmedParam)) {
    return [trimmedParam];
  }

  const cleanedCPF = cleanCPF(trimmedParam);
  
  // Se o CPF limpo não tem 11 dígitos, retorna apenas o original
  if (cleanedCPF.length !== 11) {
    return [trimmedParam];
  }

  // Gera variações do CPF para busca mais abrangente
  const variations = [
    cleanedCPF, // 12345678901
    `${cleanedCPF.slice(0, 3)}.${cleanedCPF.slice(3, 6)}.${cleanedCPF.slice(6, 9)}-${cleanedCPF.slice(9)}`, // 123.456.789-01
    trimmedParam, // Formato original fornecido
  ];

  // Remove duplicatas
  return [...new Set(variations)];
}

/**
 * Valida se um CPF tem formato válido (não verifica dígitos verificadores)
 * @param cpf CPF a ser validado
 * @returns true se o formato é válido
 */
export function isValidCPFFormat(cpf: string): boolean {
  if (!cpf || typeof cpf !== 'string') {
    return false;
  }

  const cleanedCPF = cleanCPF(cpf);
  
  // CPF deve ter exatamente 11 dígitos
  if (cleanedCPF.length !== 11) {
    return false;
  }

  // Não pode ser uma sequência de números iguais
  const allSameDigit = /^(\d)\1{10}$/.test(cleanedCPF);
  
  return !allSameDigit;
}

/**
 * Utilitário principal para uso nos filtros avançados
 * Processa o parâmetro search e retorna a versão otimizada para busca
 * @param search Parâmetro de busca dos filtros
 * @returns Parâmetro processado para uso na query
 */
export function processAdvancedSearchParam(search: string): {
  processedSearch: string;
  isCPF: boolean;
  variations: string[];
} {
  if (!search || typeof search !== 'string') {
    return {
      processedSearch: search,
      isCPF: false,
      variations: [search],
    };
  }

  const trimmedSearch = search.trim();
  const isCPF = isCPFPattern(trimmedSearch);

  return {
    processedSearch: isCPF ? cleanCPF(trimmedSearch) : trimmedSearch,
    isCPF,
    variations: createCPFSearchVariations(trimmedSearch),
  };
}