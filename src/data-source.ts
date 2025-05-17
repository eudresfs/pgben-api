/**
 * Configuração otimizada do TypeORM para o PGBen
 * 
 * Esta configuração resolve problemas de inicialização relacionados a entidades
 * com nomes duplicados, utilizando um carregamento faseado de entidades.
 */
import { DataSource } from 'typeorm';
import { config as dotenvConfig } from 'dotenv';

// Importar entidades explicitamente para evitar problemas de carregamento
import { Usuario } from './modules/usuario/entities/usuario.entity';
import { Unidade } from './modules/unidade/entities/unidade.entity';
import { Setor } from './modules/unidade/entities/setor.entity';
import { SetorUnidade } from './modules/unidade/entities/setor-unidade.entity';
import { Cidadao } from './modules/cidadao/entities/cidadao.entity';
import { PapelCidadao } from './modules/cidadao/entities/papel-cidadao.entity';
import { ComposicaoFamiliar } from './modules/cidadao/entities/composicao-familiar.entity';
import { DadosSociais } from './modules/cidadao/entities/dados-sociais.entity';
import { SituacaoMoradia } from './modules/cidadao/entities/situacao-moradia.entity';
import { TipoBeneficio } from './modules/beneficio/entities/tipo-beneficio.entity';
import { RequisitoDocumento } from './modules/beneficio/entities/requisito-documento.entity';
import { CampoDinamicoBeneficio } from './modules/beneficio/entities/campo-dinamico-beneficio.entity';
import { FluxoBeneficio } from './modules/beneficio/entities/fluxo-beneficio.entity';
import { SolicitacaoBeneficio } from './modules/beneficio/entities/solicitacao-beneficio.entity';
import { Solicitacao } from './modules/solicitacao/entities/solicitacao.entity';
import { DadosBeneficios } from './modules/solicitacao/entities/dados-beneficios.entity';
import { Pendencia } from './modules/solicitacao/entities/pendencia.entity';
import { Documento } from './modules/documento/entities/documento.entity';
import { DocumentoEnviado } from './modules/documento/entities/documento-enviado.entity';
import { HistoricoSolicitacao } from './modules/solicitacao/entities/historico-solicitacao.entity';
import { HistoricoSolicitacaoBeneficio } from './modules/beneficio/entities/historico-solicitacao.entity';
import { LogAuditoria } from './modules/auditoria/entities/log-auditoria.entity';
import { NotificacaoSistema } from './modules/notificacao/entities/notification.entity';
import { NotificationTemplate } from './modules/notificacao/entities/notification-template.entity';
import { Ocorrencia } from './modules/ocorrencia/entities/ocorrencia.entity';
import { DemandaMotivo } from './modules/ocorrencia/entities/demanda-motivo.entity';
import { RefreshToken } from './auth/entities/refresh-token.entity';

// Importação das entidades de métricas
import { MetricaDefinicao } from './modules/metricas/entities/metrica-definicao.entity';
import { MetricaSnapshot } from './modules/metricas/entities/metrica-snapshot.entity';
import { MetricaConfiguracao } from './modules/metricas/entities/metrica-configuracao.entity';

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
    Usuario,
    Cidadao,
    LogAuditoria,
    Unidade,
    Setor,
    SetorUnidade,
    PapelCidadao,
    ComposicaoFamiliar,
    DadosSociais,
    SituacaoMoradia,
    TipoBeneficio,
    RequisitoDocumento,
    CampoDinamicoBeneficio,
    FluxoBeneficio,
    Documento,
    Solicitacao,
    SolicitacaoBeneficio,
    DadosBeneficios,
    Pendencia,
    DocumentoEnviado,
    HistoricoSolicitacao,
    HistoricoSolicitacaoBeneficio,
    NotificacaoSistema,
    NotificationTemplate,
    Ocorrencia,
    DemandaMotivo,
    RefreshToken,
    // Entidades de métricas
    MetricaDefinicao,
    MetricaSnapshot,
    MetricaConfiguracao,
  ],
  migrations: [__dirname + '/database/migrations/**/*{.ts,.js}'],
  migrationsTableName: 'migrations',
  migrationsRun: false,
  synchronize: false,
  logging: ['error', 'schema', 'warn', 'migration'],
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