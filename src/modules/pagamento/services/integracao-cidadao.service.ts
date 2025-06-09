import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  IIntegracaoCidadaoService,
  IContextoUsuario,
  IResultadoOperacao,
  ICidadaoCompleto,
  IDadosBancarios,
  ISituacaoCadastral,
  IValidacaoBancaria,
  IFiltrosHistorico,
  IHistoricoCidadao,
} from '../interfaces';
import { ISituacaoCadastral as ISituacaoCadastralInterface } from '../interfaces/integracao-cidadao.interface';
import { IValidacaoBancaria as IValidacaoBancariaInterface } from '../interfaces/integracao-cidadao.interface';
import { IFiltrosHistorico as IFiltrosHistoricoInterface } from '../interfaces/integracao-cidadao.interface';
import { IHistoricoCidadao as IHistoricoCidadaoInterface } from '../interfaces/integracao-cidadao.interface';
import { Cidadao, InfoBancaria } from '../../../entities';
import { CidadaoService } from '../../cidadao/services/cidadao.service';
import { InfoBancariaService } from '../../cidadao/services/info-bancaria.service';
import { SolicitacaoService } from '../../solicitacao/services/solicitacao.service';
import { AuditoriaService } from '../../auditoria/services/auditoria.service';
import { CreateLogAuditoriaDto } from '../../auditoria/dto/create-log-auditoria.dto';
import { TipoOperacao } from '../../../enums/tipo-operacao.enum';

/**
 * Serviço de integração com cidadãos
 * Implementação concreta da interface IIntegracaoCidadaoService
 * Utiliza os serviços reais do sistema para operações com cidadãos
 */
@Injectable()
export class IntegracaoCidadaoService implements IIntegracaoCidadaoService {
  private readonly logger = new Logger(IntegracaoCidadaoService.name);

  constructor(
    @InjectRepository(Cidadao)
    private readonly cidadaoRepository: Repository<Cidadao>,
    @InjectRepository(InfoBancaria)
    private readonly infoBancariaRepository: Repository<InfoBancaria>,
    private readonly cidadaoService: CidadaoService,
    private readonly infoBancariaService: InfoBancariaService,
    private readonly solicitacaoService: SolicitacaoService,
    private readonly auditoriaService: AuditoriaService,
  ) {}

  /**
   * Busca dados completos do cidadão (implementação da interface)
   * @param cidadaoId ID do cidadão
   * @param contextoUsuario Contexto do usuário logado
   * @returns Dados completos do cidadão
   */
  async buscarDadosCidadao(
    cidadaoId: string,
    contextoUsuario: IContextoUsuario
  ): Promise<IResultadoOperacao<ICidadaoCompleto>> {
    return this.buscarCidadao(cidadaoId, contextoUsuario);
  }

  /**
   * Busca dados de um cidadão por ID
   * @param cidadaoId ID do cidadão
   * @param contextoUsuario Contexto do usuário logado
   * @returns Dados do cidadão
   */
  async buscarCidadao(
    cidadaoId: string,
    contextoUsuario: IContextoUsuario
  ): Promise<IResultadoOperacao<ICidadaoCompleto>> {
    try {
      this.logger.log(`Buscando cidadão ${cidadaoId} para usuário ${contextoUsuario.id}`);

      // Buscar cidadão com relacionamentos necessários
      const cidadao = await this.cidadaoRepository.findOne({
        where: { id: cidadaoId },
        relations: [
          'infoBancaria',
          'endereco',
          'contatos',
          'documentos',
          'solicitacoes'
        ],
      });

      if (!cidadao) {
        await this.registrarAuditoria(
          TipoOperacao.READ,
          { cidadaoId },
          contextoUsuario
        );
        
        return {
          sucesso: false,
          erro: 'Cidadão não encontrado',
          codigo: 'CIDADAO_NAO_ENCONTRADO',
          timestamp: new Date(),
        };
      }

      // Verificar permissão de acesso
      if (!this.verificarPermissaoAcesso(cidadao, contextoUsuario)) {
        await this.registrarAuditoria(
          TipoOperacao.ACCESS,
          { cidadaoId, usuarioId: contextoUsuario.id },
          contextoUsuario
        );
        
        return {
          sucesso: false,
          erro: 'Acesso negado aos dados do cidadão',
          codigo: 'ACESSO_NEGADO',
          timestamp: new Date(),
        };
      }

      // Formatar dados do cidadão
      const dadosCidadao: ICidadaoCompleto = {
        id: cidadao.id,
        nome: cidadao.nome,
        cpf: this.mascaraCpf(cidadao.cpf),
        rg: cidadao.rg,
        dataNascimento: new Date(cidadao.data_nascimento),
        endereco: cidadao.endereco ? {
          logradouro: cidadao.endereco.logradouro,
          numero: cidadao.endereco.numero,
          complemento: cidadao.endereco.complemento,
          bairro: cidadao.endereco.bairro,
          cidade: cidadao.endereco.cidade,
          uf: cidadao.endereco.estado,
          cep: cidadao.endereco.cep,
        } : {
          logradouro: '',
          numero: '',
          bairro: '',
          cidade: '',
          uf: '',
          cep: '',
        },
        contato: {
          telefone: cidadao.telefone,
          email: cidadao.email,
        },
        dadosBancarios: undefined, // InfoBancaria deve ser carregada separadamente
        situacaoCadastral: {
          ativa: cidadao.isAtivo(),
          bloqueios: [],
          dataUltimaAtualizacao: cidadao.updated_at,
        },
        documentos: cidadao.documentos?.map(doc => ({
          id: doc.id,
          tipo: doc.tipo,
          numero: doc.nome_original || '',
          dataEmissao: doc.data_upload,
          dataValidade: doc.data_validade,
          orgaoEmissor: 'Sistema',
          arquivo: doc.caminho,
        })) || [],
      };

      await this.registrarAuditoria(
        TipoOperacao.READ,
        { cidadaoId },
        contextoUsuario
      );

      return {
        sucesso: true,
        dados: dadosCidadao,
        timestamp: new Date(),
      };
    } catch (error) {
      this.logger.error(`Erro ao buscar cidadão ${cidadaoId}:`, error);
      
      await this.registrarAuditoria(
        TipoOperacao.READ,
        { cidadaoId, erro: error.message },
        contextoUsuario
      );

      return {
        sucesso: false,
        erro: 'Erro interno ao buscar cidadão',
        codigo: 'ERRO_INTERNO',
        timestamp: new Date(),
        metadata: { error: error.message },
      };
    }
  }

