import { DataSource } from 'typeorm';
import { Seeder, SeederFactoryManager } from 'typeorm-extension';
import { Setor } from '../../../modules/unidade/entities/setor.entity';
import { TipoBeneficio, Periodicidade } from '../../../modules/beneficio/entities/tipo-beneficio.entity';

export default class SetorTipoBeneficioSeed implements Seeder {
  public async run(
    dataSource: DataSource,
    factoryManager: SeederFactoryManager
  ): Promise<any> {
    // Seed de Setores
    await this.seedSetores(dataSource);
    
    // Seed de Tipos de Benefícios
    await this.seedTiposBeneficio(dataSource);
  }

  private async seedSetores(dataSource: DataSource): Promise<void> {
    const setorRepository = dataSource.getRepository(Setor);

    // Verificar se já existem setores no sistema
    const existingSetores = await setorRepository.count();
    if (existingSetores > 0) {
      console.log('Setores já existem no sistema. Pulando seed de setores.');
      return;
    }

    // Criar setores iniciais
    const setores = [
      {
        nome: 'Proteção Social Básica',
        sigla: 'PSB',
        descricao: 'Setor responsável pela proteção social básica',
        status: true,
      },
      {
        nome: 'Proteção Social Especial',
        sigla: 'PSE',
        descricao: 'Setor responsável pela proteção social especial',
        status: true,
      },
      {
        nome: 'Gestão do SUAS',
        sigla: 'GSUAS',
        descricao: 'Setor responsável pela gestão do SUAS',
        status: true,
      },
      {
        nome: 'Vigilância Socioassistencial',
        sigla: 'VS',
        descricao: 'Setor responsável pela vigilância socioassistencial',
        status: true,
      },
      {
        nome: 'Administrativo',
        sigla: 'ADM',
        descricao: 'Setor administrativo',
        status: true,
      },
    ];

    // Inserir setores no banco de dados
    for (const setorData of setores) {
      const setor = setorRepository.create(setorData);
      await setorRepository.save(setor);
      console.log(`Setor ${setorData.nome} criado com sucesso.`);
    }

    console.log('Seed de setores concluído com sucesso!');
  }

  private async seedTiposBeneficio(dataSource: DataSource): Promise<void> {
    const tipoBeneficioRepository = dataSource.getRepository(TipoBeneficio);

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
        descricao: 'Benefício eventual para auxiliar nas despesas de urna funerária, velório e sepultamento.',
        periodicidade: Periodicidade.UNICO,
        base_juridica: 'Lei Municipal nº 6.398/2013',
        valor: 1200.00,
        tempo_espera_dias: 30,
        criterios_concessao: 'Famílias com renda per capita de até 1/4 do salário mínimo',
        documentos_necessarios: 'Certidão de óbito, documentos pessoais, comprovante de residência, comprovante de renda',
        ativo: true,
      },
      {
        nome: 'Auxílio Natalidade',
        descricao: 'Benefício eventual para auxiliar nas despesas decorrentes do nascimento de criança em situação de vulnerabilidade.',
        periodicidade: Periodicidade.UNICO,
        base_juridica: 'Lei Municipal nº 6.398/2013',
        valor: 800.00,
        tempo_espera_dias: 30,
        criterios_concessao: 'Gestantes em situação de vulnerabilidade com renda familiar per capita de até 1/4 do salário mínimo',
        documentos_necessarios: 'Certidão de nascimento, documentos pessoais, comprovante de residência, comprovante de renda',
        ativo: true,
      },
      {
        nome: 'Cesta Básica Emergencial',
        descricao: 'Benefício eventual para garantir alimentação em situações de vulnerabilidade temporária.',
        periodicidade: Periodicidade.MENSAL,
        base_juridica: 'Lei Municipal nº 6.398/2013',
        valor: 150.00,
        tempo_espera_dias: 15,
        criterios_concessao: 'Famílias em situação de insegurança alimentar com renda per capita de até 1/2 salário mínimo',
        documentos_necessarios: 'Documentos pessoais, comprovante de residência, comprovante de renda, NIS',
        ativo: true,
      },
      {
        nome: 'Auxílio Moradia',
        descricao: 'Benefício eventual para auxiliar no pagamento de aluguel em situações de calamidade ou emergência.',
        periodicidade: Periodicidade.MENSAL,
        base_juridica: 'Lei Municipal nº 6.398/2013',
        valor: 500.00,
        tempo_espera_dias: 30,
        criterios_concessao: 'Famílias desabrigadas por situações de calamidade, desastres ou remoções',
        documentos_necessarios: 'Documentos pessoais, comprovante de residência anterior, laudo da defesa civil (quando aplicável)',
        ativo: true,
      },
      {
        nome: 'Passagem Interestadual',
        descricao: 'Benefício eventual para garantir o retorno de pessoas em situação de rua à cidade de origem.',
        periodicidade: Periodicidade.UNICO,
        base_juridica: 'Lei Municipal nº 6.398/2013',
        valor: 300.00,
        tempo_espera_dias: 15,
        criterios_concessao: 'Pessoas em situação de rua que desejam retornar à cidade de origem',
        documentos_necessarios: 'Documentos pessoais, declaração de acompanhamento do Centro POP',
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