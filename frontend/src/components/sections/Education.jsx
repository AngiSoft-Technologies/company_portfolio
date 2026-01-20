
import React, { useEffect, useState } from "react";
import Container from "../containers/Container.jsx";
import { apiGet } from '../../js/httpClient';
const Education = ({ theme }) => {
    const [education, setEducation] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        const fetchEducation = async () => {
            try {
                const data = await apiGet('/education');
                setEducation(data);
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
                setTimeout(() => setVisible(true), 100);
            }
        };
        fetchEducation();
    }, []);

    const isDark = theme === 'dark';
    const textColor = isDark ? 'text-white' : 'text-gray-900';
    const schColor = isDark ? 'text-white-600' : 'text-gray-600';
    const periodColor = isDark ? 'text-white-500' : 'text-gray-500';
    const gradeColor = isDark ? 'text-white-700' : 'text-gray-700';

    return (
        <section id="education" className={`p-6 justify-center items-center transition-opacity duration-700 ${visible ? 'opacity-100' : 'opacity-0'}`}> 
            <h2 className="text-4xl font-extrabold mb-6 tracking-tight text-gradient bg-gradient-to-r from-green-400 to-blue-500 bg-clip-text text-transparent animate-fade-in">Education</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {loading && <p>Loading...</p>}
                {error && <p className="text-red-500">{error}</p>}
                {!loading && !error && (
                    education.length > 0 ? education.map((edu, idx) => (
                        <Container theme={theme} key={edu._id || idx}>
                            <div className={`${textColor} animate-fade-in-slow`}>
                                <h3 className="text-xl font-semibold">{edu.institutionName}</h3>
                                <p className={`text-sm ${schColor}`}>{edu.educationLevel}</p>
                                <p className={`text-sm mb-2 ${periodColor}`}>{edu.startDate ? `${new Date(edu.startDate).getFullYear()} - ${edu.endDate ? new Date(edu.endDate).getFullYear() : 'Present'}` : ''}</p>
                                {edu.program && <p className={`text-sm ${gradeColor}`}>{edu.program.join(', ')}</p>}
                                {edu.grades && <p className={`text-sm ${gradeColor}`}>{edu.grades.join(', ')}</p>}
                                {edu.description && edu.description.map((desc, i) => <p key={i}>{desc}</p>)}
                            </div>
                        </Container>
                    )) : <p>No education information available at the moment.</p>
                )}
            </div>
        </section>
    );
};

export default Education;