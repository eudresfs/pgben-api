import { MigrationInterface, QueryRunner } from 'typeorm';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Migration para remover arquivos migrados do módulo de benefício
 * 
 * Esta migration implementa a limpeza dos arquivos que foram migrados do módulo de benefício
 * para o módulo de solicitação, seguindo os princípios SOLID, DRY, YAGNI e KISS.
 */
export class RemoverArquivosMigrados1747961017300 implements MigrationInterface {
  private readonly arquivosParaRemover = [
    // Controllers
    'controllers/solicitacao-beneficio.controller.ts',
    'controllers/workflow-solicitacao.controller.ts',
    
    // DTOs
    'dto/configurar-renovacao-solicitacao.dto.ts',
    'dto/create-solicitacao-beneficio.dto.ts',
    'dtos/update-status-solicitacao.dto.ts',
    
    // Entities
    'entities/historico-solicitacao.entity.ts',
    'entities/solicitacao-beneficio.entity.ts',
    
    // Services
    'services/workflow-solicitacao.service.ts',
  ];

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Esta migration não executa operações no banco de dados
    // Ela apenas registra os arquivos que devem ser removidos manualmente
    
    console.log('========== ARQUIVOS PARA REMOVER ==========');
    console.log('Os seguintes arquivos foram migrados para o módulo de solicitação e devem ser removidos:');
    
    const moduloPath = path.resolve(__dirname, '../../');
    
    for (const arquivo of this.arquivosParaRemover) {
      const arquivoPath = path.join(moduloPath, arquivo);
      console.log(`- ${arquivoPath}`);
      
      // Verificar se o arquivo existe
      if (fs.existsSync(arquivoPath)) {
        console.log(`  [EXISTE] Arquivo encontrado e deve ser removido`);
      } else {
        console.log(`  [NÃO EXISTE] Arquivo já foi removido ou não existe`);
      }
    }
    
    console.log('\nIMPORTANTE: Esta migration não remove automaticamente os arquivos.');
    console.log('Execute o seguinte comando para remover os arquivos:');
    console.log('\n```');
    
    for (const arquivo of this.arquivosParaRemover) {
      const arquivoPath = path.join(moduloPath, arquivo);
      console.log(`rm "${arquivoPath}"`);
    }
    
    console.log('```\n');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    console.log('Esta migration não pode ser revertida, pois não é possível restaurar arquivos excluídos automaticamente.');
  }
}
