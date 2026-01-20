import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ProjectCard from '../cards/ProjectCard';
import placeholderImg from '../../assets/images/portfolioImg.jpeg'; // Use existing image as placeholder
import { apiGet } from '../../js/httpClient';

const Projects = ({ theme }) => {
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchProjects = async () => {
            try {
                const data = await apiGet('/projects');
                // Filter published projects and select the best 3
                const published = Array.isArray(data) ? data.filter(p => p.published !== false) : [];
                const bestProjects = published.slice(0, 3);
                setProjects(bestProjects);
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };
        fetchProjects();
    }, []);

    // Determine styles based on the theme
    const buttonColor = theme === "dark" ? "bg-gray-700 hover:bg-gray-600" : "bg-teal-600 hover:bg-teal-700";

    return (
        <section id="projects" className={`p-6 py-16 justify-center items-center`}>
            <h2 className="text-4xl font-extrabold mb-8 text-center tracking-tight bg-gradient-to-r from-teal-400 to-teal-600 bg-clip-text text-transparent">
                Featured Projects
            </h2>
            {loading && <p>Loading...</p>}
            {error && <p className="text-red-500">{error}</p>}
            {!loading && !error && (
                projects.length > 0 ? (
                    <>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {projects.map((project) => (
                                <ProjectCard
                                    key={project.id || project._id}
                                    id={project.id || project._id}
                                    image={(project.images && project.images.length > 0) ? project.images[0] : (project.image || placeholderImg)}
                                    title={project.title}
                                    description={project.description}
                                    theme={theme}
                                />
                            ))}
                        </div>
                        <div className="flex justify-end mt-6">
                            <button
                                onClick={() => navigate('/projects')}
                                className={`px-4 py-2 rounded-md transition-colors ${buttonColor}`}
                            >
                                View More
                            </button>
                        </div>
                    </>
                ) : (
                    <p className="text-gray-500 text-center">No projects available at the moment.</p>
                )
            )}
        </section>
    );
};

export default Projects;