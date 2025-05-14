import { DataSource } from 'typeorm';
import { Seeder, SeederFactoryManager } from 'typeorm-extension';
import { Ocorrencia, TipoOcorrencia } from '../../../modules/ocorrencia/entities/ocorrencia.entity';
import { DemandaMotivo, TipoDemanda } from '../../../modules/ocorrencia/entities/demanda-motivo.entity';
import { User } from '../../../user/entities/user.entity';

export class OcorrenciaSeed implements Seeder {
  public async run(
    dataSource: DataSource,
    factoryManager: SeederFactoryManager
  ): Promise<any> {
    const ocorrenciaRepository = dataSource.getRepository(Ocorrencia);
    const demandaMotivoRepository = dataSource.getRepository(DemandaMotivo);
    const userRepository = dataSource.getRepository(User);

    // Verificar se já existem ocorrências no sistema
    const existingOcorrencias = await ocorrenciaRepository.count();
    if (existingOcorrencias > 0) {
      console.log('Ocorrências já existem no sistema. Pulando seed de ocorrências.');
      return;
    }

    // Buscar usuários para associar às ocorrências
    const usuarios = await userRepository.find({ take: 3 });
    if (usuarios.length === 0) {
      console.log('Nenhum usuário encontrado. Não é possível criar ocorrências.');
      return;
    }

    // Buscar motivos de demanda para associar às ocorrências
    const motivos = await demandaMotivoRepository.find();
    if (motivos.length === 0) {
      console.log('Nenhum motivo de demanda encontrado. Não é possível criar ocorrências.');
      return;
    }

    // Função para obter um motivo aleatório por tipo
    const getMotivoByTipo = (tipo: TipoDemanda) => {
      const motivosFiltrados = motivos.filter(m => m.tipo === tipo);
      if (motivosFiltrados.length === 0) return motivos[0];
      return motivosFiltrados[Math.floor(Math.random() * motivosFiltrados.length)];
    };

    // Criar ocorrências iniciais para demonstração
    const ocorrencias = [
      {
        titulo: 'Sugestão de melhoria no processo de solicitação',
        descricao: 'Sugestão para simplificar o processo de solicitação de benefícios eventuais, reduzindo a quantidade de documentos necessários na fase inicial.',
        tipo: TipoOcorrencia.OBSERVACAO,
        demanda_motivo: getMotivoByTipo(TipoDemanda.SUGESTAO),
        usuario: usuarios[0],
        prioridade: 'media',
        status: 'aberta',
      },
      {
        titulo: 'Reclamação sobre demora na análise',
        descricao: 'Cidadão reclama que sua solicitação está há mais de 30 dias em análise sem retorno.',
        tipo: TipoOcorrencia.IRREGULARIDADE,
        demanda_motivo: getMotivoByTipo(TipoDemanda.RECLAMACAO),
        usuario: usuarios[1],
        prioridade: 'alta',
        status: 'em_analise',
      },
      {
        titulo: 'Elogio ao atendimento da unidade CRAS Norte',
        descricao: 'Cidadão elogia o atendimento recebido na unidade CRAS Norte, destacando a atenção e o profissionalismo da equipe.',
        tipo: TipoOcorrencia.OUTRO,
        demanda_motivo: getMotivoByTipo(TipoDemanda.ELOGIO),
        usuario: usuarios[2],
        prioridade: 'baixa',
        status: 'concluida',
      },
      {
        titulo: 'Dúvida sobre documentação para auxílio natalidade',
        descricao: 'Solicitação de informação sobre quais documentos são necessários para solicitar o auxílio natalidade.',
        tipo: TipoOcorrencia.OBSERVACAO,
        demanda_motivo: getMotivoByTipo(TipoDemanda.INFORMACAO),
        usuario: usuarios[0],
        prioridade: 'media',
        status: 'aberta',
      },
      {
        titulo: 'Denúncia de irregularidade em benefício',
        descricao: 'Denúncia anônima sobre possível irregularidade na concessão de benefício eventual para pessoa que não atende aos critérios.',
        tipo: TipoOcorrencia.IRREGULARIDADE,
        demanda_motivo: getMotivoByTipo(TipoDemanda.DENUNCIA),
        usuario: usuarios[1],
        prioridade: 'alta',
        status: 'em_analise',
      },
    ];

    // Inserir ocorrências no banco de dados
    for (const ocorrenciaData of ocorrencias) {
      const ocorrencia = ocorrenciaRepository.create(ocorrenciaData);
      await ocorrenciaRepository.save(ocorrencia);
      console.log(`Ocorrência '${ocorrenciaData.titulo}' criada com sucesso.`);
    }

    console.log('Seed de ocorrências concluído com sucesso!');
  }
}