const fs = require('fs');
const path = require('path');

const migrationsDir = path.resolve(__dirname, '.');

fs.readdirSync(migrationsDir).forEach((file) => {
  if (!file.endsWith('.ts')) return;

  const filePath = path.join(migrationsDir, file);
  const content = fs.readFileSync(filePath, 'utf-8');

  const classNameMatch = content.match(/export class (\w+) implements MigrationInterface/);
  if (!classNameMatch) {
    console.log(`⚠️  Ignorado: ${file} (sem classe de migration)`);
    return;
  }

  const originalClassName = classNameMatch[1];
  const baseName = originalClassName.replace(/\d+$/, ''); // remove timestamp antigo
  const timestamp = Date.now().toString();

  const newClassName = `${baseName}${timestamp}`;
  const newFileName = `${newClassName}.ts`;
  const newFilePath = path.join(migrationsDir, newFileName);

  const newContent = content
    .replace(new RegExp(`export class ${originalClassName}`), `export class ${newClassName}`)
    .replace(/name\s*=\s*['"`]\w+['"`]/, `name = '${newClassName}'`);

  fs.writeFileSync(newFilePath, newContent);
  fs.unlinkSync(filePath);

  console.log(`✅ Renomeado: ${file} → ${newFileName}`);
});
