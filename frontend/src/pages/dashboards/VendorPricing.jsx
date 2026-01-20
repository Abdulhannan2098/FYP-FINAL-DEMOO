import { VENDOR_PRICING_PLANS } from '../../utils/vendorPricingPlans';

const VendorPricing = () => {
  return (
    <div>
      <div className="mb-8">
        <h2 className="text-2xl font-display font-bold text-text-primary">Pricing</h2>
        <p className="text-text-secondary mt-1">
          Upgrade to unlock AR previews and grow faster.
        </p>
      </div>

      <div className="bg-surface border border-surface-light rounded-xl p-6 mb-8 shadow-card">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <p className="text-sm text-text-tertiary">AR Advantage</p>
            <p className="text-text-secondary">
              Vendors with AR previews build trust faster and reduce return risk by letting customers see fit and style before buying.
            </p>
          </div>
          <div className="md:text-right">
            <span className="badge badge-info">AR Enabled</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {VENDOR_PRICING_PLANS.map((plan) => {
          const cardClasses = plan.highlight
            ? 'bg-surface border-2 border-primary-500/50 rounded-xl shadow-card-hover p-6 transform transition-all duration-300'
            : 'card';

          const buttonClass =
            plan.ctaVariant === 'primary' ? 'btn-primary w-full text-center' : 'btn-secondary w-full text-center';

          return (
            <div key={plan.id} className={cardClasses}>
              <div className="flex items-start justify-between gap-3 mb-5">
                <div>
                  <h3 className="text-xl font-display font-bold text-text-primary">{plan.name}</h3>
                  <p className="text-text-tertiary text-sm mt-1">Vendor subscription</p>
                </div>

                {plan.badge && (
                  <span className="badge badge-warning">{plan.badge}</span>
                )}
              </div>

              <div className="mb-5">
                <div className="flex items-end gap-2">
                  <p className="text-4xl font-display font-bold text-text-primary">Rs {plan.monthlyPrice}</p>
                  <p className="text-text-tertiary text-sm mb-1">/ month</p>
                </div>
                {(plan.priceLabel || plan.cadence) && (
                  <p className="text-text-tertiary text-sm mt-1">
                    {[plan.priceLabel, plan.cadence].filter(Boolean).join(' ')}
                  </p>
                )}
              </div>

              <ul className="space-y-3 mb-6">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-3 text-text-secondary text-sm">
                    <span className="mt-1 w-2 h-2 rounded-full bg-primary-500 flex-shrink-0" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              <button type="button" className={buttonClass}>
                {plan.ctaLabel}
              </button>

              {plan.highlight && (
                <p className="text-xs text-text-tertiary mt-3">
                  Recommended for vendors who want AR previews without going all-in.
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default VendorPricing;
