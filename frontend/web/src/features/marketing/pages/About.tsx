// @ts-nocheck
import React from 'react';
import { useAboutPage } from '@/hooks/marketing/useAboutPage';
import '@/styles/about-page.css';
import '@/styles/marketing/about.css';

/*
|--------------------------------------------------------------------------
| Reference-aligned About page sections
|--------------------------------------------------------------------------
*/

import AboutHeroSlider from '../components/about/AboutHeroSlider';
import AboutNumberStory from '../components/about/AboutNumberStory';
import AboutGeographyMap from '../components/about/AboutGeographyMap';
import AboutSustainability from '../components/about/AboutSustainability';
import AboutCollaboration from '../components/about/AboutCollaboration';
import AboutHighlightsSlider from '../components/about/AboutHighlightsSlider';
import AboutIndustriesGrid from '../components/about/AboutIndustriesGrid';
import AboutClientsSlider from '../components/about/AboutClientsSlider';
import AboutTestimonialsSlider from '../components/about/AboutTestimonialsSlider';
import AboutServiceMap from '../components/about/AboutServiceMap';
import AboutTransparency from '../components/about/AboutTransparency';
import AboutPartnerships from '../components/about/AboutPartnerships';
import AboutSolutionTypes from '../components/about/AboutSolutionTypes';
import AboutTechnologies from '../components/about/AboutTechnologies';
import AboutSpecializedCapabilities from '../components/about/AboutSpecializedCapabilities';
import AboutWhyGuarantee from '../components/about/AboutWhyGuarantee';
import AboutPricing from '../components/about/AboutPricing';
import AboutPricingQuotation from '../components/about/AboutPricingQuotation';
import AboutFinalCTA from '../components/about/AboutFinalCTA';

/*
|--------------------------------------------------------------------------
| Shared pending and unavailable states
|--------------------------------------------------------------------------
*/

const AboutPageSkeleton = () => (
  <main
    id="about-page-loading"
    className="min-h-screen overflow-x-clip bg-[var(--bg-primary)] text-[var(--text-primary)]"
    aria-busy="true"
  >
    <section className="min-h-[640px] border-b border-[var(--border-light)]">
      <div className="container grid min-h-[640px] items-center gap-10 py-16 lg:grid-cols-[0.4fr_0.6fr]">
        <div>
          <div className="h-4 w-36 animate-pulse bg-[var(--surface-hover)] motion-reduce:animate-none" />
          <div className="mt-6 h-14 max-w-lg animate-pulse bg-[var(--surface-hover)] motion-reduce:animate-none" />
          <div className="mt-3 h-14 max-w-md animate-pulse bg-[var(--surface-hover)] motion-reduce:animate-none" />
          <div className="mt-8 h-5 max-w-xl animate-pulse bg-[var(--surface-hover)] motion-reduce:animate-none" />
          <div className="mt-3 h-5 max-w-lg animate-pulse bg-[var(--surface-hover)] motion-reduce:animate-none" />
          <div className="mt-8 h-12 w-52 animate-pulse bg-[color-mix(in_srgb,var(--color-primary)_30%,transparent)] motion-reduce:animate-none" />
        </div>

        <div className="h-[440px] animate-pulse bg-[var(--surface-hover)] motion-reduce:animate-none" />
      </div>
    </section>

    {Array.from({ length: 4 }).map((_, index) => (
      <section
        key={index}
        className="border-b border-[var(--border-light)] py-16 md:py-20"
      >
        <div className="container">
          <div className="mx-auto h-10 w-72 animate-pulse bg-[var(--surface-hover)] motion-reduce:animate-none" />
          <div className="mx-auto mt-4 h-5 max-w-2xl animate-pulse bg-[var(--surface-hover)] motion-reduce:animate-none" />

          <div className="mt-12 grid gap-8 lg:grid-cols-2">
            <div className="h-80 animate-pulse bg-[var(--surface-hover)] motion-reduce:animate-none" />
            <div className="h-80 animate-pulse bg-[var(--surface-hover)] motion-reduce:animate-none" />
          </div>
        </div>
      </section>
    ))}
  </main>
);

const AboutPageError = ({ message, onRetry }) => (
  <main
    id="about-page-error"
    className="flex min-h-[70vh] items-center overflow-x-clip bg-[var(--bg-primary)] px-6 text-[var(--text-primary)]"
  >
    <div className="container text-center">
      <p className="text-sm font-bold uppercase tracking-[0.2em] text-[var(--brand-accent-ink)]">
        AngiSoft Technologies
      </p>

      <h1 className="mt-4 text-balance text-3xl font-black md:text-5xl">
        The About page could not be loaded.
      </h1>

      <p className="mx-auto mt-5 max-w-xl text-pretty leading-7 text-[var(--text-secondary)]">
        {message || 'Please try again in a moment.'}
      </p>

      {typeof onRetry === 'function' && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-8 min-h-11 bg-[var(--color-primary)] px-7 py-3.5 font-bold text-white transition duration-150 hover:bg-[var(--color-primary-light)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)]"
        >
          Try Again
        </button>
      )}
    </div>
  </main>
);

