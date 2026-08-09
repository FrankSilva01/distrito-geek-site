# Page dependency trees

## `/` Home
- `src/pages/HomePage.tsx`
  - `src/components/ProductCard.tsx`
  - `src/data/catalog-provider.tsx`
  - `src/domain/home-curation.ts`

## `/categoria/:slug` Catalog
- `src/pages/CatalogPage.tsx`
  - `src/components/ProductCard.tsx`
  - `src/data/catalog-provider.tsx`
  - `src/domain/catalog-filters.ts`

## `/produto/:slug` Product
- `src/pages/ProductPage.tsx`
  - `src/components/ProductGallery.tsx`
  - `src/components/ProductDescription.tsx`
  - `src/components/ProductCard.tsx`
  - `src/data/catalog-provider.tsx`
  - `src/domain/product-description.ts`

All public pages use `src/components/SiteHeader.tsx`, `src/components/SiteFooter.tsx`, `src/components/Seo.tsx`, and `src/styles/global.css`.
