import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import FileManager from '../components/FileManager'

describe('FileManager Component', () => {
  const mockApiBase = 'http://localhost:8000'
  
  const mockDownloads = [
    { name: 'download1.mp4', size: 10485760 },
    { name: 'download2.mp4', size: 20971520 },
  ]
  
  const mockOutputs = [
    { name: 'output1.mp4', size: 15728640 },
  ]

  beforeEach(() => {
    vi.clearAllMocks()
    
    global.fetch.mockImplementation((url) => {
      if (url.includes('/files?directory=downloads')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ files: mockDownloads, total: 2 })
        })
      }
      if (url.includes('/files?directory=outputs')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ files: mockOutputs, total: 1 })
        })
      }
      if (url.includes('/files/')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ status: 'success' })
        })
      }
      return Promise.resolve({ ok: true, json: async () => ({}) })
    })
  })

  it('renders correctly', async () => {
    render(<FileManager apiBase={mockApiBase} />)
    
    await waitFor(() => {
      expect(screen.getByText('📁 Файловый менеджер')).toBeInTheDocument()
    })
    
    expect(screen.getByText('📥 Downloads (2)')).toBeInTheDocument()
    expect(screen.getByText('📤 Outputs (1)')).toBeInTheDocument()
  })

  it('loads files on mount', async () => {
    render(<FileManager apiBase={mockApiBase} />)
    
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/files?directory=downloads'),
        expect.objectContaining({ cache: 'no-store' })
      )
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/files?directory=outputs'),
        expect.objectContaining({ cache: 'no-store' })
      )
    })
  })

  it('shows files in downloads tab', async () => {
    render(<FileManager apiBase={mockApiBase} />)
    
    await waitFor(() => {
      expect(screen.getByText('download1.mp4')).toBeInTheDocument()
      expect(screen.getByText('download2.mp4')).toBeInTheDocument()
    })
  })

  it('switches between tabs', async () => {
    render(<FileManager apiBase={mockApiBase} />)
    
    await waitFor(() => {
      expect(screen.getByText('download1.mp4')).toBeInTheDocument()
    })
    
    const outputsTab = screen.getByText('📤 Outputs (1)')
    fireEvent.click(outputsTab)
    
    await waitFor(() => {
      expect(screen.getByText('output1.mp4')).toBeInTheDocument()
    })
  })

  it('selects a file when clicked', async () => {
    const onFileSelected = vi.fn()
    
    render(<FileManager apiBase={mockApiBase} onFileSelected={onFileSelected} />)
    
    await waitFor(() => {
      const fileElement = screen.getByText('download1.mp4')
      fireEvent.click(fileElement)
    })
    
    await waitFor(() => {
      expect(onFileSelected).toHaveBeenCalledWith('download1.mp4')
    })
  })

  it('deletes a file', async () => {
    window.confirm = vi.fn(() => true)
    
    render(<FileManager apiBase={mockApiBase} />)
    
    await waitFor(() => {
      const deleteButton = screen.getAllByTitle('Удалить')[0]
      fireEvent.click(deleteButton)
    })
    
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/files/download1.mp4'),
        expect.objectContaining({ method: 'DELETE' })
      )
    })
  })

  it('refreshes files when refresh button clicked', async () => {
    render(<FileManager apiBase={mockApiBase} />)
    
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(2)
    })
    
    const refreshButton = screen.getByRole('button', { name: /🔄/ })
    fireEvent.click(refreshButton)
    
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(4)
    })
  })

  it('shows empty state when no files', async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({ files: [], total: 0 })
    })

    render(<FileManager apiBase={mockApiBase} />)
    
    await waitFor(() => {
      expect(screen.getByText('📭 Нет файлов в этой папке')).toBeInTheDocument()
    })
  })

  it('shows error message on load failure', async () => {
    global.fetch.mockRejectedValueOnce(new Error('Network error'))

    render(<FileManager apiBase={mockApiBase} />)
    
    await waitFor(() => {
      expect(screen.getByText(/Ошибка загрузки/i)).toBeInTheDocument()
    })
  })

  it('displays file size in MB', async () => {
    render(<FileManager apiBase={mockApiBase} />)
    
    await waitFor(() => {
      expect(screen.getByText('10.0 MB')).toBeInTheDocument()
      expect(screen.getByText('20.0 MB')).toBeInTheDocument()
    })
  })

  it('calls onFilesRefresh with loaded files', async () => {
    const onFilesRefresh = vi.fn()
    
    render(<FileManager apiBase={mockApiBase} onFilesRefresh={onFilesRefresh} />)
    
    await waitFor(() => {
      expect(onFilesRefresh).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ name: 'download1.mp4' }),
          expect.objectContaining({ name: 'output1.mp4' }),
        ])
      )
    })
  })
})
