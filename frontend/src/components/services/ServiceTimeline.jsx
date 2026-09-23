import { FaRegClock } from 'react-icons/fa';

/**
 * Engagement / timeline note for the service.
 * Renders only when a timeline value exists. Never promises exact dates
 * that the backend does not provide.
 */
export default function ServiceTimeline({ timeline }) {
    if (!timeline) return null;

    return (
        <p className="service-timeline">
            <span className="service-timeline__icon" aria-hidden="true"><FaRegClock /></span>
            <span><strong className="service-timeline__label">Typical timeline: </strong>{timeline}</span>
        </p>
    );
}
