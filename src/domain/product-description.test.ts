import { describe, expect, it } from "vitest";
import { formatProductDescription } from "./product-description";
describe("product description formatting", () => { it("preserves paragraphs and lists", () => { expect(formatProductDescription("Uma peça.\n\n- Resina 8K\n- Escala 32mm")).toEqual([{ type: "paragraph", text: "Uma peça." }, { type: "list", items: ["Resina 8K", "Escala 32mm"] }]); }); });
