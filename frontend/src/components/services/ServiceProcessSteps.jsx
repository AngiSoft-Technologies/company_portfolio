// "How to Get a Service" — four simple steps. Responsive:
// 4 across desktop, 2x2 tablet, stacked on phone (CSS controls layout).
import React from 'react';
import { FaMousePointer, FaCommentDots, FaFileInvoiceDollar, FaPlay } from 'react-icons/fa';

const STEPS = [
    {
        icon: FaMousePointer,
        title: 'Choose a Service',
        text: 'Browse the catalogue and open the service details to understand scope.',
    },
    {
        icon: FaCommentDots,
        title: 'Share Your Requirements',
        text: 'Submit the booking or enquiry form with your goal, files and preferred contact method.',
    },
    {
        icon: FaFileInvoiceDollar,
        title: 'Receive Scope and Pricing',
        text: 'AngiSoft reviews the request and confirms the scope, expected timeline and quotation.',
    },
    {
        icon: FaPlay,
        title: 'Work Begins',
        text: 'After confirmation, the work is scheduled and progress updates are shared.',
    },
];

const ServiceProcessSteps = () => (
    <section className="services-container service-process" aria-labelledby="process-title">
        <div className="services-section__head">
            <h2 id="process-title" className="services-section__title">How to Get a Service</h2>
            <span className="services-section__count">Four simple steps</span>
        </div>
        <ol className="service-process__grid">
            {STEPS.map(({ icon: Icon, title, text }, i) => (
                <li key={title} className="service-process__step">
                    <span className="service-process__num" aria-hidden="true">{i + 1}</span>
                    <span className="service-process__icon" aria-hidden="true"><Icon /></span>
                    <h3 className="service-process__title">{title}</h3>
                    <p className="service-process__text">{text}</p>
                </li>
            ))}
        </ol>
    </section>
);

export default ServiceProcessSteps;
