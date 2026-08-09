import { render, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { AdminPage } from './AdminPage'

afterEach(() => vi.restoreAllMocks())

it('restores an authenticated admin session after a page reload', async () => {
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
    const url = String(input)
    if (url.includes('admin-session')) return new Response(JSON.stringify({ authenticated: true }))
    return new Response(JSON.stringify([]))
  })
  render(<AdminPage />)
  expect(await screen.findByRole('heading', { name: /visão geral/i })).toBeVisible()
  expect(screen.getByRole('heading', { name: /cadastrar anúncio manualmente/i })).toBeVisible()
})
