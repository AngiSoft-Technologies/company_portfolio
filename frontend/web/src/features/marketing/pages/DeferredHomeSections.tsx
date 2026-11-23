// @ts-nocheck
import React from 'react';

import IndustryExpertise from '@/features/marketing/components/sections/IndustryExpertise';
import SolutionsWeDeliver from '@/features/marketing/components/sections/SolutionsWeDeliver';
import TechTrendsSection from '@/features/marketing/components/sections/TechTrendsSection';
import ProductShowcase from '@/features/marketing/components/sections/ProductShowcase';
import EngagementCta from '@/features/marketing/components/landing/EngagementCta';
import FeaturedInsights from '@/features/marketing/components/sections/FeaturedInsights';
import TestimonialSlider from '@/features/marketing/components/landing/TestimonialSlider';
import TechPlatforms from '@/features/marketing/components/sections/TechPlatforms';
import FaqSection from '@/features/marketing/components/sections/FaqSection';
import ContactSection from '@/features/marketing/components/sections/ContactSection';

// Tailwind utilities for these sections live in a separate chunk, requested
// with this module only when the user approaches the first deferred section.
import '@/styles/tailwind-home-deferred.css';

const DeferredHomeSections = () => (
  <>
    <IndustryExpertise />
    <SolutionsWeDeliver />
    <TechTrendsSection />
    <ProductShowcase />
    <EngagementCta />
    <FeaturedInsights />
    <TestimonialSlider />
    <TechPlatforms />
    <FaqSection />
    <ContactSection />
  </>
);

export default DeferredHomeSections;
