import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { apiPost } from '../js/httpClient';
import { useTheme } from '../contexts/ThemeContext';
import GlassmorphismCard from '../components/modern/GlassmorphismCard';

const ClientPortalAccess = () => {
  const { colors } = useTheme();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState('Verifying your secure access link...');
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const token = searchParams.get('token');
    if (!token) {
      setFailed(true);
      setStatus('This portal link is missing a token.');
      return;
    }

    apiPost('/client-portal/session', { token })
      .then((response) => {
        localStorage.setItem('clientPortalToken', response.accessToken);
        navigate('/portal', { replace: true });
      })
      .catch(() => {
        setFailed(true);
        setStatus('This portal link is invalid or expired. Request a fresh secure link.');
      });
  }, [navigate, searchParams]);

  return (
    <section className="min-h-screen px-4 py-20" style={{ background: `linear-gradient(135deg, ${colors.background}, ${colors.backgroundTertiary})` }}>
      <div className="mx-auto max-w-xl">
        <GlassmorphismCard glow className="p-8 text-center">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl text-3xl text-white" style={{ background: `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})` }}>A</div>
          <h1 className="text-3xl font-black" style={{ color: colors.text }}>AngiSoft Client Portal</h1>
          <p className="mt-4" style={{ color: colors.textSecondary }}>{status}</p>
          {failed && <Link to="/portal/request" className="mt-6 inline-flex rounded-full px-6 py-3 font-bold text-white" style={{ background: `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})` }}>Request new link</Link>}
        </GlassmorphismCard>
      </div>
    </section>
  );
};

export default ClientPortalAccess;
