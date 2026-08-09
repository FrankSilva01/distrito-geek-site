import { Route, Routes, useLocation } from 'react-router-dom'
import { lazy, Suspense } from 'react'
import { SiteFooter } from '../components/SiteFooter'
import { SiteHeader } from '../components/SiteHeader'
import { CatalogPage } from '../pages/CatalogPage'
import { ContactPage } from '../pages/ContactPage'
import { FaqPage } from '../pages/FaqPage'
import { HomePage } from '../pages/HomePage'
import { ProductPage } from '../pages/ProductPage'
const AdminPage = lazy(() => import('../admin/AdminPage').then((module) => ({ default: module.AdminPage })))
export function AppRoutes(){const admin=useLocation().pathname.startsWith('/admin');return <>{!admin&&<SiteHeader/>}<Routes><Route path="/" element={<HomePage/>}/><Route path="/categoria/:slug" element={<CatalogPage/>}/><Route path="/produto/:slug" element={<ProductPage/>}/><Route path="/faq" element={<FaqPage/>}/><Route path="/contato" element={<ContactPage/>}/><Route path="/admin/*" element={<Suspense fallback={<main className="admin-login"><p>Carregando painel…</p></main>}><AdminPage/></Suspense>}/><Route path="*" element={<main className="container page"><h1>Página não encontrada</h1></main>}/></Routes>{!admin&&<SiteFooter/>}</>}
