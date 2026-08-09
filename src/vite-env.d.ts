/// <reference types="vite/client" />

interface ImportMetaEnv { readonly VITE_GTM_ID?: string; readonly VITE_GOOGLE_SITE_VERIFICATION?: string }
interface ImportMeta { readonly env: ImportMetaEnv }
interface Window { dataLayer?: unknown[] }
