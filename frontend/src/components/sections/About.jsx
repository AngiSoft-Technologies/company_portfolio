import React, { useEffect, useState } from "react";
import Container from "../containers/Container.jsx";
import { apiGet } from '../../js/httpClient';

const About = ({ theme }) => {
    const [about, setAbout] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        const fetchAbout = async () => {
            try {
                const data = await apiGet('/about');
                setAbout(data && data.length > 0 ? data[0] : null); // Show latest
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
                setTimeout(() => setVisible(true), 100); // trigger fade-in
            }
        };
        fetchAbout();
    }, []);

    return (
        <section id="about" className={`p-6 py-16 transition-opacity duration-700 ${visible ? 'opacity-100' : 'opacity-0'}`}>
            <h2 className="text-4xl font-extrabold mb-6 tracking-tight text-gradient bg-gradient-to-r from-teal-400 to-teal-600 bg-clip-text text-transparent animate-fade-in text-center">
                About AngiSoft Technologies
            </h2>
            <Container theme={theme}>
                <div className="max-w-4xl mx-auto">
                    {loading && <p className="text-center">Loading...</p>}
                    {error && <p className="text-red-500 text-center">{error}</p>}
                    {!loading && !error && about && (
                        <>
                            <h3 className="text-2xl font-bold mb-4 text-blue-500 animate-fade-in-slow">{about.title}</h3>
                            {about.description && about.description.map((desc, idx) => (
                                <p className="mb-4 text-lg leading-relaxed animate-fade-in-slow" key={idx}>{desc}</p>
                            ))}
                        </>
                    )}
                    {!loading && !error && !about && (
                        <div className="text-center space-y-4">
                            <p className="text-lg text-gray-700 dark:text-gray-300">
                                AngiSoft Technologies is a leading software development company specializing in 
                                custom software solutions, web applications, and digital transformation services.
                            </p>
                            <p className="text-lg text-gray-700 dark:text-gray-300">
                                We combine technical expertise with business acumen to deliver solutions that 
                                drive growth and innovation for our clients.
                            </p>
                        </div>
                    )}
                </div>
            </Container>
        </section>
    );
};

export default About;