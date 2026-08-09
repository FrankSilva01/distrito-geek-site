import { fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
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

  it('publishes canonical metadata for the official domain', () => {
    renderAt('/')
    expect(document.title).toBe('Distrito Geek | Miniaturas RPG, Action Figures e Colecionáveis')
    expect(document.querySelector('link[rel="canonical"]')).toHaveAttribute('href', 'https://distritogeek.com.br/')
    expect(document.querySelector('meta[property="og:url"]')).toHaveAttribute('content', 'https://distritogeek.com.br/')
  })
})
