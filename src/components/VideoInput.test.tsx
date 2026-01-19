import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import VideoInput from './VideoInput';

describe('VideoInput Component', () => {
  const mockOnSubmit = vi.fn();

  beforeEach(() => {
    mockOnSubmit.mockClear();
  });

  it('should render input field and submit button', () => {
    render(<VideoInput onSubmit={mockOnSubmit} isLoading={false} />);

    expect(screen.getByLabelText('Video URL')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /analyze video/i })).toBeInTheDocument();
  });

  it('should validate YouTube URLs', async () => {
    render(<VideoInput onSubmit={mockOnSubmit} isLoading={false} />);

    const input = screen.getByLabelText('Video URL');
    const button = screen.getByRole('button', { name: /analyze video/i });

    // Valid YouTube URL
    fireEvent.change(input, { target: { value: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' } });
    fireEvent.click(button);

    expect(mockOnSubmit).toHaveBeenCalledWith('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
  });

  it('should validate youtu.be short URLs', async () => {
    render(<VideoInput onSubmit={mockOnSubmit} isLoading={false} />);

    const input = screen.getByLabelText('Video URL');
    const button = screen.getByRole('button', { name: /analyze video/i });

    fireEvent.change(input, { target: { value: 'https://youtu.be/dQw4w9WgXcQ' } });
    fireEvent.click(button);

    expect(mockOnSubmit).toHaveBeenCalledWith('https://youtu.be/dQw4w9WgXcQ');
  });

  it('should validate direct video URLs', async () => {
    render(<VideoInput onSubmit={mockOnSubmit} isLoading={false} />);

    const input = screen.getByLabelText('Video URL');
    const button = screen.getByRole('button', { name: /analyze video/i });

    fireEvent.change(input, { target: { value: 'https://example.com/video.mp4' } });
    fireEvent.click(button);

    expect(mockOnSubmit).toHaveBeenCalledWith('https://example.com/video.mp4');
  });

  it('should show error for empty input', async () => {
    render(<VideoInput onSubmit={mockOnSubmit} isLoading={false} />);

    const button = screen.getByRole('button', { name: /analyze video/i });
    fireEvent.click(button);

    expect(screen.getByText('Please enter a video URL')).toBeInTheDocument();
    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  it('should show error for invalid URL', async () => {
    render(<VideoInput onSubmit={mockOnSubmit} isLoading={false} />);

    const input = screen.getByLabelText('Video URL');
    const button = screen.getByRole('button', { name: /analyze video/i });

    // Use a valid URL format that's not a video URL (passes HTML5 url validation, fails video pattern)
    fireEvent.change(input, { target: { value: 'https://example.com/not-a-video' } });
    fireEvent.click(button);

    // The error message from VideoInput.tsx for invalid video URLs
    expect(screen.getByText(/please enter a valid youtube url or direct video file url/i)).toBeInTheDocument();
    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  it('should disable input and button when loading', () => {
    render(<VideoInput onSubmit={mockOnSubmit} isLoading={true} />);

    expect(screen.getByLabelText('Video URL')).toBeDisabled();
    expect(screen.getByRole('button')).toBeDisabled();
    expect(screen.getByText('Analyzing...')).toBeInTheDocument();
  });

  it('should show loading message when analyzing', () => {
    render(<VideoInput onSubmit={mockOnSubmit} isLoading={true} />);

    expect(screen.getByText(/this may take 30-60 seconds/i)).toBeInTheDocument();
  });
});
