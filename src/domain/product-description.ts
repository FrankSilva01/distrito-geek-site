export type DescriptionBlock =
  | { type: "paragraph"; text: string }
  | { type: "list"; items: string[] }
  | { type: "heading"; text: string }
  | { type: "featureGrid"; items: string[] };

const sectionNames = new Map([
  ["DIFERENCIAIS", "Diferenciais"],
  ["COMPATIBILIDADE", "Compatibilidade"],
  ["CARACTERÍSTICAS", "Características"],
  ["CARACTERISTICAS", "Características"],
  ["CONTEÚDO DO KIT", "Conteúdo do kit"],
  ["CONTEUDO DO KIT", "Conteúdo do kit"],
  ["O QUE ACOMPANHA", "O que acompanha"],
  ["O KIT CONTÉM", "O kit contém"],
  ["O KIT CONTEM", "O kit contém"],
  ["CONTEÚDO DA EMBALAGEM", "Conteúdo da embalagem"],
  ["CONTEUDO DA EMBALAGEM", "Conteúdo da embalagem"],
  ["IMPORTANTE", "Importante"],
  ["INDICADO PARA", "Indicado para"],
  ["IDEAL PARA", "Indicado para"],
  ["RECOMENDADO PARA", "Indicado para"],
  ["ESPECIFICAÇÕES", "Especificações"],
  ["ESPECIFICACOES", "Especificações"],
  ["DETALHES", "Detalhes"],
  ["MATERIAL", "Material"],
  ["MATERIAIS", "Materiais"],
]);
const cleanInlineMarkdown = (text: string) => text
  .replace(/\*\*(.+?)\*\*/g, "$1")
  .replace(/__(.+?)__/g, "$1")
  .replace(/`(.+?)`/g, "$1")
  .trim();
const friendlyHeading = (text: string) => {
  const normalized = cleanInlineMarkdown(text);
  const known = sectionNames.get(normalized.normalize("NFC").toUpperCase());
  if (known) return known;
  const lower = normalized.toLocaleLowerCase("pt-BR");
  return `${lower.charAt(0).toLocaleUpperCase("pt-BR")}${lower.slice(1)}`
    .replace(/\brpg\b/gi, "RPG")
    .replace(/\bd&d\b/gi, "D&D");
};
const bulletText = (line: string) => {
  const item = line.match(/^(?:[-•*]|\d+[.)])\s+(.+)$/)?.[1];
  return item ? cleanInlineMarkdown(item) : undefined;
};
const headingText = (line: string) => {
  const markdownHeading = line.match(/^#{1,4}\s+(.+)$/)?.[1];
  if (markdownHeading) return friendlyHeading(markdownHeading);
  return sectionNames.get(cleanInlineMarkdown(line).normalize("NFC").toUpperCase());
};

export function formatProductDescription(value: string): DescriptionBlock[] {
  const lines = value.replace(/\r/g, "").split("\n").map((line) => line.trim());
  const blocks: DescriptionBlock[] = [];
  for (let index = 0; index < lines.length;) {
    const line = lines[index];
    if (!line) { index += 1; continue; }
    const heading = headingText(line);
    if (heading) {
      blocks.push({ type: "heading", text: heading });
      index += 1;
      const items: string[] = [];
      while (index < lines.length) {
        const candidate = lines[index];
        if (!candidate) { index += 1; continue; }
        if (headingText(candidate) || bulletText(candidate) || candidate.length > 120) break;
        items.push(cleanInlineMarkdown(candidate)); index += 1;
      }
      if (items.length) blocks.push({ type: "featureGrid", items });
      continue;
    }
    const firstBullet = bulletText(line);
    if (firstBullet) {
      const items: string[] = [firstBullet]; index += 1;
      while (index < lines.length) {
        if (!lines[index]) { index += 1; continue; }
        const item = bulletText(lines[index]);
        if (!item) break;
        items.push(item); index += 1;
      }
      blocks.push({ type: "list", items }); continue;
    }
    const paragraph = [cleanInlineMarkdown(line)]; index += 1;
    while (index < lines.length && lines[index] && !headingText(lines[index]) && !bulletText(lines[index])) { paragraph.push(cleanInlineMarkdown(lines[index])); index += 1; }
    blocks.push({ type: "paragraph", text: paragraph.join(" ") });
  }
  return blocks;
}
