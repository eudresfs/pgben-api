import { SetMetadata } from '@nestjs/common';

/**
 * Decorator para pular a verificação de blacklist de IP
 * Usado em endpoints que devem ser acessíveis mesmo para IPs suspeitos
 * (ex: endpoints de saúde, documentação pública)
 */
export const SkipIpBlacklist = () => SetMetadata('skipIpBlacklist', true);
