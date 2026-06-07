// =============================================================================
// Mask Utilities — Formatacao e Sanitizacao de Dados Pessoais
// =============================================================================
//
// Centraliza a formatacao e limpeza de campos como CPF, CNPJ, telefone e CEP.
//
// Convencao:
//   mask*(value)   -> adiciona formatacao (para exibicao)
//   unmask*(value) -> remove formatacao (para armazenamento no banco)
//
// O banco armazena SEMPRE o valor sem mascara (apenas digitos).
// A formatacao e aplicada apenas na resposta da API ou na validacao de entrada.
//
// Exemplo de fluxo:
//   Frontend envia: { cpf: "111.111.111-11" }
//   Antes de salvar: unmaskCPF("111.111.111-11") -> "11111111111"
//   Banco armazena:  "11111111111"
//   API retorna:     maskCPF("11111111111") -> "111.111.111-11"
// =============================================================================

// Remove todos os caracteres nao numericos de uma string
export function onlyDigits(value: string): string {
  return value.replace(/\D/g, '')
}

// ── CPF ──────────────────────────────────────────────────────────────────────

// Formata CPF: "11111111111" -> "111.111.111-11"
export function maskCPF(cpf: string): string {
  const digits = onlyDigits(cpf)
  if (digits.length !== 11) return cpf
  return digits.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4')
}

// Remove formatacao do CPF: "111.111.111-11" -> "11111111111"
export function unmaskCPF(cpf: string): string {
  return onlyDigits(cpf)
}

// Valida se um CPF e valido (algoritmo oficial da Receita Federal)
//
// Nota sobre digits[i]:
//   Sem a opcao noUncheckedIndexedAccess no tsconfig, string[number] e tipado
//   como `string` (nao `string | undefined`). O operador ! seria uma assertion
//   desnecessaria (@typescript-eslint/no-unnecessary-type-assertion), por isso
//   os acessos sao feitos diretamente sem o operador de non-null assertion.
export function isValidCPF(cpf: string): boolean {
  const digits = onlyDigits(cpf)

  if (digits.length !== 11) return false

  // Rejeita CPFs com todos os digitos iguais (ex: 111.111.111-11)
  if (/^(\d)\1{10}$/.test(digits)) return false

  // Validacao do primeiro digito verificador
  let sum = 0
  for (let i = 0; i < 9; i++) {
    sum += parseInt(digits[i], 10) * (10 - i)
  }
  let remainder = (sum * 10) % 11
  if (remainder === 10 || remainder === 11) remainder = 0
  if (remainder !== parseInt(digits[9], 10)) return false

  // Validacao do segundo digito verificador
  sum = 0
  for (let i = 0; i < 10; i++) {
    sum += parseInt(digits[i], 10) * (11 - i)
  }
  remainder = (sum * 10) % 11
  if (remainder === 10 || remainder === 11) remainder = 0
  if (remainder !== parseInt(digits[10], 10)) return false

  return true
}

// ── CNPJ ─────────────────────────────────────────────────────────────────────

// Formata CNPJ: "00000000000100" -> "00.000.000/0001-00"
export function maskCNPJ(cnpj: string): string {
  const digits = onlyDigits(cnpj)
  if (digits.length !== 14) return cnpj
  return digits.replace(
    /^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/,
    '$1.$2.$3/$4-$5',
  )
}

// Remove formatacao do CNPJ: "00.000.000/0001-00" -> "00000000000100"
export function unmaskCNPJ(cnpj: string): string {
  return onlyDigits(cnpj)
}

// ── Telefone ──────────────────────────────────────────────────────────────────

// Formata telefone: "11999999999" -> "(11) 99999-9999"
// Suporta 10 digitos (fixo) e 11 digitos (celular)
export function maskPhone(phone: string): string {
  const digits = onlyDigits(phone)

  if (digits.length === 11) {
    return digits.replace(/^(\d{2})(\d{5})(\d{4})$/, '($1) $2-$3')
  }

  if (digits.length === 10) {
    return digits.replace(/^(\d{2})(\d{4})(\d{4})$/, '($1) $2-$3')
  }

  return phone
}

// Remove formatacao do telefone: "(11) 99999-9999" -> "11999999999"
export function unmaskPhone(phone: string): string {
  return onlyDigits(phone)
}

// ── CEP ───────────────────────────────────────────────────────────────────────

// Formata CEP: "01310100" -> "01310-100"
export function maskCEP(cep: string): string {
  const digits = onlyDigits(cep)
  if (digits.length !== 8) return cep
  return digits.replace(/^(\d{5})(\d{3})$/, '$1-$2')
}

// Remove formatacao do CEP: "01310-100" -> "01310100"
export function unmaskCEP(cep: string): string {
  return onlyDigits(cep)
}

// ── Sanitizacao de strings ────────────────────────────────────────────────────

// Remove espacos extras e trim em strings de entrada
export function sanitizeString(value: string): string {
  return value.trim().replace(/\s+/g, ' ')
}

// Normaliza um nome: trim + capitaliza cada palavra
// Exemplo: "  joao   da  silva  " -> "Joao Da Silva"
export function normalizeName(name: string): string {
  return sanitizeString(name)
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')
}

// Normaliza email: trim + lowercase
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}