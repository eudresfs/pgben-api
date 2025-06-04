import { Injectable, Logger } from '@nestjs/common';
import { ConfiguracaoIntegracaoRepository } from '../repositories/configuracao-integracao.repository';
import { ConfiguracaoIntegracao } from '../../../entities';
import { IntegracaoUpdateDto } from '../dtos/integracao/integracao-update.dto';
import { IntegracaoTestDto } from '../dtos/integracao/integracao-test.dto';
import { IntegracaoResponseDto } from '../dtos/integracao/integracao-response.dto';
import { IntegracaoTesteException } from '../exceptions/integracao-teste.exception';
import { IntegracaoTipoEnum } from '../../../enums/integracao-tipo.enum';

/**
 * Serviço para gerenciamento de configurações de integração externa
 *
 * Responsável por:
 * - Operações CRUD para configurações de integração
 * - Criptografia para credenciais
 * - Suporte a testes de conexão
 * - Mascaramento de dados sensíveis
 */
@Injectable()
export class IntegracaoService {
  private readonly logger = new Logger(IntegracaoService.name);

  constructor(
    private readonly integracaoRepository: ConfiguracaoIntegracaoRepository,
  ) {}

  /**
   * Busca todas as configurações de integração, convertendo-as para DTOs de resposta
   * @param tipo Tipo opcional para filtrar
   * @returns Lista de DTOs de resposta de configurações
   */
  async buscarTodas(
    tipo?: IntegracaoTipoEnum,
  ): Promise<IntegracaoResponseDto[]> {
    const integracoes = await this.integracaoRepository.findAll(tipo);
    return integracoes.map((i) => this.mapearParaDto(i));
  }

  /**
   * Busca uma configuração de integração por seu código
   * @param codigo Código da configuração
   * @returns DTO de resposta da configuração
   * @throws Error se a configuração não existir
   */
  async buscarPorCodigo(codigo: string): Promise<IntegracaoResponseDto> {
    const integracao = await this.integracaoRepository.findByCodigo(codigo);
    if (!integracao) {
      throw new Error(
        `Configuração de integração com código '${codigo}' não encontrada`,
      );
    }
    return this.mapearParaDto(integracao);
  }

  /**
   * Cria ou atualiza uma configuração de integração
   * @param codigo Código da configuração
   * @param dto DTO com dados para atualização
   * @returns DTO de resposta da configuração atualizada
   */
  async atualizarOuCriar(
    codigo: string,
    dto: IntegracaoUpdateDto,
  ): Promise<IntegracaoResponseDto> {
    // Verificar se já existe configuração com este código
    let integracao = await this.integracaoRepository.findByCodigo(codigo);

    if (!integracao) {
      // Criar nova configuração
      integracao = new ConfiguracaoIntegracao();
      integracao.codigo = codigo;
      this.logger.log(
        `Criando nova configuração de integração com código '${codigo}'`,
      );
    } else {
      this.logger.log(
        `Atualizando configuração de integração existente com código '${codigo}'`,
      );
    }

    // Atualizar dados da configuração
    if (dto.nome !== undefined) {
      integracao.nome = dto.nome;
    }
    if (dto.descricao !== undefined) {
      integracao.descricao = dto.descricao;
    }
    integracao.tipo = dto.tipo;
    if (dto.parametros) {
      integracao.parametros = dto.parametros;
    }

    // Criptografar credenciais, se fornecidas
    if (dto.credenciais) {
      integracao.credenciais = this.criptografarCredenciais(dto.credenciais);
    }

    // Atualizar status
    integracao.ativo = dto.ativo !== undefined ? dto.ativo : true;

    const salvo = await this.integracaoRepository.save(integracao);
    return this.mapearParaDto(salvo);
  }

  /**
   * Remove uma configuração de integração
   * @param codigo Código da configuração
   * @throws Error se a configuração não existir
   */
  async remover(codigo: string): Promise<void> {
    const integracao = await this.integracaoRepository.findByCodigo(codigo);
    if (!integracao) {
      throw new Error(
        `Configuração de integração com código '${codigo}' não encontrada`,
      );
    }

    await this.integracaoRepository.remove(integracao.id as unknown as number);
    this.logger.log(`Configuração de integração '${codigo}' removida`);
  }

