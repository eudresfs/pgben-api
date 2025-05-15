import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, Like, FindManyOptions, IsNull, Not } from 'typeorm';
import { LogAuditoria } from '../entities/log-auditoria.entity';
import { CreateLogAuditoriaDto } from '../dto/create-log-auditoria.dto';
import { TipoOperacao } from '../enums/tipo-operacao.enum';
import { QueryLogAuditoriaDto } from '../dto/query-log-auditoria.dto';

/**
 * Serviço de Auditoria
 * 
 * Responsável por gerenciar os logs de auditoria do sistema,
 * permitindo o registro e consulta de operações realizadas pelos usuários.
 */
@Injectable()
export class AuditoriaService {
  constructor(
    @InjectRepository(LogAuditoria)
    private readonly logAuditoriaRepository: Repository<LogAuditoria>,
  ) {}

  /**
   * Cria um novo log de auditoria
   * @param createLogAuditoriaDto Dados do log de auditoria
   * @returns Log de auditoria criado
   */
  async create(createLogAuditoriaDto: CreateLogAuditoriaDto): Promise<LogAuditoria> {
    const logAuditoria = this.logAuditoriaRepository.create(createLogAuditoriaDto);
    return this.logAuditoriaRepository.save(logAuditoria);
  }

  /**
   * Busca logs de auditoria com base nos filtros fornecidos
   * @param queryParams Parâmetros de consulta
   * @returns Lista paginada de logs de auditoria
   */
  async findAll(queryParams: QueryLogAuditoriaDto) {
    const {
      tipo_operacao,
      entidade_afetada,
      entidade_id,
      usuario_id,
      ip_usuario,
      endpoint,
      metodo_http,
      data_inicial,
      data_final,
      termo_busca,
      pagina = 1,
      itens_por_pagina = 10,
    } = queryParams;

    // Construir as condições de busca
    const where: any = {};
    
    if (tipo_operacao) {
      where.tipo_operacao = tipo_operacao;
    }
    
    if (entidade_afetada) {
      where.entidade_afetada = entidade_afetada;
    }
    
    if (entidade_id) {
      where.entidade_id = entidade_id;
    }
    
    if (usuario_id) {
      where.usuario_id = usuario_id;
    }
    
    if (ip_usuario) {
      where.ip_usuario = ip_usuario;
    }
    
    if (endpoint) {
      where.endpoint = Like(`%${endpoint}%`);
    }
    
    if (metodo_http) {
      where.metodo_http = metodo_http;
    }
    
    // Filtro por data
    if (data_inicial && data_final) {
      where.created_at = Between(new Date(data_inicial), new Date(data_final));
    } else if (data_inicial) {
      where.created_at = Between(new Date(data_inicial), new Date());
    }

    // Busca por termo nos dados
    if (termo_busca) {
      // Implementação simplificada - em produção seria necessário usar funções do PostgreSQL
      // para busca em campos JSONB
      where.dados_novos = termo_busca;
    }

    // Configurar paginação
    const skip = (pagina - 1) * itens_por_pagina;
    const take = itens_por_pagina;

    // Configurar opções de busca
    const options: FindManyOptions<LogAuditoria> = {
      where,
      order: { created_at: 'DESC' },
      skip,
      take,
      relations: ['usuario'],
    };

    // Buscar logs e contar total
    const [logs, total] = await this.logAuditoriaRepository.findAndCount(options);

    return {
      dados: logs,
      meta: {
        pagina,
        itens_por_pagina,
        total,
        total_paginas: Math.ceil(total / itens_por_pagina),
      },
    };
  }

  /**
   * Busca um log de auditoria pelo ID
   * @param id ID do log de auditoria
   * @returns Log de auditoria encontrado
   */
  async findOne(id: string): Promise<LogAuditoria | null> {
    return this.logAuditoriaRepository.findOne({
      where: { id },
      relations: ['usuario'],
    });
  }

  /**
   * Busca logs de auditoria por entidade
   * @param entidade Nome da entidade
   * @param entidadeId ID da entidade
   * @returns Lista de logs de auditoria da entidade
   */
  async findByEntidade(entidade: string, entidadeId: string) {
    return this.logAuditoriaRepository.find({
      where: {
        entidade_afetada: entidade,
        entidade_id: entidadeId,
      },
      order: { created_at: 'DESC' },
      relations: ['usuario'],
    });
  }

  /**
   * Busca logs de auditoria por usuário
   * @param usuarioId ID do usuário
   * @returns Lista de logs de auditoria do usuário
   */
  async findByUsuario(usuarioId: string) {
    return this.logAuditoriaRepository.find({
      where: {
        usuario_id: usuarioId,
      },
      order: { created_at: 'DESC' },
    });
  }

  /**
   * Registra acesso a dados sensíveis
   * @param usuarioId ID do usuário
   * @param entidade Nome da entidade
   * @param entidadeId ID da entidade
   * @param dadosSensiveis Lista de dados sensíveis acessados
   * @param ip IP do usuário
   * @param userAgent User-Agent do navegador
   * @param endpoint Endpoint acessado
   * @param metodoHttp Método HTTP utilizado
   */
  async registrarAcessoDadosSensiveis(
    usuarioId: string,
    entidade: string,
    entidadeId: string,
    dadosSensiveis: string[],
    ip: string,
    userAgent: string,
    endpoint: string,
    metodoHttp: string,
  ) {
    const logAuditoria = this.logAuditoriaRepository.create({
      tipo_operacao: TipoOperacao.READ,
      entidade_afetada: entidade,
      entidade_id: entidadeId,
      usuario_id: usuarioId,
      ip_origem: ip,
      user_agent: userAgent,
      endpoint,
      metodo_http: metodoHttp,
      dados_sensiveis_acessados: dadosSensiveis,
    });

    return this.logAuditoriaRepository.save(logAuditoria);
  }

  /**
   * Gera relatório de acessos a dados sensíveis por período
   * @param dataInicial Data inicial
   * @param dataFinal Data final
   * @returns Relatório de acessos a dados sensíveis
   */
  async relatorioAcessosDadosSensiveis(dataInicial: Date, dataFinal: Date) {
    const logs = await this.logAuditoriaRepository.find({
      where: {
        created_at: Between(dataInicial, dataFinal),
        dados_sensiveis_acessados: Not(IsNull()),
      },
      relations: ['usuario'],
      order: { created_at: 'DESC' },
    });

    // Agrupar por tipo de dado sensível
    const dadosPorTipo = {};
    const acessosPorUsuario = {};

    logs.forEach(log => {
      if (log.dados_sensiveis_acessados && Array.isArray(log.dados_sensiveis_acessados)) {
        log.dados_sensiveis_acessados.forEach(dado => {
          if (!dadosPorTipo[dado]) {
            dadosPorTipo[dado] = 0;
          }
          dadosPorTipo[dado]++;
        });
      }

      if (log.usuario_id) {
        const nomeUsuario = log.usuario ? `${log.usuario.nome} (${log.usuario.email})` : log.usuario_id;
        if (!acessosPorUsuario[nomeUsuario]) {
          acessosPorUsuario[nomeUsuario] = 0;
        }
        acessosPorUsuario[nomeUsuario]++;
      }
    });

    return {
      periodo: {
        inicio: dataInicial,
        fim: dataFinal,
      },
      total_acessos: logs.length,
      dados_por_tipo: dadosPorTipo,
      acessos_por_usuario: acessosPorUsuario,
      logs,
    };
  }
}
