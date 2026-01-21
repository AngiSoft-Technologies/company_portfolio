import React, { useEffect, useState } from 'react';
import SkillCard from '../cards/SkillCard';
import { apiGet } from '../../js/httpClient';

const placeholderSkillIcon = '/images/skill-placeholder.svg';

// Map skill names to local images as fallback (kept empty — skill.imageLink or placeholder used)
const skillIconMap = {};

const Skills = ({ theme }) => {
    const [skills, setSkills] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchSkills = async () => {
            try {
                const data = await apiGet('/skills');
                setSkills(data);
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };
        fetchSkills();
    }, []);

    return (
        <section id="skills" className="p-6 justify-center items-center">
            <h2>Skills</h2>
            {loading && <p>Loading...</p>}
            {error && <p className="text-red-500">{error}</p>}
            {!loading && !error && (
                <div className="flex flex-wrap justify-center gap-2 lg:gap-4 skills-container">
                    {skills.length > 0 ? skills.map((skill, index) => (
                        <SkillCard
                            key={skill._id || index}
                            image={skill.imageLink || skillIconMap[skill.name?.trim()] || placeholderSkillIcon}
                            name={skill.name}
                            theme={theme}
                        />
                    )) : <p>No skills available at the moment.</p>}
                </div>
            )}
        </section>
    );
};

export default Skills;