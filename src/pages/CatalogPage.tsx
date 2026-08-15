import { Funnel, MagnifyingGlass } from "@phosphor-icons/react";
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { track } from "../analytics/events";
import { ProductCard } from "../components/ProductCard";
import { useCatalog, useCatalogStatus } from "../data/catalog-provider";
import {
  filterAndSortProducts,
  priceRanges,
  zeroResultOptions,
  type CatalogSort,
  type PriceRangeId,
} from "../domain/catalog-filters";
import { isPublicProduct } from "../domain/storefront-presentation";

export function CatalogPage() {
  const { slug = "todos" } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [query, setQuery] = useState(""),
    [priceRange, setPriceRange] = useState<PriceRangeId>("all"),
    [sort, setSort] = useState<CatalogSort>("recentes");
  const catalog = useCatalog(),
    { loading, error } = useCatalogStatus();
  const categories = [
    ...new Set(
      catalog.filter(isPublicProduct).map((product) => product.category),
    ),
  ];
  const ranges = priceRanges(catalog);
  const products = useMemo(() => {
    let result = filterAndSortProducts(catalog, {
      query,
      category: slug,
      priceRange,
      sort,
    });
    if (searchParams.get("colecao") === "kits")
      result = result.filter((product) =>
        /\bkit\b|ex[eé]rcito|conjunto/i.test(product.title),
      );
    const marketplaceParam = searchParams.get("marketplace");
    const marketplace = marketplaceParam === "tiktok-shop" ? "tiktok" : marketplaceParam;
    if (marketplace)
      result = result.filter((product) =>
        product.listings.some(
          (listing) => listing.marketplace === marketplace && listing.active,
        ),
      );
    return result;
  }, [catalog, slug, query, priceRange, sort, searchParams]);
  const emptyOptions = useMemo(() => zeroResultOptions(catalog, query, slug), [catalog, query, slug]);
  const clearSearchAndFilters = () => {
    setQuery("");
    setPriceRange("all");
    setSort("recentes");
    if (slug !== "todos" || searchParams.size) navigate("/categoria/todos");
  };
  useEffect(() => {
    track({ event: "view_category", category: slug, result_count: products.length });
  }, [slug, products.length]);
  useEffect(() => {
    if (!query.trim()) return;
    const timer = window.setTimeout(
      () => track({ event: "search_product", search_term: query.trim(), result_count: products.length, zero_results: products.length === 0 }),
      500,
    );
    return () => window.clearTimeout(timer);
  }, [query, products.length]);
  useEffect(() => {
    if (priceRange === "all" && sort === "recentes") return;
    track({
      event: "filter_catalog",
      filter_type: priceRange !== "all" ? "price" : "sort",
      filter_value: priceRange !== "all" ? priceRange : sort,
      category: slug,
      result_count: products.length,
    });
  }, [priceRange, sort, slug, products.length]);
  return (
    <main className="container catalog">
      <nav className="breadcrumbs" aria-label="Navegação estrutural">
        <Link to="/">Início</Link> / Catálogo
      </nav>
      <div className="catalog-head">
        <div>
          <p className="eyebrow">Explore</p>
          <h1>
            {searchParams.get("colecao") === "kits"
              ? "Kits e Exércitos"
              : slug === "todos"
                ? "Todos os produtos"
                : slug.replaceAll("-", " ")}
          </h1>
          <p>Dados atualizados a partir dos marketplaces conectados.</p>
        </div>
        <label className="search-field">
          Buscar produtos
          <span>
            <MagnifyingGlass />
            <input
              type="search"
              aria-label="Buscar produtos"
              placeholder="Título ou categoria"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </span>
        </label>
      </div>
      <div className="catalog-toolbar">
        <b>
          {products.length} {products.length === 1 ? "produto" : "produtos"}
        </b>
        <label>
          Ordenar por
          <select
            aria-label="Ordenar produtos"
            value={sort}
            onChange={(event) => setSort(event.target.value as CatalogSort)}
          >
            <option value="recentes">Mais recentes</option>
            <option value="menor-preco">Menor preço</option>
            <option value="maior-preco">Maior preço</option>
            <option value="az">Nome A–Z</option>
          </select>
        </label>
      </div>
      <div className="catalog-layout">
        <aside>
          <h2>
            <Funnel /> Filtros
          </h2>
          <div className="category-links">
            <Link
              className={slug === "todos" ? "active" : ""}
              to="/categoria/todos"
            >
              Todos
            </Link>
            {categories.map((category) => (
              <Link
                className={slug === category ? "active" : ""}
                key={category}
                to={`/categoria/${category}`}
              >
                {category.replaceAll("-", " ")}
              </Link>
            ))}
          </div>
          <fieldset className="price-filters">
            <legend>Faixa de preço</legend>
            <label>
              <input
                type="radio"
                name="price"
                checked={priceRange === "all"}
                onChange={() => setPriceRange("all")}
              />{" "}
              Todos os preços
            </label>
            {ranges.map((range) => (
              <label key={range.id}>
                <input
                  type="radio"
                  name="price"
                  checked={priceRange === range.id}
                  onChange={() => setPriceRange(range.id)}
                />{" "}
                {range.label}
              </label>
            ))}
          </fieldset>
        </aside>
        <section>
          {loading ? (
            <div className="catalog-state" role="status">
              Atualizando catálogo…
            </div>
          ) : error ? (
            <div className="catalog-state error" role="alert">
              {error}
            </div>
          ) : products.length ? (
            <div className="product-grid catalog-products">
              {products.map((product, index) => (
                <ProductCard key={product.id} product={product} listId="catalogo" position={index + 1} />
              ))}
            </div>
          ) : (
            <section className="empty zero-results" aria-labelledby="zero-results-title">
              <p className="eyebrow">Busca sem resultado</p>
              <h2 id="zero-results-title">Não encontramos esse produto</h2>
              <p>Tente um termo mais curto ou explore as opções reais que já estão no catálogo.</p>
              <button className="button primary" type="button" onClick={clearSearchAndFilters}>Limpar busca e filtros</button>
              {!!emptyOptions.categories.length && <div className="zero-result-categories">
                <h3>Explore categorias disponíveis</h3>
                <div>{emptyOptions.categories.map((category) => <Link key={category} to={`/categoria/${category}`}>{category.replaceAll("-", " ")}</Link>)}</div>
              </div>}
              {!!emptyOptions.products.length && <div className="zero-result-products">
                <h3>Continue pelo catálogo</h3>
                <div className="product-grid catalog-products">{emptyOptions.products.map((product, index) => <ProductCard key={product.id} product={product} listId="busca-zero-resultados" position={index + 1} />)}</div>
              </div>}
            </section>
          )}
        </section>
      </div>
    </main>
  );
}
