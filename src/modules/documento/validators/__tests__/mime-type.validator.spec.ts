import { MimeTypeValidator } from '../mime-type.validator';
import {
  MIME_TYPE_CONFIGS,
  BLOCKED_MIME_TYPES,
} from '../../config/documento.config';
import * as fs from 'fs';
import * as path from 'path';

describe('MimeTypeValidator', () => {
  let validator: MimeTypeValidator;

  beforeEach(() => {
    validator = new MimeTypeValidator();
  });

  describe('validateMimeType', () => {
    it('deve validar um PDF válido', async () => {
      // Criar um buffer que simula um PDF (com magic number correto)
      const pdfBuffer = Buffer.from([
        0x25,
        0x50,
        0x44,
        0x46, // %PDF magic number
        ...Buffer.from('-1.4\n%âãÏÓ\n'), // PDF header
      ]);

      const result = await validator.validateMimeType(
        pdfBuffer,
        'application/pdf',
        'documento.pdf',
        pdfBuffer.length,
      );

      expect(result.isValid).toBe(true);
      expect(result.detectedMimeType).toBe('application/pdf');
      expect(result.fileExtension).toBe('pdf');
    });

    it('deve rejeitar arquivo com extensão perigosa', async () => {
      const buffer = Buffer.from('conteúdo qualquer');

      const result = await validator.validateMimeType(
        buffer,
        'application/octet-stream',
        'malware.exe',
        buffer.length,
      );

      expect(result.isValid).toBe(false);
      expect(result.securityFlags?.hasDangerousExtension).toBe(true);
      expect(result.message).toContain('Extensão de arquivo não permitida');
    });

    it('deve rejeitar tipo MIME bloqueado', async () => {
      const buffer = Buffer.from('conteúdo');

      const result = await validator.validateMimeType(
        buffer,
        'text/javascript',
        'script.js',
        buffer.length,
      );

      expect(result.isValid).toBe(false);
      expect(result.securityFlags?.isBlockedMimeType).toBe(true);
      expect(result.message).toContain('Tipo MIME bloqueado');
    });

    it('deve rejeitar arquivo que excede tamanho máximo', async () => {
      const buffer = Buffer.from('conteúdo');
      const largeSize = 25 * 1024 * 1024; // 25MB (maior que o limite global)

      const result = await validator.validateMimeType(
        buffer,
        'application/pdf',
        'documento.pdf',
        largeSize,
      );

      expect(result.isValid).toBe(false);
      expect(result.securityFlags?.exceedsMaxSize).toBe(true);
      expect(result.message).toContain('excede o tamanho máximo');
    });

    it('deve detectar mismatch entre tipo declarado e detectado', async () => {
      // Buffer que simula uma imagem JPEG
      const jpegBuffer = Buffer.from([
        0xff,
        0xd8,
        0xff,
        0xe0, // JPEG magic number
        ...Buffer.from('fake jpeg content'),
      ]);

      const result = await validator.validateMimeType(
        jpegBuffer,
        'application/pdf', // Tipo declarado incorreto
        'imagem.jpg',
        jpegBuffer.length,
      );

      expect(result.isValid).toBe(false);
      expect(result.securityFlags?.magicNumberMismatch).toBe(true);
      expect(result.message).toContain('não corresponde ao tipo real');
    });

    it('deve validar arquivo de texto simples', async () => {
      const textBuffer = Buffer.from(
        'Este é um arquivo de texto simples.\nCom quebras de linha.',
      );

      const result = await validator.validateMimeType(
        textBuffer,
        'text/plain',
        'documento.txt',
        textBuffer.length,
      );

      expect(result.isValid).toBe(true);
      expect(result.detectedMimeType).toBe('text/plain');
    });

    it('deve detectar conteúdo suspeito em arquivo', async () => {
      const suspiciousBuffer = Buffer.from(`
        Conteúdo normal do arquivo
        <script>alert('xss')</script>
        Mais conteúdo
      `);

      const result = await validator.validateMimeType(
        suspiciousBuffer,
        'text/plain',
        'arquivo.txt',
        suspiciousBuffer.length,
      );

      expect(result.isValid).toBe(false);
      expect(result.securityFlags?.isSuspicious).toBe(true);
      expect(result.securityFlags?.hasEmbeddedContent).toBe(true);
      expect(result.message).toContain('conteúdo suspeito');
    });

    it('deve detectar JavaScript em PDF', async () => {
      const pdfWithJsBuffer = Buffer.from(`
        %PDF-1.4
        /JavaScript (alert('malicious'))
        /JS (document.cookie)
        resto do conteúdo PDF
      `);

      const result = await validator.validateMimeType(
        pdfWithJsBuffer,
        'application/pdf',
        'documento.pdf',
        pdfWithJsBuffer.length,
      );

      expect(result.isValid).toBe(false);
      expect(result.securityFlags?.isSuspicious).toBe(true);
      expect(result.message).toContain('JavaScript incorporado');
    });

    it('deve detectar alta densidade de caracteres não-ASCII', async () => {
      // Criar buffer com muitos caracteres não-ASCII (possível ofuscação)
      const obfuscatedBuffer = Buffer.from(
        'texto' + '\x80\x81\x82\x83\x84\x85\x86\x87\x88\x89'.repeat(20),
      );

      const result = await validator.validateMimeType(
        obfuscatedBuffer,
        'text/plain',
        'arquivo.txt',
        obfuscatedBuffer.length,
      );

      expect(result.isValid).toBe(false);
      expect(result.securityFlags?.isSuspicious).toBe(true);
      expect(result.message).toContain('caracteres não-ASCII');
    });
  });

  describe('generateFileHash', () => {
    it('deve gerar hash SHA256 consistente', () => {
      const buffer = Buffer.from('conteúdo de teste');

      const hash1 = validator.generateFileHash(buffer);
      const hash2 = validator.generateFileHash(buffer);

      expect(hash1).toBe(hash2);
      expect(hash1).toHaveLength(64); // SHA256 em hex
      expect(hash1).toMatch(/^[a-f0-9]{64}$/);
    });

    it('deve gerar hashes diferentes para conteúdos diferentes', () => {
      const buffer1 = Buffer.from('conteúdo 1');
      const buffer2 = Buffer.from('conteúdo 2');

      const hash1 = validator.generateFileHash(buffer1);
      const hash2 = validator.generateFileHash(buffer2);

      expect(hash1).not.toBe(hash2);
    });
  });

  describe('requiresEncryption', () => {
    it('deve retornar true para documentos sensíveis', () => {
      const sensitiveTypes = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      ];

      sensitiveTypes.forEach((mimeType) => {
        expect(validator.requiresEncryption(mimeType)).toBe(true);
      });
    });

    it('deve retornar false para imagens', () => {
      const imageTypes = ['image/jpeg', 'image/png'];

      imageTypes.forEach((mimeType) => {
        expect(validator.requiresEncryption(mimeType)).toBe(false);
      });
    });
  });

  describe('allowsThumbnail', () => {
    it('deve retornar true para imagens', () => {
      const imageTypes = ['image/jpeg', 'image/png'];

      imageTypes.forEach((mimeType) => {
        expect(validator.allowsThumbnail(mimeType)).toBe(true);
      });
    });

    it('deve retornar true para PDFs', () => {
      expect(validator.allowsThumbnail('application/pdf')).toBe(true);
    });

    it('deve retornar false para documentos do Office', () => {
      const officeTypes = [
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      ];

      officeTypes.forEach((mimeType) => {
        expect(validator.allowsThumbnail(mimeType)).toBe(false);
      });
    });
  });

  describe('analyzeFileContent', () => {
    it('deve detectar tags de script', () => {
      const content = Buffer.from('<script>alert("xss")</script>');

      const result = validator['analyzeFileContent'](content, 'text/html');

      expect(result.isSuspicious).toBe(true);
      expect(result.hasEmbeddedContent).toBe(true);
      expect(result.reason).toContain('script');
    });

    it('deve detectar URLs javascript', () => {
      const content = Buffer.from('href="javascript:alert(1)"');

      const result = validator['analyzeFileContent'](content, 'text/html');

      expect(result.isSuspicious).toBe(true);
      expect(result.hasEmbeddedContent).toBe(true);
    });

    it('deve detectar event handlers', () => {
      const content = Buffer.from('<img onload="malicious()" />');

      const result = validator['analyzeFileContent'](content, 'text/html');

      expect(result.isSuspicious).toBe(true);
      expect(result.hasEmbeddedContent).toBe(true);
    });

    it('deve detectar null bytes', () => {
      const content = Buffer.from('texto\x00com\x00null\x00bytes');

      const result = validator['analyzeFileContent'](content, 'text/plain');

      expect(result.isSuspicious).toBe(true);
    });

    it('não deve detectar conteúdo normal como suspeito', () => {
      const content = Buffer.from(`
        Este é um documento normal.
        Contém texto, números 123 e pontuação!
        Email: usuario@exemplo.com
        URL: https://exemplo.com
      `);

      const result = validator['analyzeFileContent'](content, 'text/plain');

      expect(result.isSuspicious).toBe(false);
      expect(result.hasEmbeddedContent).toBe(false);
    });
  });

  describe('extractFileExtension', () => {
    it('deve extrair extensão corretamente', () => {
      const testCases = [
        { filename: 'documento.pdf', expected: 'pdf' },
        { filename: 'imagem.JPEG', expected: 'jpeg' },
        { filename: 'arquivo.com.extensao.txt', expected: 'txt' },
        { filename: 'sem_extensao', expected: '' },
        { filename: '.hidden', expected: 'hidden' },
      ];

      testCases.forEach(({ filename, expected }) => {
        const result = validator['extractFileExtension'](filename);
        expect(result).toBe(expected);
      });
    });
  });

  describe('integração com configuração', () => {
    it('deve usar configurações do documento.config', () => {
      // Verificar se os tipos permitidos estão sendo usados
      const allowedTypes = Object.values(MIME_TYPE_CONFIGS).flatMap(
        (config) => config.mimeTypes,
      );

      expect(allowedTypes).toContain('application/pdf');
      expect(allowedTypes).toContain('image/jpeg');
      expect(allowedTypes).toContain('text/plain');
    });

    it('deve usar tipos bloqueados da configuração', () => {
      expect(BLOCKED_MIME_TYPES).toContain('text/javascript');
      expect(BLOCKED_MIME_TYPES).toContain('application/zip');
      expect(BLOCKED_MIME_TYPES).toContain('image/svg+xml');
    });
  });

  describe('casos de uso reais', () => {
    it('deve processar upload de certidão de nascimento (PDF)', async () => {
      const pdfBuffer = Buffer.from([
        0x25,
        0x50,
        0x44,
        0x46, // %PDF
        ...Buffer.from('-1.4\nCertidão de Nascimento\nNome: João da Silva'),
      ]);

      const result = await validator.validateMimeType(
        pdfBuffer,
        'application/pdf',
        'certidao_nascimento.pdf',
        pdfBuffer.length,
      );

      expect(result.isValid).toBe(true);
      expect(result.detectedMimeType).toBe('application/pdf');
    });

    it('deve processar upload de foto de documento (JPEG)', async () => {
      const jpegBuffer = Buffer.from([
        0xff,
        0xd8,
        0xff,
        0xe0, // JPEG magic
        ...Buffer.from('fake jpeg image data'),
      ]);

      const result = await validator.validateMimeType(
        jpegBuffer,
        'image/jpeg',
        'foto_documento.jpg',
        jpegBuffer.length,
      );

      expect(result.isValid).toBe(true);
      expect(result.detectedMimeType).toBe('image/jpeg');
    });

    it('deve rejeitar tentativa de upload de malware', async () => {
      const malwareBuffer = Buffer.from('MZ\x90\x00'); // PE header

      const result = await validator.validateMimeType(
        malwareBuffer,
        'application/pdf',
        'documento.exe',
        malwareBuffer.length,
      );

      expect(result.isValid).toBe(false);
      expect(result.securityFlags?.hasDangerousExtension).toBe(true);
    });
  });
});
