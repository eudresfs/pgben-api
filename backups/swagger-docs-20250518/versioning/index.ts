/**
 * Documentação de versionamento da API
 * 
 * Este arquivo contém informações sobre como a API lida com
 * diferentes versões, incluindo políticas de compatibilidade,
 * ciclo de vida das versões e estratégias de migração.
 */

export const versioningInfo = `
<h2>Versionamento da API</h2>

<h3>Política de Versionamento</h3>
<p>A API segue o versionamento semântico (SemVer) com o formato MAJOR.MINOR.PATCH:</p>
<ul>
  <li><strong>MAJOR</strong>: Mudanças incompatíveis com versões anteriores</li>
  <li><strong>MINOR</strong>: Adições de funcionalidades de forma compatível</li>
  <li><strong>PATCH</strong>: Correções de bugs de forma compatível</li>
</ul>

<h3>Ciclo de Vida das Versões</h3>
<p>Cada versão MAJOR da API tem o seguinte ciclo de vida:</p>
<ul>
  <li><strong>Ativa</strong>: Recebe novas funcionalidades e correções</li>
  <li><strong>Manutenção</strong>: Recebe apenas correções de bugs</li>
  <li><strong>Depreciada</strong>: Não recebe atualizações, mas continua disponível</li>
  <li><strong>Descontinuada</strong>: Não está mais disponível</li>
</ul>

<h3>Estratégias de Migração</h3>
<p>Para migrar entre versões da API, siga estas recomendações:</p>
<ol>
  <li>Verifique o changelog para entender as mudanças</li>
  <li>Atualize gradualmente, testando cada endpoint modificado</li>
  <li>Utilize os headers de compatibilidade para testar novas versões</li>
</ol>

<h3>Headers de Versionamento</h3>
<p>A API suporta os seguintes headers para controle de versão:</p>
<ul>
  <li><code>Accept-Version</code>: Especifica a versão desejada (ex: <code>Accept-Version: 1</code>)</li>
  <li><code>X-API-Version</code>: Alternativa para especificar a versão</li>
</ul>

<h3>Versões Disponíveis</h3>
<table>
  <tr>
    <th>Versão</th>
    <th>Status</th>
    <th>Data de Lançamento</th>
    <th>Data de Depreciação</th>
    <th>Data de Descontinuação</th>
  </tr>
  <tr>
    <td>v1</td>
    <td>Ativa</td>
    <td>01/01/2025</td>
    <td>-</td>
    <td>-</td>
  </tr>
</table>
`;

/**
 * Informações sobre a política de depreciação de endpoints
 */
export const deprecationInfo = `
<h2>Política de Depreciação</h2>

<p>Quando um endpoint ou funcionalidade da API é depreciado, seguimos estas etapas:</p>

<ol>
  <li><strong>Anúncio</strong>: A depreciação é anunciada no changelog e na documentação</li>
  <li><strong>Período de Transição</strong>: O endpoint continua funcionando por pelo menos 6 meses</li>
  <li><strong>Avisos em Respostas</strong>: O header <code>Deprecation</code> é incluído nas respostas</li>
  <li><strong>Alternativas</strong>: Documentação clara sobre alternativas é fornecida</li>
  <li><strong>Descontinuação</strong>: Após o período de transição, o endpoint é removido</li>
</ol>

<h3>Exemplo de Header de Depreciação</h3>
<pre>
Deprecation: true
Sunset: Sat, 31 Dec 2025 23:59:59 GMT
Link: <https://api.pgben.natal.rn.gov.br/v2/novo-endpoint>; rel="successor-version"
</pre>

<p>Endpoints depreciados são marcados na documentação com a tag <span class="deprecated">DEPRECIADO</span>.</p>
`;
