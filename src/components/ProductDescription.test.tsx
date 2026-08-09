import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ProductDescription } from "./ProductDescription";

describe("ProductDescription", () => {
  it("renders rich sections, trust signals and a repeated marketplace action", () => {
    render(<ProductDescription
      description={"DIFERENCIAIS\n\nResina 8K\n\nProdução nacional"}
      title="Kit de miniaturas"
      images={[]}
      listings={[{ marketplace: "mercado-livre", externalId: "MLB1", url: "https://produto.mercadolivre.com.br/MLB-1", active: true }]}
    />);
    expect(screen.getByRole("heading", { name: "Diferenciais" })).toBeVisible();
    expect(screen.getByText("Resina 8K")).toBeVisible();
    expect(screen.getByText(/preço sincronizado/i)).toBeVisible();
    expect(screen.getByRole("link", { name: /comprar no mercado livre/i })).toHaveAttribute("href", "https://produto.mercadolivre.com.br/MLB-1");
  });
});
