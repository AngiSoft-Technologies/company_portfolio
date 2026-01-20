import React, { useEffect, useState } from "react";
import Container from "../containers/Container";
import { apiGet } from '../../js/httpClient';

const Experience = ({ theme }) => {
    const [experiences, setExperiences] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        const fetchExperiences = async () => {
            try {
                const data = await apiGet('/experience');
                setExperiences(data);
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
                setTimeout(() => setVisible(true), 100);
            }
        };
        fetchExperiences();
    }, []);

    const isDark = theme === 'dark';
    const textColor = isDark ? 'text-white' : 'text-gray-900';
    const orgColor = isDark ? 'text-white-600' : 'text-gray-600';
    const periodColor = isDark ? 'text-white-500' : 'text-gray-500';
    const taskColor = isDark ? 'text-white-700' : 'text-gray-700';

    return (
        <section id="experience" className={`p-6 justify-center items-center transition-opacity duration-700 ${visible ? 'opacity-100' : 'opacity-0'}`}> 
            <h2 className="text-4xl font-extrabold mb-6 tracking-tight text-gradient bg-gradient-to-r from-green-400 to-blue-500 bg-clip-text text-transparent animate-fade-in">Experience</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {loading && <p>Loading...</p>}
                {error && <p className="text-red-500">{error}</p>}
                {!loading && !error && (
                    experiences.length > 0 ? experiences.map((exp, idx) => (
                        <Container theme={theme} key={exp._id || idx}>
                            <div className={`${textColor} animate-fade-in-slow`}>
                                <h3 className="text-xl font-semibold">{exp.title}</h3>
                                <p className={`text-sm ${orgColor}`}>{exp.organizationName || exp.department}</p>
                                <p className={`text-sm mb-2 ${periodColor}`}>{exp.startDate ? `${new Date(exp.startDate).getFullYear()} - ${exp.endDate ? new Date(exp.endDate).getFullYear() : 'Present'}` : ''}</p>
                                {exp.tasksDone && exp.tasksDone.length > 0 && (
                                    <ul className={`list-disc list-inside text-sm ${taskColor}`}>
                                        {exp.tasksDone.map((task, i) => <li key={i}>{task}</li>)}
                                    </ul>
                                )}
                                {exp.description && <p>{exp.description}</p>}
                            </div>
                        </Container>
                    )) : <p>No experience information available at the moment.</p>
                )}
            </div>
            <div className={`flex justify-end items-center`}>
                <button className={`view-more-btn`}>View More</button>
            </div>
        </section>
    );
};

export default Experience;