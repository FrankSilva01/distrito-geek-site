import { ArrowSquareOut, CheckCircle, ShieldCheck, ArrowsClockwise } from "@phosphor-icons/react";
import type { MarketplaceListing } from "../domain/product";
import { formatProductDescription } from "../domain/product-description";
import { track } from "../analytics/events";

const marketplaceName = (marketplace: string) => marketplace === "mercado-livre" ? "Mercado Livre" : marketplace === "shopee" ? "Shopee" : "marketplace";

export function ProductDescription({ description, title, productId, price, images, listings }: { description: string; title: string; productId: string; price: number; images: string[]; listings: MarketplaceListing[] }) {
  const blocks = formatProductDescription(description);
  return <section className="description" id="descricao">
    <header className="description-header"><p className="eyebrow">Conheça todos os detalhes</p><h2>Descrição do produto</h2><p>Informações organizadas a partir do anúncio oficial para facilitar sua escolha.</p></header>
    <div className="description-copy">
      {blocks.map((block, index) => {
        if (block.type === "heading") return <h3 className="description-heading" key={`${block.text}-${index}`}>{block.text}</h3>;
        if (block.type === "featureGrid") return <div className="feature-grid" key={index}>{block.items.map((item) => <article key={item}><CheckCircle aria-hidden="true"/><span>{item}</span></article>)}</div>;
        if (block.type === "list") return <ul key={index}>{block.items.map((item) => <li key={item}>{item}</li>)}</ul>;
        return <p key={index}>{block.text}</p>;
      })}
    </div>
    {!!images.length && <div className="description-images">{images.map((image, index) => <img key={image} src={image} alt={`${title} — detalhe ${index + 1}`} loading="lazy" />)}</div>}
    <aside className="product-trust" aria-label="Informações de confiança">
      <div><ShieldCheck aria-hidden="true"/><span><b>Compra protegida</b><small>Pagamento e entrega no marketplace</small></span></div>
      <div><ArrowsClockwise aria-hidden="true"/><span><b>Preço sincronizado</b><small>Valor vindo do anúncio oficial</small></span></div>
      <div><CheckCircle aria-hidden="true"/><span><b>Link verificado</b><small>Você compra direto no anúncio ativo</small></span></div>
    </aside>
    {!!listings.length && <aside className="description-cta"><span><small>Gostou deste item?</small><b>Finalize no marketplace com segurança</b></span><div>{listings.map((listing) => <a key={listing.externalId} className={`button buy ${listing.marketplace}`} href={listing.url} target="_blank" rel="noopener noreferrer" onClick={() => track({ event: listing.marketplace === "shopee" ? "click_shopee" : "click_mercado_livre", product_id: productId, external_id: listing.externalId, product_name: title, price, marketplace: listing.marketplace, marketplace_url: listing.url })}>Comprar no {marketplaceName(listing.marketplace)} <ArrowSquareOut aria-hidden="true"/></a>)}</div></aside>}
  </section>;
}
