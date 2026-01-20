import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiGet } from '../js/httpClient';

const StaffList = ({ theme }) => {
    const navigate = useNavigate();
    const [staff, setStaff] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchStaff = async () => {
            try {
                const data = await apiGet('/staff');
                setStaff(data);
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };
        fetchStaff();
    }, []);

    const bgColor = theme === 'dark' ? 'bg-gray-900 text-white' : 'bg-white text-gray-900';
    const cardBg = theme === 'dark' ? 'bg-gray-800' : 'bg-gray-50';

    if (loading) {
        return (
            <div className={`min-h-screen p-8 ${bgColor}`}>
                <div className="max-w-7xl mx-auto text-center py-16">
                    <p>Loading team members...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className={`min-h-screen p-8 ${bgColor}`}>
                <div className="max-w-7xl mx-auto text-center py-16">
                    <p className="text-red-500">Error: {error}</p>
                </div>
            </div>
        );
    }

    return (
        <div className={`min-h-screen p-8 ${bgColor}`}>
            <div className="max-w-7xl mx-auto">
                <h1 className="text-4xl md:text-5xl font-bold mb-4 text-center bg-gradient-to-r from-teal-400 to-teal-600 bg-clip-text text-transparent">
                    Our Team
                </h1>
                <p className="text-center text-lg mb-12 text-gray-600 dark:text-gray-400">
                    Meet the experts behind AngiSoft Technologies
                </p>

                {staff.length === 0 ? (
                    <div className="text-center py-16">
                        <p className="text-gray-500">No team members available at the moment.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {staff.map((member) => (
                            <div
                                key={member.id}
                                onClick={() => navigate(`/staff/${member.id}`)}
                                className={`${cardBg} rounded-lg p-6 cursor-pointer transform transition-all hover:scale-105 hover:shadow-xl`}
                            >
                                <div className="flex flex-col items-center text-center">
                                    {member.avatarUrl ? (
                                        <img
                                            src={member.avatarUrl}
                                            alt={`${member.firstName} ${member.lastName}`}
                                            className="w-32 h-32 rounded-full object-cover mb-4 border-4 border-blue-500"
                                        />
                                    ) : (
                                        <div className="w-32 h-32 rounded-full bg-gradient-to-br from-blue-500 to-green-500 flex items-center justify-center text-white text-4xl font-bold mb-4">
                                            {member.firstName[0]}{member.lastName[0]}
                                        </div>
                                    )}
                                    <h3 className="text-xl font-bold mb-2">
                                        {member.firstName} {member.lastName}
                                    </h3>
                                    <p className="text-sm text-teal-600 dark:text-teal-400 mb-3 capitalize">
                                        {member.role.toLowerCase().replace('_', ' ')}
                                    </p>
                                    {member.bio && (
                                        <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-3 mb-4">
                                            {member.bio}
                                        </p>
                                    )}
                                    <button className="text-teal-600 dark:text-teal-400 hover:underline font-semibold">
                                        View Portfolio →
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default StaffList;

