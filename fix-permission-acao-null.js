const fs = require('fs');
const path = require('path');

// Arquivos de seed que precisam ser corrigidos
const seedFiles = [
  'src/database/seeds/core/permission-documento.seed.ts',
  'src/database/seeds/core/permission-auditoria.seed.ts',
  'src/database/seeds/core/permission-relatorio.seed.ts',
  'src/database/seeds/core/permission-configuracao.seed.ts'
];

function fixPermissionAcaoLogic(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;

    // Padrão 1: Corrigir parts[2] para parts.length > 1 ? parts.slice(1).join('.') : 'default'
    const pattern1 = /if \(parts\.length >= 3\) {\s*permission\.acao = parts\[2\];\s*}/g;
    if (pattern1.test(content)) {
      content = content.replace(
        pattern1,
        `if (parts.length > 1) {
      permission.acao = parts.slice(1).join('.');
    } else {
      permission.acao = 'default';
    }`
      );
      modified = true;
      console.log(`Corrigido padrão parts[2] em ${filePath}`);
    }

    // Padrão 2: Corrigir atribuição direta parts[2]
    const pattern2 = /permission\.acao = parts\[2\];/g;
    if (pattern2.test(content)) {
      content = content.replace(
        pattern2,
        `permission.acao = parts.length > 1 ? parts.slice(1).join('.') : 'default';`
      );
      modified = true;
      console.log(`Corrigido atribuição direta parts[2] em ${filePath}`);
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

console.log('🔧 Iniciando correção da lógica de ação nas permissões...');

seedFiles.forEach(file => {
  const fullPath = path.resolve(file);
  if (fs.existsSync(fullPath)) {
    console.log(`\n📝 Processando: ${file}`);
    fixPermissionAcaoLogic(fullPath);
  } else {
    console.log(`⚠️  Arquivo não encontrado: ${file}`);
  }
});

console.log('\n✨ Correção da lógica de ação concluída!');