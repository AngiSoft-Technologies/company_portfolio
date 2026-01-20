import React, { useEffect, useState } from "react";
import { apiGet } from '../../js/httpClient';

const Testimonials = ({ theme }) => {
    const [testimonials, setTestimonials] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        const fetchTestimonials = async () => {
            try {
                const data = await apiGet('/testimonials');
                setTestimonials(data);
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
                setTimeout(() => setVisible(true), 100);
            }
        };
        fetchTestimonials();
    }, []);

    const isDark = theme === 'dark';
    const cardBg = isDark ? 'bg-gray-800 text-white' : 'bg-white text-gray-900';

    return (
        <section id="testimonials" className={`p-6 justify-center items-center transition-opacity duration-700 ${visible ? 'opacity-100' : 'opacity-0'}`}> 
            <h2 className="text-4xl font-extrabold mb-6 tracking-tight text-gradient bg-gradient-to-r from-green-400 to-blue-500 bg-clip-text text-transparent animate-fade-in">Testimonials</h2>
            {loading && <p>Loading...</p>}
            {error && <p className="text-red-500">{error}</p>}
            {!loading && !error && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {testimonials.length > 0 ? testimonials.map((t, idx) => (
                        <div key={t._id || idx} className={`rounded-lg shadow-lg p-4 ${cardBg} animate-fade-in-slow`}>
                            <div className="flex items-center gap-4 mb-2">
                                {t.imageLink && <img src={t.imageLink} alt={t.username} className="w-12 h-12 rounded-full" />}
                                <div>
                                    <div className="font-bold">{t.username}</div>
                                    <div className="text-sm text-gray-500">{t.title}</div>
                                </div>
                            </div>
                            {t.message && t.message.map((msg, i) => <p key={i} className="mb-2">{msg}</p>)}
                        </div>
                    )) : <p>No testimonials available at the moment.</p>}
                </div>
            )}
        </section>
    );
};

export default Testimonials;
