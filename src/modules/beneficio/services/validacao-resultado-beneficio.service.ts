import { Injectable, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Concessao } from '../../../entities/concessao.entity';
import { Usuario } from '../../../entities/usuario.entity';
import { StatusConcessao } from '../../../enums/status-concessao.enum';
import { MotivoEncerramentoBeneficio } from '../../../enums/motivo-encerramento-beneficio.enum';
import { StatusVulnerabilidade } from '../../../enums/status-vulnerabilidade.enum';
import { TipoDocumentoComprobatorio } from '../../../enums/tipo-documento-comprobatorio.enum';
import { CreateResultadoBeneficioCessadoDto } from '../dto/create-resultado-beneficio-cessado.dto';

/**
 * Service responsável por validar as regras de negócio para registro de resultado
 * de benefício cessado conforme Lei de Benefícios Eventuais do SUAS
 */
@Injectable()
export class ValidacaoResultadoBeneficioService {
  constructor(
    @InjectRepository(Concessao)
    private readonly concessaoRepository: Repository<Concessao>,
    @InjectRepository(Usuario)
    private readonly usuarioRepository: Repository<Usuario>,
  ) {}

  /**
   * Valida se a concessão pode ter resultado de cessação registrado
   * Conforme Art. 15 da Lei de Benefícios Eventuais
   */
  async validarConcessaoParaCessacao(concessaoId: string): Promise<Concessao> {
    const concessao = await this.concessaoRepository.findOne({
      where: { id: concessaoId },
      relations: ['solicitacao', 'solicitacao.beneficiario', 'solicitacao.tipo_beneficio', 'resultadoBeneficioCessado'],
    });

    if (!concessao) {
      throw new BadRequestException(
        'Concessão não encontrada para registro de resultado de cessação'
      );
    }

    // Validar se a concessão está em status que permite cessação
    if (concessao.status !== StatusConcessao.CESSADO) {
      throw new BadRequestException(
        'Apenas concessões com status CESSADO podem ter resultado registrado'
      );
    }

    // Validar se já não existe resultado registrado
    if (concessao.resultadoBeneficioCessado) {
      throw new BadRequestException(
        'Esta concessão já possui resultado de cessação registrado'
      );
    }

    return concessao;
  }


  /**
   * Valida a consistência dos dados do resultado conforme SUAS
   */
  validarConsistenciaDados(dto: CreateResultadoBeneficioCessadoDto): void {
    // Validar motivo de encerramento
    this.validarMotivoEncerramento(dto.motivoEncerramento);

    // Validar status de vulnerabilidade
    this.validarStatusVulnerabilidade(dto.statusVulnerabilidade);

    // Validar documentos comprobatórios
    this.validarDocumentosComprobatorios(dto.documentosComprobatorios || []);

    // Validar observações técnicas (obrigatórias)
    if (!dto.observacoes || dto.observacoes.trim().length < 10) {
      throw new BadRequestException(
        'Observações técnicas são obrigatórias e devem ter pelo menos 10 caracteres'
      );
    }
  }

  /**
   * Valida motivo de encerramento conforme regulamentação
   */
  private validarMotivoEncerramento(motivo: MotivoEncerramentoBeneficio): void {
    const motivosValidos = Object.values(MotivoEncerramentoBeneficio);
    
    if (!motivosValidos.includes(motivo)) {
      throw new BadRequestException('Motivo de encerramento inválido');
    }

    // Validações específicas por motivo
    switch (motivo) {
      case MotivoEncerramentoBeneficio.SUPERACAO_VULNERABILIDADE:
        // Requer documentação específica de superação
        break;
      case MotivoEncerramentoBeneficio.DESCUMPRIMENTO_CONDICIONALIDADES:
        // Requer registro de tentativas de acompanhamento
        break;
      case MotivoEncerramentoBeneficio.MUDANCA_MUNICIPIO:
        // Requer comprovação de mudança
        break;
    }
  }

  /**
   * Valida status de vulnerabilidade conforme SUAS
   */
  private validarStatusVulnerabilidade(status: StatusVulnerabilidade): void {
    const statusValidos = Object.values(StatusVulnerabilidade);
    
    if (!statusValidos.includes(status)) {
      throw new BadRequestException('Status de vulnerabilidade inválido');
    }

    // Validações específicas por status
    if (status === StatusVulnerabilidade.NECESSITA_REAVALIACAO) {
      // Requer justificativa detalhada
    }
  }

