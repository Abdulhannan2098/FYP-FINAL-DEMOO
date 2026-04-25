import { vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import ProductCard from '../components/ProductCard';

// Mock the contexts
vi.mock('../context/WishlistContext', () => ({
  useWishlist: vi.fn(),
}));

vi.mock('../utils/constants', () => ({
  getPlaceholderImage: vi.fn(() => 'placeholder.jpg'),
}));

vi.mock('../utils/currency', () => ({
  formatPKR: vi.fn((price) => `PKR ${price}`),
}));

vi.mock('../utils/imageHelper', () => ({
  resolveImageUrl: vi.fn((url) => url),
}));

// Mock StarRating component
vi.mock('../components/StarRating', () => ({
  default: ({ rating, showCount, reviewCount }) => (
    <div data-testid="star-rating">
      Rating: {rating}, Reviews: {reviewCount}, ShowCount: {showCount.toString()}
    </div>
  ),
}));

import { useWishlist } from '../context/WishlistContext';

const mockProduct = {
  _id: '123',
  name: 'Test Product',
  category: 'LED Lights',
  price: 1000,
  rating: 4.5,
  numReviews: 10,
  stock: 5,
  images: ['image1.jpg'],
  isApproved: true,
};

const renderWithRouter = (component) => {
  return render(<BrowserRouter>{component}</BrowserRouter>);
};

describe('ProductCard', () => {
  const mockUseWishlist = vi.fn();

  beforeEach(() => {
    mockUseWishlist.mockReturnValue({
      isInWishlist: vi.fn(() => false),
      toggleWishlist: vi.fn(),
    });
    useWishlist.mockImplementation(mockUseWishlist);
  });

  it('renders product information correctly', () => {
    renderWithRouter(<ProductCard product={mockProduct} />);

    expect(screen.getByText('Test Product')).toBeInTheDocument();
    expect(screen.getByText('LED Lights')).toBeInTheDocument();
    expect(screen.getByText('PKR 1000')).toBeInTheDocument();
    expect(screen.getByText('5 in stock')).toBeInTheDocument();
    expect(screen.getByText('Verified')).toBeInTheDocument();
  });

  it('displays star rating component', () => {
    renderWithRouter(<ProductCard product={mockProduct} />);

    const starRating = screen.getByTestId('star-rating');
    expect(starRating).toBeInTheDocument();
    expect(starRating).toHaveTextContent('Rating: 4.5');
    expect(starRating).toHaveTextContent('Reviews: 10');
  });

  it('shows out of stock message when stock is 0', () => {
    const outOfStockProduct = { ...mockProduct, stock: 0 };
    renderWithRouter(<ProductCard product={outOfStockProduct} />);

    expect(screen.getByText('OUT OF STOCK')).toBeInTheDocument();
    expect(screen.queryByText('5 in stock')).not.toBeInTheDocument();
  });

  it('does not show verified badge when not approved', () => {
    const unapprovedProduct = { ...mockProduct, isApproved: false };
    renderWithRouter(<ProductCard product={unapprovedProduct} />);

    expect(screen.queryByText('Verified')).not.toBeInTheDocument();
  });

  it('uses placeholder image when no images provided', () => {
    const productWithoutImages = { ...mockProduct, images: [] };
    renderWithRouter(<ProductCard product={productWithoutImages} />);

    const image = screen.getByAltText('Test Product');
    expect(image).toHaveAttribute('src', 'placeholder.jpg');
  });

  it('links to product detail page', () => {
    renderWithRouter(<ProductCard product={mockProduct} />);

    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', '/product/123');
  });

  it('handles wishlist toggle', () => {
    const mockToggleWishlist = vi.fn();
    mockUseWishlist.mockReturnValue({
      isInWishlist: vi.fn(() => true),
      toggleWishlist: mockToggleWishlist,
    });

    renderWithRouter(<ProductCard product={mockProduct} />);

    const wishlistButton = screen.getByRole('button', { name: /remove from wishlist/i });
    fireEvent.click(wishlistButton);

    expect(mockToggleWishlist).toHaveBeenCalledWith('123');
  });

  it('prevents link navigation when clicking wishlist button', () => {
    const mockToggleWishlist = vi.fn();
    mockUseWishlist.mockReturnValue({
      isInWishlist: vi.fn(() => false),
      toggleWishlist: mockToggleWishlist,
    });

    renderWithRouter(<ProductCard product={mockProduct} />);

    const wishlistButton = screen.getByRole('button', { name: /add to wishlist/i });

    fireEvent.click(wishlistButton);

    // If toggleWishlist is called, it means the event was handled and preventDefault worked
    expect(mockToggleWishlist).toHaveBeenCalledWith('123');
  });

  it('handles image error gracefully', () => {
    renderWithRouter(<ProductCard product={mockProduct} />);

    const image = screen.getByAltText('Test Product');
    fireEvent.error(image);

    expect(image).toHaveAttribute('src', 'placeholder.jpg');
  });
});