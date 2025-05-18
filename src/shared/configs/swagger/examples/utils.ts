import { faker } from '@faker-js/faker/locale/pt_BR';

/**
 * Utilitários para geração de dados de exemplo
 */

/**
 * Gera um CPF válido para fins de exemplo
 */
export function gerarCpfExemplo(): string {
  const cpf = Array.from({ length: 9 }, () =>
    Math.floor(Math.random() * 10).toString()
  );

  // Cálculo do primeiro dígito verificador
  let soma = 0;
  for (let i = 0; i < 9; i++) {
    soma += parseInt(cpf[i]) * (10 - i);
  }
  const digito1 = (soma * 10) % 11;
  cpf.push(digito1 === 10 ? '0' : digito1.toString());

  // Cálculo do segundo dígito verificador
  soma = 0;
  for (let i = 0; i < 10; i++) {
    soma += parseInt(cpf[i]) * (11 - i);
  }
  const digito2 = (soma * 10) % 11;
  cpf.push(digito2 === 10 ? '0' : digito2.toString());

  // Formatação do CPF
  return cpf.join('').replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
}

/**
 * Gera um endereço de exemplo
 */
export function gerarEnderecoExemplo() {
  return {
    cep: faker.location.zipCode('########'),
    logradouro: faker.location.street(),
    numero: faker.number.int({ min: 1, max: 9999 }).toString(),
    complemento: faker.helpers.arrayElement([
      'Casa',
      'Apto 101',
      'Sala 201',
      'Fundos',
      'Bloco B',
      ''
    ]),
    bairro: faker.location.county(),
    cidade: faker.location.city(),
    uf: faker.location.state({ abbreviated: true })
  };
}

/**
 * Gera um telefone de exemplo
 */
export function gerarTelefoneExemplo(): string {
  // Formato: (XX) 9XXXX-XXXX
  const ddd = faker.number.int({ min: 11, max: 99 });
  const parte1 = faker.number.int({ min: 90000, max: 99999 });
  const parte2 = faker.number.int({ min: 1000, max: 9999 });
  return `(${ddd}) 9${parte1}-${parte2}`;
}

/**
 * Gera um email de exemplo baseado no nome
 */
export function gerarEmailExemplo(nome: string): string {
  const nomeFormatado = nome
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '.');
  
  return `${nomeFormatado}@${faker.internet.domainName()}`;
}

/**
 * Gera uma data de nascimento de exemplo
 */
export function gerarDataNascimentoExemplo(
  minIdade: number = 18,
  maxIdade: number = 90
): string {
  const dataAtual = new Date();
  const anoAtual = dataAtual.getFullYear();
  const mesAtual = dataAtual.getMonth();
  const diaAtual = dataAtual.getDate();
  
  const anoNascimento = anoAtual - faker.number.int({ min: minIdade, max: maxIdade });
  const mesNascimento = faker.number.int({ min: 1, max: 12 });
  const diaNascimento = faker.number.int({ 
    min: 1, 
    max: new Date(anoNascimento, mesNascimento, 0).getDate() 
  });
  
  return new Date(anoNascimento, mesNascimento - 1, diaNascimento).toISOString().split('T')[0];
}

/**
 * Gera um valor monetário de exemplo
 */
export function gerarValorMonetarioExemplo(
  min: number = 100,
  max: number = 10000,
  decimais: number = 2
): number {
  return parseFloat(
    faker.number.float({ min, max, fractionDigits: decimais }).toFixed(decimais)
  );
}

/**
 * Gera uma descrição de exemplo
 */
export function gerarDescricaoExemplo(palavras: number = 10): string {
  return faker.lorem.words(palavras);
}

/**
 * Gera um nome de exemplo
 */
export function gerarNomeExemplo(): string {
  return faker.person.fullName();
}

export default {
  gerarCpfExemplo,
  gerarEnderecoExemplo,
  gerarTelefoneExemplo,
  gerarEmailExemplo,
  gerarDataNascimentoExemplo,
  gerarValorMonetarioExemplo,
  gerarDescricaoExemplo,
  gerarNomeExemplo
};
