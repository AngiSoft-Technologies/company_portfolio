import SocialMediaContainer from "../containers/SocialMediaContainer";

const Footer = ({ theme }) => {
    // Determine styles based on the theme
    const bgColor = theme === "dark" ? "bg-gray-800 text-white" : "bg-gray-200 text-gray-900";

    return (
        <footer className={`p-4 text-center z-200 shadow-md ${bgColor}`}>
            <div className="footer-content">
                {/* Social Media Links */}
                <SocialMediaContainer theme={theme} />

                {/* Quote and Copyright */}
                <div className="copyrights mt-4">
                    <span className="block mt-2">&copy; {new Date().getFullYear()} AngiSoft Technologies. All Rights Reserved.</span>
                    <q className="text-teal-600 dark:text-teal-400">Innovative Software Solutions</q>
                </div>

                {/* Location & Links */}
                <div className="copyrights flex flex-wrap justify-center gap-4 mt-4">
                    <p>
                        <i className="fa fa-map-marker-alt"></i> Kenya | Remote Friendly
                    </p>
                    <a href="/book" className="text-teal-600 dark:text-teal-400 hover:underline">
                        Request a Quote
                    </a>
                    <a href="/staff" className="text-teal-600 dark:text-teal-400 hover:underline">
                        Our Team
                    </a>
                </div>
            </div>
        </footer>
    );
};

export default Footer;