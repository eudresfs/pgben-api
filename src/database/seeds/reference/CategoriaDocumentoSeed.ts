import { DataSource } from 'typeorm';

/**
 * Seed para criação das categorias de documentos de referência
 *
 * Este seed cria as categorias de documentos básicas para o sistema
 */
export class CategoriaDocumentoSeed {
  public static async run(dataSource: DataSource): Promise<void> {
    console.log('🌱 Iniciando seed de categorias de documentos de referência');

    // Lista de categorias de documentos de referência
    const categoriasDocumentos = [
      {
        nome: 'Documentos Pessoais',
        descricao: 'Documentos de identificação pessoal',
        ordem: 1,
        ativo: true,
      },
      {
        nome: 'Documentos de Renda',
        descricao: 'Documentos que comprovam renda',
        ordem: 2,
        ativo: true,
      },
      {
        nome: 'Documentos de Residência',
        descricao: 'Documentos que comprovam residência',
        ordem: 3,
        ativo: true,
      },
      {
        nome: 'Documentos de Saúde',
        descricao: 'Documentos médicos e de saúde',
        ordem: 4,
        ativo: true,
      },
      {
        nome: 'Documentos de Benefícios',
        descricao: 'Documentos relacionados a outros benefícios',
        ordem: 5,
        ativo: true,
      },
      {
        nome: 'Declarações',
        descricao: 'Autodeclarações e declarações de terceiros',
        ordem: 6,
        ativo: true,
      },
      {
        nome: 'Comprovantes',
        descricao: 'Comprovantes diversos',
        ordem: 7,
        ativo: true,
      },
      {
        nome: 'Formulários',
        descricao: 'Formulários do sistema',
        ordem: 8,
        ativo: true,
      },
    ];

    let categoriasProcessadas = 0;
    let categoriasCriadas = 0;
    let categoriasAtualizadas = 0;
    let erros = 0;

    console.log(`📊 Total de categorias para processar: ${categoriasDocumentos.length}`);

    // Inserção das categorias de documentos no banco de dados
    for (const categoria of categoriasDocumentos) {
      try {
        // Validação básica dos dados
        if (!categoria.nome || !categoria.descricao) {
          console.error(`❌ Erro: Categoria com dados inválidos - Nome: ${categoria.nome}, Descrição: ${categoria.descricao}`);
          erros++;
          continue;
        }

        const categoriaExistente = await dataSource.query(
          `SELECT id FROM categoria_documento WHERE nome = $1`,
          [categoria.nome],
        );

        if (categoriaExistente.length === 0) {
          await dataSource.query(
            `INSERT INTO categoria_documento (nome, descricao, ordem, ativo)
             VALUES ($1, $2, $3, $4)`,
            [
              categoria.nome,
              categoria.descricao,
              categoria.ordem,
              categoria.ativo,
            ],
          );
          console.log(`✅ Categoria '${categoria.nome}' criada com sucesso`);
          categoriasCriadas++;
        } else {
          await dataSource.query(
            `UPDATE categoria_documento 
             SET descricao = $2, ordem = $3, ativo = $4
             WHERE nome = $1`,
            [
              categoria.nome,
              categoria.descricao,
              categoria.ordem,
              categoria.ativo,
            ],
          );
          console.log(`🔄 Categoria '${categoria.nome}' atualizada com sucesso`);
          categoriasAtualizadas++;
        }
        
        categoriasProcessadas++;
      } catch (error) {
        console.error(`❌ Erro ao processar categoria '${categoria.nome}':`, error.message);
        erros++;
      }
    }

    // Relatório final
    console.log('📈 Relatório de execução:');
    console.log(`   • Categorias processadas: ${categoriasProcessadas}/${categoriasDocumentos.length}`);
    console.log(`   • Categorias criadas: ${categoriasCriadas}`);
    console.log(`   • Categorias atualizadas: ${categoriasAtualizadas}`);
    console.log(`   • Erros encontrados: ${erros}`);
    
    if (erros > 0) {
      console.warn(`⚠️  Seed concluído com ${erros} erro(s)`);
    } else {
      console.log('✅ Seed de categorias de documentos de referência concluído com sucesso!');
    }
  }
}
