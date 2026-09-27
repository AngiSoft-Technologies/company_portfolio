// @ts-nocheck
import React from 'react';

import HeroSlider from '../components/landing/HeroSlider';
import TestimonialSlider from '../components/landing/TestimonialSlider';
import EngagementCta from '../components/landing/EngagementCta';

import ServicesSection from '@/features/marketing/components/sections/ServicesSection';
import IndustryExpertise from '@/features/marketing/components/sections/IndustryExpertise';
import SolutionsWeDeliver from '@/features/marketing/components/sections/SolutionsWeDeliver';
import TechTrendsSection from '@/features/marketing/components/sections/TechTrendsSection';
import ProductShowcase from '@/features/marketing/components/sections/ProductShowcase';
import FeaturedInsights from '@/features/marketing/components/sections/FeaturedInsights';
import TechPlatforms from '@/features/marketing/components/sections/TechPlatforms';
import FaqSection from '@/features/marketing/components/sections/FaqSection';
import ContactSection from '@/features/marketing/components/sections/ContactSection';

const Home = () => (
    <main className="angi-home">
        <HeroSlider />
        <ServicesSection />
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
    </main>
);

export default Home;
