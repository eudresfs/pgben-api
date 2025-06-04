// Exceções base
export { BaseApiException } from './base-api.exception';

// Exceções específicas
export { EntityNotFoundException } from './entity-not-found.exception';
export { ValidationErrorException } from './validation-error.exception';
export { InvalidOperationException } from './invalid-operation.exception';
export { ConfigurationErrorException } from './configuration-error.exception';

// Exceções de autenticação e autorização
export { PermissionDeniedException } from '../../auth/exceptions/permission-denied.exception';

// Exceções de parâmetros (já existentes)
export { ParametroNaoEncontradoException } from '../../modules/configuracao/exceptions/parametro-nao-encontrado.exception';
export { ParametroTipoInvalidoException } from '../../modules/configuracao/exceptions/parametro-tipo-invalido.exception';

// Exceções de workflow (já existentes)
export { WorkflowInconsistenteException } from '../../modules/configuracao/exceptions/workflow-inconsistente.exception';

// Exceções de template (já existentes)
export { TemplateInvalidoException } from '../../modules/configuracao/exceptions/template-invalido.exception';

// Exceções de integração (já existentes)
export { IntegracaoTesteException } from '../../modules/configuracao/exceptions/integracao-teste.exception';

// Sistema de catálogo de erros
export * from './error-catalog';
