import { Injectable, Logger } from '@nestjs/common';
import { IPdfConfiguracao } from '../interfaces';
import { PdfOrientacao, PdfTamanhoPapel, PdfTipoTemplate } from '../enums';
import {
  CONFIGURACAO_PADRAO,
  MARGENS_POR_TIPO,
  CONFIGURACAO_PAGINA,
  CONFIGURACAO_FONTES,
  CONFIGURACAO_IMAGEM,
  ESTILOS_PADRAO,
  CORES_PADRAO,
  MENSAGENS_ERRO,
  MENSAGENS_LOG
} from '../constants';

/**
 * Interface para configurações customizadas
 */
export interface IConfiguracaoCustomizada {
  id: string;
  nome: string;
  configuracao: IPdfConfiguracao;
  ativo: boolean;
  criadoEm: Date;
  atualizadoEm: Date;
}

/**
 * Interface para estilos customizados
 */
export interface IEstiloCustomizado {
  id: string;
  nome: string;
  estilos: Record<string, any>;
  ativo: boolean;
  criadoEm: Date;
  atualizadoEm: Date;
}

/**
 * Serviço para gerenciamento de configurações e estilos de PDF
 */
@Injectable()
export class PdfConfigService {
  private readonly logger = new Logger(PdfConfigService.name);
  private configuracoes: Map<string, IConfiguracaoCustomizada> = new Map();
  private estilos: Map<string, IEstiloCustomizado> = new Map();

  constructor() {
    this.inicializarConfiguracoesPadrao();
  }

  /**
   * Inicializa as configurações padrão do sistema
   */
  private inicializarConfiguracoesPadrao(): void {
    // Configuração padrão
    this.salvarConfiguracao('padrao', 'Configuração Padrão', CONFIGURACAO_PADRAO);

    // Configuração para relatórios
    this.salvarConfiguracao('relatorio', 'Configuração Relatório', {
      ...CONFIGURACAO_PADRAO,
      margens: MARGENS_POR_TIPO.relatorio,
      incluirCabecalho: true,
      incluirRodape: true
    });

    // Configuração para documentos
    this.salvarConfiguracao('documento', 'Configuração Documento', {
      ...CONFIGURACAO_PADRAO,
      margens: MARGENS_POR_TIPO.documento,
      incluirCabecalho: true,
      incluirRodape: true
    });

    // Configuração para comprovantes
    this.salvarConfiguracao('comprovante', 'Configuração Comprovante', {
      ...CONFIGURACAO_PADRAO,
      margens: MARGENS_POR_TIPO.comprovante,
      incluirCabecalho: false,
      incluirRodape: true
    });

    this.logger.log(`${this.configuracoes.size} configurações padrão inicializadas`);
  }

  /**
   * Obtém a configuração padrão do sistema
   * @returns Configuração padrão
   */
  obterConfiguracaoPadrao(): IPdfConfiguracao {
    return { ...CONFIGURACAO_PADRAO };
  }

  /**
   * Obtém uma configuração específica por ID
   * @param id ID da configuração
   * @returns Configuração encontrada
   */
  obterConfiguracao(id: string): IPdfConfiguracao {
    const config = this.configuracoes.get(id);
    if (!config) {
      this.logger.warn(`Configuração não encontrada: ${id}`);
      return this.obterConfiguracaoPadrao();
    }

    return { ...config.configuracao };
  }

  /**
   * Salva uma nova configuração ou atualiza uma existente
   * @param id ID da configuração
   * @param nome Nome da configuração
   * @param configuracao Dados da configuração
   */
  salvarConfiguracao(id: string, nome: string, configuracao: IPdfConfiguracao): void {
    const agora = new Date();
    const configExistente = this.configuracoes.get(id);

    const novaConfig: IConfiguracaoCustomizada = {
      id,
      nome,
      configuracao: { ...configuracao },
      ativo: true,
      criadoEm: configExistente?.criadoEm || agora,
      atualizadoEm: agora
    };

    this.configuracoes.set(id, novaConfig);
    this.logger.log(`Configuração salva: ${id}`);
  }

  /**
   * Lista todas as configurações disponíveis
   * @returns Array com informações das configurações
   */
  listarConfiguracoes(): Array<{ id: string; nome: string; ativo: boolean }> {
    return Array.from(this.configuracoes.values())
      .filter(config => config.ativo)
      .map(config => ({
        id: config.id,
        nome: config.nome,
        ativo: config.ativo
      }));
  }

  /**
   * Remove uma configuração
   * @param id ID da configuração
   */
  removerConfiguracao(id: string): void {
    if (id === 'padrao') {
      throw new Error('Não é possível remover a configuração padrão');
    }

    const config = this.configuracoes.get(id);
    if (config) {
      config.ativo = false;
      config.atualizadoEm = new Date();
      this.logger.log(`Configuração removida: ${id}`);
    }
  }

  /**
   * Obtém os estilos padrão do sistema
   * @returns Estilos padrão
   */
  obterEstilosPadrao(): Record<string, any> {
    return { ...ESTILOS_PADRAO };
  }

