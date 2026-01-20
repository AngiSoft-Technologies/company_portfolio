import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiPost } from '../js/httpClient';
import { toast } from '../utils/toast';
import { validators, validateForm } from '../utils/validation';
import LoadingSpinner from '../components/LoadingSpinner';

const Booking = ({ theme }) => {
  const navigate = useNavigate();
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
    projectType: 'SOFTWARE',
    depositRequired: false,
    depositAmount: '',
    currency: 'KES'
  });
  
  const [files, setFiles] = useState([]);

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

      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api'}/bookings`, {
        method: 'POST',
        body: formDataToSend
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to create booking');
      }

      setBookingId(data.bookingId);
      // Store booking info for status page
      localStorage.setItem('lastBookingId', data.bookingId);
      localStorage.setItem('lastBookingEmail', formData.email);
      
      toast.success('Booking submitted successfully!');
      
      if (data.clientSecret) {
        setClientSecret(data.clientSecret);
        setStep(4); // Go to payment step
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

  const bgColor = theme === 'dark' ? 'bg-gray-900 text-white' : 'bg-white text-gray-900';
  const inputClass = theme === 'dark' 
    ? 'bg-gray-800 border-gray-700 text-white' 
    : 'bg-white border-gray-300 text-gray-900';

  if (success && !clientSecret) {
    return (
      <div className={`min-h-screen p-8 ${bgColor}`}>
        <div className="max-w-2xl mx-auto text-center py-16">
          <div className="text-6xl mb-4">✓</div>
          <h1 className="text-3xl font-bold mb-4">Booking Submitted Successfully!</h1>
          <p className="text-lg mb-8">
            Your booking has been received. We'll review it and get back to you soon.
          </p>
          <p className="text-sm text-gray-500 mb-8">Booking ID: {bookingId}</p>
          <div className="flex flex-wrap justify-center gap-4">
            <button
              onClick={() => navigate(`/booking/${bookingId}`)}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              View Booking Status
            </button>
            <button
              onClick={() => navigate('/')}
              className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
            >
              Return Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen p-8 ${bgColor}`}>
      <div className="max-w-3xl mx-auto">
        <h1 className="text-4xl font-bold mb-8 text-center bg-gradient-to-r from-teal-600 to-teal-400 bg-clip-text text-transparent">
          Request a Project
        </h1>
        
        {/* Progress indicator */}
        <div className="mb-8">
          <div className="flex justify-between mb-2">
            <span className={step >= 1 ? 'text-blue-600 font-semibold' : 'text-gray-400'}>Basic Info</span>
            <span className={step >= 2 ? 'text-blue-600 font-semibold' : 'text-gray-400'}>Details</span>
            <span className={step >= 3 ? 'text-blue-600 font-semibold' : 'text-gray-400'}>Files</span>
            {formData.depositRequired && (
              <span className={step >= 4 ? 'text-blue-600 font-semibold' : 'text-gray-400'}>Payment</span>
            )}
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all"
              style={{ width: `${(step / (formData.depositRequired ? 4 : 3)) * 100}%` }}
            ></div>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Step 1: Basic Information */}
          {step === 1 && (
            <div className="space-y-4">
              <h2 className="text-2xl font-semibold mb-4">Basic Information</h2>
              <div>
                <label className="block mb-2 font-semibold">Name *</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className={`w-full p-3 border rounded-lg ${inputClass}`}
                  required
                />
              </div>
              <div>
                <label className="block mb-2 font-semibold">Email *</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className={`w-full p-3 border rounded-lg ${inputClass}`}
                  required
                />
              </div>
              <div>
                <label className="block mb-2 font-semibold">Phone</label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  className={`w-full p-3 border rounded-lg ${inputClass}`}
                />
              </div>
              <div>
                <label className="block mb-2 font-semibold">Project Title *</label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  className={`w-full p-3 border rounded-lg ${inputClass}`}
                  required
                />
              </div>
              <div>
                <label className="block mb-2 font-semibold">Project Type *</label>
                <select
                  name="projectType"
                  value={formData.projectType}
                  onChange={handleInputChange}
                  className={`w-full p-3 border rounded-lg ${inputClass}`}
                  required
                >
                  <option value="SOFTWARE">Software Development</option>
                  <option value="RESUME">Resume/CV Writing</option>
                  <option value="DOCUMENT_EDIT">Document Editing</option>
                  <option value="REPORT">Report Writing</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleNext}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Next
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Project Details */}
          {step === 2 && (
            <div className="space-y-4">
              <h2 className="text-2xl font-semibold mb-4">Project Details</h2>
              <div>
                <label className="block mb-2 font-semibold">Description *</label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows={6}
                  className={`w-full p-3 border rounded-lg ${inputClass}`}
                  required
                />
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  name="depositRequired"
                  checked={formData.depositRequired}
                  onChange={handleInputChange}
                  className="w-4 h-4"
                />
                <label>Require deposit payment</label>
              </div>
              {formData.depositRequired && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block mb-2 font-semibold">Deposit Amount</label>
                    <input
                      type="number"
                      name="depositAmount"
                      value={formData.depositAmount}
                      onChange={handleInputChange}
                      className={`w-full p-3 border rounded-lg ${inputClass}`}
                      min="0"
                      step="0.01"
                    />
                  </div>
                  <div>
                    <label className="block mb-2 font-semibold">Currency</label>
                    <select
                      name="currency"
                      value={formData.currency}
                      onChange={handleInputChange}
                      className={`w-full p-3 border rounded-lg ${inputClass}`}
                    >
                      <option value="KES">KES</option>
                      <option value="USD">USD</option>
                      <option value="EUR">EUR</option>
                    </select>
                  </div>
                </div>
              )}
              <div className="flex justify-between">
                <button
                  type="button"
                  onClick={handleBack}
                  className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={handleNext}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Next
                </button>
              </div>
            </div>
          )}

          {/* Step 3: File Uploads */}
          {step === 3 && (
            <div className="space-y-4">
              <h2 className="text-2xl font-semibold mb-4">Upload Files (Optional)</h2>
              <div>
                <label className="block mb-2 font-semibold">Project Files</label>
                <input
                  type="file"
                  multiple
                  onChange={handleFileChange}
                  className={`w-full p-3 border rounded-lg ${inputClass}`}
                />
                <p className="text-sm text-gray-500 mt-2">
                  You can upload up to 5 files. Accepted formats: documents, images, archives.
                </p>
                {files.length > 0 && (
                  <div className="mt-4">
                    <p className="font-semibold mb-2">Selected files:</p>
                    <ul className="list-disc list-inside">
                      {files.map((file, idx) => (
                        <li key={idx}>{file.name}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
              <div className="flex justify-between">
                <button
                  type="button"
                  onClick={handleBack}
                  className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                >
                  Back
                </button>
                {formData.depositRequired ? (
                  <button
                    type="button"
                    onClick={handleNext}
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Review & Pay
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                    {loading ? (
                  <>
                    <LoadingSpinner size="sm" className="mr-2" />
                    Submitting...
                  </>
                ) : 'Submit Booking'}
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Step 4: Payment (if deposit required) */}
          {step === 4 && clientSecret && (
            <div className="space-y-4">
              <h2 className="text-2xl font-semibold mb-4">Payment</h2>
              <div className="p-4 bg-blue-50 dark:bg-blue-900 rounded-lg mb-4">
                <p className="mb-2">Deposit Amount: {formData.currency} {formData.depositAmount}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Complete your payment to finalize your booking.
                </p>
              </div>
              <div id="stripe-payment-element" className="mb-4">
                {/* Stripe Elements will be mounted here */}
                <p className="text-gray-600 dark:text-gray-400">
                  Stripe payment integration will be implemented here. For now, the booking has been created.
                </p>
              </div>
              <div className="flex justify-between">
                <button
                  type="button"
                  onClick={handleBack}
                  className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSuccess(true);
                    setClientSecret(null);
                  }}
                  className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  Skip Payment (Demo)
                </button>
              </div>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};

export default Booking;

