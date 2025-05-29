const fs = require('fs');
const path = require('path');

// Lista de arquivos que contêm createPermissionScope
const seedFiles = [
  'src/database/seeds/core/permission-notificacao.seed.ts',
  'src/database/seeds/core/permission-judicial.seed.ts',
  'src/database/seeds/core/permission-metricas.seed.ts',
  'src/database/seeds/core/permission-integrador.seed.ts',
  'src/database/seeds/core/permission-auditoria.seed.ts',
  'src/database/seeds/core/permission-relatorio.seed.ts',
  'src/database/seeds/core/permission-recurso.seed.ts',
  'src/database/seeds/core/permission-ocorrencia.seed.ts',
  'src/database/seeds/core/permission-configuracao.seed.ts',
  'src/database/seeds/core/permission-usuario.seed.ts',
  'src/database/seeds/core/permission-cidadao.seed.ts',
  'src/database/seeds/core/permission-pagamento.seed.ts',
  'src/database/seeds/core/permission-unidade.seed.ts',
  'src/database/seeds/core/permission-relatorios-unificado.seed.ts'
];

function fixPermissionScopeInFile(filePath) {
  try {
    console.log(`Corrigindo arquivo: ${filePath}`);
    
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Substituir where: { permissionId } por where: { permissao_id: permissionId }
    content = content.replace(
      /where:\s*{\s*permissionId\s*}/g,
      'where: { permissao_id: permissionId }'
    );
    
    // Substituir scope.permissionId = por scope.permissao_id =
    content = content.replace(
      /scope\.permissionId\s*=/g,
      'scope.permissao_id ='
    );
    
    // Substituir existingScope.permissionId = por existingScope.permissao_id =
    content = content.replace(
      /existingScope\.permissionId\s*=/g,
      'existingScope.permissao_id ='
    );
    
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✅ Arquivo ${filePath} corrigido com sucesso!`);
    
  } catch (error) {
    console.error(`❌ Erro ao corrigir arquivo ${filePath}:`, error.message);
  }
}

function main() {
  console.log('Iniciando correção dos arquivos de seed...');
  
  let correctedFiles = 0;
  let errorFiles = 0;
  
  seedFiles.forEach(file => {
    const fullPath = path.resolve(file);
    
    if (fs.existsSync(fullPath)) {
      try {
        fixPermissionScopeInFile(fullPath);
        correctedFiles++;
      } catch (error) {
        console.error(`❌ Erro ao processar ${file}:`, error.message);
        errorFiles++;
      }
    } else {
      console.warn(`⚠️  Arquivo não encontrado: ${file}`);
      errorFiles++;
    }
  });
  
  console.log('\n=== RESUMO ===');
  console.log(`✅ Arquivos corrigidos: ${correctedFiles}`);
  console.log(`❌ Arquivos com erro: ${errorFiles}`);
  console.log(`📁 Total de arquivos processados: ${seedFiles.length}`);
  
  if (errorFiles === 0) {
    console.log('\n🎉 Todos os arquivos foram corrigidos com sucesso!');
  } else {
    console.log('\n⚠️  Alguns arquivos apresentaram problemas. Verifique os logs acima.');
  }
}

main();