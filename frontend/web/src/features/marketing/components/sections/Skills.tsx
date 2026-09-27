// @ts-nocheck
import React, { useEffect, useState } from 'react';
import { LoadingIndicator, VisualState } from '@angisoft/ui';
import SkillCard from '../cards/SkillCard';
import { apiGet } from '@/lib/httpClient';
import { useSiteCopy } from '@/hooks/marketing/useSiteCopy';

const placeholderSkillIcon = '/uploads/public/images/skill-placeholder.svg';

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
                        <h2 className="text-4xl md:text-5xl font-extrabold mb-4 tracking-tight bg-gradient-to-r from-[#0A3DFF] to-[#00C2FF] bg-clip-text text-transparent">
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
                    <div className="flex justify-center py-12"><LoadingIndicator variant="dots" size="lg" /></div>
                )}

                {!loading && (
                    <>
                        {error && <VisualState variant="error" />}
                        {displaySkills.length === 0 && !error && <VisualState variant="unavailable" />}
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
