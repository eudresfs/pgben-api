# Entidades e DTOs

## 4.1 Visão Geral das Entidades

O sistema utiliza entidades bem definidas que representam os objetos de domínio essenciais para o Sistema de Gestão de Benefícios Eventuais. Abaixo está a estrutura completa das entidades principais e seus relacionamentos:

### 4.1.1 Diagrama de Relacionamento de Entidades

```python
┌───────────────┐     ┌────────────────┐     ┌─────────────────┐
│    Usuario    │     │    Unidade     │     │   TipoBeneficio │
├───────────────┤     ├────────────────┤     ├─────────────────┤
│ id            │     │ id             │     │ id              │
│ nome          │     │ nome           │     │ nome            │
│ email         │     │ sigla          │     │ descricao       │
│ senha_hash    │     │ tipo           │     │ periodicidade   │
│ cpf           │     │ endereco       │     │ baseJuridica    │
│ telefone      │     │ telefone       │     │ valor           │
│ role          │     │ email          │     │ ativo           │
│ unidadeId     │◄────┤ status         │     │                 │
│ status        │     │                │     │                 │
└───────┬───────┘     └────────────────┘     └────────┬────────┘
        │                      ▲                      │
        │                      │                      │
┌───────▼───────┐     ┌────────┴───────┐     ┌───────▼────────┐
│   Cidadao     │     │  Solicitacao   │     │ RequisitoDoc   │
├───────────────┤     ├────────────────┤     ├────────────────┤
│ id            │     │ id             │     │ id             │
│ nome          │     │ protocolo      │     │ tipoBeneficioId│
│ cpf           │     │ beneficiarioId │◄────┤ tipoDocumento  │
│ rg            │◄────┤ tipoBeneficioId│     │ obrigatorio    │
│ dataNascimento│     │ unidadeId      │     │ descricao      │
│ sexo          │     │ tecnicoId      │     └────────────────┘
│ nis           │     │ dataAbertura   │              ▲
│ telefone      │     │ status         │              │
│ email         │     │ parecerSemtas  │     ┌────────┴───────┐
│ endereco      │     │ aprovadorId    │     │   Documento    │
│ renda         │     │ dataAprovacao  │     ├────────────────┤
│ composicao    │     │ dataLiberacao  │     │ id             │
└───────────────┘     │ liberadorId    │     │ solicitacaoId  │
                      │ observacoes    │◄────┤ tipoDocumento  │
                      └────────────────┘     │ nomeArquivo    │
                                             │ caminhoArquivo │
                                             │ tamanho        │
                                             │ mimeType       │
                                             │ dataUpload     │
                                             │ uploaderId     │
                                             └────────────────┘
```

* * *

## 4.2 Definições de Entidades

### 4.2.1 Entidade User

```plain
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany
} from 'typeorm';
import { IsEmail, IsNotEmpty, Length } from 'class-validator';
import { Unidade } from './unidade.entity';
import { Setor } from './setor.entity';
import { Solicitacao } from './solicitacao.entity';

export enum UserRole {
  ADMIN = 'administrador',
  GESTOR = 'gestor_semtas',
  TECNICO_SEMTAS = 'tecnico_semtas',
  TECNICO_UNIDADE = 'tecnico_unidade',
}

export enum UserStatus {
  ATIVO = 'ativo',
  INATIVO = 'inativo',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @IsNotEmpty({ message: 'Nome é obrigatório' })
  nome: string;

  @Column({ unique: true })
  @IsEmail({}, { message: 'Email inválido' })
  @IsNotEmpty({ message: 'Email é obrigatório' })
  email: string;

  @Column()
  senha_hash: string;

  @Column({ unique: true, nullable: true })
  @Length(11, 14, { message: 'CPF deve ter entre 11 e 14 caracteres' })
  cpf: string;

  @Column({ nullable: true })
  telefone: string;

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.TECNICO_UNIDADE,
  })
  role: UserRole;

  @Column({ nullable: true })
  unidade_id: string;

  @ManyToOne(() => Unidade, { nullable: true })
  @JoinColumn({ name: 'unidade_id' })
  unidade: Unidade;

  @Column({ nullable: true })
  setor_id: string;

  @ManyToOne(() => Setor, { nullable: true })
  @JoinColumn({ name: 'setor_id' })
  setor: Setor;

  @Column({
    type: 'enum',
    enum: UserStatus,
    default: UserStatus.ATIVO,
  })
  status: UserStatus;

  @Column({ default: true })
  primeiro_acesso: boolean;

  @OneToMany(() => Solicitacao, solicitacao => solicitacao.tecnico)
  solicitacoes_abertas: Solicitacao[];

  @OneToMany(() => Solicitacao, solicitacao => solicitacao.aprovador)
  solicitacoes_aprovadas: Solicitacao[];

  @OneToMany(() => Solicitacao, solicitacao => solicitacao.liberador)
  solicitacoes_liberadas: Solicitacao[];

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @DeleteDateColumn()
  removed_at: Date;
}
```

### 4.2.2 Entidade Unidade

```typescript
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  OneToMany,
  ManyToMany,
  JoinTable
} from 'typeorm';
import { User } from './user.entity';
import { Setor } from './setor.entity';
import { Solicitacao } from './solicitacao.entity';

export enum TipoUnidade {
  CRAS = 'cras',
  CREAS = 'creas',
  CENTRO_POP = 'centro_pop',
  SEMTAS = 'semtas',
  OUTRO = 'outro',
}

export enum StatusUnidade {
  ATIVO = 'ativo',
  INATIVO = 'inativo',
}

@Entity('unidade')
export class Unidade {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  nome: string;

  @Column()
  sigla: string;

  @Column({
    type: 'enum',
    enum: TipoUnidade,
  })
  tipo: TipoUnidade;

  @Column()
  endereco: string;

  @Column()
  bairro: string;

  @Column({ default: 'Natal' })
  cidade: string;

  @Column({ default: 'RN' })
  estado: string;

  @Column({ nullable: true })
  cep: string;

  @Column()
  telefone: string;

  @Column({ nullable: true })
  whatsapp: string;

  @Column({ nullable: true })
  email: string;

  @Column({
    type: 'enum',
    enum: StatusUnidade,
    default: StatusUnidade.ATIVO,
  })
  status: StatusUnidade;

  @OneToMany(() => User, user => user.unidade)
  usuario: User[];

  @ManyToMany(() => Setor)
  @JoinTable({
    name: 'setor_unidade',
    joinColumn: { name: 'unidade_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'setor_id', referencedColumnName: 'id' },
  })
  setor: Setor[];

  @OneToMany(() => Solicitacao, solicitacao => solicitacao.unidade)
  solicitacao: Solicitacao[];

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @DeleteDateColumn()
  removed_at: Date;
}
```

### 4.2.3 Entidade Setor

```typescript
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  OneToMany,
  ManyToMany
} from 'typeorm';
import { User } from './user.entity';
import { Unidade } from './unidade.entity';
import { FluxoBeneficio } from './fluxo-beneficio.entity';

export enum StatusSetor {
  ATIVO = 'ativo',
  INATIVO = 'inativo',
}

@Entity('setor')
export class Setor {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  nome: string;

  @Column({ type: 'text', nullable: true })
  descricao: string;

  @Column({
    type: 'enum',
    enum: StatusSetor,
    default: StatusSetor.ATIVO,
  })
  status: StatusSetor;

  @OneToMany(() => User, user => user.setor)
  usuario: User[];

  @ManyToMany(() => Unidade, unidade => unidade.setor)
  unidade: Unidade[];

  @OneToMany(() => FluxoBeneficio, fluxo => fluxo.setor)
  fluxos_beneficio: FluxoBeneficio[];

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @DeleteDateColumn()
  removed_at: Date;
}
```

### 4.2.4 Entidade SetorUnidade (Tabela de Junção)

```python
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique
} from 'typeorm';
import { Setor } from './setor.entity';
import { Unidade } from './unidade.entity';

@Entity('setor_unidade')
@Unique(['setor_id', 'unidade_id'])
export class SetorUnidade {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  setor_id: string;

  @ManyToOne(() => Setor, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'setor_id' })
  setor: Setor;

  @Column()
  unidade_id: string;

  @ManyToOne(() => Unidade, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'unidade_id' })
  unidade: Unidade;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
```

### 4.2.5 Entidade Cidadao

```python
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  OneToMany,
  OneToOne
} from 'typeorm';
import { IsNotEmpty, Length, IsEmail, IsOptional } from 'class-validator';
import { ComposicaoFamiliar } from './composicao-familiar.entity';
import { DadosSociais } from './dados-sociais.entity';
import { Solicitacao } from './solicitacao.entity';

export enum Sexo {
  MASCULINO = 'masculino',
  FEMININO = 'feminino',
}

export enum Parentesco {
  PAI = 'pai',
  MAE = 'mae',
  FILHO = 'filho',
  FILHA = 'filha',
  IRMAO = 'irmao',
  IRMA = 'irma',
  AVO_M = 'avô',
  AVO_F = 'avó',
  OUTRO = 'outro',
}

@Entity('cidadao')
export class Cidadao {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @IsNotEmpty({ message: 'Nome é obrigatório' })
  nome: string;

  @Column({ nullable: true })
  nome_social: string;

  @Column({ unique: true })
  @Length(11, 14, { message: 'CPF deve ter entre 11 e 14 caracteres' })
  @IsNotEmpty({ message: 'CPF é obrigatório' })
  cpf: string;

  @Column({ nullable: true })
  rg: string;

  @Column({ nullable: true, unique: true })
  nis: string;

  @Column({ type: 'date' })
  @IsNotEmpty({ message: 'Data de nascimento é obrigatória' })
  data_nascimento: Date;

  @Column({
    type: 'enum',
    enum: Sexo,
  })
  sexo: Sexo;

  @Column({ nullable: true })
  nome_mae: string;

  @Column({ nullable: true })
  naturalidade: string;

  @Column()
  endereco: string;

  @Column({ nullable: true })
  numero: string;

  @Column({ nullable: true })
  complemento: string;

  @Column()
  bairro: string;

  @Column({ default: 'Natal' })
  cidade: string;

  @Column({ default: 'RN' })
  estado: string;

  @Column({ nullable: true })
  cep: string;

  @Column()
  telefone: string;

  @Column({ nullable: true })
  @IsEmail({}, { message: 'Email inválido' })
  @IsOptional()
  email: string;

  @Column({
    type: 'enum',
    enum: Parentesco,
    nullable: true,
  })
  parentesco: Parentesco;

  @Column({ type: 'enum', enum: ['cpf', 'email', 'telefone', 'chave_aleatoria'] })
  pix_tipo: 'cpf' | 'email' | 'telefone' | 'chave_aleatoria';

  @Column()
  pix_chave: string;

  @OneToMany(() => ComposicaoFamiliar, composicao => composicao.cidadao)
  composicao_familiar: ComposicaoFamiliar[];

  @OneToOne(() => DadosSociais, dados => dados.cidadao)
  dados_sociais: DadosSociais;

  @OneToMany(() => Solicitacao, solicitacao => solicitacao.solicitante)
  solicitacao: Solicitacao[];

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @DeleteDateColumn()
  removed_at: Date;
}
```

