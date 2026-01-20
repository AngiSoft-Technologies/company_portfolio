import React from "react";
import SocialIcon from "../cards/SocialIcon";

const socialMediaLinks = [
    { icon: 'fab fa-linkedin-in', link: 'https://www.linkedin.com/in/silas-a-628598229/', label: 'LinkedIn' },
    { icon: 'fab fa-github', link: 'https://github.com/Angera-Silas', label: 'GitHub' },
    { icon: 'fab fa-youtube', link: 'https://youtube.com/@db254family?si=Nsl28H6N1CoK0_WN', label: 'YouTube' },
    { icon: 'fab fa-facebook', link: 'https://www.facebook.com/angerasilas', label: 'Facebook' },
    { icon: 'fab fa-instagram', link: 'https://www.instagram.com/silas.angera?igsh=OHVtaTFoZjF1Z2Y5', label: 'Instagram' },
    { icon: 'fab fa-tiktok', link: 'https://www.tiktok.com/@prof_angera?_t=ZM-8vTlNqorMA9&_r=1', label: 'TikTok' },
    { icon: 'fab fa-twitter', link: 'https://x.com/angera_silas?t=UmvmNx7l194MKGqGxtTjHw&s=08', label: 'Twitter' },
    { icon: 'fab fa-telegram-plane', link: 'https://t.me/angera_silas', label: 'Telegram' },
];

const SocialMediaContainer = () => {
    return (
        <div className="social-media">
            <p className="copyrights">Let's Connect on Social Media:</p>
            <div className="flex justify-center gap-4 mt-2">
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