const NotFound = ({ theme }) => {
    // Determine styles based on the theme
    const bgColor = theme === "dark" ? "bg-dark text-light" : "bg-light text-dark";
  
    return (
      <div className={`flex justify-center items-center min-h-screen ${bgColor}`}>
        Not available
      </div>
    );
  };
  
  export default NotFound;