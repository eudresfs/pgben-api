import { Module } from '@nestjs/common';
import { ScheduleModule as NestScheduleModule } from '@nestjs/schedule';
import { Reflector } from '@nestjs/core';

/**
 * Módulo de agendamento personalizado
 *
 * Este módulo encapsula o ScheduleModule do NestJS e fornece o Reflector
 * como um provedor para resolver problemas de dependência.
 */
@Module({
  imports: [NestScheduleModule.forRoot()],
  providers: [Reflector],
  exports: [NestScheduleModule],
})
export class ScheduleCustomModule {}
