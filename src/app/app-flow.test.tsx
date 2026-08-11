import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { resetConsent, setConsent } from '../analytics/events'
import { clearListOrigins } from '../analytics/list-attribution'
import { AppRoutes } from './router'

const renderAt = (path: string) => render(<MemoryRouter initialEntries={[path]}><AppRoutes /></MemoryRouter>)

describe('Distrito Geek storefront', () => {
  it('shows the reference hero and catalog entry point', () => {
    renderAt('/')
    expect(screen.getByRole('heading', { name: /seu universo geek começa aqui/i })).toBeVisible()
    expect(screen.getByRole('link', { name: /explorar catálogo/i })).toHaveAttribute('href', '/categoria/todos')
  })

  it('promotes only curated RPG, action figure and kit categories on the home page', () => {
    renderAt('/')
    const section = screen.getByRole('heading', { name: /encontre o que combina/i }).closest('section')!
    expect(within(section).getByRole('link', { name: /miniaturas rpg/i })).toBeVisible()
    expect(within(section).getByRole('link', { name: /action figures/i })).toBeVisible()
    expect(within(section).getByRole('link', { name: /kits e exércitos/i })).toBeVisible()
    expect(within(section).queryByRole('link', { name: /utilidades geek/i })).not.toBeInTheDocument()
  })

  it('switches between dark and light themes accessibly', async () => {
    const user = userEvent.setup()
    renderAt('/')
    const toggle = screen.getByRole('button', { name: /ativar tema claro/i })
    await user.click(toggle)
    expect(document.documentElement).toHaveAttribute('data-theme', 'light')
    expect(screen.getByRole('button', { name: /ativar tema escuro/i })).toBeVisible()
  })

  it('filters the catalog using the search field', async () => {
    const user = userEvent.setup()
    renderAt('/categoria/todos')
    await user.type(screen.getByRole('searchbox', { name: /buscar produtos/i }), 'goblin')
    expect(screen.getAllByRole('article').length).toBeGreaterThan(0)
    expect(screen.getByText(/produtos/i, { selector: '.catalog-toolbar b' })).toBeVisible()
  })

  it('renders product cards with one visible product action and normalized titles', () => {
    renderAt('/')
    const normalizedHeading = screen.getByRole('heading', { name: /Kit 5 Miniaturas RPG/ })
    const card = normalizedHeading.closest('article')!
    expect(within(card).getAllByRole('link')).toHaveLength(1)
    expect(within(card).getByText('Ver produto')).toBeVisible()
    expect(within(card).getByRole('heading').textContent).toContain('RPG')
  })

  it('changes gallery image and updates the pointer zoom origin', async () => {
    const user = userEvent.setup()
    renderAt('/produto/kit-5-miniaturas-rpg-32mm-resina-8k-d-d-pathfinder-mlb4883770099')
    await user.click(screen.getByRole('button', { name: /imagem 2/i }))
    const image = screen.getByTestId('zoom-image')
    fireEvent.pointerMove(image, { clientX: 80, clientY: 60 })
    expect(image.getAttribute('style')).toContain('transform-origin')
  })

  it('shows a technical sheet built only from facts the listing states', () => {
    renderAt('/produto/kit-5-miniaturas-rpg-32mm-resina-8k-d-d-pathfinder-mlb4883770099')
    const sheet = screen.getByRole('heading', { name: /ficha técnica/i }).closest('section')!
    expect(within(sheet).getByRole('heading', { name: /especificações/i })).toBeVisible()
    expect(within(sheet).getByText('Escala: 32 mm')).toBeVisible()
    expect(within(sheet).getByText('5 peças no kit')).toBeVisible()
    expect(within(sheet).getByText('D&D, Pathfinder')).toBeVisible()
    expect(within(sheet).queryByText(/não informado/i)).not.toBeInTheDocument()
  })

  it('leva o produto para guias do mesmo tema e omite o bloco sem relação', () => {
    renderAt('/produto/kit-exercito-goblin-rpg-32mm-resina-8k-d-d-12-miniaturas-mlb4866664485')
    const block = screen.getByRole('heading', { name: /guias para sua mesa/i }).closest('section')!
    const links = within(block).getAllByRole('link')
    expect(links.length).toBeGreaterThan(0)
    expect(links.length).toBeLessThanOrEqual(3)
    expect(links.map((link) => link.getAttribute('href'))).toContain('/guias/goblins-rpg')

    cleanup()
    renderAt('/produto/suporte-de-toalha-travado-por-pressao-mlb7017002734')
    expect(screen.queryByRole('heading', { name: /guias para sua mesa/i })).not.toBeInTheDocument()
  })

  it('liga a landing de categoria aos guias curados do tema', () => {
    renderAt('/miniaturas-pathfinder')
    const block = screen.getByRole('heading', { name: /aprenda mais sobre miniaturas/i }).closest('section')!
    expect(within(block).getByRole('link', { name: /como escolher miniaturas para pathfinder/i })).toBeVisible()
    expect(within(block).getByRole('link', { name: /d&d ou pathfinder/i })).toBeVisible()
  })

  it('publishes canonical metadata for the official domain', () => {
    renderAt('/')
    expect(document.title).toBe('Distrito Geek | Miniaturas RPG, Action Figures e Colecionáveis')
    expect(document.querySelector('link[rel="canonical"]')).toHaveAttribute('href', 'https://distritogeek.com.br/')
    expect(document.querySelector('meta[property="og:url"]')).toHaveAttribute('content', 'https://distritogeek.com.br/')
  })

  it('provides real internal legal destinations without placeholder links', () => {
    renderAt('/')
    expect(document.querySelector('a[href="#"]')).toBeNull()
    expect(screen.getByRole('link', { name: 'Política de Privacidade' })).toHaveAttribute('href', '/politica-de-privacidade')
    expect(screen.getByRole('link', { name: 'Termos de uso' })).toHaveAttribute('href', '/termos')
  })

  it('renders an editorial landing with products, breadcrumbs and useful sections', () => {
    renderAt('/miniaturas-rpg')
    expect(screen.getByRole('heading', { level: 1, name: /miniaturas rpg em resina/i })).toBeVisible()
    expect(screen.getByRole('navigation', { name: /estrutural/i })).toHaveTextContent(/in.cio/i)
    expect(screen.getByRole('heading', { level: 2, name: /como escolher/i })).toBeVisible()
    expect(screen.getAllByRole('article').length).toBeGreaterThan(0)
  })

  it('carries the card list and position into the outbound marketplace click', async () => {
    clearListOrigins()
    resetConsent()
    delete window.dataLayer
    setConsent('granted')
    const user = userEvent.setup()
    renderAt('/categoria/todos')
    const secondCard = screen.getAllByRole('article')[1]
    await user.click(within(secondCard).getByRole('link', { name: /ver produto/i }))
    expect(window.dataLayer).toContainEqual(expect.objectContaining({ event: 'select_item', ecommerce: expect.objectContaining({ item_list_id: 'catalogo', items: [expect.objectContaining({ index: 2 })] }) }))
    await user.click(screen.getAllByRole('link', { name: /comprar no/i })[0])
    expect(window.dataLayer).toContainEqual(expect.objectContaining({ event: 'click_mercado_livre', list_name: 'catalogo', position: 2 }))
  })
})