### 4.2.6 Entidade ComposicaoFamiliar

```typescript
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  ManyToOne,
  JoinColumn
} from 'typeorm';
import { Cidadao } from './cidadao.entity';

export enum Escolaridade {
  INFANTIL = 'Infantil',
  FUNDAMENTAL_INCOMPLETO = 'Fundamental_Incompleto',
  FUNDAMENTAL_COMPLETO = 'Fundamental_Completo',
  MEDIO_INCOMPLETO = 'Medio_Incompleto',
  MEDIO_COMPLETO = 'Medio_Completo',
  SUPERIOR_INCOMPLETO = 'Superior_Incompleto',
  SUPERIOR_COMPLETO = 'Superior_Completo',
  POS_GRADUACAO = 'Pos_Graduacao',
  MESTRADO = 'Mestrado',
  DOUTORADO = 'Doutorado',
}

@Entity('composicao_familiar')
export class ComposicaoFamiliar {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  cidadao_id: string;

  @ManyToOne(() => Cidadao, cidadao => cidadao.composicao_familiar, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'cidadao_id' })
  cidadao: Cidadao;

  @Column()
  nome: string;

  @Column()
  idade: number;

  @Column()
  parentesco: string;

  @Column({ nullable: true })
  ocupacao: string;

  @Column({
    type: 'enum',
    enum: Escolaridade,
    nullable: true,
  })
  escolaridade: Escolaridade;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  renda: number;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @DeleteDateColumn()
  removed_at: Date;
}
```

### 4.2.7 Entidade DadosSociais

```typescript
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  OneToOne,
  JoinColumn,
  ManyToOne
} from 'typeorm';
import { Cidadao } from './cidadao.entity';
import { SituacaoMoradia } from './situacao-moradia.entity';

export enum TipoBeneficioSocial {
  PBF = 'pbf',
  BPC = 'bpc',
  PCD = 'pcd',
}

export enum Escolaridade {
  FUNDAMENTAL_INCOMPLETO = 'Fundamental_Incompleto',
  FUNDAMENTAL_COMPLETO = 'Fundamental_Completo',
  MEDIO_INCOMPLETO = 'Medio_Incompleto',
  MEDIO_COMPLETO = 'Medio_Completo',
  SUPERIOR_INCOMPLETO = 'Superior_Incompleto',
  SUPERIOR_COMPLETO = 'Superior_Completo',
}

@Entity('dados_sociais')
export class DadosSociais {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  cidadao_id: string;

  @OneToOne(() => Cidadao, cidadao => cidadao.dados_sociais, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'cidadao_id' })
  cidadao: Cidadao;

  @Column({ nullable: true })
  prontuario_suas: string;

  @Column({ default: false })
  publico_prioritario: boolean;

  @Column({ default: false })
  recebe_beneficio: boolean;

  @Column({
    type: 'enum',
    enum: TipoBeneficioSocial,
    nullable: true,
  })
  tipo_beneficio: TipoBeneficioSocial;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  valor_beneficio: number;

  @Column({ default: false })
  possui_curso_profissionalizante: boolean;

  @Column({ nullable: true })
  curso_profissionalizante_possuido: string;

  @Column({ default: false })
  interesse_curso_profissionalizante: boolean;

  @Column({ nullable: true })
  curso_profissionalizante_desejado: string;

  @Column({ default: false })
  atividade_remunerada: boolean;

  @Column({ default: false })
  mercado_formal: boolean;

  @Column({ nullable: true })
  ocupacao: string;

  @Column({ nullable: true })
  nome_conjuge: string;

  @Column({ nullable: true })
  ocupacao_conjuge: string;

  @Column({ default: false })
  atividade_remunerada_conjuge: boolean;

  @Column({ default: false })
  mercado_formal_conjuge: boolean;

  @Column({ default: false })
  familiar_apto_a_trabalho: boolean;

  @Column({ nullable: true })
  familiar_area_de_trabalho: string;

  @Column({ nullable: true })
  situacao_moradia_id: string;

  @ManyToOne(() => SituacaoMoradia, { nullable: true })
  @JoinColumn({ name: 'situacao_moradia_id' })
  situacao_moradia: SituacaoMoradia;

  @Column({
    type: 'enum',
    enum: Escolaridade,
    nullable: true,
  })
  escolaridade: Escolaridade;

  @Column({ default: false })
  tem_filhos: boolean;

  @Column({ default: 0 })
  quantidade_filhos: number;

  @Column({ default: 1 })
  numero_moradores: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  renda_familiar: number;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @DeleteDateColumn()
  removed_at: Date;
}
```

### 4.2.8 Entidade SituacaoMoradia

```typescript
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  OneToMany
} from 'typeorm';
import { DadosSociais } from './dados-sociais.entity';

@Entity('situacao_moradia')
export class SituacaoMoradia {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  nome: string;

  @Column({ unique: true })
  slug: string;

  @OneToMany(() => DadosSociais, dados => dados.situacao_moradia)
  dados_sociais: DadosSociais[];

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @DeleteDateColumn()
  removed_at: Date;
}
```

### 4.2.9 Entidade TipoBeneficio

```typescript
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  OneToMany
} from 'typeorm';
import { RequisitoDocumento } from './requisito-documento.entity';
import { FluxoBeneficio } from './fluxo-beneficio.entity';
import { Solicitacao } from '../solicitacao/entities/solicitacao.entity';

export enum Periodicidade {
  UNICO = 'unico',
  MENSAL = 'mensal',
}

@Entity('tipos_beneficio')
export class TipoBeneficio {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  nome: string;

  @Column({ type: 'text', nullable: true })
  descricao: string;

  @Column({ type: 'text', nullable: true })
  base_legal: string;

  @Column({
    type: 'enum',
    enum: Periodicidade,
    nullable: false,
  })
  periodicidade: Periodicidade;

  @Column({ default: 6 })
  periodo_maximo: number;

  @Column({ default: false })
  permite_renovacao: boolean;

  @Column({ default: false })
  permite_prorrogacao: boolean;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  valor: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  valor_maximo: number;

  @Column({ default: true })
  ativo: boolean;

  @OneToMany(() => RequisitoDocumento, requisito => requisito.tipoBeneficio)
  requisitos: RequisitoDocumento[];

  @OneToMany(() => FluxoBeneficio, fluxo => fluxo.tipoBeneficio)
  fluxos: FluxoBeneficio[];

  @OneToMany(() => Solicitacao, solicitacao => solicitacao.tipoBeneficio)
  solicitacao: Solicitacao[];

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @DeleteDateColumn()
  removed_at: Date;
}
```

### 4.2.10 Entidade RequisitoDocumento

```typescript
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany
} from 'typeorm';
import { TipoBeneficio } from './tipo-beneficio.entity';
import { DocumentoEnviado } from '../documentos/entities/documento-enviado.entity';

export enum FaseDocumento {
  SOLICITACAO = 'solicitacao',
  ANALISE = 'analise',
  LIBERACAO = 'liberacao',
}

@Entity('requisito_documento')
export class RequisitoDocumento {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  tipo_beneficio_id: string;

  @ManyToOne(() => TipoBeneficio, tipoBeneficio => tipoBeneficio.requisitos, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tipo_beneficio_id' })
  tipoBeneficio: TipoBeneficio;

  @Column()
  nome: string;

  @Column({ type: 'text', nullable: true })
  descricao: string;

  @Column({
    type: 'enum',
    enum: FaseDocumento,
    default: FaseDocumento.SOLICITACAO,
  })
  fase: FaseDocumento;

  @Column({ default: true })
  obrigatorio: boolean;

  @Column({ default: 0 })
  ordem: number;

  @OneToMany(() => DocumentoEnviado, documentoEnviado => documentoEnviado.requisito_documento)
  documentos_enviados: DocumentoEnviado[];

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @DeleteDateColumn()
  removed_at: Date;
}
```

### 4.2.11 Entidade FluxoBeneficio

```typescript
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  ManyToOne,
  JoinColumn
} from 'typeorm';
import { TipoBeneficio } from './tipo-beneficio.entity';
import { Setor } from './setor.entity';

export enum TipoAcao {
  CADASTRO = 'cadastro',
  ANALISE = 'analise',
  APROVACAO = 'aprovacao',
  LIBERACAO = 'liberacao',
}

@Entity('fluxo_beneficio')
export class FluxoBeneficio {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  tipo_beneficio_id: string;

  @ManyToOne(() => TipoBeneficio, tipoBeneficio => tipoBeneficio.fluxos, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tipo_beneficio_id' })
  tipoBeneficio: TipoBeneficio;

  @Column()
  setor_id: string;

  @ManyToOne(() => Setor, setor => setor.fluxos_beneficio, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'setor_id' })
  setor: Setor;

  @Column()
  ordem: number;

  @Column({
    type: 'enum',
    enum: TipoAcao,
  })
  tipo_acao: TipoAcao;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @DeleteDateColumn()
  removed_at: Date;
}
```

### 4.2.12 Entidade Solicitacao

