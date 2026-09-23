import { FaInfoCircle } from 'react-icons/fa';

// Editorial blurb rendered under the hero. Renders nothing if no intro content.
export default function PricingIntro({ content }) {
    const intro = content?.intro;
    const note = content?.note;
    if (!intro && !note) return null;

    return (
        <section className="pricing-section pricing-intro">
            <div className="pricing-container">
                <div className="pricing-intro__card">
                    {intro && (
                        <>
                            {intro.title && <h2 className="pricing-intro__title">{intro.title}</h2>}
                            {intro.description && <p className="pricing-intro__text">{intro.description}</p>}
                        </>
                    )}
                    {note && (
                        <p className="pricing-intro__note">
                            <FaInfoCircle aria-hidden="true" />
                            <span>{note}</span>
                        </p>
                    )}
                </div>
            </div>
        </section>
    );
}
