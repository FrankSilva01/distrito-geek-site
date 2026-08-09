# Shared layouts

## SiteHeader
```tsx
import { List, MagnifyingGlass, X } from '@phosphor-icons/react'
import { useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { ThemeToggle } from './ThemeToggle'
export function SiteHeader(){ const [open,setOpen]=useState(false); return <header className="site-header"><div className="container nav-wrap"><Link className="brand" to="/"><span>DISTRITO</span><strong>GEEK</strong></Link><button className="menu-button" onClick={()=>setOpen(!open)}>{open?<X/>:<List/>}</button><nav className={open?'nav open':'nav'}><NavLink to="/">Início</NavLink><NavLink to="/categoria/todos">Categorias</NavLink><NavLink to="/categoria/miniaturas-rpg">Miniaturas RPG</NavLink><NavLink to="/categoria/action-figures">Action Figures</NavLink><NavLink to="/faq">FAQ</NavLink><NavLink to="/contato">Contato</NavLink></nav><ThemeToggle/><Link className="nav-search" to="/categoria/todos"><MagnifyingGlass/></Link></div></header> }
```

## SiteFooter
```tsx
import { Link } from 'react-router-dom'
export function SiteFooter(){ return <footer><div className="container footer-grid"><div><div className="brand small"><span>DISTRITO</span><strong>GEEK</strong></div><p>Miniaturas, action figures e colecionáveis.</p></div><div><b>Categorias</b><Link to="/categoria/miniaturas-rpg">Miniaturas RPG</Link><Link to="/categoria/action-figures">Action Figures</Link></div><div><b>Informações</b><Link to="/faq">Perguntas frequentes</Link><Link to="/contato">Contato</Link></div></div></footer> }
```
