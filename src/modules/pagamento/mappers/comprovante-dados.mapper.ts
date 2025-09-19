import { Injectable } from '@nestjs/common';
import { Pagamento } from '../../../entities/pagamento.entity';
import { IDadosComprovante } from '../interfaces/comprovante-pdf.interface';
import { DadosComprovanteDto } from '../dtos/dados-comprovante.dto';

/**
 * Mapper para converter dados de entidades para o formato de comprovante
 */
@Injectable()
export class ComprovanteDadosMapper {
  /**
   * Mapeia uma entidade Pagamento para IDadosComprovante
   * @param pagamento Entidade de pagamento com relacionamentos carregados
   * @returns Dados formatados para o comprovante
   */
  public static mapearParaComprovante(pagamento: Pagamento): IDadosComprovante {
    if (!pagamento.solicitacao?.beneficiario) {
      throw new Error('Dados do beneficiário não encontrados');
    }

    if (!pagamento.solicitacao?.tipo_beneficio) {
      throw new Error('Tipo de benefício não encontrado');
    }

    const beneficiario = pagamento.solicitacao.beneficiario;
    const endereco = beneficiario.enderecos?.[0];
    const contatos = beneficiario.contatos?.[0]; 
    const infoBancaria = pagamento.info_bancaria;
    const tecnico = pagamento.solicitacao.tecnico;
    const unidade = pagamento.solicitacao.unidade;
    const dadosAluguelSocial = pagamento.solicitacao.dados_aluguel_social;
    const dadosCestaBasica = pagamento.solicitacao.dados_cesta_basica

    return {
      beneficiario: {
        nome: beneficiario.nome,
        cpf: this.formatarCpf(beneficiario.cpf),
        rg: beneficiario.rg || undefined,
        endereco: endereco ? {
          logradouro: endereco.logradouro,
          numero: endereco.numero,
          complemento: endereco.complemento || undefined,
          bairro: endereco.bairro,
          cidade: endereco.cidade,
          estado: endereco.estado,
          cep: this.formatarCep(endereco.cep),
        } : undefined,
        contatos: contatos
          ? {
              telefone: contatos.telefone || undefined,
              email: contatos.email || undefined,
            }
          : undefined,
      },
      pagamento: {
        id: pagamento.id,
        solicitacao_id: pagamento.solicitacao.id,
        valor: Number(pagamento.valor),
        dataLiberacao: pagamento.data_liberacao || new Date(),
        metodoPagamento: pagamento.metodo_pagamento || 'Não informado',
        numeroParcela: pagamento.numero_parcela || undefined,
        totalParcelas: pagamento.total_parcelas || undefined,
        status: pagamento.status,
        tipoBeneficio: {
          nome: pagamento.solicitacao.tipo_beneficio.nome,
          codigo: pagamento.solicitacao.tipo_beneficio.codigo,
          descricao: pagamento.solicitacao.tipo_beneficio.descricao || undefined,
        },
        solicitacao: {
          protocolo: pagamento.solicitacao.protocolo,
          dadosEspecificos: dadosAluguelSocial || dadosCestaBasica || undefined,
        },
      },
      unidade: {
        nome: unidade?.nome || 'SEMTAS - Secretaria Municipal de Trabalho e Assistência Social',
        endereco: unidade?.endereco || undefined,
        telefone: unidade?.telefone || undefined,
        email: unidade?.email || undefined,
      },
      tecnico: tecnico
        ? {
            nome: tecnico.nome,
            matricula: tecnico.matricula || undefined,
            cargo: tecnico.role?.nome || undefined,
          }
        : undefined,
      dadosBancarios: infoBancaria
        ? {
            banco: infoBancaria.banco || undefined,
            agencia: infoBancaria.agencia || undefined,
            conta: infoBancaria.conta || undefined,
            tipoConta: infoBancaria.tipo_conta || undefined,
            chavePix: infoBancaria.chave_pix || undefined,
          }
        : undefined,
      locador: dadosAluguelSocial
        ? {
            nome: dadosAluguelSocial.nome_locador || undefined,
            cpf: dadosAluguelSocial.cpf_locador ? this.formatarCpf(dadosAluguelSocial.cpf_locador) : undefined,
          }
        : undefined,
      imovel: dadosAluguelSocial
        ? {
            endereco: dadosAluguelSocial.endereco_imovel_pretendido || undefined,
          }
        : undefined,
      dataGeracao: new Date(),
      numeroComprovante: this.gerarNumeroComprovante(pagamento),
    };
  }

