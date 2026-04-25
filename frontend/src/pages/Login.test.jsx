import { vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Login from '../pages/Login';

// Mock the contexts
vi.mock('../context/AuthContext', () => ({
  useAuth: vi.fn(),
}));

vi.mock('../context/ToastContext', () => ({
  useToast: vi.fn(),
}));

// Mock react-router-dom
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  Eye: () => <div data-testid="eye-icon" />,
  EyeOff: () => <div data-testid="eye-off-icon" />,
}));

import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

const renderWithRouter = (component) => {
  return render(<BrowserRouter>{component}</BrowserRouter>);
};

describe('Login', () => {
  let mockLogin, mockShowToast;
  let mockUseAuth, mockUseToast;

  beforeEach(() => {
    mockLogin = vi.fn();
    mockShowToast = vi.fn();
    mockNavigate.mockClear();

    mockUseAuth = vi.fn(() => ({
      login: mockLogin,
    }));
    mockUseToast = vi.fn(() => ({
      showToast: mockShowToast,
    }));

    useAuth.mockImplementation(mockUseAuth);
    useToast.mockImplementation(mockUseToast);
  });

  it('renders login form correctly', () => {
    renderWithRouter(<Login />);

    expect(screen.getByText('Welcome Back')).toBeInTheDocument();
    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
    expect(screen.getByText(/don't have an account/i)).toBeInTheDocument();
    expect(screen.getByText(/forgot password/i)).toBeInTheDocument();
  });

  it('validates email field', async () => {
    renderWithRouter(<Login />);

    const emailInput = screen.getByLabelText(/email address/i);
    const submitButton = screen.getByRole('button', { name: /sign in/i });

    // Empty email
    fireEvent.change(emailInput, { target: { value: '' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Email is required')).toBeInTheDocument();
    });

    // Invalid email
    fireEvent.change(emailInput, { target: { value: 'invalid-email' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Please enter a valid email address')).toBeInTheDocument();
    });
  });

  it('validates password field', async () => {
    renderWithRouter(<Login />);

    const form = screen.getByTestId('login-form');
    fireEvent.submit(form);

    await waitFor(() => {
      expect(screen.getByText('Password is required')).toBeInTheDocument();
    });
  });

  it('clears field errors when user types', () => {
    renderWithRouter(<Login />);

    const form = screen.getByTestId('login-form');
    fireEvent.submit(form);

    expect(screen.getByText('Email is required')).toBeInTheDocument();

    // Type in field
    const emailInput = screen.getByLabelText(/email address/i);
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    expect(screen.queryByText('Email is required')).not.toBeInTheDocument();
  });

  it('toggles password visibility', () => {
    renderWithRouter(<Login />);

    const passwordInput = screen.getByLabelText('Password');
    const toggleButton = screen.getByRole('button', { name: /show password/i });

    // Initially password type
    expect(passwordInput).toHaveAttribute('type', 'password');

    // Click to show
    fireEvent.click(toggleButton);
    expect(passwordInput).toHaveAttribute('type', 'text');
    expect(screen.getByTestId('eye-off-icon')).toBeInTheDocument();

    // Click to hide
    fireEvent.click(toggleButton);
    expect(passwordInput).toHaveAttribute('type', 'password');
    expect(screen.getByTestId('eye-icon')).toBeInTheDocument();
  });

  it('submits form successfully and redirects customer', async () => {
    const mockUser = { id: 1, name: 'Test User', role: 'customer' };
    mockLogin.mockResolvedValue(mockUser);

    renderWithRouter(<Login />);

    const emailInput = screen.getByLabelText(/email address/i);
    const passwordInput = screen.getByLabelText('Password');
    const submitButton = screen.getByRole('button', { name: /sign in/i });

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith('test@example.com', 'password123');
      expect(mockShowToast).toHaveBeenCalledWith('Welcome back, Test User!', 'success');
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard/customer');
    });
  });

  it('redirects admin to admin dashboard', async () => {
    const mockUser = { id: 1, name: 'Admin User', role: 'admin' };
    mockLogin.mockResolvedValue(mockUser);

    renderWithRouter(<Login />);

    const emailInput = screen.getByLabelText(/email address/i);
    const passwordInput = screen.getByLabelText('Password');
    const submitButton = screen.getByRole('button', { name: /sign in/i });

    fireEvent.change(emailInput, { target: { value: 'admin@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard/admin');
    });
  });

  it('redirects vendor to vendor dashboard', async () => {
    const mockUser = { id: 1, name: 'Vendor User', role: 'vendor' };
    mockLogin.mockResolvedValue(mockUser);

    renderWithRouter(<Login />);

    const emailInput = screen.getByLabelText(/email address/i);
    const passwordInput = screen.getByLabelText('Password');
    const submitButton = screen.getByRole('button', { name: /sign in/i });

    fireEvent.change(emailInput, { target: { value: 'vendor@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard/vendor');
    });
  });

  it('handles login errors', async () => {
    const errorMessage = 'Invalid credentials';
    mockLogin.mockRejectedValue({
      response: { data: { message: errorMessage } },
    });

    renderWithRouter(<Login />);

    const emailInput = screen.getByLabelText(/email address/i);
    const passwordInput = screen.getByLabelText('Password');
    const submitButton = screen.getByRole('button', { name: /sign in/i });

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'wrongpassword' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockShowToast).toHaveBeenCalledWith(errorMessage, 'error');
    });
  });

  it('navigates to register page', () => {
    renderWithRouter(<Login />);

    const registerLink = screen.getByRole('link', { name: /register here/i });
    expect(registerLink).toHaveAttribute('href', '/register');
  });

  it('navigates to forgot password page', () => {
    renderWithRouter(<Login />);

    const forgotLink = screen.getByRole('link', { name: /forgot password/i });
    expect(forgotLink).toHaveAttribute('href', '/forgot-password');
  });
});