  /**
   * Valida documentos comprobatórios das provas sociais.
   * 
   * Documentos são opcionais no registro inicial, mas se enviados
   * devem atender aos critérios de qualidade e conformidade SUAS.
   */
  private validarDocumentosComprobatorios(documentos: any[]): void {
    // Documentos são opcionais - validar apenas se enviados
    if (!documentos || documentos.length === 0) {
      return; // Permitir registro sem documentos
    }

    // Validar cada documento enviado
    documentos.forEach((doc, index) => {
      this.validarDocumentoIndividual(doc, index);
    });

    // Validar diversidade de tipos de documentos se múltiplos enviados
    if (documentos.length > 1) {
      this.validarDiversidadeTiposDocumentos(documentos);
    }
  }

  /**
   * Valida documento individual
   */
  private validarDocumentoIndividual(documento: any, index: number): void {
    if (!documento.tipo || !Object.values(TipoDocumentoComprobatorio).includes(documento.tipo)) {
      throw new BadRequestException(
        `Tipo de documento inválido no documento ${index + 1}`
      );
    }

    if (!documento.nomeArquivo || documento.nomeArquivo.trim().length === 0) {
      throw new BadRequestException(
        `Nome do arquivo é obrigatório no documento ${index + 1}`
      );
    }

    if (!documento.caminhoArquivo || documento.caminhoArquivo.trim().length === 0) {
      throw new BadRequestException(
        `Caminho do arquivo é obrigatório no documento ${index + 1}`
      );
    }

    // Validar tamanho do arquivo (máximo 10MB)
    if (documento.tamanhoArquivo && documento.tamanhoArquivo > 10 * 1024 * 1024) {
      throw new BadRequestException(
        `Arquivo ${index + 1} excede o tamanho máximo de 10MB`
      );
    }

    // Validar tipos MIME permitidos
    const tiposMimePermitidos = [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/jpg',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];

    if (documento.tipoMime && !tiposMimePermitidos.includes(documento.tipoMime)) {
      throw new BadRequestException(
        `Tipo de arquivo não permitido no documento ${index + 1}. Tipos aceitos: PDF, JPG, PNG, DOC, DOCX`
      );
    }
  }

  /**
   * Valida diversidade de tipos de documentos para garantir qualidade da documentação.
   * 
   * Quando múltiplos documentos são enviados, verifica se há diversidade
   * adequada entre prova social e documentação técnica.
   */
  private validarDiversidadeTiposDocumentos(documentos: any[]): void {
    const tiposPresentes = new Set(documentos.map(doc => doc.tipo));
    
    // Verificar se há pelo menos dois tipos diferentes quando múltiplos documentos
    if (documentos.length >= 3 && tiposPresentes.size < 2) {
      throw new BadRequestException(
        'Para múltiplos documentos, recomenda-se incluir tanto prova social quanto documentação técnica'
      );
    }

    // Validar distribuição equilibrada usando os valores corretos do enum
    const provaSocial = documentos.filter(doc => doc.tipo === 'prova_social').length;
    const docTecnica = documentos.filter(doc => doc.tipo === 'documentacao_tecnica').length;

    // Alertar sobre desequilíbrio extremo (mais de 80% de um tipo)
    const total = documentos.length;
    if (total > 2) {
      const proporcaoProvaSocial = provaSocial / total;
      if (proporcaoProvaSocial > 0.8 || proporcaoProvaSocial < 0.2) {
        // Log de aviso, mas não bloquear o processo
        console.warn('Distribuição desequilibrada de tipos de documentos detectada');
      }
    }
  }

  /**
   * Valida prazo para registro conforme regulamentação
   */
  validarPrazoRegistro(dataFimConcessao: Date | string | null): void {
    if (!dataFimConcessao) {
      return; // Concessão ainda ativa
    }

    // Converter para Date se necessário (TypeORM pode retornar como string)
    const dataEncerramento = dataFimConcessao instanceof Date 
      ? dataFimConcessao 
      : new Date(dataFimConcessao);

    // Validar se a conversão foi bem-sucedida
    if (isNaN(dataEncerramento.getTime())) {
      throw new BadRequestException('Data de encerramento inválida');
    }

    const hoje = new Date();
    const diasAposCessacao = Math.floor(
      (hoje.getTime() - dataEncerramento.getTime()) / (1000 * 60 * 60 * 24)
    );

    // Prazo máximo de 30 dias conforme regulamentação CNAS
    if (diasAposCessacao > 30) {
      throw new BadRequestException(
        `Prazo para registro expirado. Máximo de 30 dias após cessação (${diasAposCessacao} dias)`
      );
    }

    // Alerta se próximo do prazo
    if (diasAposCessacao > 25) {
      // Log de alerta para gestão
      console.warn(
        `Registro próximo do prazo limite: ${diasAposCessacao} dias após cessação`
      );
    }
  }
}