import { Module } from '@nestjs/common';
import { DebugController } from './debug.controller';

/**
 * Módulo de diagnóstico para testes de roteamento
 * Este módulo é usado temporariamente para isolar problemas de roteamento
 */
@Module({
  controllers: [DebugController],
  providers: [],
})
export class DebugModule {}