  /**
   * Mapeia um DTO para IDadosComprovante
   * @param dto DTO com dados do comprovante
   * @returns Dados formatados para o comprovante
   */
  public static mapearDtoParaComprovante(dto: DadosComprovanteDto): IDadosComprovante {
    return {
      beneficiario: {
        nome: dto.beneficiario.nome,
        cpf: dto.beneficiario.cpf,
        rg: dto.beneficiario.rg,
        endereco: dto.beneficiario.endereco ? {
          logradouro: dto.beneficiario.endereco.logradouro,
          numero: dto.beneficiario.endereco.numero,
          complemento: dto.beneficiario.endereco.complemento,
          bairro: dto.beneficiario.endereco.bairro,
          cidade: dto.beneficiario.endereco.cidade,
          estado: dto.beneficiario.endereco.estado,
          cep: dto.beneficiario.endereco.cep,
        } : undefined,
        contatos: dto.beneficiario.contatos
          ? {
              telefone: dto.beneficiario.contatos.telefone,
              email: dto.beneficiario.contatos.email,
            }
          : undefined,
      },
      pagamento: {
        id: dto.pagamento.id,
        solicitacao_id: dto.pagamento.solicitacao_id,
        valor: dto.pagamento.valor,
        dataLiberacao: dto.pagamento.dataLiberacao,
        metodoPagamento: dto.pagamento.metodoPagamento,
        numeroParcela: dto.pagamento.numeroParcela,
        totalParcelas: dto.pagamento.totalParcelas,
        status: dto.pagamento.status,
        tipoBeneficio: {
          nome: dto.pagamento.tipoBeneficio.nome,
          codigo: dto.pagamento.tipoBeneficio.codigo,
          descricao: dto.pagamento.tipoBeneficio.descricao,
        },
        solicitacao: {
          protocolo: dto.pagamento.solicitacao.protocolo,
          dadosEspecificos: dto.pagamento.solicitacao.dadosEspecificos,
        },
      },
      unidade: {
        nome: dto.unidade.nome,
        endereco: dto.unidade.endereco,
        telefone: dto.unidade.telefone,
        email: dto.unidade.email,
      },
      tecnico: dto.tecnico
        ? {
            nome: dto.tecnico.nome,
            matricula: dto.tecnico.matricula,
            cargo: dto.tecnico.cargo,
          }
        : undefined,
      dadosBancarios: dto.dadosBancarios
        ? {
            banco: dto.dadosBancarios.banco,
            agencia: dto.dadosBancarios.agencia,
            conta: dto.dadosBancarios.conta,
            tipoConta: dto.dadosBancarios.tipoConta,
            chavePix: dto.dadosBancarios.chavePix,
          }
        : undefined,
      dataGeracao: dto.dataGeracao,
      numeroComprovante: dto.numeroComprovante,
    };
  }

  /**
   * Formata CPF para exibição
   * @param cpf CPF sem formatação
   * @returns CPF formatado (XXX.XXX.XXX-XX)
   */
  private static formatarCpf(cpf: string): string {
    if (!cpf) return '';
    
    const apenasNumeros = cpf.replace(/\D/g, '');
    
    if (apenasNumeros.length !== 11) {
      return cpf; // Retorna original se não tiver 11 dígitos
    }
    
    return apenasNumeros.replace(
      /(\d{3})(\d{3})(\d{3})(\d{2})/,
      '$1.$2.$3-$4'
    );
  }

  /**
   * Formata CEP para exibição
   * @param cep CEP sem formatação
   * @returns CEP formatado (XXXXX-XXX)
   */
  private static formatarCep(cep: string): string {
    if (!cep) return '';
    
    const apenasNumeros = cep.replace(/\D/g, '');
    
    if (apenasNumeros.length !== 8) {
      return cep; // Retorna original se não tiver 8 dígitos
    }
    
    return apenasNumeros.replace(/(\d{5})(\d{3})/, '$1-$2');
  }

