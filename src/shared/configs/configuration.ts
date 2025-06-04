import { readFileSync } from 'fs';
import { join } from 'path';

const loadJwtKeys = () => {
  try {
    const publicKeyPath = process.env.JWT_PUBLIC_KEY_PATH;
    const privateKeyPath = process.env.JWT_PRIVATE_KEY_PATH;

    if (!publicKeyPath || !privateKeyPath) {
      throw new Error('Caminhos das chaves JWT não configurados');
    }

    // Obter o caminho absoluto para as chaves
    const projectRoot = process.cwd();
    const fullPublicKeyPath = join(projectRoot, publicKeyPath);
    const fullPrivateKeyPath = join(projectRoot, privateKeyPath);

    // Ler as chaves dos arquivos
    const publicKey = readFileSync(fullPublicKeyPath, 'utf8').trim();
    const privateKey = readFileSync(fullPrivateKeyPath, 'utf8').trim();

    // Validar formato das chaves
    if (
      !publicKey.includes('BEGIN PUBLIC KEY') &&
      !publicKey.includes('BEGIN RSA PUBLIC KEY')
    ) {
      throw new Error('Formato inválido para chave pública');
    }

    if (
      !privateKey.includes('BEGIN PRIVATE KEY') &&
      !privateKey.includes('BEGIN RSA PRIVATE KEY')
    ) {
      throw new Error('Formato inválido para chave privada');
    }

    return {
      publicKey,
      privateKey,
    };
  } catch (error) {
    console.error('Falha ao carregar as chaves JWT:', error);
    throw new Error(
      `Falha ao carregar as chaves JWT: ${error.message}. Verifique se os caminhos estão corretos e as permissões de leitura.`,
    );
  }
};

export default (): any => {
  const jwtKeys = loadJwtKeys();

  return {
    env: process.env.APP_ENV,
    port: process.env.APP_PORT,
    database: {
      host: process.env.DB_HOST,
      port: process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : undefined,
      name: process.env.DB_NAME,
      user: process.env.DB_USER,
      pass: process.env.DB_PASS,
    },
    jwt: {
      ...jwtKeys,
      accessTokenExpiresInSec: parseInt(
        process.env.JWT_ACCESS_TOKEN_EXP_IN_SEC || '3600',
        10,
      ),
      refreshTokenExpiresInSec: parseInt(
        process.env.JWT_REFRESH_TOKEN_EXP_IN_SEC || '604800',
        10,
      ),
    },
    defaultAdminUserPassword:
      process.env.DEFAULT_ADMIN_USER_PASSWORD || 'admin',
  };
};