```typescript
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
  OneToOne
} from 'typeorm';
import { IsNotEmpty } from 'class-validator';
import { Cidadao } from '../cidadao/entities/cidadao.entity';
import { TipoBeneficio } from '../beneficio/entities/tipo-beneficio.entity';
import { Unidade } from '../unidade/entities/unidade.entity';
import { User } from '../users/entities/user.entity';
import { Documento } from '../documentos/entities/documento.entity';
import { HistoricoSolicitacao } from './historico-solicitacao.entity';
import { Pendencia } from './pendencia.entity';
import { DadosBeneficios } from './dados-beneficios.entity';

export enum StatusSolicitacaoEnum {
  RASCUNHO = 'rascunho',
  ABERTA = 'aberta',
  EM_ANALISE = 'em_analise',
  PENDENTE = 'pendente',
  APROVADA = 'aprovada',
  LIBERADA = 'liberada',
  CONCLUIDA = 'concluida',
  CANCELADA = 'cancelada',
}

export enum TipoSolicitacaoEnum {
  NOVO = 'novo',
  RENOVACAO = 'renovacao',
  PRORROGACAO = 'prorrogacao',
}

export enum OrigemSolicitacaoEnum {
  PRESENCIAL = 'presencial',
  WHATSAPP = 'whatsapp',
}

@Entity('solicitacao')
export class Solicitacao {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  protocolo: string;

  @Column()
  @IsNotEmpty({ message: 'Solicitante é obrigatório' })
  solicitante_id: string;

  @ManyToOne(() => Cidadao)
  @JoinColumn({ name: 'solicitante_id' })
  solicitante: Cidadao;

  @Column()
  @IsNotEmpty({ message: 'Tipo de benefício é obrigatório' })
  tipo_beneficio_id: string;

  @ManyToOne(() => TipoBeneficio)
  @JoinColumn({ name: 'tipo_beneficio_id' })
  tipoBeneficio: TipoBeneficio;

  @Column()
  @IsNotEmpty({ message: 'Unidade é obrigatória' })
  unidade_id: string;

  @ManyToOne(() => Unidade)
  @JoinColumn({ name: 'unidade_id' })
  unidade: Unidade;

  @Column()
  @IsNotEmpty({ message: 'Técnico é obrigatório' })
  tecnico_id: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'tecnico_id' })
  tecnico: User;

  @Column({
    type: 'enum',
    enum: TipoSolicitacaoEnum,
    default: TipoSolicitacaoEnum.NOVO,
  })
  tipo_solicitacao: TipoSolicitacaoEnum;

  @Column({ default: 1 })
  quantidade_parcelas: number;

  @Column()
  data_abertura: Date;

  @Column({
    type: 'enum',
    enum: StatusSolicitacaoEnum,
    default: StatusSolicitacaoEnum.RASCUNHO,
  })
  status: StatusSolicitacaoEnum;

  @Column({
    type: 'enum',
    enum: OrigemSolicitacaoEnum,
    default: OrigemSolicitacaoEnum.PRESENCIAL,
  })
  origem: OrigemSolicitacaoEnum;

  @Column({ type: 'text', nullable: true })
  parecer_tecnico: string;

  @Column({ type: 'text', nullable: true })
  parecer_semtas: string;

  @Column({ nullable: true })
  aprovador_id: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'aprovador_id' })
  aprovador: User;

  @Column({ nullable: true })
  data_aprovacao: Date;

  @Column({ nullable: true })
  data_liberacao: Date;

  @Column({ nullable: true })
  liberador_id: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'liberador_id' })
  liberador: User;

  @Column({ nullable: true })
  destinatario_pagamento_id: string;

  @ManyToOne(() => Cidadao, { nullable: true })
  @JoinColumn({ name: 'destinatario_pagamento_id' })
  destinatario_pagamento: Cidadao;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  valor_pago: number;

  @Column({ type: 'text', nullable: true })
  observacoes: string;

  @OneToMany(() => Documento, documento => documento.solicitacao)
  documentos: Documento[];

  @OneToMany(() => HistoricoSolicitacao, historico => historico.solicitacao)
  historico: HistoricoSolicitacao[];

  @OneToMany(() => Pendencia, pendencia => pendencia.solicitacao)
  pendencias: Pendencia[];

  @OneToOne(() => DadosBeneficios, dados => dados.solicitacao)
  dados_beneficios: DadosBeneficios;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @DeleteDateColumn()
  removed_at: Date;
}
```

### 4.2.13 Entidade DadosBeneficios

```typescript
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  OneToOne,
  JoinColumn
} from 'typeorm';
import { Solicitacao } from './solicitacao.entity';

export enum TipoBeneficioEnum {
  AUXILIO_NATALIDADE = 'auxilio_natalidade',
  ALUGUEL_SOCIAL = 'aluguel_social',
}

export enum MotivoAluguelSocialEnum {
  RISCO_HABITACIONAL = 'risco_habitacional',
  DESALOJAMENTO = 'desalojamento',
  VIOLENCIA_DOMESTICA = 'violencia_domestica',
  OUTRO = 'outro',
}

@Entity('dados_beneficios')
export class DadosBeneficios {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  solicitacao_id: string;

  @OneToOne(() => Solicitacao, solicitacao => solicitacao.dados_beneficios, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'solicitacao_id' })
  solicitacao: Solicitacao;

  @Column({
    type: 'enum',
    enum: TipoBeneficioEnum,
  })
  tipo_beneficio: TipoBeneficioEnum;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  valor_solicitado: number;

  @Column({ nullable: true })
  periodo_meses: number;

  // Campos para Auxílio Natalidade
  @Column({ type: 'date', nullable: true })
  data_prevista_parto: Date;

  @Column({ type: 'date', nullable: true })
  data_nascimento: Date;

  @Column({ nullable: true, default: false })
  pre_natal: boolean;

  @Column({ nullable: true, default: false })
  psf_ubs: boolean;

  @Column({ nullable: true, default: false })
  gravidez_risco: boolean;

  @Column({ nullable: true, default: false })
  gravidez_gemelar: boolean;

  @Column({ nullable: true, default: false })
  possui_filhos: boolean;

  // Campos para Aluguel Social
  @Column({
    type: 'enum',
    enum: MotivoAluguelSocialEnum,
    nullable: true,
  })
  motivo: MotivoAluguelSocialEnum;

  @Column({ type: 'text', nullable: true })
  detalhes_motivo: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @DeleteDateColumn()
  removed_at: Date;
}
```

### 4.2.14 Entidade Pendencia

```typescript
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  ManyToOne,
  JoinColumn
} from 'typeorm';
import { Solicitacao } from './solicitacao.entity';
import { User } from '../users/entities/user.entity';

@Entity('pendencias')
export class Pendencia {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  solicitacao_id: string;

  @ManyToOne(() => Solicitacao, solicitacao => solicitacao.pendencias, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'solicitacao_id' })
  solicitacao: Solicitacao;

  @Column({ type: 'text' })
  descricao: string;

  @Column({ default: false })
  resolvida: boolean;

  @Column()
  usuario_criacao_id: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'usuario_criacao_id' })
  usuario_criacao: User;

  @Column({ nullable: true })
  usuario_resolucao_id: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'usuario_resolucao_id' })
  usuario_resolucao: User;

  @Column()
  data_criacao: Date;

  @Column({ nullable: true })
  data_resolucao: Date;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @DeleteDateColumn()
  removed_at: Date;
}
```

### 4.2.15 Entidade HistoricoSolicitacao

```python
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn
} from 'typeorm';
import { Solicitacao, StatusSolicitacaoEnum } from './solicitacao.entity';
import { User } from '../users/entities/user.entity';

@Entity('historico_solicitacao')
export class HistoricoSolicitacao {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  solicitacao_id: string;

  @ManyToOne(() => Solicitacao, solicitacao => solicitacao.historico, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'solicitacao_id' })
  solicitacao: Solicitacao;

  @Column({
    type: 'enum',
    enum: StatusSolicitacaoEnum,
    nullable: true,
  })
  status_anterior: StatusSolicitacaoEnum;

  @Column({
    type: 'enum',
    enum: StatusSolicitacaoEnum,
  })
  status_novo: StatusSolicitacaoEnum;

  @Column()
  usuario_id: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'usuario_id' })
  usuario: User;

  @Column()
  data_alteracao: Date;

  @Column({ type: 'text', nullable: true })
  observacao: string;

  @CreateDateColumn()
  created_at: Date;
}
```

### 4.2.16 Entidade Documento

```typescript
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany
} from 'typeorm';
import { Solicitacao } from '../solicitacao/entities/solicitacao.entity';
import { User } from '../users/entities/user.entity';
import { DocumentoEnviado } from './documento-enviado.entity';

@Entity('documentos')
export class Documento {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  solicitacao_id: string;

  @ManyToOne(() => Solicitacao, solicitacao => solicitacao.documentos, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'solicitacao_id' })
  solicitacao: Solicitacao;

  @Column()
  nome_arquivo: string;

  @Column()
  caminho_arquivo: string;

  @Column()
  tamanho: number;

  @Column()
  mime_type: string;

  @Column()
  data_upload: Date;

  @Column()
  uploader_id: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'uploader_id' })
  uploader: User;

  @Column({ default: 1 })
  versao: number;

  @OneToMany(() => DocumentoEnviado, documentoEnviado => documentoEnviado.documento)
  documentos_enviados: DocumentoEnviado[];

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @DeleteDateColumn()
  removed_at: Date;
}
```

### 4.2.17 Entidade DocumentoEnviado (REMOVIDA)

> **NOTA IMPORTANTE**: A entidade `DocumentoEnviado` foi removida e sua funcionalidade foi consolidada na entidade `Documento`. 
> Os campos de controle de status, verificação e relacionamentos foram integrados diretamente na entidade `Documento` 
> através do campo `metadados` (JSONB) e campos específicos como `status`, `data_verificacao`, etc.

**Migração realizada em**: Dezembro 2024  
**Motivo**: Simplificação da arquitetura e eliminação de redundância de dados.

**Campos migrados para a entidade Documento**:
- Status do documento → `Documento.status`
- Data de verificação → `Documento.data_verificacao` 
- Usuário verificador → `Documento.usuario_verificacao`
- Observações → `Documento.observacoes_verificacao`
- Metadados adicionais → `Documento.metadados` (JSONB)

```typescript
// ANTES (DocumentoEnviado - REMOVIDA)
// @Entity('documento_enviado')
// export class DocumentoEnviado {
//   @PrimaryGeneratedColumn('uuid')
//   id: string;
//   @Column()
//   solicitacao_id: string;

  @ManyToOne(() => Solicitacao, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'solicitacao_id' })
  solicitacao: Solicitacao;

  @Column()
  requisito_documento_id: string;

  @ManyToOne(() => RequisitoDocumento, requisito => requisito.documentos_enviados, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'requisito_documento_id' })
  requisito_documento: RequisitoDocumento;

  @Column()
  documento_id: string;

  @ManyToOne(() => Documento, documento => documento.documentos_enviados, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'documento_id' })
  documento: Documento;

  @Column({
    type: 'enum',
    enum: StatusDocumentoEnum,
    default: StatusDocumentoEnum.ENVIADO,
  })
  status: StatusDocumentoEnum;

  @Column({ nullable: true })
  verificador_id: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'verificador_id' })
  verificador: User;

  @Column({ nullable: true })
  data_verificacao: Date;

  @Column({ type: 'text', nullable: true })
  observacao: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @DeleteDateColumn()
  removed_at: Date;
}
```

