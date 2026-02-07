import React, { useEffect, useState } from 'react';
import SkillCard from '../cards/SkillCard';
import { apiGet } from '../../js/httpClient';
import { useSiteCopy } from '../../hooks/useSiteCopy';

const placeholderSkillIcon = '/images/skill-placeholder.svg';

const Skills = ({ theme }) => {
    const { copy: uiCopy } = useSiteCopy();
    const [skills, setSkills] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const sectionCopy = uiCopy?.home?.skills || {};

    useEffect(() => {
        const fetchSkills = async () => {
            try {
                const data = await apiGet('/skills');
                setSkills(Array.isArray(data) ? data : []);
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };
        fetchSkills();
    }, []);

    const displaySkills = skills;

    return (
        <section id="technologies" className="p-6 py-20">
            <div className="max-w-7xl mx-auto">
                <div className="text-center mb-12">
                    {sectionCopy.title && (
                        <h2 className="text-4xl md:text-5xl font-extrabold mb-4 tracking-tight bg-gradient-to-r from-teal-500 to-teal-600 bg-clip-text text-transparent">
                            {sectionCopy.title}
                        </h2>
                    )}
                    {sectionCopy.subtitle && (
                        <p className="text-gray-600 dark:text-gray-400 text-lg max-w-2xl mx-auto">
                            {sectionCopy.subtitle}
                        </p>
                    )}
                </div>

                {loading && (
                    <div className="flex justify-center py-12">
                        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-teal-500"></div>
                    </div>
                )}

                {!loading && (
                    <>
                        {error && (
                            <p className="text-center text-sm text-red-500 mb-4">{error}</p>
                        )}
                        {displaySkills.length === 0 && !error && (
                            <p className="text-center text-sm text-gray-500 mb-4">No skills published yet.</p>
                        )}
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
                    </>
                )}
            </div>
        </section>
    );
};

export default Skills;
