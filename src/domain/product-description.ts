export type DescriptionBlock = { type: "paragraph"; text: string } | { type: "list"; items: string[] };
export function formatProductDescription(value: string): DescriptionBlock[] {
  const lines = value.replace(/\r/g, "").split("\n"), blocks: DescriptionBlock[] = [];
  let paragraph: string[] = [], list: string[] = [];
  const flushParagraph = () => { if (paragraph.length) blocks.push({ type: "paragraph", text: paragraph.join(" ").trim() }); paragraph = []; };
  const flushList = () => { if (list.length) blocks.push({ type: "list", items: list }); list = []; };
  for (const raw of lines) { const line = raw.trim(), bullet = line.match(/^(?:[-•*]|\d+[.)])\s+(.+)$/); if (!line) { flushParagraph(); flushList(); } else if (bullet) { flushParagraph(); list.push(bullet[1]); } else { flushList(); paragraph.push(line); } }
  flushParagraph(); flushList(); return blocks;
}
