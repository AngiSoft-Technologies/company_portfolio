const ElevatedButton = ({ onClick, children, variant = "primary", theme, type }) => {
    const baseClasses = "px-4 py-2 rounded-md font-semibold focus:outline-none shadow-md transition-all duration-200";
    const themeClasses = theme === "dark" ? "text-white" : "text-white";

    let variantClasses = "";
    if (variant === "primary") {
        variantClasses = "bg-sky-500 hover:bg-sky-600";
    } else if (variant === "secondary") {
        variantClasses = theme === "dark" ? "bg-slate-700 hover:bg-slate-600 text-slate-200" : "bg-slate-200 hover:bg-slate-300 text-slate-800";
    } else if (variant === "danger") {
        variantClasses = "bg-red-500 hover:bg-red-600";
    }

    const shadowClasses = theme === "dark" ? "shadow-lg hover:shadow-xl" : "shadow hover:shadow-lg";

    return (
        <button
            onClick={onClick}
            type={type}
            className={`${baseClasses} ${variantClasses} ${themeClasses} ${shadowClasses}`}
        >
            {children}
        </button>
    );
};

export default ElevatedButton;