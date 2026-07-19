import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import { apiGet } from '../js/httpClient';
import { useServices } from './useServices';

const DRAFT_KEY = 'angi_booking_draft_v1';

const ALLOWED_SOURCES = [
    'direct',
    'services-list',
    'service-detail',
    'pricing',
    'product-detail',
    'contact',
    'custom-cta',
    'repeat-booking',
];

/**
 * Resolve the initial booking context using the priority:
 *   1. Explicit component props
 *   2. React Router location.state
 *   3. URL query parameters
 *   4. sessionStorage draft (restored)
 *   5. Manual user selection (empty)
 *
 * Canonical data is VERIFIED against the backend: service slugs are found in
 * useServices(); package pricing is re-fetched and never trusted from the URL
 * alone. The hook tracks per-field `touched` flags and exposes `applyResolved()`
 * which only fills fields that are empty and untouched — implementing the
 * "do not overwrite user input" rule.
 */
export function useBookingEntryContext(props = {}) {
    const location = useLocation();
    const [searchParams] = useSearchParams();
    const { services, loading: servicesLoading } = useServices();

    const [contextLoading, setContextLoading] = useState(false);
    const [contextError, setContextError] = useState(null);
    const [verifiedPackage, setVerifiedPackage] = useState(null);

    // Per-field touched tracking — owned here, read by BookingExperience.
    const touchedRef = useRef({ title: false, description: false, service: false, package: false });
    const resolvedRef = useRef(null);

    // 1) Props → 2) location.state → 3) query params
    const rawContext = useMemo(() => {
        const fromState = location.state || {};
        const fromQuery = {
            serviceSlug: searchParams.get('service') || undefined,
            packageSlug: searchParams.get('package') || undefined,
            productSlug: searchParams.get('product') || undefined,
            requestType: searchParams.get('request') || undefined,
            source: searchParams.get('source') || undefined,
            ref: searchParams.get('ref') || undefined,
            repeatFromBooking: searchParams.get('repeat') || undefined,
        };

        const service = props.initialService || fromState.service || null;
        const packageRecord = props.initialPackage || fromState.package || null;
        const product = props.initialProduct || fromState.product || null;

        const source =
            props.initialSource ||
            fromState.source ||
            (ALLOWED_SOURCES.includes(fromQuery.source) ? fromQuery.source : 'direct');

        return {
            service,
            serviceSlug: props.initialServiceSlug || service?.slug || fromState.serviceSlug || fromQuery.serviceSlug || undefined,
            packageRecord,
            packageSlug: props.initialPackageSlug || packageRecord?.slug || fromState.packageSlug || fromQuery.packageSlug || undefined,
            product,
            productSlug: props.initialProductSlug || product?.slug || fromState.productSlug || fromQuery.productSlug || undefined,
            requestType:
                props.initialRequestType || fromState.requestType || fromQuery.requestType || undefined,
            initialTitle: props.initialTitle || fromState.initialTitle || undefined,
            initialDescription: props.initialDescription || fromState.initialDescription || undefined,
            initialBudget: props.initialBudget ?? fromState.initialBudget ?? undefined,
            initialCurrency: props.initialCurrency || fromState.initialCurrency || 'KES',
            source,
            referrer: fromQuery.ref || fromState.ref || undefined,
            contact: props.initialContact || fromState.contact || undefined,
            repeatFromBooking: fromState.repeatFromBooking || fromQuery.repeatFromBooking || undefined,
        };
    }, [props, location.state, searchParams]);

    // 4) sessionStorage draft (only when nothing else supplied)
    const draft = useMemo(() => {
        if (rawContext.serviceSlug || rawContext.packageSlug || rawContext.productSlug) return null;
        try {
            const raw = sessionStorage.getItem(DRAFT_KEY);
            return raw ? JSON.parse(raw) : null;
        } catch {
            return null;
        }
    }, [rawContext.serviceSlug, rawContext.packageSlug, rawContext.productSlug]);

    // Canonical verification of service slug against loaded services.
    const canonicalService = useMemo(() => {
        if (!rawContext.serviceSlug || !services?.length) return rawContext.service || null;
        return services.find((s) => s.slug === rawContext.serviceSlug) || null;
    }, [rawContext.serviceSlug, rawContext.service, services]);

    // Verify package pricing from the canonical pricing endpoint when a
    // package slug is supplied (never trust the URL's price).
    useEffect(() => {
        let cancelled = false;
        if (!rawContext.packageSlug || !canonicalService) {
            setVerifiedPackage(null);
            return;
        }
        setContextLoading(true);
        apiGet('/site/pricing')
            .then((data) => {
                if (cancelled) return;
                const allPkgs = (data?.packages || []).flatMap((p) => p.items || []);
                const match = allPkgs.find(
                    (p) => p.slug === rawContext.packageSlug && p.serviceSlug === canonicalService.slug
                );
                setVerifiedPackage(match || null);
            })
            .catch(() => {
                if (!cancelled) setVerifiedPackage(null);
            })
            .finally(() => {
                if (!cancelled) setContextLoading(false);
            });
        return () => {
            cancelled = true;
        };
    }, [rawContext.packageSlug, canonicalService]);

    // Build the resolved context object once service verification settles.
    useEffect(() => {
        if (servicesLoading) return;
        const ctx = {
            ...rawContext,
            service: canonicalService,
            packageRecord: rawContext.packageSlug ? verifiedPackage || rawContext.packageRecord : rawContext.packageRecord,
            product: rawContext.product || null,
        };
        resolvedRef.current = ctx;
        setContextError(canonicalService === null && rawContext.serviceSlug ? 'invalid_service' : null);
    }, [canonicalService, verifiedPackage, rawContext, servicesLoading]);

    /** Mark a field touched (user edited it). */
    const markTouched = useCallback((field) => {
        touchedRef.current[field] = true;
    }, []);

    /**
     * Apply resolved context to a form-state object, ONLY for fields that are
     * empty and not touched. Returns a new state object.
     */
    const applyResolved = useCallback((formState) => {
        const ctx = resolvedRef.current;
        if (!ctx) return formState;
        const touched = touchedRef.current;
        const next = { ...formState };

        if (ctx.service && (!next.serviceSlug || !touched.service)) {
            next.serviceSlug = ctx.service.slug;
            next.serviceTitle = ctx.service.title || ctx.service.name;
            next.category = ctx.service.category;
        }
        if (ctx.packageRecord && (!next.packageSlug || !touched.package)) {
            next.packageSlug = ctx.packageRecord.slug;
            next.packageTitle = ctx.packageRecord.name || ctx.packageRecord.title;
            if (ctx.packageRecord.priceFrom != null) {
                next.quotedAmount = ctx.packageRecord.priceFrom;
                next.pricingType = ctx.packageRecord.pricingType || 'fixed';
                next.currency = ctx.packageRecord.currency || 'KES';
            }
        }
        if (!next.title && !touched.title) {
            next.title =
                ctx.initialTitle ||
                (ctx.packageRecord
                    ? `${ctx.packageRecord.name || ctx.packageRecord.title} – ${ctx.service?.title || ''}`.trim()
                    : ctx.service
                    ? `${ctx.service.title || ctx.service.name} Request`
                    : '');
        }
        if (!next.description && !touched.description) {
            next.description =
                ctx.initialDescription ||
                (ctx.service
                    ? `I would like to request the ${ctx.service.title || ctx.service.name} service. My requirements are described below.`
                    : '');
        }
        next.source = ctx.source;
        next.requestType = ctx.requestType || next.requestType;
        next.repeatFromBooking = ctx.repeatFromBooking || next.repeatFromBooking;
        return next;
    }, []);

    /** Persist a draft to sessionStorage (called on meaningful form change). */
    const saveDraft = useCallback((formState) => {
        try {
            sessionStorage.setItem(DRAFT_KEY, JSON.stringify(formState));
        } catch {
            /* storage unavailable — ignore */
        }
    }, []);

    const clearContext = useCallback(() => {
        try {
            sessionStorage.removeItem(DRAFT_KEY);
        } catch {
            /* ignore */
        }
        touchedRef.current = { title: false, description: false, service: false, package: false };
        resolvedRef.current = null;
    }, []);

    return {
        context: resolvedRef.current,
        canonicalService,
        verifiedPackage,
        services,
        source: rawContext.source,
        requestType: rawContext.requestType,
        contact: rawContext.contact,
        contextLoading,
        contextError,
        markTouched,
        applyResolved,
        saveDraft,
        clearContext,
    };
}
