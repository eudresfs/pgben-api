import { Injectable } from '@nestjs/common';
import { Content } from 'pdfmake/interfaces';
import { TemplatePadronizadoBase } from '../template-base-padronizado.abstract';
import { IPdfTemplateConfig } from '../../interfaces/pdf-template-config.interface';
import { PdfTipoAssinatura } from '../../enums/pdf-tipo-assinatura.enum';
import { PdfTipoConteudo } from '../../enums/pdf-tipo-conteudo.enum';

/**
 * Interface para dados de PDF vazio
 */
export interface IDadosPdfVazio {
  titulo?: string;
  mensagem?: string;
  dataEmissao?: string;
}

/**
 * Template para PDF vazio
 * Usado quando não há dados para exibir no relatório
 */
@Injectable()
export class PdfVazioTemplate extends TemplatePadronizadoBase<IDadosPdfVazio> {
  readonly config: IPdfTemplateConfig = {
    nome: 'PDF Vazio',
    tipo: 'vazio',
    conteudo: {
      tipos: [
        PdfTipoConteudo.TEXTO,
        PdfTipoConteudo.PARAGRAFO
      ],
      permitirCustomizacao: true
    },
    assinaturas: {
      tipos: [PdfTipoAssinatura.TECNICO_RESPONSAVEL],
      maxPorLinha: 1,
      obrigatorias: [PdfTipoAssinatura.TECNICO_RESPONSAVEL]
    },
    headerPadronizado: true,
    footerPadronizado: true
  };

  /**
   * Cria o conteúdo específico do PDF vazio
   */
  criarConteudoEspecifico(dados: IDadosPdfVazio = {}): Content[] {
    const conteudo: Content[] = [];

    // Título padrão ou personalizado
    const titulo = dados.titulo || 'Relatório de Pagamentos';
    conteudo.push({
      text: titulo,
      style: 'titulo',
      alignment: 'center',
      margin: [0, 20, 0, 30]
    });

    // Data de emissão
    const dataEmissao = dados.dataEmissao || new Date().toLocaleDateString('pt-BR');
    conteudo.push({
      text: `Data de Emissão: ${dataEmissao}`,
      style: 'texto',
      margin: [0, 0, 0, 40]
    });

    // Mensagem informativa
    const mensagem = dados.mensagem || 'Nenhum registro encontrado para os critérios informados.';
    conteudo.push({
      text: mensagem,
      style: 'textoDestaque',
      alignment: 'center',
      margin: [0, 50, 0, 50]
    });

    // Informação adicional
    conteudo.push({
      text: 'Este documento foi gerado automaticamente pelo Sistema PGBEN.',
      style: 'textoSecundario',
      alignment: 'center',
      margin: [0, 20, 0, 50]
    });

    // Seção de assinaturas
    conteudo.push(...this.criarSecaoAssinaturas(dados));

    return conteudo;
  }

  /**
   * Valida os dados do PDF vazio
   * Para PDF vazio, não há validações obrigatórias
   */
  validarDados(dados: IDadosPdfVazio = {}): boolean {
    // PDF vazio não requer validações específicas
    return true;
  }
}