import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiGet } from '../js/httpClient';
import ProjectCard from '../components/cards/ProjectCard';

const StaffDetail = ({ theme }) => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [staff, setStaff] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchStaff = async () => {
            try {
                const data = await apiGet(`/staff/${id}`);
                setStaff(data);
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };
        if (id) fetchStaff();
    }, [id]);

    const bgColor = theme === 'dark' ? 'bg-gray-900 text-white' : 'bg-white text-gray-900';
    const cardBg = theme === 'dark' ? 'bg-gray-800' : 'bg-gray-50';

    if (loading) {
        return (
            <div className={`min-h-screen p-8 ${bgColor}`}>
                <div className="max-w-7xl mx-auto text-center py-16">
                    <p>Loading...</p>
                </div>
            </div>
        );
    }

    if (error || !staff) {
        return (
            <div className={`min-h-screen p-8 ${bgColor}`}>
                <div className="max-w-7xl mx-auto text-center py-16">
                    <p className="text-red-500">Error: {error || 'Staff member not found'}</p>
                    <button
                        onClick={() => navigate('/staff')}
                        className="mt-4 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                        Back to Team
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className={`min-h-screen p-8 ${bgColor}`}>
            <div className="max-w-7xl mx-auto">
                <button
                    onClick={() => navigate('/staff')}
                    className="mb-6 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                >
                    ← Back to Team
                </button>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
                    {/* Profile Section */}
                    <div className={`${cardBg} rounded-lg p-6`}>
                        <div className="flex flex-col items-center text-center">
                            {staff.avatarUrl ? (
                                <img
                                    src={staff.avatarUrl}
                                    alt={`${staff.firstName} ${staff.lastName}`}
                                    className="w-48 h-48 rounded-full object-cover mb-4 border-4 border-blue-500"
                                />
                            ) : (
                                <div className="w-48 h-48 rounded-full bg-gradient-to-br from-blue-500 to-green-500 flex items-center justify-center text-white text-6xl font-bold mb-4">
                                    {staff.firstName[0]}{staff.lastName[0]}
                                </div>
                            )}
                            <h1 className="text-3xl font-bold mb-2">
                                {staff.firstName} {staff.lastName}
                            </h1>
                            <p className="text-lg text-teal-600 dark:text-teal-400 mb-4 capitalize">
                                {staff.role.toLowerCase().replace('_', ' ')}
                            </p>
                            {staff.email && (
                                <a
                                    href={`mailto:${staff.email}`}
                                    className="text-teal-600 dark:text-teal-400 hover:underline"
                                >
                                    {staff.email}
                                </a>
                            )}
                        </div>
                    </div>

                    {/* Bio Section */}
                    <div className="lg:col-span-2">
                        <div className={`${cardBg} rounded-lg p-6 mb-6`}>
                            <h2 className="text-2xl font-bold mb-4">About</h2>
                            {staff.bio ? (
                                <p className="text-lg leading-relaxed whitespace-pre-line">
                                    {staff.bio}
                                </p>
                            ) : (
                                <p className="text-gray-500">No bio available.</p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Services Section */}
                {staff.services && staff.services.length > 0 && (
                    <div className="mb-12">
                        <h2 className="text-3xl font-bold mb-6">Services</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {staff.services.map((service) => (
                                <div
                                    key={service.id}
                                    onClick={() => navigate(`/services/${service.slug}`)}
                                    className={`${cardBg} rounded-lg p-6 cursor-pointer transform transition-all hover:scale-105`}
                                >
                                    <h3 className="text-xl font-bold mb-2">{service.title}</h3>
                                    <p className="text-gray-600 dark:text-gray-400 line-clamp-3">
                                        {service.description}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Blog Posts Section */}
                {staff.posts && staff.posts.length > 0 && (
                    <div>
                        <h2 className="text-3xl font-bold mb-6">Recent Articles</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {staff.posts.map((post) => (
                                <div
                                    key={post.id}
                                    onClick={() => navigate(`/blog/${post.slug}`)}
                                    className={`${cardBg} rounded-lg p-6 cursor-pointer transform transition-all hover:scale-105`}
                                >
                                    <h3 className="text-xl font-bold mb-2">{post.title}</h3>
                                    <p className="text-sm text-gray-500">
                                        {new Date(post.publishedAt || post.createdAt).toLocaleDateString()}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default StaffDetail;

