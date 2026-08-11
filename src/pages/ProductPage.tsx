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

const marketplaceName = (marketplace: string) =>
  marketplace === "mercado-livre"
    ? "Mercado Livre"
    : marketplace === "shopee"
      ? "Shopee"
      : "Marketplace";

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
  const favorite = favoriteIds.includes(product.id);
  const comparing = compareIds.includes(product.id);
  const activeListings = product.listings.filter(
    (listing) => listing.active && product.status === "published",
  );
  const origin = readListOrigin(product.id);
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
                  <small>{money(product.price)}</small>
                </span>
                <a
                  className={`button buy ${listing.marketplace}`}
                  href={listing.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() =>
                    track({
                      event: listing.marketplace === "shopee" ? "click_shopee" : "click_mercado_livre",
                      product_id: product.id,
                      product_name: title,
                      marketplace: listing.marketplace,
                      price: product.price,
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
        <a href="#fotos">Fotos e compra</a><a href="#descricao">Descrição</a><a href="#detalhes">Ficha técnica</a><a href="#relacionados">Relacionados</a>
      </nav>
      {scale && <aside className="scale-guide"><Ruler/><span><b>Referência de escala: {scale}</b><small>Medida identificada nas informações do anúncio. Confira a ficha técnica antes da compra.</small></span></aside>}
      <ProductDescription description={description} title={title} images={product.descriptionImages || []} listings={activeListings} />
      <section className="product-specs" id="detalhes">
        <header><p className="eyebrow">Informações objetivas</p><h2>Ficha técnica</h2></header>
        {Object.keys(product.attributes).length > 0 && (
          <>
            <h3>Informações adicionais</h3>
            <dl>
              {Object.entries(product.attributes).map(([key, value]) => (
                <div key={key}>
                  <dt>{key}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
            </dl>
          </>
        )}
      </section>
      <section className="related" id="relacionados">
        <header className="section-title left">
          <p>Continue explorando</p>
          <h2>Produtos relacionados</h2>
        </header>
        <div className="product-grid">
          {all
            .filter((item) => isPublicProduct(item) && item.id !== product.id)
            .sort((a, b) => Number(b.category === product.category) - Number(a.category === product.category))
            .slice(0, 4)
            .map((item, index) => (
              <ProductCard key={item.id} product={item} listId="produto-relacionados" position={index + 1} />
            ))}
        </div>
      </section>
    </main>
  );
}
