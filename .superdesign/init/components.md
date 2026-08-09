# Shared components

## ProductCard
Path: `src/components/ProductCard.tsx`
```tsx
import { ArrowRight } from '@phosphor-icons/react'
import { Link } from 'react-router-dom'
import type { Product } from '../domain/product'
import { availabilityLabel, displayTitle } from '../domain/storefront-presentation'
export const money = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
export function ProductCard({ product }: { product: Product }) { const title = displayTitle(product); return <article className="product-card"><Link to={`/produto/${product.slug}`} aria-label={`Ver produto: ${title}`}><div className="product-image"><img src={product.images[0]} alt={title}/></div><div className="product-copy"><small>{product.attributes.Marketplace || product.category}</small><h3>{title}</h3><strong>{money(product.price)}</strong><span className="stock">{availabilityLabel(product)}</span><span className="card-action">Ver produto <ArrowRight/></span></div></Link></article> }
```

## ThemeToggle
Path: `src/components/ThemeToggle.tsx`
```tsx
import { Moon, Sun } from '@phosphor-icons/react'
import { useState } from 'react'
export function ThemeToggle(){ const [theme,setTheme]=useState('dark'); return <button className="theme-toggle" aria-label={theme === 'dark' ? 'Ativar tema claro' : 'Ativar tema escuro'} onClick={()=>setTheme(theme === 'dark' ? 'light':'dark')}>{theme === 'dark'?<Sun/>:<Moon/>}</button> }
```
