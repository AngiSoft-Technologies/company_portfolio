import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiGet } from '../js/httpClient';

const ServiceDetail = ({ theme }) => {
    const { slug } = useParams();
    const navigate = useNavigate();
    const [service, setService] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchService = async () => {
            try {
                // First get all services, then find by slug
                const services = await apiGet('/services');
                const found = services.find(s => s.slug === slug);
                if (!found) {
                    setError('Service not found');
                    setLoading(false);
                    return;
                }
                setService(found);
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };
        if (slug) fetchService();
    }, [slug]);

    const bgColor = theme === 'dark' ? 'bg-gray-900 text-white' : 'bg-white text-gray-900';
    const cardBg = theme === 'dark' ? 'bg-gray-800' : 'bg-gray-50';

    if (loading) {
        return (
            <div className={`min-h-screen p-8 ${bgColor}`}>
                <div className="max-w-4xl mx-auto text-center py-16">
                    <p>Loading service details...</p>
                </div>
            </div>
        );
    }

    if (error || !service) {
        return (
            <div className={`min-h-screen p-8 ${bgColor}`}>
                <div className="max-w-4xl mx-auto text-center py-16">
                    <p className="text-red-500 mb-4">Error: {error || 'Service not found'}</p>
                    <button
                        onClick={() => navigate('/services')}
                        className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                        Back to Services
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className={`min-h-screen p-8 ${bgColor}`}>
            <div className="max-w-4xl mx-auto">
                <button
                    onClick={() => navigate('/services')}
                    className="mb-6 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                >
                    ← Back to Services
                </button>

                {/* Hero Section */}
                <div className="mb-8">
                    <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-teal-400 to-teal-600 bg-clip-text text-transparent">
                        {service.title}
                    </h1>
                    {service.priceFrom && (
                        <p className="text-2xl font-semibold text-teal-600 dark:text-teal-400 mb-4">
                            Starting from {service.priceFrom} {service.currency || 'KES'}
                        </p>
                    )}
                </div>

                {/* Images Gallery */}
                {service.images && service.images.length > 0 && (
                    <div className="mb-8">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {service.images.map((img, idx) => (
                                <img
                                    key={idx}
                                    src={img}
                                    alt={`${service.title} - Image ${idx + 1}`}
                                    className="w-full h-64 object-cover rounded-lg"
                                />
                            ))}
                        </div>
                    </div>
                )}

                {/* Description */}
                <div className={`${cardBg} rounded-lg p-6 mb-8`}>
                    <h2 className="text-2xl font-bold mb-4">Service Details</h2>
                    <div className="prose prose-lg dark:prose-invert max-w-none">
                        <p className="text-lg leading-relaxed whitespace-pre-line">
                            {service.description}
                        </p>
                    </div>
                </div>

                {/* Call to Action */}
                <div className={`${cardBg} rounded-lg p-8 text-center`}>
                    <h3 className="text-2xl font-bold mb-4">Ready to Get Started?</h3>
                    <p className="text-lg mb-6 text-gray-600 dark:text-gray-400">
                        Contact us today to discuss your project requirements
                    </p>
                    <div className="flex flex-wrap justify-center gap-4">
                        <button
                            onClick={() => navigate('/book')}
                            className="px-8 py-3 bg-teal-600 text-white rounded-lg hover:bg-teal-700 font-semibold"
                        >
                            Request a Quote
                        </button>
                        <button
                            onClick={() => navigate('/#contact-me')}
                            className="px-8 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 font-semibold"
                        >
                            Contact Us
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ServiceDetail;

