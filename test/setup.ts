// Configurações globais para os testes
import 'reflect-metadata';
import { config } from 'dotenv';
import { register } from 'tsconfig-paths';
import * as path from 'path';

// Carrega as variáveis de ambiente do arquivo .env
config({ path: '.env.test' });

// Configura os aliases do TypeScript
const tsConfig = require('../tsconfig.json');
const baseUrl = path.resolve(__dirname, '..');
const cleanup = register({
  baseUrl,
  paths: tsConfig.compilerOptions.paths,
});

// Garante que os aliases sejam limpos após os testes
if (process.env.TS_NODE_DEV === 'true') {
  process.on('beforeExit', () => {
    cleanup();
  });
}

// Configurações adicionais podem ser adicionadas aqui
// Por exemplo, mocks globais, configurações de timezone, etc.

// Configura o timezone para testes
process.env.TZ = 'UTC';
