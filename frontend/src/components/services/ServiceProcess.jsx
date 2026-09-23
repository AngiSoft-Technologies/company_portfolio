/**
 * "How it works" — the steps after a client requests the service.
 * Renders only when process data exists. Uses an accessible ordered list
 * so the numbered flow is conveyed to assistive tech.
 */
export default function ServiceProcess({ process = [], title = 'How It Works' }) {
    if (!Array.isArray(process) || !process.length) return null;

    const steps = process.map((step, i) => {
        if (typeof step === 'string') return { number: i + 1, title: step, description: '', duration: '' };
        return {
            number: i + 1,
            title: step?.title || step?.name || step?.label || `Step ${i + 1}`,
            description: step?.description || step?.text || '',
            duration: step?.duration || step?.time || '',
        };
    });

    return (
        <section className="service-process" aria-labelledby="service-process-heading">
            <header className="service-section-head">
                <h2 id="service-process-heading" className="service-section-title">{title}</h2>
                <p className="service-section-sub">What happens after you request this service.</p>
            </header>
            <ol className="service-process__list">
                {steps.map((step) => (
                    <li className="service-process__step" key={step.number}>
                        <span className="service-process__number" aria-hidden="true">{step.number}</span>
                        <div className="service-process__body">
                            <h3 className="service-process__title">{step.title}</h3>
                            {step.description && <p className="service-process__text">{step.description}</p>}
                            {step.duration && <span className="service-process__duration">{step.duration}</span>}
                        </div>
                    </li>
                ))}
            </ol>
        </section>
    );
}
