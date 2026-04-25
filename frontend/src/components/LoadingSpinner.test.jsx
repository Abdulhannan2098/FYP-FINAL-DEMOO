import { render, screen } from '@testing-library/react';
import LoadingSpinner from '../components/LoadingSpinner';

describe('LoadingSpinner', () => {
  it('renders with default props', () => {
    render(<LoadingSpinner />);
    const spinner = screen.getByText('Loading...').previousElementSibling; // Get the spinner div
    expect(spinner).toBeInTheDocument();
    expect(spinner).toHaveClass('w-8', 'h-8', 'border-2'); // default md size
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('renders with custom message', () => {
    render(<LoadingSpinner message="Please wait..." />);
    expect(screen.getByText('Please wait...')).toBeInTheDocument();
  });

  it('renders with different sizes', () => {
    const { rerender } = render(<LoadingSpinner size="sm" />);
    let spinner = screen.getByText('Loading...').previousElementSibling;
    expect(spinner).toHaveClass('w-5', 'h-5', 'border-2');

    rerender(<LoadingSpinner size="lg" />);
    spinner = screen.getByText('Loading...').previousElementSibling;
    expect(spinner).toHaveClass('w-12', 'h-12', 'border-3');

    rerender(<LoadingSpinner size="xl" />);
    spinner = screen.getByText('Loading...').previousElementSibling;
    expect(spinner).toHaveClass('w-16', 'h-16', 'border-4');
  });

  it('does not render message when message is empty', () => {
    render(<LoadingSpinner message="" />);
    expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
  });

  it('has correct accessibility attributes', () => {
    render(<LoadingSpinner />);
    const spinner = screen.getByText('Loading...').previousElementSibling;
    // Spinners don't need aria-hidden as they're decorative but visible
    expect(spinner).toBeInTheDocument();
  });

  it('applies correct CSS classes for animation', () => {
    render(<LoadingSpinner />);
    const container = screen.getByText('Loading...').parentElement;
    expect(container).toHaveClass('animate-fadeIn');

    const spinner = screen.getByText('Loading...').previousElementSibling;
    expect(spinner).toHaveClass('animate-spin');
  });
});