### 4.2.18 Entidade LogAuditoria

```typescript
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn
} from 'typeorm';
import { User } from '../users/entities/user.entity';

export enum AcaoAuditoriaEnum {
  CRIAR = 'criar',
  LER = 'ler',
  ATUALIZAR = 'atualizar',
  DELETAR = 'deletar',
  LOGIN = 'login',
  LOGOUT = 'logout',
}

@Entity('logs_auditoria')
export class LogAuditoria {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: true })
  usuario_id: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'usuario_id' })
  usuario: User;

  @Column({
    type: 'enum',
    enum: AcaoAuditoriaEnum,
  })
  acao: AcaoAuditoriaEnum;

  @Column()
  entidade: string;

  @Column()
  entidade_id: string;

  @Column({ type: 'jsonb', nullable: true })
  dados_anteriores: any;

  @Column({ type: 'jsonb', nullable: true })
  dados_novos: any;

  @Column()
  ip: string;

  @Column({ nullable: true })
  user_agent: string;

  @Column()
  timestamp: Date;
}
```

### 4.2.19 Entidade Notificacao

```typescript
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn
} from 'typeorm';
import { User } from '../users/entities/user.entity';
import { Solicitacao } from '../solicitacao/entities/solicitacao.entity';

export enum TipoNotificacaoEnum {
  APROVACAO = 'aprovacao',
  PENDENCIA = 'pendencia',
  LIBERACAO = 'liberacao',
  RENOVACAO = 'renovacao',
}

@Entity('notificacao')
export class Notificacao {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  usuario_id: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'usuario_id' })
  usuario: User;

  @Column({
    type: 'enum',
    enum: TipoNotificacaoEnum,
  })
  tipo: TipoNotificacaoEnum;

  @Column()
  titulo: string;

  @Column({ type: 'text' })
  conteudo: string;

  @Column({ default: false })
  lida: boolean;

  @Column({ nullable: true })
  data_leitura: Date;

  @Column({ nullable: true })
  solicitacao_id: string;

  @ManyToOne(() => Solicitacao, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'solicitacao_id' })
  solicitacao: Solicitacao;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
```

### 4.2.20 Entidade Ocorrencia

```plain
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  ManyToOne,
  JoinColumn
} from 'typeorm';
import { Cidadao } from '../cidadao/entities/cidadao.entity';
import { Unidade } from '../unidade/entities/unidade.entity';
import { User } from '../users/entities/user.entity';

export enum TipoProcessoEnum {
  ATENDIMENTO = 'atendimento',
  DENUNCIA = 'denuncia',
  VISITA_TECNICA = 'visita_tecnica',
  ENCAMINHAMENTO = 'encaminhamento',
}

@Entity('ocorrencia')
export class Ocorrencia {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  protocolo: string;

  @Column({
    type: 'enum',
    enum: TipoProcessoEnum,
  })
  processo: TipoProcessoEnum;

  @Column()
  beneficiario_id: string;

  @ManyToOne(() => Cidadao, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'beneficiario_id' })
  beneficiario: Cidadao;

  @Column()
  unidade_id: string;

  @ManyToOne(() => Unidade)
  @JoinColumn({ name: 'unidade_id' })
  unidade: Unidade;

  @Column()
  user_id: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'text' })
  situacao: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @DeleteDateColumn()
  removed_at: Date;
}
```

### 4.2.21 Entidade DemandaMotivo

```typescript
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn
} from 'typeorm';

@Entity('demanda_motivo')
export class DemandaMotivo {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  nome: string;

  @Column({ unique: true })
  slug: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @DeleteDateColumn()
  removed_at: Date;
}
```

## 4.3 Data Transfer Objects (DTOs)

Os DTOs (Data Transfer Objects) são utilizados para transferir dados entre as camadas da aplicação, garantindo validação e tipagem forte.

### 4.3.1 DTOs de Usuário

#### CreateUserDto

```plain
import { IsEmail, IsNotEmpty, IsOptional, IsEnum, IsUUID, Length } from 'class-validator';
import { UserRole } from '../entities/user.entity';
import { ApiProperty } from '@nestjs/swagger';

export class CreateUserDto {
  @ApiProperty({ description: 'Nome completo do usuário' })
  @IsNotEmpty({ message: 'Nome é obrigatório' })
  nome: string;

  @ApiProperty({ description: 'E-mail do usuário (único)' })
  @IsEmail({}, { message: 'E-mail inválido' })
  @IsNotEmpty({ message: 'E-mail é obrigatório' })
  email: string;

  @ApiProperty({ description: 'Perfil do usuário', enum: UserRole })
  @IsEnum(UserRole, { message: 'Perfil inválido' })
  @IsNotEmpty({ message: 'Perfil é obrigatório' })
  role: UserRole;

  @ApiProperty({ description: 'ID da unidade a que o usuário pertence', required: false })
  @IsUUID(undefined, { message: 'ID de unidade inválido' })
  @IsOptional()
  unidade_id?: string;

  @ApiProperty({ description: 'ID do setor a que o usuário pertence', required: false })
  @IsUUID(undefined, { message: 'ID de setor inválido' })
  @IsOptional()
  setor_id?: string;
}
```

#### UpdateUserDto

```plain
import { IsEmail, IsOptional, IsEnum, IsUUID, Length, IsBoolean } from 'class-validator';
import { UserRole, UserStatus } from '../entities/user.entity';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateUserDto {
  @ApiProperty({ description: 'Nome completo do usuário', required: false })
  @IsOptional()
  nome?: string;

  @ApiProperty({ description: 'E-mail do usuário', required: false })
  @IsOptional()
  @IsEmail({}, { message: 'E-mail inválido' })
  email?: string;

  @ApiProperty({ description: 'CPF do usuário', required: false })
  @IsOptional()
  @Length(11, 14, { message: 'CPF deve ter entre 11 e 14 caracteres' })
  cpf?: string;

  @ApiProperty({ description: 'Telefone do usuário', required: false })
  @IsOptional()
  telefone?: string;

  @ApiProperty({ description: 'Perfil do usuário', enum: UserRole, required: false })
  @IsOptional()
  @IsEnum(UserRole, { message: 'Perfil inválido' })
  role?: UserRole;

  @ApiProperty({ description: 'ID da unidade a que o usuário pertence', required: false })
  @IsOptional()
  @IsUUID(undefined, { message: 'ID de unidade inválido' })
  unidade_id?: string;

  @ApiProperty({ description: 'ID do setor a que o usuário pertence', required: false })
  @IsOptional()
  @IsUUID(undefined, { message: 'ID de setor inválido' })
  setor_id?: string;

  @ApiProperty({ description: 'Status do usuário', enum: UserStatus, required: false })
  @IsOptional()
  @IsEnum(UserStatus, { message: 'Status inválido' })
  status?: UserStatus;

  @ApiProperty({ description: 'Indicador de primeiro acesso', required: false })
  @IsOptional()
  @IsBoolean({ message: 'Primeiro acesso deve ser um booleano' })
  primeiro_acesso?: boolean;
}
```

#### UserResponseDto

```plain
import { UserRole, UserStatus } from '../entities/user.entity';
import { ApiProperty } from '@nestjs/swagger';

export class UserResponseDto {
  @ApiProperty({ description: 'ID único do usuário' })
  id: string;

  @ApiProperty({ description: 'Nome completo do usuário' })
  nome: string;

  @ApiProperty({ description: 'E-mail do usuário' })
  email: string;

  @ApiProperty({ description: 'CPF do usuário', required: false })
  cpf?: string;

  @ApiProperty({ description: 'Telefone do usuário', required: false })
  telefone?: string;

  @ApiProperty({ description: 'Perfil do usuário', enum: UserRole })
  role: UserRole;

  @ApiProperty({ description: 'Unidade a que o usuário pertence', required: false })
  unidade?: {
    id: string;
    nome: string;
  };

  @ApiProperty({ description: 'Setor a que o usuário pertence', required: false })
  setor?: {
    id: string;
    nome: string;
  };

  @ApiProperty({ description: 'Status do usuário', enum: UserStatus })
  status: UserStatus;

  @ApiProperty({ description: 'Indicador de primeiro acesso' })
  primeiro_acesso: boolean;

  @ApiProperty({ description: 'Data de criação' })
  created_at: Date;

  @ApiProperty({ description: 'Data de última atualização' })
  updated_at: Date;
}
```

### 4.3.2 DTOs de Cidadão

#### CreateCidadaoDto

```plain
import { IsEmail, IsNotEmpty, IsOptional, IsEnum, IsDate, Length, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { Sexo, Parentesco } from '../entities/cidadao.entity';

export class CreateCidadaoDto {
  @ApiProperty({ description: 'Nome completo do cidadão' })
  @IsNotEmpty({ message: 'Nome é obrigatório' })
  nome: string;

  @ApiProperty({ description: 'Nome social (opcional)', required: false })
  @IsOptional()
  nome_social?: string;

  @ApiProperty({ description: 'CPF do cidadão' })
  @IsNotEmpty({ message: 'CPF é obrigatório' })
  @Length(11, 14, { message: 'CPF deve ter entre 11 e 14 caracteres' })
  cpf: string;

  @ApiProperty({ description: 'RG do cidadão', required: false })
  @IsOptional()
  rg?: string;

  @ApiProperty({ description: 'NIS (Número de Identificação Social)', required: false })
  @IsOptional()
  nis?: string;

  @ApiProperty({ description: 'Data de nascimento', type: Date })
  @IsNotEmpty({ message: 'Data de nascimento é obrigatória' })
  @Type(() => Date)
  @IsDate({ message: 'Data de nascimento inválida' })
  data_nascimento: Date;

  @ApiProperty({ description: 'Sexo', enum: Sexo })
  @IsNotEmpty({ message: 'Sexo é obrigatório' })
  @IsEnum(Sexo, { message: 'Sexo inválido' })
  sexo: Sexo;

  @ApiProperty({ description: 'Nome da mãe', required: false })
  @IsOptional()
  nome_mae?: string;

  @ApiProperty({ description: 'Naturalidade', required: false })
  @IsOptional()
  naturalidade?: string;

  @ApiProperty({ description: 'Endereço' })
  @IsNotEmpty({ message: 'Endereço é obrigatório' })
  endereco: string;

  @ApiProperty({ description: 'Número', required: false })
  @IsOptional()
  numero?: string;

  @ApiProperty({ description: 'Complemento', required: false })
  @IsOptional()
  complemento?: string;

  @ApiProperty({ description: 'Bairro' })
  @IsNotEmpty({ message: 'Bairro é obrigatório' })
  bairro: string;

  @ApiProperty({ description: 'Cidade', default: 'Natal', required: false })
  @IsOptional()
  cidade?: string;

  @ApiProperty({ description: 'Estado', default: 'RN', required: false })
  @IsOptional()
  estado?: string;

  @ApiProperty({ description: 'CEP', required: false })
  @IsOptional()
  cep?: string;

  @ApiProperty({ description: 'Telefone' })
  @IsNotEmpty({ message: 'Telefone é obrigatório' })
  telefone: string;

  @ApiProperty({ description: 'E-mail', required: false })
  @IsOptional()
  @IsEmail({}, { message: 'E-mail inválido' })
  email?: string;

  @ApiProperty({ description: 'Parentesco', enum: Parentesco, required: false })
  @IsOptional()
  @IsEnum(Parentesco, { message: 'Parentesco inválido' })
  parentesco?: Parentesco;

  @ApiProperty({ description: 'Tipo de chave PIX', enum: ['cpf', 'email', 'telefone', 'chave_aleatoria'] })
  @IsNotEmpty({ message: 'Tipo de PIX é obrigatório' })
  @IsEnum(['cpf', 'email', 'telefone', 'chave_aleatoria'], { message: 'Tipo de PIX inválido' })
  pix_tipo: 'cpf' | 'email' | 'telefone' | 'chave_aleatoria';

  @ApiProperty({ description: 'Chave PIX' })
  @IsNotEmpty({ message: 'Chave PIX é obrigatória' })
  pix_chave: string;
}
```

