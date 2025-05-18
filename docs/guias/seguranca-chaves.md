# Guia de Segurança para Chaves de Criptografia

## Visão Geral

Este documento descreve as práticas de segurança implementadas para proteger as chaves de criptografia utilizadas no PGBen, bem como os procedimentos para gerenciamento seguro dessas chaves.

## Arquitetura de Segurança

O PGBen utiliza criptografia AES-256-GCM para proteger dados sensíveis. A segurança deste sistema depende da proteção adequada das chaves de criptografia.

### Componentes de Segurança

1. **CriptografiaService**
   - Gerencia a chave mestra de criptografia
   - Implementa operações de criptografia/descriptografia
   - Integra-se com o sistema de monitoramento

2. **ChaveMonitorService**
   - Monitora a integridade das chaves
   - Verifica permissões de arquivos
   - Detecta alterações não autorizadas
   - Gerencia backups de chaves

## Armazenamento de Chaves

As chaves são armazenadas em arquivo com as seguintes proteções:

1. **Localização**: Por padrão em `<diretório-da-aplicação>/config/encryption.key`
2. **Permissões**: Restritas ao proprietário (modo 0600)
3. **Monitoramento**: Verificação contínua de integridade
4. **Backup**: Cópias de segurança automáticas

## Procedimentos Operacionais

### Rotação de Chaves

A rotação periódica de chaves é uma prática recomendada para manter a segurança do sistema.

#### Procedimento Manual de Rotação

1. Faça login no servidor com privilégios administrativos
2. Pare o serviço PGBen:
   ```bash
   systemctl stop pgben
   ```
3. Crie um backup da chave atual:
   ```bash
   cp /caminho/para/config/encryption.key /caminho/para/config/backups/encryption.key.$(date +%Y%m%d)
   chmod 600 /caminho/para/config/backups/encryption.key.*
   ```
4. Remova a chave atual:
   ```bash
   rm /caminho/para/config/encryption.key
   ```
5. Inicie o serviço PGBen (uma nova chave será gerada automaticamente):
   ```bash
   systemctl start pgben
   ```
6. Verifique os logs para confirmar a geração da nova chave:
   ```bash
   journalctl -u pgben | grep "chave de criptografia"
   ```

> **IMPORTANTE**: Após a rotação da chave, documentos criptografados com a chave antiga não poderão ser descriptografados. Considere recriptografar dados importantes antes da rotação.

### Recuperação de Backup

Em caso de corrupção ou perda da chave atual:

1. Pare o serviço PGBen:
   ```bash
   systemctl stop pgben
   ```
2. Restaure a chave a partir do backup:
   ```bash
   cp /caminho/para/config/backups/encryption.key.[data] /caminho/para/config/encryption.key
   chmod 600 /caminho/para/config/encryption.key
   ```
3. Inicie o serviço PGBen:
   ```bash
   systemctl start pgben
   ```
4. Verifique os logs para confirmar o carregamento da chave:
   ```bash
   journalctl -u pgben | grep "chave de criptografia"
   ```

## Monitoramento e Alertas

O sistema implementa as seguintes verificações:

1. **Verificação de Integridade**: Detecta alterações não autorizadas no arquivo de chave
2. **Verificação de Permissões**: Garante que as permissões do arquivo estejam corretas
3. **Alertas de Segurança**: Registra alertas no log quando problemas são detectados

## Melhores Práticas

1. **Nunca compartilhe** as chaves de criptografia
2. **Não armazene** chaves em repositórios de código
3. **Mantenha backups** em local seguro e separado
4. **Implemente rotação** periódica de chaves (recomendado a cada 90 dias)
5. **Monitore os logs** em busca de alertas de segurança
6. **Restrinja o acesso** ao servidor onde as chaves são armazenadas
7. **Documente** todas as operações realizadas nas chaves

## Considerações para Ambientes de Produção

Em ambientes de produção, considere as seguintes melhorias adicionais:

1. **Hardware Security Module (HSM)**: Para armazenamento mais seguro de chaves
2. **Serviço de Gerenciamento de Segredos**: Como AWS KMS, HashiCorp Vault ou Azure Key Vault
3. **Criptografia em Múltiplas Camadas**: Proteger a chave mestra com uma chave adicional
4. **Auditoria Avançada**: Registrar todas as operações de criptografia/descriptografia

## Referências

- [NIST Guidelines for Key Management](https://nvlpubs.nist.gov/nistpubs/SpecialPublications/NIST.SP.800-57pt1r5.pdf)
- [OWASP Cryptographic Storage Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cryptographic_Storage_Cheat_Sheet.html)
- [Documentação do Node.js sobre Crypto](https://nodejs.org/api/crypto.html)
