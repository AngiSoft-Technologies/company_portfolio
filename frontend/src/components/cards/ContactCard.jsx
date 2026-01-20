const ContactCard = ({
    title,
    subtitle,
    icon,
    theme,
    link, // URL for the contact method (e.g., tel:, mailto:, https://)
}) => {
    const isDark = theme === "dark";
    const defaultBg = isDark ? "bg-gray-800" : "bg-white";
    const defaultText = isDark ? "text-teal-700" : "text-teal-500";

    return (
        <a
            href={link}
            target="_blank"
            rel="noopener noreferrer"
            className={`container rounded-lg shadow-lg flex items-center gap-4
          ${defaultBg} ${defaultText} cursor-pointer transition-transform transform hover:scale-105 hover:shadow-xl`}
        >
            <span className={`text-4xl p-4 ${defaultText}`}><i class={icon}></i></span>
            <div>
                <div className={`text-sm ${defaultText}`}>{title}</div>
                <div className={`text-lg font-bold ${defaultText}`}>{subtitle}</div>
            </div>
        </a>
    );
};

export default ContactCard;