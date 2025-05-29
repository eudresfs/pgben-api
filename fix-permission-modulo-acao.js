const fs = require('fs');
const path = require('path');

// Lista de arquivos que precisam ser corrigidos
const filesToFix = [
  'src/database/seeds/core/permission-relatorio.seed.ts',
  'src/database/seeds/core/permission-configuracao.seed.ts',
  'src/database/seeds/core/permission-auditoria.seed.ts',
  'src/database/seeds/core/permission-documento.seed.ts',
  'src/database/seeds/core/permission-usuario.seed.ts'
];

function fixPermissionModuloAcao(filePath) {
  try {
    console.log(`🔧 Corrigindo arquivo: ${filePath}`);
    
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;
    
    // Padrão para encontrar a função createPermission
    const createPermissionPattern = /(permission\.nome = name;[\s\S]*?permission\.isComposite = isComposite;)/g;
    
    const replacement = `permission.nome = name;
    permission.description = description;
    permission.isComposite = isComposite;
    
    // Extrair módulo e ação do nome da permissão
    const parts = name.split('.');
    if (parts.length >= 1) {
      permission.modulo = parts[0];
    }
    if (parts.length >= 3) {
      permission.acao = parts[2];
    }`;
    
    if (createPermissionPattern.test(content)) {
      content = content.replace(createPermissionPattern, replacement);
      modified = true;
      console.log(`  ✅ Adicionados campos modulo e acao na função createPermission`);
    }
    
    // Padrão alternativo para casos onde a estrutura pode ser diferente
    const alternativePattern = /(permission\.nome = name;[\s\n]*permission\.description = description;[\s\n]*permission\.isComposite = isComposite;)/g;
    
    if (alternativePattern.test(content) && !modified) {
      content = content.replace(alternativePattern, replacement);
      modified = true;
      console.log(`  ✅ Adicionados campos modulo e acao (padrão alternativo)`);
    }
    
    if (modified) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`  💾 Arquivo salvo com correções`);
    } else {
      console.log(`  ℹ️  Nenhuma correção necessária ou padrão não encontrado`);
    }
    
    return { success: true, modified };
  } catch (error) {
    console.error(`❌ Erro ao corrigir arquivo ${filePath}:`, error.message);
    return { success: false, error: error.message };
  }
}

function main() {
  console.log('🚀 Iniciando correção para adicionar campos modulo e acao...');
  
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
    const result = fixPermissionModuloAcao(fullPath);
    
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