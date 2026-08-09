# Routes

- `/` → `src/pages/HomePage.tsx`, public header/footer.
- `/categoria/:slug` → `src/pages/CatalogPage.tsx`, filters and product grid.
- `/produto/:slug` → `src/pages/ProductPage.tsx`, gallery, purchase, rich description, specs and related products.
- `/faq` → `src/pages/FaqPage.tsx`.
- `/contato` → `src/pages/ContactPage.tsx`.
- `/admin/*` → lazy `src/admin/AdminPage.tsx`, admin shell without public header/footer.

Router: React Router v7 configured in `src/app/router.tsx`.
