import { DataSource } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';

/**
 * Seed para criação de solicitações fictícias para ambiente de desenvolvimento
 *
 * Este seed cria dados fictícios de solicitações de benefícios para testes e desenvolvimento
 */
export class SolicitacaoDevSeed {
  public static async run(dataSource: DataSource): Promise<void> {
    console.log('Iniciando seed de solicitações para desenvolvimento');

    // Obter cidadãos disponíveis
    const cidadaos = await dataSource.query('SELECT id FROM cidadao');
    if (cidadaos.length === 0) {
      console.log(
        'Nenhum cidadão encontrado, não é possível criar solicitações',
      );
      return;
    }

    // Obter tipos de benefícios disponíveis
    const tiposBeneficios = await dataSource.query(
      'SELECT id, nome FROM tipo_beneficio WHERE ativo = true',
    );
    if (tiposBeneficios.length === 0) {
      console.log(
        'Nenhum tipo de benefício encontrado, não é possível criar solicitações',
      );
      return;
    }

    // Obter usuários disponíveis (técnicos)
    const usuarios = await dataSource.query(`
      SELECT u.id FROM usuario u
      JOIN perfil p ON u.perfil_id = p.id
      WHERE p.nome IN ('tecnico_semtas', 'tecnico_unidade')
    `);
    if (usuarios.length === 0) {
      console.log(
        'Nenhum usuário técnico encontrado, usando null para o responsável',
      );
    }

    // Obter setores disponíveis
    const setores = await dataSource.query(
      'SELECT id FROM setor WHERE ativo = true',
    );
    if (setores.length === 0) {
      console.log('Nenhum setor encontrado, não é possível criar solicitações');
      return;
    }

    // Criar solicitações para cada cidadão
    const statusPossiveis = [
      'pendente',
      'analise',
      'aprovado',
      'reprovado',
      'cancelado',
    ];
    const origens = ['presencial', 'telefone', 'internet', 'visita'];

    for (const cidadao of cidadaos) {
      // Selecionar um tipo de benefício aleatório
      const tipoBeneficio =
        tiposBeneficios[Math.floor(Math.random() * tiposBeneficios.length)];

      // Selecionar um status aleatório
      const status =
        statusPossiveis[Math.floor(Math.random() * statusPossiveis.length)];

      // Selecionar um responsável aleatório (se houver usuários)
      const responsavel =
        usuarios.length > 0
          ? usuarios[Math.floor(Math.random() * usuarios.length)].id
          : null;

      // Selecionar um setor aleatório
      const setor = setores[Math.floor(Math.random() * setores.length)];

      // Gerar um número de solicitação único
      const numeroSolicitacao =
        new Date().getFullYear() +
        String(Math.floor(Math.random() * 10000)).padStart(5, '0');

      // Gerar data de solicitação (entre 1 e 90 dias atrás)
      const diasAtras = Math.floor(Math.random() * 90) + 1;
      const dataSolicitacao = new Date();
      dataSolicitacao.setDate(dataSolicitacao.getDate() - diasAtras);

      // Gerar um valor de benefício (entre 100 e 1500)
      const valorBeneficio = Math.floor(Math.random() * 1400) + 100;

      // Selecionar origem da solicitação
      const origem = origens[Math.floor(Math.random() * origens.length)];

      // Inserir a solicitação
      try {
        const solicitacaoResult = await dataSource.query(
          `INSERT INTO solicitacao (
            numero,
            cidadao_id,
            tipo_beneficio_id,
            status,
            data_solicitacao,
            setor_atual_id,
            responsavel_id,
            valor_beneficio,
            origem_solicitacao,
            observacoes,
            dados_especificos
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
          RETURNING id`,
          [
            numeroSolicitacao,
            cidadao.id,
            tipoBeneficio.id,
            status,
            dataSolicitacao,
            setor.id,
            responsavel,
            valorBeneficio,
            origem,
            `Solicitação de teste para ${tipoBeneficio.nome}`,
            JSON.stringify({
              justificativa: 'Justificativa de teste para solicitação',
              prioridade: Math.random() > 0.7 ? 'alta' : 'normal',
              necessidades: 'Necessidades de teste',
            }),
          ],
        );

        const solicitacaoId = solicitacaoResult[0].id;
        console.log(
          `Solicitação ${numeroSolicitacao} criada para o cidadão ${cidadao.id}`,
        );

        // Criar histórico de status
        await this.criarHistoricoStatus(
          dataSource,
          solicitacaoId,
          status,
          responsavel,
        );

        // Criar dados específicos do benefício
        await this.criarDadosBeneficios(
          dataSource,
          solicitacaoId,
          tipoBeneficio,
        );

        // Se o status for "analise" ou "aprovado", criar uma avaliação
        if (status === 'analise' || status === 'aprovado') {
          await this.criarAvaliacao(dataSource, solicitacaoId, responsavel);
        }
      } catch (error) {
        console.error(
          `Erro ao criar solicitação para o cidadão ${cidadao.id}:`,
          error,
        );
      }
    }

    console.log('Seed de solicitações para desenvolvimento concluído');
  }

