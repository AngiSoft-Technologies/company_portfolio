import { Link } from 'react-router-dom';
import { VisualState } from '@angisoft/ui';
import { getBookingLookupPath } from '@/lib/marketing/booking/bookingRoutes';

const BookingAccessError = () => (
    <div className="booking-access-error">
        <VisualState variant="error" />
        <Link to={getBookingLookupPath()} className="btn btn-primary">Track a Booking</Link>
    </div>
);

export default BookingAccessError;
