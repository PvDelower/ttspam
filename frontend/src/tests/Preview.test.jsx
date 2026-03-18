import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import Preview from '../components/Preview'

describe('Preview Component', () => {
  const mockApiBase = 'http://localhost:8000'
  
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders without fileId', () => {
    render(<Preview apiBase={mockApiBase} />)
    
    expect(screen.getByText(/Превью/)).toBeInTheDocument()
    expect(screen.getByText(/Выберите видео/)).toBeInTheDocument()
  })

  it('shows loading state when fileId is provided', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        status: 'success',
        preview_url: '/api/files/preview/test.jpg',
        filename: 'test.jpg'
      })
    })

    render(<Preview fileId="test.mp4" apiBase={mockApiBase} />)
    
    // Проверяем что компонент отрендерился с fileId
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/preview'),
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ file_id: 'test.mp4' })
        })
      )
    })
  })

  it('shows error when preview creation fails', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ detail: 'File not found' })
    })

    render(<Preview fileId="nonexistent.mp4" apiBase={mockApiBase} />)
    
    await waitFor(() => {
      expect(screen.getByText(/Ошибка превью/i)).toBeInTheDocument()
    })
  })

  it('displays preview image on success', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        status: 'success',
        preview_url: '/api/files/preview/test.jpg',
        filename: 'test.jpg'
      })
    })

    render(<Preview fileId="test.mp4" apiBase={mockApiBase} />)
    
    await waitFor(() => {
      const img = screen.getByAltText('Preview')
      expect(img).toBeInTheDocument()
    })
  })

  it('refreshes preview on button click', async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        status: 'success',
        preview_url: '/api/files/preview/test.jpg',
        filename: 'test.jpg'
      })
    })

    render(<Preview fileId="test.mp4" apiBase={mockApiBase} />)
    
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(1)
    })

    const refreshButton = screen.getByRole('button', { name: '🔄' })
    fireEvent.click(refreshButton)
    
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(2)
    })
  })

  it('handles API base URL normalization', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ status: 'success', preview_url: '/preview.jpg' })
    })

    // Тестируем с apiBase который заканчивается на /api
    render(<Preview fileId="test.mp4" apiBase="http://localhost:8000/api" />)
    
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:8000/api/preview',
        expect.any(Object)
      )
    })
  })

  it('shows placeholder when no file selected', () => {
    render(<Preview apiBase={mockApiBase} />)
    
    expect(screen.getByText('Выберите видео для превью')).toBeInTheDocument()
  })

  it('handles image loading error', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        status: 'success',
        preview_url: '/api/files/preview/test.jpg'
      })
    })

    render(<Preview fileId="test.mp4" apiBase={mockApiBase} />)
    
    await waitFor(() => {
      const img = screen.getByAltText('Preview')
      fireEvent.error(img)
    })
    
    await waitFor(() => {
      expect(screen.getByText(/Ошибка загрузки/i)).toBeInTheDocument()
    })
  })
})
