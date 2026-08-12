// @vitest-environment node
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * Regressao de mojibake: UTF-8 lido como Latin-1 e re-encodado gera um caractere U+00C3
 * seguido de outro do bloco Latin-1 Supplement (ex.: "c-cedilha" e "i-agudo" viram dois
 * caracteres estranhos). Ja apareceu em labels do Admin. O codigo-fonte e UTF-8; este teste
 * falha se qualquer arquivo reintroduzir o padrao. A deteccao usa codigos de caractere para o
 * proprio arquivo de teste nao casar a si mesmo.
 */
function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name)
    if (statSync(full).isDirectory()) return sourceFiles(full)
    return /\.(ts|tsx)$/.test(name) ? [full] : []
  })
}

const hasMojibake = (line: string): boolean => {
  for (let i = 0; i < line.length - 1; i++) {
    if (line.charCodeAt(i) === 0xc3) {
      const next = line.charCodeAt(i + 1)
      if (next >= 0x80 && next <= 0xbf) return true
    }
  }
  return false
}

describe('encoding do codigo-fonte', () => {
  it('nao tem mojibake em nenhum arquivo .ts/.tsx de src', () => {
    const offenders = sourceFiles('src')
      .filter((file) => !file.endsWith('encoding.test.ts'))
      .flatMap((file) =>
        readFileSync(file, 'utf8')
          .split('\n')
          .map((text, index) => ({ file, line: index + 1, text }))
          .filter((entry) => hasMojibake(entry.text))
          .map((entry) => `${entry.file}:${entry.line}`),
      )
    expect(offenders, `mojibake encontrado em: ${offenders.join(', ')}`).toEqual([])
  })
})
