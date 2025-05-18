import { ApiProperty } from '@nestjs/swagger';

/**
 * Classe para representar links HATEOAS
 * 
 * Implementa o padrão HATEOAS (Hypermedia as the Engine of Application State)
 * para melhorar a navegabilidade da API.
 */
export class LinkDto {
  @ApiProperty({
    description: 'Relação do link',
    example: 'self',
  })
  rel: string;

  @ApiProperty({
    description: 'URL do link',
    example: 'https://api.pgben.natal.rn.gov.br/v1/cidadaos/8a11f7e6-8c36-4f13-96e5-6c92b2c5f5bf',
  })
  href: string;

  @ApiProperty({
    description: 'Método HTTP para acessar o recurso',
    example: 'GET',
  })
  method: string;
}

/**
 * Interface para recursos com links HATEOAS
 * 
 * Todos os recursos que implementam esta interface terão
 * links HATEOAS para facilitar a navegação entre recursos.
 */
export class ResourceWithLinks {
  @ApiProperty({
    description: 'Links para navegação entre recursos',
    type: [LinkDto],
  })
  _links: LinkDto[];
}
