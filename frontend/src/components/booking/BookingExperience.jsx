import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from '../../utils/toast';
import { validators, validateForm } from '../../utils/validation';
import { API_BASE_URL } from '../../utils/constants';
import { useTheme } from '../../contexts/ThemeContext';
import { ScrollReveal, GlassmorphismCard, ParallaxSection } from '../modern';
import { useBookingSettings } from '../../hooks/useBookingSettings';
import { useServices } from '../../hooks/useServices';
import { useBookingEntryContext } from '../../hooks/useBookingEntryContext';
import {
    getBookingProgressWithTokenPath, getBookingHistoryPath,
} from '../../utils/booking/bookingRoutes';
import {
    FaUser, FaEnvelope, FaPhone, FaProjectDiagram, FaFileAlt,
    FaCloudUploadAlt, FaCreditCard, FaCheckCircle, FaArrowLeft,
    FaArrowRight, FaRocket, FaHome, FaHistory, FaPlus, FaComments,
} from 'react-icons/fa';

/**
 * Reusable, context-aware booking form.
 *
 * Accepts optional normalized props (initialService, initialPackage,
 * initialSource, initialTitle, etc.). Initial context is resolved by
 * useBookingEntryContext using the documented priority, and applied WITHOUT
 * clobbering fields the user has already edited (per-field `touched` flags).
 *
 * On success it auto-redirects to the booking progress page
 * (/bookings/:publicReference) using the server-returned trackingPath; the
 * success state offers Track / Return to Services / Book Another actions.
 */
