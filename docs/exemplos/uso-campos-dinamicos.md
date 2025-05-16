# Exemplos de Uso de Campos Dinâmicos no Módulo de Benefício

Este documento apresenta exemplos práticos de como utilizar a funcionalidade de campos dinâmicos implementada no módulo de Benefício do sistema PGBen.

## 1. Definindo Campos Dinâmicos para um Tipo de Benefício

### Exemplo: Auxílio Aluguel

Para configurar campos dinâmicos específicos para o Auxílio Aluguel, você pode fazer uma requisição POST para o endpoint:

```
POST /beneficio/{tipoBeneficioId}/campos-dinamicos
```

#### Exemplo de Payload:

```json
{
  "label": "Valor do Aluguel",
  "nome": "valor_aluguel",
  "tipo": "number",
  "obrigatorio": true,
  "descricao": "Valor mensal do aluguel em reais",
  "validacoes": {
    "min": 100,
    "max": 5000
  },
  "ordem": 1
}
```

Outros campos que podem ser definidos para o Auxílio Aluguel:

```json
{
  "label": "Tempo de Contrato (meses)",
  "nome": "tempo_contrato",
  "tipo": "number",
  "obrigatorio": true,
  "descricao": "Duração do contrato de aluguel em meses",
  "validacoes": {
    "min": 6,
    "max": 36
  },
  "ordem": 2
}
```

```json
{
  "label": "Possui Dependentes",
  "nome": "possui_dependentes",
  "tipo": "boolean",
  "obrigatorio": true,
  "descricao": "Indica se o solicitante possui dependentes",
  "ordem": 3
}
```

```json
{
  "label": "Número de Dependentes",
  "nome": "numero_dependentes",
  "tipo": "number",
  "obrigatorio": false,
  "descricao": "Número de dependentes do solicitante",
  "validacoes": {
    "min": 1,
    "max": 10
  },
  "ordem": 4
}
```

```json
{
  "label": "Data de Início do Contrato",
  "nome": "data_inicio_contrato",
  "tipo": "date",
  "obrigatorio": true,
  "descricao": "Data de início do contrato de aluguel",
  "ordem": 5
}
```

### Exemplo: Auxílio Natalidade

Para o Auxílio Natalidade, os campos dinâmicos podem ser diferentes:

```json
{
  "label": "Data de Nascimento da Criança",
  "nome": "data_nascimento_crianca",
  "tipo": "date",
  "obrigatorio": true,
  "descricao": "Data de nascimento da criança",
  "validacoes": {
    "max": "hoje"
  },
  "ordem": 1
}
```

```json
{
  "label": "Nome da Criança",
  "nome": "nome_crianca",
  "tipo": "string",
  "obrigatorio": true,
  "descricao": "Nome completo da criança",
  "validacoes": {
    "minLength": 5,
    "maxLength": 100
  },
  "ordem": 2
}
```

```json
{
  "label": "Peso ao Nascer (gramas)",
  "nome": "peso_nascer",
  "tipo": "number",
  "obrigatorio": true,
  "descricao": "Peso da criança ao nascer em gramas",
  "validacoes": {
    "min": 500,
    "max": 6000
  },
  "ordem": 3
}
```

## 2. Obtendo o Formulário Dinâmico

Para obter a estrutura do formulário dinâmico para um tipo de benefício específico, você pode fazer uma requisição GET para o endpoint:

```
GET /beneficio/{tipoBeneficioId}/formulario
```

#### Exemplo de Resposta (Auxílio Aluguel):

