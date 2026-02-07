import Hero from "../components/sections/Hero";
import About from "../components/sections/About";
import Projects from "../components/sections/Projects";
import Contact from "../components/sections/Contacts";
import Services from "../components/sections/Services";
import Staff from "../components/sections/Staff";
import Testimonials from "../components/sections/Testimonials";
import Blog from "../components/sections/Blog";
import FaqSection from "../components/sections/FaqSection";

const Home = () => {
  return (
    <>
      <Hero />
      <About />
      <Services />
      <Projects />
      <Staff />
      <Blog />
      <Testimonials />
      <FaqSection />
      <Contact />
    </>
  );
};

export default Home;