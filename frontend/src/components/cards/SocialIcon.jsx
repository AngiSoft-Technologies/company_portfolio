import * as React from "react";

const SocialIcon = ({ icon_link, target = "_blank", label, icon }) => {
    return (
        <a
            href={icon_link}
            target={target}
            aria-label={label}
            rel="noopener noreferrer"
            className="w-10 h-10 rounded-full bg-teal-600 hover:bg-teal-700 flex justify-center items-center text-white transition-all hover:scale-110 hover:no-underline"
        >
            <i className={icon}></i>
        </a>
    );
};

export default SocialIcon;