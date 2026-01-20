import Hero from "../components/sections/Hero";
import About from "../components/sections/About";
import Skills from "../components/sections/Skills";
import Projects from "../components/sections/Projects";
import Contact from "../components/sections/Contacts";
import Services from "../components/sections/Services";
import Staff from "../components/sections/Staff";
import Experience from "../components/sections/Experirnce";
import Education from "../components/sections/Education";

const Home = ({ theme }) => {
  return (
    <>
      <Hero theme={theme} />
      <About theme={theme} />
      <Services theme={theme} />
      <Staff theme={theme} />
      <Projects theme={theme} />
      <Education theme={theme} />
      <Experience theme={theme}/>
      <Skills theme={theme} />
      <Contact theme={theme} />
    </>
  );
};

export default Home;