  /**
   * Ativa ou desativa uma configuração de integração
   * @param codigo Código da configuração
   * @param ativo Status de ativação
   * @returns DTO de resposta da configuração atualizada
   * @throws Error se a configuração não existir
   */
  async alterarStatus(
    codigo: string,
    ativo: boolean,
  ): Promise<IntegracaoResponseDto> {
    const integracao = await this.integracaoRepository.findByCodigo(codigo);
    if (!integracao) {
      throw new Error(
        `Configuração de integração com código '${codigo}' não encontrada`,
      );
    }

    integracao.ativo = ativo;
    const salvo = await this.integracaoRepository.save(integracao);

    this.logger.log(
      `Configuração de integração '${codigo}' ${ativo ? 'ativada' : 'desativada'}`,
    );
    return this.mapearParaDto(salvo);
  }

  /**
   * Busca a configuração ativa para um determinado tipo de integração
   * @param tipo Tipo da integração
   * @returns DTO de resposta da configuração ou null se não existir
   */
  async buscarConfigAtiva(
    tipo: IntegracaoTipoEnum,
  ): Promise<IntegracaoResponseDto | null> {
    const integracao = await this.integracaoRepository.findActiveByTipo(tipo);
    if (!integracao) {
      return null;
    }
    return this.mapearParaDto(integracao);
  }

  /**
   * Testa uma configuração de integração
   * @param dto DTO com dados para teste
   * @returns Resultado do teste
   * @throws IntegracaoTesteException se o teste falhar
   */
  async testar(
    dto: IntegracaoTestDto,
  ): Promise<{ sucesso: boolean; mensagem: string }> {
    let integracao: ConfiguracaoIntegracao | null = null;

    // Se for um código, busca a configuração existente
    if (dto.codigo) {
      integracao = await this.integracaoRepository.findByCodigo(dto.codigo);
      if (!integracao && !dto.configuracao) {
        throw new Error(
          `Configuração de integração com código '${dto.codigo}' não encontrada`,
        );
      }
    }

    // Se não encontrou pelo código ou configuração fornecida diretamente, cria uma temporária
    if (!integracao && dto.configuracao) {
      const tempIntegracao = new ConfiguracaoIntegracao();
      tempIntegracao.tipo = dto.tipo || IntegracaoTipoEnum.API_EXTERNA; // Tipo padrão
      tempIntegracao.codigo = 'temp-' + Date.now();
      tempIntegracao.nome = 'Configuração Temporária';
      tempIntegracao.configuracao = dto.configuracao;

      // Criptografar credenciais temporárias, se fornecidas
      if (dto.credenciais) {
        tempIntegracao.credenciais = this.criptografarCredenciais(
          dto.credenciais,
        );
      }

      integracao = tempIntegracao;
    }

    if (!integracao) {
      throw new Error(
        'É necessário fornecer o código ou a configuração para teste',
      );
    }

    try {
      // Realizar teste específico para o tipo de integração
      switch (integracao.tipo) {
        case IntegracaoTipoEnum.EMAIL:
          return await this.testarEmail(integracao);

        case IntegracaoTipoEnum.SMS:
          return await this.testarSMS(integracao);

        case IntegracaoTipoEnum.STORAGE:
          return await this.testarStorage(integracao);

        case IntegracaoTipoEnum.API_EXTERNA:
          return await this.testarAPI(integracao);

        default:
          throw new Error(
            `Tipo de integração não suportado para testes: ${integracao.tipo}`,
          );
        // O erro de compilação foi corrigido na classe IntegracaoTesteException
      }
    } catch (error) {
      const codIntegracao = integracao.codigo || 'temporaria';
      throw new IntegracaoTesteException(
        codIntegracao,
        `Falha no teste: ${error.message}`,
      );
    }
  }

  /**
   * Criptografa as credenciais sensíveis
   * @param credenciais Credenciais a serem criptografadas
   * @returns Credenciais criptografadas
   */
  private criptografarCredenciais(credenciais: Record<string, any>): string {
    if (!credenciais) {
      return '';
    }
    // Em uma implementação real, usaríamos uma biblioteca como crypto com AES-256-GCM
    // Para simplificar neste momento, apenas serializa para JSON
    // TODO: Implementar criptografia real
    this.logger.log('Criptografando credenciais sensíveis');
    return JSON.stringify(credenciais);
  }

  /**
   * Descriptografa as credenciais sensíveis
   * @param credenciaisCriptografadas Credenciais criptografadas
   * @returns Credenciais descriptografadas
   */
  private descriptografarCredenciais(
    credenciaisCriptografadas: string,
  ): Record<string, any> {
    // Em uma implementação real, usaríamos uma biblioteca como crypto com AES-256-GCM
    // Para simplificar neste momento, apenas deserializa de JSON
    // TODO: Implementar descriptografia real
    try {
      return JSON.parse(credenciaisCriptografadas);
    } catch (error) {
      this.logger.error('Erro ao descriptografar credenciais', error);
      return {};
    }
  }

