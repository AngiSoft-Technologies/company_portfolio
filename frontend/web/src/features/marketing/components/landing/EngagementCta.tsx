import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FaArrowRight, FaCalendarCheck } from 'react-icons/fa';
import { LoadingIndicator, VisualState } from '@angisoft/ui';
import { apiGet } from '@/lib/httpClient';
import { resolveAssetUrl } from '@/lib/marketing/constants';
import './EngagementCta.css';

type CtaContent = {
  eyebrow?: string;
  title?: string;
  description?: string;
  reassurance?: string;
  primaryCta?: { label?: string; to?: string };
  secondaryCta?: { label?: string; to?: string };
};
type HeroMedia = {
  backgroundVideo?: string | null;
  backgroundImage?: string | null;
  slides?: Array<{ image?: string | null; imageUrl?: string | null; poster?: string | null }>;
};

const EngagementCta = () => {
  const [content, setContent] = useState<CtaContent | null>(null);
  const [media, setMedia] = useState<HeroMedia | null>(null);
  const [loading, setLoading] = useState(true);
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    let active = true;
    Promise.all([
      apiGet<{ cta?: CtaContent }>('/site/about'),
      apiGet<HeroMedia>('/site/hero'),
    ])
      .then(([aboutData, heroData]) => {
        if (!active) return;
        setContent(aboutData?.cta || null);
        setMedia(heroData || null);
        setLoading(false);
      })
      .catch(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduceMotion(query.matches);
    update();
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);

  const imageSlide = media?.slides?.find((slide) => slide.image || slide.imageUrl || slide.poster);
  const video = resolveAssetUrl(media?.backgroundVideo || '');
  const poster = resolveAssetUrl(imageSlide?.poster || imageSlide?.image || imageSlide?.imageUrl || media?.backgroundImage || '');

  return (
    <section className="engagement-cta">
      <div className="engagement-cta__container">
        <div className="engagement-cta__copy">
          {content?.eyebrow ? <p className="engagement-cta__eyebrow">{content.eyebrow}</p> : null}
          {content?.title ? <h2 className="engagement-cta__title">{content.title}</h2> : null}
          {content?.description ? <p className="engagement-cta__description">{content.description}</p> : null}
          {content?.reassurance ? <p className="engagement-cta__reassurance">{content.reassurance}</p> : null}
          <div className="engagement-cta__actions">
            {content?.primaryCta ? (
              <Link to={content.primaryCta.to || '/contact'} className="engagement-cta__action engagement-cta__action--primary">
                <FaCalendarCheck aria-hidden="true" />
                {content.primaryCta.label}
              </Link>
            ) : null}
            {content?.secondaryCta ? (
              <Link to={content.secondaryCta.to || '/contact'} className="engagement-cta__action engagement-cta__action--secondary">
                {content.secondaryCta.label}
                <FaArrowRight aria-hidden="true" />
              </Link>
            ) : null}
          </div>
        </div>

        <div className="engagement-cta__media">
          {loading ? <LoadingIndicator variant="skeleton" size="lg" /> : null}
          {!loading && !video && !poster ? <VisualState variant="unavailable" /> : null}
          {video && !reduceMotion ? (
            <video
              className="engagement-cta__video"
              autoPlay
              loop
              muted
              playsInline
              controls={false}
              disablePictureInPicture
              disableRemotePlayback
              controlsList="nodownload nofullscreen noremoteplayback"
              poster={poster}
              preload="metadata"
            >
              <source src={video} type="video/mp4" />
            </video>
          ) : poster ? (
            <img className="engagement-cta__image" src={poster} alt="" loading="lazy" decoding="async" />
          ) : null}
          <div className="engagement-cta__media-caption" aria-hidden="true">
            <span>Operations</span>
            <span>Software</span>
            <span>Automation</span>
          </div>
        </div>
      </div>
    </section>
  );
};

export default EngagementCta;
