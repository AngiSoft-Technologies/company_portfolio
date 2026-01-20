import React, { useEffect, useState } from 'react';
import ServiceCard from '../cards/ServiceCard';
import { apiGet } from '../../js/httpClient';

const Services = ({ theme }) => {
    const [services, setServices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchServices = async () => {
            try {
                const data = await apiGet('/services');
                // Filter to show only published services
                const published = Array.isArray(data) ? data.filter(s => s.published !== false) : [];
                setServices(published);
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };
        fetchServices();
    }, []);

    return (
        <section id="services" className={`p-6 py-16`}>
            <h2 className="text-4xl font-extrabold mb-8 text-center tracking-tight bg-gradient-to-r from-teal-400 to-teal-600 bg-clip-text text-transparent">
                Our Services
            </h2>
            {loading && <p className="text-center">Loading services...</p>}
            {error && <p className="text-red-500 text-center">{error}</p>}
            {!loading && !error && (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-7xl mx-auto">
                        {services.length > 0 ? services.map((service, idx) => (
                            <ServiceCard
                                key={service.id || service._id || idx}
                                icon={service.iconLink || 'fa fa-cogs'}
                                title={service.title}
                                description={service.description}
                                theme={theme}
                                slug={service.slug}
                            />
                        )) : (
                            <div className="col-span-full text-center py-8">
                                <p className="text-gray-600 dark:text-gray-400">
                                    No services available at the moment. Please check back soon.
                                </p>
                            </div>
                        )}
                    </div>
                    {services.length > 0 && (
                        <div className={`flex justify-center items-center mt-8`}>
                            <a href="/services" className={`view-more-btn`}>View All Services</a>
                        </div>
                    )}
                </>
            )}
        </section>
    );
};

export default Services;