#### ComposicaoFamiliarDto

```coffeescript
import { IsNotEmpty, IsOptional, IsEnum, IsNumber, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Escolaridade } from '../entities/composicao-familiar.entity';

export class ComposicaoFamiliarDto {
  @ApiProperty({ description: 'Nome do membro da família' })
  @IsNotEmpty({ message: 'Nome é obrigatório' })
  nome: string;

  @ApiProperty({ description: 'Idade do membro da família' })
  @IsNotEmpty({ message: 'Idade é obrigatória' })
  @IsNumber({}, { message: 'Idade deve ser um número' })
  @Min(0, { message: 'Idade deve ser maior ou igual a 0' })
  idade: number;

  @ApiProperty({ description: 'Parentesco com o cidadão' })
  @IsNotEmpty({ message: 'Parentesco é obrigatório' })
  parentesco: string;

  @ApiProperty({ description: 'Ocupação', required: false })
  @IsOptional()
  ocupacao?: string;

  @ApiProperty({ description: 'Escolaridade', enum: Escolaridade, required: false })
  @IsOptional()
  @IsEnum(Escolaridade, { message: 'Escolaridade inválida' })
  escolaridade?: Escolaridade;

  @ApiProperty({ description: 'Renda mensal', type: Number, default: 0, required: false })
  @IsOptional()
  @IsNumber({}, { message: 'Renda deve ser um número' })
  @Min(0, { message: 'Renda deve ser maior ou igual a 0' })
  renda?: number;
}
```

#### DadosSociaisDto

```plain
import { IsNotEmpty, IsOptional, IsEnum, IsBoolean, IsNumber, IsUUID, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { TipoBeneficioSocial, Escolaridade } from '../entities/dados-sociais.entity';

export class DadosSociaisDto {
  @ApiProperty({ description: 'Número do prontuário SUAS', required: false })
  @IsOptional()
  prontuario_suas?: string;

  @ApiProperty({ description: 'Indicador de público prioritário', default: false, required: false })
  @IsOptional()
  @IsBoolean({ message: 'Público prioritário deve ser um booleano' })
  publico_prioritario?: boolean;

  @ApiProperty({ description: 'Indicador de recebimento de benefício social', default: false, required: false })
  @IsOptional()
  @IsBoolean({ message: 'Recebe benefício deve ser um booleano' })
  recebe_beneficio?: boolean;

  @ApiProperty({ description: 'Tipo de benefício social recebido', enum: TipoBeneficioSocial, required: false })
  @IsOptional()
  @IsEnum(TipoBeneficioSocial, { message: 'Tipo de benefício inválido' })
  tipo_beneficio?: TipoBeneficioSocial;

  @ApiProperty({ description: 'Valor do benefício social recebido', type: Number, required: false })
  @IsOptional()
  @IsNumber({}, { message: 'Valor do benefício deve ser um número' })
  @Min(0, { message: 'Valor do benefício deve ser maior ou igual a 0' })
  valor_beneficio?: number;

  @ApiProperty({ description: 'Indicador de posse de curso profissionalizante', default: false, required: false })
  @IsOptional()
  @IsBoolean({ message: 'Possui curso profissionalizante deve ser um booleano' })
  possui_curso_profissionalizante?: boolean;

  @ApiProperty({ description: 'Curso profissionalizante possuído', required: false })
  @IsOptional()
  curso_profissionalizante_possuido?: string;

  @ApiProperty({ description: 'Indicador de interesse em curso profissionalizante', default: false, required: false })
  @IsOptional()
  @IsBoolean({ message: 'Interesse em curso profissionalizante deve ser um booleano' })
  interesse_curso_profissionalizante?: boolean;

  @ApiProperty({ description: 'Curso profissionalizante desejado', required: false })
  @IsOptional()
  curso_profissionalizante_desejado?: string;

  @ApiProperty({ description: 'Indicador de atividade remunerada', default: false, required: false })
  @IsOptional()
  @IsBoolean({ message: 'Atividade remunerada deve ser um booleano' })
  atividade_remunerada?: boolean;

  @ApiProperty({ description: 'Indicador de mercado formal', default: false, required: false })
  @IsOptional()
  @IsBoolean({ message: 'Mercado formal deve ser um booleano' })
  mercado_formal?: boolean;

  @ApiProperty({ description: 'Ocupação', required: false })
  @IsOptional()
  ocupacao?: string;

  @ApiProperty({ description: 'Nome do cônjuge', required: false })
  @IsOptional()
  nome_conjuge?: string;

  @ApiProperty({ description: 'Ocupação do cônjuge', required: false })
  @IsOptional()
  ocupacao_conjuge?: string;

  @ApiProperty({ description: 'Indicador de atividade remunerada do cônjuge', default: false, required: false })
  @IsOptional()
  @IsBoolean({ message: 'Atividade remunerada do cônjuge deve ser um booleano' })
  atividade_remunerada_conjuge?: boolean;

  @ApiProperty({ description: 'Indicador de mercado formal do cônjuge', default: false, required: false })
  @IsOptional()
  @IsBoolean({ message: 'Mercado formal do cônjuge deve ser um booleano' })
  mercado_formal_conjuge?: boolean;

  @ApiProperty({ description: 'Indicador de familiar apto a trabalhar', default: false, required: false })
  @IsOptional()
  @IsBoolean({ message: 'Familiar apto a trabalhar deve ser um booleano' })
  familiar_apto_a_trabalho?: boolean;

  @ApiProperty({ description: 'Área de trabalho do familiar', required: false })
  @IsOptional()
  familiar_area_de_trabalho?: string;

  @ApiProperty({ description: 'ID da situação de moradia', required: false })
  @IsOptional()
  @IsUUID(undefined, { message: 'ID de situação de moradia inválido' })
  situacao_moradia_id?: string;

  @ApiProperty({ description: 'Escolaridade', enum: Escolaridade, required: false })
  @IsOptional()
  @IsEnum(Escolaridade, { message: 'Escolaridade inválida' })
  escolaridade?: Escolaridade;

  @ApiProperty({ description: 'Indicador de presença de filhos', default: false, required: false })
  @IsOptional()
  @IsBoolean({ message: 'Tem filhos deve ser um booleano' })
  tem_filhos?: boolean;

  @ApiProperty({ description: 'Quantidade de filhos', default: 0, required: false })
  @IsOptional()
  @IsNumber({}, { message: 'Quantidade de filhos deve ser um número' })
  @Min(0, { message: 'Quantidade de filhos deve ser maior ou igual a 0' })
  quantidade_filhos?: number;

  @ApiProperty({ description: 'Número de moradores', default: 1, required: false })
  @IsOptional()
  @IsNumber({}, { message: 'Número de moradores deve ser um número' })
  @Min(1, { message: 'Número de moradores deve ser maior ou igual a 1' })
  numero_moradores?: number;

  @ApiProperty({ description: 'Renda familiar', default: 0, required: false })
  @IsOptional()
  @IsNumber({}, { message: 'Renda familiar deve ser um número' })
  @Min(0, { message: 'Renda familiar deve ser maior ou igual a 0' })
  renda_familiar?: number;
}
```

#### CidadaoFullDto

```plain
import { ApiProperty } from '@nestjs/swagger';
import { Sexo, Parentesco } from '../entities/cidadao.entity';
import { ComposicaoFamiliarDto } from './composicao-familiar.dto';
import { DadosSociaisDto } from './dados-sociais.dto';

export class CidadaoFullDto {
  @ApiProperty({ description: 'ID único do cidadão' })
  id: string;

  @ApiProperty({ description: 'Nome completo do cidadão' })
  nome: string;

  @ApiProperty({ description: 'Nome social (opcional)', required: false })
  nome_social?: string;

  @ApiProperty({ description: 'CPF do cidadão' })
  cpf: string;

  @ApiProperty({ description: 'RG do cidadão', required: false })
  rg?: string;

  @ApiProperty({ description: 'NIS (Número de Identificação Social)', required: false })
  nis?: string;

  @ApiProperty({ description: 'Data de nascimento' })
  data_nascimento: Date;

  @ApiProperty({ description: 'Sexo', enum: Sexo })
  sexo: Sexo;

  @ApiProperty({ description: 'Nome da mãe', required: false })
  nome_mae?: string;

  @ApiProperty({ description: 'Naturalidade', required: false })
  naturalidade?: string;

  @ApiProperty({ description: 'Endereço' })
  endereco: string;

  @ApiProperty({ description: 'Número', required: false })
  numero?: string;

  @ApiProperty({ description: 'Complemento', required: false })
  complemento?: string;

  @ApiProperty({ description: 'Bairro' })
  bairro: string;

  @ApiProperty({ description: 'Cidade' })
  cidade: string;

  @ApiProperty({ description: 'Estado' })
  estado: string;

  @ApiProperty({ description: 'CEP', required: false })
  cep?: string;

  @ApiProperty({ description: 'Telefone' })
  telefone: string;

  @ApiProperty({ description: 'E-mail', required: false })
  email?: string;

  @ApiProperty({ description: 'Parentesco', enum: Parentesco, required: false })
  parentesco?: Parentesco;

  @ApiProperty({ description: 'Tipo de chave PIX', enum: ['cpf', 'email', 'telefone', 'chave_aleatoria'] })
  pix_tipo: 'cpf' | 'email' | 'telefone' | 'chave_aleatoria';

  @ApiProperty({ description: 'Chave PIX' })
  pix_chave: string;

  @ApiProperty({ description: 'Data de criação' })
  created_at: Date;

  @ApiProperty({ description: 'Data de última atualização' })
  updated_at: Date;

  @ApiProperty({ description: 'Composição familiar', type: [ComposicaoFamiliarDto], required: false })
  composicao_familiar?: ComposicaoFamiliarDto[];

  @ApiProperty({ description: 'Dados sociais', type: DadosSociaisDto, required: false })
  dados_sociais?: DadosSociaisDto;
}
```