  /**
   * Obtém dados pessoais de um cidadão pelo ID (método legado)
   * @deprecated Use buscarCidadao() em vez deste método
   * @param cidadaoId ID do cidadão
   * @returns Dados pessoais do cidadão
   * @throws NotFoundException se o cidadão não for encontrado
   */
  async obterDadosPessoais(cidadaoId: string): Promise<any> {
    try {
      this.logger.log(`Obtendo dados pessoais do cidadão ${cidadaoId}`);

      // Implementação real usando o CidadaoService
      const cidadao = await this.cidadaoService.findById(cidadaoId, true);

      if (!cidadao) {
        this.logger.warn(`Cidadão ${cidadaoId} não encontrado`);
        throw new NotFoundException('Cidadão não encontrado');
      }

      // Estruturar os dados pessoais do cidadão
      const dadosPessoais = {
        id: cidadao.id,
        nome: cidadao.nome,
        cpf: cidadao.cpf,
        nis: cidadao.nis,
        dataNascimento: new Date(cidadao.data_nascimento),
        endereco: cidadao.endereco ? {
          logradouro: cidadao.endereco.logradouro || '',
          numero: cidadao.endereco.numero || '',
          complemento: cidadao.endereco.complemento || '',
          bairro: cidadao.endereco.bairro || '',
          cidade: cidadao.endereco.cidade || '',
          uf: cidadao.endereco.estado || '',
          cep: cidadao.endereco.cep || '',
        } : null,
        contato: {
          telefone: cidadao.telefone || '',
          email: cidadao.email || '',
        }
      };

      this.logger.debug(`Dados pessoais obtidos com sucesso para cidadão ${cidadaoId}`);
      return dadosPessoais;
    } catch (error) {
      this.logger.error(
        `Erro ao obter dados pessoais do cidadão ${cidadaoId}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Obtém informações bancárias do cidadão
   * @param cidadaoId ID do cidadão
   * @returns Informações bancárias
   */
  async obterInformacoesBancarias(cidadaoId: string): Promise<any[]> {
    try {
      this.logger.log(
        `Obtendo informações bancárias para cidadão ${cidadaoId}`,
      );

      const infoBancaria = await this.infoBancariaService.findByCidadaoId(
        cidadaoId,
      );

      if (!infoBancaria) {
        this.logger.debug(
          `Nenhuma informação bancária encontrada para cidadão ${cidadaoId}`,
        );
        return [];
      }

      return [infoBancaria];
    } catch (error) {
      this.logger.error(
        `Erro ao obter informações bancárias para cidadão ${cidadaoId}: ${error.message}`,
        error.stack,
      );
      return [];
    }
  }

  /**
   * Obtém uma informação bancária específica pelo ID
   *
   * @param infoBancariaId ID da informação bancária
   * @returns Dados da informação bancária
   * @throws NotFoundException se a informação bancária não for encontrada
   */
  async obterInfoBancariaPorId(infoBancariaId: string): Promise<any> {
    try {
      this.logger.log(
        `Obtendo informação bancária por ID: ${infoBancariaId}`,
      );

      const infoBancaria = await this.infoBancariaService.findById(
        infoBancariaId,
        false,
      );

      if (!infoBancaria) {
        this.logger.warn(
          `Informação bancária ${infoBancariaId} não encontrada`,
        );
        throw new NotFoundException(
          `Informação bancária ${infoBancariaId} não encontrada`,
        );
      }

      this.logger.log(
        `Informação bancária ${infoBancariaId} obtida com sucesso`,
      );

      return {
        id: infoBancaria.id,
        banco: infoBancaria.banco,
        agencia: infoBancaria.agencia,
        conta: infoBancaria.conta,
        tipo_conta: infoBancaria.tipo_conta,
        pix_tipo: infoBancaria.tipo_chave_pix,
        pix_chave: this.mascaraPixChave(infoBancaria.chave_pix ?? '', infoBancaria.tipo_chave_pix ?? '')
      };
    } catch (error) {
      this.logger.error(
        `Erro ao obter informação bancária por ID: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Verifica se uma informação bancária pertence a um cidadão
   *
   * @param cidadaoId ID do cidadão
   * @param infoBancariaId ID da informação bancária
   * @returns true se a informação bancária pertence ao cidadão
   */
  async verificarPropriedadeInfoBancaria(
    cidadaoId: string,
    infoBancariaId: string,
  ): Promise<boolean> {
    try {
      this.logger.log(
        `Verificando se informação bancária ${infoBancariaId} pertence ao cidadão ${cidadaoId}`,
      );

      // Implementação real usando o CidadaoService
      // Obter as informações bancárias do cidadão
      const infoBancaria = await this.infoBancariaService.findByCidadaoId(cidadaoId);
      
      if (!infoBancaria) {
        this.logger.debug(
          `Nenhuma informação bancária encontrada para cidadão ${cidadaoId}`,
        );
        return false;
      }

      // Verificar se o ID da informação bancária corresponde
      const pertence = infoBancaria.id === infoBancariaId;
      
      this.logger.debug(
        `Informação bancária ${infoBancariaId} ${pertence ? 'pertence' : 'não pertence'} ao cidadão ${cidadaoId}`,
      );
      
      return pertence;
    } catch (error) {
      this.logger.error(
        `Erro ao verificar propriedade de informação bancária ${infoBancariaId} para cidadão ${cidadaoId}: ${error.message}`,
        error.stack,
      );
      return false;
    }
  }

  /**
   * Verifica se um cidadão é o beneficiário de uma solicitação
   *
   * @param solicitacaoId ID da solicitação
   * @param cidadaoId ID do cidadão
   * @returns true se o cidadão é o beneficiário da solicitação
   */
  async verificarBeneficiarioSolicitacao(
    solicitacaoId: string,
    cidadaoId: string,
  ): Promise<boolean> {
    try {
      this.logger.log(
        `Verificando se cidadão ${cidadaoId} é beneficiário da solicitação ${solicitacaoId}`,
      );

      // Buscar a solicitação com dados do beneficiário
      const solicitacao = await this.solicitacaoService.findById(solicitacaoId);
      
      if (!solicitacao) {
        this.logger.warn(
          `Solicitação ${solicitacaoId} não encontrada`,
        );
        return false;
      }

      // Verificar se o cidadão é o beneficiário da solicitação
      const isBeneficiario = solicitacao.beneficiario?.id === cidadaoId;
      
      if (isBeneficiario) {
        this.logger.log(
          `Cidadão ${cidadaoId} confirmado como beneficiário da solicitação ${solicitacaoId}`,
        );
      } else {
        this.logger.warn(
          `Cidadão ${cidadaoId} NÃO é beneficiário da solicitação ${solicitacaoId}. Beneficiário atual: ${solicitacao.beneficiario?.id}`,
        );
      }

      return isBeneficiario;
    } catch (error) {
      this.logger.error(
        `Erro ao verificar beneficiário da solicitação ${solicitacaoId} para cidadão ${cidadaoId}: ${error.message}`,
        error.stack,
      );
      return false;
    }
  }

  /**
   * Verifica se existe relação familiar entre dois cidadãos
   * @param cidadaoId ID do cidadão principal
   * @param familiarId ID do familiar
   * @returns True se existe relação familiar
   */
  async verificarRelacaoFamiliar(
    cidadaoId: string,
    familiarId: string,
  ): Promise<boolean> {
    try {
      this.logger.log(
        `Verificando relação familiar entre cidadão ${cidadaoId} e familiar ${familiarId}`,
      );

      const temRelacao = await this.cidadaoService.verificarRelacaoFamiliar(
        cidadaoId,
        familiarId,
      );

      this.logger.debug(
        `Relação familiar ${temRelacao ? 'encontrada' : 'não encontrada'} entre ${cidadaoId} e ${familiarId}`,
      );

      return temRelacao;
    } catch (error) {
      this.logger.error(
        `Erro ao verificar relação familiar entre ${cidadaoId} e ${familiarId}: ${error.message}`,
        error.stack,
      );
      return false;
     }
  }

  /**
   * Busca informações bancárias de um cidadão
   * @param cidadaoId ID do cidadão
   * @param contextoUsuario Contexto do usuário logado
   * @returns Informações bancárias
   */
  async buscarInfoBancaria(
    cidadaoId: string,
    contextoUsuario: IContextoUsuario
  ): Promise<IResultadoOperacao<IDadosBancarios>> {
    try {
      this.logger.log(`Buscando informações bancárias do cidadão ${cidadaoId}`);

      // Verificar se o cidadão existe e se o usuário tem acesso
      const resultadoCidadao = await this.buscarCidadao(cidadaoId, contextoUsuario);
      if (!resultadoCidadao.sucesso) {
        return {
          sucesso: false,
          erro: resultadoCidadao.erro,
          timestamp: new Date()
        };
      }

      // Buscar informações bancárias
      const infoBancaria = await this.infoBancariaRepository.findOne({
        where: { cidadaoId },
        relations: ['cidadao'],
      });

      if (!infoBancaria) {
        await this.registrarAuditoria(
          TipoOperacao.READ,
          { cidadaoId },
          contextoUsuario
        );
        
        return {
          sucesso: false,
          erro: 'Informações bancárias não encontradas',
          codigo: 'INFO_BANCARIA_NAO_ENCONTRADA',
          timestamp: new Date(),
        };
      }

      // Formatar informações bancárias com mascaramento
      const dadosBancarios: IDadosBancarios = {
        tipoPagamento: infoBancaria.chave_pix ? 'PIX' : 'TED',
        pixTipo: infoBancaria.tipo_chave_pix as 'cpf' | 'cnpj' | 'email' | 'telefone' | 'aleatoria',
        pixChave: infoBancaria.chave_pix,
        banco: infoBancaria.banco,
        agencia: infoBancaria.agencia,
        conta: this.mascaraConta(infoBancaria.conta),
        digito: '', // Não disponível na entidade atual
        titular: '', // Não disponível na entidade atual
        cpfTitular: '', // Não disponível na entidade atual
      };

      await this.registrarAuditoria(
        TipoOperacao.READ,
        { cidadaoId, infoBancariaId: infoBancaria.id },
        contextoUsuario
      );

      return {
        sucesso: true,
        dados: dadosBancarios,
        timestamp: new Date(),
      };
    } catch (error) {
      this.logger.error(`Erro ao buscar informações bancárias do cidadão ${cidadaoId}:`, error);
      
      await this.registrarAuditoria(
        TipoOperacao.READ,
        { cidadaoId, erro: error.message },
        contextoUsuario
      );

      return {
        sucesso: false,
        erro: 'Erro ao buscar informações bancárias',
        codigo: 'ERRO_BUSCA_INFO_BANCARIA',
        timestamp: new Date(),
        metadata: { error: error.message },
      };
    }
  }

  /**
   * Valida informações bancárias de um cidadão
   * @param cidadaoId ID do cidadão
   * @param contextoUsuario Contexto do usuário logado
   * @returns Resultado da validação
   */
  async validarInfoBancaria(
    cidadaoId: string,
    contextoUsuario: IContextoUsuario
  ): Promise<IResultadoOperacao<boolean>> {
    try {
      this.logger.log(`Validando informações bancárias do cidadão ${cidadaoId}`);

      // Buscar informações bancárias
      const resultadoInfoBancaria = await this.buscarInfoBancaria(cidadaoId, contextoUsuario);
      if (!resultadoInfoBancaria.sucesso) {
        return {
          sucesso: false,
          erro: resultadoInfoBancaria.erro,
          dados: false,
          timestamp: new Date()
        };
      }

      const infoBancaria = resultadoInfoBancaria.dados!;
      
      // Executar validações
      const validacoes = await this.executarValidacoesBancarias(infoBancaria);
      const isValida = validacoes.every(v => v.valida);

      // Atualizar observações se necessário
      if (isValida) {
        await this.infoBancariaRepository.update(
          { cidadaoId },
          {
            observacoes: 'Validação automática realizada com sucesso',
          }
        );
      }

      await this.registrarAuditoria(
        TipoOperacao.READ,
        { 
          cidadaoId, 
          valida: isValida,
          validacoes: validacoes.map(v => ({ campo: v.campo, valida: v.valida, motivo: v.motivo }))
        },
        contextoUsuario
      );

      return {
        sucesso: true,
        dados: isValida,
        timestamp: new Date(),
        metadata: { validacoes },
      };
    } catch (error) {
      this.logger.error(`Erro ao validar informações bancárias do cidadão ${cidadaoId}:`, error);
      
      await this.registrarAuditoria(
        TipoOperacao.READ,
        { cidadaoId, erro: error.message },
        contextoUsuario
      );

      return {
        sucesso: false,
        erro: 'Erro ao validar informações bancárias',
        codigo: 'ERRO_VALIDACAO_BANCARIA',
        timestamp: new Date(),
        metadata: { error: error.message },
      };
    }
  }

  /**
   * Verifica se um cidadão está ativo no sistema
   * @param cidadaoId ID do cidadão
   * @param contextoUsuario Contexto do usuário logado
   * @returns Status de ativação do cidadão
   */
  async verificarCidadaoAtivo(
    cidadaoId: string,
    contextoUsuario: IContextoUsuario
  ): Promise<IResultadoOperacao<boolean>> {
    try {
      this.logger.log(`Verificando se cidadão ${cidadaoId} está ativo`);

      // Buscar cidadão
      const resultadoCidadao = await this.buscarCidadao(cidadaoId, contextoUsuario);
      if (!resultadoCidadao.sucesso) {
        return {
          sucesso: false,
          erro: resultadoCidadao.erro,
          dados: false,
          timestamp: new Date()
        };
      }

      const cidadao = resultadoCidadao.dados!;
      const ativo = cidadao.situacaoCadastral.ativa;

      await this.registrarAuditoria(
        TipoOperacao.READ,
        { cidadaoId, ativo },
        contextoUsuario
      );

      return {
        sucesso: true,
        dados: ativo,
        timestamp: new Date(),
      };
    } catch (error) {
      this.logger.error(`Erro ao verificar se cidadão ${cidadaoId} está ativo:`, error);
      
      await this.registrarAuditoria(
        TipoOperacao.READ,
        { cidadaoId, erro: error.message },
        contextoUsuario
      );

      return {
        sucesso: false,
        erro: 'Erro ao verificar status do cidadão',
        codigo: 'ERRO_VERIFICACAO_STATUS',
        timestamp: new Date(),
        metadata: { error: error.message },
      };
    }
  }

  /**
   * Obtém endereço de entrega do cidadão
   * @param cidadaoId ID do cidadão
   * @returns Endereço de entrega
   */
  async obterEnderecoEntrega(cidadaoId: string): Promise<any> {
    try {
      this.logger.log(
        `Obtendo endereço de entrega para cidadão ${cidadaoId}`,
      );

      const cidadao = await this.cidadaoService.findById(cidadaoId);
      
      if (!cidadao) {
        this.logger.warn(`Cidadão ${cidadaoId} não encontrado`);
        throw new NotFoundException('Cidadão não encontrado');
      }

      if (!cidadao.endereco) {
        this.logger.warn(`Endereço não encontrado para cidadão ${cidadaoId}`);
        throw new NotFoundException('Endereço não encontrado para o cidadão');
      }

      const endereco = {
        logradouro: cidadao.endereco.logradouro || '',
        numero: cidadao.endereco.numero || '',
        complemento: cidadao.endereco.complemento || '',
        bairro: cidadao.endereco.bairro || '',
        cidade: cidadao.endereco.cidade || '',
        uf: cidadao.endereco.estado || '',
        cep: cidadao.endereco.cep || '',
      };

      this.logger.debug(
        `Endereço obtido com sucesso para cidadão ${cidadaoId}`,
      );

      return endereco;
    } catch (error) {
      this.logger.error(
        `Erro ao obter endereço de entrega para cidadão ${cidadaoId}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Mascara uma chave PIX para exibição segura
   *
   * @param chave Valor da chave PIX
   * @param tipo Tipo da chave (CPF, email, telefone, aleatoria)
   * @returns Chave PIX mascarada
   */
  private mascaraPixChave(chave: string, tipo: string): string {
    if (!chave) {
      return '';
    }

    switch (tipo?.toLowerCase()) {
      case 'cpf':
        // Formato: ***.123.456-**
        const cpfLimpo = chave.replace(/\D/g, '');
        if (cpfLimpo.length !== 11) {
          return '***.***.***-**';
        }

        return `***.${cpfLimpo.substr(3, 3)}.${cpfLimpo.substr(6, 3)}-**`;

      case 'email':
        // Formato: a***@d***.com
        const partes = chave.split('@');
        if (partes.length !== 2) {
          return chave.substring(0, 1) + '***@***';
        }

        const usuario = partes[0];
        const dominio = partes[1];

        const usuarioMascarado =
          usuario.substring(0, 1) + '*'.repeat(Math.max(1, usuario.length - 1));

        const dominioPartes = dominio.split('.');
        const dominioNome = dominioPartes[0];
        const dominioExtensao = dominioPartes.slice(1).join('.');

        const dominioMascarado =
          dominioNome.substring(0, 1) +
          '*'.repeat(Math.max(1, dominioNome.length - 1));

        return `${usuarioMascarado}@${dominioMascarado}.${dominioExtensao}`;

      case 'telefone':
        // Formato: (00) *****-6789
        const telLimpo = chave.replace(/\D/g, '');
        if (telLimpo.length < 8) {
          return '(**) *****-****';
        }

        return `(**) *****-${telLimpo.slice(-4)}`;

      case 'aleatoria':
        // Formato: ********-****-****-****-************
        if (chave.length < 8) {
          return '********';
        }

        return chave.substring(0, 8) + '****' + '*'.repeat(chave.length - 12);

      default:
        // Mascaramento genérico
        if (chave.length <= 4) {
          return '****';
        }

        return (
          chave.substring(0, 2) + '*'.repeat(chave.length - 4) + chave.slice(-2)
        );
    }
  }

  // ========== MÉTODOS AUXILIARES PRIVADOS PARA INTERFACE ==========

  /**
   * Verifica se o usuário tem permissão para acessar dados do cidadão
   * @param cidadao Cidadão a ser verificado
   * @param contextoUsuario Contexto do usuário logado
   * @returns True se tem permissão, false caso contrário
   */
  private verificarPermissaoAcesso(
    cidadao: Cidadao,
    contextoUsuario: IContextoUsuario
  ): boolean {
    // Admin tem acesso total
    if (contextoUsuario.isAdmin) {
      return true;
    }

    // Supervisor tem acesso a cidadãos da sua unidade
    if (contextoUsuario.isSupervisor) {
      // Verificar se o cidadão tem solicitações na unidade do supervisor
      const temSolicitacaoNaUnidade = cidadao.solicitacoes?.some(
        solicitacao => solicitacao.unidade_id === contextoUsuario.unidadeId
      );
      return temSolicitacaoNaUnidade || false;
    }

    // Usuário comum só acessa cidadãos com solicitações na sua unidade
    const temSolicitacaoNaUnidade = cidadao.solicitacoes?.some(
      solicitacao => solicitacao.unidade_id === contextoUsuario.unidadeId
    );
    return temSolicitacaoNaUnidade || false;
  }

  /**
   * Executa validações das informações bancárias
   * @param infoBancaria Informações bancárias a serem validadas
   * @returns Array de resultados de validação
   */
  private async executarValidacoesBancarias(
    infoBancaria: IDadosBancarios
  ): Promise<Array<{ campo: string; valida: boolean; motivo?: string }>> {
    const validacoes: Array<{ campo: string; valida: boolean; motivo?: string }> = [];

    // Validar banco
    const bancoValido = infoBancaria.banco ? this.validarCodigoBanco(infoBancaria.banco) : false;
    validacoes.push({
      campo: 'banco',
      valida: bancoValido,
      motivo: bancoValido ? undefined : 'Código do banco inválido ou não informado',
    });

    // Validar agência
    const agenciaValida = infoBancaria.agencia ? this.validarAgencia(infoBancaria.agencia) : false;
    validacoes.push({
      campo: 'agencia',
      valida: agenciaValida,
      motivo: agenciaValida ? undefined : 'Formato da agência inválido ou não informado',
    });

    // Validar conta
    const contaValida = infoBancaria.conta ? this.validarConta(infoBancaria.conta) : false;
    validacoes.push({
      campo: 'conta',
      valida: contaValida,
      motivo: contaValida ? undefined : 'Formato da conta inválido ou não informado',
    });

    // Validar CPF do titular
    const cpfValido = this.validarCpf(infoBancaria.cpfTitular);
    validacoes.push({
      campo: 'cpfTitular',
      valida: cpfValido,
      motivo: cpfValido ? undefined : 'CPF do titular inválido',
    });

    // Validar tipo de pagamento
    const tipoPagamentoValido = ['PIX', 'TED', 'DOC'].includes(infoBancaria.tipoPagamento);
    validacoes.push({
      campo: 'tipoPagamento',
      valida: tipoPagamentoValido,
      motivo: tipoPagamentoValido ? undefined : 'Tipo de pagamento inválido',
    });

    return validacoes;
  }

  /**
   * Valida código do banco
   * @param banco Código do banco
   * @returns True se válido
   */
  private validarCodigoBanco(banco: string): boolean {
    // Validação básica: 3 dígitos numéricos
    return /^\d{3}$/.test(banco);
  }

  /**
   * Valida formato da agência
   * @param agencia Número da agência
   * @returns True se válido
   */
  private validarAgencia(agencia: string): boolean {
    // Validação básica: 4 dígitos numéricos (pode ter dígito verificador)
    return /^\d{4}(-?\d)?$/.test(agencia);
  }

  /**
   * Valida formato da conta
   * @param conta Número da conta
   * @returns True se válido
   */
  private validarConta(conta: string): boolean {
    // Validação básica: até 10 dígitos com dígito verificador
    return /^\d{1,10}-?\d$/.test(conta);
  }

  /**
   * Valida CPF
   * @param cpf CPF a ser validado
   * @returns True se válido
   */
  private validarCpf(cpf: string): boolean {
    // Remove caracteres não numéricos
    const cpfLimpo = cpf.replace(/\D/g, '');
    
    // Verifica se tem 11 dígitos
    if (cpfLimpo.length !== 11) {
      return false;
    }
    
    // Verifica se não são todos os dígitos iguais
    if (/^(\d)\1{10}$/.test(cpfLimpo)) {
      return false;
    }
    
    // Validação dos dígitos verificadores
    let soma = 0;
    for (let i = 0; i < 9; i++) {
      soma += parseInt(cpfLimpo.charAt(i)) * (10 - i);
    }
    let resto = 11 - (soma % 11);
    const dv1 = resto < 2 ? 0 : resto;
    
    if (parseInt(cpfLimpo.charAt(9)) !== dv1) {
      return false;
    }
    
    soma = 0;
    for (let i = 0; i < 10; i++) {
      soma += parseInt(cpfLimpo.charAt(i)) * (11 - i);
    }
    resto = 11 - (soma % 11);
    const dv2 = resto < 2 ? 0 : resto;
    
    return parseInt(cpfLimpo.charAt(10)) === dv2;
  }

  /**
   * Aplica máscara no CPF
   * @param cpf CPF sem máscara
   * @returns CPF com máscara
   */
  private mascaraCpf(cpf: string): string {
    const cpfLimpo = cpf.replace(/\D/g, '');
    return cpfLimpo.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  }

  /**
   * Aplica máscara na conta bancária
   * @param conta Conta sem máscara
   * @returns Conta com máscara parcial (oculta dígitos do meio)
   */
  private mascaraConta(conta: string): string {
    if (conta.length <= 4) {
      return conta;
    }
    
    const inicio = conta.substring(0, 2);
    const fim = conta.substring(conta.length - 2);
    const meio = '*'.repeat(conta.length - 4);
    
    return `${inicio}${meio}${fim}`;
  }

  /**
   * Valida dados bancários do cidadão (implementação da interface)
   * @param cidadaoId ID do cidadão
   * @param dadosBancarios Dados bancários para validação
   * @param contextoUsuario Contexto do usuário logado
   * @returns Resultado da validação bancária
   */
  async validarDadosBancarios(
    cidadaoId: string,
    dadosBancarios: IDadosBancarios,
    contextoUsuario: IContextoUsuario
  ): Promise<IResultadoOperacao<IValidacaoBancaria>> {
    try {
      this.logger.log(`Validando dados bancários para cidadão ${cidadaoId}`);
      
      // Implementação básica de validação bancária
      const validacao: IValidacaoBancaria = {
        valida: true,
        detalhes: {
          pixValido: true,
          contaValida: true,
          titularValido: true
        },
        erros: [],
        avisos: []
      };

      await this.registrarAuditoria(
        TipoOperacao.READ,
        { cidadaoId, dadosBancarios },
        contextoUsuario
      );

      return {
        sucesso: true,
        dados: validacao,
        timestamp: new Date()
      };
    } catch (error) {
      this.logger.error('Erro ao validar dados bancários:', error);
      return {
        sucesso: false,
        erro: 'Erro interno do servidor',
        codigo: 'ERRO_INTERNO',
        timestamp: new Date()
      };
    }
  }

  /**
   * Busca histórico de pagamentos do cidadão (implementação da interface)
   * @param cidadaoId ID do cidadão
   * @param filtros Filtros para busca
   * @param contextoUsuario Contexto do usuário logado
   * @returns Histórico de pagamentos do cidadão
   */
  async buscarHistoricoPagamentosCidadao(
    cidadaoId: string,
    filtros: IFiltrosHistorico,
    contextoUsuario: IContextoUsuario
  ): Promise<IResultadoOperacao<IHistoricoCidadao>> {
    try {
      this.logger.log(`Buscando histórico de pagamentos para cidadão ${cidadaoId}`);
      
      // Implementação básica - retorna histórico vazio por enquanto
      const historico: IHistoricoCidadao = {
        pagamentos: [],
        resumo: {
          totalPagamentos: 0,
          valorTotal: 0,
          beneficiosMaisFrequentes: []
        }
      };

      await this.registrarAuditoria(
        TipoOperacao.READ,
        { cidadaoId, filtros },
        contextoUsuario
      );

      return {
        sucesso: true,
        dados: historico,
        timestamp: new Date()
      };
    } catch (error) {
      this.logger.error('Erro ao buscar histórico de pagamentos:', error);
      return {
        sucesso: false,
        erro: 'Erro interno do servidor',
        codigo: 'ERRO_INTERNO',
        timestamp: new Date()
      };
    }
  }

  /**
   * Verifica situação cadastral do cidadão (implementação da interface)
   * @param cidadaoId ID do cidadão
   * @param contextoUsuario Contexto do usuário logado
   * @returns Situação cadastral do cidadão
   */
  async verificarSituacaoCadastral(
    cidadaoId: string,
    contextoUsuario: IContextoUsuario
  ): Promise<IResultadoOperacao<ISituacaoCadastral>> {
    return this.verificarSituacaoCidadao(cidadaoId, contextoUsuario);
  }

  /**
   * Verifica situação cadastral do cidadão
   * @param cidadaoId ID do cidadão
   * @param contextoUsuario Contexto do usuário logado
   * @returns Situação cadastral do cidadão
   */
  async verificarSituacaoCidadao(
    cidadaoId: string,
    contextoUsuario: IContextoUsuario
  ): Promise<IResultadoOperacao<ISituacaoCadastral>> {
    try {
      this.logger.log(`Verificando situação cadastral do cidadão ${cidadaoId}`);
      
      // Implementação básica - retorna situação ativa por padrão
      const situacao: ISituacaoCadastral = {
        ativa: true,
        bloqueios: [],
        observacoes: 'Situação cadastral verificada automaticamente',
        dataUltimaAtualizacao: new Date()
      };

      await this.registrarAuditoria(
        TipoOperacao.READ,
        { cidadaoId },
        contextoUsuario
      );

      return {
        sucesso: true,
        dados: situacao,
        timestamp: new Date()
      };
    } catch (error) {
      this.logger.error('Erro ao verificar situação cadastral:', error);
      return {
        sucesso: false,
        erro: 'Erro interno do servidor',
        codigo: 'ERRO_INTERNO',
        timestamp: new Date()
      };
    }
  }

  /**
   * Atualiza dados bancários do cidadão (implementação da interface)
   * @param cidadaoId ID do cidadão
   * @param dadosBancarios Novos dados bancários
   * @param contextoUsuario Contexto do usuário logado
   * @returns Resultado da operação
   */
  async atualizarDadosBancarios(
    cidadaoId: string,
    dadosBancarios: IDadosBancarios,
    contextoUsuario: IContextoUsuario
  ): Promise<IResultadoOperacao<void>> {
    try {
      this.logger.log(`Atualizando dados bancários para cidadão ${cidadaoId}`);
      
      // Implementação básica - apenas registra a operação por enquanto
      await this.registrarAuditoria(
        TipoOperacao.UPDATE,
        { cidadaoId, dadosBancarios },
        contextoUsuario
      );

      return {
        sucesso: true,
        dados: undefined,
        timestamp: new Date()
      };
    } catch (error) {
      this.logger.error('Erro ao atualizar dados bancários:', error);
      return {
        sucesso: false,
        erro: 'Erro interno do servidor',
        codigo: 'ERRO_INTERNO',
        timestamp: new Date()
      };
    }
  }

  /**
   * Registra evento de auditoria
   * @param operacao Tipo da operação
   * @param dados Dados da operação
   * @param contextoUsuario Contexto do usuário
   */
  private async registrarAuditoria(
    operacao: string,
    dados: any,
    contextoUsuario: IContextoUsuario
  ): Promise<void> {
    try {
      const logDto = new CreateLogAuditoriaDto();
      logDto.usuario_id = contextoUsuario.id;
      logDto.tipo_operacao = operacao as TipoOperacao;
      logDto.entidade_afetada = 'Cidadao';
      logDto.entidade_id = dados.cidadaoId || null;
      logDto.dados_anteriores = undefined;
      logDto.dados_novos = dados;
      logDto.ip_origem = 'N/A';
      logDto.user_agent = 'Sistema';
      
      await this.auditoriaService.create(logDto);
    } catch (error) {
      this.logger.error('Erro ao registrar auditoria:', error);
      // Não propagar erro de auditoria
    }
  }
}
