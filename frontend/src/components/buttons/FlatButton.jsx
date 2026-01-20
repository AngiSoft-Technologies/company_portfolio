const FlatButton = ({ onClick, children, variant = "primary", theme ,type}) => {
    const baseClasses = "px-4 py-2 btn rounded-md font-semibold focus:outline-none";
    const themeClasses = theme === "dark" ? "text-dark-text" : "text-light-text";
  
    let variantClasses = "";
    if (variant === "primary") {
      variantClasses = theme === "dark" ? "bg-blue-600 hover:bg-blue-700" : "bg-green-500 hover:bg-green-600";
    } else if (variant === "secondary") {
      variantClasses = theme === "dark" ? "bg-gray-700 hover:bg-gray-800" : "bg-gray-300 hover:bg-gray-400";
    } else if (variant === "danger") {
      variantClasses = theme === "dark" ? "bg-red-600 hover:bg-red-700" : "bg-red-500 hover:bg-red-600";
    }
  
    return (
      <button onClick={onClick} type={type} className={`${baseClasses} ${variantClasses} ${themeClasses}` }>
        {children}
      </button>
    );
  };
  
  export default FlatButton;