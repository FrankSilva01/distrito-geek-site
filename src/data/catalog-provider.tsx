import { createContext, type ReactNode, useContext, useEffect, useState } from 'react'
import type { Product } from '../domain/product'
import { loadSeedCatalog } from './seed-loader'

const CatalogContext = createContext<Product[]>(loadSeedCatalog())

export function CatalogProvider({ children }: { children: ReactNode }) {
  const [products, setProducts] = useState(loadSeedCatalog)
  useEffect(() => {
    fetch('/api/catalog').then(async (response) => {
      if (!response.ok) throw new Error('Catálogo indisponível')
      return response.json() as Promise<Product[]>
    }).then(setProducts).catch(() => undefined)
  }, [])
  return <CatalogContext.Provider value={products}>{children}</CatalogContext.Provider>
}

export const useCatalog = () => useContext(CatalogContext)