  private static async criarHistoricoStatus(
    dataSource: DataSource,
    solicitacaoId: string,
    status: string,
    usuarioId: string | null,
  ): Promise<void> {
    // Inserir o histórico de status inicial (pendente)
    await dataSource.query(
      `INSERT INTO historico_status_solicitacao (
        solicitacao_id,
        status,
        usuario_id,
        data_alteracao,
        observacao
      )
      VALUES ($1, $2, $3, $4, $5)`,
      [
        solicitacaoId,
        'pendente',
        usuarioId,
        new Date(new Date().getTime() - 86400000), // Um dia atrás
        'Status inicial da solicitação',
      ],
    );

    // Se o status atual for diferente de pendente, inserir mais um registro
    if (status !== 'pendente') {
      await dataSource.query(
        `INSERT INTO historico_status_solicitacao (
          solicitacao_id,
          status,
          usuario_id,
          data_alteracao,
          observacao
        )
        VALUES ($1, $2, $3, $4, $5)`,
        [
          solicitacaoId,
          status,
          usuarioId,
          new Date(), // Data atual
          `Alteração para status ${status}`,
        ],
      );
    }
  }

  private static async criarDadosBeneficios(
    dataSource: DataSource,
    solicitacaoId: string,
    tipoBeneficio: any,
  ): Promise<void> {
    // Método mantém o nome original para compatibilidade, mas trabalha com a entidade DadosSolicitacaoBeneficio
    // Inserir dados específicos do benefício
    await dataSource.query(
      `INSERT INTO dados_beneficios (
        solicitacao_id,
        tipo_beneficio,
        detalhes
      )
      VALUES ($1, $2, $3)`,
      [
        solicitacaoId,
        tipoBeneficio.nome.toLowerCase().replace(/\s+/g, '_'),
        JSON.stringify({
          detalhes_especificos: `Detalhes específicos para ${tipoBeneficio.nome}`,
          duracao_solicitada: Math.floor(Math.random() * 12) + 1, // Entre 1 e 12 meses
          motivo: 'Motivo de teste para solicitação',
        }),
      ],
    );
  }

  private static async criarAvaliacao(
    dataSource: DataSource,
    solicitacaoId: string,
    avaliadorId: string | null,
  ): Promise<void> {
    // Se não houver avaliador, não criar avaliação
    if (!avaliadorId) return;

    const tiposAvaliacao = ['tecnica', 'social'];
    const resultadosAvaliacao = ['aprovado', 'reprovado', 'pendente'];

    const tipoAvaliacao =
      tiposAvaliacao[Math.floor(Math.random() * tiposAvaliacao.length)];
    const resultadoAvaliacao =
      resultadosAvaliacao[
        Math.floor(Math.random() * resultadosAvaliacao.length)
      ];

    await dataSource.query(
      `INSERT INTO avaliacao_solicitacao (
        solicitacao_id,
        tipo_avaliacao,
        avaliador_id,
        data_avaliacao,
        resultado,
        parecer
      )
      VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        solicitacaoId,
        tipoAvaliacao,
        avaliadorId,
        new Date(),
        resultadoAvaliacao,
        `Parecer de avaliação ${tipoAvaliacao} para solicitação de teste. Resultado: ${resultadoAvaliacao}`,
      ],
    );
  }
}
