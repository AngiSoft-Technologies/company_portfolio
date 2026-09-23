import { useState } from 'react';
import { FaChevronLeft, FaChevronRight } from 'react-icons/fa';
import { resolveAssetUrl } from '../../utils/constants';

/**
 * Gallery / examples for a service. Renders only when valid image URLs exist.
 * Desktop: large media + thumbnail strip + prev/next buttons.
 * Phone: full-width image, touch-friendly arrows, scrollable thumbnails.
 */
export default function ServiceGallery({ images = [], title = 'this service' }) {
    const urls = Array.isArray(images) ? images.map((img) => resolveAssetUrl(img)).filter(Boolean) : [];
    const [active, setActive] = useState(0);

    if (!urls.length) return null;

    const go = (dir) => setActive((i) => (i + dir + urls.length) % urls.length);

    return (
        <section className="service-gallery" aria-labelledby="service-gallery-heading">
            <header className="service-section-head">
                <h2 id="service-gallery-heading" className="service-section-title">Gallery &amp; Examples</h2>
            </header>

            <div className="service-gallery__stage">
                <button
                    type="button"
                    className="service-gallery__nav service-gallery__nav--prev"
                    aria-label="Previous image"
                    onClick={() => go(-1)}
                >
                    <FaChevronLeft />
                </button>

                <img
                    src={urls[active]}
                    alt={`${title} — example ${active + 1} of ${urls.length}`}
                    className="service-gallery__image"
                    loading="lazy"
                />

                <button
                    type="button"
                    className="service-gallery__nav service-gallery__nav--next"
                    aria-label="Next image"
                    onClick={() => go(1)}
                >
                    <FaChevronRight />
                </button>
            </div>

            {urls.length > 1 && (
                <ul className="service-gallery__thumbs">
                    {urls.map((url, i) => (
                        <li key={url}>
                            <button
                                type="button"
                                className={`service-gallery__thumb${i === active ? ' is-active' : ''}`}
                                aria-label={`Show image ${i + 1}`}
                                aria-current={i === active}
                                onClick={() => setActive(i)}
                            >
                                <img src={url} alt="" loading="lazy" />
                            </button>
                        </li>
                    ))}
                </ul>
            )}
        </section>
    );
}