/*
|--------------------------------------------------------------------------
| About page
|--------------------------------------------------------------------------
|
| This composer deliberately follows the reference company's full editorial
| sequence while retaining AngiSoft's dark design system and truthful content.
|
*/

const About = () => {
  const {
    about,
    testimonials,
    clientStats,
    clientHighlights,
    loading,
    error,
    refetch,
  } = useAboutPage();

  if (loading) {
    return <AboutPageSkeleton />;
  }

  /*
   * The hook provides truthful bundled defaults during an API failure and
   * still reports the error for diagnostics. The page keeps rendering those
   * defaults with a slim retry banner instead of blocking the whole page.
   */

  if (error && !about) {
    return (
      <AboutPageError
        message={error}
        onRetry={refetch}
      />
    );
  }

  if (!about) {
    return (
      <AboutPageError
        message=""
        onRetry={refetch}
      />
    );
  }

  return (
    <main
      id="about-company-page"
      className="min-h-screen overflow-x-clip bg-[var(--bg-primary)] text-[var(--text-primary)]"
    >
      {error && (
        <div
          role="status"
          className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 border-b border-[var(--border-light)] bg-[color-mix(in_srgb,var(--color-warning)_10%,transparent)] px-4 py-2.5 text-sm text-[var(--text-secondary)]"
        >
          <span>Live content is temporarily unavailable — showing saved content.</span>
          {typeof refetch === 'function' && (
            <button
              type="button"
              onClick={refetch}
              className="min-h-11 px-4 font-bold text-[var(--brand-accent-ink)] underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)]"
            >
              Try again
            </button>
          )}
        </div>
      )}

      {/*
      |--------------------------------------------------------------------------
      | 01. About AngiSoft — Your Partner for Digital Success
      |--------------------------------------------------------------------------
      |
      | Reference behaviour:
      | - company introduction on the left
      | - leadership/company image slider on the right
      | - introductory CTA
      |
      */}

      <AboutHeroSlider
        slides={about.heroSlides}
        intro={about.intro}
      />

      {/*
      |--------------------------------------------------------------------------
      | 02. AngiSoft in Numbers
      |--------------------------------------------------------------------------
      |
      | Reference behaviour:
      | - top collected metric row
      | - animated number stories
      | - large images
      | - split slide transitions
      |
      */}

      <AboutNumberStory
        stories={about.numberStories}
        title={about.numbersHeading?.title || 'AngiSoft in Numbers'}
        description={
          about.numbersHeading?.description ||
          'A growing technology company measured by real work, original products and practical impact.'
        }
      />

     

      {/*
      |--------------------------------------------------------------------------
      | 04. Our Geography
      |--------------------------------------------------------------------------
      |
      | Reference behaviour:
      | - centered heading and introduction
      | - three regional summary columns
      | - wide labelled map
      |
      */}

      <AboutGeographyMap
        content={about.geography}
      />

      {/*
      |--------------------------------------------------------------------------
      | 05. Delivery Reach and Operational Benefits
      |--------------------------------------------------------------------------
      |
      | Reference equivalent:
      | international delivery paragraph followed by a capability list.
      |
      */}

      

      {/*
      |--------------------------------------------------------------------------
      | 06. Sustainability and Social Responsibility
      |--------------------------------------------------------------------------
      |
      | AngiSoft equivalent:
      | ethical technology, digital inclusion, employee development,
      | community empowerment and responsible business practices.
      |
      */}

      <AboutSustainability
        content={about.sustainability}
      />

      {/*
      |--------------------------------------------------------------------------
      | 07. How We Collaborate
      |--------------------------------------------------------------------------
      |
      | Reference behaviour:
      | - three columns
      | - custom image/illustration in every column
      | - title and linked bullet list
      |
      */}

      <AboutCollaboration
        content={about.collaboration}
      />

      {/*
      |--------------------------------------------------------------------------
      | 08. AngiSoft's Highlights
      |--------------------------------------------------------------------------
      |
      | Reference behaviour:
      | - image-based history slider
      | - synchronized year rail
      | - animated milestone transitions
      |
      */}

      <AboutHighlightsSlider
        items={about.timeline}
        heading={about.timelineHeading}
      />

      {/*
      |--------------------------------------------------------------------------
      | 09. Let's Build the Future Together
      |--------------------------------------------------------------------------
      |
      | Full-width transition banner placed directly after the timeline.
      |
      */}


      {/*
      |--------------------------------------------------------------------------
      | 10. Industries AngiSoft Serves
      |--------------------------------------------------------------------------
      |
      | Reference behaviour:
      | - industry-specific images
      | - responsive multi-column grid
      | - titles layered over or associated with imagery
      |
      */}

      <AboutIndustriesGrid
        industries={about.industries}
        heading={about.industriesHeading}
      />

      {/*
      |--------------------------------------------------------------------------
      | 11. Our Clients
      |--------------------------------------------------------------------------
      |
      | Reference behaviour:
      | - supporting client relationship statistic
      | - client-logo slider/grid
      |
      */}

      <AboutClientsSlider
        clients={about.clients}
        heading={about.clientsHeading}
        clientStats={clientStats}
        clientHighlights={clientHighlights}
      />

      {/*
      |--------------------------------------------------------------------------
      | 12. What Our Clients Say
      |--------------------------------------------------------------------------
      |
      | Reference behaviour:
      | - client/company media
      | - rating
      | - quotation
      | - reviewer identity
      | - navigation
      |
      */}

      <AboutTestimonialsSlider
        testimonials={testimonials}
        heading={about.testimonialsHeading}
      />

      {/*
      |--------------------------------------------------------------------------
      | 13. Our Service Map
      |--------------------------------------------------------------------------
      |
      | IT consulting, software development, testing, support,
      | data, security and infrastructure equivalents.
      |
      */}

      <AboutServiceMap
        content={about.serviceMap}
      />

      {/*
      |--------------------------------------------------------------------------
      | 14. Building Trust with Transparency
      |--------------------------------------------------------------------------
      |
      | Long-form editorial section explaining AngiSoft's evidence-based,
      | transparent way of working.
      |
      */}

      <AboutTransparency
        content={about.transparency}
      />

      {/*
      |--------------------------------------------------------------------------
      | 15. Partnerships and Recognitions
      |--------------------------------------------------------------------------
      |
      | Only real AngiSoft partnerships, memberships, certificates or
      | recognitions may appear here.
      |
      */}

      <AboutPartnerships
        content={about.partnerships}
      />

      {/*
      |--------------------------------------------------------------------------
      | 16. Solutions We Cover
      |--------------------------------------------------------------------------
      |
      | Reference behaviour:
      | - broad, categorized solution list
      | - dense but easy-to-scan layout
      |
      */}

      <AboutSolutionTypes
        content={about.solutionTypes}
      />

      {/*
      |--------------------------------------------------------------------------
      | 17. Capabilities and Technological Expertise
      |--------------------------------------------------------------------------
      |
      | Reference behaviour:
      | - grouped technology families
      | - categories, subcategories and technologies
      | - expandable/collapsible presentation where useful
      |
      */}

      <AboutTechnologies
        content={about.technologies}
      />

      {/*
      |--------------------------------------------------------------------------
      | 18. Specialized Technology Capabilities
      |--------------------------------------------------------------------------
      |
      | AI, data science, big data, IoT, computer vision,
      | AR, VR, blockchain, and other genuine AngiSoft capabilities.
      |
      */}

      <AboutSpecializedCapabilities
        content={about.specializedCapabilities}
      />

      {/*
      |--------------------------------------------------------------------------
      | 19. What We Do to Guarantee Project Success
      |--------------------------------------------------------------------------
      |
      | Reference behaviour:
      | - introductory editorial copy
      | - organizational/process explanation
      | - detailed expandable practice list
      |
      */}

      <AboutWhyGuarantee
        content={about.whyGuarantee}
      />

      {/*
      |--------------------------------------------------------------------------
      | 20. Our Pricing Policy
      |--------------------------------------------------------------------------
      |
      | Reference behaviour:
      | - pricing-model cards
      | - explanatory copy
      | - project-cost CTA
      |
      */}

      <AboutPricing
        pricing={about.pricing}
      />

      {/*
      |--------------------------------------------------------------------------
      | 21. Leadership Pricing Quotation
      |--------------------------------------------------------------------------
      |
      | Reference equivalent:
      | executive photo, role, long quotation and supporting investment list.
      |
      */}

      <AboutPricingQuotation
        content={about.pricingQuotation}
      />

      {/*
      |--------------------------------------------------------------------------
      | 22. Final CTA
      |--------------------------------------------------------------------------
      |
      | AngiSoft-specific closing invitation.
      |
      */}
      <AboutFinalCTA
        content={about.cta}
      />
    </main>
  );
};

export default About;
