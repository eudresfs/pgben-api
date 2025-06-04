import { Injectable, Logger } from '@nestjs/common';
import { ParametroService } from './parametro.service';
import { LimitesUploadDto } from '../dtos/limites/limites-upload.dto';
import { PrazoUpdateDto } from '../dtos/limites/prazo-update.dto';
import { LimitesUploadResponseDto } from '../dtos/limites/limites-upload-response.dto';
import { ValidationErrorException } from '../../../shared/exceptions';

/**
 * Serviço para gerenciamento de limites operacionais do sistema
 *
 * Responsável por:
 * - Gerenciar limites de upload (tamanho, tipos)
 * - Gerenciar prazos de processos
 * - Fornecer valores formatados para uso na interface
 */
@Injectable()
export class LimitesService {
  private readonly logger = new Logger(LimitesService.name);

  // Chaves dos parâmetros de limites de upload
  private readonly KEY_UPLOAD_MAX_SIZE = 'upload.tamanho_maximo';
  private readonly KEY_UPLOAD_MAX_FILES = 'upload.arquivos_maximo';
  private readonly KEY_UPLOAD_ALLOWED_TYPES = 'upload.tipos_permitidos';
  private readonly KEY_UPLOAD_MAX_PER_REQUEST = 'upload.max_por_requisicao';

  // Chaves dos parâmetros de prazos
  private readonly KEY_PRAZO_ANALISE = 'prazo.analise_solicitacao';
  private readonly KEY_PRAZO_ENTREVISTA = 'prazo.agendamento_entrevista';
  private readonly KEY_PRAZO_RECURSO = 'prazo.entrada_recurso';
  private readonly KEY_PRAZO_VALIDADE = 'prazo.validade_documentos';

  // Valores padrão
  private readonly DEFAULT_MAX_SIZE = 10 * 1024 * 1024; // 10MB
  private readonly DEFAULT_MAX_FILES = 20;
  private readonly DEFAULT_ALLOWED_TYPES = [
    'jpg',
    'jpeg',
    'png',
    'pdf',
    'doc',
    'docx',
  ];
  private readonly DEFAULT_MAX_PER_REQUEST = 5;

  private readonly DEFAULT_PRAZO_ANALISE = 15; // dias
  private readonly DEFAULT_PRAZO_ENTREVISTA = 7; // dias
  private readonly DEFAULT_PRAZO_RECURSO = 10; // dias
  private readonly DEFAULT_PRAZO_VALIDADE = 90; // dias

  constructor(private readonly parametroService: ParametroService) {}

  /**
   * Busca os limites de upload configurados
   * @returns DTO com os limites de upload
   */
  async buscarLimitesUpload(): Promise<LimitesUploadResponseDto> {
    const dto = new LimitesUploadResponseDto();

    dto.tamanho_maximo = await this.parametroService.obterNumero(
      this.KEY_UPLOAD_MAX_SIZE,
      this.DEFAULT_MAX_SIZE,
    );

    dto.arquivos_maximo = await this.parametroService.obterNumero(
      this.KEY_UPLOAD_MAX_FILES,
      this.DEFAULT_MAX_FILES,
    );

    dto.tipos_permitidos = await this.parametroService.obterJson<string[]>(
      this.KEY_UPLOAD_ALLOWED_TYPES,
      this.DEFAULT_ALLOWED_TYPES,
    );

    dto.max_por_requisicao = await this.parametroService.obterNumero(
      this.KEY_UPLOAD_MAX_PER_REQUEST,
      this.DEFAULT_MAX_PER_REQUEST,
    );

    // Adicionar versões formatadas para exibição
    dto.tamanho_maximo_formatado = this.formatarTamanhoBytes(
      dto.tamanho_maximo,
    );

    return dto;
  }

  /**
   * Atualiza os limites de upload
   * @param dto DTO com os novos limites
   * @returns DTO com os limites atualizados
   */
  async atualizarLimitesUpload(
    dto: LimitesUploadDto,
  ): Promise<LimitesUploadResponseDto> {
    if (dto.tamanho_maximo !== undefined) {
      await this.parametroService.atualizar(this.KEY_UPLOAD_MAX_SIZE, {
        valor: String(dto.tamanho_maximo),
        descricao: 'Tamanho máximo de arquivos para upload (em bytes)',
      });
    }

    if (dto.arquivos_maximo !== undefined) {
      await this.parametroService.atualizar(this.KEY_UPLOAD_MAX_FILES, {
        valor: String(dto.arquivos_maximo),
        descricao: 'Número máximo de arquivos por cidadão',
      });
    }

    if (dto.tipos_permitidos !== undefined) {
      await this.parametroService.atualizar(this.KEY_UPLOAD_ALLOWED_TYPES, {
        valor: JSON.stringify(dto.tipos_permitidos),
        descricao: 'Tipos de arquivo permitidos para upload',
      });
    }

    if (dto.max_por_requisicao !== undefined) {
      await this.parametroService.atualizar(this.KEY_UPLOAD_MAX_PER_REQUEST, {
        valor: String(dto.max_por_requisicao),
        descricao: 'Número máximo de arquivos por requisição de upload',
      });
    }

    this.logger.log('Limites de upload atualizados');
    return this.buscarLimitesUpload();
  }

  /**
   * Busca o prazo configurado para uma etapa específica
   * @param tipo Tipo do prazo
   * @returns Prazo em dias
   */
  async buscarPrazo(tipo: string): Promise<number> {
    const chave = this.obterChavePrazo(tipo);
    const padrao = this.obterPrazoPadrao(tipo);

    return this.parametroService.obterNumero(chave, padrao);
  }

