import React, { useEffect, useState } from 'react';
import ProjectCard from '../components/cards/ProjectCard';

const ProjectLists = ({ theme }) => {
    const [projects, setProjects] = useState([]);

    useEffect(() => {
        const fetchProjects = async () => {
            try {
                const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api'}/projects`);
                const data = await response.json();
                // Filter to show only published projects
                const published = Array.isArray(data) ? data.filter(p => p.published !== false) : [];
                setProjects(published);
            } catch (error) {
                console.error('Error fetching projects:', error);
            }
        };

        fetchProjects();
    }, []);

    // Determine styles based on the theme
    const bgColor = theme === "dark" ? "bg-dark text-light" : "bg-light text-dark";

    return (
        <section className={`p-6 min-h-screen ${bgColor}`}>
            <h1 className="text-3xl font-bold mb-6">All Projects</h1>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {projects.map((project) => (
                    <ProjectCard
                        key={project.id || project._id}
                        id={project.id || project._id}
                        image={project.images && project.images.length > 0 ? project.images[0] : project.image}
                        title={project.title}
                        description={project.description}
                        theme={theme} // Pass theme to ProjectCard
                    />
                ))}
            </div>
        </section>
    );
};

export default ProjectLists;