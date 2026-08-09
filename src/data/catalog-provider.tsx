import { createContext, type ReactNode, useContext, useEffect, useState } from 'react'
import type { Product } from '../domain/product'
import { loadSeedCatalog } from './seed-loader'

const developmentCatalog = import.meta.env.DEV ? loadSeedCatalog() : []
const CatalogContext = createContext<Product[]>(developmentCatalog)
const CatalogStatusContext = createContext({ loading: false, error: '' })

export function CatalogProvider({ children }: { children: ReactNode }) {
  const [products, setProducts] = useState<Product[]>(developmentCatalog)
  const [status, setStatus] = useState({ loading: true, error: '' })
  useEffect(() => {
    fetch('/api/catalog').then(async (response) => {
      if (!response.ok) throw new Error('Catálogo indisponível')
      return response.json() as Promise<{ products: Product[] }>
    }).then((data) => { setProducts(data.products); setStatus({ loading: false, error: '' }) })
      .catch(() => { setProducts([]); setStatus({ loading: false, error: 'Não foi possível atualizar nosso catálogo agora.' }) })
  }, [])
  return <CatalogStatusContext.Provider value={status}><CatalogContext.Provider value={products}>{children}</CatalogContext.Provider></CatalogStatusContext.Provider>
}

export const useCatalog = () => useContext(CatalogContext)
export const useCatalogStatus = () => useContext(CatalogStatusContext)
