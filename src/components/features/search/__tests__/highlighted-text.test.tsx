import { render, screen } from '@testing-library/react'
import {
  HighlightedText,
  MultiHighlightText,
  getHighlightedSegments,
} from '../highlighted-text'

describe('HighlightedText', () => {
  it('should render text without highlighting when no search term', () => {
    render(<HighlightedText text="Hello world" searchTerm="" />)

    expect(screen.getByText('Hello world')).toBeInTheDocument()
    expect(screen.queryByRole('mark')).not.toBeInTheDocument()
  })

  it('should highlight matching text case-insensitively by default', () => {
    render(<HighlightedText text="Hello World" searchTerm="world" />)

    const highlightedText = screen.getByText('World')
    expect(highlightedText.tagName.toLowerCase()).toBe('mark')
  })

  it('should respect case sensitivity when enabled', () => {
    render(
      <HighlightedText
        text="Hello World"
        searchTerm="world"
        caseSensitive={true}
      />
    )

    // Should not highlight "World" when searching for "world" with case sensitivity
    expect(screen.queryByRole('mark')).not.toBeInTheDocument()
    expect(screen.getByText('Hello World')).toBeInTheDocument()
  })

  it('should handle multiple matches in the same text', () => {
    render(<HighlightedText text="test this test again" searchTerm="test" />)

    const marks = screen.getAllByText('test')
    expect(marks).toHaveLength(2)
    marks.forEach(mark => {
      expect(mark.tagName.toLowerCase()).toBe('mark')
    })
  })

  it('should apply custom CSS classes', () => {
    const { container } = render(
      <HighlightedText
        text="Hello world"
        searchTerm="world"
        className="custom-class"
        highlightClassName="custom-highlight"
      />
    )

    const wrapper = container.querySelector('.custom-class')
    expect(wrapper).toBeInTheDocument()

    const highlight = screen.getByText('world')
    expect(highlight).toHaveClass('custom-highlight')
  })

  it('should escape special regex characters', () => {
    render(
      <HighlightedText text="Price: $10.50 (special)" searchTerm="$10.50" />
    )

    const highlight = screen.getByText('$10.50')
    expect(highlight.tagName.toLowerCase()).toBe('mark')
  })

  it('should handle empty search term gracefully', () => {
    render(<HighlightedText text="Hello world" searchTerm="" />)

    expect(screen.getByText('Hello world')).toBeInTheDocument()
    expect(screen.queryByRole('mark')).not.toBeInTheDocument()
  })

  it('should handle empty text gracefully', () => {
    render(<HighlightedText text="" searchTerm="test" />)

    const container = screen.getByText('', { selector: 'span' })
    expect(container).toBeInTheDocument()
  })

  it('should trim search terms', () => {
    render(<HighlightedText text="Hello world" searchTerm="  world  " />)

    const highlight = screen.getByText('world')
    expect(highlight.tagName.toLowerCase()).toBe('mark')
  })
})

describe('MultiHighlightText', () => {
  it('should highlight multiple different search terms', () => {
    render(
      <MultiHighlightText
        text="Hello world and universe"
        searchTerms={['world', 'universe']}
      />
    )

    const worldHighlight = screen.getByText('world')
    const universeHighlight = screen.getByText('universe')

    expect(worldHighlight.tagName.toLowerCase()).toBe('mark')
    expect(universeHighlight.tagName.toLowerCase()).toBe('mark')
  })

  it('should handle empty search terms array', () => {
    render(<MultiHighlightText text="Hello world" searchTerms={[]} />)

    expect(screen.getByText('Hello world')).toBeInTheDocument()
    expect(screen.queryByRole('mark')).not.toBeInTheDocument()
  })

  it('should filter out empty search terms', () => {
    render(
      <MultiHighlightText
        text="Hello world"
        searchTerms={['', 'world', '   ', 'test']}
      />
    )

    const worldHighlight = screen.getByText('world')
    expect(worldHighlight.tagName.toLowerCase()).toBe('mark')

    // 'test' should not be highlighted as it's not in the text
    expect(screen.queryByText('test')).not.toBeInTheDocument()
  })

  it('should handle overlapping matches correctly', () => {
    render(
      <MultiHighlightText
        text="testing tests"
        searchTerms={['test', 'testing']}
      />
    )

    // Should highlight both terms
    const highlights = screen.getAllByRole('mark')
    expect(highlights.length).toBeGreaterThan(0)
  })

  it('should respect case sensitivity', () => {
    render(
      <MultiHighlightText
        text="Hello WORLD"
        searchTerms={['world']}
        caseSensitive={true}
      />
    )

    // Should not highlight "WORLD" when searching for "world" with case sensitivity
    expect(screen.queryByRole('mark')).not.toBeInTheDocument()
  })
})

describe('getHighlightedSegments', () => {
  it('should return segments with highlight information', () => {
    const segments = getHighlightedSegments('Hello world test', 'world')

    expect(segments).toEqual([
      { text: 'Hello ', isHighlighted: false },
      { text: 'world', isHighlighted: true },
      { text: ' test', isHighlighted: false },
    ])
  })

  it('should handle no matches', () => {
    const segments = getHighlightedSegments('Hello world', 'xyz')

    expect(segments).toEqual([{ text: 'Hello world', isHighlighted: false }])
  })

  it('should handle empty text', () => {
    const segments = getHighlightedSegments('', 'test')

    expect(segments).toEqual([{ text: '', isHighlighted: false }])
  })

  it('should handle empty search term', () => {
    const segments = getHighlightedSegments('Hello world', '')

    expect(segments).toEqual([{ text: 'Hello world', isHighlighted: false }])
  })

  it('should handle case insensitive matching by default', () => {
    const segments = getHighlightedSegments('Hello WORLD', 'world')

    expect(segments).toEqual([
      { text: 'Hello ', isHighlighted: false },
      { text: 'WORLD', isHighlighted: true },
    ])
  })

  it('should respect case sensitivity option', () => {
    const segments = getHighlightedSegments('Hello WORLD', 'world', true)

    expect(segments).toEqual([{ text: 'Hello WORLD', isHighlighted: false }])
  })

  it('should handle multiple matches', () => {
    const segments = getHighlightedSegments('test this test', 'test')

    expect(segments).toEqual([
      { text: 'test', isHighlighted: true },
      { text: ' this ', isHighlighted: false },
      { text: 'test', isHighlighted: true },
    ])
  })

  it('should escape special regex characters', () => {
    const segments = getHighlightedSegments('Price: $10.50', '$10.50')

    expect(segments).toEqual([
      { text: 'Price: ', isHighlighted: false },
      { text: '$10.50', isHighlighted: true },
    ])
  })
})
