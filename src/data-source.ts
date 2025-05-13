import { DataSource } from 'typeorm';
import { config as dotenvConfig } from 'dotenv';
import options from '../ormconfig';

// Entidades
import { User } from './user/entities/user.entity';
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

dotenvConfig();

// Utilizando as opções do ormconfig.ts, mas substituindo a configuração de entidades
// para usar as classes de entidade diretamente em vez de padrões glob
export const AppDataSource = new DataSource({
  ...options,
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
    DemandaMotivo,
  ],
  migrations: [__dirname + '/database/migrations/**/*{.ts,.js}'],
  migrationsTableName: 'migrations',
  migrationsRun: true, // Executa migrations automaticamente ao iniciar
  synchronize: false,
  logging: ['error', 'schema', 'warn', 'migration'],
  logger: 'file',
  maxQueryExecutionTime: 500, // Reduzido para 500ms para identificar queries lentas mais cedo
  extra: {
    max: 30, // Aumentado para suportar mais conexões simultâneas
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000 // Aumentado para evitar timeouts em operações complexas
  },
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
});