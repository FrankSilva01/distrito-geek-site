import { describe, expect, it } from "vitest";
import { formatProductDescription } from "./product-description";

describe("product description formatting", () => {
  it("preserves paragraphs and lists", () => {
    expect(formatProductDescription("Uma peça.\n\n- Resina 8K\n- Escala 32mm")).toEqual([
      { type: "paragraph", text: "Uma peça." },
      { type: "list", items: ["Resina 8K", "Escala 32mm"] },
    ]);
  });

  it("recognizes marketplace section headings and feature grids", () => {
    expect(formatProductDescription("Total: 5 miniaturas.\n\nDIFERENCIAIS\n\nResina 8K de alta definição\n\nBases texturizadas inclusas\n\nCOMPATIBILIDADE\n\nRPG de mesa\n\nColecionadores")).toEqual([
      { type: "paragraph", text: "Total: 5 miniaturas." },
      { type: "heading", text: "Diferenciais" },
      { type: "featureGrid", items: ["Resina 8K de alta definição", "Bases texturizadas inclusas"] },
      { type: "heading", text: "Compatibilidade" },
      { type: "featureGrid", items: ["RPG de mesa", "Colecionadores"] },
    ]);
  });

  it("does not turn ordinary short copy into a heading", () => {
    expect(formatProductDescription("Produção nacional\nFeito sob demanda")).toEqual([
      { type: "paragraph", text: "Produção nacional Feito sob demanda" },
    ]);
  });

  it("separates kit contents and important marketplace notices", () => {
    const blocks = formatProductDescription("O KIT CONTÉM\n\n- Guerreiro\n\nIMPORTANTE\n\nProduto enviado sem pintura.\n\nCONTEÚDO DA EMBALAGEM\n\n1 Guerreiro");
    expect(blocks.filter((block) => block.type === "heading")).toEqual([
      { type: "heading", text: "O kit contém" },
      { type: "heading", text: "Importante" },
      { type: "heading", text: "Conteúdo da embalagem" },
    ]);
  });

  it("normaliza Markdown vindo da descrição do marketplace sem exibir símbolos crus", () => {
    expect(formatProductDescription("**Kit 4 Orcs**\n\n### PARA MESTRES DE RPG\n\nUse **quatro modelos diferentes** na campanha.\n\n- **Escala:** 32mm")).toEqual([
      { type: "paragraph", text: "Kit 4 Orcs" },
      { type: "heading", text: "Para mestres de RPG" },
      { type: "featureGrid", items: ["Use quatro modelos diferentes na campanha."] },
      { type: "list", items: ["Escala: 32mm"] },
    ]);
  });
});
