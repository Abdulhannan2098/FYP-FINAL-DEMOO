// Utilities for resolving backend-hosted asset URLs (e.g. /uploads/...) in the frontend.

export const getBackendBaseUrl = () => {
	const raw = import.meta.env.VITE_API_URL || 'http://localhost:5000';
	// Many places use VITE_API_URL to point at the API; images live on the same host (without /api).
	return raw.endsWith('/api') ? raw.slice(0, -4) : raw;
};

export const resolveImageUrl = (src) => {
	if (!src) return '';

	// Already absolute or locally generated.
	if (
		typeof src === 'string' &&
		(/^https?:\/\//i.test(src) || src.startsWith('data:') || src.startsWith('blob:'))
	) {
		return src;
	}

	const base = getBackendBaseUrl();
	if (typeof src !== 'string') return '';

	// Typical stored values: /uploads/products/xxx.jpg OR uploads/products/xxx.jpg
	if (src.startsWith('/')) return `${base}${src}`;
	return `${base}/${src}`;
};
