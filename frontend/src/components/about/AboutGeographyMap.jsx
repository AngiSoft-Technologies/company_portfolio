import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import {
  FaCheck,
} from 'react-icons/fa';

import {
  resolveAssetUrl,
} from '../../utils/constants';

const DEFAULT_COLORS = [
  '#0A3DFF',
  '#FF9F1C',
  '#39FF6A',
];

const DEFAULT_CONTENT = {
  enabled: true,

  title:
    'Our Geography',

  intro:
    'Headquartered in Nairobi and operating through direct and remote collaboration, AngiSoft serves clients and develops solutions for Kenyan, East African and wider African needs.',

  /*
   * Store this inside:
   * frontend/public/images/about/geography/
   *
   * Do not route it through Railway uploads unless
   * that static route has been fully fixed.
   */
  mapImageUrl:
    '/images/about/geography/world-map-dots-light.svg',

  mapAlt:
    'Map showing AngiSoft Technologies delivery reach',

  regions: [
    {
      id:
        'kenya',

      title:
        'Kenya',

      lineOne:
        'Operating base: Nairobi',

      lineTwo:
        'Direct and remote delivery',

      color:
        '#0A3DFF',
    },

    {
      id:
        'east-africa',

      title:
        'East Africa',

      lineOne:
        'Primary regional market',

      lineTwo:
        'Product and project collaboration',

      color:
        '#FF9F1C',
    },

    {
      id:
        'africa',

      title:
        'Africa',

      lineOne:
        'Long-term product reach',

      lineTwo:
        'Remote digital delivery',

      color:
        '#39FF6A',
    },
  ],

  locations: [
    {
      id:
        'nairobi',

      label:
        'Nairobi, Kenya',

      detail:
        'AngiSoft headquarters',

      x:
        62,

      y:
        68,

      regionIndex:
        0,

      labelPosition:
        'right',
    },

    {
      id:
        'east-africa',

      label:
        'East Africa',

      detail:
        'Primary growth region',

      x:
        65,

      y:
        58,

      regionIndex:
        1,

      labelPosition:
        'right',
    },

    {
      id:
        'remote-delivery',

      label:
        'Remote Delivery',

      detail:
        'Digital collaboration',

      x:
        48,

      y:
        35,

      regionIndex:
        2,

      labelPosition:
        'above',
    },
  ],

  delivery: {
    enabled:
      true,

    introduction:
      'From Nairobi, AngiSoft delivers software and digital services through direct and remote collaboration. Our clients benefit from practical technical support, flexible communication and solutions designed around real operational needs.',

    benefits: [
      {
        id:
          'cross-functional',

        title:
          'Cross-functional capability across software, data, systems and digital services',
      },

      {
        id:
          'remote-collaboration',

        title:
          'Flexible remote collaboration for clients beyond Nairobi',
      },

      {
        id:
          'project-coordination',

        title:
          'Structured project coordination, milestones and progress communication',
      },

      {
        id:
          'technology-flexibility',

        title:
          'Technology choices aligned with project requirements and available infrastructure',
      },

      {
        id:
          'security-awareness',

        title:
          'Security-conscious development, access control and responsible data handling',
      },

      {
        id:
          'continued-support',

        title:
          'Support for maintenance, upgrades, troubleshooting and continued improvement',
      },
    ],
  },
};

const normalizeRegion = (
  region,
  index
) => ({
  id:
    region?.id ||
    `geography-region-${index}`,

  title:
    region?.title ||
    '',

  lineOne:
    region?.lineOne ||
    region?.description ||
    '',

  lineTwo:
    region?.lineTwo ||
    '',

  color:
    region?.color ||
    DEFAULT_COLORS[
      index %
        DEFAULT_COLORS.length
    ],
});

const normalizeLocation = (
  location,
  index,
  regions
) => {
  const parsedRegionIndex =
    Number(
      location?.regionIndex
    );

  const regionIndex =
    Number.isFinite(
      parsedRegionIndex
    )
      ? parsedRegionIndex
      : 0;

  const parsedX =
    Number(location?.x);

  const parsedY =
    Number(location?.y);

  return {
    id:
      location?.id ||
      `map-location-${index}`,

    label:
      location?.label ||
      location?.title ||
      '',

    detail:
      location?.detail ||
      '',

    x:
      Number.isFinite(parsedX)
        ? parsedX
        : 50,

    y:
      Number.isFinite(parsedY)
        ? parsedY
        : 50,

    labelPosition:
      location?.labelPosition ||
      'right',

    color:
      location?.color ||
      regions[
        regionIndex
      ]?.color ||
      DEFAULT_COLORS[
        regionIndex %
          DEFAULT_COLORS.length
      ],
  };
};

