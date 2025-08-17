/**
 * Configuração otimizada do TypeORM para o PGBen
 *
 * Esta configuração resolve problemas de inicialização relacionados a entidades
 * com nomes duplicados, utilizando um carregamento faseado de entidades.
 */

// IMPORTANTE: Carregar as variáveis de ambiente ANTES de qualquer outra importação
import './config/env';

import { DataSource } from 'typeorm';
import { env } from './config/env';

// Entidades do módulo de autenticação
import { JwtBlacklist } from './entities/jwt-blacklist.entity';
import { PasswordResetToken } from './entities/password-reset-token.entity';
import { PermissionGroup } from './entities/permission-group.entity';
import { PermissionGroupMapping } from './entities/permission-group-mapping.entity';
import { Permission } from './entities/permission.entity';
import { PermissionScope } from './entities/permission-scope.entity';
import { RefreshToken } from './entities/refresh-token.entity';
import { RolePermission } from './entities/role-permission.entity';
import { UserPermission } from './entities/user-permission.entity';

// Entidades de Log e Auditoria
import { AuditLog } from './entities/audit-log.entity';

// Entidades de Recurso
import { Recurso } from './entities/recurso.entity';
import { RecursoHistorico } from './entities/recurso-historico.entity';

// Importação centralizada de todas as entidades
import {
  // Entidades de Alertas e Métricas
  AlertaMetrica,
  Metrica,
  Pendencia,
  MetricaConfiguracao,
  MetricaDefinicao,
  MetricaDocumento,
  MetricaHttp,
  MetricaSeguranca,
  MetricaSistema,
  MetricaSnapshot,
  RegistroMetrica,
  RegraAlerta,

  // Entidades de Benefícios
  TipoBeneficio,
  CampoDinamicoBeneficio,
  FluxoBeneficio,
  WorkflowBeneficio,
  Concessao,
  HistoricoConcessao,

  // Entidades de Dados Específicos de Benefícios
  DadosAluguelSocial,
  DadosCestaBasica,
  DadosFuneral,
  DadosNatalidade,

  // Entidades de Cidadão e Família
  Cidadao,
  ComposicaoFamiliar,
  DadosSociais,
  InfoBancaria,
  SituacaoMoradia,
  Contato,
  Endereco,

  // Entidades de Configuração
  ConfiguracaoIntegracao,
  ConfiguracaoNotificacao,
  ConfiguracaoRenovacao,
  Parametro,

  // Entidades de Documentos
  Documento,
  DocumentoBatchJob,
  RequisitoDocumento,

  // Entidades de Histórico e Logs
  CategoriaLog,
  HistoricoSolicitacao,
  LogAuditoria,

  // Entidades de Integração
  Integrador,
  IntegradorToken,

  // Entidades Judiciais
  DeterminacaoJudicial,
  ProcessoJudicial,

  // Entidades de Notificação
  Notificacao,
  Notification,
  NotificationTemplate,
  NotificacaoSistema,

  // Entidades de Ocorrências e Demandas
  DemandaMotivo,
  Ocorrencia,

  // Entidades de Pagamento
  ConfirmacaoRecebimento,
  Pagamento,

  // Entidades de Segurança e Autenticação
  Role,
  TokenRevogado,
  Usuario,

  // Entidades de Setores e Unidades
  Setor,
  SetorUnidade,
  Unidade,

  // Entidades de Solicitação
  Solicitacao,

  // Entidades de Upload
  UploadSession,
  UploadToken,
} from './entities';

// Entidades do Sistema de Aprovação removidas - sistema antigo de aprovação

/**
 * Configuração do DataSource para carregamento faseado de entidades
 *
 * Esta abordagem garante que as entidades sejam carregadas em uma ordem
 * que evita problemas de referência circular e conflitos de nome.
 */
