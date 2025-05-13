import { DataSource } from 'typeorm';
import { Seeder, SeederFactoryManager } from 'typeorm-extension';

export default class FluxoBeneficioSeed implements Seeder {
  public async run(
    dataSource: DataSource,
    factoryManager: SeederFactoryManager
  ): Promise<any> {
    const fluxoBeneficioRepository = dataSource.getRepository('fluxo_beneficio');
    const tipoBeneficioRepository = dataSource.getRepository('tipos_beneficio');
    const setorRepository = dataSource.getRepository('setor');

    // Verificar se já existem fluxos de benefício no sistema
    const existingFluxos = await fluxoBeneficioRepository.count();
    if (existingFluxos > 0) {
      console.log('Fluxos de benefício já existem no sistema. Pulando seed de fluxos de benefício.');
      return;
    }

    // Buscar todos os tipos de benefício
    const tiposBeneficio = await tipoBeneficioRepository.find();
    if (tiposBeneficio.length === 0) {
      console.log('Nenhum tipo de benefício encontrado. Não é possível criar fluxos de benefício.');
      return;
    }

    // Buscar setores
    const setores = await setorRepository.find();
    if (setores.length === 0) {
      console.log('Nenhum setor encontrado. Não é possível criar fluxos de benefício.');
      return;
    }

    // Mapear setores por nome para facilitar a busca
    const setoresPorNome = {};
    setores.forEach(setor => {
      setoresPorNome[setor.nome] = setor;
      // Adicionar também pelo nome parcial para facilitar a busca
      const nomeSimplificado = setor.nome.split(' ')[0];
      setoresPorNome[nomeSimplificado] = setor;
    });

    // Função para encontrar um setor pelo nome ou parte do nome
    const encontrarSetor = (nome) => {
      // Tentar encontrar pelo nome exato
      if (setoresPorNome[nome]) {
        return setoresPorNome[nome];
      }
      
      // Tentar encontrar por correspondência parcial
      for (const [key, setor] of Object.entries(setoresPorNome)) {
        if (nome.includes(key) || key.includes(nome)) {
          return setor;
        }
      }
      
      // Se não encontrar, retornar o primeiro setor (fallback)
      console.log(`Setor "${nome}" não encontrado. Usando o primeiro setor disponível.`);
      return setores[0];
    };

    // Definir fluxos para cada tipo de benefício
    const fluxosPorBeneficio = {
      'Auxílio Funeral': [
        { setor: 'Atendimento', ordem: 1 },
        { setor: 'Análise Social', ordem: 2 },
        { setor: 'Aprovação', ordem: 3 },
        { setor: 'Financeiro', ordem: 4 }
      ],
      'Auxílio Natalidade': [
        { setor: 'Atendimento', ordem: 1 },
        { setor: 'Análise Social', ordem: 2 },
        { setor: 'Aprovação', ordem: 3 },
        { setor: 'Financeiro', ordem: 4 }
      ],
      'Aluguel Social': [
        { setor: 'Atendimento', ordem: 1 },
        { setor: 'Análise Social', ordem: 2 },
        { setor: 'Visita Domiciliar', ordem: 3 },
        { setor: 'Aprovação', ordem: 4 },
        { setor: 'Jurídico', ordem: 5 },
        { setor: 'Financeiro', ordem: 6 }
      ],
      'Cesta Básica Emergencial': [
        { setor: 'Atendimento', ordem: 1 },
        { setor: 'Análise Social', ordem: 2 },
        { setor: 'Aprovação', ordem: 3 },
        { setor: 'Almoxarifado', ordem: 4 }
      ],
      'Auxílio Passagem Interestadual': [
        { setor: 'Atendimento', ordem: 1 },
        { setor: 'Análise Social', ordem: 2 },
        { setor: 'Aprovação', ordem: 3 },
        { setor: 'Financeiro', ordem: 4 }
      ],
      'Auxílio Documentação Civil': [
        { setor: 'Atendimento', ordem: 1 },
        { setor: 'Análise Social', ordem: 2 },
        { setor: 'Aprovação', ordem: 3 }
      ],
      'Auxílio Calamidade': [
        { setor: 'Atendimento', ordem: 1 },
        { setor: 'Análise Social', ordem: 2 },
        { setor: 'Defesa Civil', ordem: 3 },
        { setor: 'Aprovação', ordem: 4 },
        { setor: 'Financeiro', ordem: 5 }
      ]
    };

    // Criar fluxos de benefício para cada tipo de benefício
    for (const tipoBeneficio of tiposBeneficio) {
      const fluxos = fluxosPorBeneficio[tipoBeneficio.nome];
      if (!fluxos) {
        console.log(`Fluxo para o benefício ${tipoBeneficio.nome} não definido. Pulando.`);
        continue;
      }

      for (const fluxo of fluxos) {
        const setor = encontrarSetor(fluxo.setor);
        if (!setor) {
          console.log(`Setor ${fluxo.setor} não encontrado. Pulando etapa do fluxo.`);
          continue;
        }

        const fluxoBeneficio = fluxoBeneficioRepository.create({
          tipo_beneficio_id: tipoBeneficio.id,
          setor_id: setor.id,
          ordem: fluxo.ordem
        });

        await fluxoBeneficioRepository.save(fluxoBeneficio);
        console.log(`Fluxo de benefício para ${tipoBeneficio.nome}, etapa ${fluxo.ordem} (${fluxo.setor}) criado com sucesso.`);
      }
    }

    console.log('Seed de fluxos de benefício concluído com sucesso!');
  }
}
