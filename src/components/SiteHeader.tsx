import { List, MagnifyingGlass, X } from '@phosphor-icons/react'
import { useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { ThemeToggle } from './ThemeToggle'

export function SiteHeader() {
  const [open, setOpen] = useState(false)
  return <header className="site-header"><div className="container nav-wrap">
    <Link className="brand" to="/" aria-label="Distrito Geek — início"><span>DISTRITO</span><strong>GEEK</strong></Link>
    <button className="menu-button" aria-label={open ? 'Fechar menu' : 'Abrir menu'} onClick={() => setOpen(!open)}>{open ? <X/> : <List/>}</button>
    <nav className={open ? 'nav open' : 'nav'} aria-label="Navegação principal">
      <NavLink to="/">Início</NavLink><NavLink to="/categoria/todos">Categorias</NavLink><NavLink to="/categoria/miniaturas-rpg">Miniaturas RPG</NavLink><NavLink to="/categoria/action-figures">Action Figures</NavLink><NavLink to="/faq">FAQ</NavLink><NavLink to="/contato">Contato</NavLink>
    </nav>
    <ThemeToggle/><Link className="nav-search" to="/categoria/todos" aria-label="Buscar produtos"><MagnifyingGlass/></Link>
  </div></header>
}