### 4.3.3 DTOs de Solicitação

#### CreateSolicitacaoDto

```plain
import { IsNotEmpty, IsOptional, IsEnum, IsUUID, IsDate, IsNumber, Min, IsString } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { TipoSolicitacaoEnum, OrigemSolicitacaoEnum } from '../entities/solicitacao.entity';

export class CreateSolicitacaoDto {
  @ApiProperty({ description: 'ID do solicitante' })
  @IsNotEmpty({ message: 'Solicitante é obrigatório' })
  @IsUUID(undefined, { message: 'ID de solicitante inválido' })
  solicitante_id: string;

  @ApiProperty({ description: 'ID do tipo de benefício' })
  @IsNotEmpty({ message: 'Tipo de benefício é obrigatório' })
  @IsUUID(undefined, { message: 'ID de tipo de benefício inválido' })
  tipo_beneficio_id: string;

  @ApiProperty({ description: 'Tipo da solicitação', enum: TipoSolicitacaoEnum, default: TipoSolicitacaoEnum.NOVO })
  @IsOptional()
  @IsEnum(TipoSolicitacaoEnum, { message: 'Tipo de solicitação inválido' })
  tipo_solicitacao?: TipoSolicitacaoEnum;

  @ApiProperty({ description: 'Quantidade de parcelas', default: 1, required: false })
  @IsOptional()
  @IsNumber({}, { message: 'Quantidade de parcelas deve ser um número' })
  @Min(1, { message: 'Quantidade de parcelas deve ser maior ou igual a 1' })
  quantidade_parcelas?: number;

  @ApiProperty({ description: 'Origem da solicitação', enum: OrigemSolicitacaoEnum, default: OrigemSolicitacaoEnum.PRESENCIAL })
  @IsOptional()
  @IsEnum(OrigemSolicitacaoEnum, { message: 'Origem inválida' })
  origem?: OrigemSolicitacaoEnum;

  @ApiProperty({ description: 'Parecer técnico', required: false })
  @IsOptional()
  @IsString({ message: 'Parecer técnico deve ser um texto' })
  parecer_tecnico?: string;

  @ApiProperty({ description: 'ID do destinatário de pagamento' })
  @IsNotEmpty({ message: 'Destinatário de pagamento é obrigatório' })
  @IsUUID(undefined, { message: 'ID de destinatário de pagamento inválido' })
  destinatario_pagamento_id: string;

  @ApiProperty({ description: 'Observações', required: false })
  @IsOptional()
  @IsString({ message: 'Observações deve ser um texto' })
  observacoes?: string;
}
```

#### DadosBeneficiosDto

```plain
import { IsNotEmpty, IsOptional, IsEnum, IsDate, IsBoolean, IsNumber, Min, IsString } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { TipoBeneficioEnum, MotivoAluguelSocialEnum } from '../entities/dados-beneficios.entity';

export class DadosBeneficiosDto {
  @ApiProperty({ description: 'Tipo de benefício', enum: TipoBeneficioEnum })
  @IsNotEmpty({ message: 'Tipo de benefício é obrigatório' })
  @IsEnum(TipoBeneficioEnum, { message: 'Tipo de benefício inválido' })
  tipo_beneficio: TipoBeneficioEnum;

  @ApiProperty({ description: 'Valor solicitado', type: Number, required: false })
  @IsOptional()
  @IsNumber({}, { message: 'Valor solicitado deve ser um número' })
  @Min(0, { message: 'Valor solicitado deve ser maior ou igual a 0' })
  valor_solicitado?: number;

  @ApiProperty({ description: 'Período em meses', required: false })
  @IsOptional()
  @IsNumber({}, { message: 'Período em meses deve ser um número' })
  @Min(1, { message: 'Período em meses deve ser maior ou igual a 1' })
  periodo_meses?: number;

  // Campos para Auxílio Natalidade
  @ApiProperty({ description: 'Data prevista para o parto', type: Date, required: false })
  @IsOptional()
  @Type(() => Date)
  @IsDate({ message: 'Data prevista para o parto inválida' })
  data_prevista_parto?: Date;

  @ApiProperty({ description: 'Data de nascimento', type: Date, required: false })
  @IsOptional()
  @Type(() => Date)
  @IsDate({ message: 'Data de nascimento inválida' })
  data_nascimento?: Date;

  @ApiProperty({ description: 'Indicador de pré-natal', default: false, required: false })
  @IsOptional()
  @IsBoolean({ message: 'Pré-natal deve ser um booleano' })
  pre_natal?: boolean;

  @ApiProperty({ description: 'Indicador de PSF/UBS', default: false, required: false })
  @IsOptional()
  @IsBoolean({ message: 'PSF/UBS deve ser um booleano' })
  psf_ubs?: boolean;

  @ApiProperty({ description: 'Indicador de gravidez de risco', default: false, required: false })
  @IsOptional()
  @IsBoolean({ message: 'Gravidez de risco deve ser um booleano' })
  gravidez_risco?: boolean;

  @ApiProperty({ description: 'Indicador de gravidez gemelar', default: false, required: false })
  @IsOptional()
  @IsBoolean({ message: 'Gravidez gemelar deve ser um booleano' })
  gravidez_gemelar?: boolean;

  @ApiProperty({ description: 'Indicador de presença de filhos', default: false, required: false })
  @IsOptional()
  @IsBoolean({ message: 'Possui filhos deve ser um booleano' })
  possui_filhos?: boolean;

  // Campos para Aluguel Social
  @ApiProperty({ description: 'Motivo do aluguel social', enum: MotivoAluguelSocialEnum, required: false })
  @IsOptional()
  @IsEnum(MotivoAluguelSocialEnum, { message: 'Motivo inválido' })
  motivo?: MotivoAluguelSocialEnum;

  @ApiProperty({ description: 'Detalhes do motivo', required: false })
  @IsOptional()
  @IsString({ message: 'Detalhes do motivo deve ser um texto' })
  detalhes_motivo?: string;
}
```

#### AprovarSolicitacaoDto

```plain
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AprovarSolicitacaoDto {
  @ApiProperty({ description: 'Parecer da SEMTAS' })
  @IsNotEmpty({ message: 'Parecer da SEMTAS é obrigatório' })
  @IsString({ message: 'Parecer da SEMTAS deve ser um texto' })
  parecer_semtas: string;

  @ApiProperty({ description: 'Observações adicionais', required: false })
  @IsOptional()
  @IsString({ message: 'Observações deve ser um texto' })
  observacoes?: string;
}
```

#### PendenciarSolicitacaoDto

```plain
import { IsNotEmpty, IsOptional, IsString, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

class PendenciaItemDto {
  @ApiProperty({ description: 'Descrição da pendência' })
  @IsNotEmpty({ message: 'Descrição é obrigatória' })
  @IsString({ message: 'Descrição deve ser um texto' })
  descricao: string;
}

export class PendenciarSolicitacaoDto {
  @ApiProperty({ description: 'Parecer da SEMTAS' })
  @IsNotEmpty({ message: 'Parecer da SEMTAS é obrigatório' })
  @IsString({ message: 'Parecer da SEMTAS deve ser um texto' })
  parecer_semtas: string;

  @ApiProperty({ description: 'Lista de pendências', type: [PendenciaItemDto] })
  @IsNotEmpty({ message: 'Pendências são obrigatórias' })
  @IsArray({ message: 'Pendências devem ser uma lista' })
  @ValidateNested({ each: true })
  @Type(() => PendenciaItemDto)
  pendencias: PendenciaItemDto[];

  @ApiProperty({ description: 'Observações adicionais', required: false })
  @IsOptional()
  @IsString({ message: 'Observações deve ser um texto' })
  observacoes?: string;
}
```

#### LiberarBeneficioDto

```plain
import { IsNotEmpty, IsOptional, IsNumber, Min, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LiberarBeneficioDto {
  @ApiProperty({ description: 'Valor pago', type: Number })
  @IsNotEmpty({ message: 'Valor pago é obrigatório' })
  @IsNumber({}, { message: 'Valor pago deve ser um número' })
  @Min(0, { message: 'Valor pago deve ser maior ou igual a 0' })
  valor_pago: number;

  @ApiProperty({ description: 'Observações adicionais', required: false })
  @IsOptional()
  @IsString({ message: 'Observações deve ser um texto' })
  observacoes?: string;
}
```

#### SolicitacaoResponseDto

