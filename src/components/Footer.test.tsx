import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import Footer from './Footer'

describe('Footer', () => {
  it('renders version with commit link when all props provided', () => {
    render(
      <Footer
        commitDate="2025-12-22"
        commitHash="95a8b663"
        repoUrl="https://github.com/omarkohl/wager-calculator"
      />
    )

    const versionLink = screen.getByRole('link', { name: /2025-12-22 \(95a8b663\)/ })
    expect(versionLink).toHaveAttribute(
      'href',
      'https://github.com/omarkohl/wager-calculator/commit/95a8b663'
    )

    const bugLink = screen.getByRole('link', { name: /Report a bug/ })
    expect(bugLink).toHaveAttribute('href', 'https://github.com/omarkohl/wager-calculator/issues')
  })

  it('renders version without link when repoUrl is missing', () => {
    render(<Footer commitDate="2025-12-22" commitHash="95a8b663" />)

    expect(screen.getByText(/Version:/)).toBeInTheDocument()
    expect(screen.getByText(/2025-12-22 \(95a8b663\)/)).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /2025-12-22/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /Report a bug/ })).not.toBeInTheDocument()
  })

  it('hides bug report link when repoUrl is empty string', () => {
    render(<Footer commitDate="2025-12-22" commitHash="95a8b663" repoUrl="" />)

    expect(screen.queryByRole('link', { name: /Report a bug/ })).not.toBeInTheDocument()
  })

  it('hides version when commit info is unknown', () => {
    render(
      <Footer commitDate="unknown" commitHash="unknown" repoUrl="https://github.com/test/repo" />
    )

    expect(screen.queryByText(/Version:/)).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Report a bug/ })).toBeInTheDocument()
  })

  it('hides version when commit date is missing', () => {
    render(<Footer commitHash="95a8b663" repoUrl="https://github.com/test/repo" />)

    expect(screen.queryByText(/Version:/)).not.toBeInTheDocument()
  })

  it('hides version when commit hash is missing', () => {
    render(<Footer commitDate="2025-12-22" repoUrl="https://github.com/test/repo" />)

    expect(screen.queryByText(/Version:/)).not.toBeInTheDocument()
  })

  it('renders empty footer when no props provided', () => {
    const { container } = render(<Footer />)

    expect(container.querySelector('footer')).toBeInTheDocument()
    expect(screen.queryByText(/Version:/)).not.toBeInTheDocument()
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
  })
})
