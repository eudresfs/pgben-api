import { DataSource } from 'typeorm';

/**
 * Seed para criação das unidades essenciais do sistema
 *
 * Este seed cria as unidades básicas necessárias para o funcionamento
 * do sistema de benefícios sociais
 */
export class UnidadeSeed {
  public static async run(dataSource: DataSource): Promise<void> {
    console.log('Iniciando seed de unidades essenciais');

    // Lista de unidades básicas para o funcionamento do sistema
    const unidadesEssenciais = [
      {
        nome: 'Sede Administrativa',
        codigo: 'SEDE',
        endereco: 'Av. Principal, 1000, Centro',
        telefone: '(00) 0000-0000',
        email: 'sede@pgben.gov.br',
        responsavel: 'Coordenador Geral',
        tipo: 'administrativa',
        ativo: true,
      },
      {
        nome: 'CRAS Central',
        codigo: 'CRAS01',
        endereco: 'Rua das Flores, 123, Centro',
        telefone: '(00) 0000-0001',
        email: 'cras.central@pgben.gov.br',
        responsavel: 'Coordenador CRAS',
        tipo: 'cras',
        ativo: true,
      },
      {
        nome: 'CREAS Regional',
        codigo: 'CREAS01',
        endereco: 'Av. dos Direitos, 456, Centro',
        telefone: '(00) 0000-0002',
        email: 'creas.regional@pgben.gov.br',
        responsavel: 'Coordenador CREAS',
        tipo: 'creas',
        ativo: true,
      },
      {
        nome: 'Centro de Referência',
        codigo: 'CR01',
        endereco: 'Rua da Cidadania, 789, Zona Norte',
        telefone: '(00) 0000-0003',
        email: 'centro.referencia@pgben.gov.br',
        responsavel: 'Coordenador CR',
        tipo: 'centro_referencia',
        ativo: true,
      },
    ];

    // Inserção de unidades no banco de dados
    for (const unidade of unidadesEssenciais) {
      const unidadeExistente = await dataSource.query(
        `SELECT id FROM unidade WHERE codigo = $1`,
        [unidade.codigo],
      );

      if (unidadeExistente.length === 0) {
        await dataSource.query(
          `INSERT INTO unidade (nome, codigo, endereco, telefone, email, responsavel, tipo, ativo)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [
            unidade.nome,
            unidade.codigo,
            unidade.endereco,
            unidade.telefone,
            unidade.email,
            unidade.responsavel,
            unidade.tipo,
            unidade.ativo,
          ],
        );
        console.log(`Unidade ${unidade.nome} criada com sucesso`);
      } else {
        console.log(`Unidade ${unidade.nome} já existe, atualizando...`);
        await dataSource.query(
          `UPDATE unidade 
           SET nome = $1, endereco = $3, telefone = $4, email = $5, responsavel = $6, tipo = $7, ativo = $8
           WHERE codigo = $2`,
          [
            unidade.nome,
            unidade.codigo,
            unidade.endereco,
            unidade.telefone,
            unidade.email,
            unidade.responsavel,
            unidade.tipo,
            unidade.ativo,
          ],
        );
      }
    }

    console.log('Seed de unidades essenciais concluído');
  }
}
