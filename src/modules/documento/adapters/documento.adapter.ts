import { Injectable } from '@nestjs/common';
import { IDadosDocumento } from '../interfaces/documento-pdf.interface';
import { AutorizacaoAtaudeTemplateDto, RequerenteDto, FunerariaDto, CemiterioDto, DadosAtaudeDto, TecnicoDto } from '@/common/pdf/dtos/autorizacao-ataude-template.dto';
import { BeneficiarioBaseDto, EnderecoDto, UnidadeBaseDto, PagamentoBaseDto, SolicitacaoDto } from '@/common/pdf/dtos/template-base.dto';

/**
 * Adapter para mapear dados entre o formato legado (IDadosDocumento) 
 * e o novo formato padronizado (DTOs do common/pdf)
 */
@Injectable()
export class DocumentoAdapter {
  /**
   * Converte IDadosDocumento para AutorizacaoAtaudeTemplateDto
   */
  converterParaAutorizacaoAtaude(dados: IDadosDocumento): AutorizacaoAtaudeTemplateDto {
    if (!dados) {
      throw new Error('Dados não fornecidos para conversão');
    }

    if (!dados.dados_ataude) {
      throw new Error('Dados específicos do ataúde não encontrados');
    }

    const dto = new AutorizacaoAtaudeTemplateDto();

    // Mapear beneficiário
    dto.beneficiario = this.mapearBeneficiario(dados);

    // Mapear unidade
    dto.unidade = this.mapearUnidade(dados);

    // Mapear pagamento/solicitação
    dto.pagamento = this.mapearPagamento(dados);

    // Mapear dados específicos do ataúde
    dto.dadosAtaude = this.mapearDadosAtaude(dados);

    // Mapear requerente (opcional)
    if (dados.requerente) {
      dto.requerente = this.mapearRequerente(dados);
    }

    // Mapear técnico (opcional)
    if (dados.tecnico) {
      dto.tecnico = this.mapearTecnico(dados);
    }

    // Mapear campos adicionais
    dto.numeroDocumento = dados.numero_documento;
    dto.dataGeracao = dados.data_geracao;
    dto.numeroAutorizacao = dados.protocolo || dados.solicitacao?.protocolo;
    dto.observacoes = dados.dados_ataude.observacoes;

    return dto;
  }

  /**
   * Mapeia dados do beneficiário
   */
  private mapearBeneficiario(dados: IDadosDocumento): BeneficiarioBaseDto {
    const beneficiario = new BeneficiarioBaseDto();
    
    beneficiario.nome = dados.beneficiario.nome;
    beneficiario.cpf = dados.beneficiario.cpf;
    beneficiario.rg = dados.beneficiario.rg;

    // Mapear endereço
    if (dados.beneficiario.endereco) {
      const endereco = new EnderecoDto();
      endereco.logradouro = dados.beneficiario.endereco.logradouro;
      endereco.numero = dados.beneficiario.endereco.numero;
      endereco.complemento = dados.beneficiario.endereco.complemento;
      endereco.bairro = dados.beneficiario.endereco.bairro;
      endereco.cidade = dados.beneficiario.endereco.cidade;
      endereco.estado = dados.beneficiario.endereco.estado;
      endereco.cep = dados.beneficiario.endereco.cep;
      
      beneficiario.endereco = endereco;
    } else {
      // Criar endereço vazio para atender validação
      const endereco = new EnderecoDto();
      endereco.logradouro = '_'.repeat(42);
      endereco.bairro = '_'.repeat(15);
      endereco.cidade = 'Natal';
      endereco.estado = 'RN';
      endereco.cep = '00000-000';
      
      beneficiario.endereco = endereco;
    }

    return beneficiario;
  }

  /**
   * Mapeia dados da unidade
   */
  private mapearUnidade(dados: IDadosDocumento): UnidadeBaseDto {
    const unidade = new UnidadeBaseDto();
    
    unidade.nome = dados.unidade.nome;
    unidade.codigo = dados.unidade.telefone; // Reutilizando campo telefone como código

    // Mapear endereço da unidade (opcional)
    if (dados.unidade.endereco) {
      const endereco = new EnderecoDto();
      endereco.logradouro = dados.unidade.endereco;
      endereco.bairro = 'Centro';
      endereco.cidade = 'Natal';
      endereco.estado = 'RN';
      endereco.cep = '59000-000';
      
      unidade.endereco = endereco;
    }

    return unidade;
  }