```plain
import { ApiProperty } from '@nestjs/swagger';
import { StatusSolicitacaoEnum, TipoSolicitacaoEnum, OrigemSolicitacaoEnum } from '../entities/solicitacao.entity';

export class SolicitacaoResponseDto {
  @ApiProperty({ description: 'ID único da solicitação' })
  id: string;

  @ApiProperty({ description: 'Número de protocolo' })
  protocolo: string;

  @ApiProperty({ description: 'Solicitante' })
  solicitante: {
    id: string;
    nome: string;
    cpf: string;
  };

  @ApiProperty({ description: 'Tipo de benefício' })
  tipoBeneficio: {
    id: string;
    nome: string;
  };

  @ApiProperty({ description: 'Unidade' })
  unidade: {
    id: string;
    nome: string;
  };

  @ApiProperty({ description: 'Técnico responsável' })
  tecnico: {
    id: string;
    nome: string;
  };

  @ApiProperty({ description: 'Tipo da solicitação', enum: TipoSolicitacaoEnum })
  tipo_solicitacao: TipoSolicitacaoEnum;

  @ApiProperty({ description: 'Quantidade de parcelas' })
  quantidade_parcelas: number;

  @ApiProperty({ description: 'Data de abertura' })
  data_abertura: Date;

  @ApiProperty({ description: 'Status', enum: StatusSolicitacaoEnum })
  status: StatusSolicitacaoEnum;

  @ApiProperty({ description: 'Origem', enum: OrigemSolicitacaoEnum })
  origem: OrigemSolicitacaoEnum;

  @ApiProperty({ description: 'Parecer técnico', required: false })
  parecer_tecnico?: string;

  @ApiProperty({ description: 'Parecer da SEMTAS', required: false })
  parecer_semtas?: string;

  @ApiProperty({ description: 'Aprovador', required: false })
  aprovador?: {
    id: string;
    nome: string;
  };

  @ApiProperty({ description: 'Data de aprovação', required: false })
  data_aprovacao?: Date;

  @ApiProperty({ description: 'Data de liberação', required: false })
  data_liberacao?: Date;

  @ApiProperty({ description: 'Liberador', required: false })
  liberador?: {
    id: string;
    nome: string;
  };

  @ApiProperty({ description: 'Destinatário de pagamento', required: false })
  destinatario_pagamento?: {
    id: string;
    nome: string;
  };

  @ApiProperty({ description: 'Valor pago', required: false })
  valor_pago?: number;

  @ApiProperty({ description: 'Observações', required: false })
  observacoes?: string;

  @ApiProperty({ description: 'Data de criação' })
  created_at: Date;

  @ApiProperty({ description: 'Data de última atualização' })
  updated_at: Date;

  @ApiProperty({ description: 'Dados específicos do benefício', required: false })
  dados_beneficios?: any;

  @ApiProperty({ description: 'Pendências', required: false })
  pendencias?: any[];
}
```

### 4.3.4 DTOs de Documentos

#### UploadDocumentoDto

```plain
import { IsNotEmpty, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UploadDocumentoDto {
  @ApiProperty({ description: 'ID da solicitação' })
  @IsNotEmpty({ message: 'Solicitação é obrigatória' })
  @IsUUID(undefined, { message: 'ID de solicitação inválido' })
  solicitacao_id: string;

  @ApiProperty({ description: 'ID do requisito de documento' })
  @IsNotEmpty({ message: 'Requisito de documento é obrigatório' })
  @IsUUID(undefined, { message: 'ID de requisito de documento inválido' })
  requisito_documento_id: string;

  @ApiProperty({ type: 'string', format: 'binary', description: 'Arquivo a ser enviado' })
  file: any;
}
```

#### VerificarDocumentoDto

```plain
import { IsNotEmpty, IsEnum, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { StatusDocumentoEnum } from '../entities/documento-enviado.entity';

export class VerificarDocumentoDto {
  @ApiProperty({ description: 'Status do documento', enum: StatusDocumentoEnum })
  @IsNotEmpty({ message: 'Status é obrigatório' })
  @IsEnum(StatusDocumentoEnum, { message: 'Status inválido' })
  status: StatusDocumentoEnum;

  @ApiProperty({ description: 'Observação', required: false })
  @IsOptional()
  @IsString({ message: 'Observação deve ser um texto' })
  observacao?: string;
}
```

#### DocumentoResponseDto

```plain
import { ApiProperty } from '@nestjs/swagger';
import { StatusDocumentoEnum } from '../entities/documento-enviado.entity';

export class DocumentoResponseDto {
  @ApiProperty({ description: 'ID único do vínculo entre documento e requisito' })
  id: string;

  @ApiProperty({ description: 'Requisito' })
  requisito: string;

  @ApiProperty({ description: 'Nome do arquivo' })
  nomeArquivo: string;

  @ApiProperty({ description: 'Caminho do arquivo' })
  caminhoArquivo: string;

  @ApiProperty({ description: 'Tipo MIME' })
  mimeType: string;

  @ApiProperty({ description: 'Tamanho em bytes' })
  tamanho: number;

  @ApiProperty({ description: 'Status do documento', enum: StatusDocumentoEnum })
  status: StatusDocumentoEnum;

  @ApiProperty({ description: 'Data de verificação', required: false })
  dataVerificacao?: Date;

  @ApiProperty({ description: 'Verificador', required: false })
  verificador?: string;

  @ApiProperty({ description: 'Observação', required: false })
  observacao?: string;
}
```

### 4.3.5 DTOs de Filtro e Busca

#### PaginationDto

```coffeescript
import { IsNumber, IsOptional, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class PaginationDto {
  @ApiProperty({
    description: 'Número da página (começando em 1)',
    type: Number,
    default: 1,
    required: false,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiProperty({
    description: 'Quantidade de itens por página',
    type: Number,
    default: 10,
    required: false,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 10;
}
```

#### FilterSolicitacoesDto

```kotlin
import { IsOptional, IsEnum, IsUUID, IsString, IsDateString, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { StatusSolicitacaoEnum } from '../entities/solicitacao.entity';

export class FilterSolicitacoesDto extends PaginationDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  protocolo?: string;

  @ApiProperty({ required: false, isArray: true, enum: StatusSolicitacaoEnum })
  @IsOptional()
  @IsEnum(StatusSolicitacaoEnum, { each: true })
  status?: StatusSolicitacaoEnum[];

  @ApiProperty({ required: false })
  @IsOptional()
  @IsUUID()
  tipoBeneficioId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsUUID()
  unidadeId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  nomeSolicitante?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  cpfSolicitante?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  dataInicio?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  dataFim?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  pendentes?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  sortBy?: string;

  @ApiProperty({ required: false, enum: ['ASC', 'DESC'] })
  @IsOptional()
  @IsEnum(['ASC', 'DESC'])
  sortOrder?: 'ASC' | 'DESC';
}
```

#### SearchCidadaoDto

```javascript
import { IsOptional, IsString, IsDateString, IsBoolean, IsNumber, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { PaginationDto } from
```

Vou continuar com a documentação dos DTOs.

#### SearchCidadaoDto (continuação)

```plain
import { IsOptional, IsString, IsDateString, IsBoolean, IsNumber, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { PaginationDto } from '../../common/dto/pagination.dto';

export class SearchCidadaoDto extends PaginationDto {
  @ApiProperty({ required: false, description: 'Nome ou nome social do cidadão' })
  @IsOptional()
  @IsString()
  nome?: string;

  @ApiProperty({ required: false, description: 'CPF do cidadão' })
  @IsOptional()
  @IsString()
  cpf?: string;

  @ApiProperty({ required: false, description: 'NIS do cidadão' })
  @IsOptional()
  @IsString()
  nis?: string;

  @ApiProperty({ required: false, description: 'Bairro de residência' })
  @IsOptional()
  @IsString()
  bairro?: string;

  @ApiProperty({ required: false, description: 'Data de nascimento' })
  @IsOptional()
  @IsDateString()
  dataNascimento?: string;

  @ApiProperty({ required: false, description: 'Valor máximo de renda familiar' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  rendaFamiliarMax?: number;

  @ApiProperty({ required: false, description: 'Valor mínimo de renda familiar' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  rendaFamiliarMin?: number;

  @ApiProperty({ required: false, description: 'Filtrar por público prioritário' })
  @IsOptional()
  @IsBoolean()
  publicoPrioritario?: boolean;

  @ApiProperty({ required: false, description: 'Filtrar beneficiários com benefícios ativos' })
  @IsOptional()
  @IsBoolean()
  beneficioAtivo?: boolean;
}
```

#### ReportFilterDto

```plain
import { IsOptional, IsUUID, IsDateString, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ReportFilterDto {
  @ApiProperty({ required: false, description: 'ID da unidade' })
  @IsOptional()
  @IsUUID()
  unidadeId?: string;

  @ApiProperty({ required: false, description: 'ID do tipo de benefício' })
  @IsOptional()
  @IsUUID()
  tipoBeneficioId?: string;

  @ApiProperty({ required: false, description: 'Data inicial do período' })
  @IsOptional()
  @IsDateString()
  dataInicio?: string;

  @ApiProperty({ required: false, description: 'Data final do período' })
  @IsOptional()
  @IsDateString()
  dataFim?: string;

  @ApiProperty({ required: false, description: 'Formato de saída (pdf, csv, json)' })
  @IsOptional()
  @IsString()
  formato?: 'pdf' | 'csv' | 'json';
}
```

#### SearchAuditLogDto

```plain
import { IsOptional, IsUUID, IsDateString, IsString, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { AcaoAuditoriaEnum } from '../entities/log-auditoria.entity';

export class SearchAuditLogDto extends PaginationDto {
  @ApiProperty({ required: false, description: 'Entidade auditada' })
  @IsOptional()
  @IsString()
  entidade?: string;

  @ApiProperty({ required: false, description: 'ID da entidade auditada' })
  @IsOptional()
  @IsUUID()
  entidadeId?: string;

  @ApiProperty({ required: false, description: 'ID do usuário que realizou a ação' })
  @IsOptional()
  @IsUUID()
  usuarioId?: string;

  @ApiProperty({ required: false, description: 'Ação realizada', enum: AcaoAuditoriaEnum })
  @IsOptional()
  @IsEnum(AcaoAuditoriaEnum)
  acao?: AcaoAuditoriaEnum;

  @ApiProperty({ required: false, description: 'Endereço IP' })
  @IsOptional()
  @IsString()
  ip?: string;

  @ApiProperty({ required: false, description: 'Data inicial do período' })
  @IsOptional()
  @IsDateString()
  dataInicio?: string;

  @ApiProperty({ required: false, description: 'Data final do período' })
  @IsOptional()
  @IsDateString()
  dataFim?: string;
}
```

## 4.4 Transformações e Mapeamentos

### 4.4.1 Classe de Mapeamento para Usuário

```javascript
import { plainToClass } from 'class-transformer';
import { User } from '../entities/user.entity';
import { UserResponseDto } from '../dto/user-response.dto';

export class UserMapper {
  static toDto(entity: User): UserResponseDto {
    const dto = plainToClass(UserResponseDto, entity, { excludeExtraneousValues: true });

    // Mapear relacionamentos
    if (entity.unidade) {
      dto.unidade = {
        id: entity.unidade.id,
        nome: entity.unidade.nome,
      };
    }

    if (entity.setor) {
      dto.setor = {
        id: entity.setor.id,
        nome: entity.setor.nome,
      };
    }

    return dto;
  }

  static toDtoList(entities: User[]): UserResponseDto[] {
    return entities.map(entity => this.toDto(entity));
  }
}
```

### 4.4.2 Classe de Mapeamento para Cidadão

