import { DataSource } from 'typeorm';
import { runSeeder } from 'typeorm-extension';
import InitialSeeder from './initial.seed';

// Importar os seeds específicos
import UserSeed from './initial/UserSeed';
import UnidadeSeed from './initial/UnidadeSeed';
import SetorTipoBeneficioSeed from './initial/SetorTipoBeneficioSeed';
import TipoDocumentoSeed from './initial/TipoDocumentoSeed';
import TipoBeneficioSeed from './initial/TipoBeneficioSeed';
import RequisitosBeneficioSeed from './initial/RequisitosBeneficioSeed';
import FluxoBeneficioSeed from './initial/FluxoBeneficioSeed';
import CidadaoSeed from './initial/CidadaoSeed';
import SolicitacaoSeed from './initial/SolicitacaoSeed';

export const runAllSeeds = async (dataSource: DataSource) => {
  // Executar seeds iniciais
  await runSeeder(dataSource, InitialSeeder);

  // Executar seeds específicos na ordem correta
  await runSeeder(dataSource, UserSeed);
  await runSeeder(dataSource, UnidadeSeed);
  await runSeeder(dataSource, SetorTipoBeneficioSeed);
  await runSeeder(dataSource, TipoDocumentoSeed);
  await runSeeder(dataSource, TipoBeneficioSeed);
  await runSeeder(dataSource, RequisitosBeneficioSeed);
  await runSeeder(dataSource, FluxoBeneficioSeed);
  await runSeeder(dataSource, CidadaoSeed);
  await runSeeder(dataSource, SolicitacaoSeed);

  // Seeds de teste foram removidos pois o arquivo estava vazio
  console.log('Todos os seeds foram executados com sucesso!');
  
  // Caso seja necessário adicionar seeds de teste no futuro, descomentar o código abaixo
  // if (process.env.NODE_ENV === 'development') {
  //   await runSeeder(dataSource, TestSeeder);
  // }
};