const BookingExperience = (props = {}) => {
    const {
        initialService,
        initialServiceSlug,
        initialPackage,
        initialPackageSlug,
        initialProduct,
        initialRequestType,
        initialTitle,
        initialDescription,
        initialBudget,
        initialCurrency,
        initialSource,
        initialContact,
        redirectAfterSuccess = true,
        successRedirectPath,
        cancelRedirectPath,
        onSuccess,
        onCancel,
        onError,
        onServiceChange,
        onPackageChange,
        onStepChange,
        embedded = false,
    } = props;

    const navigate = useNavigate();
    const { colors, mode } = useTheme();
    const { settings: bookingSettings } = useBookingSettings();
    const { services } = useServices();

    const ctx = useBookingEntryContext({
        initialService, initialServiceSlug, initialPackage, initialPackageSlug,
        initialProduct, initialRequestType, initialTitle, initialDescription,
        initialBudget, initialCurrency, initialSource, initialContact,
    });

    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const [result, setResult] = useState(null);
    const [clientSecret, setClientSecret] = useState(null);

    const [formData, setFormData] = useState({
        name: initialContact?.name || '',
        email: initialContact?.email || '',
        phone: initialContact?.phone || '',
        title: '',
        description: '',
        projectType: '',
        depositRequired: false,
        depositAmount: '',
        currency: initialCurrency || 'KES',
        // workflow enrichment
        source: 'direct',
        serviceSlug: '',
        serviceTitle: '',
        packageSlug: '',
        packageTitle: '',
        requestType: '',
        quotedAmount: '',
        pricingType: '',
        repeatFromBooking: '',
    });

    const [files, setFiles] = useState([]);

    // Apply resolved context once services + verification settle. The context
    // hook only fills empty/untouched fields, implementing the no-clobber rule.
    useEffect(() => {
        setFormData((prev) => {
            const next = ctx.applyResolved(prev);
            return next;
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [ctx.context, ctx.canonicalService, ctx.verifiedPackage]);

    const bookingCopy = bookingSettings || {};
    const heroCopy = bookingCopy.hero || {};
    const labels = bookingCopy.labels || {};
    const iconMap = { FaUser, FaFileAlt, FaCloudUploadAlt, FaCreditCard };
    const baseSteps = Array.isArray(bookingCopy.steps) ? bookingCopy.steps : [];
    const paymentStep = bookingCopy.paymentStep;
    const steps = [
        ...baseSteps.map((s, idx) => ({ ...s, id: s.id || idx + 1, icon: iconMap[s.icon] || FaUser })),
        ...(formData.depositRequired && paymentStep
            ? [{ ...paymentStep, id: paymentStep.id || baseSteps.length + 1, icon: iconMap[paymentStep.icon] || FaCreditCard }]
            : []),
    ];
    const totalSteps = Math.max(steps.length, 1);
    const stepHeadings = { step1: steps[0]?.title, step2: steps[1]?.title, step3: steps[2]?.title };
    const projectTypes = Array.isArray(bookingCopy.projectTypes) ? bookingCopy.projectTypes : [];

    useEffect(() => {
        if (!projectTypes.length) return;
        const isValid = projectTypes.some((t) => t.value === formData.projectType);
        if (!isValid) {
            setFormData((prev) => ({ ...prev, projectType: projectTypes[0].value }));
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [projectTypes]);

    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        // Mark touched so a later context resolution won't overwrite this field.
        const fieldMap = { title: 'title', description: 'description' };
        if (fieldMap[name]) ctx.markTouched(fieldMap[name]);
        setFormData((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
        ctx.saveDraft({ ...formData, [name]: type === 'checkbox' ? checked : value });
    };

    const handleFileChange = (e) => setFiles(Array.from(e.target.files));

    const handleServiceSelect = (service) => {
        ctx.markTouched('service');
        setFormData((prev) => ({
            ...prev,
            serviceSlug: service?.slug || '',
            serviceTitle: service?.title || service?.name || '',
            category: service?.category,
        }));
        onServiceChange?.(service);
    };

    const handlePackageSelect = (pkg) => {
        ctx.markTouched('package');
        setFormData((prev) => ({
            ...prev,
            packageSlug: pkg?.slug || '',
            packageTitle: pkg?.name || pkg?.title || '',
            quotedAmount: pkg?.priceFrom != null ? pkg.priceFrom : prev.quotedAmount,
            pricingType: pkg?.pricingType || 'fixed',
            currency: pkg?.currency || 'KES',
        }));
        onPackageChange?.(pkg);
    };

    const handleNext = () => {
        setError('');
        if (step === 1) {
            const v = validateForm(formData, {
                name: [(v) => validators.required(v, 'Name')],
                email: [(v) => validators.required(v, 'Email'), validators.email],
                title: [(v) => validators.required(v, 'Project title')],
            });
            if (!v.isValid) {
                setError(Object.values(v.errors)[0]);
                toast.error(Object.values(v.errors)[0]);
                return;
            }
        }
        if (step === 2) {
            const v = validateForm(formData, {
                description: [(vv) => validators.required(vv, 'Description'), (vv) => validators.minLength(vv, 10, 'Description')],
            });
            if (!v.isValid) {
                setError(Object.values(v.errors)[0]);
                toast.error(Object.values(v.errors)[0]);
                return;
            }
            if (formData.depositRequired && formData.depositAmount) {
                const av = validateForm({ depositAmount: formData.depositAmount }, {
                    depositAmount: [(vv) => validators.positiveNumber(vv, 'Deposit amount')],
                });
                if (!av.isValid) {
                    setError(Object.values(av.errors)[0]);
                    toast.error(Object.values(av.errors)[0]);
                    return;
                }
            }
        }
        setStep(step + 1);
        onStepChange?.(step + 1);
    };

    const handleBack = () => {
        setError('');
        setStep(step - 1);
        onStepChange?.(step - 1);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const fd = new FormData();
            fd.append('name', formData.name);
            fd.append('email', formData.email);
            fd.append('phone', formData.phone || '');
            fd.append('title', formData.title);
            fd.append('description', formData.description);
            fd.append('projectType', formData.projectType);
            fd.append('depositRequired', formData.depositRequired);
            if (formData.depositRequired && formData.depositAmount) {
                fd.append('depositAmount', formData.depositAmount);
                fd.append('currency', formData.currency);
            }
            // Workflow enrichment — verified canonical values.
            fd.append('source', formData.source || 'direct');
            fd.append('serviceSlug', formData.serviceSlug || '');
            fd.append('serviceTitle', formData.serviceTitle || '');
            if (formData.packageSlug) {
                fd.append('packageSlug', formData.packageSlug);
                fd.append('packageTitle', formData.packageTitle || '');
            }
            if (formData.requestType) fd.append('requestType', formData.requestType);
            if (formData.quotedAmount != null && formData.quotedAmount !== '') {
                fd.append('quotedAmount', formData.quotedAmount);
                fd.append('pricingType', formData.pricingType || 'fixed');
                fd.append('currency', formData.currency || 'KES');
            }
            if (formData.repeatFromBooking) fd.append('referrerEntityId', formData.repeatFromBooking);
            try {
                fd.append('sourcePath', window.location.href);
            } catch { /* noop */ }

            files.forEach((f) => fd.append('files', f));

            const response = await fetch(`${API_BASE_URL}/bookings`, {
                method: 'POST',
                body: fd,
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Failed to create booking');

            setResult(data);
            ctx.clearContext();
            onSuccess?.(data.booking);
            toast.success('Booking submitted successfully!');

            if (data.clientSecret) {
                setClientSecret(data.clientSecret);
                setStep(4);
                return;
            }

            if (redirectAfterSuccess && data.trackingPath) {
                const target = successRedirectPath || data.trackingPath;
                setTimeout(() => {
                    navigate(target, { replace: true, state: { newlyCreated: true } });
                }, 1200);
            }
            setSuccess(true);
        } catch (err) {
            const msg = err.message || 'Failed to submit booking';
            setError(msg);
            toast.error(msg);
            onError?.(err);
        } finally {
            setLoading(false);
        }
    };

    const inputStyle = {
        backgroundColor: mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)',
        borderColor: mode === 'dark' ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)',
        color: colors.text,
    };

    if (success && !clientSecret && !redirectAfterSuccess) {
        return (
            <div className="booking-success">
                <BookingSuccessActions
                    data={result} onTrack={() => navigate(getBookingProgressWithTokenPath(result.booking, result.trackingToken))}
                    onServices={() => navigate('/services')} onAnother={() => navigate('/booking')}
                    labels={labels} colors={colors}
                />
            </div>
        );
    }

    // Auto-redirect handles the success view; render confirmation that
    // redirects after a brief, visible transition.
    if (success && !clientSecret && redirectAfterSuccess) {
        return (
            <div style={{ backgroundColor: colors.background, color: colors.text, paddingTop: '5.5rem' }} className="min-h-screen angi-page-shell--resume">
                <div className="max-w-2xl mx-auto px-4 py-20">
                    <ScrollReveal animation="scaleUp">
                        <GlassmorphismCard className="p-12 text-center">
                            <div className="w-24 h-24 rounded-full mx-auto mb-8 flex items-center justify-center" style={{ backgroundColor: `${colors.primary}20` }}>
                                <FaCheckCircle className="text-5xl" style={{ color: colors.primary }} />
                            </div>
                            {bookingCopy.success?.title && <h1 className="text-3xl font-bold mb-4" style={{ color: colors.text }}>{bookingCopy.success.title}</h1>}
                            {bookingCopy.success?.message && <p className="text-lg mb-4" style={{ color: colors.textSecondary }}>{bookingCopy.success.message}</p>}
                            <div className="inline-block px-4 py-2 rounded-lg mb-8" style={{ backgroundColor: `${colors.primary}10` }}>
                                <span style={{ color: colors.textSecondary }}>Reference: </span>
                                <span className="font-mono font-bold" style={{ color: colors.primary }}>{result?.booking?.publicReference}</span>
                            </div>
                            <p className="text-sm" style={{ color: colors.textSecondary }}>Taking you to your booking progress…</p>
                        </GlassmorphismCard>
                    </ScrollReveal>
                </div>
            </div>
        );
    }

    if (clientSecret) {
        return (
            <div style={{ backgroundColor: colors.background, color: colors.text, paddingTop: '5.5rem' }} className="min-h-screen angi-page-shell--resume">
                <div className="max-w-2xl mx-auto px-4 py-20 text-center">
                    <GlassmorphismCard className="p-12">
                        <h1 className="text-3xl font-bold mb-4">Complete your deposit</h1>
                        <p className="text-lg mb-6" style={{ color: colors.textSecondary }}>
                            Reference <span className="font-mono font-bold" style={{ color: colors.primary }}>{result?.booking?.publicReference}</span>
                        </p>
                        <p className="text-sm" style={{ color: colors.textSecondary }}>
                            Stripe checkout would mount here using <code>{clientSecret.slice(0, 12)}…</code>
                        </p>
                        <div className="flex flex-wrap justify-center gap-4 mt-8">
                            <button onClick={() => navigate(getBookingProgressWithTokenPath(result.booking, result.trackingToken))} className="inline-flex items-center gap-2 px-6 py-3 rounded-full font-semibold" style={{ background: `linear-gradient(135deg, ${colors.primary}, ${colors.primaryDark})`, color: 'white' }}><FaFileAlt /> View booking</button>
                            <button onClick={() => navigate('/')} className="inline-flex items-center gap-2 px-6 py-3 rounded-full font-semibold" style={{ backgroundColor: mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)', color: colors.text, border: `2px solid ${colors.primary}` }}><FaHome /> Home</button>
                        </div>
                    </GlassmorphismCard>
                </div>
            </div>
        );
    }

    const serviceContext = formData.serviceSlug && (services.find((s) => s.slug === formData.serviceSlug) || ctx.canonicalService);

    return (
        <div className={embedded ? 'booking-experience booking-experience--embedded' : 'booking-experience angi-page-shell--resume'}>
            <div style={{ backgroundColor: colors.background, color: colors.text, paddingTop: embedded ? '0' : '5.5rem' }} className="min-h-screen">
                {!embedded && (
                    <ParallaxSection speed={0.12} treatment="plain" className="relative py-16 overflow-hidden">
                        <div className="absolute inset-0 angi-technical-grid-soft opacity-15" />
                        <div className="relative z-10 max-w-4xl mx-auto px-4 text-center">
                            <ScrollReveal animation="fadeUp">
                                {heroCopy.badge && (
                                    <span className="inline-block px-6 py-2 rounded-full text-sm font-semibold mb-6" style={{ backgroundColor: `${colors.primary}20`, color: colors.primary, border: `1px solid ${colors.primary}40` }}>
                                        <FaRocket className="inline mr-2" />{heroCopy.badge}
                                    </span>
                                )}
                                {(heroCopy.title || heroCopy.highlight) && (
                                    <h1 className="text-4xl md:text-5xl font-bold mb-6">
                                        {heroCopy.title && <span style={{ color: colors.text }}>{heroCopy.title} </span>}
                                        {heroCopy.highlight && <span style={{ background: `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{heroCopy.highlight}</span>}
                                    </h1>
                                )}
                            </ScrollReveal>
                        </div>
                    </ParallaxSection>
                )}

                <section className="py-12 px-4">
                    <div className="max-w-3xl mx-auto">
                        <ScrollReveal animation="fadeUp">
                            <div className="mb-12">
                                <div className="flex items-center justify-between relative">
                                    <div className="absolute top-6 left-0 right-0 h-1 mx-8" style={{ backgroundColor: mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }}>
                                        <div className="h-full transition-all duration-500" style={{ width: `${((step - 1) / (totalSteps - 1 || 1)) * 100}%`, background: `linear-gradient(90deg, ${colors.primary}, ${colors.secondary})` }} />
                                    </div>
                                    {steps.map((s) => (
                                        <div key={s.id} className="relative z-10 flex flex-col items-center">
                                            <div className="w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300" style={{ background: step >= s.id ? `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})` : mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)', color: step >= s.id ? 'white' : colors.textSecondary }}>
                                                {step > s.id ? <FaCheckCircle /> : <s.icon />}
                                            </div>
                                            <span className="mt-2 text-xs font-medium hidden sm:block" style={{ color: step >= s.id ? colors.primary : colors.textSecondary }}>{s.title}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </ScrollReveal>

                        {error && (
                            <ScrollReveal animation="fadeUp">
                                <div className="mb-6 p-4 rounded-lg border" style={{ backgroundColor: `${colors.danger || '#ef4444'}15`, borderColor: colors.danger || '#ef4444', color: colors.danger || '#ef4444' }}>{error}</div>
                            </ScrollReveal>
                        )}

                        <ScrollReveal animation="fadeUp" delay={100}>
                            <GlassmorphismCard className="p-8">
                                <form onSubmit={handleSubmit}>
                                    {serviceContext && (
                                        <div className="mb-6 p-4 rounded-xl border-2 flex items-center gap-3" style={{ backgroundColor: `${colors.primary}10`, borderColor: `${colors.primary}30`, color: colors.text }}>
                                            <FaProjectDiagram style={{ color: colors.primary }} />
                                            <span>Requesting: <strong>{serviceContext.title || serviceContext.name}</strong></span>
                                        </div>
                                    )}

                                    {step === 1 && (
                                        <div className="space-y-6">
                                            {stepHeadings.step1 && <h2 className="text-2xl font-bold mb-6" style={{ color: colors.text }}>{stepHeadings.step1}</h2>}
                                            <div>
                                                <label className="block mb-2 font-medium" style={{ color: colors.text }}><FaUser className="inline mr-2" style={{ color: colors.primary }} />Name *</label>
                                                <input type="text" name="name" value={formData.name} onChange={handleInputChange} className="w-full p-4 rounded-xl border-2 focus:outline-none transition-all" style={inputStyle} placeholder="Enter your full name" required />
                                            </div>
                                            <div>
                                                <label className="block mb-2 font-medium" style={{ color: colors.text }}><FaEnvelope className="inline mr-2" style={{ color: colors.primary }} />Email *</label>
                                                <input type="email" name="email" value={formData.email} onChange={handleInputChange} className="w-full p-4 rounded-xl border-2 focus:outline-none transition-all" style={inputStyle} placeholder="Enter your email address" required />
                                            </div>
                                            <div>
                                                <label className="block mb-2 font-medium" style={{ color: colors.text }}><FaPhone className="inline mr-2" style={{ color: colors.primary }} />Phone (Optional)</label>
                                                <input type="tel" name="phone" value={formData.phone} onChange={handleInputChange} className="w-full p-4 rounded-xl border-2 focus:outline-none transition-all" style={inputStyle} placeholder="Enter your phone number" />
                                            </div>
                                            <div>
                                                <label className="block mb-2 font-medium" style={{ color: colors.text }}><FaProjectDiagram className="inline mr-2" style={{ color: colors.primary }} />Project Title *</label>
                                                <input type="text" name="title" value={formData.title} onChange={handleInputChange} className="w-full p-4 rounded-xl border-2 focus:outline-none transition-all" style={inputStyle} placeholder="Enter your project title" required />
                                            </div>
                                            {ctx.contextError === 'invalid_service' && (
                                                <div className="p-3 rounded-lg text-sm" style={{ background: `${colors.danger || '#ef4444'}15`, color: colors.danger || '#ef4444' }}>That service could not be found — please choose one below.</div>
                                            )}
                                        </div>
                                    )}

                                    {step === 2 && (
                                        <div className="space-y-6">
                                            {stepHeadings.step2 && <h2 className="text-2xl font-bold mb-6" style={{ color: colors.text }}>{stepHeadings.step2}</h2>}
                                            <div>
                                                <label className="block mb-2 font-medium" style={{ color: colors.text }}><FaFileAlt className="inline mr-2" style={{ color: colors.primary }} />Project Description *</label>
                                                <textarea name="description" rows="6" value={formData.description} onChange={handleInputChange} className="w-full p-4 rounded-xl border-2 focus:outline-none transition-all" style={inputStyle} placeholder="Describe your project, goals, and timeline" required />
                                            </div>
                                            {projectTypes.length > 0 && (
                                                <div>
                                                    <label className="block mb-2 font-medium" style={{ color: colors.text }}><FaProjectDiagram className="inline mr-2" style={{ color: colors.primary }} />Project Type</label>
                                                    <select name="projectType" value={formData.projectType} onChange={handleInputChange} className="w-full p-4 rounded-xl border-2 focus:outline-none transition-all" style={inputStyle}>
                                                        {projectTypes.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                                                    </select>
                                                </div>
                                            )}
                                            <div>
                                                <label className="block mb-2 font-medium" style={{ color: colors.text }}><FaCloudUploadAlt className="inline mr-2" style={{ color: colors.primary }} />Attachments (Optional)</label>
                                                <input type="file" multiple onChange={handleFileChange} className="w-full p-4 rounded-xl border-2 focus:outline-none transition-all" style={inputStyle} />
                                            </div>
                                        </div>
                                    )}

                                    {step === 3 && (
                                        <div className="space-y-6">
                                            {stepHeadings.step3 && <h2 className="text-2xl font-bold mb-6" style={{ color: colors.text }}>{stepHeadings.step3}</h2>}
                                            <label className="flex items-center gap-3 cursor-pointer">
                                                <input type="checkbox" name="depositRequired" checked={formData.depositRequired} onChange={handleInputChange} />
                                                <span style={{ color: colors.text }}>I'd like to pay a deposit now</span>
                                            </label>
                                            {formData.depositRequired && (
                                                <div>
                                                    <label className="block mb-2 font-medium" style={{ color: colors.text }}><FaCreditCard className="inline mr-2" style={{ color: colors.primary }} />Deposit Amount ({formData.currency})</label>
                                                    <input type="number" name="depositAmount" value={formData.depositAmount} onChange={handleInputChange} className="w-full p-4 rounded-xl border-2 focus:outline-none transition-all" style={inputStyle} placeholder="0" />
                                                </div>
                                            )}
                                            <div className="flex items-center gap-3 p-4 rounded-xl" style={{ backgroundColor: `${colors.primary}10` }}>
                                                <FaCheckCircle style={{ color: colors.primary }} />
                                                <span className="text-sm" style={{ color: colors.textSecondary }}>We'll email you a confirmation and your booking reference.</span>
                                            </div>
                                        </div>
                                    )}

                                    <div className="flex justify-between mt-8">
                                        {step > 1 ? (
                                            <button type="button" onClick={handleBack} className="inline-flex items-center gap-2 px-6 py-3 rounded-full font-semibold transition-all hover:scale-105" style={{ backgroundColor: mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)', color: colors.text }}>
                                                <FaArrowLeft /> Back
                                            </button>
                                        ) : (onCancel || cancelRedirectPath) ? (
                                            <button type="button" onClick={() => (onCancel ? onCancel() : navigate(cancelRedirectPath))} className="inline-flex items-center gap-2 px-6 py-3 rounded-full font-semibold" style={{ backgroundColor: mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)', color: colors.text }}>
                                                <FaArrowLeft /> Cancel
                                            </button>
                                        ) : <span />}

                                        {step < totalSteps ? (
                                            <button type="button" onClick={handleNext} className="inline-flex items-center gap-2 px-8 py-3 rounded-full font-semibold transition-all hover:scale-105" style={{ background: `linear-gradient(135deg, ${colors.primary}, ${colors.primaryDark})`, color: 'white' }}>
                                                Next <FaArrowRight />
                                            </button>
                                        ) : (
                                            <button type="submit" disabled={loading} className="inline-flex items-center gap-2 px-8 py-3 rounded-full font-semibold transition-all hover:scale-105 disabled:opacity-60" style={{ background: `linear-gradient(135deg, ${colors.primary}, ${colors.primaryDark})`, color: 'white' }}>
                                                {loading ? 'Submitting…' : 'Submit Booking'} <FaRocket />
                                            </button>
                                        )}
                                    </div>
                                </form>
                            </GlassmorphismCard>
                        </ScrollReveal>
                    </div>
                </section>
            </div>
        </div>
    );
};

// Shared success actions used by both redirect-on and redirect-off modes.
function BookingSuccessActions({ data, onTrack, onServices, onAnother, labels, colors }) {
    return (
        <div style={{ backgroundColor: colors.background, color: colors.text, paddingTop: '5.5rem' }} className="min-h-screen angi-page-shell--resume">
            <div className="max-w-2xl mx-auto px-4 py-20">
                <div className="text-center mb-8">
                    <FaCheckCircle className="text-5xl mx-auto mb-4" style={{ color: colors.primary }} />
                    <h1 className="text-3xl font-bold">{labels.trackTitle || 'Booking submitted'}</h1>
                    <p className="text-sm mt-2" style={{ color: colors.textSecondary }}>Reference <span className="font-mono font-bold" style={{ color: colors.primary }}>{data?.booking?.publicReference}</span></p>
                </div>
                <div className="flex flex-wrap justify-center gap-4">
                    <button onClick={onTrack} className="inline-flex items-center gap-2 px-6 py-3 rounded-full font-semibold" style={{ background: `linear-gradient(135deg, ${colors.primary}, ${colors.primaryDark})`, color: 'white' }}><FaFileAlt /> Track Booking</button>
                    <button onClick={onServices} className="inline-flex items-center gap-2 px-6 py-3 rounded-full font-semibold" style={{ backgroundColor: colors.background, color: colors.text, border: `2px solid ${colors.primary}` }}><FaArrowLeft /> Return to Services</button>
                    <button onClick={onAnother} className="inline-flex items-center gap-2 px-6 py-3 rounded-full font-semibold" style={{ backgroundColor: colors.background, color: colors.text, border: `2px solid ${colors.primary}` }}><FaPlus /> Book Another</button>
                </div>
            </div>
        </div>
    );
}

export default BookingExperience;
