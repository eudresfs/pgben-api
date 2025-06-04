import { DataSource } from 'typeorm';

/**
 * Seed para criação dos modelos de documentos de referência
 *
 * Este seed cria os modelos de documentos básicos para o sistema,
 * associados às categorias previamente criadas
 */
export class ModeloDocumentoSeed {
  public static async run(dataSource: DataSource): Promise<void> {
    console.log('🌱 Iniciando seed de modelos de documentos de referência');

    // Lista de modelos de documentos de referência
    const modelosDocumentos = [
      {
        titulo: 'Declaração de Residência',
        descricao:
          'Modelo de declaração de residência quando não há comprovante formal',
        categoria: 'Declarações',
        tipo: 'formulario',
        formato: 'docx',
        conteudo: 'template/declaracao_residencia.docx',
        ativo: true,
      },
      {
        titulo: 'Declaração de Renda',
        descricao: 'Modelo de declaração de renda para trabalho informal',
        categoria: 'Declarações',
        tipo: 'formulario',
        formato: 'docx',
        conteudo: 'template/declaracao_renda.docx',
        ativo: true,
      },
      {
        titulo: 'Formulário de Solicitação',
        descricao: 'Formulário para solicitação de benefício',
        categoria: 'Formulários',
        tipo: 'formulario',
        formato: 'docx',
        conteudo: 'template/formulario_solicitacao.docx',
        ativo: true,
      },
      {
        titulo: 'Relatório Social',
        descricao: 'Modelo de relatório para avaliação social',
        categoria: 'Formulários',
        tipo: 'relatorio',
        formato: 'docx',
        conteudo: 'template/relatorio_social.docx',
        ativo: true,
      },
      {
        titulo: 'Comprovante de Concessão',
        descricao: 'Comprovante de concessão de benefício',
        categoria: 'Comprovantes',
        tipo: 'comprovante',
        formato: 'docx',
        conteudo: 'template/comprovante_concessao.docx',
        ativo: true,
      },
      {
        titulo: 'Termo de Compromisso',
        descricao: 'Termo de compromisso para beneficiários',
        categoria: 'Formulários',
        tipo: 'termo',
        formato: 'docx',
        conteudo: 'template/termo_compromisso.docx',
        ativo: true,
      },
      {
        titulo: 'Parecer Técnico',
        descricao: 'Modelo de parecer técnico para análise de solicitação',
        categoria: 'Formulários',
        tipo: 'parecer',
        formato: 'docx',
        conteudo: 'template/parecer_tecnico.docx',
        ativo: true,
      },
    ];

    let modelosProcessados = 0;
    let modelosCriados = 0;
    let modelosAtualizados = 0;
    let modelosPulados = 0;
    let erros = 0;

    console.log(
      `📊 Total de modelos para processar: ${modelosDocumentos.length}`,
    );

    // Inserção dos modelos de documentos no banco de dados
    for (const modelo of modelosDocumentos) {
      try {
        // Validação básica dos dados
        if (!modelo.titulo || !modelo.descricao || !modelo.categoria) {
          console.error(
            `❌ Erro: Modelo com dados inválidos - Título: ${modelo.titulo}, Categoria: ${modelo.categoria}`,
          );
          erros++;
          continue;
        }

        // Buscar o ID da categoria pelo nome
        const categoriaResult = await dataSource.query(
          `SELECT id FROM categoria_documento WHERE nome = $1`,
          [modelo.categoria],
        );

        if (categoriaResult.length === 0) {
          console.warn(
            `⚠️  Categoria '${modelo.categoria}' não encontrada, pulando modelo '${modelo.titulo}'`,
          );
          modelosPulados++;
          continue;
        }

        const categoriaId = categoriaResult[0].id;

        const modeloExistente = await dataSource.query(
          `SELECT id FROM modelo_documento WHERE titulo = $1`,
          [modelo.titulo],
        );

        if (modeloExistente.length === 0) {
          await dataSource.query(
            `INSERT INTO modelo_documento (
              titulo, 
              descricao, 
              categoria_id, 
              tipo, 
              formato, 
              conteudo, 
              ativo
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [
              modelo.titulo,
              modelo.descricao,
              categoriaId,
              modelo.tipo,
              modelo.formato,
              modelo.conteudo,
              modelo.ativo,
            ],
          );
          console.log(`✅ Modelo '${modelo.titulo}' criado com sucesso`);
          modelosCriados++;
        } else {
          await dataSource.query(
            `UPDATE modelo_documento 
             SET descricao = $2, 
                 categoria_id = $3, 
                 tipo = $4, 
                 formato = $5, 
                 conteudo = $6, 
                 ativo = $7
             WHERE titulo = $1`,
            [
              modelo.titulo,
              modelo.descricao,
              categoriaId,
              modelo.tipo,
              modelo.formato,
              modelo.conteudo,
              modelo.ativo,
            ],
          );
          console.log(`🔄 Modelo '${modelo.titulo}' atualizado com sucesso`);
          modelosAtualizados++;
        }

        modelosProcessados++;
      } catch (error) {
        console.error(
          `❌ Erro ao processar modelo '${modelo.titulo}':`,
          error.message,
        );
        erros++;
      }
    }

    // Relatório final
    console.log('📈 Relatório de execução:');
    console.log(
      `   • Modelos processados: ${modelosProcessados}/${modelosDocumentos.length}`,
    );
    console.log(`   • Modelos criados: ${modelosCriados}`);
    console.log(`   • Modelos atualizados: ${modelosAtualizados}`);
    console.log(
      `   • Modelos pulados (categoria não encontrada): ${modelosPulados}`,
    );
    console.log(`   • Erros encontrados: ${erros}`);

    if (erros > 0 || modelosPulados > 0) {
      console.warn(
        `⚠️  Seed concluído com ${erros} erro(s) e ${modelosPulados} modelo(s) pulado(s)`,
      );
    } else {
      console.log(
        '✅ Seed de modelos de documentos de referência concluído com sucesso!',
      );
    }
  }
}