  /**
   * Obtém estilos customizados por ID
   * @param id ID do estilo
   * @returns Estilos encontrados
   */
  obterEstilosCustomizados(id: string): Record<string, any> {
    const estilo = this.estilos.get(id);
    if (!estilo) {
      this.logger.warn(`Estilo não encontrado: ${id}`);
      return this.obterEstilosPadrao();
    }

    return { ...estilo.estilos };
  }

  /**
   * Salva estilos customizados
   * @param id ID do estilo
   * @param nome Nome do estilo
   * @param estilos Dados dos estilos
   */
  salvarEstilosCustomizados(id: string, nome: string, estilos: Record<string, any>): void {
    const agora = new Date();
    const estiloExistente = this.estilos.get(id);

    const novoEstilo: IEstiloCustomizado = {
      id,
      nome,
      estilos: { ...estilos },
      ativo: true,
      criadoEm: estiloExistente?.criadoEm || agora,
      atualizadoEm: agora
    };

    this.estilos.set(id, novoEstilo);
    this.logger.log(`Estilo customizado salvo: ${id}`);
  }

  /**
   * Mescla configurações personalizadas com a configuração padrão
   * @param configuracaoCustomizada Configuração personalizada
   * @returns Configuração mesclada
   */
  mesclarConfiguracoes(configuracaoCustomizada: Partial<IPdfConfiguracao>): IPdfConfiguracao {
    return {
      ...this.obterConfiguracaoPadrao(),
      ...configuracaoCustomizada
    };
  }

  /**
   * Mescla estilos personalizados com os estilos padrão
   * @param estilosCustomizados Estilos personalizados
   * @returns Estilos mesclados
   */
  mesclarEstilos(estilosCustomizados: Record<string, any>): Record<string, any> {
    return {
      ...this.obterEstilosPadrao(),
      ...estilosCustomizados
    };
  }

  /**
   * Obtém configuração específica para um tipo de template
   * @param tipoTemplate Tipo do template
   * @returns Configuração otimizada para o template
   */
  obterConfiguracaoParaTemplate(tipoTemplate: PdfTipoTemplate): IPdfConfiguracao {
    switch (tipoTemplate) {
      case PdfTipoTemplate.RELATORIO:
        return this.obterConfiguracao('relatorio');
      case PdfTipoTemplate.DOCUMENTO:
        return this.obterConfiguracao('documento');
      case PdfTipoTemplate.COMPROVANTE:
        return this.obterConfiguracao('comprovante');
      case PdfTipoTemplate.CESTA_BASICA:
      case PdfTipoTemplate.ALUGUEL_SOCIAL:
        return this.obterConfiguracao('documento');
      default:
        return this.obterConfiguracaoPadrao();
    }
  }

  /**
   * Valida uma configuração
   * @param configuracao Configuração a ser validada
   * @returns True se a configuração é válida
   */
  validarConfiguracao(configuracao: IPdfConfiguracao): boolean {
    try {
      // Validar orientação
      if (!Object.values(PdfOrientacao).includes(configuracao.orientacao)) {
        return false;
      }

      // Validar tamanho do papel
      if (!Object.values(PdfTamanhoPapel).includes(configuracao.tamanho)) {
        return false;
      }

      // Validar margens
      const { margens } = configuracao;
      if (!Array.isArray(margens) || margens.length !== 4 ||
          margens.some(margin => typeof margin !== 'number' || margin < 0)) {
        return false;
      }

      return true;
    } catch (error) {
      this.logger.error(`Erro na validação da configuração: ${error.message}`);
      return false;
    }
  }

  /**
   * Obtém as cores padrão do sistema
   * @returns Cores padrão
   */
  obterCoresPadrao(): Record<string, string> {
    return { ...CORES_PADRAO };
  }

  /**
   * Obtém configurações de fonte
   * @returns Configurações de fonte
   */
  obterConfiguracaoFontes(): any {
    return { ...CONFIGURACAO_FONTES };
  }

  /**
   * Obtém configurações de imagem
   * @returns Configurações de imagem
   */
  obterConfiguracaoImagem(): any {
    return { ...CONFIGURACAO_IMAGEM };
  }

  /**
   * Obtém configurações de página
   * @returns Configurações de página
   */
  obterConfiguracaoPagina(): any {
    return { ...CONFIGURACAO_PAGINA };
  }

  /**
   * Cria uma configuração personalizada baseada em parâmetros
   * @param orientacao Orientação da página
   * @param tamanho Tamanho do papel
   * @param margens Margens personalizadas
   * @param incluirCabecalho Se deve incluir cabeçalho
   * @param incluirRodape Se deve incluir rodapé
   * @returns Configuração personalizada
   */
  criarConfiguracaoPersonalizada(
    orientacao: PdfOrientacao = PdfOrientacao.RETRATO,
    tamanho: PdfTamanhoPapel = PdfTamanhoPapel.A4,
    margens: [number, number, number, number] = CONFIGURACAO_PADRAO.margens,
    incluirCabecalho: boolean = true,
    incluirRodape: boolean = true
  ): IPdfConfiguracao {
    const configuracao: IPdfConfiguracao = {
      orientacao,
      tamanho,
      margens,
      incluirCabecalho,
      incluirRodape,
      estilosCustomizados: {}
    };

    if (!this.validarConfiguracao(configuracao)) {
      throw new Error(MENSAGENS_ERRO.CONFIGURACAO_INVALIDA);
    }

    return configuracao;
  }
}