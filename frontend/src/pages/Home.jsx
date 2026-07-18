import React from 'react';

import HeroSlider from '../components/landing/HeroSlider';
import TestimonialSlider from '../components/landing/TestimonialSlider';
import BrandCTA from '../components/landing/BrandCTA';

import KeyFacts from '../components/sections/KeyFacts';
import ServicesSection from '../components/sections/ServicesSection';
import IndustryExpertise from '../components/sections/IndustryExpertise';
import SolutionsWeDeliver from '../components/sections/SolutionsWeDeliver';
import TechTrendsSection from '../components/sections/TechTrendsSection';
import SuccessStories from '../components/sections/SuccessStories';
import Blog from '../components/sections/Blog';
import TechPlatforms from '../components/sections/TechPlatforms';
import FaqSection from '../components/sections/FaqSection';
import ContactSection from '../components/sections/ContactSection';

const Home = () => (
    <main className="angi-home">
        <HeroSlider />
        <KeyFacts />
        <ServicesSection />
        <IndustryExpertise />
        <SolutionsWeDeliver />
        <TechTrendsSection />
        <SuccessStories />
        <BrandCTA />
        <Blog />
        <TestimonialSlider />
        <TechPlatforms />
        <FaqSection />
        <ContactSection />
    </main>
);

export default Home;
