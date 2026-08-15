import {
  ArrowSquareOut,
  ArrowsLeftRight,
  CheckCircle,
  ClockCounterClockwise,
  Heart,
  Ruler,
} from "@phosphor-icons/react";
import { useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import { track, trackEcommerce } from "../analytics/events";
import { readListOrigin } from "../analytics/list-attribution";
import { money, ProductCard } from "../components/ProductCard";
import { ProductGallery } from "../components/ProductGallery";
import { ProductDescription } from "../components/ProductDescription";
import { useCatalog, useCatalogStatus } from "../data/catalog-provider";
import {
  availabilityLabel,
  displayTitle,
  isPublicProduct,
} from "../domain/storefront-presentation";
import "../styles/product-description.css";
import { useProductEngagement } from "../data/product-engagement";
import { findProductScale } from "../domain/product-scale";
import { productFacts } from "../domain/product-facts";
import { CURATED_PRODUCT_FAMILIES, familyForProduct, relatedProductsFor } from "../domain/product-family";
// Índice leve de propósito: importar o corpo dos guias aqui traria a prosa de todos os
// artigos para o bundle da página de produto.
import { guideMatchText, guidesForProduct } from "../content/guides-index";

const marketplaceName = (marketplace: string) =>
  marketplace === "mercado-livre"
    ? "Mercado Livre"
    : marketplace === "shopee"
      ? "Shopee"
      : marketplace === "tiktok"
        ? "TikTok Shop"
        : "Marketplace";

const marketplaceClickEvent = (marketplace: string) =>
  marketplace === "shopee" ? "click_shopee" as const
    : marketplace === "tiktok" ? "click_tiktok_shop" as const
      : "click_mercado_livre" as const;

export function ProductPage() {
  const { slug } = useParams(),
    all = useCatalog(),
    { loading, error } = useCatalogStatus();
  const product = all.find(
    (item) => item.slug === slug && isPublicProduct(item),
  );
  const { favoriteIds, compareIds, toggleFavorite, toggleCompare, recordRecent } = useProductEngagement();
  useEffect(() => {
    if (product) {
      recordRecent(product.id);
      // Uma emissão por produto visualizado: o efeito depende de `product`, então navegar
      // entre produtos na SPA dispara de novo e permanecer na mesma página não duplica.
      trackEcommerce("view_item", {
        items: [{
          item_id: product.id,
          item_name: displayTitle(product),
          item_category: product.category,
          price: product.price,
          currency: product.currency || "BRL",
        }],
      });
    }
  }, [product, recordRecent]);
  if (loading)
    return (
      <main className="container page">
        <div className="catalog-state" role="status">
          Carregando produto…
        </div>
      </main>
    );
  if (error)
    return (
      <main className="container page">
        <div className="catalog-state error" role="alert">
          {error}
        </div>
      </main>
    );
  if (!product)
    return (
      <main className="container not-found">
        <p className="eyebrow">Produto indisponível</p>
        <h1>Este item não está no catálogo ativo.</h1>
        <Link className="button primary" to="/categoria/todos">
          Voltar ao catálogo
        </Link>
      </main>
    );
  const title = displayTitle(product);
  const description = product.storefrontDescription || product.description;
  const scale = findProductScale(product.attributes, title);
  const facts = productFacts(product);
  // Passa os textos de todos os produtos públicos para o ranking medir a raridade de cada
  // keyword no catálogo — assim o guia específico vence o genérico. `all` já está em memória.
  const catalogHaystacks = all.filter(isPublicProduct).map(guideMatchText);
  const guides = guidesForProduct(guideMatchText(product), catalogHaystacks);
  const favorite = favoriteIds.includes(product.id);
  const comparing = compareIds.includes(product.id);
  const activeListings = product.listings.filter(
    (listing) => listing.active && product.status === "published",
  );
  const origin = readListOrigin(product.id);
  const family = familyForProduct(product.id, CURATED_PRODUCT_FAMILIES);
  const curatedRelated = relatedProductsFor(product, all, CURATED_PRODUCT_FAMILIES).slice(0, 4);
  const genericRelated = all
    .filter((item) => isPublicProduct(item) && item.id !== product.id)
    .sort((a, b) => Number(b.category === product.category) - Number(a.category === product.category))
    .slice(0, 4);
  const related = curatedRelated.length ? curatedRelated.map(({ product: item }) => item) : genericRelated;
  const whatsappUrl = `https://wa.me/5511933008549?text=${encodeURIComponent(`Olá! Tenho uma dúvida sobre ${title}.`)}`;
  return (
    <main className="container product-page">
      <nav className="breadcrumbs" aria-label="Navegação estrutural">
        <Link to="/">Início</Link> /{" "}
        <Link to={`/categoria/${product.category}`}>
          {product.category.replaceAll("-", " ")}
        </Link>{" "}
        / {title}
      </nav>
      <div className="product-top" id="fotos">
        <ProductGallery images={product.images} title={title} />
        <section className="product-info">
          <p className="eyebrow">{product.category.replaceAll("-", " ")}</p>
          <h1>{title}</h1>
          <div className="price">{money(product.price)}</div>
          <p>Preço sincronizado com o anúncio oficial.</p>
          <div className="chips">
            <span>{product.attributes.Marketplace}</span>
            <span className="stock">{availabilityLabel(product)}</span>
            {family && <span className="family-chip">Família {family.name}</span>}
          </div>
          <div className="product-engagement-actions"><button type="button" className={favorite ? 'active' : ''} onClick={() => toggleFavorite(product.id)}><Heart weight={favorite ? 'fill' : 'regular'}/>{favorite ? 'Salvo nos favoritos' : 'Salvar nos favoritos'}</button><button type="button" className={comparing ? 'active' : ''} disabled={compareIds.length >= 3 && !comparing} onClick={() => toggleCompare(product.id)}><ArrowsLeftRight/>{comparing ? 'Na comparação' : 'Comparar produto'}</button></div>
          <ul>
            <li>
              <CheckCircle /> Compra protegida pelo marketplace
            </li>
            <li>
              <CheckCircle /> Imagens e condições do anúncio oficial
            </li>
            <li>
              <ClockCounterClockwise /> Sincronizado em{" "}
              {new Date(product.updatedAt).toLocaleDateString("pt-BR")}
            </li>
          </ul>
          <div className="purchase-panel">
            <h2>Escolha onde comprar</h2>
            {activeListings.map((listing) => (
              <div
                className={`purchase-option ${listing.marketplace}`}
                key={listing.externalId}
              >
                <span>
                  <b>{marketplaceName(listing.marketplace)}</b>
                  <small>{money(listing.price ?? product.price)}</small>
                </span>
                <a
                  className={`button buy ${listing.marketplace}`}
                  href={listing.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() =>
                    track({
                      event: marketplaceClickEvent(listing.marketplace),
                      product_id: product.id,
                      product_name: title,
                      marketplace: listing.marketplace,
                      price: listing.price ?? product.price,
                      marketplace_url: listing.url,
                      external_id: listing.externalId,
                      list_name: origin?.list_name,
                      position: origin?.position,
                    })
                  }
                >
                  Comprar no {marketplaceName(listing.marketplace)}{" "}
                  <ArrowSquareOut />
                </a>
              </div>
            ))}
            <a className="product-whatsapp" href={whatsappUrl} target="_blank" rel="noopener noreferrer">
              Tirar dúvida pelo WhatsApp <ArrowSquareOut />
            </a>
          </div>
          {!activeListings.length && (
            <div className="unavailable" role="status">
              Este anúncio está pausado ou encerrado. A compra pelo marketplace
              não está disponível.
            </div>
          )}
        </section>
      </div>
      <nav className="product-jump-nav" aria-label="Navegação nesta página">
        <a href="#fotos">Fotos e compra</a><a href="#descricao">Descrição</a>{facts.length > 0 && <a href="#detalhes">Ficha técnica</a>}<a href="#relacionados">Relacionados</a>
      </nav>
      {scale && <aside className="scale-guide"><Ruler/><span><b>Referência de escala: {scale}</b><small>Medida identificada nas informações do anúncio. Confira a ficha técnica antes da compra.</small></span></aside>}
      <ProductDescription description={description} title={title} productId={product.id} price={product.price} images={product.descriptionImages || []} listings={activeListings} />
      {facts.length > 0 && (
        <section className="product-specs" id="detalhes">
          <header><p className="eyebrow">Informações objetivas</p><h2>Ficha técnica</h2></header>
          {facts.map((group) => (
            <div className="product-fact-group" key={group.heading}>
              <h3>{group.heading}</h3>
              <ul>
                {group.items.map((item) => (
                  <li key={item}><CheckCircle aria-hidden="true" />{item}</li>
                ))}
              </ul>
            </div>
          ))}
          <p className="product-specs-note">Dados extraídos do anúncio oficial. Confirme medidas e condições no marketplace antes de comprar.</p>
        </section>
      )}
      {guides.length > 0 && (
        <section className="product-guides" aria-labelledby="guias-produto">
          <header>
            <p className="eyebrow">Antes de levar para a mesa</p>
            <h2 id="guias-produto">Guias para sua mesa</h2>
          </header>
          <div className="product-guide-links">
            {guides.map((guide) => (
              <Link
                key={guide.slug}
                to={`/guias/${guide.slug}`}
                onClick={() => track({ event: "product_guide_click", product_id: product.id, product_name: title, destination_slug: guide.slug })}
              >
                <b>{guide.title}</b>
                <small>{guide.readingMinutes} min de leitura</small>
              </Link>
            ))}
          </div>
        </section>
      )}
      <section className="related" id="relacionados">
        <header className="section-title left">
          <p>{curatedRelated.length ? "Curadoria da mesma família" : "Continue explorando"}</p>
          <h2>{curatedRelated.length ? "Complete seu encontro" : "Produtos relacionados"}</h2>
          {family && <span>{family.shortDescription}</span>}
        </header>
        <div className="product-grid">
          {related
            .map((item, index) => (
              <ProductCard key={item.id} product={item} listId="produto-relacionados" position={index + 1} />
            ))}
        </div>
      </section>
    </main>
  );
}
