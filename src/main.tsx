import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { AppRoutes } from './app/router'
import { CatalogProvider } from './data/catalog-provider'
import { ConsentBanner } from './analytics/ConsentBanner'
import { initErrorReporting } from './monitoring/error-reporting'
import './styles/global.css'

initErrorReporting()

createRoot(document.getElementById('root')!).render(<StrictMode><BrowserRouter><CatalogProvider><AppRoutes /><ConsentBanner /></CatalogProvider></BrowserRouter></StrictMode>)