  /**
   * Mapeia dados do pagamento/solicitação
   */
  private mapearPagamento(dados: IDadosDocumento): PagamentoBaseDto {
    const pagamento = new PagamentoBaseDto();
    
    pagamento.id = dados.solicitacao.id;
    pagamento.valor = dados.dados_ataude?.valor_autorizado || dados.dados_ataude?.valor_urna || 0;
    pagamento.dataLiberacao = dados.solicitacao.dataAbertura;
    pagamento.metodoPagamento = 'Benefício Social';

    // Mapear solicitação
    const solicitacao = new SolicitacaoDto();
    solicitacao.protocolo = dados.solicitacao.protocolo;
    solicitacao.numeroMemorado = dados.numero_documento;
    
    pagamento.solicitacao = solicitacao;

    return pagamento;
  }

  /**
   * Mapeia dados específicos do ataúde
   */
  private mapearDadosAtaude(dados: IDadosDocumento): DadosAtaudeDto {
    const dadosAtaude = new DadosAtaudeDto();
    
    dadosAtaude.tipoUrna = dados.dados_ataude.tipo_urna;
    dadosAtaude.valorUrna = dados.dados_ataude.valor_urna;
    dadosAtaude.grauParentesco = dados.dados_ataude.grau_parentesco;
    dadosAtaude.valorAutorizado = dados.dados_ataude.valor_autorizado;
    dadosAtaude.dataAutorizacao = dados.dados_ataude.data_autorizacao;
    dadosAtaude.dataObito = dados.dados_ataude.data_obito;
    dadosAtaude.declaracaoObito = dados.dados_ataude.declaracao_obito;
    dadosAtaude.translado = dados.dados_ataude.translado;
    dadosAtaude.observacoes = dados.dados_ataude.observacoes;

    // Mapear funerária
    if (dados.dados_ataude.funeraria) {
      const funeraria = new FunerariaDto();
      funeraria.nome = dados.dados_ataude.funeraria.nome;
      funeraria.endereco = dados.dados_ataude.funeraria.endereco;
      funeraria.telefone = dados.dados_ataude.funeraria.telefone;
      
      dadosAtaude.funeraria = funeraria;
    }

    // Mapear cemitério
    if (dados.dados_ataude.cemiterio) {
      const cemiterio = new CemiterioDto();
      cemiterio.nome = dados.dados_ataude.cemiterio.nome;
      cemiterio.endereco = dados.dados_ataude.cemiterio.endereco;
      
      dadosAtaude.cemiterio = cemiterio;
    }

    return dadosAtaude;
  }

  /**
   * Mapeia dados do requerente
   */
  private mapearRequerente(dados: IDadosDocumento): RequerenteDto {
    const requerente = new RequerenteDto();
    
    requerente.nome = dados.requerente.nome;
    requerente.cpf = dados.requerente.cpf;
    requerente.rg = dados.requerente.rg;
    requerente.telefone = dados.requerente.telefone;
    requerente.parentesco = dados.requerente.parentesco;
    requerente.grauParentesco = dados.requerente.grau_parentesco;

    // Mapear endereço do requerente
    if (dados.requerente.endereco) {
      const endereco = new EnderecoDto();
      endereco.logradouro = dados.requerente.endereco.logradouro;
      endereco.numero = dados.requerente.endereco.numero;
      endereco.complemento = dados.requerente.endereco.complemento;
      endereco.bairro = dados.requerente.endereco.bairro;
      endereco.cidade = dados.requerente.endereco.cidade || 'Natal';
      endereco.estado = dados.requerente.endereco.estado || 'RN';
      endereco.cep = dados.requerente.endereco.cep || '00000-000';
      
      requerente.endereco = endereco;
    }

    return requerente;
  }

  /**
   * Mapeia dados do técnico
   */
  private mapearTecnico(dados: IDadosDocumento): TecnicoDto {
    const tecnico = new TecnicoDto();
    
    tecnico.nome = dados.tecnico.nome;
    tecnico.unidade = dados.tecnico.unidade;
    tecnico.matricula = dados.tecnico.matricula;
    tecnico.cargo = dados.tecnico.cargo;

    return tecnico;
  }
}