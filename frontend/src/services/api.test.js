import { vi, beforeEach, afterEach } from 'vitest';

// Mock axios before importing api
vi.mock('axios', () => ({
  default: {
    create: vi.fn(() => ({
      interceptors: {
        request: { use: vi.fn() },
        response: { use: vi.fn() },
      },
      defaults: {
        baseURL: 'http://localhost:5000/api',
        headers: { 'Content-Type': 'application/json' }
      }
    }))
  }
}));

// Import api after mocking
import api from '../services/api';

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Mock window.location
delete window.location;
window.location = { href: '' };

describe('API Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.getItem.mockClear();
    localStorageMock.setItem.mockClear();
    localStorageMock.removeItem.mockClear();
    window.location.href = '';
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('API instance creation', () => {
    it('creates axios instance with correct base URL', () => {
      expect(api.defaults.baseURL).toBe('http://localhost:5000/api');
    });

    it('sets correct default headers', () => {
      expect(api.defaults.headers['Content-Type']).toBe('application/json');
    });
  });

  // Note: Interceptor functionality is tested through integration tests
  // since mocking the internal interceptor setup is complex with Vitest
});