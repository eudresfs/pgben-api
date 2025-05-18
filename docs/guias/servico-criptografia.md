# Guia do Serviço de Criptografia

## Visão Geral

O `CriptografiaService` é um componente fundamental do PGBen responsável pela proteção de dados sensíveis através de criptografia. Este serviço implementa o algoritmo AES-256-GCM, que garante tanto a confidencialidade quanto a integridade dos dados, atendendo aos requisitos da LGPD para proteção de dados pessoais sensíveis.

## Funcionalidades Principais

- Criptografia e descriptografia de dados em formato texto
- Criptografia e descriptografia de objetos JSON
- Criptografia e descriptografia de arquivos (buffers)
- Geração e verificação de hashes para integridade de dados
- Gerenciamento seguro de chaves criptográficas

## Conceitos Técnicos

### AES-256-GCM

O serviço utiliza o algoritmo AES (Advanced Encryption Standard) com:
- Chave de 256 bits para máxima segurança
- Modo GCM (Galois/Counter Mode) que oferece:
  - Criptografia autenticada
  - Verificação de integridade integrada
  - Proteção contra ataques de manipulação

### Componentes da Criptografia

- **Chave Mestra**: Chave de 256 bits usada para todas as operações de criptografia
- **IV (Initialization Vector)**: Vetor de inicialização único para cada operação (128 bits)
- **Tag de Autenticação**: Garante a integridade dos dados criptografados (128 bits)

## Exemplos de Uso

### Criptografia de Texto

```typescript
import { CriptografiaService } from 'src/shared/services/criptografia.service';

@Injectable()
export class MeuServico {
  constructor(private criptografiaService: CriptografiaService) {}

  async processarDadoSensivel(cpf: string) {
    // Criptografar o CPF
    const cpfCriptografado = this.criptografiaService.criptografarTexto(cpf);
    
    // Armazenar o CPF criptografado
    await this.repository.save({
      cpfCriptografado: cpfCriptografado.textoCriptografado,
      iv: cpfCriptografado.iv,
      authTag: cpfCriptografado.authTag
    });
  }
}
```

### Descriptografia de Texto

```typescript
@Injectable()
export class MeuServico {
  constructor(private criptografiaService: CriptografiaService) {}

  async recuperarDadoSensivel(id: string) {
    // Buscar dados criptografados
    const dados = await this.repository.findOne(id);
    
    // Descriptografar o CPF
    const cpf = this.criptografiaService.descriptografarTexto(
      dados.cpfCriptografado,
      dados.iv,
      dados.authTag
    );
    
    return cpf;
  }
}
```

### Criptografia de Objeto

```typescript
@Injectable()
export class MeuServico {
  constructor(private criptografiaService: CriptografiaService) {}

  async salvarDadosPessoais(dados: DadosPessoaisDto) {
    // Criptografar o objeto inteiro
    const dadosCriptografados = this.criptografiaService.criptografarObjeto(dados);
    
    // Armazenar dados criptografados
    await this.repository.save({
      dadosCriptografados: dadosCriptografados.objetoCriptografado,
      iv: dadosCriptografados.iv,
      authTag: dadosCriptografados.authTag
    });
  }
}
```

### Criptografia de Arquivo

```typescript
@Injectable()
export class DocumentoService {
  constructor(private criptografiaService: CriptografiaService) {}

  async processarDocumento(arquivo: Buffer) {
    // Criptografar o arquivo
    const arquivoCriptografado = this.criptografiaService.criptografarBuffer(arquivo);
    
    // Armazenar ou transmitir o arquivo criptografado
    return {
      conteudo: arquivoCriptografado.dadosCriptografados,
      iv: arquivoCriptografado.iv,
      authTag: arquivoCriptografado.authTag
    };
  }
}
```

### Verificação de Integridade

```typescript
@Injectable()
export class DocumentoService {
  constructor(private criptografiaService: CriptografiaService) {}

  async verificarIntegridade(arquivo: Buffer, hashOriginal: string) {
    // Gerar hash do arquivo
    const hash = this.criptografiaService.gerarHash(arquivo);
    
    // Verificar se o hash corresponde ao original
    return hash === hashOriginal;
  }
}
```

## Boas Práticas

### Armazenamento Seguro

Ao armazenar dados criptografados:

1. **Sempre armazene separadamente**:
   - O dado criptografado
   - O IV (Initialization Vector)
   - A tag de autenticação

2. **Nunca reutilize** o mesmo IV para diferentes operações de criptografia

3. **Sempre verifique a tag de autenticação** ao descriptografar

### Uso em Banco de Dados

Para armazenar dados criptografados em banco de dados:

```typescript
// Definição da entidade
@Entity()
export class DadoSensivel {
  @PrimaryGeneratedColumn()
  id: number;
  
  @Column({ type: 'bytea' }) // PostgreSQL
  dadoCriptografado: Buffer;
  
  @Column({ type: 'bytea' })
  iv: Buffer;
  
  @Column({ type: 'bytea' })
  authTag: Buffer;
}
```

### Tratamento de Erros

Sempre trate erros de criptografia adequadamente:

```typescript
try {
  const dadoDescriptografado = this.criptografiaService.descriptografarTexto(
    dadoCriptografado,
    iv,
    authTag
  );
  return dadoDescriptografado;
} catch (error) {
  this.logger.error(`Erro ao descriptografar: ${error.message}`);
  throw new ErroDescriptografiaException('Não foi possível descriptografar os dados');
}
```

## Considerações de Segurança

1. **Nunca exponha a chave mestra** em logs, banco de dados ou repositórios de código
2. **Sempre valide a integridade** dos dados descriptografados
3. **Implemente rotação periódica de chaves** conforme a política de segurança
4. **Monitore tentativas de descriptografia com falha** como possíveis ataques
5. **Limite o acesso ao serviço de criptografia** apenas a componentes que realmente precisam

## Limitações

- A criptografia adiciona sobrecarga ao tamanho dos dados (IV + tag de autenticação)
- Perda da chave mestra significa perda permanente de acesso aos dados criptografados
- Não é adequado para criptografia de grandes volumes de dados em tempo real

## Integração com Outros Serviços

O `CriptografiaService` é frequentemente usado em conjunto com:

- `MinioService`: Para criptografia de documentos sensíveis
- `AuditoriaService`: Para proteção de logs de auditoria
- `ChaveMonitorService`: Para monitoramento da integridade das chaves

## Referências

- [Documentação do Node.js Crypto](https://nodejs.org/api/crypto.html)
- [NIST Recommendations for AES-GCM](https://nvlpubs.nist.gov/nistpubs/Legacy/SP/nistspecialpublication800-38d.pdf)
- [Guia de Segurança para Chaves de Criptografia](./seguranca-chaves.md)
