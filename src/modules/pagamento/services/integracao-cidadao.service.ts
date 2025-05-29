import { Injectable, NotFoundException } from '@nestjs/common';

/**
 * Serviço de integração com o módulo de Cidadão
 * 
 * Implementa a comunicação entre o módulo de Pagamento e o módulo de Cidadão,
 * permitindo obter dados pessoais e informações bancárias dos beneficiários.
 * 
 * @author Equipe PGBen
 */
@Injectable()
export class IntegracaoCidadaoService {
  // Em uma implementação real, este serviço injetaria o CidadaoService do módulo de cidadão
  // constructor(private readonly cidadaoService: CidadaoService) {}

  /**
   * Obtém dados pessoais de um cidadão pelo ID
   * 
   * @param cidadaoId ID do cidadão
   * @returns Dados pessoais do cidadão
   * @throws NotFoundException se o cidadão não for encontrado
   */
  async obterDadosPessoais(cidadaoId: string): Promise<any> {
    // Em uma implementação real, chamaria o serviço de cidadão
    // const cidadao = await this.cidadaoService.findOne(cidadaoId);
    
    // if (!cidadao) {
    //   throw new NotFoundException('Cidadão não encontrado');
    // }
    
    // return {
    //   id: cidadao.id,
    //   nome: cidadao.nome,
    //   cpf: cidadao.cpf,
    //   dataNascimento: cidadao.dataNascimento,
    //   endereco: cidadao.endereco,
    //   contato: {
    //     telefone: cidadao.telefone,
    //     email: cidadao.email
    //   }
    // };

    // Implementação de mock para desenvolvimento
    console.log(`[INTEGRAÇÃO] Obtendo dados pessoais do cidadão ${cidadaoId}`);
    
    // Dados fictícios para desenvolvimento
    return {
      id: cidadaoId,
      nome: 'Maria da Silva',
      cpf: '123.456.789-00',
      dataNascimento: '1985-05-10',
      endereco: {
        logradouro: 'Rua das Flores',
        numero: '123',
        complemento: 'Apto 101',
        bairro: 'Centro',
        cidade: 'Natal',
        uf: 'RN',
        cep: '59000-000'
      },
      contato: {
        telefone: '(84) 98765-4321',
        email: 'maria.silva@exemplo.com'
      }
    };
  }

  /**
   * Obtém informações bancárias de um cidadão
   * 
   * @param cidadaoId ID do cidadão
   * @returns Lista de informações bancárias cadastradas
   */
  async obterInformacoesBancarias(cidadaoId: string): Promise<any[]> {
    // Em uma implementação real, chamaria o serviço de cidadão
    // const infoBancarias = await this.cidadaoService.getInformacoesBancarias(cidadaoId);
    
    // if (!infoBancarias || infoBancarias.length === 0) {
    //   return [];
    // }
    
    // return infoBancarias.map(info => ({
    //   id: info.id,
    //   banco: info.banco,
    //   agencia: info.agencia,
    //   conta: info.conta,
    //   tipoConta: info.tipoConta,
    //   pixTipo: info.pixTipo,
    //   pixChave: this.mascaraPixChave(info.pixChave, info.pixTipo),
    //   principal: info.principal,
    //   createdAt: info.createdAt
    // }));

    // Implementação de mock para desenvolvimento
    console.log(`[INTEGRAÇÃO] Obtendo informações bancárias do cidadão ${cidadaoId}`);
    
    // Dados fictícios para desenvolvimento
    return [
      {
        id: 'info-bancaria-1',
        banco: '001',
        nomeBanco: 'Banco do Brasil',
        agencia: '1234',
        conta: '12345-6',
        tipoConta: 'Corrente',
        principal: true,
        createdAt: '2025-01-15T10:30:00Z'
      },
      {
        id: 'info-bancaria-2',
        pixTipo: 'email',
        pixChave: 'm****@e****.com', // mascarado para segurança
        principal: false,
        createdAt: '2025-02-20T14:45:00Z'
      },
      {
        id: 'info-bancaria-3',
        banco: '104',
        nomeBanco: 'Caixa Econômica Federal',
        agencia: '5678',
        conta: '98765-4',
        tipoConta: 'Poupança',
        principal: false,
        createdAt: '2025-03-10T09:15:00Z'
      }
    ];
  }

