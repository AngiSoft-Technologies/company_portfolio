import { Link } from 'react-router-dom';
import { Button } from '@angisoft/ui';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[var(--bg-primary)] px-4 text-center">
      <div className="text-[8rem] font-black leading-none text-[var(--border)]">404</div>
      <h1 className="mt-4 text-3xl font-bold text-[var(--text-primary)]">Page not found</h1>
      <p className="mt-3 max-w-md text-[var(--text-muted)]">
        The page you're looking for doesn't exist or may have been moved.
      </p>
      <div className="mt-8">
        <Link to="/">
          <Button size="lg">Back to home</Button>
        </Link>
      </div>
    </div>
  );
}