```javascript
import { plainToClass } from 'class-transformer';
import { Cidadao } from '../entities/cidadao.entity';
import { CidadaoFullDto } from '../dto/cidadao-full.dto';
import { ComposicaoFamiliarDto } from '../dto/composicao-familiar.dto';
import { DadosSociaisDto } from '../dto/dados-sociais.dto';

export class CidadaoMapper {
  static toDto(entity: Cidadao): CidadaoFullDto {
    const dto = plainToClass(CidadaoFullDto, entity, { excludeExtraneousValues: true });

    // Mapear composição familiar se disponível
    if (entity.composicao_familiar && entity.composicao_familiar.length > 0) {
      dto.composicao_familiar = entity.composicao_familiar.map(membro => {
        return plainToClass(ComposicaoFamiliarDto, membro, { excludeExtraneousValues: true });
      });
    }

    // Mapear dados sociais se disponíveis
    if (entity.dados_sociais) {
      dto.dados_sociais = plainToClass(DadosSociaisDto, entity.dados_sociais, { excludeExtraneousValues: true });
    }

    return dto;
  }

  static toDtoList(entities: Cidadao[]): CidadaoFullDto[] {
    return entities.map(entity => this.toDto(entity));
  }
}
```

### 4.4.3 Classe de Mapeamento para Solicitação

```plain
import { plainToClass } from 'class-transformer';
import { Solicitacao } from '../entities/solicitacao.entity';
import { SolicitacaoResponseDto } from '../dto/solicitacao-response.dto';

export class SolicitacaoMapper {
  static toDto(entity: Solicitacao): SolicitacaoResponseDto {
    const dto = plainToClass(SolicitacaoResponseDto, entity, { excludeExtraneousValues: true });

    // Mapear solicitante
    if (entity.solicitante) {
      dto.solicitante = {
        id: entity.solicitante.id,
        nome: entity.solicitante.nome,
        cpf: entity.solicitante.cpf,
      };
    }

    // Mapear tipo de benefício
    if (entity.tipoBeneficio) {
      dto.tipoBeneficio = {
        id: entity.tipoBeneficio.id,
        nome: entity.tipoBeneficio.nome,
      };
    }

    // Mapear unidade
    if (entity.unidade) {
      dto.unidade = {
        id: entity.unidade.id,
        nome: entity.unidade.nome,
      };
    }

    // Mapear técnico
    if (entity.tecnico) {
      dto.tecnico = {
        id: entity.tecnico.id,
        nome: entity.tecnico.nome,
      };
    }

    // Mapear aprovador se disponível
    if (entity.aprovador) {
      dto.aprovador = {
        id: entity.aprovador.id,
        nome: entity.aprovador.nome,
      };
    }

    // Mapear liberador se disponível
    if (entity.liberador) {
      dto.liberador = {
        id: entity.liberador.id,
        nome: entity.liberador.nome,
      };
    }

    // Mapear destinatário de pagamento se disponível
    if (entity.destinatario_pagamento) {
      dto.destinatario_pagamento = {
        id: entity.destinatario_pagamento.id,
        nome: entity.destinatario_pagamento.nome,
      };
    }

    // Mapear dados específicos do benefício se disponíveis
    if (entity.dados_beneficios) {
      dto.dados_beneficios = entity.dados_beneficios;
    }

    // Mapear pendências se disponíveis
    if (entity.pendencias && entity.pendencias.length > 0) {
      dto.pendencias = entity.pendencias.map(pendencia => ({
        id: pendencia.id,
        descricao: pendencia.descricao,
        resolvida: pendencia.resolvida,
        data_criacao: pendencia.data_criacao,
        data_resolucao: pendencia.data_resolucao,
      }));
    }

    return dto;
  }

  static toDtoList(entities: Solicitacao[]): SolicitacaoResponseDto[] {
    return entities.map(entity => this.toDto(entity));
  }
}
```

## 4.5 Validações Personalizadas

### 4.5.1 Validador de CPF

```typescript
import { ValidatorConstraint, ValidatorConstraintInterface, ValidationOptions, registerDecorator } from 'class-validator';

@ValidatorConstraint({ name: 'isCPF', async: false })
export class IsCPFConstraint implements ValidatorConstraintInterface {
  validate(cpf: string) {
    if (!cpf) {
      return false;
    }

    // Remove caracteres não numéricos
    cpf = cpf.replace(/[^\d]/g, '');

    // Verifica se tem 11 dígitos
    if (cpf.length !== 11) {
      return false;
    }

    // Verifica se todos os dígitos são iguais
    if (/^(\d)\1+$/.test(cpf)) {
      return false;
    }

    // Validação do dígito verificador
    let soma = 0;
    let resto;

    // Primeiro dígito verificador
    for (let i = 1; i <= 9; i++) {
      soma += parseInt(cpf.substring(i - 1, i)) * (11 - i);
    }
    resto = (soma * 10) % 11;
    if (resto === 10 || resto === 11) {
      resto = 0;
    }
    if (resto !== parseInt(cpf.substring(9, 10))) {
      return false;
    }

    // Segundo dígito verificador
    soma = 0;
    for (let i = 1; i <= 10; i++) {
      soma += parseInt(cpf.substring(i - 1, i)) * (12 - i);
    }
    resto = (soma * 10) % 11;
    if (resto === 10 || resto === 11) {
      resto = 0;
    }
    if (resto !== parseInt(cpf.substring(10, 11))) {
      return false;
    }

    return true;
  }

  defaultMessage() {
    return 'CPF inválido';
  }
}

export function IsCPF(validationOptions?: ValidationOptions) {
  return function (object: any, propertyName: string) {
    registerDecorator({
      name: 'isCPF',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: IsCPFConstraint,
    });
  };
}
```

### 4.5.2 Validador de Tipo de Benefício para Dados do Benefício

```typescript
import { ValidatorConstraint, ValidatorConstraintInterface, ValidationOptions, registerDecorator, ValidationArguments } from 'class-validator';
import { TipoBeneficioEnum } from '../entities/dados-beneficios.entity';

@ValidatorConstraint({ name: 'isValidTipoBeneficio', async: false })
export class IsValidTipoBeneficioConstraint implements ValidatorConstraintInterface {
  validate(tipo: TipoBeneficioEnum, args: ValidationArguments) {
    const object = args.object as any;

    // Verifique campos específicos de acordo com o tipo de benefício
    if (tipo === TipoBeneficioEnum.AUXILIO_NATALIDADE) {
      // Para Auxílio Natalidade, deve ter data prevista para o parto ou data de nascimento
      return !!object.data_prevista_parto || !!object.data_nascimento;
    } else if (tipo === TipoBeneficioEnum.ALUGUEL_SOCIAL) {
      // Para Aluguel Social, deve ter motivo, valor solicitado e período em meses
      return !!object.motivo && !!object.valor_solicitado && !!object.periodo_meses;
    }

    return false;
  }

  defaultMessage(args: ValidationArguments) {
    const object = args.object as any;
    const tipo = object.tipo_beneficio;

    if (tipo === TipoBeneficioEnum.AUXILIO_NATALIDADE) {
      return 'Para Auxílio Natalidade, a data prevista para o parto ou data de nascimento é obrigatória';
    } else if (tipo === TipoBeneficioEnum.ALUGUEL_SOCIAL) {
      return 'Para Aluguel Social, o motivo, valor solicitado e período em meses são obrigatórios';
    }

    return 'Tipo de benefício inválido ou dados insuficientes';
  }
}

export function IsValidTipoBeneficio(validationOptions?: ValidationOptions) {
  return function (object: any, propertyName: string) {
    registerDecorator({
      name: 'isValidTipoBeneficio',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: IsValidTipoBeneficioConstraint,
    });
  };
}
```

### 4.5.3 Validador de Data de Nascimento

```typescript
import { ValidatorConstraint, ValidatorConstraintInterface, ValidationOptions, registerDecorator, ValidationArguments } from 'class-validator';

@ValidatorConstraint({ name: 'isValidDateOfBirth', async: false })
export class IsValidDateOfBirthConstraint implements ValidatorConstraintInterface {
  validate(date: Date) {
    if (!date) {
      return false;
    }

    const birthDate = new Date(date);
    const today = new Date();

    // Data de nascimento não pode ser no futuro
    if (birthDate > today) {
      return false;
    }

    // Idade máxima de 120 anos
    const maxAgeDate = new Date();
    maxAgeDate.setFullYear(today.getFullYear() - 120);
    if (birthDate < maxAgeDate) {
      return false;
    }

    return true;
  }

  defaultMessage(args: ValidationArguments) {
    return 'Data de nascimento inválida';
  }
}

export function IsValidDateOfBirth(validationOptions?: ValidationOptions) {
  return function (object: any, propertyName: string) {
    registerDecorator({
      name: 'isValidDateOfBirth',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: IsValidDateOfBirthConstraint,
    });
  };
}
```

## 4.6 Serialização e Desserialização

### 4.6.1 Interceptor de Transformação Global

```typescript
import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ClassConstructor, plainToClass } from 'class-transformer';

interface ClassType<T> {
  new (...args: any[]): T;
}

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<any, T> {
  constructor(private readonly classType: ClassType<T>) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<T> {
    return next.handle().pipe(
      map(data => {
        return plainToClass(this.classType, data, {
          excludeExtraneousValues: true,
        });
      }),
    );
  }
}
```

### 4.6.2 Configuração de Serialização Global

```javascript
// main.ts
import { NestFactory } from '@nestjs/core';
import { ValidationPipe, ClassSerializerInterceptor } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Configuração de validação global
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Configuração de serialização global
  app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));

  // Configuração do Swagger
  const config = new DocumentBuilder()
    .setTitle('Sistema de Gestão de Benefícios Eventuais - SEMTAS')
    .setDescription('API para gestão de benefícios eventuais da SEMTAS de Natal/RN')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  await app.listen(3000);
}
bootstrap();
```

## 4.7 Considerações Finais

Este documento apresenta uma visão detalhada das entidades e DTOs do Sistema de Gestão de Benefícios Eventuais, incluindo:

*   **Entidades TypeORM** completas com relacionamentos e validações
*   **DTOs de entrada e saída** com validações específicas
*   **Mapeadores** para conversão entre entidades e DTOs
*   **Validadores personalizados** para regras de negócio específicas
*   **Configurações de serialização** para formatação adequada das respostas

As entidades e DTOs foram projetados para suportar todos os requisitos funcionais do sistema, com especial atenção para:

1. **Extensibilidade** para futuros tipos de benefícios
2. **Validação consistente** em todas as camadas da aplicação
3. **Segurança de dados** para conformidade com a LGPD
4. **Documentação clara** utilizando Swagger/OpenAPI

A estrutura apresentada segue as melhores práticas de desenvolvimento com TypeORM e NestJS, garantindo um código limpo, manutenível e extensível.