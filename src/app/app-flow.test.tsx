import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { AppRoutes } from './router'

const renderAt = (path: string) => render(<MemoryRouter initialEntries={[path]}><AppRoutes /></MemoryRouter>)

describe('Distrito Geek storefront', () => {
  it('shows the reference hero and catalog entry point', () => {
    renderAt('/')
    expect(screen.getByRole('heading', { name: /seu universo geek começa aqui/i })).toBeVisible()
    expect(screen.getByRole('link', { name: /ver produtos/i })).toHaveAttribute('href', '/categoria/todos')
  })

  it('filters the catalog using the search field', async () => {
    const user = userEvent.setup()
    renderAt('/categoria/todos')
    await user.type(screen.getByRole('searchbox', { name: /buscar produtos/i }), 'goblin')
    expect(screen.getAllByRole('article').length).toBeGreaterThan(0)
    expect(screen.getByText(/resultados encontrados/i)).toBeVisible()
  })

  it('changes gallery image and updates the pointer zoom origin', async () => {
    const user = userEvent.setup()
    renderAt('/produto/kit-5-miniaturas-rpg-32mm-resina-8k-d-d-pathfinder-mlb4883770099')
    await user.click(screen.getByRole('button', { name: /imagem 2/i }))
    const image = screen.getByTestId('zoom-image')
    fireEvent.pointerMove(image, { clientX: 80, clientY: 60 })
    expect(image.getAttribute('style')).toContain('transform-origin')
  })
})
