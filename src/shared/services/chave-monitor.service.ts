import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

/**
 * Serviço de Monitoramento de Chaves
 * 
 * Responsável por monitorar a integridade das chaves de criptografia,
 * verificar permissões de arquivo e registrar alterações não autorizadas.
 */
@Injectable()
export class ChaveMonitorService {
  private readonly logger = new Logger(ChaveMonitorService.name);
  private readonly keyPath: string;
  private keyChecksum: string;
  private lastModified: Date;
  private lastPermissions: number;

  constructor(private configService: ConfigService) {
    this.keyPath = 
      this.configService.get<string>('ENCRYPTION_KEY_PATH') ||
      path.join(process.cwd(), 'config', 'encryption.key');
    
    // Inicializar o monitoramento se a chave existir
    if (fs.existsSync(this.keyPath)) {
      this.inicializarMonitoramento();
    } else {
      this.logger.warn('Arquivo de chave não encontrado para monitoramento');
    }
  }

  /**
   * Inicializa o monitoramento da chave
   */
  private inicializarMonitoramento(): void {
    try {
      const stats = fs.statSync(this.keyPath);
      this.lastModified = stats.mtime;
      this.lastPermissions = stats.mode;
      this.keyChecksum = this.calcularChecksum();
      
      this.logger.log('Monitoramento de chave inicializado com sucesso');
      
      // Verificar permissões
      this.verificarPermissoes();
    } catch (error) {
      this.logger.error(`Erro ao inicializar monitoramento: ${error.message}`);
    }
  }

  /**
   * Calcula o checksum do arquivo de chave
   */
  private calcularChecksum(): string {
    try {
      const fileBuffer = fs.readFileSync(this.keyPath);
      const hashSum = crypto.createHash('sha256');
      hashSum.update(fileBuffer);
      return hashSum.digest('hex');
    } catch (error) {
      this.logger.error(`Erro ao calcular checksum: ${error.message}`);
      return '';
    }
  }

  /**
   * Verifica se as permissões do arquivo estão corretas
   */
  private verificarPermissoes(): void {
    try {
      const stats = fs.statSync(this.keyPath);
      const permissoes = stats.mode & 0o777; // Extrair apenas as permissões
      
      // Em sistemas Unix, verificar se as permissões são 600 (leitura/escrita apenas para o proprietário)
      if (process.platform !== 'win32' && permissoes !== 0o600) {
        this.logger.warn(
          `Permissões inseguras detectadas no arquivo de chave: ${permissoes.toString(8)}. ` +
          'Recomendado: 600 (leitura/escrita apenas para o proprietário)'
        );
        
        // Tentar corrigir as permissões
        try {
          fs.chmodSync(this.keyPath, 0o600);
          this.logger.log('Permissões do arquivo de chave corrigidas para 600');
        } catch (chmodError) {
          this.logger.error(`Não foi possível corrigir as permissões: ${chmodError.message}`);
        }
      }
    } catch (error) {
      this.logger.error(`Erro ao verificar permissões: ${error.message}`);
    }
  }

  /**
   * Verifica a integridade da chave
   * @returns true se a chave está íntegra, false caso contrário
   */
  public verificarIntegridade(): boolean {
    if (!fs.existsSync(this.keyPath)) {
      this.logger.error('Arquivo de chave não encontrado durante verificação de integridade');
      return false;
    }

    try {
      // Verificar se o arquivo foi modificado
      const stats = fs.statSync(this.keyPath);
      if (stats.mtime.getTime() !== this.lastModified.getTime()) {
        this.logger.warn('Detectada modificação no arquivo de chave!');
        
        // Verificar se o conteúdo realmente mudou (checksum)
        const novoChecksum = this.calcularChecksum();
        if (novoChecksum !== this.keyChecksum) {
          this.logger.error('ALERTA DE SEGURANÇA: Conteúdo do arquivo de chave foi alterado!');
          return false;
        }
        
        // Atualizar timestamp se apenas o timestamp mudou mas o conteúdo não
        this.lastModified = stats.mtime;
        this.logger.log('Timestamp do arquivo atualizado, mas conteúdo permanece íntegro');
      }
      
      // Verificar permissões
      if (stats.mode !== this.lastPermissions) {
        this.logger.warn('Permissões do arquivo de chave foram alteradas!');
        this.verificarPermissoes();
        this.lastPermissions = stats.mode;
      }
      
      return true;
    } catch (error) {
      this.logger.error(`Erro ao verificar integridade: ${error.message}`);
      return false;
    }
  }

  /**
   * Cria um backup da chave
   * @returns true se o backup foi criado com sucesso, false caso contrário
   */
  public criarBackup(): boolean {
    if (!fs.existsSync(this.keyPath)) {
      this.logger.error('Arquivo de chave não encontrado para backup');
      return false;
    }

    try {
      const backupDir = path.join(path.dirname(this.keyPath), 'backups');
      
      // Criar diretório de backup se não existir
      if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true, mode: 0o700 }); // Permissões restritas
      }
      
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupPath = path.join(backupDir, `encryption.key.${timestamp}`);
      
      // Copiar arquivo
      fs.copyFileSync(this.keyPath, backupPath);
      
      // Definir permissões restritas
      if (process.platform !== 'win32') {
        fs.chmodSync(backupPath, 0o600);
      }
      
      this.logger.log(`Backup da chave criado com sucesso: ${backupPath}`);
      return true;
    } catch (error) {
      this.logger.error(`Erro ao criar backup: ${error.message}`);
      return false;
    }
  }
}
