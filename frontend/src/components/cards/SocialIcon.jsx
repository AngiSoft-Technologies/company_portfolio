import * as React from "react";

const SocialIcon = ({ icon_link, target = "_blank", label, icon }) => {
    return (
        <div className="socialicon">
            <a
                href={icon_link}
                target={target}
                aria-label={label}
                rel="noopener noreferrer"
                className="w-full h-full flex justify-center items-center text-white"
            >
                <i className={icon}></i>
            </a>
        </div>
    );
};

export default SocialIcon ;