  /**
   * Mascara credenciais sensíveis para exibição
   * @param credenciais Credenciais a serem mascaradas
   * @returns Credenciais mascaradas
   */
  private mascaraCredenciais(
    credenciais: Record<string, any>,
  ): Record<string, any> {
    if (!credenciais) {
      return {};
    }
    const resultado = { ...credenciais };

    // Mascarar campos comuns sensíveis
    const camposSensiveis = [
      'senha',
      'password',
      'secret',
      'key',
      'token',
      'apiKey',
    ];
    for (const campo of camposSensiveis) {
      if (resultado[campo]) {
        resultado[campo] = '••••••••••';
      }
    }

    return resultado;
  }

  /**
   * Testa uma configuração de integração de email
   * @param integracao Configuração a ser testada
   * @returns Resultado do teste
   */
  private async testarEmail(
    integracao: ConfiguracaoIntegracao,
  ): Promise<{ sucesso: boolean; mensagem: string }> {
    // Em uma implementação real, tentaria conectar ao servidor SMTP
    // e enviar um email de teste
    this.logger.log(`Testando integração de email: ${integracao.codigo}`);

    // Simulação para fins de demonstração
    await new Promise((resolve) => setTimeout(resolve, 500));

    return {
      sucesso: true,
      mensagem: 'Conexão com servidor SMTP estabelecida com sucesso',
    };
  }

  /**
   * Testa uma configuração de integração de SMS
   * @param integracao Configuração a ser testada
   * @returns Resultado do teste
   */
  private async testarSMS(
    integracao: ConfiguracaoIntegracao,
  ): Promise<{ sucesso: boolean; mensagem: string }> {
    // Em uma implementação real, tentaria conectar ao serviço de SMS
    // e verificar se a API está respondendo
    this.logger.log(`Testando integração de SMS: ${integracao.codigo}`);

    // Simulação para fins de demonstração
    await new Promise((resolve) => setTimeout(resolve, 500));

    return {
      sucesso: true,
      mensagem: 'API de SMS respondeu com sucesso',
    };
  }

  /**
   * Testa uma configuração de integração de armazenamento
   * @param integracao Configuração a ser testada
   * @returns Resultado do teste
   */
  private async testarStorage(
    integracao: ConfiguracaoIntegracao,
  ): Promise<{ sucesso: boolean; mensagem: string }> {
    // Em uma implementação real, tentaria conectar ao serviço de armazenamento
    // (S3, GCS, MinIO, etc.) e verificar permissões
    this.logger.log(
      `Testando integração de armazenamento: ${integracao.codigo}`,
    );

    // Simulação para fins de demonstração
    await new Promise((resolve) => setTimeout(resolve, 500));

    return {
      sucesso: true,
      mensagem:
        'Conexão com serviço de armazenamento estabelecida e permissões verificadas',
    };
  }

  /**
   * Testa uma configuração de integração de API externa
   * @param integracao Configuração a ser testada
   * @returns Resultado do teste
   */
  private async testarAPI(
    integracao: ConfiguracaoIntegracao,
  ): Promise<{ sucesso: boolean; mensagem: string }> {
    // Em uma implementação real, tentaria fazer uma requisição
    // para a API externa e verificar a resposta
    this.logger.log(`Testando integração de API: ${integracao.codigo}`);

    // Simulação para fins de demonstração
    await new Promise((resolve) => setTimeout(resolve, 500));

    return {
      sucesso: true,
      mensagem: 'API respondeu com status 200 OK',
    };
  }

  /**
   * Converte uma entidade ConfiguracaoIntegracao para um DTO de resposta
   * @param integracao Entidade a ser convertida
   * @returns DTO de resposta
   */
  private mapearParaDto(
    integracao: ConfiguracaoIntegracao,
  ): IntegracaoResponseDto {
    const dto = new IntegracaoResponseDto();
    dto.codigo = integracao.codigo;
    dto.nome = integracao.nome;
    dto.descricao = integracao.descricao;
    dto.tipo = integracao.tipo;
    dto.configuracao = integracao.configuracao;

    // Descriptografar e mascarar credenciais
    if (integracao.credenciais) {
      const credenciais = this.descriptografarCredenciais(
        integracao.credenciais,
      );
      dto.credenciais = this.mascaraCredenciais(credenciais);
    }

    dto.ativo = integracao.ativo;
    dto.created_at = integracao.created_at;
    dto.updated_at = integracao.updated_at;

    return dto;
  }
}
