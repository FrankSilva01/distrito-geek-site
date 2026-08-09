import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { AppRoutes } from './app/router'
import { CatalogProvider } from './data/catalog-provider'
import './styles/global.css'

createRoot(document.getElementById('root')!).render(<StrictMode><BrowserRouter><CatalogProvider><AppRoutes /></CatalogProvider></BrowserRouter></StrictMode>)