  /**
   * Gera número único para o comprovante
   * @param pagamento Entidade de pagamento
   * @returns Número do comprovante
   */
  private static gerarNumeroComprovante(pagamento: Pagamento): string {
    const ano = new Date().getFullYear();
    const mes = String(new Date().getMonth() + 1).padStart(2, '0');
    const idPagamento = pagamento.id.slice(-8).toUpperCase(); // Últimos 8 caracteres do ID
    
    return `COMP-${ano}${mes}-${idPagamento}`;
  }

  /**
   * Valida se todos os dados necessários estão presentes
   * @param pagamento Entidade de pagamento
   * @throws Error se dados obrigatórios estiverem ausentes
   */
  public static validarDadosObrigatorios(pagamento: Pagamento): void {
    const erros: string[] = [];
    const isAluguelSocial = pagamento.solicitacao?.tipo_beneficio?.codigo === 'aluguel-social';

    if (!pagamento.solicitacao) {
      erros.push('Solicitação não encontrada');
    } else {
      if (!pagamento.solicitacao.beneficiario) {
        erros.push('Beneficiário não encontrado');
      } else {
        if (!pagamento.solicitacao.beneficiario.nome) {
          erros.push('Nome do beneficiário é obrigatório');
        }
        if (!pagamento.solicitacao.beneficiario.cpf) {
          erros.push('CPF do beneficiário é obrigatório');
        }
      }

      if (!pagamento.solicitacao.tipo_beneficio) {
        erros.push('Tipo de benefício não encontrado');
      }
    }

    if (!pagamento.valor) {
      erros.push('Valor do pagamento é obrigatório');
    }

    // Data de liberação é opcional - usar data atual se não fornecida
    // if (!pagamento.data_liberacao) {
    //   erros.push('Data de liberação é obrigatória');
    // }

    if (erros.length > 0) {
      throw new Error(`Dados obrigatórios ausentes: ${erros.join(', ')}`);
    }
  }

  /**
   * Cria dados de exemplo para testes
   * @returns Dados de exemplo para comprovante
   */
  public static criarDadosExemplo(): IDadosComprovante {
    return {
      beneficiario: {
        nome: 'João da Silva Santos',
        cpf: '123.456.789-00',
        rg: '12.345.678-9',
        endereco: {
          logradouro: 'Rua das Flores',
          numero: '123',
          complemento: 'Apto 45',
          bairro: 'Centro',
          cidade: 'São Paulo',
          estado: 'SP',
          cep: '01234-567',
        },
        contatos: {
          telefone: '(11) 99999-9999',
          email: 'joao.silva@email.com',
        },
      },
      pagamento: {
        id: 'uuid-exemplo-123',
        solicitacao_id: 'uuid-solicitacao-456',
        valor: 150.50,
        dataLiberacao: new Date('2024-01-15'),
        metodoPagamento: 'PIX',
        numeroParcela: 1,
        totalParcelas: 3,
        status: 'LIBERADO',
        tipoBeneficio: {
          nome: 'Cesta Básica',
          codigo: 'cesta-basica',
          descricao: 'Benefício de segurança alimentar',
        },
        solicitacao: {
          protocolo: 'SOL20240001234',
          dadosEspecificos: {}
        },
      },
      unidade: {
        nome: 'SEMTAS - Secretaria Municipal de Trabalho e Assistência Social',
        endereco: 'Av. Principal, 1000 - Centro',
        telefone: '(11) 3333-4444',
        email: 'semtas@prefeitura.gov.br',
      },
      tecnico: {
        nome: 'Maria Santos Oliveira',
        matricula: '12345',
        cargo: 'Assistente Social',
      },
      dadosBancarios: {
        banco: 'Banco do Brasil',
        agencia: '1234-5',
        conta: '67890-1',
        tipoConta: 'Conta Corrente',
        chavePix: 'joao.silva@email.com',
      },
      dataGeracao: new Date(),
      numeroComprovante: 'COMP-202401-ABC12345',
    };
  }
}