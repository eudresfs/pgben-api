const fs = require('fs');
const path = require('path');

// Lista de arquivos que precisam ser corrigidos
const filesToFix = [
  'src/database/seeds/core/permission-relatorio.seed.ts',
  'src/database/seeds/core/permission-configuracao.seed.ts',
  'src/database/seeds/core/permission-auditoria.seed.ts',
  'src/database/seeds/core/permission-documento.seed.ts'
];

function fixPermissionNameProperty(filePath) {
  try {
    console.log(`🔧 Corrigindo arquivo: ${filePath}`);
    
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;
    
    // Corrigir findOne({ where: { name } }) para findOne({ where: { nome: name } })
    const findOnePattern = /findOne\(\{\s*where:\s*\{\s*name\s*\}\s*\}\)/g;
    if (findOnePattern.test(content)) {
      content = content.replace(findOnePattern, 'findOne({ where: { nome: name } })');
      modified = true;
      console.log(`  ✅ Corrigido findOne pattern`);
    }
    
    // Corrigir outras variações do padrão
    const findOnePattern2 = /findOne\(\{\s*where:\s*\{\s*name\s*\}\s*\}\)/g;
    if (findOnePattern2.test(content)) {
      content = content.replace(findOnePattern2, 'findOne({ where: { nome: name } })');
      modified = true;
      console.log(`  ✅ Corrigido findOne pattern 2`);
    }
    
    // Verificar se há outras ocorrências problemáticas
    const problematicPatterns = [
      /where:\s*\{\s*name\s*:/g,
      /\{\s*name\s*\}/g
    ];
    
    problematicPatterns.forEach((pattern, index) => {
      if (pattern.test(content)) {
        console.log(`  ⚠️  Padrão problemático ${index + 1} encontrado, pode precisar de correção manual`);
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
  console.log('🚀 Iniciando correção de propriedades name -> nome nos seeds...');
  
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
    const result = fixPermissionNameProperty(fullPath);
    
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