const normalizeBenefit = (
  benefit,
  index
) => {
  if (
    typeof benefit ===
    'string'
  ) {
    return {
      id:
        `delivery-benefit-${index}`,

      title:
        benefit,
    };
  }

  return {
    id:
      benefit?.id ||
      `delivery-benefit-${index}`,

    title:
      benefit?.title ||
      benefit?.text ||
      benefit?.description ||
      '',
  };
};

const resolveMapImageUrl = (
  imageUrl
) => {
  if (!imageUrl) {
    return '';
  }

  /*
   * Frontend public files should remain frontend-relative.
   */
  if (
    imageUrl.startsWith(
      '/images/'
    ) ||
    imageUrl.startsWith(
      '/assets/'
    )
  ) {
    return imageUrl;
  }

  /*
   * Uploaded media may need the API host.
   */
  return resolveAssetUrl(
    imageUrl
  );
};

const AboutGeographyMap = ({
  content = {},
}) => {
  const sectionRef =
    useRef(null);

  const [visible, setVisible] =
    useState(false);

  const [
    mapLoadFailed,
    setMapLoadFailed,
  ] = useState(false);

  const data = useMemo(
    () => ({
      ...DEFAULT_CONTENT,
      ...(content || {}),

      delivery: {
        ...DEFAULT_CONTENT.delivery,
        ...(content?.delivery || {}),
      },
    }),
    [content]
  );

  const regions = useMemo(() => {
    const source =
      Array.isArray(
        data.regions
      ) &&
      data.regions.length
        ? data.regions
        : DEFAULT_CONTENT.regions;

    return source
      .slice(0, 3)
      .map(normalizeRegion)
      .filter(
        (region) =>
          region.title
      );
  }, [data.regions]);

  const locations = useMemo(() => {
    const source =
      Array.isArray(
        data.locations
      ) &&
      data.locations.length
        ? data.locations
        : DEFAULT_CONTENT.locations;

    return source
      .map(
        (
          location,
          index
        ) =>
          normalizeLocation(
            location,
            index,
            regions
          )
      )
      .filter(
        (location) =>
          location.label
      );
  }, [
    data.locations,
    regions,
  ]);

  const benefits = useMemo(() => {
    const source =
      Array.isArray(
        data.delivery?.benefits
      ) &&
      data.delivery
        .benefits.length
        ? data.delivery
            .benefits
        : DEFAULT_CONTENT
            .delivery
            .benefits;

    return source
      .map(
        normalizeBenefit
      )
      .filter(
        (benefit) =>
          benefit.title
      );
  }, [
    data.delivery?.benefits,
  ]);

  useEffect(() => {
    const node =
      sectionRef.current;

    if (!node) {
      return undefined;
    }

    const reducedMotion =
      window.matchMedia(
        '(prefers-reduced-motion: reduce)'
      ).matches;

    if (reducedMotion) {
      setVisible(true);
      return undefined;
    }

    const observer =
      new IntersectionObserver(
        ([entry]) => {
          if (
            entry.isIntersecting
          ) {
            setVisible(true);
            observer.disconnect();
          }
        },
        {
          threshold: 0.08,
        }
      );

    observer.observe(node);

    return () => {
      observer.disconnect();
    };
  }, []);

  if (
    data.enabled === false
  ) {
    return null;
  }

  if (
    !data.title &&
    !data.intro &&
    !regions.length &&
    !benefits.length
  ) {
    return null;
  }

  const mapSrc =
    resolveMapImageUrl(
      data.mapImageUrl
    );

  return (
    <section
      ref={sectionRef}
      id="about-geography"
      className="about-geography bg-[#07142B] py-16 md:py-20 lg:py-24"
      aria-labelledby="about-geography-heading"
    >
      <div className="container">
        {/* Heading */}
        <header
          className={`text-center transition duration-700 ${
            visible
              ? 'translate-y-0 opacity-100'
              : 'translate-y-4 opacity-0'
          }`}
        >
          <h2
            id="about-geography-heading"
            className="text-3xl font-bold tracking-[-0.035em] text-white md:text-4xl"
            style={{
              fontFamily:
                'Sora, sans-serif',
            }}
          >
            {data.title}
          </h2>

          {data.intro && (
            <p className="mx-auto mt-5 max-w-4xl text-sm leading-7 text-white/65 md:text-base">
              {data.intro}
            </p>
          )}
        </header>

        {/* Regional summaries */}
        {regions.length > 0 && (
          <div className="about-geography-regions mx-auto mt-8 grid max-w-5xl gap-6 sm:grid-cols-3">
            {regions.map(
              (
                region,
                index
              ) => (
                <article
                  key={region.id}
                  className={`text-center transition duration-700 ${
                    visible
                      ? 'translate-y-0 opacity-100'
                      : 'translate-y-4 opacity-0'
                  }`}
                  style={{
                    transitionDelay:
                      `${
                        80 +
                        index *
                          80
                      }ms`,
                  }}
                >
                  <h3
                    className="text-sm font-bold md:text-base"
                    style={{
                      color:
                        region.color,
                    }}
                  >
                    {region.title}
                  </h3>

                  {region.lineOne && (
                    <p className="mt-1 text-xs leading-5 text-white/65">
                      {region.lineOne}
                    </p>
                  )}

                  {region.lineTwo && (
                    <p className="text-xs leading-5 text-white/42">
                      {region.lineTwo}
                    </p>
                  )}
                </article>
              )
            )}
          </div>
        )}

        {/* World map */}
        <div
          className={`about-geography-map mt-8 transition duration-1000 ${
            visible
              ? 'translate-y-0 opacity-100'
              : 'translate-y-6 opacity-0'
          }`}
          style={{
            transitionDelay:
              '220ms',
          }}
        >
          <div className="about-geography-map-canvas">
            {!mapLoadFailed &&
            mapSrc ? (
              <img
                src={mapSrc}
                alt={
                  data.mapAlt ||
                  DEFAULT_CONTENT.mapAlt
                }
                loading="lazy"
                className="about-geography-map-image"
                onError={() => {
                  setMapLoadFailed(
                    true
                  );
                }}
              />
            ) : (
              <MapFallback />
            )}

            {locations.map(
              (location) => (
                <MapLocation
                  key={
                    location.id
                  }
                  location={
                    location
                  }
                />
              )
            )}
          </div>
        </div>

        {/* Delivery copy and benefits — same section */}
        {data.delivery
          ?.enabled !== false &&
          (
            data.delivery
              ?.introduction ||
            benefits.length > 0
          ) && (
            <div
              className={`about-geography-delivery mt-10 border-t border-white/10 pt-8 transition duration-700 md:mt-12 md:pt-10 ${
                visible
                  ? 'translate-y-0 opacity-100'
                  : 'translate-y-5 opacity-0'
              }`}
              style={{
                transitionDelay:
                  '300ms',
              }}
            >
              {data.delivery
                ?.introduction && (
                <p className="max-w-6xl text-sm leading-7 text-white/66 md:text-base">
                  {
                    data.delivery
                      .introduction
                  }
                </p>
              )}

              {benefits.length >
                0 && (
                <div className="mt-6 grid gap-x-10 gap-y-3 md:grid-cols-2">
                  {benefits.map(
                    (
                      benefit,
                      index
                    ) => (
                      <article
                        key={
                          benefit.id
                        }
                        className="about-geography-benefit flex items-start gap-3"
                      >
                        <span
                          className="mt-[7px] flex h-4 w-4 shrink-0 items-center justify-center border border-[#00C2FF]/55 text-[7px] text-[#00C2FF]"
                          aria-hidden="true"
                        >
                          <FaCheck />
                        </span>

                        <p className="text-xs leading-6 text-white/62 md:text-sm">
                          {
                            benefit.title
                          }
                        </p>
                      </article>
                    )
                  )}
                </div>
              )}
            </div>
          )}
      </div>
    </section>
  );
};

