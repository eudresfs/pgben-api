import { DataSource } from 'typeorm';
import { config } from 'dotenv';

// Entidades
import { Usuario } from './modules/usuario/entities/usuario.entity';
import { Unidade } from './modules/unidade/entities/unidade.entity';
import { Setor } from './modules/unidade/entities/setor.entity';
import { SetorUnidade } from './modules/unidade/entities/setor-unidade.entity';
import { Cidadao } from './modules/cidadao/entities/cidadao.entity';
import { ComposicaoFamiliar } from './modules/cidadao/entities/composicao-familiar.entity';
import { DadosSociais } from './modules/cidadao/entities/dados-sociais.entity';
import { SituacaoMoradia } from './modules/cidadao/entities/situacao-moradia.entity';
import { TipoBeneficio } from './modules/beneficio/entities/tipo-beneficio.entity';
import { RequisitoDocumento } from './modules/beneficio/entities/requisito-documento.entity';
import { FluxoBeneficio } from './modules/beneficio/entities/fluxo-beneficio.entity';
import { Solicitacao } from './modules/solicitacao/entities/solicitacao.entity';
import { DadosBeneficios } from './modules/solicitacao/entities/dados-beneficios.entity';
import { Pendencia } from './modules/solicitacao/entities/pendencia.entity';
import { Documento } from './modules/documento/entities/documento.entity';
import { DocumentoEnviado } from './modules/documento/entities/documento-enviado.entity';
import { HistoricoSolicitacao } from './modules/solicitacao/entities/historico-solicitacao.entity';
import { LogAuditoria } from './modules/audit/entities/log-auditoria.entity';
import { Notificacao } from './modules/notificacao/entities/notificacao.entity';
import { Ocorrencia } from './modules/ocorrencia/entities/ocorrencia.entity';
import { DemandaMotivo } from './modules/ocorrencia/entities/demanda-motivo.entity';

config();

export default new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_DATABASE || 'pgben',
  entities: [
    Usuario,
    Unidade,
    Setor,
    SetorUnidade,
    Cidadao,
    ComposicaoFamiliar,
    DadosSociais,
    SituacaoMoradia,
    TipoBeneficio,
    RequisitoDocumento,
    FluxoBeneficio,
    Solicitacao,
    DadosBeneficios,
    Pendencia,
    Documento,
    DocumentoEnviado,
    HistoricoSolicitacao,
    LogAuditoria,
    Notificacao,
    Ocorrencia,
    DemandaMotivo,
  ],
  synchronize: false, // Desabilitado em produção. Use migrations para alterações no banco
  migrationsRun: true, // Executa migrations automaticamente ao iniciar
  migrations: [__dirname + '/database/migrations/**/*{.ts,.js}'],
  migrationsTableName: 'migrations',
  logging: process.env.NODE_ENV === 'development',
  logger: 'file',
  maxQueryExecutionTime: 1000, // Logs para queries que demorem mais de 1s
  extra: {
    // Configurações adicionais para o pool de conexões
    max: 20, // Máximo de conexões
    idleTimeoutMillis: 30000, // Tempo máximo de inatividade
    connectionTimeoutMillis: 2000, // Tempo máximo para estabelecer conexão
  },
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
});
