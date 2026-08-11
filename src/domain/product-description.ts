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
const bulletText = (line: string) => line.match(/^(?:[-•*]|\d+[.)])\s+(.+)$/)?.[1];
const headingText = (line: string) => sectionNames.get(line.normalize("NFC").toUpperCase());

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
        items.push(candidate); index += 1;
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
    const paragraph = [line]; index += 1;
    while (index < lines.length && lines[index] && !headingText(lines[index]) && !bulletText(lines[index])) { paragraph.push(lines[index]); index += 1; }
    blocks.push({ type: "paragraph", text: paragraph.join(" ") });
  }
  return blocks;
}