  /**
   * Atualiza o prazo para uma etapa específica
   * @param tipo Tipo do prazo
   * @param dto DTO com o novo prazo
   * @returns Prazo atualizado em dias
   */
  async atualizarPrazo(tipo: string, dto: PrazoUpdateDto): Promise<number> {
    const chave = this.obterChavePrazo(tipo);

    if (dto.dias === undefined || dto.dias < 1) {
      throw new ValidationErrorException(
        'dias',
        dto.dias,
        'number',
        'Prazo deve ser pelo menos 1 dia',
      );
    }

    const descricao = this.obterDescricaoPrazo(tipo);

    await this.parametroService.atualizar(chave, {
      valor: String(dto.dias),
      descricao,
    });

    this.logger.log(`Prazo de ${tipo} atualizado para ${dto.dias} dias`);
    return dto.dias;
  }

  /**
   * Obtém a chave do parâmetro para um tipo de prazo
   * @param tipo Tipo do prazo
   * @returns Chave do parâmetro
   */
  private obterChavePrazo(tipo: string): string {
    switch (tipo) {
      case 'analise':
        return this.KEY_PRAZO_ANALISE;
      case 'entrevista':
        return this.KEY_PRAZO_ENTREVISTA;
      case 'recurso':
        return this.KEY_PRAZO_RECURSO;
      case 'validade':
        return this.KEY_PRAZO_VALIDADE;
      default:
        throw new ValidationErrorException(
          'tipo',
          tipo,
          'string',
          `Tipo de prazo não reconhecido: ${tipo}`,
        );
    }
  }

  /**
   * Obtém o valor padrão para um tipo de prazo
   * @param tipo Tipo do prazo
   * @returns Prazo padrão em dias
   */
  private obterPrazoPadrao(tipo: string): number {
    switch (tipo) {
      case 'analise':
        return this.DEFAULT_PRAZO_ANALISE;
      case 'entrevista':
        return this.DEFAULT_PRAZO_ENTREVISTA;
      case 'recurso':
        return this.DEFAULT_PRAZO_RECURSO;
      case 'validade':
        return this.DEFAULT_PRAZO_VALIDADE;
      default:
        return 30; // Valor genérico
    }
  }

  /**
   * Obtém a descrição para um tipo de prazo
   * @param tipo Tipo do prazo
   * @returns Descrição do prazo
   */
  private obterDescricaoPrazo(tipo: string): string {
    switch (tipo) {
      case 'analise':
        return 'Prazo para análise de solicitação de benefício (em dias)';
      case 'entrevista':
        return 'Prazo para agendamento de entrevista (em dias)';
      case 'recurso':
        return 'Prazo para entrada de recurso (em dias)';
      case 'validade':
        return 'Prazo de validade de documentos (em dias)';
      default:
        return `Prazo para ${tipo} (em dias)`;
    }
  }

  /**
   * Formata um tamanho em bytes para exibição amigável
   * @param bytes Tamanho em bytes
   * @returns String formatada (ex: "10 MB")
   */
  private formatarTamanhoBytes(bytes: number): string {
    if (bytes < 1024) {
      return `${bytes} B`;
    } else if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(2)} KB`;
    } else if (bytes < 1024 * 1024 * 1024) {
      return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    } else {
      return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
    }
  }

  /**
   * Verifica se um arquivo está dentro dos limites permitidos
   * @param tamanhoBytes Tamanho do arquivo em bytes
   * @param extensao Extensão do arquivo
   * @returns true se estiver dentro dos limites, false caso contrário
   */
  async verificarLimitesArquivo(
    tamanhoBytes: number,
    extensao: string,
  ): Promise<boolean> {
    const limites = await this.buscarLimitesUpload();

    // Verificar tamanho
    if (tamanhoBytes > limites.tamanho_maximo) {
      return false;
    }

    // Verificar extensão (normalizar para minúsculas sem ponto)
    extensao = extensao.toLowerCase().replace(/^\./, '');
    if (!limites.tipos_permitidos.includes(extensao)) {
      return false;
    }

    return true;
  }

  /**
   * Verifica se um conjunto de arquivos está dentro do limite máximo por requisição
   * @param quantidadeArquivos Quantidade de arquivos
   * @returns true se estiver dentro do limite, false caso contrário
   */
  async verificarLimiteQuantidade(
    quantidadeArquivos: number,
  ): Promise<boolean> {
    const limites = await this.buscarLimitesUpload();
    return quantidadeArquivos <= limites.max_por_requisicao;
  }

  /**
   * Verifica se o usuário já atingiu o limite máximo de arquivos
   * @param cidadaoId ID do cidadão
   * @param quantidadeAtual Quantidade atual de arquivos
   * @returns true se ainda estiver dentro do limite, false caso contrário
   */
  async verificarLimiteUsuario(
    cidadaoId: string,
    quantidadeAtual: number,
  ): Promise<boolean> {
    const limites = await this.buscarLimitesUpload();
    return quantidadeAtual < limites.arquivos_maximo;
  }

  /**
   * Calcula a data limite para uma etapa com base no prazo configurado
   * @param tipo Tipo do prazo
   * @param dataReferencia Data de referência para o cálculo
   * @returns Data limite
   */
  async calcularDataLimite(
    tipo: string,
    dataReferencia: Date = new Date(),
  ): Promise<Date> {
    const prazoEmDias = await this.buscarPrazo(tipo);

    const dataLimite = new Date(dataReferencia);
    dataLimite.setDate(dataLimite.getDate() + prazoEmDias);

    return dataLimite;
  }
}
