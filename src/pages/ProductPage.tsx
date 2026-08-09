import {
  ArrowSquareOut,
  CheckCircle,
  ClockCounterClockwise,
} from "@phosphor-icons/react";
import { useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import { track } from "../analytics/events";
import { money, ProductCard } from "../components/ProductCard";
import { ProductGallery } from "../components/ProductGallery";
import { useCatalog, useCatalogStatus } from "../data/catalog-provider";
import {
  availabilityLabel,
  displayTitle,
  isPublicProduct,
} from "../domain/storefront-presentation";
import { formatProductDescription } from "../domain/product-description";
import "../styles/product-description.css";

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
  useEffect(() => {
    if (product)
      track({
        event: "view_product",
        product_id: product.id,
        product_name: displayTitle(product),
        price: product.price,
        category: product.category,
      });
  }, [product]);
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
  const activeListings = product.listings.filter(
    (listing) => listing.active && product.status === "published",
  );
  return (
    <main className="container product-page">
      <nav className="breadcrumbs" aria-label="Navegação estrutural">
        <Link to="/">Início</Link> /{" "}
        <Link to={`/categoria/${product.category}`}>
          {product.category.replaceAll("-", " ")}
        </Link>{" "}
        / {title}
      </nav>
      <div className="product-top">
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
      <section className="description">
        <h2>Descrição</h2>
        <div className="description-copy">
          {formatProductDescription(description).map((block, index) => block.type === "list" ? <ul key={index}>{block.items.map((item) => <li key={item}>{item}</li>)}</ul> : <p key={index}>{block.text}</p>)}
        </div>
        {!!product.descriptionImages?.length && <div className="description-images">{product.descriptionImages.map((image, index) => <img key={image} src={image} alt={`${title} — detalhe ${index + 1}`} loading="lazy" />)}</div>}
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
      <section className="related">
        <header className="section-title left">
          <p>Continue explorando</p>
          <h2>Produtos relacionados</h2>
        </header>
        <div className="product-grid">
          {all
            .filter((item) => isPublicProduct(item) && item.id !== product.id)
            .slice(0, 4)
            .map((item) => (
              <ProductCard key={item.id} product={item} />
            ))}
        </div>
      </section>
    </main>
  );
}
