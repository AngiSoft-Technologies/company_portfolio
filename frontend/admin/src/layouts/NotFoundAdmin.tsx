import { Link } from 'react-router-dom';

export function NotFoundAdmin() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-4 text-center">
      <div className="text-6xl font-bold text-slate-300">404</div>
      <p className="text-slate-600">That page does not exist in the admin area.</p>
      <Link to="/admin" className="rounded-lg bg-[#0875FF] px-4 py-2 text-sm font-medium text-white hover:bg-[#3B9AFF]">
        Back to Dashboard
      </Link>
    </div>
  );
}

export default NotFoundAdmin;