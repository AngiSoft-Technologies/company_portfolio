import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiGet } from '../js/httpClient';
import ServiceCard from '../components/cards/ServiceCard';

const ServicesList = ({ theme }) => {
    const navigate = useNavigate();
    const [services, setServices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    
    const bgColor = theme === "dark" ? "bg-gray-900 text-white" : "bg-white text-gray-900";

    useEffect(() => {
        const fetchServices = async () => {
            try {
                const data = await apiGet('/services');
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
        <div className={`min-h-screen p-8 ${bgColor}`}>
            <div className="max-w-7xl mx-auto">
                <h1 className="text-4xl md:text-5xl font-bold mb-4 text-center bg-gradient-to-r from-green-400 to-blue-500 bg-clip-text text-transparent">
                    Our Services
                </h1>
                <p className="text-center text-lg mb-12 text-gray-600 dark:text-gray-400">
                    Explore our comprehensive range of professional services
                </p>

                {loading && <p className="text-center">Loading services...</p>}
                {error && <p className="text-red-500 text-center">{error}</p>}
                
                {!loading && !error && (
                    <>
                        {services.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {services.map((service) => (
                                    <ServiceCard
                                        key={service.id || service._id}
                                        icon={service.iconLink || 'fa fa-cogs'}
                                        title={service.title}
                                        description={service.description}
                                        theme={theme}
                                        slug={service.slug}
                                    />
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-16">
                                <p className="text-gray-500">
                                    No services available at the moment. Please check back soon.
                                </p>
                            </div>
                        )}
                    </>
                )}

                {/* Call to Action */}
                <div className="mt-12 text-center">
                    <h2 className="text-2xl font-bold mb-4">Ready to Get Started?</h2>
                    <p className="text-lg mb-6 text-gray-600 dark:text-gray-400">
                        Contact us today to discuss your project requirements
                    </p>
                    <button
                        onClick={() => navigate('/book')}
                        className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold"
                    >
                        Request a Quote
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ServicesList;