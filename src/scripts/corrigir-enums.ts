/**
 * Script para corrigir definições de enums em entidades TypeORM
 * 
 * Este script percorre todas as entidades com colunas do tipo 'enum' e 
 * adiciona a propriedade 'enumName' quando ela estiver ausente.
 */
import * as fs from 'fs';
import * as path from 'path';

// Função para listar todos os arquivos de entidades recursivamente
function listarArquivosEntidade(diretorio: string): string[] {
  let arquivos: string[] = [];
  const itens = fs.readdirSync(diretorio);
  
  for (const item of itens) {
    const caminhoCompleto = path.join(diretorio, item);
    const stat = fs.statSync(caminhoCompleto);
    
    if (stat.isDirectory()) {
      arquivos = arquivos.concat(listarArquivosEntidade(caminhoCompleto));
    } else if (item.endsWith('.entity.ts')) {
      arquivos.push(caminhoCompleto);
    }
  }
  
  return arquivos;
}

// Encontrar todos os arquivos de entidades
const entityFiles = listarArquivosEntidade(path.join(process.cwd(), 'src'));
console.log(`Encontrados ${entityFiles.length} arquivos de entidades.`);

let totalCorrecoes = 0;

// Expressão regular para encontrar colunas do tipo enum sem enumName
const enumRegex = /@Column\(\s*{\s*(?:[^}]*,)?\s*type:\s*['"]enum['"]\s*,\s*(?:[^}]*,)?\s*enum:\s*([A-Za-z0-9_]+)\s*,(?!\s*enumName:)/g;

// Processar cada arquivo
entityFiles.forEach(file => {
  const content = fs.readFileSync(file, 'utf8');
  
  // Verificar se existem definições de enum sem enumName
  const matches = content.match(enumRegex);
  if (!matches) return;
  
  console.log(`\nCorrigindo ${path.basename(file)}:`);
  
  // Para cada ocorrência, adicionar enumName
  let updatedContent = content;
  let matchCount = 0;
  
  // Para cada match, extrair o nome do enum e adicionar enumName
  let match;
  const tempRegex = new RegExp(enumRegex);
  
  while ((match = tempRegex.exec(content)) !== null) {
    const enumName = match[1]; // Nome da variável enum
    const matchedText = match[0];
    
    // Gerar nome para o enum (convertendo de PascalCase para snake_case)
    let enumNameValue = enumName.replace(/([A-Z])/g, '_$1').toLowerCase();
    if (enumNameValue.startsWith('_')) {
      enumNameValue = enumNameValue.substring(1);
    }
    
    // Criar o texto de substituição com enumName
    const replacement = matchedText.replace(
      /enum:\s*([A-Za-z0-9_]+)\s*,/,
      `enum: $1,\n    enumName: '${enumNameValue}',`
    );
    
    updatedContent = updatedContent.replace(matchedText, replacement);
    matchCount++;
  }
  
  if (matchCount > 0) {
    // Salvar as alterações no arquivo
    fs.writeFileSync(file, updatedContent);
    console.log(`  Corrigidas ${matchCount} ocorrências de enum sem enumName`);
    totalCorrecoes += matchCount;
  }
});

console.log(`\nProcesso concluído. Total de correções: ${totalCorrecoes}`);
