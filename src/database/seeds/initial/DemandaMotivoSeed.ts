import { DataSource } from 'typeorm';
import { Seeder, SeederFactoryManager } from 'typeorm-extension';
import { DemandaMotivo, TipoDemanda } from '../../../modules/ocorrencia/entities/demanda-motivo.entity';

export default class DemandaMotivoSeed implements Seeder {
  public async run(
    dataSource: DataSource,
    factoryManager: SeederFactoryManager
  ): Promise<any> {
    const demandaMotivoRepository = dataSource.getRepository(DemandaMotivo);

    // Verificar se já existem motivos de demanda no sistema
    const existingMotivos = await demandaMotivoRepository.count();
    if (existingMotivos > 0) {
      console.log('Motivos de demanda já existem no sistema. Pulando seed de motivos de demanda.');
      return;
    }

    // Criar motivos de demanda iniciais
    const motivosDemanda = [
      // Denúncias
      {
        tipo: TipoDemanda.DENUNCIA,
        nome: 'Irregularidade em benefício',
        descricao: 'Denúncia sobre possível irregularidade na concessão ou uso de benefício eventual',
        ativo: true,
      },
      {
        tipo: TipoDemanda.DENUNCIA,
        nome: 'Falsificação de documentos',
        descricao: 'Denúncia sobre possível uso de documentos falsificados para obtenção de benefício',
        ativo: true,
      },
      {
        tipo: TipoDemanda.DENUNCIA,
        nome: 'Informações falsas',
        descricao: 'Denúncia sobre fornecimento de informações falsas para obtenção de benefício',
        ativo: true,
      },
      
      // Reclamações
      {
        tipo: TipoDemanda.RECLAMACAO,
        nome: 'Demora no atendimento',
        descricao: 'Reclamação sobre tempo excessivo para atendimento ou análise de solicitação',
        ativo: true,
      },
      {
        tipo: TipoDemanda.RECLAMACAO,
        nome: 'Mau atendimento',
        descricao: 'Reclamação sobre qualidade do atendimento prestado por servidor',
        ativo: true,
      },
      {
        tipo: TipoDemanda.RECLAMACAO,
        nome: 'Benefício não recebido',
        descricao: 'Reclamação sobre não recebimento de benefício aprovado',
        ativo: true,
      },
      
      // Sugestões
      {
        tipo: TipoDemanda.SUGESTAO,
        nome: 'Melhoria no processo',
        descricao: 'Sugestão para melhoria no processo de solicitação ou concessão de benefícios',
        ativo: true,
      },
      {
        tipo: TipoDemanda.SUGESTAO,
        nome: 'Novo tipo de benefício',
        descricao: 'Sugestão para criação de novo tipo de benefício eventual',
        ativo: true,
      },
      
      // Elogios
      {
        tipo: TipoDemanda.ELOGIO,
        nome: 'Bom atendimento',
        descricao: 'Elogio ao atendimento prestado por servidor',
        ativo: true,
      },
      {
        tipo: TipoDemanda.ELOGIO,
        nome: 'Agilidade no processo',
        descricao: 'Elogio à agilidade no processo de solicitação ou concessão de benefício',
        ativo: true,
      },
      
      // Informações
      {
        tipo: TipoDemanda.INFORMACAO,
        nome: 'Documentação necessária',
        descricao: 'Solicitação de informação sobre documentação necessária para solicitar benefício',
        ativo: true,
      },
      {
        tipo: TipoDemanda.INFORMACAO,
        nome: 'Status da solicitação',
        descricao: 'Solicitação de informação sobre status de solicitação de benefício',
        ativo: true,
      },
      {
        tipo: TipoDemanda.INFORMACAO,
        nome: 'Critérios de elegibilidade',
        descricao: 'Solicitação de informação sobre critérios para recebimento de benefício',
        ativo: true,
      },
      
      // Outros
      {
        tipo: TipoDemanda.OUTRO,
        nome: 'Outros motivos',
        descricao: 'Demandas que não se enquadram nas categorias anteriores',
        ativo: true,
      },
    ];

    // Inserir motivos de demanda no banco de dados
    for (const motivoData of motivosDemanda) {
      const motivo = demandaMotivoRepository.create(motivoData);
      await demandaMotivoRepository.save(motivo);
      console.log(`Motivo de demanda '${motivoData.nome}' (${motivoData.tipo}) criado com sucesso.`);
    }

    console.log('Seed de motivos de demanda concluído com sucesso!');
  }
}