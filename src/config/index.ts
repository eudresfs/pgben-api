/**
 * Configuração centralizada da aplicação
 *
 * Este arquivo exporta todas as configurações da aplicação de forma centralizada,
 * facilitando o acesso e manutenção das configurações.
 */
import { databaseConfig } from './database.config';

export const config = {
  database: databaseConfig,
  // Outras configurações podem ser adicionadas aqui conforme necessário
};
