import React, { useState } from "react";
import Navbar from "./NavBar";
import Sidebar from "./SideBar";

const Header = ({ theme, toggleTheme }) => {
  const [isSidebarOpen, setSidebarOpen] = useState(false);

  const toggleSidebar = () => {
    setSidebarOpen(!isSidebarOpen);
  };

    const downloadCV = () => {
    const googleDocsExportUrl = "https://docs.google.com/document/d/1YA_IwS5vNzN3MVV1e99VZLvVr8IOgquI/export?format=pdf";
    window.open(googleDocsExportUrl, "_blank");
  };


  // Tailwind classes based on the theme
  const bgColor = theme === "dark" ? "bg-gray-900 text-text-light" : "bg-gray-100 text-gray-700";

  return (
    <header className={`${bgColor} min-h-15 flex justify-center items-center shadow-custom sticky top-0 z-50`}>
      <div className="container mx-auto flex items-center justify-between py-4 px-6">
        {/* Logo */}
        <div className="flex items-center">
          <a href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <img 
              src="/logo.svg" 
              alt="AngiSoft Technologies" 
              className="h-10 w-auto"
              onError={(e) => {
                // Fallback to text if image fails to load
                e.target.style.display = 'none';
                e.target.nextSibling.style.display = 'block';
              }}
            />
            <span className="text-2xl font-bold text-teal-600 dark:text-teal-400 hidden">
              AngiSoft Technologies
            </span>
          </a>
        </div>

        {/* Desktop Navbar (Visible on md and larger screens) */}
        <div className="hidden md:block">
          <Navbar theme={theme} />
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-4">
          {/* Theme Toggle Button */}
          <button
            onClick={toggleTheme}
            className={`px-4 py-2 rounded-md transition-custom ${theme === "dark" ? "bg-card-dark text-text-light hover:bg-card-light" : "bg-card-light text-text-dark hover:bg-card-dark"}`}
          >
            {theme === "dark" ? <i className="fa fa-sun"></i> : <i className="fa fa-moon"></i>}
          </button>

          {/* Download CV Button */}
          <button
            onClick={downloadCV}
            className="download-cv"
          >
            Download CV
          </button>

          {/* Mobile Menu Toggle (Visible on smaller screens) */}
          <button
            onClick={toggleSidebar}
            className="md:hidden p-2 rounded-full transition-custom"
            title="Toggle Menu"
          >
            <i className="fas fa-bars"></i>
          </button>
        </div>
      </div>

      {/* Mobile Sidebar */}
      <Sidebar isOpen={isSidebarOpen} toggleSidebar={toggleSidebar} theme={theme} />
    </header>
  );
};

export default Header;