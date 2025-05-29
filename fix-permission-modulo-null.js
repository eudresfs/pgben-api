const fs = require('fs');
const path = require('path');

// Arquivos de seed que precisam ser corrigidos
const seedFiles = [
  'src/database/seeds/core/permission-usuario.seed.ts'
];

function fixPermissionModuloLogic(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;

    // Padrão: Corrigir módulo null para ter um valor padrão
    const pattern1 = /permission\.modulo = parts\.length > 0 \? parts\[0\] : null;/g;
    if (pattern1.test(content)) {
      content = content.replace(
        pattern1,
        `permission.modulo = parts.length > 0 ? parts[0] : 'sistema';`
      );
      modified = true;
      console.log(`Corrigido módulo null em ${filePath}`);
    }

    // Padrão adicional: qualquer atribuição de null para módulo
    const pattern2 = /permission\.modulo = null;/g;
    if (pattern2.test(content)) {
      content = content.replace(
        pattern2,
        `permission.modulo = 'sistema';`
      );
      modified = true;
      console.log(`Corrigido atribuição direta null para módulo em ${filePath}`);
    }

    if (modified) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`✅ Arquivo ${filePath} salvo com sucesso`);
    } else {
      console.log(`ℹ️  Nenhuma alteração necessária em ${filePath}`);
    }

  } catch (error) {
    console.error(`❌ Erro ao processar ${filePath}:`, error.message);
  }
}

console.log('🔧 Iniciando correção da lógica de módulo nas permissões...');

seedFiles.forEach(file => {
  const fullPath = path.resolve(file);
  if (fs.existsSync(fullPath)) {
    console.log(`\n📝 Processando: ${file}`);
    fixPermissionModuloLogic(fullPath);
  } else {
    console.log(`⚠️  Arquivo não encontrado: ${file}`);
  }
});

console.log('\n✨ Correção da lógica de módulo concluída!');