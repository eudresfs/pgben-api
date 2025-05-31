/**
 * Configuração otimizada do TypeORM para o PGBen
 * 
 * Esta configuração resolve problemas de inicialização relacionados a entidades
 * com nomes duplicados, utilizando um carregamento faseado de entidades.
 */
import { DataSource } from 'typeorm';
import { config as dotenvConfig } from 'dotenv';

// Entidades do módulo de autenticação
import { JwtBlacklist } from './auth/entities/jwt-blacklist.entity';
import { PasswordResetToken } from './auth/entities/password-reset-token.entity';
import { PermissionGroup } from './auth/entities/permission-group.entity';
import { PermissionGroupMapping } from './auth/entities/permission-group-mapping.entity';
import { Permission } from './auth/entities/permission.entity';
import { PermissionScope } from './auth/entities/permission-scope.entity';
import { RefreshToken } from './auth/entities/refresh-token.entity';
import { RolePermission } from './auth/entities/role-permission.entity';
import { UserPermission } from './auth/entities/user-permission.entity';

// Entidades do módulo de auditoria
import { AuditLog } from './audit/entities/audit-log.entity';
import { CategoriaLog } from './modules/auditoria/entities/categoria-log.entity';
import { LogAuditoria } from './modules/auditoria/entities/log-auditoria.entity';

// Entidades do módulo de usuário
import { Usuario } from './modules/usuario/entities/usuario.entity';
import { Role } from './modules/usuario/entities/role.entity';

// Entidades do módulo de unidade
import { Unidade } from './modules/unidade/entities/unidade.entity';
import { Setor } from './modules/unidade/entities/setor.entity';
import { SetorUnidade } from './modules/unidade/entities/setor-unidade.entity';

// Entidades do módulo de cidadão
import { Cidadao } from './modules/cidadao/entities/cidadao.entity';
import { PapelCidadao } from './modules/cidadao/entities/papel-cidadao.entity';
import { ComposicaoFamiliar } from './modules/cidadao/entities/composicao-familiar.entity';
import { DadosSociais } from './modules/cidadao/entities/dados-sociais.entity';
import { SituacaoMoradia } from './modules/cidadao/entities/situacao-moradia.entity';
import { HistoricoConversaoPapel } from './modules/cidadao/entities/historico-conversao-papel.entity';
import { RegraConflitoPapel } from './modules/cidadao/entities/regra-conflito-papel.entity';

// Entidades do módulo de benefício
import { TipoBeneficio } from './modules/beneficio/entities/tipo-beneficio.entity';
import { RequisitoDocumento } from './modules/beneficio/entities/requisito-documento.entity';
import { CampoDinamicoBeneficio } from './modules/beneficio/entities/campo-dinamico-beneficio.entity';
import { ConfiguracaoRenovacao } from './modules/beneficio/entities/configuracao-renovacao.entity';
import { EspecificacaoAluguelSocial } from './modules/beneficio/entities/especificacao-aluguel-social.entity';
import { EspecificacaoCestaBasica } from './modules/beneficio/entities/especificacao-cesta-basica.entity';
import { EspecificacaoFuneral } from './modules/beneficio/entities/especificacao-funeral.entity';
import { EspecificacaoNatalidade } from './modules/beneficio/entities/especificacao-natalidade.entity';
import { FluxoBeneficio } from './modules/beneficio/entities/fluxo-beneficio.entity';
import { VersaoSchemaBeneficio } from './modules/beneficio/entities/versao-schema-beneficio.entity';
// Entidades do módulo de solicitação
import { Solicitacao } from './modules/solicitacao/entities/solicitacao.entity';
import { DadosSolicitacaoBeneficio } from './modules/solicitacao/entities/dados-beneficios.entity';
import { Pendencia } from './modules/solicitacao/entities/pendencia.entity';
import { HistoricoSolicitacao } from './modules/solicitacao/entities/historico-solicitacao.entity';

// Entidades do módulo judicial
import { ProcessoJudicial } from './modules/judicial/entities/processo-judicial.entity';
import { DeterminacaoJudicial } from './modules/judicial/entities/determinacao-judicial.entity';

// Entidades do módulo de documento
import { Documento } from './modules/documento/entities/documento.entity';
// DocumentoEnviado removida - funcionalidade consolidada na entidade Documento

