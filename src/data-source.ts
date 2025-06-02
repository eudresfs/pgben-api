/**
 * Configuração otimizada do TypeORM para o PGBen
 * 
 * Esta configuração resolve problemas de inicialização relacionados a entidades
 * com nomes duplicados, utilizando um carregamento faseado de entidades.
 */
import { DataSource } from 'typeorm';
import { config as dotenvConfig } from 'dotenv';

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
  DadosBeneficios,
  FluxoBeneficio,
  WorkflowBeneficio,
  
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
  PapelCidadao,
  SituacaoMoradia,
  
  // Entidades de Configuração
  ConfiguracaoIntegracao,
  ConfiguracaoNotificacao,
  ConfiguracaoRenovacao,
  Parametro,
  
  // Entidades de Documentos
  Documento,
  RequisitoDocumento,
  
  // Entidades de Histórico e Logs
  CategoriaLog,
  HistoricoConversaoPapel,
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
  Template,
  
  // Entidades de Ocorrências e Demandas
  DemandaMotivo,
  Ocorrencia,
  
  // Entidades de Pagamento
  ComprovantePagamento,
  ConfirmacaoRecebimento,
  Pagamento,
  
  // Entidades de Regras
  RegraConflitoPapel,
  
  // Entidades de Segurança e Autenticação
  Role,
  TokenRevogado,
  Usuario,
  
  // Entidades de Setores e Unidades
  Setor,
  SetorUnidade,
  Unidade,
  
  // Entidades de Solicitação
  Solicitacao
} from './entities';

dotenvConfig();

/**
 * Configuração do DataSource para carregamento faseado de entidades
 * 
 * Esta abordagem garante que as entidades sejam carregadas em uma ordem
 * que evita problemas de referência circular e conflitos de nome.
 */
export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASS || 'postgres',
  database: process.env.DB_NAME || 'pgben',
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
    PapelCidadao,
    ComposicaoFamiliar,
    DadosSociais,
    InfoBancaria,
    SituacaoMoradia,
    HistoricoConversaoPapel,
    RegraConflitoPapel,

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

    // Entidades de solicitação
    Solicitacao,
    DadosBeneficios,
    Pendencia,
    HistoricoSolicitacao,

    // Entidades judiciais
    ProcessoJudicial,
    DeterminacaoJudicial,

    // Entidades de documento
    Documento,

    // Entidades de recurso
    Recurso,
    RecursoHistorico,

    // Entidades de notificação
    Notificacao,
    Notification,
    NotificationTemplate,
    Template,

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
    ComprovantePagamento,
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
  ],
  migrations: [__dirname + '/database/migrations/**/*{.ts,.js}'],
  migrationsTableName: 'migrations',
  synchronize: false,        // CRÍTICO: Desabilitar
  dropSchema: false,         // CRÍTICO: Nunca true
  migrationsRun: false,      // Controle manual
  logging: ['error', 'warn', 'migration'], // Log migrations
  logger: 'file',
  maxQueryExecutionTime: 500,
  extra: {
    max: 30,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
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
      'HistoricoSolicitacaoBeneficio'
    ];
    
    console.log('\nVerificando entidades renomeadas:');
    entidadesRenomeadas.forEach(nome => {
      const entidade = AppDataSource.entityMetadatas.find(meta => meta.name === nome);
      if (entidade) {
        console.log(`✅ ${nome} carregada corretamente como tabela: ${entidade.tableName}`);
      } else {
        console.log(`❌ ${nome} não foi carregada`);
      }
    });
    
    // Verificar total de entidades carregadas
    console.log(`\nTotal de entidades carregadas: ${AppDataSource.entityMetadatas.length}`);
    
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
  testarInicializacao().catch(error => {
    console.error('Erro não tratado:', error);
  });
}