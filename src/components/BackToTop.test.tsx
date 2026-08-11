import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { BackToTop } from './BackToTop'

const scrollTo = (y: number) => { Object.defineProperty(window, 'scrollY', { value: y, configurable: true }); fireEvent.scroll(window) }

describe('BackToTop', () => {
  afterEach(() => { scrollTo(0); vi.restoreAllMocks() })

  it('stays hidden until the page is scrolled past the threshold', () => {
    render(<BackToTop showAfter={300}/>)
    expect(screen.queryByRole('button', { name: /voltar ao topo/i })).not.toBeInTheDocument()
    scrollTo(400)
    expect(screen.getByRole('button', { name: /voltar ao topo/i })).toBeVisible()
  })

  it('scrolls back to the top when pressed', () => {
    const spy = vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
    render(<BackToTop showAfter={300}/>)
    scrollTo(400)
    fireEvent.click(screen.getByRole('button', { name: /voltar ao topo/i }))
    expect(spy).toHaveBeenCalledWith(expect.objectContaining({ top: 0 }))
  })
})