export const AppDataSource = new DataSource({
  type: 'postgres',
  host: env.DB_HOST,
  port: env.DB_PORT,
  username: env.DB_USER,
  password: env.DB_PASS,
  database: env.DB_NAME,
  entities: [
    // Entidades de autenticação
    JwtBlacklist,
    PasswordResetToken,
    PermissionGroup,
    PermissionGroupMapping,
    Permission,
    PermissionScope,
    RefreshToken,
    RolePermission,
    UserPermission,

    // Entidades de auditoria
    AuditLog,
    CategoriaLog,
    LogAuditoria,

    // Entidades de usuário
    Usuario,
    Role,

    // Entidades de unidade
    Unidade,
    Setor,
    SetorUnidade,

    // Entidades de cidadão
    Cidadao,
    ComposicaoFamiliar,
    DadosSociais,
    InfoBancaria,
    SituacaoMoradia,
    Contato,
    Endereco,

    // Entidades de benefício
    TipoBeneficio,
    RequisitoDocumento,
    CampoDinamicoBeneficio,
    ConfiguracaoRenovacao,
    DadosAluguelSocial,
    DadosCestaBasica,
    DadosFuneral,
    DadosNatalidade,
    FluxoBeneficio,
    WorkflowBeneficio,
    Concessao,
    HistoricoConcessao,

    // Entidades de solicitação
    Solicitacao,
    Pendencia,
    HistoricoSolicitacao,

    // Entidades judiciais
    ProcessoJudicial,
    DeterminacaoJudicial,

    // Entidades de documento
    Documento,
    DocumentoBatchJob,

    // Entidades de recurso
    Recurso,
    RecursoHistorico,

    // Entidades de notificação
    Notificacao,
    Notification,
    NotificationTemplate,

    // Entidades de ocorrência
    Ocorrencia,
    DemandaMotivo,

    // Entidades de configuração
    ConfiguracaoIntegracao,
    ConfiguracaoNotificacao,
    Parametro,

    // Entidades de integração
    Integrador,
    IntegradorToken,
    TokenRevogado,

    // Entidades de pagamento
    Pagamento,
    ConfirmacaoRecebimento,

    // Entidades de métricas
    AlertaMetrica,
    MetricaConfiguracao,
    MetricaDefinicao,
    MetricaDocumento,
    MetricaHttp,
    MetricaSeguranca,
    MetricaSistema,
    MetricaSnapshot,
    Metrica,
    RegistroMetrica,
    RegraAlerta,

    // Entidades de upload
    UploadSession,
    UploadToken,

    // Entidades do Sistema de Aprovação removidas - sistema antigo de aprovação
  ],
  migrations: [__dirname + '/database/migrations/**/*{.ts,.js}'],
  migrationsTableName: 'migrations',
  synchronize: false, // CRÍTICO: Desabilitar
  dropSchema: false, // CRÍTICO: Nunca true
  migrationsRun: false, // Controle manual
  logging: ['error', 'warn', 'migration'], // Log migrations
  logger: 'file',
  maxQueryExecutionTime: 500,
  extra: {
    max: 30,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
    timezone: 'America/Sao_Paulo',
  },
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
});

/**
 * Função para testar a inicialização do DataSource
 */
export async function testarInicializacao() {
  console.log('Testando inicialização do AppDataSource otimizado...');

  try {
    await AppDataSource.initialize();
    console.log('✅ SUCESSO: AppDataSource inicializado corretamente');

    // Verificar se as entidades renomeadas foram carregadas
    const entidadesRenomeadas = [
      'NotificacaoSistema',
      'HistoricoSolicitacaoBeneficio',
    ];

    console.log('\nVerificando entidades renomeadas:');
    entidadesRenomeadas.forEach((nome) => {
      const entidade = AppDataSource.entityMetadatas.find(
        (meta) => meta.name === nome,
      );
      if (entidade) {
        console.log(
          `✅ ${nome} carregada corretamente como tabela: ${entidade.tableName}`,
        );
      } else {
        console.log(`❌ ${nome} não foi carregada`);
      }
    });

    // Verificar total de entidades carregadas
    console.log(
      `\nTotal de entidades carregadas: ${AppDataSource.entityMetadatas.length}`,
    );

    await AppDataSource.destroy();
    console.log('Conexão fechada.');
    return true;
  } catch (error) {
    console.error('❌ FALHA: Erro ao inicializar AppDataSource');
    console.error('Mensagem:', error.message);
    return false;
  }
}

// Executar teste se este arquivo for chamado diretamente
if (require.main === module) {
  testarInicializacao().catch((error) => {
    console.error('Erro não tratado:', error);
  });
}
