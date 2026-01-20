import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiGet } from '../js/httpClient';
import ProjectCard from '../components/cards/ProjectCard';
import placeholderImg from '../assets/images/portfolioImg.jpeg';

const ProjectDetails = ({ theme }) => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [project, setProject] = useState(null);
    const [relatedProjects, setRelatedProjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchProjectDetails = async () => {
            try {
                const data = await apiGet(`/projects/${id}`);
                setProject(data);
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        const fetchRelatedProjects = async () => {
            try {
                const data = await apiGet('/projects');
                const published = Array.isArray(data) ? data.filter(p => p.published !== false && p.id !== id) : [];
                setRelatedProjects(published.slice(0, 3));
            } catch (err) {
                console.error('Error fetching related projects:', err);
            }
        };

        if (id) {
            fetchProjectDetails();
            fetchRelatedProjects();
        }
    }, [id]);

    const bgColor = theme === 'dark' ? 'bg-gray-900 text-white' : 'bg-white text-gray-900';
    const cardBg = theme === 'dark' ? 'bg-gray-800' : 'bg-gray-50';

    if (loading) {
        return (
            <div className={`min-h-screen p-8 ${bgColor}`}>
                <div className="max-w-4xl mx-auto text-center py-16">
                    <p>Loading project details...</p>
                </div>
            </div>
        );
    }

    if (error || !project) {
        return (
            <div className={`min-h-screen p-8 ${bgColor}`}>
                <div className="max-w-4xl mx-auto text-center py-16">
                    <p className="text-red-500 mb-4">Error: {error || 'Project not found'}</p>
                    <button
                        onClick={() => navigate('/projects')}
                        className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                        Back to Projects
                    </button>
                </div>
            </div>
        );
    }

    const mainImage = project.images && project.images.length > 0 
        ? project.images[0] 
        : (project.image || placeholderImg);

    return (
        <div className={`min-h-screen p-8 ${bgColor}`}>
            <div className="max-w-6xl mx-auto">
                <button
                    onClick={() => navigate('/projects')}
                    className="mb-6 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                >
                    ← Back to Projects
                </button>

                {/* Hero Section */}
                <div className="mb-8">
                    <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-teal-400 to-teal-600 bg-clip-text text-transparent">
                        {project.title}
                    </h1>
                    {project.type && (
                        <p className="text-lg text-blue-600 dark:text-blue-400 mb-4 capitalize">
                            {project.type}
                        </p>
                    )}
                </div>

                {/* Main Image */}
                <div className="mb-8">
                    <img
                        src={mainImage}
                        alt={project.title}
                        className="w-full h-96 object-cover rounded-lg shadow-xl"
                    />
                </div>

                {/* Project Details Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
                    {/* Main Content */}
                    <div className="lg:col-span-2">
                        <div className={`${cardBg} rounded-lg p-6 mb-6`}>
                            <h2 className="text-2xl font-bold mb-4">Project Overview</h2>
                            <div className="prose prose-lg dark:prose-invert max-w-none">
                                <p className="text-lg leading-relaxed whitespace-pre-line">
                                    {project.description}
                                </p>
                            </div>
                        </div>

                        {/* Image Gallery */}
                        {project.images && project.images.length > 1 && (
                            <div className={`${cardBg} rounded-lg p-6`}>
                                <h3 className="text-xl font-bold mb-4">Gallery</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    {project.images.slice(1).map((img, idx) => (
                                        <img
                                            key={idx}
                                            src={img}
                                            alt={`${project.title} - ${idx + 2}`}
                                            className="w-full h-48 object-cover rounded-lg"
                                        />
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Sidebar */}
                    <div className="space-y-6">
                        {project.techStack && project.techStack.length > 0 && (
                            <div className={`${cardBg} rounded-lg p-6`}>
                                <h3 className="text-xl font-bold mb-4">Tech Stack</h3>
                                <div className="flex flex-wrap gap-2">
                                    {project.techStack.map((tech, idx) => (
                                        <span
                                            key={idx}
                                            className="px-3 py-1 bg-teal-600 text-white rounded-full text-sm"
                                        >
                                            {tech}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}

                        {(project.demoUrl || project.repoUrl) && (
                            <div className={`${cardBg} rounded-lg p-6`}>
                                <h3 className="text-xl font-bold mb-4">Links</h3>
                                <div className="space-y-2">
                                    {project.demoUrl && (
                                        <a
                                            href={project.demoUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="block px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-center"
                                        >
                                            View Demo
                                        </a>
                                    )}
                                    {project.repoUrl && (
                                        <a
                                            href={project.repoUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="block px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 text-center"
                                        >
                                            View Code
                                        </a>
                                    )}
                                </div>
                            </div>
                        )}

                        <div className={`${cardBg} rounded-lg p-6`}>
                            <h3 className="text-xl font-bold mb-4">Interested?</h3>
                            <button
                                onClick={() => navigate('/book')}
                                className="w-full px-4 py-3 bg-teal-600 text-white rounded-lg hover:bg-teal-700 font-semibold"
                            >
                                Request Similar Project
                            </button>
                        </div>
                    </div>
                </div>

                {/* Related Projects */}
                {relatedProjects.length > 0 && (
                    <div className="mt-12">
                        <h2 className="text-3xl font-bold mb-6">Related Projects</h2>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {relatedProjects.map((related) => (
                                <ProjectCard
                                    key={related.id || related._id}
                                    id={related.id || related._id}
                                    image={(related.images && related.images.length > 0) ? related.images[0] : (related.image || placeholderImg)}
                                    title={related.title}
                                    description={related.description}
                                    theme={theme}
                                />
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ProjectDetails;