import { forwardRef, type ImgHTMLAttributes } from 'react';

/** Additional <source> entry, e.g. an art-directed crop with a `media` query. */
export interface ImageSource {
  srcSet: string;
  type?: string;
  media?: string;
  sizes?: string;
}

export interface OptimizedImageProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'src' | 'srcSet'> {
  /** Original-format URL; used by the <img> fallback when AVIF/WebP is unsupported. */
  src: string;
  alt: string;
  /** `?format=avif&as=srcset` output from vite-imagetools. */
  avifSrcSet?: string;
  /** `?format=webp&as=srcset` output from vite-imagetools. */
  webpSrcSet?: string;
  /** Optional responsive srcset for the original-format fallback <img>. */
  fallbackSrcSet?: string;
  /** Art-directed sources; rendered before the AVIF/WebP sources. */
  sources?: readonly ImageSource[];
  /** Above-the-fold images: eager load + high fetch priority. */
  priority?: boolean;
  /** Classes for the wrapping <picture> element. */
  wrapperClassName?: string;
}

/**
 * Phase 5.7 responsive image with AVIF/WebP sources and an original-format
 * fallback. Always pass intrinsic `width`/`height` (or CSS `aspect-ratio`) to
 * avoid CLS; `<picture>` itself is display:block so inline gaps do not appear.
 *
 * ```tsx
 * import hero from './hero.jpg';
 * import avif from './hero.jpg?w=480;960;1440&format=avif&as=srcset';
 * import webp from './hero.jpg?w=480;960;1440&format=webp&as=srcset';
 *
 * <OptimizedImage
 *   src={hero}
 *   avifSrcSet={avif}
 *   webpSrcSet={webp}
 *   alt="Our studio"
 *   width={1440}
 *   height={720}
 *   sizes="(max-width: 768px) 100vw, 720px"
 *   priority
 * />;
 * ```
 */
const OptimizedImage = forwardRef<HTMLImageElement, OptimizedImageProps>(
  (
    {
      src,
      alt,
      avifSrcSet,
      webpSrcSet,
      fallbackSrcSet,
      sources,
      sizes,
      priority = false,
      wrapperClassName = '',
      className = '',
      loading,
      fetchPriority,
      decoding = 'async',
      ...rest
    },
    ref,
  ) => (
    <picture className={`block max-w-full ${wrapperClassName}`}>
      {sources?.map((source, index) => (
        <source
          key={`${source.srcSet}-${index}`}
          srcSet={source.srcSet}
          type={source.type}
          media={source.media}
          sizes={source.sizes ?? sizes}
        />
      ))}
      {avifSrcSet ? <source srcSet={avifSrcSet} sizes={sizes} type="image/avif" /> : null}
      {webpSrcSet ? <source srcSet={webpSrcSet} sizes={sizes} type="image/webp" /> : null}
      <img
        ref={ref}
        src={src}
        srcSet={fallbackSrcSet}
        sizes={sizes}
        alt={alt}
        loading={loading ?? (priority ? 'eager' : 'lazy')}
        fetchPriority={fetchPriority ?? (priority ? 'high' : undefined)}
        decoding={decoding}
        className={className}
        {...rest}
      />
    </picture>
  ),
);

OptimizedImage.displayName = 'OptimizedImage';

export { OptimizedImage };
export default OptimizedImage;
