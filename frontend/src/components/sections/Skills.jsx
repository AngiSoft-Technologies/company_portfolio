import React, { useEffect, useState } from 'react';
import SkillCard from '../cards/SkillCard';
import flutter240 from '../../assets/icons/flutter-color/flutter240.svg';
import Cprogramming240 from '../../assets/icons/c-programming-color/Cprogramming240.svg';
import anaconda240 from '../../assets/icons/anaconda-color/anaconda240.svg';
import cpp240 from '../../assets/icons/c++-color/cpp240.svg';
import css240 from '../../assets/icons/css-color/css240.svg';
import docker240 from '../../assets/icons/docker-color/docker240.svg';
import git240 from '../../assets/icons/git-color/git240.svg';
import html240 from '../../assets/icons/html-color/html240.svg';
import java240 from '../../assets/icons/java-color/java240.svg';
import javascript240 from '../../assets/icons/javascript-color/javascript240.svg';
import jupyter240 from '../../assets/icons/jupyter-color/jupyter240.svg';
import kaliLinux240 from '../../assets/icons/kali-linux-color/kaliLinux240.svg';
import mariadb240 from '../../assets/icons/mariadb-color/mariadb240.svg';
import mysqlLogo240 from '../../assets/icons/mysql-logo-color/mysqlLogo240.svg';
import nodejs240 from '../../assets/icons/nodejs-color/nodejs240.svg';
import python240 from '../../assets/icons/python-color/python240.svg';
import springBoot480 from '../../assets/icons/spring-boot/springBoot480.svg';
import typescript96 from '../../assets/icons/typescript-color/typescript96.png';
import ubuntu96 from '../../assets/icons/ubuntu-color/ubuntu96.png';
import vite240 from '../../assets/icons/vite-color/vite240.svg';
import { apiGet } from '../../js/httpClient';

// Map skill names to local images as fallback
const skillIconMap = {
    'Flutter': flutter240,
    'C': Cprogramming240,
    'Anaconda': anaconda240,
    'Java': java240,
    'C++': cpp240,
    'CSS': css240,
    'Docker': docker240,
    'Git Bash': git240,
    'HTML': html240,
    'JavaScript': javascript240,
    'Jupyter NoteBook': jupyter240,
    'Kali Linux': kaliLinux240,
    'MariaDB': mariadb240,
    'MySQL': mysqlLogo240,
    'NodeJs': nodejs240,
    'Python': python240,
    'SpringBoot': springBoot480,
    'TypeScript': typescript96,
    'Ubuntu': ubuntu96,
    'Vite': vite240,
};

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
                            image={skill.imageLink || skillIconMap[skill.name?.trim()]}
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