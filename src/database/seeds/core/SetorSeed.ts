import { DataSource } from 'typeorm';

/**
 * Seed para criação dos setores essenciais do sistema
 *
 * Este seed cria os setores básicos necessários para o fluxo de trabalho
 * do sistema de benefícios sociais
 */
export class SetorSeed {
  public static async run(dataSource: DataSource): Promise<void> {
    console.log('Iniciando seed de setores essenciais');

    // Lista de setores básicos para o funcionamento do sistema
    const setoresEssenciais = [
      {
        nome: 'Cadastro Único',
        sigla: 'CADUN',
        descricao: 'Setor responsável pelo cadastro de cidadãos e famílias',
        ativo: true,
      },
      {
        nome: 'Assistência Social',
        sigla: 'ASSSOC',
        descricao: 'Setor responsável pela avaliação social das solicitações',
        ativo: true,
      },
      {
        nome: 'Análise Técnica',
        sigla: 'ANTEC',
        descricao: 'Setor responsável pela análise técnica das solicitações',
        ativo: true,
      },
      {
        nome: 'Diretoria de Benefícios',
        sigla: 'DIRBEN',
        descricao: 'Diretoria responsável pela aprovação final de benefícios',
        ativo: true,
      },
      {
        nome: 'Financeiro',
        sigla: 'FINAN',
        descricao:
          'Setor responsável pelo pagamento e gestão financeira dos benefícios',
        ativo: true,
      },
      {
        nome: 'Ouvidoria',
        sigla: 'OUVID',
        descricao:
          'Setor responsável pelo atendimento de reclamações e sugestões',
        ativo: true,
      },
    ];

    // Inserção de setores no banco de dados
    for (const setor of setoresEssenciais) {
      const setorExistente = await dataSource.query(
        `SELECT id FROM setor WHERE sigla = $1`,
        [setor.sigla],
      );

      if (setorExistente.length === 0) {
        await dataSource.query(
          `INSERT INTO setor (nome, sigla, descricao, ativo)
           VALUES ($1, $2, $3, $4)`,
          [setor.nome, setor.sigla, setor.descricao, setor.ativo],
        );
        console.log(`Setor ${setor.nome} criado com sucesso`);
      } else {
        console.log(`Setor ${setor.nome} já existe, atualizando...`);
        await dataSource.query(
          `UPDATE setor 
           SET nome = $1, descricao = $3, ativo = $4
           WHERE sigla = $2`,
          [setor.nome, setor.sigla, setor.descricao, setor.ativo],
        );
      }
    }

    console.log('Seed de setores essenciais concluído');
  }
}
