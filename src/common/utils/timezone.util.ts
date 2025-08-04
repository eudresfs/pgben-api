/**
 * Utilitário para gerenciamento de timezone brasileiro
 * Garante que todas as datas sejam tratadas no timezone America/Sao_Paulo
 */

const BRAZIL_TIMEZONE = 'America/Sao_Paulo';

/**
 * Cria uma nova data no timezone brasileiro
 * @param date Data opcional para converter, se não fornecida usa a data atual
 * @returns Date no timezone brasileiro
 */
export function createBrazilianDate(
  date?: Date | string | number | null,
): Date {
  const sourceDate = date ? new Date(date) : new Date();

  // Validar se a data é válida
  if (isNaN(sourceDate.getTime())) {
    throw new Error(`Invalid date value: ${date}`);
  }

  // Converter para timezone brasileiro
  const brazilianTime = new Intl.DateTimeFormat('en-CA', {
    timeZone: BRAZIL_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(sourceDate);

  const year = parseInt(
    brazilianTime.find((part) => part.type === 'year')?.value || '0',
  );
  const month =
    parseInt(
      brazilianTime.find((part) => part.type === 'month')?.value || '0',
    ) - 1;
  const day = parseInt(
    brazilianTime.find((part) => part.type === 'day')?.value || '0',
  );
  const hour = parseInt(
    brazilianTime.find((part) => part.type === 'hour')?.value || '0',
  );
  const minute = parseInt(
    brazilianTime.find((part) => part.type === 'minute')?.value || '0',
  );
  const second = parseInt(
    brazilianTime.find((part) => part.type === 'second')?.value || '0',
  );

  return new Date(year, month, day, hour, minute, second);
}

/**
 * Converte uma data UTC para o timezone brasileiro
 * @param utcDate Data em UTC
 * @returns Date no timezone brasileiro
 */
export function convertFromUTCToBrazil(
  utcDate: Date | string | null | undefined,
): Date | null {
  if (!utcDate) {
    return null;
  }

  try {
    return createBrazilianDate(utcDate);
  } catch (error) {
    console.warn(
      `Erro ao converter data para timezone brasileiro: ${utcDate}`,
      error,
    );
    return null;
  }
}

/**
 * Formata uma data para string no padrão brasileiro
 * @param date Data para formatar
 * @param includeTime Se deve incluir horário
 * @returns String formatada
 */
export function formatBrazilianDate(
  date: Date,
  includeTime: boolean = true,
): string {
  const options: Intl.DateTimeFormatOptions = {
    timeZone: BRAZIL_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  };

  if (includeTime) {
    options.hour = '2-digit';
    options.minute = '2-digit';
    options.second = '2-digit';
    options.hour12 = false;
  }

  return new Intl.DateTimeFormat('pt-BR', options).format(date);
}

/**
 * Adiciona tempo a uma data mantendo o timezone brasileiro
 * @param date Data base
 * @param amount Quantidade para adicionar
 * @param unit Unidade de tempo ('minutes', 'hours', 'days')
 * @returns Nova data no timezone brasileiro
 */
export function addTimeToBrazilianDate(
  date: Date,
  amount: number,
  unit: 'minutes' | 'hours' | 'days' = 'minutes',
): Date {
  let milliseconds = amount;

  switch (unit) {
    case 'minutes':
      milliseconds = amount * 60 * 1000;
      break;
    case 'hours':
      milliseconds = amount * 60 * 60 * 1000;
      break;
    case 'days':
      milliseconds = amount * 24 * 60 * 60 * 1000;
      break;
  }

  const newTime = date.getTime() + milliseconds;
  return createBrazilianDate(newTime);
}

/**
 * Obtém a data atual no timezone brasileiro
 * @returns Date atual no timezone brasileiro
 */
export function nowInBrazil(): Date {
  return createBrazilianDate();
}

/**
 * Converte uma data para ISO string mantendo o timezone brasileiro
 * @param date Data para converter
 * @returns String ISO no timezone brasileiro
 */
export function toBrazilianISOString(date: Date): string {
  const brazilianDate = createBrazilianDate(date);
  return brazilianDate.toISOString();
}

/**
 * Verifica se uma data está no timezone brasileiro
 * @param date Data para verificar
 * @returns boolean
 */
export function isBrazilianTimezone(date: Date): boolean {
  const offset = date.getTimezoneOffset();
  // Brasil tem offset de -180 (UTC-3) ou -120 (UTC-2 no horário de verão)
  return offset === 180 || offset === 120;
}

/**
 * Converte uma data do timezone brasileiro para UTC
 * @param brazilianDate Data no timezone brasileiro
 * @returns Date em UTC
 */
export function convertFromBrazilToUTC(
  brazilianDate: Date | string | null | undefined,
): Date | null {
  if (!brazilianDate) {
    return null;
  }

  try {
    const date =
      typeof brazilianDate === 'string'
        ? new Date(brazilianDate)
        : brazilianDate;

    // Validar se a data é válida
    if (isNaN(date.getTime())) {
      throw new Error(`Invalid date value: ${brazilianDate}`);
    }

    // Obter os componentes da data assumindo que ela está no timezone brasileiro
    const year = date.getFullYear();
    const month = date.getMonth();
    const day = date.getDate();
    const hour = date.getHours();
    const minute = date.getMinutes();
    const second = date.getSeconds();
    const millisecond = date.getMilliseconds();

    // Criar uma data UTC com os mesmos componentes
    return new Date(
      Date.UTC(year, month, day, hour, minute, second, millisecond),
    );
  } catch (error) {
    console.warn(
      `Erro ao converter data brasileira para UTC: ${brazilianDate}`,
      error,
    );
    return null;
  }
}

/**
 * Constantes úteis
 */
export const TIMEZONE_CONSTANTS = {
  BRAZIL_TIMEZONE,
  MILLISECONDS_IN_HOUR: 60 * 60 * 1000,
  MILLISECONDS_IN_DAY: 24 * 60 * 60 * 1000,
} as const;
