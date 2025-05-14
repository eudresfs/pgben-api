import { DataSource } from 'typeorm';
import { Seeder, SeederFactoryManager } from 'typeorm-extension';
import { Ocorrencia, TipoOcorrencia, StatusOcorrencia } from '../../../modules/ocorrencia/entities/ocorrencia.entity';
import { DemandaMotivo, TipoDemanda } from '../../../modules/ocorrencia/entities/demanda-motivo.entity';
import { Usuario } from '../../../modules/usuario/entities/usuario.entity';

export default class OcorrenciaSeed implements Seeder {
  public async run(
    dataSource: DataSource,
    factoryManager: SeederFactoryManager
  ): Promise<any> {
    const ocorrenciaRepository = dataSource.getRepository(Ocorrencia);
    const demandaMotivoRepository = dataSource.getRepository(DemandaMotivo);
    const userRepository = dataSource.getRepository(Usuario);

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
        tipo: 'OBSERVACAO', // Usando string direta enquanto o enum não é atualizado
        demanda_motivo: getMotivoByTipo(TipoDemanda.SUGESTAO),
        usuario: usuarios[0],
        prioridade: 'media',
        status: 'aberta',
      },
      {
        titulo: 'Reclamação sobre demora na análise',
        descricao: 'Cidadão reclama que sua solicitação está há mais de 30 dias em análise sem retorno.',
        tipo: 'IRREGULARIDADE', // Usando string direta enquanto o enum não é atualizado
        demanda_motivo: getMotivoByTipo(TipoDemanda.RECLAMACAO),
        usuario: usuarios[1],
        prioridade: 'alta',
        status: StatusOcorrencia.EM_ANALISE,
      },
      {
        titulo: 'Elogio ao atendimento da unidade CRAS Norte',
        descricao: 'Cidadão elogia o atendimento recebido na unidade CRAS Norte, destacando a atenção e o profissionalismo da equipe.',
        tipo: TipoOcorrencia.OUTRO,
        demanda_motivo: getMotivoByTipo(TipoDemanda.ELOGIO),
        usuario: usuarios[2],
        prioridade: 'baixa',
        status: StatusOcorrencia.CONCLUIDA,
      },
      {
        titulo: 'Dúvida sobre documentação para auxílio natalidade',
        descricao: 'Solicitação de informação sobre quais documentos são necessários para solicitar o auxílio natalidade.',
        tipo: 'OBSERVACAO', // Usando string direta enquanto o enum não é atualizado
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
        status: StatusOcorrencia.EM_ANALISE,
      },
    ];

    // Inserir ocorrências no banco de dados
    for (const ocorrenciaData of ocorrencias) {
      try {
        // Mapear o tipo de ocorrência para o enum correto
        let tipoMapeado: TipoOcorrencia;
        if (typeof ocorrenciaData.tipo === 'string') {
          // Se for string, mapear para o enum correspondente
          switch(ocorrenciaData.tipo) {
            case 'OBSERVACAO':
              tipoMapeado = TipoOcorrencia.OUTRO; // Mapeando para um tipo válido
              break;
            case 'IRREGULARIDADE':
              tipoMapeado = TipoOcorrencia.IRREGULARIDADE;
              break;
            default:
              // Tentar converter a string para o enum (assumindo que está no formato correto)
              tipoMapeado = TipoOcorrencia[ocorrenciaData.tipo as keyof typeof TipoOcorrencia] || TipoOcorrencia.OUTRO;
          }
        } else {
          tipoMapeado = ocorrenciaData.tipo;
        }

        // Mapear o status para o enum correto
        let statusMapeado: StatusOcorrencia;
        if (typeof ocorrenciaData.status === 'string') {
          if (ocorrenciaData.status === 'aberta') {
            statusMapeado = StatusOcorrencia.ABERTA;
          } else if (ocorrenciaData.status === 'em_analise') {
            statusMapeado = StatusOcorrencia.EM_ANALISE;
          } else if (ocorrenciaData.status === 'resolvida') {
            statusMapeado = StatusOcorrencia.RESOLVIDA;
          } else if (ocorrenciaData.status === 'concluida') {
            statusMapeado = StatusOcorrencia.CONCLUIDA;
          } else if (ocorrenciaData.status === 'cancelada') {
            statusMapeado = StatusOcorrencia.CANCELADA;
          } else {
            statusMapeado = StatusOcorrencia.ABERTA; // valor padrão
          }
        } else {
          statusMapeado = ocorrenciaData.status;
        }

        // Criar a nova ocorrência usando o método create
        const ocorrencia = new Ocorrencia();
        ocorrencia.titulo = ocorrenciaData.titulo;
        ocorrencia.descricao = ocorrenciaData.descricao;
        ocorrencia.tipo = tipoMapeado as any;
        ocorrencia.status = statusMapeado as any;
        ocorrencia.prioridade = ocorrenciaData.prioridade === 'alta' ? 3 : ocorrenciaData.prioridade === 'media' ? 2 : 1;
        ocorrencia.registrado_por_id = ocorrenciaData.usuario.id;
        ocorrencia.demanda_motivo_id = ocorrenciaData.demanda_motivo.id;
        
        await ocorrenciaRepository.save(ocorrencia);
        console.log(`Ocorrência '${ocorrenciaData.titulo}' criada com sucesso.`);
      } catch (error) {
        console.error(`Erro ao criar ocorrência '${ocorrenciaData.titulo}':`, error);
      }
    }

    console.log('Seed de ocorrências concluído com sucesso!');
  }
}