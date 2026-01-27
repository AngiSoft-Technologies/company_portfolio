import React, { useEffect, useState } from 'react';
import SkillCard from '../cards/SkillCard';
import { apiGet } from '../../js/httpClient';

const placeholderSkillIcon = '/images/skill-placeholder.svg';

// Default technologies we work with
const defaultTechnologies = [
    { name: 'React', imageLink: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/react/react-original.svg' },
    { name: 'Node.js', imageLink: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/nodejs/nodejs-original.svg' },
    { name: 'Python', imageLink: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/python/python-original.svg' },
    { name: 'TypeScript', imageLink: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/typescript/typescript-original.svg' },
    { name: 'Java', imageLink: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/java/java-original.svg' },
    { name: 'Flutter', imageLink: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/flutter/flutter-original.svg' },
    { name: 'PostgreSQL', imageLink: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/postgresql/postgresql-original.svg' },
    { name: 'MongoDB', imageLink: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/mongodb/mongodb-original.svg' },
    { name: 'Docker', imageLink: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/docker/docker-original.svg' },
    { name: 'AWS', imageLink: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/amazonwebservices/amazonwebservices-original-wordmark.svg' },
];

const Skills = ({ theme }) => {
    const [skills, setSkills] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchSkills = async () => {
            try {
                const data = await apiGet('/skills');
                setSkills(data && data.length > 0 ? data : defaultTechnologies);
            } catch (err) {
                setSkills(defaultTechnologies);
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };
        fetchSkills();
    }, []);

    const displaySkills = skills.length > 0 ? skills : defaultTechnologies;

    return (
        <section id="technologies" className="p-6 py-20">
            <div className="max-w-7xl mx-auto">
                <div className="text-center mb-12">
                    <h2 className="text-4xl md:text-5xl font-extrabold mb-4 tracking-tight bg-gradient-to-r from-teal-500 to-teal-600 bg-clip-text text-transparent">
                        Technologies We Use
                    </h2>
                    <p className="text-gray-600 dark:text-gray-400 text-lg max-w-2xl mx-auto">
                        We leverage the latest technologies and frameworks to build robust, scalable solutions
                    </p>
                </div>

                {loading && (
                    <div className="flex justify-center py-12">
                        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-teal-500"></div>
                    </div>
                )}

                {!loading && (
                    <div className="flex flex-wrap justify-center gap-4 lg:gap-6">
                        {displaySkills.map((skill, index) => (
                            <SkillCard
                                key={skill._id || index}
                                image={skill.imageLink || placeholderSkillIcon}
                                name={skill.name}
                                theme={theme}
                            />
                        ))}
                    </div>
                )}
            </div>
        </section>
    );
};

export default Skills;