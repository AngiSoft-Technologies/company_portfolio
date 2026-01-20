import React, { useEffect, useState } from 'react';
import { apiGet, apiPost } from '../js/httpClient';
import { useNavigate, useSearchParams } from 'react-router-dom';
import SearchBar from '../components/SearchBar';
import LoadingSpinner from '../components/LoadingSpinner';
import { PaginationControls } from '../utils/pagination';
import { toast } from '../utils/toast';

const BookingsManagement = ({ theme }) => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [bookings, setBookings] = useState([]);
    const [filteredBookings, setFilteredBookings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [selectedBooking, setSelectedBooking] = useState(null);
    const [reviewAction, setReviewAction] = useState('');
    const [priceEstimate, setPriceEstimate] = useState('');
    const [assignedToId, setAssignedToId] = useState('');
    const [notes, setNotes] = useState('');
    const [employees, setEmployees] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    const status = searchParams.get('status') || '';

    useEffect(() => {
        fetchBookings();
        fetchEmployees();
    }, [status]);

    const fetchBookings = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('adminToken');
            const query = status ? `?status=${status}` : '';
            const data = await apiGet(`/admin/bookings${query}`, token);
            setBookings(data.bookings || []);
            setFilteredBookings(data.bookings || []);
        } catch (err) {
            setError(err.message);
            toast.error('Failed to load bookings: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    // Search and filter
    useEffect(() => {
        let filtered = [...bookings];
        
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(booking =>
                booking.title?.toLowerCase().includes(query) ||
                booking.client?.name?.toLowerCase().includes(query) ||
                booking.client?.email?.toLowerCase().includes(query) ||
                booking.description?.toLowerCase().includes(query)
            );
        }
        
        setFilteredBookings(filtered);
        setCurrentPage(1); // Reset to first page on search
    }, [searchQuery, bookings]);

    const totalPages = Math.ceil(filteredBookings.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginatedBookings = filteredBookings.slice(startIndex, startIndex + itemsPerPage);

    const fetchEmployees = async () => {
        try {
            const token = localStorage.getItem('adminToken');
            const data = await apiGet('/admin/employees', token);
            setEmployees(data || []);
        } catch (err) {
            console.error('Error fetching employees:', err);
        }
    };

    const handleReview = async (bookingId) => {
        if (!reviewAction) {
            alert('Please select an action (Accept or Reject)');
            return;
        }

        try {
            const token = localStorage.getItem('adminToken');
            await apiPost(
                `/bookings/${bookingId}/review`,
                {
                    action: reviewAction,
                    priceEstimate: priceEstimate ? Number(priceEstimate) : undefined,
                    assignedToId: assignedToId || undefined,
                    notes: notes || undefined
                },
                token
            );
            toast.success('Booking reviewed successfully!');
            setSelectedBooking(null);
            setReviewAction('');
            setPriceEstimate('');
            setAssignedToId('');
            setNotes('');
            fetchBookings();
        } catch (err) {
            toast.error('Error: ' + err.message);
        }
    };

    const bgColor = theme === 'dark' ? 'bg-gray-800' : 'bg-white';
    const cardBg = theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50';
    const textColor = theme === 'dark' ? 'text-white' : 'text-gray-900';

    const statusColors = {
        SUBMITTED: 'bg-yellow-500',
        UNDER_REVIEW: 'bg-blue-500',
        ACCEPTED: 'bg-green-500',
        REJECTED: 'bg-red-500',
        TERMS_ACCEPTED: 'bg-purple-500',
        DEPOSIT_PAID: 'bg-green-600',
        IN_PROGRESS: 'bg-indigo-500',
        DELIVERED: 'bg-teal-500',
        COMPLETED: 'bg-green-700',
        CANCELLED: 'bg-gray-500'
    };

    if (loading) {
        return (
            <div className={`p-8 ${bgColor} min-h-screen flex items-center justify-center`}>
                <LoadingSpinner size="xl" />
            </div>
        );
    }

    return (
        <div className={`p-8 ${bgColor} min-h-screen`}>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                <h1 className="text-4xl font-bold ${textColor}">Bookings Management</h1>
                <div className="flex gap-2">
                    <button
                        onClick={() => navigate('/admin/bookings')}
                        className={`px-4 py-2 rounded ${status === '' ? 'bg-blue-600 text-white' : 'bg-gray-600 text-white'}`}
                    >
                        All
                    </button>
                    <button
                        onClick={() => navigate('/admin/bookings?status=SUBMITTED')}
                        className={`px-4 py-2 rounded ${status === 'SUBMITTED' ? 'bg-blue-600 text-white' : 'bg-gray-600 text-white'}`}
                    >
                        Pending
                    </button>
                    <button
                        onClick={() => navigate('/admin/bookings?status=ACCEPTED')}
                        className={`px-4 py-2 rounded ${status === 'ACCEPTED' ? 'bg-blue-600 text-white' : 'bg-gray-600 text-white'}`}
                    >
                        Accepted
                    </button>
                </div>
            </div>

            {error && <p className="text-red-500 mb-4">{error}</p>}

            {/* Search Bar */}
            <div className="mb-6">
                <SearchBar
                    value={searchQuery}
                    onChange={setSearchQuery}
                    placeholder="Search bookings by title, client name, email, or description..."
                    className="max-w-md"
                />
            </div>

            {/* Results count */}
            <div className="mb-4 text-sm text-gray-600 dark:text-gray-400">
                Showing {paginatedBookings.length} of {filteredBookings.length} bookings
            </div>

            <div className="space-y-4 mb-6">
                {paginatedBookings.length === 0 ? (
                    <div className={`${cardBg} rounded-lg p-8 text-center`}>
                        <p className="text-gray-500">No bookings found</p>
                    </div>
                ) : (
                    paginatedBookings.map((booking) => (
                    <div
                        key={booking.id}
                        className={`${cardBg} rounded-lg p-6 cursor-pointer hover:shadow-lg`}
                        onClick={() => setSelectedBooking(booking)}
                    >
                        <div className="flex justify-between items-start">
                            <div className="flex-1">
                                <h3 className="text-xl font-bold mb-2 ${textColor}">{booking.title}</h3>
                                <p className="text-gray-600 dark:text-gray-400 mb-2">{booking.description}</p>
                                <div className="flex gap-4 text-sm">
                                    <span><strong>Client:</strong> {booking.client?.name} ({booking.client?.email})</span>
                                    <span><strong>Type:</strong> {booking.projectType}</span>
                                    {booking.assignedTo && (
                                        <span><strong>Assigned:</strong> {booking.assignedTo.firstName} {booking.assignedTo.lastName}</span>
                                    )}
                                </div>
                            </div>
                            <div className="text-right ml-4">
                                <span className={`px-3 py-1 rounded-full text-sm text-white ${statusColors[booking.status] || 'bg-gray-500'}`}>
                                    {booking.status.replace('_', ' ')}
                                </span>
                                <p className="text-xs text-gray-400 mt-2">
                                    {new Date(booking.createdAt).toLocaleDateString()}
                                </p>
                            </div>
                        </div>
                    </div>
                    ))
                )}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <PaginationControls
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={setCurrentPage}
                />
            )}

            {/* Review Modal */}
            {selectedBooking && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className={`${cardBg} rounded-lg p-8 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto`}>
                        <h2 className="text-2xl font-bold mb-4 ${textColor}">Review Booking</h2>
                        <div className="space-y-4">
                            <div>
                                <label className="block mb-2 font-semibold">Action</label>
                                <select
                                    value={reviewAction}
                                    onChange={(e) => setReviewAction(e.target.value)}
                                    className="w-full p-2 border rounded"
                                >
                                    <option value="">Select action...</option>
                                    <option value="accept">Accept</option>
                                    <option value="reject">Reject</option>
                                </select>
                            </div>
                            {reviewAction === 'accept' && (
                                <>
                                    <div>
                                        <label className="block mb-2 font-semibold">Price Estimate</label>
                                        <input
                                            type="number"
                                            value={priceEstimate}
                                            onChange={(e) => setPriceEstimate(e.target.value)}
                                            className="w-full p-2 border rounded"
                                            placeholder="Enter price estimate"
                                        />
                                    </div>
                                    <div>
                                        <label className="block mb-2 font-semibold">Assign To</label>
                                        <select
                                            value={assignedToId}
                                            onChange={(e) => setAssignedToId(e.target.value)}
                                            className="w-full p-2 border rounded"
                                        >
                                            <option value="">Select staff member...</option>
                                            {employees.map((emp) => (
                                                <option key={emp.id} value={emp.id}>
                                                    {emp.firstName} {emp.lastName} ({emp.role})
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </>
                            )}
                            <div>
                                <label className="block mb-2 font-semibold">Notes</label>
                                <textarea
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    className="w-full p-2 border rounded"
                                    rows={4}
                                    placeholder="Add notes..."
                                />
                            </div>
                        </div>
                        <div className="flex gap-4 mt-6">
                            <button
                                onClick={() => handleReview(selectedBooking.id)}
                                className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                            >
                                Submit Review
                            </button>
                            <button
                                onClick={() => {
                                    setSelectedBooking(null);
                                    setReviewAction('');
                                    setPriceEstimate('');
                                    setAssignedToId('');
                                    setNotes('');
                                }}
                                className="px-6 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default BookingsManagement;