  /**
   * Obtém uma informação bancária específica pelo ID
   * 
   * @param infoBancariaId ID da informação bancária
   * @returns Dados da informação bancária
   * @throws NotFoundException se a informação bancária não for encontrada
   */
  async obterInfoBancariaPorId(infoBancariaId: string): Promise<any> {
    // Em uma implementação real, chamaria o serviço de cidadão
    // const infoBancaria = await this.cidadaoService.getInfoBancariaPorId(infoBancariaId);
    
    // if (!infoBancaria) {
    //   throw new NotFoundException('Informação bancária não encontrada');
    // }
    
    // return {
    //   id: infoBancaria.id,
    //   banco: infoBancaria.banco,
    //   agencia: infoBancaria.agencia,
    //   conta: infoBancaria.conta,
    //   tipoConta: infoBancaria.tipoConta,
    //   pixTipo: infoBancaria.pixTipo,
    //   pixChave: infoBancaria.pixChave, // não mascarado para uso interno
    //   principal: infoBancaria.principal,
    //   cidadaoId: infoBancaria.cidadaoId,
    //   createdAt: infoBancaria.createdAt
    // };

    // Implementação de mock para desenvolvimento
    console.log(`[INTEGRAÇÃO] Obtendo informação bancária ${infoBancariaId}`);
    
    // Dados fictícios para desenvolvimento
    const mockInfos = {
      'info-bancaria-1': {
        id: 'info-bancaria-1',
        banco: '001',
        nomeBanco: 'Banco do Brasil',
        agencia: '1234',
        conta: '12345-6',
        tipoConta: 'Corrente',
        principal: true,
        cidadaoId: 'mock-cidadao-id',
        createdAt: '2025-01-15T10:30:00Z'
      },
      'info-bancaria-2': {
        id: 'info-bancaria-2',
        pixTipo: 'email',
        pixChave: 'maria.silva@exemplo.com', // não mascarado para uso interno
        principal: false,
        cidadaoId: 'mock-cidadao-id',
        createdAt: '2025-02-20T14:45:00Z'
      },
      'info-bancaria-3': {
        id: 'info-bancaria-3',
        banco: '104',
        nomeBanco: 'Caixa Econômica Federal',
        agencia: '5678',
        conta: '98765-4',
        tipoConta: 'Poupança',
        principal: false,
        cidadaoId: 'mock-cidadao-id',
        createdAt: '2025-03-10T09:15:00Z'
      }
    };
    
    if (!mockInfos[infoBancariaId]) {
      throw new NotFoundException('Informação bancária não encontrada');
    }
    
    return mockInfos[infoBancariaId];
  }

  /**
   * Verifica se uma informação bancária pertence a um cidadão
   * 
   * @param cidadaoId ID do cidadão
   * @param infoBancariaId ID da informação bancária
   * @returns true se a informação bancária pertence ao cidadão
   */
  async verificarPropriedadeInfoBancaria(cidadaoId: string, infoBancariaId: string): Promise<boolean> {
    // Em uma implementação real, chamaria o serviço de cidadão
    // const infoBancaria = await this.cidadaoService.getInfoBancariaPorId(infoBancariaId);
    // return infoBancaria && infoBancaria.cidadaoId === cidadaoId;

    // Implementação de mock para desenvolvimento
    console.log(`[INTEGRAÇÃO] Verificando se informação bancária ${infoBancariaId} pertence ao cidadão ${cidadaoId}`);
    
    // Simulação de verificação
    return true;
  }

  /**
   * Verifica se um cidadão é o beneficiário de uma solicitação
   * 
   * @param solicitacaoId ID da solicitação
   * @param cidadaoId ID do cidadão
   * @returns true se o cidadão é o beneficiário da solicitação
   */
  async verificarBeneficiarioSolicitacao(solicitacaoId: string, cidadaoId: string): Promise<boolean> {
    // Em uma implementação real, chamaria o serviço de solicitação
    // const solicitacao = await this.solicitacaoService.findOne(solicitacaoId);
    // return solicitacao && solicitacao.cidadaoId === cidadaoId;

    // Implementação de mock para desenvolvimento
    console.log(`[INTEGRAÇÃO] Verificando se cidadão ${cidadaoId} é beneficiário da solicitação ${solicitacaoId}`);
    
    // Simulação de verificação
    return true;
  }

