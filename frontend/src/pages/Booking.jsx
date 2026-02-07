import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from '../utils/toast';
import { validators, validateForm } from '../utils/validation';
import { API_BASE_URL } from '../utils/constants';
import { useTheme } from '../contexts/ThemeContext';
import { ScrollReveal, GlassmorphismCard, ParallaxSection } from '../components/modern';
import { useBookingSettings } from '../hooks/useBookingSettings';
import { 
    FaUser, FaEnvelope, FaPhone, FaProjectDiagram, FaFileAlt,
    FaCloudUploadAlt, FaCreditCard, FaCheckCircle, FaArrowLeft,
    FaArrowRight, FaRocket, FaHome
} from 'react-icons/fa';

const Booking = () => {
    const navigate = useNavigate();
    const { colors, mode } = useTheme();
    const { settings: bookingSettings } = useBookingSettings();
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const [bookingId, setBookingId] = useState(null);
    const [clientSecret, setClientSecret] = useState(null);
    
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        title: '',
        description: '',
        projectType: '',
        depositRequired: false,
        depositAmount: '',
        currency: 'KES'
    });
    
    const [files, setFiles] = useState([]);

    const bookingCopy = bookingSettings || {};
    const heroCopy = bookingCopy.hero || {};
    const labels = bookingCopy.labels || {};
    const iconMap = { FaUser, FaFileAlt, FaCloudUploadAlt, FaCreditCard };
    const baseSteps = Array.isArray(bookingCopy.steps) ? bookingCopy.steps : [];
    const paymentStep = bookingCopy.paymentStep;
    const steps = [
        ...baseSteps.map((step, idx) => ({
            ...step,
            id: step.id || idx + 1,
            icon: iconMap[step.icon] || FaUser
        })),
        ...(formData.depositRequired && paymentStep
            ? [{ ...paymentStep, id: paymentStep.id || baseSteps.length + 1, icon: iconMap[paymentStep.icon] || FaCreditCard }]
            : [])
    ];
    const totalSteps = Math.max(steps.length, 1);
    const stepHeadings = {
        step1: steps[0]?.title,
        step2: steps[1]?.title,
        step3: steps[2]?.title
    };
    const projectTypes = Array.isArray(bookingCopy.projectTypes) ? bookingCopy.projectTypes : [];

    React.useEffect(() => {
        if (!projectTypes.length) return;
        const isValid = projectTypes.some((type) => type.value === formData.projectType);
        if (!isValid) {
            setFormData((prev) => ({ ...prev, projectType: projectTypes[0].value }));
        }
    }, [projectTypes]);

    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleFileChange = (e) => {
        setFiles(Array.from(e.target.files));
    };

    const handleNext = () => {
        setError('');
        
        if (step === 1) {
            const validation = validateForm(formData, {
                name: [(v) => validators.required(v, 'Name')],
                email: [(v) => validators.required(v, 'Email'), validators.email],
                title: [(v) => validators.required(v, 'Project title')]
            });
            
            if (!validation.isValid) {
                setError(Object.values(validation.errors)[0]);
                toast.error(Object.values(validation.errors)[0]);
                return;
            }
        }
        
        if (step === 2) {
            const validation = validateForm(formData, {
                description: [(v) => validators.required(v, 'Description'), (v) => validators.minLength(v, 10, 'Description')]
            });
            
            if (!validation.isValid) {
                setError(Object.values(validation.errors)[0]);
                toast.error(Object.values(validation.errors)[0]);
                return;
            }
            
            if (formData.depositRequired && formData.depositAmount) {
                const amountValidation = validateForm({ depositAmount: formData.depositAmount }, {
                    depositAmount: [(v) => validators.positiveNumber(v, 'Deposit amount')]
                });
                
                if (!amountValidation.isValid) {
                    setError(Object.values(amountValidation.errors)[0]);
                    toast.error(Object.values(amountValidation.errors)[0]);
                    return;
                }
            }
        }
        
        setStep(step + 1);
    };

    const handleBack = () => {
        setError('');
        setStep(step - 1);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const formDataToSend = new FormData();
            formDataToSend.append('name', formData.name);
            formDataToSend.append('email', formData.email);
            formDataToSend.append('phone', formData.phone || '');
            formDataToSend.append('title', formData.title);
            formDataToSend.append('description', formData.description);
            formDataToSend.append('projectType', formData.projectType);
            formDataToSend.append('depositRequired', formData.depositRequired);
            if (formData.depositRequired && formData.depositAmount) {
                formDataToSend.append('depositAmount', formData.depositAmount);
                formDataToSend.append('currency', formData.currency);
            }
            
            files.forEach((file) => {
                formDataToSend.append('files', file);
            });

            const response = await fetch(`${API_BASE_URL}/bookings`, {
                method: 'POST',
                body: formDataToSend
            });

            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.error || 'Failed to create booking');
            }

            setBookingId(data.bookingId);
            localStorage.setItem('lastBookingId', data.bookingId);
            localStorage.setItem('lastBookingEmail', formData.email);
            
            toast.success('Booking submitted successfully!');
            
            if (data.clientSecret) {
                setClientSecret(data.clientSecret);
                setStep(4);
            } else {
                setSuccess(true);
            }
        } catch (err) {
            const errorMessage = err.message || 'Failed to submit booking';
            setError(errorMessage);
            toast.error(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    const inputStyle = {
        backgroundColor: mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)',
        borderColor: mode === 'dark' ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)',
        color: colors.text
    };

    // Success State
    if (success && !clientSecret) {
        return (
            <div style={{ backgroundColor: colors.background, color: colors.text }} className="min-h-screen">
                <div className="max-w-2xl mx-auto px-4 py-20">
                    <ScrollReveal animation="scaleUp">
                        <GlassmorphismCard className="p-12 text-center">
                            <div 
                                className="w-24 h-24 rounded-full mx-auto mb-8 flex items-center justify-center"
                                style={{ backgroundColor: `${colors.primary}20` }}
                            >
                                <FaCheckCircle 
                                    className="text-5xl"
                                    style={{ color: colors.primary }}
                                />
                            </div>
                            
                                    {bookingCopy.success?.title && (
                                        <h1 
                                            className="text-3xl font-bold mb-4"
                                            style={{ color: colors.text }}
                                        >
                                            {bookingCopy.success.title}
                                        </h1>
                            )}
                            
                            {bookingCopy.success?.message && (
                                <p 
                                    className="text-lg mb-4"
                                    style={{ color: colors.textSecondary }}
                                >
                                    {bookingCopy.success.message}
                                </p>
                            )}
                            
                            <div 
                                className="inline-block px-4 py-2 rounded-lg mb-8"
                                style={{ backgroundColor: `${colors.primary}10` }}
                            >
                                <span style={{ color: colors.textSecondary }}>Booking ID: </span>
                                <span 
                                    className="font-mono font-bold"
                                    style={{ color: colors.primary }}
                                >
                                    {bookingId}
                                </span>
                            </div>
                            
                            <div className="flex flex-wrap justify-center gap-4">
                                <button
                                    onClick={() => navigate(`/booking/${bookingId}`)}
                                    className="inline-flex items-center gap-2 px-6 py-3 rounded-full font-semibold transition-all hover:scale-105"
                                    style={{
                                        background: `linear-gradient(135deg, ${colors.primary}, ${colors.primaryDark})`,
                                        color: 'white'
                                    }}
                                >
                                    <FaFileAlt />
                                    {labels.viewStatus}
                                </button>
                                <button
                                    onClick={() => navigate('/')}
                                    className="inline-flex items-center gap-2 px-6 py-3 rounded-full font-semibold transition-all hover:scale-105"
                                    style={{
                                        backgroundColor: mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
                                        color: colors.text,
                                        border: `2px solid ${colors.primary}`
                                    }}
                                >
                                    <FaHome />
                                    {labels.returnHome}
                                </button>
                            </div>
                        </GlassmorphismCard>
                    </ScrollReveal>
                </div>
            </div>
        );
    }

    return (
        <div style={{ backgroundColor: colors.background, color: colors.text }} className="min-h-screen">
            {/* Hero Section */}
            <ParallaxSection
                speed={0.3}
                className="relative py-16 overflow-hidden"
            >
                <div 
                    className="absolute inset-0 z-0"
                    style={{
                        background: `linear-gradient(135deg, ${colors.primary}15 0%, ${colors.secondary}15 50%, ${colors.primaryDark}15 100%)`
                    }}
                />

                <div className="relative z-10 max-w-4xl mx-auto px-4 text-center">
                    <ScrollReveal animation="fadeUp">
                        {heroCopy.badge && (
                            <span 
                                className="inline-block px-6 py-2 rounded-full text-sm font-semibold mb-6"
                                style={{ 
                                    backgroundColor: `${colors.primary}20`,
                                    color: colors.primary,
                                    border: `1px solid ${colors.primary}40`
                                }}
                            >
                                <FaRocket className="inline mr-2" />
                                {heroCopy.badge}
                            </span>
                        )}
                    </ScrollReveal>
                    
                    <ScrollReveal animation="fadeUp" delay={100}>
                        {(heroCopy.title || heroCopy.highlight) && (
                            <h1 className="text-4xl md:text-5xl font-bold mb-6">
                                {heroCopy.title && (
                                    <span style={{ color: colors.text }}>{heroCopy.title} </span>
                                )}
                                {heroCopy.highlight && (
                                    <span style={{ 
                                        background: `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})`,
                                        WebkitBackgroundClip: 'text',
                                        WebkitTextFillColor: 'transparent'
                                    }}>
                                        {heroCopy.highlight}
                                    </span>
                                )}
                            </h1>
                        )}
                    </ScrollReveal>
                </div>
            </ParallaxSection>

            {/* Form Section */}
            <section className="py-12 px-4">
                <div className="max-w-3xl mx-auto">
                    {/* Progress Steps */}
                    <ScrollReveal animation="fadeUp">
                        <div className="mb-12">
                            <div className="flex items-center justify-between relative">
                                {/* Progress Line */}
                                <div 
                                    className="absolute top-6 left-0 right-0 h-1 mx-8"
                                    style={{ backgroundColor: mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }}
                                >
                                    <div 
                                        className="h-full transition-all duration-500"
                                        style={{ 
                                            width: `${((step - 1) / (totalSteps - 1 || 1)) * 100}%`,
                                            background: `linear-gradient(90deg, ${colors.primary}, ${colors.secondary})`
                                        }}
                                    />
                                </div>
                                
                                {steps.map((s, idx) => (
                                    <div 
                                        key={s.id}
                                        className="relative z-10 flex flex-col items-center"
                                    >
                                        <div 
                                            className="w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300"
                                            style={{
                                                background: step >= s.id 
                                                    ? `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})`
                                                    : mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
                                                color: step >= s.id ? 'white' : colors.textSecondary
                                            }}
                                        >
                                            {step > s.id ? (
                                                <FaCheckCircle />
                                            ) : (
                                                <s.icon />
                                            )}
                                        </div>
                                        <span 
                                            className="mt-2 text-xs font-medium hidden sm:block"
                                            style={{ 
                                                color: step >= s.id ? colors.primary : colors.textSecondary
                                            }}
                                        >
                                            {s.title}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </ScrollReveal>

                    {/* Error Display */}
                    {error && (
                        <ScrollReveal animation="fadeUp">
                            <div 
                                className="mb-6 p-4 rounded-lg border"
                                style={{ 
                                    backgroundColor: `${colors.danger || '#ef4444'}15`,
                                    borderColor: colors.danger || '#ef4444',
                                    color: colors.danger || '#ef4444'
                                }}
                            >
                                {error}
                            </div>
                        </ScrollReveal>
                    )}

                    <ScrollReveal animation="fadeUp" delay={100}>
                        <GlassmorphismCard className="p-8">
                            <form onSubmit={handleSubmit}>
                                {/* Step 1: Basic Information */}
                                {step === 1 && (
                                    <div className="space-y-6">
                                        {stepHeadings.step1 && (
                                            <h2 
                                                className="text-2xl font-bold mb-6"
                                                style={{ color: colors.text }}
                                            >
                                                {stepHeadings.step1}
                                            </h2>
                                        )}
                                        
                                        <div>
                                            <label 
                                                className="block mb-2 font-medium"
                                                style={{ color: colors.text }}
                                            >
                                                <FaUser className="inline mr-2" style={{ color: colors.primary }} />
                                                Name *
                                            </label>
                                            <input
                                                type="text"
                                                name="name"
                                                value={formData.name}
                                                onChange={handleInputChange}
                                                className="w-full p-4 rounded-xl border-2 focus:outline-none transition-all"
                                                style={{
                                                    ...inputStyle,
                                                    borderColor: inputStyle.borderColor
                                                }}
                                                placeholder="Enter your full name"
                                                required
                                            />
                                        </div>
                                        
                                        <div>
                                            <label 
                                                className="block mb-2 font-medium"
                                                style={{ color: colors.text }}
                                            >
                                                <FaEnvelope className="inline mr-2" style={{ color: colors.primary }} />
                                                Email *
                                            </label>
                                            <input
                                                type="email"
                                                name="email"
                                                value={formData.email}
                                                onChange={handleInputChange}
                                                className="w-full p-4 rounded-xl border-2 focus:outline-none transition-all"
                                                style={inputStyle}
                                                placeholder="Enter your email address"
                                                required
                                            />
                                        </div>
                                        
                                        <div>
                                            <label 
                                                className="block mb-2 font-medium"
                                                style={{ color: colors.text }}
                                            >
                                                <FaPhone className="inline mr-2" style={{ color: colors.primary }} />
                                                Phone (Optional)
                                            </label>
                                            <input
                                                type="tel"
                                                name="phone"
                                                value={formData.phone}
                                                onChange={handleInputChange}
                                                className="w-full p-4 rounded-xl border-2 focus:outline-none transition-all"
                                                style={inputStyle}
                                                placeholder="Enter your phone number"
                                            />
                                        </div>
                                        
                                        <div>
                                            <label 
                                                className="block mb-2 font-medium"
                                                style={{ color: colors.text }}
                                            >
                                                <FaProjectDiagram className="inline mr-2" style={{ color: colors.primary }} />
                                                Project Title *
                                            </label>
                                            <input
                                                type="text"
                                                name="title"
                                                value={formData.title}
                                                onChange={handleInputChange}
                                                className="w-full p-4 rounded-xl border-2 focus:outline-none transition-all"
                                                style={inputStyle}
                                                placeholder="Enter your project title"
                                                required
                                            />
                                        </div>
                                        
                                        <div>
                                            <label 
                                                className="block mb-3 font-medium"
                                                style={{ color: colors.text }}
                                            >
                                                Project Type *
                                            </label>
                                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                                {projectTypes.map((type) => (
                                                    <button
                                                        key={type.value}
                                                        type="button"
                                                        onClick={() => setFormData(prev => ({ ...prev, projectType: type.value }))}
                                                        className="p-4 rounded-xl border-2 text-left transition-all hover:scale-[1.02]"
                                                        style={{
                                                            backgroundColor: formData.projectType === type.value 
                                                                ? `${colors.primary}20` 
                                                                : inputStyle.backgroundColor,
                                                            borderColor: formData.projectType === type.value 
                                                                ? colors.primary 
                                                                : inputStyle.borderColor,
                                                            color: colors.text
                                                        }}
                                                    >
                                                        <span className="text-2xl block mb-1">{type.icon}</span>
                                                        <span className="text-sm font-medium">{type.label}</span>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Step 2: Project Details */}
                                {step === 2 && (
                                    <div className="space-y-6">
                                        {stepHeadings.step2 && (
                                            <h2 
                                                className="text-2xl font-bold mb-6"
                                                style={{ color: colors.text }}
                                            >
                                                {stepHeadings.step2}
                                            </h2>
                                        )}
                                        
                                        <div>
                                            <label 
                                                className="block mb-2 font-medium"
                                                style={{ color: colors.text }}
                                            >
                                                Description *
                                            </label>
                                            <textarea
                                                name="description"
                                                value={formData.description}
                                                onChange={handleInputChange}
                                                rows={6}
                                                className="w-full p-4 rounded-xl border-2 focus:outline-none transition-all resize-none"
                                                style={inputStyle}
                                                placeholder="Describe your project in detail..."
                                                required
                                            />
                                        </div>
                                        
                                        <div 
                                            className="p-4 rounded-xl border-2"
                                            style={{
                                                backgroundColor: `${colors.primary}10`,
                                                borderColor: `${colors.primary}30`
                                            }}
                                        >
                                            <label className="flex items-center gap-3 cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    name="depositRequired"
                                                    checked={formData.depositRequired}
                                                    onChange={handleInputChange}
                                                    className="w-5 h-5 rounded"
                                                    style={{ accentColor: colors.primary }}
                                                />
                                                <span style={{ color: colors.text }}>
                                                    I want to pay a deposit upfront
                                                </span>
                                            </label>
                                        </div>
                                        
                                        {formData.depositRequired && (
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <label 
                                                        className="block mb-2 font-medium"
                                                        style={{ color: colors.text }}
                                                    >
                                                        Deposit Amount
                                                    </label>
                                                    <input
                                                        type="number"
                                                        name="depositAmount"
                                                        value={formData.depositAmount}
                                                        onChange={handleInputChange}
                                                        className="w-full p-4 rounded-xl border-2 focus:outline-none transition-all"
                                                        style={inputStyle}
                                                        min="0"
                                                        step="0.01"
                                                        placeholder="0.00"
                                                    />
                                                </div>
                                                <div>
                                                    <label 
                                                        className="block mb-2 font-medium"
                                                        style={{ color: colors.text }}
                                                    >
                                                        Currency
                                                    </label>
                                                    <select
                                                        name="currency"
                                                        value={formData.currency}
                                                        onChange={handleInputChange}
                                                        className="w-full p-4 rounded-xl border-2 focus:outline-none transition-all"
                                                        style={inputStyle}
                                                    >
                                                        <option value="KES">KES (Kenyan Shilling)</option>
                                                        <option value="USD">USD (US Dollar)</option>
                                                        <option value="EUR">EUR (Euro)</option>
                                                    </select>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Step 3: File Uploads */}
                                {step === 3 && (
                                    <div className="space-y-6">
                                        {stepHeadings.step3 && (
                                            <h2 
                                                className="text-2xl font-bold mb-6"
                                                style={{ color: colors.text }}
                                            >
                                                {stepHeadings.step3}
                                            </h2>
                                        )}
                                        
                                        <div 
                                            className="border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all hover:border-[color:var(--primary)]"
                                            style={{ 
                                                borderColor: mode === 'dark' ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)',
                                                '--primary': colors.primary
                                            }}
                                            onClick={() => document.getElementById('file-input').click()}
                                        >
                                            <FaCloudUploadAlt 
                                                className="text-5xl mx-auto mb-4"
                                                style={{ color: colors.primary }}
                                            />
                                            <p className="font-medium mb-2" style={{ color: colors.text }}>
                                                Click to upload or drag and drop
                                            </p>
                                            <p className="text-sm" style={{ color: colors.textSecondary }}>
                                                Documents, images, or archives (max 5 files)
                                            </p>
                                            <input
                                                id="file-input"
                                                type="file"
                                                multiple
                                                onChange={handleFileChange}
                                                className="hidden"
                                            />
                                        </div>
                                        
                                        {files.length > 0 && (
                                            <div className="space-y-2">
                                                <p 
                                                    className="font-medium"
                                                    style={{ color: colors.text }}
                                                >
                                                    Selected files ({files.length}):
                                                </p>
                                                {files.map((file, idx) => (
                                                    <div 
                                                        key={idx}
                                                        className="flex items-center gap-3 p-3 rounded-xl"
                                                        style={{ backgroundColor: `${colors.primary}10` }}
                                                    >
                                                        <FaFileAlt style={{ color: colors.primary }} />
                                                        <span 
                                                            className="flex-1 truncate"
                                                            style={{ color: colors.text }}
                                                        >
                                                            {file.name}
                                                        </span>
                                                        <span 
                                                            className="text-sm"
                                                            style={{ color: colors.textSecondary }}
                                                        >
                                                            {(file.size / 1024).toFixed(1)} KB
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Navigation Buttons */}
                                <div className="flex justify-between mt-8 pt-6 border-t" style={{ borderColor: mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }}>
                                    {step > 1 ? (
                                        <button
                                            type="button"
                                            onClick={handleBack}
                                            className="inline-flex items-center gap-2 px-6 py-3 rounded-full font-semibold transition-all hover:scale-105"
                                            style={{
                                                backgroundColor: mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
                                                color: colors.text
                                            }}
                                        >
                                            <FaArrowLeft />
                                            {labels.back}
                                        </button>
                                    ) : (
                                        <div />
                                    )}
                                    
                                    {step < 3 ? (
                                        <button
                                            type="button"
                                            onClick={handleNext}
                                            className="inline-flex items-center gap-2 px-8 py-3 rounded-full font-semibold transition-all hover:scale-105"
                                            style={{
                                                background: `linear-gradient(135deg, ${colors.primary}, ${colors.primaryDark})`,
                                                color: 'white'
                                            }}
                                        >
                                            {labels.next}
                                            <FaArrowRight />
                                        </button>
                                    ) : (
                                        <button
                                            type="submit"
                                            disabled={loading}
                                            className="inline-flex items-center gap-2 px-8 py-3 rounded-full font-semibold transition-all hover:scale-105 disabled:opacity-50"
                                            style={{
                                                background: `linear-gradient(135deg, ${colors.primary}, ${colors.primaryDark})`,
                                                color: 'white'
                                            }}
                                        >
                                            {loading ? (
                                                <>
                                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                    {labels.submitting}
                                                </>
                                            ) : (
                                                <>
                                                    <FaRocket />
                                                    {labels.submit}
                                                </>
                                            )}
                                        </button>
                                    )}
                                </div>
                            </form>
                        </GlassmorphismCard>
                    </ScrollReveal>
                </div>
            </section>
        </div>
    );
};

export default Booking;