// Entidades do módulo de notificação
import { Notificacao } from './modules/notificacao/entities/notificacao.entity';
import { NotificacaoSistema } from './modules/notificacao/entities/notification.entity';
import { NotificationTemplate } from './modules/notificacao/entities/notification-template.entity';

// Entidades do módulo de ocorrência
import { Ocorrencia } from './modules/ocorrencia/entities/ocorrencia.entity';
import { DemandaMotivo } from './modules/ocorrencia/entities/demanda-motivo.entity';

// Entidades do módulo de configuração

// Entidades do módulo de configuração
import { ConfiguracaoIntegracao } from './modules/configuracao/entities/configuracao-integracao.entity';
import { Parametro } from './modules/configuracao/entities/parametro.entity';
import { Template } from './modules/configuracao/entities/template.entity';
import { WorkflowBeneficio } from './modules/configuracao/entities/workflow-beneficio.entity';

// Entidades do módulo de integrador
import { Integrador } from './modules/integrador/entities/integrador.entity';
import { IntegradorToken } from './modules/integrador/entities/integrador-token.entity';
import { TokenRevogado } from './modules/integrador/entities/token-revogado.entity';

// Entidades do módulo de pagamento
import { Pagamento } from './modules/pagamento/entities/pagamento.entity';
import { ComprovantePagamento } from './modules/pagamento/entities/comprovante-pagamento.entity';
import { ConfirmacaoRecebimento } from './modules/pagamento/entities/confirmacao-recebimento.entity';

// Entidades do módulo de métricas
import { AlertaMetrica } from './modules/metricas/entities/alerta-metrica.entity';
import { ConfiguracaoNotificacao } from './modules/metricas/entities/configuracao-notificacao.entity';
import { MetricaConfiguracao } from './modules/metricas/entities/metrica-configuracao.entity';
import { MetricaDefinicao } from './modules/metricas/entities/metrica-definicao.entity';
import { MetricaDocumento } from './modules/metricas/entities/metrica-documento.entity';
import { MetricaHttp } from './modules/metricas/entities/metrica-http.entity';
import { MetricaSeguranca } from './modules/metricas/entities/metrica-seguranca.entity';
import { MetricaSistema } from './modules/metricas/entities/metrica-sistema.entity';
import { MetricaSnapshot } from './modules/metricas/entities/metrica-snapshot.entity';
import { Metrica } from './modules/metricas/entities/metrica.entity';
import { RegistroMetrica } from './modules/metricas/entities/registro-metrica.entity';
import { RegraAlerta } from './modules/metricas/entities/regra-alerta.entity';

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
    Role,
    Usuario,
    
    // Entidades de unidade
    Unidade,
    Setor,
    SetorUnidade,
    
    // Entidades de cidadão
    Cidadao,
    PapelCidadao,
    ComposicaoFamiliar,
    DadosSociais,
    SituacaoMoradia,
    HistoricoConversaoPapel,
    RegraConflitoPapel,
    
    // Entidades de benefício
    TipoBeneficio,
    RequisitoDocumento,
    CampoDinamicoBeneficio,
    ConfiguracaoRenovacao,
    EspecificacaoAluguelSocial,
    EspecificacaoCestaBasica,
    EspecificacaoFuneral,
    EspecificacaoNatalidade,
    FluxoBeneficio,
    VersaoSchemaBeneficio,
    
    // Entidades de solicitação
    Solicitacao,
    DadosSolicitacaoBeneficio,
    Pendencia,
    HistoricoSolicitacao,
    
    // Entidades de documento
    Documento,
    
    // Entidades de notificação
    Notificacao,
    NotificacaoSistema,
    NotificationTemplate,
    
    // Entidades de ocorrência
    Ocorrencia,
    DemandaMotivo,
    
    // Entidades judiciais
    ProcessoJudicial,
    DeterminacaoJudicial,
    
    // Entidades de configuração
    ConfiguracaoIntegracao,
    Parametro,
    Template,
    WorkflowBeneficio,
    
    // Entidades de integrador
    Integrador,
    IntegradorToken,
    TokenRevogado,
    
    // Entidades de pagamento
    Pagamento,
    ComprovantePagamento,
    ConfirmacaoRecebimento,
    
    // Entidades de métricas
    AlertaMetrica,
    ConfiguracaoNotificacao,
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