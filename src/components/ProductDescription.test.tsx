import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ProductDescription } from "./ProductDescription";
import { setConsent } from "../analytics/events";

describe("ProductDescription", () => {
  it("renders rich sections, trust signals and a repeated marketplace action", () => {
    setConsent("granted");
    render(<ProductDescription
      description={"DIFERENCIAIS\n\nResina 8K\n\nProdução nacional"}
      title="Kit de miniaturas"
      productId="produto-1"
      price={99.9}
      images={[]}
      listings={[{ marketplace: "mercado-livre", externalId: "MLB1", url: "https://produto.mercadolivre.com.br/MLB-1", active: true }]}
    />);
    expect(screen.getByRole("heading", { name: "Diferenciais" })).toBeVisible();
    expect(screen.getByText("Resina 8K")).toBeVisible();
    expect(screen.getByText(/preço sincronizado/i)).toBeVisible();
    expect(screen.getByRole("link", { name: /comprar no mercado livre/i })).toHaveAttribute("href", "https://produto.mercadolivre.com.br/MLB-1");
    fireEvent.click(screen.getByRole("link", { name: /comprar no mercado livre/i }));
    expect(window.dataLayer).toContainEqual(expect.objectContaining({ event: "click_mercado_livre", product_id: "produto-1", external_id: "MLB1", price: 99.9 }));
  });

  it("identifies a real TikTok Shop listing without labelling it as Mercado Livre", () => {
    render(<ProductDescription description="Detalhes do produto" title="Produto TikTok" productId="TT1" price={49.9} images={[]} listings={[{ marketplace: "tiktok", externalId: "TT1", url: "https://shop.tiktok.com/view/product/1", active: true }]}/>);
    expect(screen.getByRole("link", { name: /comprar no tiktok shop/i })).toBeVisible();
  });
});
