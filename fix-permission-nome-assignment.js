const fs = require('fs');
const path = require('path');

// Lista de arquivos que precisam ser corrigidos
const filesToFix = [
  'src/database/seeds/core/permission-relatorio.seed.ts',
  'src/database/seeds/core/permission-configuracao.seed.ts',
  'src/database/seeds/core/permission-auditoria.seed.ts',
  'src/database/seeds/core/permission-documento.seed.ts'
];

function fixPermissionNomeAssignment(filePath) {
  try {
    console.log(`🔧 Corrigindo arquivo: ${filePath}`);
    
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;
    
    // Corrigir permission.name = name para permission.nome = name
    const assignmentPattern = /permission\.name\s*=\s*name/g;
    if (assignmentPattern.test(content)) {
      content = content.replace(assignmentPattern, 'permission.nome = name');
      modified = true;
      console.log(`  ✅ Corrigido assignment pattern: permission.name = name -> permission.nome = name`);
    }
    
    // Verificar se há outras variações
    const variations = [
      { pattern: /permission\["name"\]\s*=\s*name/g, replacement: 'permission["nome"] = name' },
      { pattern: /permission\['name'\]\s*=\s*name/g, replacement: 'permission["nome"] = name' }
    ];
    
    variations.forEach((variation, index) => {
      if (variation.pattern.test(content)) {
        content = content.replace(variation.pattern, variation.replacement);
        modified = true;
        console.log(`  ✅ Corrigido variação ${index + 1}`);
      }
    });
    
    if (modified) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`  💾 Arquivo salvo com correções`);
    } else {
      console.log(`  ℹ️  Nenhuma correção necessária`);
    }
    
    return { success: true, modified };
  } catch (error) {
    console.error(`❌ Erro ao corrigir arquivo ${filePath}:`, error.message);
    return { success: false, error: error.message };
  }
}

function main() {
  console.log('🚀 Iniciando correção de assignments permission.name -> permission.nome...');
  
  let totalFiles = 0;
  let modifiedFiles = 0;
  let errorFiles = 0;
  
  filesToFix.forEach(file => {
    const fullPath = path.resolve(file);
    
    if (!fs.existsSync(fullPath)) {
      console.log(`⚠️  Arquivo não encontrado: ${file}`);
      return;
    }
    
    totalFiles++;
    const result = fixPermissionNomeAssignment(fullPath);
    
    if (result.success) {
      if (result.modified) {
        modifiedFiles++;
      }
    } else {
      errorFiles++;
    }
  });
  
  console.log('\n📊 Resumo:');
  console.log(`📁 Total de arquivos processados: ${totalFiles}`);
  console.log(`✅ Arquivos modificados: ${modifiedFiles}`);
  console.log(`❌ Arquivos com erro: ${errorFiles}`);
  
  if (errorFiles === 0) {
    console.log('\n🎉 Todas as correções foram aplicadas com sucesso!');
  } else {
    console.log('\n⚠️  Alguns arquivos tiveram problemas. Verifique os logs acima.');
  }
}

main();