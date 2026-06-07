// =============================================================================
// Date Utilities
// =============================================================================
//
// Centraliza operacoes de data para garantir consistencia em todo o sistema.
// Usa apenas a API nativa Date do JavaScript — sem dependencias externas.
//
// IMPORTANTE — Timezone:
//   O sistema opera em America/Sao_Paulo (UTC-3 / UTC-2 no horario de verao).
//   O banco armazena timestamps com timezone (@db.Timestamptz).
//   Para campos de data pura (@db.Date), como start_date e end_date das reservas,
//   o valor e armazenado sem informacao de timezone — representa o dia local.
//   Toda comparacao de datas deve considerar isso: nao usar getTime() diretamente
//   em campos Date puros — usar compareDate() desta biblioteca.
// =============================================================================

// Converte uma string ISO ou Date para objeto Date (sem hora)
export function toDateOnly(value: string | Date): Date {
  const date = value instanceof Date ? value : new Date(value)
  // Zera o horario para comparar apenas datas
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

// Formata uma data no padrao brasileiro (DD/MM/YYYY)
export function formatDateBR(date: Date): string {
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

// Formata uma data e hora no padrao brasileiro (DD/MM/YYYY HH:mm)
export function formatDateTimeBR(date: Date): string {
  return date.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Sao_Paulo',
  })
}

// Adiciona dias a uma data (retorna nova data, nao muta o original)
export function addDays(date: Date, days: number): Date {
  const result = new Date(date)
  result.setDate(result.getDate() + days)
  return result
}

// Subtrai dias de uma data
export function subtractDays(date: Date, days: number): Date {
  return addDays(date, -days)
}

// Calcula a diferenca em dias entre duas datas
// Retorna valor positivo se end > start, negativo se end < start
export function diffInDays(start: Date, end: Date): number {
  const msPerDay = 1000 * 60 * 60 * 24
  const startOnly = toDateOnly(start)
  const endOnly = toDateOnly(end)
  return Math.round((endOnly.getTime() - startOnly.getTime()) / msPerDay)
}

// Compara duas datas ignorando horario
// Retorna: -1 se a < b, 0 se a == b, 1 se a > b
export function compareDate(a: Date, b: Date): -1 | 0 | 1 {
  const aOnly = toDateOnly(a)
  const bOnly = toDateOnly(b)

  if (aOnly.getTime() < bOnly.getTime()) return -1
  if (aOnly.getTime() > bOnly.getTime()) return 1
  return 0
}

// Verifica se uma data esta entre outras duas (inclusive)
export function isDateBetween(date: Date, start: Date, end: Date): boolean {
  return compareDate(date, start) >= 0 && compareDate(date, end) <= 0
}

// =============================================================================
// FUNCAO CRITICA: Verificacao de sobreposicao de datas
// =============================================================================
//
// Usada pelo motor de reservas (ReservationService) para detectar conflitos.
// Dois intervalos [A_start, A_end] e [B_start, B_end] se sobrepoe quando:
//
//   A_start <= B_end  AND  A_end >= B_start
//
// Equivalente a: NAO (A termina antes de B comecar OU A comeca depois de B terminar)
//
// Exemplos:
//   [01/03, 05/03] x [04/03, 08/03] -> TRUE  (sobreposicao em 04-05/03)
//   [01/03, 03/03] x [04/03, 08/03] -> FALSE (A termina antes de B comecar)
//   [06/03, 10/03] x [04/03, 08/03] -> TRUE  (sobreposicao em 06-08/03)
//   [01/03, 10/03] x [04/03, 08/03] -> TRUE  (B esta contido em A)
//
// O banco possui partial index idx_reservations_chair_dates_active que
// acelera esta verificacao. Esta funcao e usada no servico para validacao
// ANTES de inserir no banco, dentro da transacao com SELECT FOR UPDATE.
export function isDateOverlap(
  aStart: Date,
  aEnd: Date,
  bStart: Date,
  bEnd: Date,
): boolean {
  return compareDate(aStart, bEnd) <= 0 && compareDate(aEnd, bStart) >= 0
}

// Calcula o numero de dias de locacao (inclusivo em ambos os extremos)
// Exemplo: 01/03 a 05/03 = 5 dias (nao 4)
export function calcRentalDays(startDate: Date, endDate: Date): number {
  return Math.abs(diffInDays(startDate, endDate)) + 1
}

// Verifica se uma data ja passou (comparando com hoje sem horario)
export function isPastDate(date: Date): boolean {
  return compareDate(date, new Date()) < 0
}

// Retorna o primeiro dia do mes de uma data
export function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

// Retorna o ultimo dia do mes de uma data
export function endOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0)
}

// Retorna o primeiro dia do ano de uma data
export function startOfYear(date: Date): Date {
  return new Date(date.getFullYear(), 0, 1)
}

// Retorna o ultimo dia do ano de uma data
export function endOfYear(date: Date): Date {
  return new Date(date.getFullYear(), 11, 31)
}