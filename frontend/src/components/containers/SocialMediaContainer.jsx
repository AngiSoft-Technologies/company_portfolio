import React from "react";
import SocialIcon from "../cards/SocialIcon";

// AngiSoft Technologies Social Media Links
const socialMediaLinks = [
    { icon: 'fab fa-linkedin-in', link: 'https://www.linkedin.com/company/angisoft-technologies', label: 'LinkedIn' },
    { icon: 'fab fa-github', link: 'https://github.com/AngiSoft-Technologies', label: 'GitHub' },
    { icon: 'fab fa-twitter', link: 'https://twitter.com/angisofttech', label: 'Twitter' },
    { icon: 'fab fa-facebook', link: 'https://www.facebook.com/angisofttechnologies', label: 'Facebook' },
    { icon: 'fab fa-instagram', link: 'https://www.instagram.com/angisofttech', label: 'Instagram' },
    { icon: 'fab fa-youtube', link: 'https://youtube.com/@angisofttechnologies', label: 'YouTube' },
];

const SocialMediaContainer = ({ theme }) => {
    return (
        <div className="social-media">
            <p className="text-gray-600 dark:text-gray-400 mb-3">Connect with us:</p>
            <div className="flex justify-center gap-3">
                {socialMediaLinks.map((social, index) => (
                    <SocialIcon
                        key={index}
                        icon={social.icon}
                        icon_link={social.link}
                        label={social.label}
                        target="_blank"
                    />
                ))}
            </div>
        </div>
    );
};

export default SocialMediaContainer;