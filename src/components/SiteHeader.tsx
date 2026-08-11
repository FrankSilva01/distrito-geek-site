import { Heart, List, MagnifyingGlass, X } from '@phosphor-icons/react'
import { useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { ThemeToggle } from './ThemeToggle'
import { useProductEngagement } from '../data/product-engagement'

export function SiteHeader() {
  const [open, setOpen] = useState(false)
  const { favoriteIds } = useProductEngagement()
  return <header className="site-header"><div className="container nav-wrap">
    <Link className="brand" to="/"><span>DISTRITO</span><strong>GEEK</strong></Link>
    <button className="menu-button" aria-expanded={open} aria-controls="main-navigation" aria-label={open ? 'Fechar menu' : 'Abrir menu'} onClick={() => setOpen(!open)}>{open ? <X/> : <List/>}</button>
    <nav id="main-navigation" className={open ? 'nav open' : 'nav'} aria-label="Navegação principal" onClick={() => setOpen(false)}>
      <NavLink to="/">Início</NavLink><NavLink to="/categoria/todos">Categorias</NavLink><NavLink to="/miniaturas-rpg">Miniaturas RPG</NavLink><NavLink to="/action-figures">Action Figures</NavLink><NavLink to="/faq">FAQ</NavLink><NavLink to="/contato">Contato</NavLink>
    </nav>
    <ThemeToggle/><Link className="nav-icon" to="/favoritos" aria-label={`Favoritos: ${favoriteIds.length}`}><Heart weight={favoriteIds.length ? 'fill' : 'regular'}/>{favoriteIds.length > 0 && <span>{favoriteIds.length}</span>}</Link><Link className="nav-search" to="/categoria/todos" aria-label="Buscar produtos"><MagnifyingGlass/></Link>
  </div></header>
}
