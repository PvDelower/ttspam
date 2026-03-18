import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import VideoProcessor from '../components/VideoProcessor'

describe('VideoProcessor Component', () => {
  const mockApiBase = 'http://localhost:8000'
  
  const mockVideos = [
    { name: 'video1.mp4', size: 10485760 },
    { name: 'video2.mp4', size: 20971520 },
  ]
  
  const mockBanners = [
    { id: '1', name: 'banner1.gif' },
    { id: '2', name: 'banner2.webm' },
  ]

  beforeEach(() => {
    vi.clearAllMocks()
    
    global.fetch.mockImplementation((url) => {
      if (url.includes('/files?directory=downloads')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ files: mockVideos, total: 2 })
        })
      }
      if (url.includes('/banners') || url.includes('/files?directory=banners')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ banners: mockBanners, total: 2 })
        })
      }
      return Promise.resolve({ ok: true, json: async () => ({}) })
    })
  })

  it('renders correctly', async () => {
    render(<VideoProcessor apiBase={mockApiBase} />)
    
    await waitFor(() => {
      expect(screen.getByText('🎬 Обработка видео')).toBeInTheDocument()
    })
    
    expect(screen.getByText('🌟 Эффекты:')).toBeInTheDocument()
    expect(screen.getByText('✂️ Обрезка (опционально):')).toBeInTheDocument()
    expect(screen.getByText('🎨 Баннер (опционально):')).toBeInTheDocument()
  })

  it('loads videos and banners on mount', async () => {
    render(<VideoProcessor apiBase={mockApiBase} />)
    
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/files?directory=downloads')
      )
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/banners')
      )
    })
  })

  it('shows error when no video selected', async () => {
    render(<VideoProcessor apiBase={mockApiBase} />)
    
    await waitFor(() => {
      const processButton = screen.getByRole('button', { name: /Обработать/i })
      fireEvent.click(processButton)
    })
    
    await waitFor(() => {
      expect(screen.getByText(/Выбери видео/i)).toBeInTheDocument()
    })
  })

  it('validates time format', async () => {
    render(<VideoProcessor apiBase={mockApiBase} />)
    
    await waitFor(() => {
      const startInput = screen.getByPlaceholderText(/Начало/i)
      fireEvent.change(startInput, { target: { value: 'invalid' } })
      
      const processButton = screen.getByRole('button', { name: /Обработать/i })
      fireEvent.click(processButton)
    })
    
    await waitFor(() => {
      expect(screen.getByText(/Неверный формат/i)).toBeInTheDocument()
    })
  })

  it('validates end time is greater than start time', async () => {
    render(<VideoProcessor apiBase={mockApiBase} />)
    
    await waitFor(() => {
      const videoSelect = screen.getAllByRole('combobox')[0]
      fireEvent.change(videoSelect, { target: { value: 'video1.mp4' } })
      
      const startInput = screen.getByPlaceholderText(/Начало/i)
      fireEvent.change(startInput, { target: { value: '30' } })
      
      const endInput = screen.getByPlaceholderText(/Конец/i)
      fireEvent.change(endInput, { target: { value: '10' } })
      
      const processButton = screen.getByRole('button', { name: /Обработать/i })
      fireEvent.click(processButton)
    })
    
    await waitFor(() => {
      expect(screen.getByText(/Время окончания должно быть больше/i)).toBeInTheDocument()
    })
  })

  it('processes video with effects', async () => {
    global.fetch.mockImplementation((url) => {
      if (url.includes('/process')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ 
            status: 'success', 
            data: { filename: 'processed_video.mp4' } 
          })
        })
      }
      if (url.includes('/files?directory=downloads')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ files: mockVideos, total: 2 })
        })
      }
      return Promise.resolve({ ok: true, json: async () => ({}) })
    })

    render(<VideoProcessor apiBase={mockApiBase} />)
    
    await waitFor(() => {
      const videoSelect = screen.getAllByRole('combobox')[0]
      fireEvent.change(videoSelect, { target: { value: 'video1.mp4' } })
      
      const brightnessSlider = screen.getByLabelText(/Яркость/i)
      fireEvent.change(brightnessSlider, { target: { value: '0.5' } })
      
      const processButton = screen.getByRole('button', { name: /Обработать/i })
      fireEvent.click(processButton)
    })
    
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/process'),
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        })
      )
    })
  })

  it('shows success message after processing', async () => {
    global.fetch.mockImplementation((url) => {
      if (url.includes('/process')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ 
            status: 'success', 
            filename: 'processed_video.mp4' 
          })
        })
      }
      if (url.includes('/files?directory=downloads')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ files: mockVideos, total: 2 })
        })
      }
      return Promise.resolve({ ok: true, json: async () => ({}) })
    })

    render(<VideoProcessor apiBase={mockApiBase} />)
    
    await waitFor(() => {
      const videoSelect = screen.getAllByRole('combobox')[0]
      fireEvent.change(videoSelect, { target: { value: 'video1.mp4' } })
      
      const processButton = screen.getByRole('button', { name: /Обработать/i })
      fireEvent.click(processButton)
    })
    
    await waitFor(() => {
      expect(screen.getByText(/Видео обработано/i)).toBeInTheDocument()
    })
  })

  it('shows error message on processing failure', async () => {
    global.fetch.mockImplementation((url) => {
      if (url.includes('/process')) {
        return Promise.resolve({
          ok: false,
          json: async () => ({ detail: 'File not found' })
        })
      }
      if (url.includes('/files?directory=downloads')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ files: mockVideos, total: 2 })
        })
      }
      return Promise.resolve({ ok: true, json: async () => ({}) })
    })

    render(<VideoProcessor apiBase={mockApiBase} />)
    
    await waitFor(() => {
      const videoSelect = screen.getAllByRole('combobox')[0]
      fireEvent.change(videoSelect, { target: { value: 'video1.mp4' } })
      
      const processButton = screen.getByRole('button', { name: /Обработать/i })
      fireEvent.click(processButton)
    })
    
    await waitFor(() => {
      expect(screen.getByText(/Ошибка обработки/i)).toBeInTheDocument()
    })
  })

  it('normalizes API base URL correctly', async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({ status: 'success', filename: 'processed.mp4' })
    })

    render(<VideoProcessor apiBase="http://localhost:8000/api" />)
    
    await waitFor(() => {
      const videoSelect = screen.getAllByRole('combobox')[0]
      fireEvent.change(videoSelect, { target: { value: 'video1.mp4' } })
      
      const processButton = screen.getByRole('button', { name: /Обработать/i })
      fireEvent.click(processButton)
    })
    
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:8000/api/process',
        expect.any(Object)
      )
    })
  })
})
