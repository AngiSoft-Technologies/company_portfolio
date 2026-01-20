import React from "react";

const Navbar = ({ theme }) => {
  // Determine styles based on the theme
  const textColor = theme === "dark" ? "text-gray-300 hover:text-teal-400" : "text-gray-800 hover:text-blue-500";

  return (
    <nav className="hidden md:flex justify-center items-center space-x-8 gap-8">
      <a href="#introduction" className={`text-sm font-medium transition-colors ${textColor}`}>
        Home
      </a>
      <a href="#about" className={`text-sm font-medium transition-colors ${textColor}`}>
        About
      </a>
      <a href="/services" className={`text-sm font-medium transition-colors ${textColor}`}>
        Services
      </a>
      <a href="/staff" className={`text-sm font-medium transition-colors ${textColor}`}>
        Team
      </a>
      <a href="/projects" className={`text-sm font-medium transition-colors ${textColor}`}>
        Projects
      </a>
      <a href="/book" className={`text-sm font-medium transition-colors ${textColor}`}>
        Book Now
      </a>
      <a href="#contact-me" className={`text-sm font-medium transition-colors ${textColor}`}>
        Contact
      </a>
    </nav>
  );
};

export default Navbar;