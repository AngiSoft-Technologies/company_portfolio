import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiGet } from '../../js/httpClient';

const Staff = ({ theme }) => {
    const navigate = useNavigate();
    const [staff, setStaff] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchStaff = async () => {
            try {
                const data = await apiGet('/staff');
                // Show only first 3 team members on home page
                setStaff(data.slice(0, 3));
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };
        fetchStaff();
    }, []);

    const bgColor = theme === 'dark' ? 'bg-gray-800' : 'bg-gray-50';
    const textColor = theme === 'dark' ? 'text-white' : 'text-gray-900';

    return (
        <section id="team" className={`p-6 py-16`}>
            <h2 className="text-4xl font-extrabold mb-8 text-center tracking-tight bg-gradient-to-r from-teal-400 to-teal-600 bg-clip-text text-transparent">
                Our Expert Team
            </h2>
            {loading && <p className="text-center">Loading team members...</p>}
            {error && <p className="text-red-500 text-center">{error}</p>}
            {!loading && !error && (
                <>
                    {staff.length > 0 ? (
                        <>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-7xl mx-auto">
                                {staff.map((member) => (
                                    <div
                                        key={member.id}
                                        onClick={() => navigate(`/staff/${member.id}`)}
                                        className={`${bgColor} rounded-lg p-6 cursor-pointer transform transition-all hover:scale-105 hover:shadow-xl`}
                                    >
                                        <div className="flex flex-col items-center text-center">
                                            {member.avatarUrl ? (
                                                <img
                                                    src={member.avatarUrl}
                                                    alt={`${member.firstName} ${member.lastName}`}
                                                    className="w-24 h-24 rounded-full object-cover mb-4 border-4 border-blue-500"
                                                />
                                            ) : (
                                                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-500 to-green-500 flex items-center justify-center text-white text-2xl font-bold mb-4">
                                                    {member.firstName[0]}{member.lastName[0]}
                                                </div>
                                            )}
                                            <h3 className="text-lg font-bold mb-2">
                                                {member.firstName} {member.lastName}
                                            </h3>
                                            <p className="text-sm text-teal-600 dark:text-teal-400 mb-3 capitalize">
                                                {member.role.toLowerCase().replace('_', ' ')}
                                            </p>
                                            {member.bio && (
                                                <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mb-4">
                                                    {member.bio}
                                                </p>
                                            )}
                                            <button className="text-teal-600 dark:text-teal-400 hover:underline font-semibold text-sm">
                                                View Portfolio →
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div className="flex justify-center mt-8">
                                <button
                                    onClick={() => navigate('/staff')}
                                    className={`px-6 py-3 rounded-lg font-semibold transition-all ${
                                        theme === 'dark' 
                                            ? 'bg-teal-600 hover:bg-teal-700 text-white' 
                                            : 'bg-teal-600 hover:bg-teal-700 text-white'
                                    }`}
                                >
                                    View All Team Members
                                </button>
                            </div>
                        </>
                    ) : (
                        <p className="text-center text-gray-500">No team members available at the moment.</p>
                    )}
                </>
            )}
        </section>
    );
};

export default Staff;

