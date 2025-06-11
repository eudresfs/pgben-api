import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * Carrega as chaves JWT usando estratégia híbrida:
 * 1. Prioriza chaves em Base64 (para Kubernetes/produção)
 * 2. Fallback para arquivos locais (para desenvolvimento)
 */
const loadJwtKeys = () => {
  try {
    // Tentar carregar chaves via Base64 primeiro (Kubernetes/produção)
    const publicKeyBase64 = process.env.JWT_PUBLIC_KEY_BASE64;
    const privateKeyBase64 = process.env.JWT_PRIVATE_KEY_BASE64;

    if (publicKeyBase64 && privateKeyBase64) {
      console.log('🔑 Carregando chaves JWT via Base64 (Kubernetes)');

      // Decodificar chaves Base64
      const publicKey = Buffer.from(publicKeyBase64, 'base64')
        .toString('utf8')
        .trim();
      const privateKey = Buffer.from(privateKeyBase64, 'base64')
        .toString('utf8')
        .trim();

      // Validar formato das chaves
      if (
        !publicKey.includes('BEGIN PUBLIC KEY') &&
        !publicKey.includes('BEGIN RSA PUBLIC KEY')
      ) {
        throw new Error('Formato inválido para chave pública Base64');
      }

      if (
        !privateKey.includes('BEGIN PRIVATE KEY') &&
        !privateKey.includes('BEGIN RSA PRIVATE KEY')
      ) {
        throw new Error('Formato inválido para chave privada Base64');
      }

      return {
        publicKey,
        privateKey,
      };
    }

    // Fallback: carregar via arquivos (desenvolvimento local)
    console.log(
      '📁 Carregando chaves JWT via arquivos locais (desenvolvimento)',
    );

    const publicKeyPath = process.env.JWT_PUBLIC_KEY_PATH;
    const privateKeyPath = process.env.JWT_PRIVATE_KEY_PATH;

    if (!publicKeyPath || !privateKeyPath) {
      throw new Error(
        'Chaves JWT não configuradas. Configure JWT_*_BASE64 (produção) ou JWT_*_PATH (desenvolvimento)',
      );
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
    console.error('❌ Falha ao carregar as chaves JWT:', error.message);
    console.error(
      '💡 Dica: Verifique se as variáveis JWT_*_BASE64 ou JWT_*_PATH estão configuradas',
    );
    throw new Error(
      `Falha ao carregar as chaves JWT: ${error.message}. Verifique a configuração das chaves.`,
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
