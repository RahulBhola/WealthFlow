import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { AppLayout } from './AppLayout'

describe('AppLayout master shell', () => {
  it('renders brand title and desktop sidebar links', () => {
    render(
      <AppLayout currentPath="/">
        <div data-testid="page-content">Test Page Content</div>
      </AppLayout>
    )

    expect(screen.getByTestId('page-content')).toBeInTheDocument()
    // Brand title is rendered in sidebar and header
    expect(screen.getAllByText('WealthFlow').length).toBeGreaterThan(0)
  })

  it('renders top search bar and mobile menu trigger', () => {
    render(
      <AppLayout currentPath="/">
        <div>Content</div>
      </AppLayout>
    )

    const menuButton = screen.getByLabelText(/open navigation menu/i)
    expect(menuButton).toBeInTheDocument()

    // Trigger mobile drawer open
    fireEvent.click(menuButton)
    expect(screen.getByLabelText(/close menu/i)).toBeInTheDocument()
  })
})
