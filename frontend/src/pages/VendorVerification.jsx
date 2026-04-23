import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import {
  CreditCard,
  CheckCircle,
  XCircle,
  Upload,
  RefreshCw,
  ArrowRight,
  Loader2,
  AlertCircle,
  Shield,
  User,
  Hash,
} from 'lucide-react';
import api from '../services/api';

// Steps for the onboarding flow (2 steps)
const STEPS = [
  { id: 'cnic', title: 'CNIC Upload', icon: CreditCard },
  { id: 'process', title: 'Verification', icon: Shield },
];

const VendorVerification = () => {
  const navigate = useNavigate();
  const { user, refreshUser } = useAuth();
  const { showToast } = useToast();

  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState(null);

  // File states
  const [cnicFront, setCnicFront] = useState(null);
  const [cnicBack, setCnicBack] = useState(null);

  // Preview states
  const [cnicFrontPreview, setCnicFrontPreview] = useState(null);
  const [cnicBackPreview, setCnicBackPreview] = useState(null);

  // Processing results
  const [processingResults, setProcessingResults] = useState(null);

  // Fetch verification status on mount
  useEffect(() => {
    fetchVerificationStatus();
  }, []);

  const fetchVerificationStatus = async () => {
    try {
      const response = await api.get('/vendor/verification-status');
      setVerificationStatus(response.data.data);

      if (response.data.data.vendorStatus === 'verified') {
        showToast('Your account is already verified!', 'success');
        navigate('/dashboard/vendor');
      }
    } catch (err) {
      console.error('Failed to fetch verification status:', err);
    }
  };

  // File upload handler
  const handleFileChange = (e, type) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!['image/jpeg', 'image/jpg', 'image/png'].includes(file.type)) {
      showToast('Please upload a JPEG or PNG image', 'error');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      showToast('File size must be less than 5MB', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      switch (type) {
        case 'cnicFront':
          setCnicFront(file);
          setCnicFrontPreview(reader.result);
          break;
        case 'cnicBack':
          setCnicBack(file);
          setCnicBackPreview(reader.result);
          break;
      }
    };
    reader.readAsDataURL(file);
  };

  // Upload CNIC
  const uploadCNIC = async () => {
    if (!cnicFront || !cnicBack) {
      showToast('Please upload both CNIC front and back images', 'error');
      return false;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('cnicFront', cnicFront);
      formData.append('cnicBack', cnicBack);

      await api.post('/vendor/verification/cnic', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      showToast('CNIC images uploaded successfully', 'success');
      return true;
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to upload CNIC', 'error');
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Process verification
  const processVerification = async () => {
    setLoading(true);
    try {
      const response = await api.post('/vendor/verification/process');
      setProcessingResults(response.data.data);

      if (response.data.data.status === 'verified') {
        showToast('Verification successful! Your account is now active.', 'success');
        await refreshUser();
        setTimeout(() => navigate('/dashboard/vendor'), 2000);
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Verification processing failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Retry verification
  const retryVerification = async () => {
    setLoading(true);
    try {
      await api.post('/vendor/verification/retry');

      setCnicFront(null);
      setCnicBack(null);
      setCnicFrontPreview(null);
      setCnicBackPreview(null);
      setProcessingResults(null);
      setCurrentStep(0);

      showToast('You can now retry the verification process', 'success');
      await fetchVerificationStatus();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to reset verification', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Handle next step — upload CNIC then immediately process
  const handleNext = async () => {
    if (currentStep === 0) {
      const success = await uploadCNIC();
      if (success) {
        setCurrentStep(1);
        await processVerification();
      }
    }
  };

  // Render data comparison row for Steps 2 and 3
  const renderDataRow = (label, extractedValue, registeredValue, similarity, icon) => {
    const Icon = icon;
    const isMatch = similarity === 100 || similarity >= 85;

    return (
      <div className="bg-surface-light/30 rounded-lg p-4 space-y-3">
        <div className="flex items-center gap-2 text-text-secondary text-sm font-medium">
          <Icon className="w-4 h-4" />
          {label}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1">
            <span className="text-xs text-text-tertiary uppercase tracking-wider">Extracted</span>
            <div className="bg-surface rounded-lg px-4 py-3 border border-surface-light">
              <span className="text-text-primary font-mono text-sm">{extractedValue || 'N/A'}</span>
            </div>
          </div>

          {registeredValue !== undefined && (
            <div className="space-y-1">
              <span className="text-xs text-text-tertiary uppercase tracking-wider">Registered</span>
              <div className="bg-surface rounded-lg px-4 py-3 border border-surface-light">
                <span className="text-text-primary font-mono text-sm">{registeredValue || 'N/A'}</span>
              </div>
            </div>
          )}
        </div>

        {similarity !== undefined && (
          <div className="flex items-center justify-between pt-2 border-t border-surface-light/50">
            <span className="text-xs text-text-tertiary">Match</span>
            <div className="flex items-center gap-2">
              <div className="w-24 h-2 bg-surface-light rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${isMatch ? 'bg-green-500' : 'bg-red-500'}`}
                  style={{ width: `${similarity}%` }}
                />
              </div>
              <span className={`text-sm font-bold ${isMatch ? 'text-green-400' : 'text-red-400'}`}>
                {similarity}%
              </span>
              {isMatch ? <CheckCircle className="w-4 h-4 text-green-500" /> : <XCircle className="w-4 h-4 text-red-500" />}
            </div>
          </div>
        )}
      </div>
    );
  };

  // Render step content
  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <CreditCard className="w-12 h-12 text-primary-500 mx-auto mb-3" />
              <h3 className="text-xl font-semibold text-text-primary">Upload Your CNIC</h3>
              <p className="text-text-secondary mt-1">Upload clear images of both sides of your CNIC</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* CNIC Front */}
              <div className="space-y-3">
                <label className="block text-sm font-semibold text-text-primary">CNIC Front Side *</label>
                <div className={`border-2 border-dashed rounded-xl p-6 text-center transition-colors ${cnicFrontPreview ? 'border-green-500 bg-green-500/10' : 'border-surface-light hover:border-primary-500'}`}>
                  {cnicFrontPreview ? (
                    <div className="space-y-3">
                      <img src={cnicFrontPreview} alt="CNIC Front" className="max-h-40 mx-auto rounded-lg" />
                      <button onClick={() => { setCnicFront(null); setCnicFrontPreview(null); }} className="text-sm text-primary-400 hover:text-primary-300">Remove</button>
                    </div>
                  ) : (
                    <label className="cursor-pointer block">
                      <Upload className="w-10 h-10 text-text-tertiary mx-auto mb-2" />
                      <span className="text-text-secondary">Click to upload</span>
                      <input type="file" accept="image/jpeg,image/png" onChange={(e) => handleFileChange(e, 'cnicFront')} className="hidden" />
                    </label>
                  )}
                </div>
              </div>

              {/* CNIC Back */}
              <div className="space-y-3">
                <label className="block text-sm font-semibold text-text-primary">CNIC Back Side *</label>
                <div className={`border-2 border-dashed rounded-xl p-6 text-center transition-colors ${cnicBackPreview ? 'border-green-500 bg-green-500/10' : 'border-surface-light hover:border-primary-500'}`}>
                  {cnicBackPreview ? (
                    <div className="space-y-3">
                      <img src={cnicBackPreview} alt="CNIC Back" className="max-h-40 mx-auto rounded-lg" />
                      <button onClick={() => { setCnicBack(null); setCnicBackPreview(null); }} className="text-sm text-primary-400 hover:text-primary-300">Remove</button>
                    </div>
                  ) : (
                    <label className="cursor-pointer block">
                      <Upload className="w-10 h-10 text-text-tertiary mx-auto mb-2" />
                      <span className="text-text-secondary">Click to upload</span>
                      <input type="file" accept="image/jpeg,image/png" onChange={(e) => handleFileChange(e, 'cnicBack')} className="hidden" />
                    </label>
                  )}
                </div>
              </div>
            </div>

            <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4">
              <p className="text-sm text-blue-400">
                <strong>Tips:</strong> Ensure the entire card is visible with good lighting and readable text.
              </p>
            </div>
          </div>
        );

      case 1:
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <Shield className="w-12 h-12 text-primary-500 mx-auto mb-3" />
              <h3 className="text-xl font-semibold text-text-primary">Verification Results</h3>
            </div>

            {loading ? (
              <div className="text-center py-12">
                <Loader2 className="w-16 h-16 text-primary-500 mx-auto animate-spin mb-4" />
                <p className="text-text-secondary">Processing your verification...</p>
              </div>
            ) : processingResults ? (
              <div className="space-y-6">
                {/* Status Banner with Aggregate Results */}
                <div className={`rounded-xl p-6 text-center ${processingResults.status === 'verified' ? 'bg-green-500/10 border border-green-500' : 'bg-red-500/10 border border-red-500'}`}>
                  {processingResults.status === 'verified' ? (
                    <>
                      <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-3" />
                      <h4 className="text-xl font-bold text-green-400">Verification Successful</h4>
                      <p className="text-green-300 mt-2">{processingResults.stepsPassed} of {processingResults.totalSteps} checks passed</p>
                    </>
                  ) : (
                    <>
                      <XCircle className="w-16 h-16 text-red-500 mx-auto mb-3" />
                      <h4 className="text-xl font-bold text-red-400">Verification Incomplete</h4>
                      <p className="text-red-300 mt-2">{processingResults.stepsPassed} of {processingResults.totalSteps} checks passed</p>
                    </>
                  )}
                </div>

                {/* Step Results */}
                <div className="space-y-4">
                  {processingResults.steps?.map((step) => {
                    const isPassed = step.status === 'passed';
                    const isFailed = step.status === 'failed';

                    return (
                      <div
                        key={step.step}
                        className={`rounded-xl border overflow-hidden ${isPassed ? 'border-green-500/30 bg-green-500/5' : 'border-red-500/30 bg-red-500/5'}`}
                      >
                        {/* Step Header */}
                        <div className={`px-5 py-4 flex items-center gap-4 ${isPassed ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${isPassed ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}>
                            {isPassed ? <CheckCircle className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
                          </div>

                          <div className="flex-1">
                            <h6 className="font-semibold text-text-primary">{step.name}</h6>
                            {step.step === 1 && (
                              <p className={`text-sm mt-0.5 ${isFailed ? 'text-red-400' : 'text-text-secondary'}`}>
                                {isPassed ? 'Data successfully extracted from CNIC' : step.message || 'Failed to extract data'}
                              </p>
                            )}
                            {step.step !== 1 && step.message && (
                              <p className={`text-sm mt-0.5 ${isFailed ? 'text-red-400' : 'text-text-secondary'}`}>
                                {step.message}
                              </p>
                            )}
                          </div>

                          <span className={`text-xs font-bold px-3 py-1.5 rounded-full ${isPassed ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                            {isPassed ? 'PASSED' : 'FAILED'}
                          </span>
                        </div>

                        {/* Step 1: Show extraction details */}
                        {step.data && step.step === 1 && (
                          <div className="px-5 pb-4 space-y-2">
                            <div className="grid grid-cols-2 gap-4 text-sm">
                              <div className="bg-surface-light/30 rounded-lg p-3">
                                <span className="text-text-tertiary text-xs">Extracted Name</span>
                                <p className="text-text-primary font-mono mt-1">{step.data.extractedName || 'Not found'}</p>
                              </div>
                              <div className="bg-surface-light/30 rounded-lg p-3">
                                <span className="text-text-tertiary text-xs">Extracted CNIC</span>
                                <p className="text-text-primary font-mono mt-1">{step.data.extractedCNICFormatted || 'Not found'}</p>
                              </div>
                            </div>
                            {step.data.nameConfidence > 0 && (
                              <div className="text-xs text-text-tertiary flex items-center gap-2">
                                <span>Name extraction confidence: {step.data.nameConfidence}%</span>
                                <div className="w-20 h-1.5 bg-surface-light rounded-full overflow-hidden">
                                  <div className={`h-full rounded-full ${step.data.nameConfidence >= 60 ? 'bg-green-500' : 'bg-yellow-500'}`} style={{ width: `${step.data.nameConfidence}%` }} />
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Step Data - Steps 2, 3 */}
                        {step.data && step.step !== 1 && (
                          <div className="p-5 space-y-4">
                            {step.step === 2 && (
                              renderDataRow(
                                'Name Comparison',
                                step.data.extractedName,
                                step.data.registeredName,
                                step.data.similarity,
                                User
                              )
                            )}

                            {step.step === 3 && (
                              renderDataRow(
                                'CNIC Number Comparison',
                                step.data.extractedCNICFormatted || step.data.extractedCNIC,
                                step.data.registeredCNICFormatted || step.data.registeredCNIC,
                                step.data.similarity,
                                Hash
                              )
                            )}
                          </div>
                        )}

                        {/* Error Details for Step 1 if failed */}
                        {isFailed && step.step === 1 && step.error && (
                          <div className="px-5 pb-4">
                            <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3">
                              <p className="text-sm text-red-400">{step.error}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Retry Button */}
                {processingResults.status !== 'verified' && processingResults.canRetry && (
                  <div className="text-center">
                    <p className="text-text-secondary mb-4">
                      {processingResults.attemptsRemaining} attempts remaining
                    </p>
                    <button onClick={retryVerification} disabled={loading} className="btn-primary inline-flex items-center gap-2">
                      <RefreshCw className="w-4 h-4" />
                      Retry Verification
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-12">
                <AlertCircle className="w-16 h-16 text-text-tertiary mx-auto mb-4" />
                <p className="text-text-secondary">No verification results yet</p>
              </div>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-secondary-900 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="heading-2 mb-2">Vendor Verification</h1>
          <p className="text-text-secondary">Complete the verification process to unlock all vendor features</p>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-center mb-8">
          {STEPS.map((step, index) => {
            const Icon = step.icon;
            const isActive = index === currentStep;
            const isCompleted = index < currentStep;

            return (
              <div key={step.id} className="flex items-center">
                <div className={`flex flex-col items-center ${isActive ? 'text-primary-500' : isCompleted ? 'text-green-500' : 'text-text-tertiary'}`}>
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-1 ${isActive ? 'bg-primary-500 text-white' : isCompleted ? 'bg-green-500 text-white' : 'bg-surface-light'}`}>
                    {isCompleted ? <CheckCircle className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
                  </div>
                  <span className="text-xs font-medium hidden sm:block">{step.title}</span>
                </div>
                {index < STEPS.length - 1 && (
                  <div className={`w-12 h-0.5 mx-2 ${index < currentStep ? 'bg-green-500' : 'bg-surface-light'}`} />
                )}
              </div>
            );
          })}
        </div>

        {/* Main Card */}
        <div className="bg-surface rounded-2xl shadow-card border border-surface-light p-8">
          {renderStepContent()}

          {/* Navigation Buttons — only on CNIC step */}
          {currentStep === 0 && (
            <div className="flex justify-end mt-8 pt-6 border-t border-surface-light">
              <button
                onClick={handleNext}
                disabled={loading || !cnicFront || !cnicBack}
                className="btn-primary inline-flex items-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    Upload & Verify
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          )}

          {/* Back to Dashboard */}
          {(currentStep === 1 && processingResults?.status === 'verified') && (
            <div className="text-center mt-6">
              <button onClick={() => navigate('/dashboard/vendor')} className="btn-primary">
                Go to Dashboard
              </button>
            </div>
          )}
        </div>

        {/* Security Notice */}
        <div className="mt-6 bg-surface rounded-lg border border-surface-light p-4">
          <div className="flex items-start gap-3">
            <Shield className="w-5 h-5 text-primary-500 flex-shrink-0 mt-0.5" />
            <div className="text-xs text-text-secondary">
              <p className="font-semibold text-text-primary mb-1">Your Privacy Matters</p>
              <p>Your documents are securely processed for verification purposes only.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VendorVerification;