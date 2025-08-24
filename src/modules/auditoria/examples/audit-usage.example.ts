/**
 * Exemplo básico de uso do Módulo de Auditoria
 */

import { Module } from '@nestjs/common';
import { AuditoriaModule } from '../auditoria.module';

// Exemplo simples de configuração do módulo
@Module({
  imports: [AuditoriaModule],
})
export class ExampleAppModule {}
