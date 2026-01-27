const ContactCard = ({
    title,
    subtitle,
    icon,
    theme,
    link,
}) => {
    const isDark = theme === "dark";
    const bgColor = isDark ? "bg-gray-800" : "bg-white";

    return (
        <a
            href={link}
            target="_blank"
            rel="noopener noreferrer"
            className={`${bgColor} p-5 rounded-xl shadow-lg flex items-center gap-4
                cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-xl hover:no-underline`}
        >
            <div className="w-12 h-12 rounded-full bg-teal-100 dark:bg-teal-900/50 flex items-center justify-center flex-shrink-0">
                <i className={`${icon} text-xl text-teal-600 dark:text-teal-400`}></i>
            </div>
            <div>
                <div className="text-sm text-gray-500 dark:text-gray-400">{title}</div>
                <div className="text-base font-semibold text-gray-800 dark:text-white">{subtitle}</div>
            </div>
        </a>
    );
};

export default ContactCard;