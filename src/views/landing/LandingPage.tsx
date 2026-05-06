import { StripesBackground } from '@/shared/ui';
import { LandingCta } from './ui/LandingCta';
import { LandingFeatures } from './ui/LandingFeatures';
import { LandingFooter } from './ui/LandingFooter';
import { LandingHero } from './ui/LandingHero';
import { LandingHowItWorks } from './ui/LandingHowItWorks';
import { LandingScreenshots } from './ui/LandingScreenshots';

const APP_JSON_LD = {
  '@context': 'https://schema.org',
  '@type': 'WebApplication',
  name: 'Calorietje',
  url: 'https://calorietje.nl/',
  description:
    'Calorieën tellen via een foto van je maaltijd of handmatig met de Nederlandse NEVO-database.',
  applicationCategory: 'HealthApplication',
  operatingSystem: 'Web',
  inLanguage: 'nl-NL',
  isAccessibleForFree: true,
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'EUR',
  },
};

export function LandingPage() {
  return (
    <main className="relative min-h-dvh overflow-hidden">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(APP_JSON_LD) }}
      />
      <StripesBackground />
      <div className="relative">
        <LandingHero />
        <LandingFeatures />
        <LandingScreenshots />
        <LandingHowItWorks />
        <LandingCta />
        <LandingFooter />
      </div>
    </main>
  );
}
