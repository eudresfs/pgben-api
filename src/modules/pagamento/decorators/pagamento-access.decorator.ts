import { SetMetadata } from '@nestjs/common';
import { PERFIS_KEY, UNIDADES_KEY } from '../guards/pagamento-access.guard';

/**
 * Decorador para definir perfis permitidos para acessar um endpoint
 * 
 * @param perfis Lista de perfis permitidos
 * @returns Decorador para aplicar em controllers ou métodos
 * 
 * @example
 * @PerfisPermitidos('admin', 'operador')
 * async findAll() { ... }
 */
export const PerfisPermitidos = (...perfis: string[]) => SetMetadata(PERFIS_KEY, perfis);

/**
 * Decorador para definir se deve verificar a unidade do usuário
 * 
 * @param verificar Se deve verificar a unidade
 * @returns Decorador para aplicar em controllers ou métodos
 * 
 * @example
 * @VerificarUnidade(true)
 * async findOne(@Param('id') id: string) { ... }
 */
export const VerificarUnidade = (verificar: boolean = true) => SetMetadata(UNIDADES_KEY, verificar);

/**
 * Decorador para definir acesso apenas para administradores
 * 
 * @returns Decorador para aplicar em controllers ou métodos
 * 
 * @example
 * @ApenasAdmin()
 * async remove(@Param('id') id: string) { ... }
 */
export const ApenasAdmin = () => PerfisPermitidos('admin', 'super_admin');

/**
 * Decorador para definir acesso apenas para operadores e administradores
 * 
 * @returns Decorador para aplicar em controllers ou métodos
 * 
 * @example
 * @OperadorOuAdmin()
 * async update(@Param('id') id: string, @Body() updateDto: UpdateDto) { ... }
 */
export const OperadorOuAdmin = () => PerfisPermitidos('operador', 'admin', 'super_admin');

/**
 * Decorador para definir acesso apenas para auditores e administradores
 * 
 * @returns Decorador para aplicar em controllers ou métodos
 * 
 * @example
 * @AuditorOuAdmin()
 * async getLogs() { ... }
 */
export const AuditorOuAdmin = () => PerfisPermitidos('auditor', 'admin', 'super_admin');
