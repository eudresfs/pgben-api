// Exportar apenas o que é necessário para uso externo

// Decorators
export { Public, IS_PUBLIC_KEY } from './decorators/public.decorator';
export { Roles, ROLES_KEY } from './decorators/role.decorator';

// Guards
export { JwtAuthGuard } from './guards/jwt-auth.guard';
export { RolesGuard } from './guards/roles.guard';

// Services
export { AuthService } from './services/auth.service';

// DTOs
export { LoginInput } from './dtos/auth-login-input.dto';
export { RegisterInput } from './dtos/auth-register-input.dto';
export { RegisterOutput } from './dtos/auth-register-output.dto';
export {
  AuthTokenOutput,
  UserAccessTokenClaims,
} from './dtos/auth-token-output.dto';

// Enums
export { Role } from '../shared/enums/role.enum';