```json
{
  "versao": 1,
  "campos": [
    {
      "id": "123e4567-e89b-12d3-a456-426614174000",
      "nome": "valor_aluguel",
      "label": "Valor do Aluguel",
      "tipo": "number",
      "obrigatorio": true,
      "descricao": "Valor mensal do aluguel em reais",
      "validacoes": {
        "min": 100,
        "max": 5000
      },
      "ordem": 1
    },
    {
      "id": "123e4567-e89b-12d3-a456-426614174001",
      "nome": "tempo_contrato",
      "label": "Tempo de Contrato (meses)",
      "tipo": "number",
      "obrigatorio": true,
      "descricao": "Duração do contrato de aluguel em meses",
      "validacoes": {
        "min": 6,
        "max": 36
      },
      "ordem": 2
    },
    {
      "id": "123e4567-e89b-12d3-a456-426614174002",
      "nome": "possui_dependentes",
      "label": "Possui Dependentes",
      "tipo": "boolean",
      "obrigatorio": true,
      "descricao": "Indica se o solicitante possui dependentes",
      "ordem": 3
    },
    {
      "id": "123e4567-e89b-12d3-a456-426614174003",
      "nome": "numero_dependentes",
      "label": "Número de Dependentes",
      "tipo": "number",
      "obrigatorio": false,
      "descricao": "Número de dependentes do solicitante",
      "validacoes": {
        "min": 1,
        "max": 10
      },
      "ordem": 4
    },
    {
      "id": "123e4567-e89b-12d3-a456-426614174004",
      "nome": "data_inicio_contrato",
      "label": "Data de Início do Contrato",
      "tipo": "date",
      "obrigatorio": true,
      "descricao": "Data de início do contrato de aluguel",
      "ordem": 5
    }
  ]
}
```

## 3. Enviando uma Solicitação de Benefício com Dados Dinâmicos

Para enviar uma solicitação de benefício com dados dinâmicos, você pode fazer uma requisição POST para o endpoint:

```
POST /solicitacao
```

#### Exemplo de Payload (Auxílio Aluguel):

```json
{
  "cidadao_id": "123e4567-e89b-12d3-a456-426614174000",
  "tipo_beneficio_id": "123e4567-e89b-12d3-a456-426614174001",
  "observacoes": "Solicitação de auxílio aluguel para família em situação de vulnerabilidade",
  "dados_dinamicos": {
    "valor_aluguel": 800,
    "tempo_contrato": 12,
    "possui_dependentes": true,
    "numero_dependentes": 2,
    "data_inicio_contrato": "2025-06-01T00:00:00.000Z"
  }
}
```

#### Exemplo de Payload (Auxílio Natalidade):

```json
{
  "cidadao_id": "123e4567-e89b-12d3-a456-426614174000",
  "tipo_beneficio_id": "123e4567-e89b-12d3-a456-426614174002",
  "observacoes": "Solicitação de auxílio natalidade",
  "dados_dinamicos": {
    "data_nascimento_crianca": "2025-05-10T00:00:00.000Z",
    "nome_crianca": "Maria Silva Santos",
    "peso_nascer": 3200
  }
}
```

## 4. Consultando o Histórico de Versões do Schema

Para consultar o histórico de versões do schema de um tipo de benefício, você pode fazer uma requisição GET para o endpoint:

```
GET /beneficio/{tipoBeneficioId}/campos-dinamicos/schema/historico
```

#### Exemplo de Resposta:

```json
[
  {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "tipo_beneficio_id": "123e4567-e89b-12d3-a456-426614174001",
    "versao": 2,
    "schema": [...],
    "descricao_mudancas": "Adicionado campo de número de dependentes",
    "ativo": true,
    "created_at": "2025-05-16T10:30:00.000Z",
    "updated_at": "2025-05-16T10:30:00.000Z"
  },
  {
    "id": "123e4567-e89b-12d3-a456-426614174001",
    "tipo_beneficio_id": "123e4567-e89b-12d3-a456-426614174001",
    "versao": 1,
    "schema": [...],
    "descricao_mudancas": "Versão inicial",
    "ativo": false,
    "created_at": "2025-05-15T14:20:00.000Z",
    "updated_at": "2025-05-16T10:30:00.000Z"
  }
]
```

## 5. Implementação no Frontend

No frontend, você pode utilizar a estrutura do formulário dinâmico para gerar um formulário específico para cada tipo de benefício. Exemplo em React:

