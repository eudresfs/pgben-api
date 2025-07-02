/**
 * Exportações dos DTOs do módulo EasyUpload
 */

// DTOs de criação e request
export {
  CreateUploadTokenDto,
  RequiredDocumentDto,
} from './create-upload-token.dto';

// DTOs de resposta para tokens
export {
  UploadTokenResponseDto,
  ValidateTokenResponseDto,
  UploadTokenListResponseDto,
} from './upload-token-response.dto';

// DTOs de sessão de upload
export {
  StartUploadSessionDto,
  UploadSessionResponseDto,
  UpdateSessionProgressDto,
  SessionStatusResponseDto,
} from './upload-session.dto';

// DTOs de upload de arquivos
export { UploadFileDto } from './upload-file.dto';
