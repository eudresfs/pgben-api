import { ConfigModuleOptions } from '@nestjs/config/dist/interfaces';
import * as Joi from 'joi';

import configuration from './configuration';

export const configModuleOptions: ConfigModuleOptions = {
  envFilePath: '.env',
  load: [configuration],
  validationSchema: Joi.object({
    APP_ENV: Joi.string()
      .valid('development', 'production', 'test')
      .default('development'),
    APP_PORT: Joi.number().required(),
    DB_HOST: Joi.string().required(),
    DB_PORT: Joi.number().optional(),
    DB_NAME: Joi.string().required(),
    DB_USER: Joi.string().required(),
    DB_PASS: Joi.string().required(),
    JWT_SECRET: Joi.string().required(),
    JWT_REFRESH_SECRET: Joi.string().required(),
    JWT_ACCESS_TOKEN_EXPIRES_IN: Joi.string().required(),
    JWT_REFRESH_TOKEN_EXPIRES_IN: Joi.string().required(),
    // Chaves JWT - opcionais pois suportamos estratégia híbrida (Base64 ou arquivos)
    JWT_PRIVATE_KEY_PATH: Joi.string().optional(),
    JWT_PUBLIC_KEY_PATH: Joi.string().optional(),
    JWT_PRIVATE_KEY_BASE64: Joi.string().optional(),
    JWT_PUBLIC_KEY_BASE64: Joi.string().optional(),
  }),
};