  /**
   * Verifica se existe relação familiar entre dois cidadãos
   * 
   * @param cidadaoId ID do cidadão principal
   * @param familiarId ID do familiar
   * @returns true se existe relação familiar
   */
  async verificarRelacaoFamiliar(cidadaoId: string, familiarId: string): Promise<boolean> {
    // Em uma implementação real, chamaria o serviço de cidadão
    // const relacoes = await this.cidadaoService.getRelacoesFamiliares(cidadaoId);
    // return relacoes.some(relacao => relacao.familiarId === familiarId);

    // Implementação de mock para desenvolvimento
    console.log(`[INTEGRAÇÃO] Verificando relação familiar entre ${cidadaoId} e ${familiarId}`);
    
    // Simulação de verificação
    return true;
  }

  /**
   * Obtém o endereço de um cidadão para entrega de benefício
   * 
   * @param cidadaoId ID do cidadão
   * @returns Endereço formatado
   */
  async obterEnderecoEntrega(cidadaoId: string): Promise<string> {
    // Em uma implementação real, chamaria o serviço de cidadão
    // const cidadao = await this.cidadaoService.findOne(cidadaoId);
    
    // if (!cidadao || !cidadao.endereco) {
    //   throw new NotFoundException('Endereço não encontrado para o cidadão');
    // }
    
    // const end = cidadao.endereco;
    // return `${end.logradouro}, ${end.numero}${end.complemento ? ', ' + end.complemento : ''}, ${end.bairro}, ${end.cidade} - ${end.uf}, CEP: ${end.cep}`;

    // Implementação de mock para desenvolvimento
    console.log(`[INTEGRAÇÃO] Obtendo endereço de entrega para o cidadão ${cidadaoId}`);
    
    // Endereço fictício para desenvolvimento
    return 'Rua das Flores, 123, Apto 101, Centro, Natal - RN, CEP: 59000-000';
  }

  /**
   * Mascara uma chave PIX para exibição segura
   * 
   * @param chave Valor da chave PIX
   * @param tipo Tipo da chave (CPF, email, telefone, aleatoria)
   * @returns Chave PIX mascarada
   */
  private mascaraPixChave(chave: string, tipo: string): string {
    if (!chave) {return '';}
    
    switch (tipo?.toLowerCase()) {
      case 'cpf':
        // Formato: ***.123.456-**
        const cpfLimpo = chave.replace(/\D/g, '');
        if (cpfLimpo.length !== 11) {return '***.***.***-**';}
        
        return `***.${cpfLimpo.substr(3, 3)}.${cpfLimpo.substr(6, 3)}-**`;
        
      case 'email':
        // Formato: a***@d***.com
        const partes = chave.split('@');
        if (partes.length !== 2) {return chave.substring(0, 1) + '***@***';}
        
        const usuario = partes[0];
        const dominio = partes[1];
        
        const usuarioMascarado = usuario.substring(0, 1) + '*'.repeat(Math.max(1, usuario.length - 1));
        
        const dominioPartes = dominio.split('.');
        const dominioNome = dominioPartes[0];
        const dominioExtensao = dominioPartes.slice(1).join('.');
        
        const dominioMascarado = dominioNome.substring(0, 1) + '*'.repeat(Math.max(1, dominioNome.length - 1));
        
        return `${usuarioMascarado}@${dominioMascarado}.${dominioExtensao}`;
        
      case 'telefone':
        // Formato: (00) *****-6789
        const telLimpo = chave.replace(/\D/g, '');
        if (telLimpo.length < 8) {return '(**) *****-****';}
        
        return `(**) *****-${telLimpo.slice(-4)}`;
        
      case 'aleatoria':
        // Formato: ********-****-****-****-************
        if (chave.length < 8) {return '********';}
        
        return chave.substring(0, 8) + '****' + '*'.repeat(chave.length - 12);
        
      default:
        // Mascaramento genérico
        if (chave.length <= 4) {return '****';}
        
        return chave.substring(0, 2) + '*'.repeat(chave.length - 4) + chave.slice(-2);
    }
  }
}