const MapLocation = ({
  location,
}) => {
  const position =
    location.labelPosition;

  const labelClass =
    position === 'left'
      ? 'right-5 top-1/2 -translate-y-1/2 text-right'
      : position ===
          'above'
        ? 'bottom-5 left-1/2 -translate-x-1/2 text-center'
        : position ===
            'below'
          ? 'left-1/2 top-5 -translate-x-1/2 text-center'
          : 'left-5 top-1/2 -translate-y-1/2 text-left';

  return (
    <div
      className="about-map-location"
      style={{
        left:
          `${location.x}%`,

        top:
          `${location.y}%`,

        '--location-color':
          location.color,
      }}
    >
      <span
        className="about-map-location-dot"
        aria-hidden="true"
      />

      <div
        className={`about-map-label ${labelClass}`}
      >
        <p
          className="about-map-label-title"
          style={{
            color:
              location.color,
          }}
        >
          {location.label}
        </p>

        {location.detail && (
          <p className="about-map-label-detail">
            {location.detail}
          </p>
        )}
      </div>
    </div>
  );
};

const MapFallback = () => (
  <div className="about-geography-map-fallback">
    <div
      className="about-geography-map-fallback-grid"
      aria-hidden="true"
    />

    <p>
      AngiSoft digital delivery
    </p>
  </div>
);

export default AboutGeographyMap;