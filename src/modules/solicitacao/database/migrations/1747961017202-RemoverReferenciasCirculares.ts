import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration para remover referências circulares entre os módulos de benefício e solicitação
 * 
 * Esta migration implementa a migração de responsabilidades do módulo de benefício para o módulo
 * de solicitação, seguindo os princípios SOLID, DRY, YAGNI e KISS.
 */
export class RemoverReferenciasCirculares1747961017202 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Verificar se existem tabelas antigas que precisam ser migradas
    const solicitacaoBeneficioExists = await this.tableExists(queryRunner, 'solicitacao_beneficio');
    
    if (solicitacaoBeneficioExists) {
      // 2. Migrar dados da tabela solicitacao_beneficio para solicitacao
      await queryRunner.query(`
        INSERT INTO solicitacao (
          id, 
          tipo_beneficio_id, 
          beneficiario_id, 
          unidade_id, 
          status, 
          created_at, 
          updated_at, 
          created_by, 
          updated_by, 
          processo_judicial_id, 
          determinacao_judicial_id,
          determinacao_judicial_flag,
          renovacao_automatica,
          contador_renovacoes,
          data_proxima_renovacao,
          dados_dinamicos,
          versao_schema
        )
        SELECT 
          sb.id, 
          sb.tipo_beneficio_id, 
          sb.beneficiario_id, 
          sb.unidade_id, 
          CASE 
            WHEN sb.status = 'rascunho' THEN 'rascunho'
            WHEN sb.status = 'aberta' THEN 'pendente'
            WHEN sb.status = 'pendente' THEN 'pendente'
            WHEN sb.status = 'analise' THEN 'em_analise'
            WHEN sb.status = 'aprovada' THEN 'aprovada'
            WHEN sb.status = 'rejeitada' THEN 'reprovada'
            WHEN sb.status = 'liberada' THEN 'liberada'
            WHEN sb.status = 'cancelada' THEN 'cancelada'
            WHEN sb.status = 'em_processamento' THEN 'em_processamento'
            WHEN sb.status = 'concluida' THEN 'concluida'
            WHEN sb.status = 'arquivada' THEN 'arquivada'
            ELSE 'rascunho'
          END as status,
          sb.created_at, 
          sb.updated_at, 
          sb.created_by, 
          sb.updated_by, 
          sb.processo_judicial_id, 
          sb.determinacao_judicial_id,
          CASE WHEN sb.determinacao_judicial_id IS NOT NULL THEN true ELSE false END,
          sb.renovacao_automatica,
          sb.contador_renovacoes,
          sb.data_proxima_renovacao,
          sb.dados_dinamicos,
          sb.versao_schema
        FROM solicitacao_beneficio sb
        WHERE NOT EXISTS (
          SELECT 1 FROM solicitacao s WHERE s.id = sb.id
        )
        ON CONFLICT (id) DO NOTHING;
      `);

      // 3. Migrar histórico de solicitações
      const historicoSolicitacaoBeneficioExists = await this.tableExists(queryRunner, 'historico_solicitacao_beneficio');
      
      if (historicoSolicitacaoBeneficioExists) {
        await queryRunner.query(`
          INSERT INTO historico_solicitacao (
            id,
            solicitacao_id,
            status_anterior,
            status_atual,
            usuario_id,
            observacao,
            dados_alterados,
            ip_usuario,
            created_at
          )
          SELECT 
            hsb.id,
            hsb.solicitacao_id,
            CASE 
              WHEN hsb.status_anterior = 'rascunho' THEN 'rascunho'
              WHEN hsb.status_anterior = 'aberta' THEN 'pendente'
              WHEN hsb.status_anterior = 'pendente' THEN 'pendente'
              WHEN hsb.status_anterior = 'analise' THEN 'em_analise'
              WHEN hsb.status_anterior = 'aprovada' THEN 'aprovada'
              WHEN hsb.status_anterior = 'rejeitada' THEN 'reprovada'
              WHEN hsb.status_anterior = 'liberada' THEN 'liberada'
              WHEN hsb.status_anterior = 'cancelada' THEN 'cancelada'
              WHEN hsb.status_anterior = 'em_processamento' THEN 'em_processamento'
              WHEN hsb.status_anterior = 'concluida' THEN 'concluida'
              WHEN hsb.status_anterior = 'arquivada' THEN 'arquivada'
              ELSE 'rascunho'
            END as status_anterior,
            CASE 
              WHEN hsb.status_novo = 'rascunho' THEN 'rascunho'
              WHEN hsb.status_novo = 'aberta' THEN 'pendente'
              WHEN hsb.status_novo = 'pendente' THEN 'pendente'
              WHEN hsb.status_novo = 'analise' THEN 'em_analise'
              WHEN hsb.status_novo = 'aprovada' THEN 'aprovada'
              WHEN hsb.status_novo = 'rejeitada' THEN 'reprovada'
              WHEN hsb.status_novo = 'liberada' THEN 'liberada'
              WHEN hsb.status_novo = 'cancelada' THEN 'cancelada'
              WHEN hsb.status_novo = 'em_processamento' THEN 'em_processamento'
              WHEN hsb.status_novo = 'concluida' THEN 'concluida'
              WHEN hsb.status_novo = 'arquivada' THEN 'arquivada'
              ELSE 'rascunho'
            END as status_atual,
            hsb.usuario_id,
            hsb.observacao,
            hsb.dados_alterados,
            hsb.ip_usuario,
            hsb.created_at
          FROM historico_solicitacao_beneficio hsb
          WHERE NOT EXISTS (
            SELECT 1 FROM historico_solicitacao hs WHERE hs.id = hsb.id
          )
          ON CONFLICT (id) DO NOTHING;
        `);
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Esta migration não pode ser revertida de forma segura
    console.warn('Esta migration não pode ser revertida de forma segura. Os dados já foram migrados.');
  }

  private async tableExists(queryRunner: QueryRunner, tableName: string): Promise<boolean> {
    const result = await queryRunner.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = '${tableName}'
      );
    `);
    return result[0].exists;
  }
}
