const loadJwtKeys = () => {
  try {
    const publicKeyBase64 = process.env.JWT_PUBLIC_KEY_BASE64;
    const privateKeyBase64 = process.env.JWT_PRIVATE_KEY_BASE64;

    if (!publicKeyBase64 || !privateKeyBase64) {
      throw new Error('JWT keys are not properly configured');
    }

    const publicKey = Buffer.from(publicKeyBase64, 'base64')
      .toString('utf8')
      .trim();
    const privateKey = Buffer.from(privateKeyBase64, 'base64')
      .toString('utf8')
      .trim();

    return {
      publicKey,
      privateKey,
    };
  } catch (error) {
    console.error('Failed to load JWT keys:', error);
    throw new Error(
      'Failed to load JWT keys. Please check your configuration.',
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
