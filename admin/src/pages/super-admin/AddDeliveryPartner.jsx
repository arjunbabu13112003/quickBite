import React, { useState, useRef, useEffect } from 'react';
import { 
  Bike,
  ChevronRight, 
  ChevronDown,
  AlertTriangle,
  Loader2,
  X,
  Lock,
  Eye,
  EyeOff,
  Upload,
  FileText,
  CheckCircle2,
  User,
  Trash2,
  RotateCcw
} from 'lucide-react';
import { api } from '../../services/api';

const SUGGESTED_ZONES = [
  'Kochi Central',
  'Kadavanthra',
  'Panampilly Nagar',
  'Vyttila',
  'Kaloor',
  'Edappally',
  'Fort Kochi'
];

function SearchableSelect({
  label,
  value,
  onChange,
  options,
  placeholder,
  error,
  isOptional = false,
  inputStyle,
  labelStyle,
  errorTextStyle,
  formGroupStyle
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const containerRef = useRef(null);

  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    window.addEventListener('click', handleOutsideClick);
    return () => window.removeEventListener('click', handleOutsideClick);
  }, []);

  const handleToggle = (e) => {
    e.stopPropagation();
    setIsOpen(!isOpen);
    setSearchQuery('');
  };

  const handleSelectOption = (opt) => {
    onChange(opt);
    setIsOpen(false);
    setSearchQuery('');
  };

  const filteredOptions = options.filter(opt =>
    opt.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const showCustomOption = searchQuery.trim() !== '' && !options.some(opt => opt.toLowerCase() === searchQuery.trim().toLowerCase());

  return (
    <div ref={containerRef} style={{ ...formGroupStyle, position: 'relative' }}>
      <label style={labelStyle}>
        {label} {!isOptional && <span style={{ color: 'var(--primary)' }}>*</span>}
      </label>
      
      <div style={{ position: 'relative' }}>
        <input
          type="text"
          value={isOpen ? searchQuery : (value || (isOptional ? 'None' : ''))}
          onChange={(e) => {
            if (!isOpen) setIsOpen(true);
            setSearchQuery(e.target.value);
          }}
          onClick={(e) => {
            e.stopPropagation();
            setIsOpen(true);
          }}
          placeholder={isOpen ? "Type to search or add..." : (placeholder || "Select option...")}
          style={{
            ...inputStyle,
            cursor: 'text',
            border: error ? '1px solid #dc2626' : '1px solid var(--border-color)',
            paddingRight: '2.5rem'
          }}
        />
        <button
          type="button"
          onClick={handleToggle}
          style={{
            position: 'absolute',
            right: '10px',
            top: '50%',
            transform: 'translateY(-50%)',
            background: 'transparent',
            border: 'none',
            color: 'var(--text-muted)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 0
          }}
        >
          <ChevronDown size={16} style={{ transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
        </button>
      </div>

      {error && <span style={errorTextStyle}>{error}</span>}

      {isOpen && (
        <div style={{
          position: 'absolute',
          top: 'calc(100% + 4px)',
          left: 0,
          right: 0,
          background: 'var(--bg-card)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-md)',
          boxShadow: 'var(--shadow-lg)',
          zIndex: 50,
          maxHeight: '200px',
          overflowY: 'auto',
          padding: '4px'
        }}>
          {isOptional && searchQuery === '' && (
            <div
              onClick={() => handleSelectOption('')}
              style={{
                padding: '0.6rem 0.8rem',
                fontSize: '0.88rem',
                color: value === '' ? 'var(--primary)' : 'var(--text-main)',
                backgroundColor: value === '' ? 'var(--bg-main)' : 'transparent',
                borderRadius: 'var(--radius-sm)',
                cursor: 'pointer',
                fontWeight: value === '' ? '800' : 'normal'
              }}
            >
              None
            </div>
          )}
          {filteredOptions.map((opt) => (
            <div
              key={opt}
              onClick={() => handleSelectOption(opt)}
              style={{
                padding: '0.6rem 0.8rem',
                fontSize: '0.88rem',
                color: value === opt ? 'var(--primary)' : 'var(--text-main)',
                backgroundColor: value === opt ? 'var(--bg-main)' : 'transparent',
                borderRadius: 'var(--radius-sm)',
                cursor: 'pointer',
                fontWeight: value === opt ? '800' : 'normal'
              }}
            >
              {opt}
            </div>
          ))}
          {showCustomOption && (
            <div
              onClick={() => handleSelectOption(searchQuery.trim())}
              style={{
                padding: '0.6rem 0.8rem',
                fontSize: '0.88rem',
                color: 'var(--primary)',
                borderTop: '1px solid var(--border-color)',
                cursor: 'pointer',
                fontWeight: '800'
              }}
            >
              + Add "{searchQuery.trim()}"
            </div>
          )}
          {filteredOptions.length === 0 && !showCustomOption && (
            <div style={{ padding: '0.6rem 0.8rem', fontSize: '0.88rem', color: 'var(--text-muted)' }}>
              No zones found
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function AddDeliveryPartner({ onNavigate }) {
  const [formData, setFormData] = useState({
    name: '',
    mobileNumber: '',
    email: '',
    password: '',
    vehicleType: 'Bike',
    vehicleNumber: '',
    licenseNumber: '',
    preferredZone: 'Kochi Central',
    secondaryZone: '',
    deliveryType: 'Full Time',
    accountHolderName: '',
    bankAccountNumber: '',
    confirmBankAccountNumber: '',
    ifscCode: '',
    upiId: '',
  });

  const [validationErrors, setValidationErrors] = useState({});
  const [fileErrors, setFileErrors] = useState({});
  const [apiError, setApiError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [successData, setSuccessData] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);

  // File Upload states (Frontend file references)
  const [profilePhoto, setProfilePhoto] = useState(null);
  const [drivingLicense, setDrivingLicense] = useState(null);
  const [vehicleRc, setVehicleRc] = useState(null);
  const [vehicleInsurance, setVehicleInsurance] = useState(null);

  const profilePhotoInputRef = useRef(null);
  const drivingLicenseInputRef = useRef(null);
  const vehicleRcInputRef = useRef(null);
  const vehicleInsuranceInputRef = useRef(null);

  // Reactively validate zones on change
  useEffect(() => {
    let prefErr = '';
    let secErr = '';

    if (!formData.preferredZone) {
      prefErr = 'Preferred Delivery Zone is required.';
    }

    if (formData.secondaryZone && formData.preferredZone === formData.secondaryZone) {
      secErr = 'Secondary zone must be different from preferred zone.';
    }

    setValidationErrors(prev => {
      const next = { ...prev };
      if (prefErr) next.preferredZone = prefErr;
      else delete next.preferredZone;

      if (secErr) next.secondaryZone = secErr;
      else delete next.secondaryZone;

      return next;
    });
  }, [formData.preferredZone, formData.secondaryZone]);

  const validateField = (name, value) => {
    let err = '';
    const valTrim = (value || '').trim();

    if (name === 'name') {
      if (!valTrim) {
        err = 'Please enter a valid full name.';
      } else if (valTrim.length < 2 || !/^[a-zA-Z\s'-]+$/.test(valTrim)) {
        err = 'Please enter a valid full name.';
      }
    }

    if (name === 'mobileNumber') {
      let rawMobile = valTrim.replace(/^\+91\s*/, '').replace(/^91\s*/, '').replace(/[\s-]/g, '');
      if (!rawMobile || !/^\d{10}$/.test(rawMobile)) {
        err = 'Enter a valid 10-digit mobile number.';
      }
    }

    if (name === 'email') {
      if (!valTrim || !/\S+@\S+\.\S+/.test(valTrim)) {
        err = 'Enter a valid email address.';
      }
    }

    if (name === 'password') {
      if (!value || value.length < 8) {
        err = 'Password must be at least 8 characters.';
      }
    }

    if (name === 'vehicleNumber' && formData.vehicleType !== 'Bicycle') {
      const normVeh = valTrim.replace(/[\s-]/g, '').toUpperCase();
      if (!normVeh || !/^[A-Z]{2}[0-9]{1,2}[A-Z\d]{3,8}$/.test(normVeh)) {
        err = 'Enter a valid vehicle registration number.';
      }
    }

    if (name === 'licenseNumber' && formData.vehicleType !== 'Bicycle') {
      const normLic = valTrim.replace(/[\s-]/g, '').toUpperCase();
      if (!normLic || !/^[A-Z]{2}[0-9A-Z]{7,15}$/.test(normLic)) {
        err = 'Enter a valid driver\'s license number.';
      }
    }

    const hasBank = formData.bankAccountNumber.trim() || formData.ifscCode.trim() || formData.accountHolderName.trim();
    if (hasBank) {
      if (name === 'accountHolderName' && valTrim.length < 2) {
        err = 'Account holder name is required.';
      }
      if (name === 'bankAccountNumber') {
        const normAc = valTrim.replace(/[\s-]/g, '');
        if (!normAc || !/^\d{9,18}$/.test(normAc)) {
          err = 'Enter a valid bank account number.';
        }
      }
      if (name === 'confirmBankAccountNumber' && formData.bankAccountNumber !== value) {
        err = 'Account numbers do not match.';
      }
      if (name === 'ifscCode') {
        const normIfsc = valTrim.toUpperCase();
        if (!normIfsc || !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(normIfsc)) {
          err = 'Enter a valid IFSC code.';
        }
      }
    }

    if (name === 'upiId' && valTrim) {
      if (!/^[\w.-]+@[\w.-]+$/.test(valTrim)) {
        err = 'Enter a valid UPI ID.';
      }
    }

    setValidationErrors(prev => {
      const next = { ...prev };
      if (err) next[name] = err;
      else delete next[name];
      return next;
    });

    return !err;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => {
      const updated = { ...prev, [name]: value };
      if (name === 'vehicleType' && value === 'Bicycle') {
        setValidationErrors(prevErrors => {
          const next = { ...prevErrors };
          delete next.licenseNumber;
          delete next.vehicleNumber;
          return next;
        });
      }
      return updated;
    });

    // Clear validation immediately if corrected
    if (validationErrors[name]) {
      validateField(name, value);
    }
  };

  const handleBlur = (e) => {
    const { name, value } = e.target;
    validateField(name, value);
  };

  const generatePassword = () => {
    const upper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const lower = 'abcdefghijklmnopqrstuvwxyz';
    const numbers = '0123456789';
    const special = '!@#$%^&*()_+-=[]{}|;:,.<>?';
    
    let pass = '';
    pass += upper.charAt(Math.floor(Math.random() * upper.length));
    pass += lower.charAt(Math.floor(Math.random() * lower.length));
    pass += numbers.charAt(Math.floor(Math.random() * numbers.length));
    pass += special.charAt(Math.floor(Math.random() * special.length));
    
    const allChars = upper + lower + numbers + special;
    for (let i = 0; i < 8; i++) {
      pass += allChars.charAt(Math.floor(Math.random() * allChars.length));
    }
    
    pass = pass.split('').sort(() => 0.5 - Math.random()).join('');
    
    setFormData(prev => ({ ...prev, password: pass }));
    if (validationErrors.password) {
      setValidationErrors(prev => ({ ...prev, password: '' }));
    }
  };

  const handleFileChange = (e, setFileState, fileTypeKey, allowedTypes, maxMb = 5) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!allowedTypes.includes(file.type)) {
      setFileErrors(prev => ({ 
        ...prev, 
        [fileTypeKey]: `Invalid type. Supported: ${allowedTypes.map(t => t.split('/')[1].toUpperCase()).join(', ')}`
      }));
      return;
    }

    if (file.size > maxMb * 1024 * 1024) {
      setFileErrors(prev => ({ 
        ...prev, 
        [fileTypeKey]: `File size exceeds ${maxMb}MB limit.` 
      }));
      return;
    }

    setFileErrors(prev => ({ ...prev, [fileTypeKey]: '' }));
    setFileState(file);
  };

  const validateForm = () => {
    let isValid = true;
    const fieldsToValidate = [
      'name',
      'mobileNumber',
      'email',
      'password',
      'vehicleNumber',
      'licenseNumber',
      'accountHolderName',
      'bankAccountNumber',
      'confirmBankAccountNumber',
      'ifscCode',
      'upiId'
    ];

    fieldsToValidate.forEach(field => {
      const fieldValid = validateField(field, formData[field]);
      if (!fieldValid) {
        isValid = false;
      }
    });

    if (!formData.preferredZone) {
      isValid = false;
      setValidationErrors(prev => ({ ...prev, preferredZone: 'Preferred Delivery Zone is required.' }));
    } else if (formData.secondaryZone && formData.preferredZone === formData.secondaryZone) {
      isValid = false;
      setValidationErrors(prev => ({ ...prev, secondaryZone: 'Secondary zone must be different from preferred zone.' }));
    }

    return isValid;
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (submitting) return;

    setApiError('');
    if (!validateForm()) {
      // Find the first field with errors and scroll to it
      const firstErrorKey = Object.keys(validationErrors)[0];
      if (firstErrorKey) {
        const el = document.getElementsByName(firstErrorKey)[0];
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }

    setSubmitting(true);
    try {
      // Normalize mobile number
      let rawMobile = formData.mobileNumber.trim().replace(/^\+91\s*/, '').replace(/^91\s*/, '').replace(/[\s-]/g, '');

      // Normalize zones
      const normPrefZone = formData.preferredZone.replace(/\s+/g, ' ').trim();
      const normSecZone = formData.secondaryZone && formData.secondaryZone.trim() 
        ? formData.secondaryZone.replace(/\s+/g, ' ').trim() 
        : undefined;

      // Map vehicle type and delivery type to canonical backend values
      const backendVehType = formData.vehicleType.toUpperCase(); // BIKE, SCOOTER, BICYCLE, CAR
      const backendDelType = formData.deliveryType === 'Full Time' ? 'FULL_TIME' : 'PART_TIME';

      // One atomic backend call
      const partnerRes = await api.createDeliveryPartnerAccount({
        fullName: formData.name.trim(),
        mobileNumber: rawMobile,
        email: formData.email.trim(),
        temporaryPassword: formData.password,
        vehicleType: backendVehType,
        vehicleNumber: backendVehType === 'BICYCLE' ? undefined : formData.vehicleNumber.trim(),
        driversLicenseNumber: backendVehType === 'BICYCLE' ? undefined : formData.licenseNumber.trim(),
        preferredZone: normPrefZone,
        secondaryZone: normSecZone,
        deliveryType: backendDelType
      });

      setSuccessData({
        partnerId: partnerRes?.id || 'N/A',
        name: formData.name.trim(),
        email: formData.email.trim(),
        mobileNumber: rawMobile
      });
    } catch (err) {
      console.error(err);
      const msg = err.message || '';
      if (msg.includes('Email is already registered')) {
        setValidationErrors(prev => ({ ...prev, email: 'This email is already registered.' }));
      } else if (msg.includes('Mobile number is already registered')) {
        setValidationErrors(prev => ({ ...prev, mobileNumber: 'This mobile number is already registered.' }));
      } else {
        setApiError(msg || 'Failed to create delivery partner. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const checkIsFormValid = () => {
    const nameTrim = formData.name.trim();
    if (nameTrim.length < 2 || !/^[a-zA-Z\s'-]+$/.test(nameTrim)) return false;

    let rawMobile = formData.mobileNumber.trim().replace(/^\+91\s*/, '').replace(/^91\s*/, '').replace(/[\s-]/g, '');
    if (!/^\d{10}$/.test(rawMobile)) return false;

    if (!formData.email.trim() || !/\S+@\S+\.\S+/.test(formData.email.trim())) return false;
    if (formData.password.length < 8) return false;

    if (formData.vehicleType !== 'Bicycle') {
      const normVeh = formData.vehicleNumber.trim().replace(/[\s-]/g, '').toUpperCase();
      if (!normVeh || !/^[A-Z]{2}[0-9]{1,2}[A-Z\d]{3,8}$/.test(normVeh)) return false;

      const normLic = formData.licenseNumber.trim().replace(/[\s-]/g, '').toUpperCase();
      if (!normLic || !/^[A-Z]{2}[0-9A-Z]{7,15}$/.test(normLic)) return false;
    }

    if (!formData.preferredZone) return false;
    if (formData.secondaryZone && formData.preferredZone === formData.secondaryZone) return false;

    const hasBank = formData.bankAccountNumber.trim() || formData.ifscCode.trim() || formData.accountHolderName.trim();
    if (hasBank) {
      if (formData.accountHolderName.trim().length < 2) return false;
      const acNum = formData.bankAccountNumber.trim().replace(/[\s-]/g, '');
      if (!acNum || !/^\d{9,18}$/.test(acNum)) return false;
      if (formData.bankAccountNumber !== formData.confirmBankAccountNumber) return false;
      if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(formData.ifscCode.toUpperCase().trim())) return false;
    }

    if (formData.upiId.trim() && !/^[\w.-]+@[\w.-]+$/.test(formData.upiId.trim())) return false;

    const hasFileErrors = Object.values(fileErrors).some(err => err !== '');
    if (hasFileErrors) return false;

    return true;
  };

  const isFormValid = checkIsFormValid();

  // Merge suggested zones with any custom zone that is set in the form state
  const zoneOptions = Array.from(new Set([
    ...SUGGESTED_ZONES,
    ...(formData.preferredZone ? [formData.preferredZone] : []),
    ...(formData.secondaryZone ? [formData.secondaryZone] : [])
  ])).filter(Boolean);

  if (successData) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', maxWidth: '640px', margin: '3rem auto' }}>
        <div style={{
          background: 'var(--bg-card)',
          borderRadius: 'var(--radius-xl)',
          padding: '3rem 2rem',
          border: '1px solid var(--border-color)',
          textAlign: 'center',
          boxShadow: 'var(--shadow-lg)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '1.5rem'
        }}>
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            backgroundColor: 'var(--bg-success-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--text-success)'
          }}>
            <CheckCircle2 size={36} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <h2 style={{ fontSize: '1.6rem', fontWeight: '900', color: 'var(--text-main)' }}>
              Delivery Partner Created
            </h2>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
              Rider profile has been successfully onboarded to QuickBite.
            </p>
          </div>

          <div style={{
            background: 'var(--bg-main)',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border-color)',
            width: '100%',
            padding: '1.25rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.75rem',
            textAlign: 'left'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.88rem' }}>
              <span style={{ color: 'var(--text-muted)', fontWeight: '600' }}>Partner Name:</span>
              <span style={{ color: 'var(--text-main)', fontWeight: '750' }}>{successData.name}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.88rem' }}>
              <span style={{ color: 'var(--text-muted)', fontWeight: '600' }}>Partner ID:</span>
              <span style={{ color: 'var(--text-main)', fontWeight: '750' }}>#{successData.partnerId}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.88rem' }}>
              <span style={{ color: 'var(--text-muted)', fontWeight: '600' }}>Mobile Number:</span>
              <span style={{ color: 'var(--text-main)', fontWeight: '750' }}>+91 {successData.mobileNumber}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.88rem' }}>
              <span style={{ color: 'var(--text-muted)', fontWeight: '600' }}>Email Address:</span>
              <span style={{ color: 'var(--text-main)', fontWeight: '750' }}>{successData.email}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.88rem' }}>
              <span style={{ color: 'var(--text-muted)', fontWeight: '600' }}>Verification:</span>
              <span style={{
                color: 'var(--text-warning)',
                background: 'var(--bg-warning-subtle)',
                padding: '0.15rem 0.5rem',
                borderRadius: '4px',
                fontSize: '0.75rem',
                fontWeight: '800'
              }}>Unverified</span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '1rem', width: '100%', marginTop: '0.5rem' }}>
            <button
              onClick={() => onNavigate(`/super-admin/delivery-partners/${successData.partnerId}`)}
              className="btn-primary"
              style={{ flex: 1, padding: '0.75rem', fontWeight: '800' }}
            >
              View Partner
            </button>
            <button
              onClick={() => {
                setSuccessData(null);
                setFormData({
                  name: '',
                  mobileNumber: '',
                  email: '',
                  password: '',
                  vehicleType: 'Bike',
                  vehicleNumber: '',
                  licenseNumber: '',
                  preferredZone: 'Kochi Central',
                  secondaryZone: '',
                  deliveryType: 'Full Time',
                  accountHolderName: '',
                  bankAccountNumber: '',
                  confirmBankAccountNumber: '',
                  ifscCode: '',
                  upiId: '',
                });
                setProfilePhoto(null);
                setDrivingLicense(null);
                setVehicleRc(null);
                setVehicleInsurance(null);
                setFileErrors({});
                setValidationErrors({});
              }}
              className="btn-secondary"
              style={{ flex: 1, padding: '0.75rem', fontWeight: '800' }}
            >
              Add Another Partner
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      {/* Breadcrumb & Heading */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.35rem',
          fontSize: '0.8rem',
          color: 'var(--text-subtle)',
          fontWeight: '700'
        }}>
          <span style={{ cursor: 'pointer' }} onClick={() => onNavigate('/super-admin/delivery-partners')}>Delivery Partners</span>
          <ChevronRight size={12} />
          <span style={{ color: 'var(--primary)' }}>Add Delivery Partner</span>
        </div>

        <h1 style={{
          fontSize: '1.9rem',
          fontWeight: '900',
          color: 'var(--text-main)',
          letterSpacing: '-0.5px',
          marginTop: '0.25rem'
        }}>Add Delivery Partner</h1>
        <p style={{ fontSize: '0.92rem', color: 'var(--text-muted)' }}>
          Create a new QuickBite delivery partner account and configure their delivery details.
        </p>
      </div>

      {apiError && (
        <div style={{
          background: 'var(--bg-danger-subtle)',
          border: '1px solid #fecaca',
          borderRadius: 'var(--radius-lg)',
          padding: '1rem 1.25rem',
          color: 'var(--text-danger)',
          fontSize: '0.88rem',
          fontWeight: '700',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem'
        }}>
          <AlertTriangle size={18} />
          <span>{apiError}</span>
        </div>
      )}

      {/* Two Column Grid */}
      <form onSubmit={handleSubmit} style={{
        display: 'grid',
        gridTemplateColumns: '2.5fr 1fr',
        gap: '1.5rem',
        alignItems: 'flex-start'
      }}>
        
        {/* LEFT COLUMN - Forms */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Card 1: Account Details */}
          <div style={cardStyle}>
            <div>
              <h3 style={sectionHeadingStyle}>Account Details</h3>
              <p style={sectionSubStyle}>Create login credentials for this new delivery partner.</p>
            </div>

            <div style={twoColGridStyle}>
              {/* Full Name */}
              <div style={formGroupStyle}>
                <label style={labelStyle}>Full Name <span style={{ color: 'var(--primary)' }}>*</span></label>
                <input 
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  placeholder="Enter partner full name"
                  style={{
                    ...inputStyle,
                    border: validationErrors.name ? '1px solid #dc2626' : '1px solid var(--border-color)'
                  }}
                />
                {validationErrors.name && <span style={errorTextStyle}>{validationErrors.name}</span>}
              </div>

              {/* Mobile Number */}
              <div style={formGroupStyle}>
                <label style={labelStyle}>Mobile Number <span style={{ color: 'var(--primary)' }}>*</span></label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <span style={{
                    position: 'absolute',
                    left: '12px',
                    fontSize: '0.88rem',
                    fontWeight: '700',
                    color: 'var(--text-muted)'
                  }}>+91</span>
                  <input 
                    type="text"
                    name="mobileNumber"
                    value={formData.mobileNumber}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    placeholder="98765 43210"
                    style={{
                      ...inputStyle,
                      paddingLeft: '3rem',
                      border: validationErrors.mobileNumber ? '1px solid #dc2626' : '1px solid var(--border-color)'
                    }}
                  />
                </div>
                {validationErrors.mobileNumber && <span style={errorTextStyle}>{validationErrors.mobileNumber}</span>}
              </div>

              {/* Email Address */}
              <div style={formGroupStyle}>
                <label style={labelStyle}>Email Address <span style={{ color: 'var(--primary)' }}>*</span></label>
                <input 
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  autoComplete="new-email"
                  placeholder="partner@example.com"
                  style={{
                    ...inputStyle,
                    border: validationErrors.email ? '1px solid #dc2626' : '1px solid var(--border-color)'
                  }}
                />
                {validationErrors.email && <span style={errorTextStyle}>{validationErrors.email}</span>}
              </div>

              {/* Temporary Password */}
              <div style={formGroupStyle}>
                <label style={labelStyle}>Temporary Password <span style={{ color: 'var(--primary)' }}>*</span></label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <input 
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    autoComplete="new-password"
                    placeholder="Create temporary password"
                    style={{
                      ...inputStyle,
                      paddingRight: '6.5rem',
                      border: validationErrors.password ? '1px solid #dc2626' : '1px solid var(--border-color)'
                    }}
                  />
                  <div style={{
                    position: 'absolute',
                    right: '10px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px'
                  }}>
                    <button 
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      style={passBtnIconStyle}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                    <button 
                      type="button" 
                      onClick={generatePassword}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--primary)',
                        fontSize: '0.75rem',
                        fontWeight: '800',
                        cursor: 'pointer'
                      }}
                    >
                      GENERATE
                    </button>
                  </div>
                </div>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-subtle)', marginTop: '0.2rem' }}>
                  Minimum 8 characters
                </span>
                {validationErrors.password && <span style={errorTextStyle}>{validationErrors.password}</span>}
              </div>
            </div>
          </div>

          {/* Card 2: Vehicle Details */}
          <div style={cardStyle}>
            <h3 style={sectionHeadingStyle}>Vehicle Details</h3>

            <div style={twoColGridStyle}>
              {/* Vehicle Type */}
              <div style={formGroupStyle}>
                <label style={labelStyle}>Vehicle Type <span style={{ color: 'var(--primary)' }}>*</span></label>
                <select
                  name="vehicleType"
                  value={formData.vehicleType}
                  onChange={handleChange}
                  style={selectInputStyle}
                >
                  <option value="Bike">Bike</option>
                  <option value="Scooter">Scooter</option>
                  <option value="Bicycle">Bicycle</option>
                  <option value="Car">Car</option>
                </select>
              </div>

              {/* Vehicle Number */}
              <div style={formGroupStyle}>
                <label style={labelStyle}>
                  Vehicle Number / Plate {formData.vehicleType !== 'Bicycle' && <span style={{ color: 'var(--primary)' }}>*</span>}
                </label>
                <input 
                  type="text"
                  name="vehicleNumber"
                  value={formData.vehicleNumber}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  placeholder="KL 07 AB 1234"
                  disabled={formData.vehicleType === 'Bicycle'}
                  style={{
                    ...inputStyle,
                    opacity: formData.vehicleType === 'Bicycle' ? 0.5 : 1,
                    border: validationErrors.vehicleNumber ? '1px solid #dc2626' : '1px solid var(--border-color)'
                  }}
                />
                {validationErrors.vehicleNumber && <span style={errorTextStyle}>{validationErrors.vehicleNumber}</span>}
              </div>

              {/* Driver License Number */}
              <div style={formGroupStyle}>
                <label style={labelStyle}>
                  Driver's License Number {formData.vehicleType !== 'Bicycle' && <span style={{ color: 'var(--primary)' }}>*</span>}
                </label>
                <input 
                  type="text"
                  name="licenseNumber"
                  value={formData.licenseNumber}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  placeholder="KL0120260012345"
                  disabled={formData.vehicleType === 'Bicycle'}
                  style={{
                    ...inputStyle,
                    opacity: formData.vehicleType === 'Bicycle' ? 0.5 : 1,
                    border: validationErrors.licenseNumber ? '1px solid #dc2626' : '1px solid var(--border-color)'
                  }}
                />
                {validationErrors.licenseNumber && <span style={errorTextStyle}>{validationErrors.licenseNumber}</span>}
              </div>
            </div>
          </div>

          {/* Card 3: Delivery Information */}
          <div style={cardStyle}>
            <h3 style={sectionHeadingStyle}>Delivery Information</h3>

            <div style={twoColGridStyle}>
              {/* Preferred Zone */}
              <SearchableSelect
                label="Preferred Delivery Zone"
                value={formData.preferredZone}
                onChange={(val) => setFormData(prev => ({ ...prev, preferredZone: val }))}
                options={zoneOptions}
                placeholder="Select Preferred Zone"
                error={validationErrors.preferredZone}
                inputStyle={inputStyle}
                labelStyle={labelStyle}
                errorTextStyle={errorTextStyle}
                formGroupStyle={formGroupStyle}
              />

              {/* Secondary Zone */}
              <SearchableSelect
                label="Secondary Zone (Optional)"
                value={formData.secondaryZone}
                onChange={(val) => setFormData(prev => ({ ...prev, secondaryZone: val }))}
                options={zoneOptions}
                placeholder="Select Secondary Zone"
                error={validationErrors.secondaryZone}
                isOptional={true}
                inputStyle={inputStyle}
                labelStyle={labelStyle}
                errorTextStyle={errorTextStyle}
                formGroupStyle={formGroupStyle}
              />

              {/* Delivery Type */}
              <div style={formGroupStyle}>
                <label style={labelStyle}>Delivery Type <span style={{ color: 'var(--primary)' }}>*</span></label>
                <select
                  name="deliveryType"
                  value={formData.deliveryType}
                  onChange={handleChange}
                  style={selectInputStyle}
                >
                  <option value="Full Time">Full Time</option>
                  <option value="Part Time">Part Time</option>
                </select>
              </div>
            </div>
          </div>

          {/* Card 4: Documents Upload */}
          <div style={cardStyle}>
            <h3 style={sectionHeadingStyle}>Documents</h3>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
              {/* Profile Photo */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <div style={documentCardStyle}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={docIconWrapperStyle}>
                      <User size={18} color="var(--text-muted)" />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={docLabelStyle}>Profile Photo</span>
                      <span style={docFormatStyle}>{profilePhoto ? profilePhoto.name : 'JPG, PNG (Max 5MB)'}</span>
                    </div>
                  </div>
                  <input 
                    type="file" 
                    ref={profilePhotoInputRef}
                    style={{ display: 'none' }}
                    accept="image/jpeg,image/png"
                    onChange={(e) => handleFileChange(e, setProfilePhoto, 'profilePhoto', ['image/jpeg', 'image/png'])}
                  />
                  <button
                    type="button"
                    onClick={() => profilePhotoInputRef.current.click()}
                    style={docUploadBtnStyle}
                  >
                    {profilePhoto ? 'Replace' : 'Upload'}
                  </button>
                </div>
                {fileErrors.profilePhoto && <span style={errorTextStyle}>{fileErrors.profilePhoto}</span>}
              </div>

              {/* Driving License */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <div style={{
                  ...documentCardStyle,
                  opacity: formData.vehicleType === 'Bicycle' ? 0.6 : 1
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={docIconWrapperStyle}>
                      <FileText size={18} color="var(--text-muted)" />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={docLabelStyle}>Driver's License {formData.vehicleType === 'Bicycle' && '(Optional)'}</span>
                      <span style={docFormatStyle}>{drivingLicense ? drivingLicense.name : 'PDF, JPG (Max 5MB)'}</span>
                    </div>
                  </div>
                  <input 
                    type="file" 
                    ref={drivingLicenseInputRef}
                    style={{ display: 'none' }}
                    accept="application/pdf,image/jpeg,image/png"
                    onChange={(e) => handleFileChange(e, setDrivingLicense, 'drivingLicense', ['application/pdf', 'image/jpeg', 'image/png'])}
                  />
                  <button
                    type="button"
                    onClick={() => drivingLicenseInputRef.current.click()}
                    style={docUploadBtnStyle}
                  >
                    {drivingLicense ? 'Replace' : 'Upload'}
                  </button>
                </div>
                {fileErrors.drivingLicense && <span style={errorTextStyle}>{fileErrors.drivingLicense}</span>}
              </div>

              {/* Vehicle RC */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <div style={{
                  ...documentCardStyle,
                  opacity: formData.vehicleType === 'Bicycle' ? 0.6 : 1
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={docIconWrapperStyle}>
                      <FileText size={18} color="var(--text-muted)" />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={docLabelStyle}>Vehicle RC {formData.vehicleType === 'Bicycle' && '(Optional)'}</span>
                      <span style={docFormatStyle}>{vehicleRc ? vehicleRc.name : 'PDF, JPG (Max 5MB)'}</span>
                    </div>
                  </div>
                  <input 
                    type="file" 
                    ref={vehicleRcInputRef}
                    style={{ display: 'none' }}
                    accept="application/pdf,image/jpeg,image/png"
                    onChange={(e) => handleFileChange(e, setVehicleRc, 'vehicleRc', ['application/pdf', 'image/jpeg', 'image/png'])}
                    disabled={formData.vehicleType === 'Bicycle'}
                  />
                  <button
                    type="button"
                    onClick={() => vehicleRcInputRef.current.click()}
                    disabled={formData.vehicleType === 'Bicycle'}
                    style={{
                      ...docUploadBtnStyle,
                      opacity: formData.vehicleType === 'Bicycle' ? 0.5 : 1
                    }}
                  >
                    {vehicleRc ? 'Replace' : 'Upload'}
                  </button>
                </div>
                {fileErrors.vehicleRc && <span style={errorTextStyle}>{fileErrors.vehicleRc}</span>}
              </div>

              {/* Vehicle Insurance */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <div style={{
                  ...documentCardStyle,
                  opacity: formData.vehicleType === 'Bicycle' ? 0.6 : 1
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={docIconWrapperStyle}>
                      <FileText size={18} color="var(--text-muted)" />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={docLabelStyle}>Vehicle Insurance {formData.vehicleType === 'Bicycle' && '(Optional)'}</span>
                      <span style={docFormatStyle}>{vehicleInsurance ? vehicleInsurance.name : 'PDF, JPG (Max 5MB)'}</span>
                    </div>
                  </div>
                  <input 
                    type="file" 
                    ref={vehicleInsuranceInputRef}
                    style={{ display: 'none' }}
                    accept="application/pdf,image/jpeg,image/png"
                    onChange={(e) => handleFileChange(e, setVehicleInsurance, 'vehicleInsurance', ['application/pdf', 'image/jpeg', 'image/png'])}
                    disabled={formData.vehicleType === 'Bicycle'}
                  />
                  <button
                    type="button"
                    onClick={() => vehicleInsuranceInputRef.current.click()}
                    disabled={formData.vehicleType === 'Bicycle'}
                    style={{
                      ...docUploadBtnStyle,
                      opacity: formData.vehicleType === 'Bicycle' ? 0.5 : 1
                    }}
                  >
                    {vehicleInsurance ? 'Replace' : 'Upload'}
                  </button>
                </div>
                {fileErrors.vehicleInsurance && <span style={errorTextStyle}>{fileErrors.vehicleInsurance}</span>}
              </div>
            </div>
          </div>

          {/* Card 5: Payout Details */}
          <div style={cardStyle}>
            <h3 style={sectionHeadingStyle}>Payout Details</h3>

            <div style={twoColGridStyle}>
              {/* Account Holder Name */}
              <div style={formGroupStyle}>
                <label style={labelStyle}>Account Holder Name</label>
                <input 
                  type="text"
                  name="accountHolderName"
                  value={formData.accountHolderName}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  placeholder="Name as per bank records"
                  style={{
                    ...inputStyle,
                    border: validationErrors.accountHolderName ? '1px solid #dc2626' : '1px solid var(--border-color)'
                  }}
                />
                {validationErrors.accountHolderName && <span style={errorTextStyle}>{validationErrors.accountHolderName}</span>}
              </div>

              {/* Bank Account Number */}
              <div style={formGroupStyle}>
                <label style={labelStyle}>Bank Account Number</label>
                <input 
                  type="text"
                  name="bankAccountNumber"
                  value={formData.bankAccountNumber}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  placeholder="0000 0000 0000"
                  style={{
                    ...inputStyle,
                    border: validationErrors.bankAccountNumber ? '1px solid #dc2626' : '1px solid var(--border-color)'
                  }}
                />
                {validationErrors.bankAccountNumber && <span style={errorTextStyle}>{validationErrors.bankAccountNumber}</span>}
              </div>

              {/* Confirm Bank Account Number */}
              <div style={formGroupStyle}>
                <label style={labelStyle}>Confirm Account Number</label>
                <input 
                  type="text"
                  name="confirmBankAccountNumber"
                  value={formData.confirmBankAccountNumber}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  placeholder="0000 0000 0000"
                  style={{
                    ...inputStyle,
                    border: validationErrors.confirmBankAccountNumber ? '1px solid #dc2626' : '1px solid var(--border-color)'
                  }}
                />
                {validationErrors.confirmBankAccountNumber && <span style={errorTextStyle}>{validationErrors.confirmBankAccountNumber}</span>}
              </div>

              {/* IFSC Code */}
              <div style={formGroupStyle}>
                <label style={labelStyle}>IFSC Code</label>
                <input 
                  type="text"
                  name="ifscCode"
                  value={formData.ifscCode}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  placeholder="SBIN0001234"
                  style={{
                    ...inputStyle,
                    border: validationErrors.ifscCode ? '1px solid #dc2626' : '1px solid var(--border-color)'
                  }}
                />
                {validationErrors.ifscCode && <span style={errorTextStyle}>{validationErrors.ifscCode}</span>}
              </div>

              {/* UPI ID */}
              <div style={formGroupStyle}>
                <label style={labelStyle}>UPI ID (Optional)</label>
                <input 
                  type="text"
                  name="upiId"
                  value={formData.upiId}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  placeholder="rahul@okhdfcbank"
                  style={{
                    ...inputStyle,
                    border: validationErrors.upiId ? '1px solid #dc2626' : '1px solid var(--border-color)'
                  }}
                />
                {validationErrors.upiId && <span style={errorTextStyle}>{validationErrors.upiId}</span>}
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN - Sticky status panel */}
        <div style={{
          position: 'sticky',
          top: '80px',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.5rem',
          zIndex: 10
        }}>
          {/* Card 1: Initial Account Status */}
          <div style={{
            ...cardStyle,
            padding: '1.5rem'
          }}>
            <h3 style={sectionHeadingStyle}>Initial Account Status</h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '0.25rem' }}>
              <div style={statusRowStyle}>
                <span style={statusLabelStyle}>Verification</span>
                <span style={{
                  color: 'var(--text-warning)',
                  background: 'var(--bg-warning-subtle)',
                  padding: '0.2rem 0.5rem',
                  borderRadius: '4px',
                  fontSize: '0.72rem',
                  fontWeight: '800'
                }}>Unverified</span>
              </div>
              <div style={statusRowStyle}>
                <span style={statusLabelStyle}>Online Status</span>
                <span style={{
                  color: 'var(--text-muted)',
                  background: 'var(--bg-subtle)',
                  padding: '0.2rem 0.5rem',
                  borderRadius: '4px',
                  fontSize: '0.72rem',
                  fontWeight: '800'
                }}>Offline</span>
              </div>
              <div style={statusRowStyle}>
                <span style={statusLabelStyle}>Availability</span>
                <span style={{
                  color: 'var(--text-muted)',
                  background: 'var(--bg-subtle)',
                  padding: '0.2rem 0.5rem',
                  borderRadius: '4px',
                  fontSize: '0.72rem',
                  fontWeight: '800'
                }}>Unavailable</span>
              </div>
              <div style={statusRowStyle}>
                <span style={statusLabelStyle}>Account Setup</span>
                <span style={{
                  color: '#2563eb',
                  background: '#dbeafe',
                  padding: '0.2rem 0.5rem',
                  borderRadius: '4px',
                  fontSize: '0.72rem',
                  fontWeight: '800'
                }}>Pending</span>
              </div>
            </div>

            <p style={{
              fontSize: '0.78rem',
              color: 'var(--text-warning)',
              lineHeight: '1.4',
              borderTop: '1px solid var(--border-color)',
              paddingTop: '1rem',
              marginTop: '0.5rem',
              fontWeight: '600'
            }}>
              ⚠️ After creation, this delivery partner must be verified by a Super Admin before becoming available for deliveries.
            </p>
          </div>

          {/* Card 2: Partner Login Information */}
          <div style={{
            ...cardStyle,
            padding: '1.5rem'
          }}>
            <h3 style={sectionHeadingStyle}>Partner Login</h3>
            
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: '1.5' }}>
              The partner can sign in to the QuickBite Partner app using:
            </p>

            <div style={{
              background: 'var(--bg-main)',
              borderRadius: 'var(--radius-md)',
              padding: '0.75rem',
              fontSize: '0.8rem',
              fontWeight: '700',
              color: 'var(--text-main)',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.4rem',
              border: '1px solid var(--border-color)'
            }}>
              <span>• Mobile Number or Email</span>
              <span>• Temporary Password</span>
            </div>

            <p style={{ fontSize: '0.75rem', color: 'var(--text-subtle)', fontWeight: '600' }}>
              The temporary password can be changed later.
            </p>
          </div>
        </div>

      </form>

      {/* Bottom Action Area */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '1rem',
        borderTop: '1px solid var(--border-color)',
        paddingTop: '1.5rem',
        marginTop: '1rem'
      }}>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!isFormValid || submitting}
          className="btn-primary"
          style={{
            padding: '0.75rem 2rem',
            fontWeight: '800',
            height: '46px',
            borderRadius: 'var(--radius-md)',
            opacity: isFormValid ? 1 : 0.5,
            cursor: isFormValid ? 'pointer' : 'not-allowed',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}
        >
          {submitting && <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />}
          <span>Create Delivery Partner</span>
        </button>

        <button
          type="button"
          onClick={() => {
            if (isFormValid) {
              setShowCancelModal(true);
            } else {
              onNavigate('/super-admin/delivery-partners');
            }
          }}
          className="btn-secondary"
          style={{
            padding: '0.75rem 2rem',
            fontWeight: '800',
            height: '46px',
            borderRadius: 'var(--radius-md)',
          }}
        >
          Cancel
        </button>
      </div>

      {/* Discard changes dialog modal */}
      {showCancelModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: 'var(--bg-card)',
            borderRadius: 'var(--radius-xl)',
            border: '1px solid var(--border-color)',
            padding: '2rem',
            maxWidth: '480px',
            width: '100%',
            boxShadow: 'var(--shadow-lg)',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.5rem',
            textAlign: 'center'
          }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: '850', color: 'var(--text-main)' }}>
                Discard Changes?
              </h3>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', lineHeight: '1.5' }}>
                You have unsaved changes in this form. Are you sure you want to discard them and return to the list?
              </p>
            </div>

            <div style={{ display: 'flex', gap: '1rem' }}>
              <button
                type="button"
                onClick={() => setShowCancelModal(false)}
                className="btn-secondary"
                style={{ flex: 1, padding: '0.65rem', fontWeight: '800' }}
              >
                Continue Onboarding
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowCancelModal(false);
                  onNavigate('/super-admin/delivery-partners');
                }}
                className="btn-primary"
                style={{
                  flex: 1,
                  padding: '0.65rem',
                  fontWeight: '800',
                  background: '#dc2626',
                  boxShadow: '0 4px 12px rgba(220,38,38,0.25)'
                }}
              >
                Discard Changes
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

// Inline CSS Styles helper configurations
const cardStyle = {
  background: 'var(--bg-card)',
  borderRadius: 'var(--radius-xl)',
  padding: '2rem',
  border: '1px solid var(--border-color)',
  display: 'flex',
  flexDirection: 'column',
  gap: '1.5rem',
  boxShadow: 'var(--shadow-sm)',
};

const inputStyle = {
  padding: '0.75rem 1rem',
  borderRadius: 'var(--radius-md)',
  border: '1px solid var(--border-color)',
  background: 'var(--bg-main)',
  color: 'var(--text-main)',
  fontSize: '0.88rem',
  outline: 'none',
  width: '100%',
  height: '42px',
};

const labelStyle = {
  fontSize: '0.82rem',
  fontWeight: '800',
  color: 'var(--text-muted)',
  marginBottom: '0.4rem',
};

const sectionHeadingStyle = {
  fontSize: '1.05rem',
  fontWeight: '850',
  color: 'var(--text-main)',
};

const sectionSubStyle = {
  fontSize: '0.8rem',
  color: 'var(--text-muted)',
  marginTop: '0.2rem',
};

const twoColGridStyle = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: '1.25rem 1.5rem',
};

const formGroupStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: '0.4rem',
  width: '100%',
};

const errorTextStyle = {
  fontSize: '0.75rem',
  color: '#dc2626',
  fontWeight: '700',
  marginTop: '0.2rem',
};

const passBtnIconStyle = {
  background: 'transparent',
  border: 'none',
  padding: '4px',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  color: 'var(--text-muted)',
};

const selectInputStyle = {
  padding: '0.75rem 1rem',
  borderRadius: 'var(--radius-md)',
  border: '1px solid var(--border-color)',
  background: 'var(--bg-main)',
  color: 'var(--text-main)',
  fontSize: '0.88rem',
  outline: 'none',
  width: '100%',
  height: '42px',
  cursor: 'pointer',
};

const documentCardStyle = {
  background: 'var(--bg-main)',
  border: '1px dashed var(--border-color)',
  borderRadius: 'var(--radius-lg)',
  padding: '1rem',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  gap: '1rem',
};

const docIconWrapperStyle = {
  width: '36px',
  height: '36px',
  borderRadius: '8px',
  backgroundColor: 'var(--bg-card)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  border: '1px solid var(--border-color)',
};

const docLabelStyle = {
  fontSize: '0.85rem',
  fontWeight: '750',
  color: 'var(--text-main)',
};

const docFormatStyle = {
  fontSize: '0.72rem',
  color: 'var(--text-muted)',
  marginTop: '0.1rem',
};

const docUploadBtnStyle = {
  fontSize: '0.78rem',
  fontWeight: '800',
  color: 'var(--primary)',
  background: 'transparent',
  border: 'none',
  cursor: 'pointer',
};

const statusRowStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  fontSize: '0.85rem',
};

const statusLabelStyle = {
  color: 'var(--text-muted)',
  fontWeight: '600',
};
