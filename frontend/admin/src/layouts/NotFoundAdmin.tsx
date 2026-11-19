import { Link } from 'react-router-dom';

export function NotFoundAdmin() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-4 text-center">
      <div className="text-6xl font-bold text-[var(--text-muted)]">404</div>
      <p className="text-[var(--text-secondary)]">That page does not exist in the admin area.</p>
      <Link to="/" className="rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-primary-light)]">
        Back to Dashboard
      </Link>
    </div>
  );
}

export default NotFoundAdmin;