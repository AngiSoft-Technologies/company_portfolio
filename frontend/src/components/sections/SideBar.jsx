import React from "react";

const Sidebar = ({ isOpen, toggleSidebar, theme }) => {

  // Determine styles based on the theme
  const bgColor = theme === "dark" ? "bg-gray-900 text-gray-300" : "bg-gray-100 text-gray-800";
  const hoverColor = theme === "dark" ? "hover:text-teal-400" : "hover:text-blue-500";

  return (
    <div
      className={`fixed top-0 left-0 h-full w-64 ${bgColor} transform ${isOpen ? "translate-x-0" : "-translate-x-full"
        } transition-transform duration-300 z-50 md:hidden`}
    >

      <button
        onClick={toggleSidebar}
        className={`absolute top-4 right-4 ${theme === "dark" ? "text-gray-400 hover:text-white" : "text-gray-600 hover:text-black"}`}
      >
        <i className="fas fa-times text-2xl"></i>
      </button>

      <nav className="flex flex-col space-y-4 mt-16 px-6">
        <a
          href="#introduction"
          className={`text-sm font-medium transition-colors ${hoverColor}`}
          onClick={toggleSidebar}
        >
          Home
        </a>
        <a
          href="#about"
          className={`text-sm font-medium transition-colors ${hoverColor}`}
          onClick={toggleSidebar}
        >
          About
        </a>
        <a
          href="#skills"
          className={`text-sm font-medium transition-colors ${hoverColor}`}
          onClick={toggleSidebar}
        >
          Skills
        </a>
        <a
          href="#experience"
          className={`text-sm font-medium transition-colors ${hoverColor}`}
          onClick={toggleSidebar}
        >
          Experience
        </a>
        <a
          href="#projects"
          className={`text-sm font-medium transition-colors ${hoverColor}`}
          onClick={toggleSidebar}
        >
          Projects
        </a>
        <a
          href="#education"
          className={`text-sm font-medium transition-colors ${hoverColor}`}
          onClick={toggleSidebar}
        >
          Education
        </a>
        <a
          href="#contact-me"
          className={`text-sm font-medium transition-colors ${hoverColor}`}
          onClick={toggleSidebar}
        >
          Contact
        </a>
      </nav>

    </div>
  );
};

export default Sidebar;