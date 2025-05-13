import { DataSourceOptions } from 'typeorm';
import { config } from 'dotenv';
import { User } from '../user/entities/user.entity';
import { Unidade } from '../modules/unidade/entities/unidade.entity';
import { Setor } from '../modules/setor/entities/setor.entity';
import { SetorUnidade } from '../modules/setor/entities/setor-unidade.entity';
import { Cidadao } from '../modules/cidadao/entities/cidadao.entity';
import { ComposicaoFamiliar } from '../modules/cidadao/entities/composicao-familiar.entity';
import { DadosSociais } from '../modules/cidadao/entities/dados-sociais.entity';
import { SituacaoMoradia } from '../modules/cidadao/entities/situacao-moradia.entity';
import { TipoBeneficio } from '../modules/beneficio/entities/tipo-beneficio.entity';
import { RequisitoDocumento } from '../modules/beneficio/entities/requisito-documento.entity';
import { FluxoBeneficio } from '../modules/beneficio/entities/fluxo-beneficio.entity';
import { Solicitacao } from '../modules/solicitacao/entities/solicitacao.entity';
import { DadosBeneficios } from '../modules/solicitacao/entities/dados-beneficios.entity';
import { Pendencia } from '../modules/solicitacao/entities/pendencia.entity';
import { Documento } from '../modules/documento/entities/documento.entity';
import { DocumentoEnviado } from '../modules/documento/entities/documento-enviado.entity';
import { HistoricoSolicitacao } from '../modules/solicitacao/entities/historico-solicitacao.entity';
import { LogAuditoria } from '../modules/audit/entities/log-auditoria.entity';
import { Notificacao } from '../modules/notificacao/entities/notificacao.entity';
import { Ocorrencia } from '../modules/ocorrencia/entities/ocorrencia.entity';
import { DemandaMotivo } from '../modules/ocorrencia/entities/demanda-motivo.entity';

config();

const seedConfig: DataSourceOptions = {
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_DATABASE || 'pgben',
  entities: [
    User,
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
    DemandaMotivo
  ],
  migrations: ['src/migrations/**/*{.ts,.js}'],
  migrationsRun: true, // Executa migrations automaticamente
  synchronize: false,
  logging: process.env.NODE_ENV === 'development',
  logger: 'file',
  maxQueryExecutionTime: 1000,
  extra: {
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000
  },
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
};

export default seedConfig;