```jsx
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import api from '../services/api';

const FormularioDinamico = () => {
  const { tipoBeneficioId } = useParams();
  const [formulario, setFormulario] = useState(null);
  const [dadosDinamicos, setDadosDinamicos] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const carregarFormulario = async () => {
      try {
        const response = await api.get(`/beneficio/${tipoBeneficioId}/formulario`);
        setFormulario(response.data);
        
        // Inicializar valores padrão
        const valoresIniciais = {};
        response.data.campos.forEach(campo => {
          if (campo.tipo === 'boolean') {
            valoresIniciais[campo.nome] = false;
          } else if (campo.tipo === 'number') {
            valoresIniciais[campo.nome] = 0;
          } else {
            valoresIniciais[campo.nome] = '';
          }
        });
        
        setDadosDinamicos(valoresIniciais);
        setLoading(false);
      } catch (error) {
        console.error('Erro ao carregar formulário:', error);
        setLoading(false);
      }
    };

    carregarFormulario();
  }, [tipoBeneficioId]);

  const handleChange = (campo, valor) => {
    setDadosDinamicos(prev => ({
      ...prev,
      [campo]: valor
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      await api.post('/solicitacao', {
        cidadao_id: '123e4567-e89b-12d3-a456-426614174000', // ID do cidadão logado
        tipo_beneficio_id: tipoBeneficioId,
        dados_dinamicos: dadosDinamicos
      });
      
      alert('Solicitação enviada com sucesso!');
    } catch (error) {
      console.error('Erro ao enviar solicitação:', error);
      alert('Erro ao enviar solicitação. Verifique os dados e tente novamente.');
    }
  };

  if (loading) {
    return <div>Carregando formulário...</div>;
  }

  if (!formulario) {
    return <div>Erro ao carregar formulário</div>;
  }

  return (
    <div>
      <h2>Formulário de Solicitação</h2>
      <form onSubmit={handleSubmit}>
        {formulario.campos.sort((a, b) => a.ordem - b.ordem).map(campo => (
          <div key={campo.id} className="form-group">
            <label>
              {campo.label}
              {campo.obrigatorio && <span className="required">*</span>}
            </label>
            
            {campo.descricao && (
              <small className="form-text text-muted">{campo.descricao}</small>
            )}
            
            {campo.tipo === 'string' && (
              <input
                type="text"
                className="form-control"
                value={dadosDinamicos[campo.nome] || ''}
                onChange={(e) => handleChange(campo.nome, e.target.value)}
                required={campo.obrigatorio}
                minLength={campo.validacoes?.minLength}
                maxLength={campo.validacoes?.maxLength}
              />
            )}
            
            {campo.tipo === 'number' && (
              <input
                type="number"
                className="form-control"
                value={dadosDinamicos[campo.nome] || 0}
                onChange={(e) => handleChange(campo.nome, Number(e.target.value))}
                required={campo.obrigatorio}
                min={campo.validacoes?.min}
                max={campo.validacoes?.max}
              />
            )}
            
            {campo.tipo === 'boolean' && (
              <div className="form-check">
                <input
                  type="checkbox"
                  className="form-check-input"
                  checked={dadosDinamicos[campo.nome] || false}
                  onChange={(e) => handleChange(campo.nome, e.target.checked)}
                  required={campo.obrigatorio}
                />
                <label className="form-check-label">Sim</label>
              </div>
            )}
            
            {campo.tipo === 'date' && (
              <input
                type="date"
                className="form-control"
                value={dadosDinamicos[campo.nome] ? new Date(dadosDinamicos[campo.nome]).toISOString().split('T')[0] : ''}
                onChange={(e) => handleChange(campo.nome, e.target.value)}
                required={campo.obrigatorio}
              />
            )}
          </div>
        ))}
        
        <button type="submit" className="btn btn-primary">
          Enviar Solicitação
        </button>
      </form>
    </div>
  );
};

export default FormularioDinamico;
```

Este exemplo demonstra como a funcionalidade de campos dinâmicos pode ser utilizada para criar formulários específicos para cada tipo de benefício, melhorando a experiência do usuário e garantindo a coleta de dados adequados para cada caso.
