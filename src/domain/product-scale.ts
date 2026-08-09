export function findProductScale(attributes: Record<string, string>, title: string): string | null {
  const attribute = Object.entries(attributes).find(([key]) => /escala|tamanho/i.test(key))?.[1]
  const source = attribute || title
  const match = source.match(/\b(\d{2,3})\s*mm\b/i)
  return match ? `${match[1]} mm` : attribute?.trim() || null
}
