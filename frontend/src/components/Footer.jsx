import { useAuth } from '../context/AuthContext.jsx';

const Footer = () => {
  const { user } = useAuth();

  return (
    <footer className="bg-secondary-900 border-t border-surface-light py-12 mt-16">
      <div className="container-custom">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center space-x-3 mb-4">
            <div className="w-10 h-10 bg-gradient-to-br from-primary-800 to-primary-700 rounded-lg flex items-center justify-center shadow-neon-red">
              <svg className="w-7 h-7 text-white" viewBox="0 0 24 24" fill="currentColor">
                {/* Sports car silhouette - sleek and aerodynamic */}
                <path d="M5 11l1.5-4.5h11L19 11m-1.5 8a1.5 1.5 0 01-1.5-1.5 1.5 1.5 0 011.5-1.5 1.5 1.5 0 011.5 1.5 1.5 1.5 0 01-1.5 1.5m-11 0A1.5 1.5 0 015 17.5 1.5 1.5 0 016.5 16 1.5 1.5 0 018 17.5 1.5 1.5 0 016.5 19M20 8h-2l-1.5-4.5h-9L6 8H4c-1.11 0-2 .89-2 2v8c0 .55.45 1 1 1h1a2.5 2.5 0 002.5-2.5A2.5 2.5 0 009 19h6a2.5 2.5 0 002.5-2.5 2.5 2.5 0 002.5 2.5h1c.55 0 1-.45 1-1v-8c0-1.11-.89-2-2-2z"/>
                {/* Windshield detail */}
                <path d="M7.5 8L8.5 5h7l1 3z" fillOpacity="0.3"/>
              </svg>
            </div>
            <h2 className="font-display text-2xl font-bold text-text-primary">AutoSphere</h2>
          </div>
          <p className="text-body max-w-md mx-auto">Your Automotive Aftermarket Marketplace</p>
        </div>

        <div className="flex flex-wrap justify-center gap-8 mb-8">
          <a href="/products" className="text-sm font-medium text-text-secondary hover:text-primary-500 transition-colors duration-200">
            Products
          </a>
          <a href="/contact" className="text-sm font-medium text-text-secondary hover:text-primary-500 transition-colors duration-200">
            Contact
          </a>
          {!user && (
            <a href="/register?role=vendor" className="text-sm font-medium text-text-secondary hover:text-primary-500 transition-colors duration-200">
              Sell on AutoSphere
            </a>
          )}
        </div>

        <div className="pt-8 border-t border-surface-light text-center">
          <p className="text-muted">© 2025 AutoSphere. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
