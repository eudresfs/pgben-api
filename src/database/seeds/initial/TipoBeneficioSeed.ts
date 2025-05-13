import { DataSource } from 'typeorm';
import { Seeder, SeederFactoryManager } from 'typeorm-extension';

export default class TipoBeneficioSeed implements Seeder {
  public async run(
    dataSource: DataSource,
    factoryManager: SeederFactoryManager
  ): Promise<any> {
    const tipoBeneficioRepository = dataSource.getRepository('tipos_beneficio');

    // Verificar se já existem tipos de benefício no sistema
    const existingTiposBeneficio = await tipoBeneficioRepository.count();
    if (existingTiposBeneficio > 0) {
      console.log('Tipos de benefício já existem no sistema. Pulando seed de tipos de benefício.');
      return;
    }

    // Criar tipos de benefício iniciais
    const tiposBeneficio = [
      {
        nome: 'Auxílio Funeral',
        descricao: 'Benefício eventual para custear despesas de urna funerária, velório e sepultamento.',
        base_legal: 'Lei Municipal nº 6.379/2013 e Decreto Municipal nº 10.935/2016.',
        periodicidade: 'unico',
        periodo_maximo: 1,
        permite_renovacao: false,
        permite_prorrogacao: false,
        valor: 1500.00,
        valor_maximo: 1500.00,
        ativo: true,
      },
      {
        nome: 'Auxílio Natalidade',
        descricao: 'Benefício eventual para apoiar a família em virtude de nascimento de criança, para atender às necessidades do bebê e apoiar a mãe nos casos em que o bebê nasce morto ou morre logo após o nascimento.',
        base_legal: 'Lei Municipal nº 6.379/2013 e Decreto Municipal nº 10.935/2016.',
        periodicidade: 'unico',
        periodo_maximo: 1,
        permite_renovacao: false,
        permite_prorrogacao: false,
        valor: 500.00,
        valor_maximo: 500.00,
        ativo: true,
      },
      {
        nome: 'Aluguel Social',
        descricao: 'Benefício eventual destinado ao pagamento de aluguel de imóvel a famílias em situação habitacional de emergência e de vulnerabilidade temporária.',
        base_legal: 'Lei Municipal nº 6.379/2013 e Decreto Municipal nº 10.935/2016.',
        periodicidade: 'mensal',
        periodo_maximo: 6,
        permite_renovacao: true,
        permite_prorrogacao: true,
        valor: 600.00,
        valor_maximo: 800.00,
        ativo: true,
      },
      {
        nome: 'Cesta Básica Emergencial',
        descricao: 'Benefício eventual para garantir alimentação em situação de vulnerabilidade temporária.',
        base_legal: 'Lei Municipal nº 6.379/2013 e Decreto Municipal nº 10.935/2016.',
        periodicidade: 'unico',
        periodo_maximo: 1,
        permite_renovacao: true,
        permite_prorrogacao: false,
        valor: 200.00,
        valor_maximo: 200.00,
        ativo: true,
      },
      {
        nome: 'Auxílio Passagem Interestadual',
        descricao: 'Benefício eventual destinado a atender necessidades de deslocamento para outras cidades ou estados em situações específicas.',
        base_legal: 'Lei Municipal nº 6.379/2013 e Decreto Municipal nº 10.935/2016.',
        periodicidade: 'unico',
        periodo_maximo: 1,
        permite_renovacao: false,
        permite_prorrogacao: false,
        valor: null,
        valor_maximo: 500.00,
        ativo: true,
      },
      {
        nome: 'Auxílio Documentação Civil',
        descricao: 'Benefício eventual para custear despesas relacionadas à emissão de documentação civil básica.',
        base_legal: 'Lei Municipal nº 6.379/2013 e Decreto Municipal nº 10.935/2016.',
        periodicidade: 'unico',
        periodo_maximo: 1,
        permite_renovacao: false,
        permite_prorrogacao: false,
        valor: 100.00,
        valor_maximo: 150.00,
        ativo: true,
      },
      {
        nome: 'Auxílio Calamidade',
        descricao: 'Benefício eventual para atender vítimas de calamidades públicas, como enchentes, desabamentos, incêndios, etc.',
        base_legal: 'Lei Municipal nº 6.379/2013 e Decreto Municipal nº 10.935/2016.',
        periodicidade: 'unico',
        periodo_maximo: 1,
        permite_renovacao: false,
        permite_prorrogacao: true,
        valor: null,
        valor_maximo: 1000.00,
        ativo: true,
      },
    ];

    // Inserir tipos de benefício no banco de dados
    for (const tipoBeneficioData of tiposBeneficio) {
      const tipoBeneficio = tipoBeneficioRepository.create(tipoBeneficioData);
      await tipoBeneficioRepository.save(tipoBeneficio);
      console.log(`Tipo de benefício ${tipoBeneficioData.nome} criado com sucesso.`);
    }

    console.log('Seed de tipos de benefício concluído com sucesso!');
  }
}
