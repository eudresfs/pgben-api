/**
 * Utilidades para geração de dados aleatórios para seeds
 *
 * Esta classe contém métodos estáticos para gerar diversos tipos de dados aleatórios
 * que podem ser utilizados nos seeds para gerar dados realistas
 */
export class DataGenerator {
  /**
   * Gera um CPF válido (apenas para fins de teste)
   */
  public static gerarCpf(): string {
    const n1 = this.randomDigit();
    const n2 = this.randomDigit();
    const n3 = this.randomDigit();
    const n4 = this.randomDigit();
    const n5 = this.randomDigit();
    const n6 = this.randomDigit();
    const n7 = this.randomDigit();
    const n8 = this.randomDigit();
    const n9 = this.randomDigit();

    let d1 =
      n9 * 2 +
      n8 * 3 +
      n7 * 4 +
      n6 * 5 +
      n5 * 6 +
      n4 * 7 +
      n3 * 8 +
      n2 * 9 +
      n1 * 10;
    d1 = 11 - (d1 % 11);
    if (d1 >= 10) {d1 = 0;}

    let d2 =
      d1 * 2 +
      n9 * 3 +
      n8 * 4 +
      n7 * 5 +
      n6 * 6 +
      n5 * 7 +
      n4 * 8 +
      n3 * 9 +
      n2 * 10 +
      n1 * 11;
    d2 = 11 - (d2 % 11);
    if (d2 >= 10) {d2 = 0;}

    return `${n1}${n2}${n3}${n4}${n5}${n6}${n7}${n8}${n9}${d1}${d2}`;
  }

  /**
   * Gera um nome completo aleatório
   */
  public static gerarNome(): string {
    const nomes = [
      'Maria',
      'José',
      'Ana',
      'João',
      'Antonio',
      'Francisco',
      'Carlos',
      'Paulo',
      'Pedro',
      'Lucas',
      'Luiz',
      'Marcos',
      'Luis',
      'Gabriel',
      'Rafael',
      'Francisca',
      'Daniel',
      'Marcelo',
      'Bruno',
      'Eduardo',
      'Felipe',
      'Raimundo',
      'Rodrigo',
      'Patrícia',
      'Adriana',
      'Juliana',
      'Márcia',
      'Fernanda',
      'Aline',
      'Sandra',
      'Camila',
      'Amanda',
      'Bruna',
      'Jéssica',
      'Letícia',
      'Julia',
      'Luciana',
      'Vanessa',
    ];

    const sobrenomes = [
      'Silva',
      'Santos',
      'Oliveira',
      'Souza',
      'Lima',
      'Pereira',
      'Ferreira',
      'Alves',
      'Ribeiro',
      'Rodrigues',
      'Gomes',
      'Costa',
      'Martins',
      'Araújo',
      'Melo',
      'Barbosa',
      'Nascimento',
      'Almeida',
      'Soares',
      'Vieira',
      'Monteiro',
      'Mendes',
      'Freitas',
      'Dias',
      'Teixeira',
      'Cardoso',
      'Marques',
      'Andrade',
      'Rocha',
      'Moreira',
      'Nunes',
      'Pinto',
      'Cavalcanti',
      'Miranda',
      'Correia',
      'Campos',
      'Pires',
      'Carvalho',
    ];

    const nome = nomes[Math.floor(Math.random() * nomes.length)];
    const sobrenome1 =
      sobrenomes[Math.floor(Math.random() * sobrenomes.length)];
    const sobrenome2 =
      sobrenomes[Math.floor(Math.random() * sobrenomes.length)];

    return `${nome} ${sobrenome1} ${sobrenome2}`;
  }

  /**
   * Gera um número de telefone aleatório no formato (XX) XXXXX-XXXX
   */
  public static gerarTelefone(): string {
    const ddd = Math.floor(Math.random() * 90) + 10; // 10-99
    const parte1 = Math.floor(Math.random() * 90000) + 10000; // 10000-99999
    const parte2 = Math.floor(Math.random() * 9000) + 1000; // 1000-9999

    return `(${ddd}) ${parte1}-${parte2}`;
  }

  /**
   * Gera um endereço de email aleatório
   */
  public static gerarEmail(nome?: string): string {
    const dominios = [
      'gmail.com',
      'hotmail.com',
      'outlook.com',
      'yahoo.com',
      'uol.com.br',
      'bol.com.br',
    ];

    if (!nome) {
      nome = this.gerarNome();
    }

    // Normalizar o nome para usar como base do email
    const baseEmail = nome
      .toLowerCase()
      .normalize('NFD') // Normaliza caracteres acentuados
      .replace(/[\u0300-\u036f]/g, '') // Remove acentos
      .replace(/\s+/g, '.'); // Substitui espaços por pontos

    const dominio = dominios[Math.floor(Math.random() * dominios.length)];
    const random = Math.floor(Math.random() * 1000); // Número aleatório para garantir unicidade

    return `${baseEmail}${random}@${dominio}`;
  }

  /**
   * Gera uma data de nascimento aleatória entre minAge e maxAge anos atrás
   */
  public static gerarDataNascimento(minAge = 18, maxAge = 80): Date {
    const today = new Date();
    const minYear = today.getFullYear() - maxAge;
    const maxYear = today.getFullYear() - minAge;

    const year = minYear + Math.floor(Math.random() * (maxYear - minYear + 1));
    const month = Math.floor(Math.random() * 12);
    const day = Math.floor(Math.random() * 28) + 1; // Limita a 28 para evitar problemas com fevereiro

    return new Date(year, month, day);
  }

  /**
   * Gera um valor monetário aleatório entre min e max
   */
  public static gerarValorMonetario(min = 100, max = 5000): number {
    return Number((min + Math.random() * (max - min)).toFixed(2));
  }

  /**
   * Gera um CEP aleatório no formato XXXXX-XXX
   */
  public static gerarCep(): string {
    const parte1 = Math.floor(Math.random() * 90000) + 10000; // 10000-99999
    const parte2 = Math.floor(Math.random() * 900) + 100; // 100-999

    return `${parte1}-${parte2}`;
  }

  /**
   * Seleciona um item aleatório de um array
   */
  public static selecionarAleatorio<T>(array: T[]): T {
    return array[Math.floor(Math.random() * array.length)];
  }

  /**
   * Gera um número aleatório entre min e max (inclusive)
   */
  public static numeroAleatorio(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  /**
   * Gera um dígito aleatório (0-9)
   */
  private static randomDigit(): number {
    return Math.floor(Math.random() * 10);
  }
}
