import { Link } from 'react-router-dom';
import { Button, Card, Hero, Section } from '@angisoft/ui';
import { PRICING_TIERS } from '@/lib/constants';

interface PricingTier {
  name: string;
  price: string;
  period: string;
  features: readonly string[];
  highlighted?: boolean;
}

const tiers: PricingTier[] = [...PRICING_TIERS];

export default function Pricing() {
  return (
    <>
      <Hero
        badge="Pricing"
        title="Simple, transparent pricing"
        subtitle="Pick the engagement that fits your stage. Every plan starts with a scoping call and a clear deliverables."
      />

      <Section>
        <div className="grid gap-6 lg:grid-cols-3">
          {tiers.map((tier) => (
            <Card
              key={tier.name}
              className={`relative p-8 ${
                tier.highlighted
                  ? 'border-2 border-[#0875FF] shadow-lg'
                  : 'border border-[var(--border)]'
              }`}
            >
              {tier.highlighted ? (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-[#0875FF] px-4 py-1 text-xs font-semibold text-white">
                  Most popular
                </span>
              ) : null}
              <h3 className="text-lg font-semibold text-[var(--text-primary)]">{tier.name}</h3>
              <div className="mt-3 flex items-baseline gap-1">
                <span className="text-4xl font-extrabold text-[var(--text-primary)]">{tier.price}</span>
                <span className="text-sm text-[var(--text-muted)]">{tier.period}</span>
              </div>
              <ul className="mt-6 flex flex-col gap-3">
                {tier.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2 text-sm text-[var(--text-secondary)]">
                    <span className="mt-0.5 text-[#0875FF]">✓</span>
                    {feature}
                  </li>
                ))}
              </ul>
              <Link to="/contact" className="mt-8 block">
                <Button variant={tier.highlighted ? 'primary' : 'outline'} className="w-full">
                  Get started
                </Button>
              </Link>
            </Card>
          ))}
        </div>
      </Section>

      <Section className="bg-[var(--bg-secondary)]">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-[var(--text-primary)]">
            Need something custom?
          </h2>
          <p className="mt-3 text-lg text-[var(--text-muted)]">
            Every business is different. Tell us what you need and we'll scope it together.
          </p>
          <div className="mt-6 flex justify-center">
            <Link to="/contact">
              <Button size="lg">Request a quote</Button>
            </Link>
          </div>
        </div>
      </Section>
    </>
  );
}