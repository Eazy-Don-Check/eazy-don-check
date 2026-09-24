import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import {
  Activity,
  AlertCircle,
  Bell,
  Check,
  ChevronDown,
  Download,
  Eye,
  Fingerprint,
  Globe,
  KeyRound,
  Loader2,
  Lock,
  Mail,
  MessageCircle,
  Monitor,
  Save,
  Shield,
  Smartphone,
  Sparkles,
  Sun,
  Trash2,
  User,
  Users,
  X,
} from 'lucide-react';

import AppLayout from '../components/layout/AppLayout';
import ThemeToggle from '../components/common/ThemeToggle';
import apiClient from '../utils/apiClient';
import { useAuth } from '../context/AuthContext';

// ============================================================
// DEFAULT SETTINGS
// ============================================================

const DEFAULT_SETTINGS = {
  appearance: {
    theme: 'system',
  },

  notifications: {
    system: true,
    messages: true,
    friendRequests: true,
    comments: true,
    likes: true,
    email: true,
  },

  privacy: {
    profileVisibility: 'public',
    whoCanMessage: 'everyone',
    showOnlineStatus: true,
    showActivityStatus: true,
  },

  security: {
    twoFactorEnabled: false,
    biometricEnabled: false,
    sensitiveActionConfirmation: true,
  },

  verification: {
    scanNotifications: true,
    verificationResults: true,
    saveScanHistory: true,
  },

  community: {
    friendRequests: true,
    communityNotifications: true,
    profileSuggestions: true,
  },
};

// ============================================================
// HELPERS
// ============================================================

const isPlainObject = (value) => {
  return (
    value !== null &&
    typeof value === 'object' &&
    !Array.isArray(value)
  );
};

const deepMerge = (base, patch) => {
  const result = {
    ...(isPlainObject(base) ? base : {}),
  };

  if (!isPlainObject(patch)) {
    return result;
  }

  Object.keys(patch).forEach((key) => {
    if (
      isPlainObject(patch[key]) &&
      isPlainObject(result[key])
    ) {
      result[key] = deepMerge(
        result[key],
        patch[key]
      );
    } else {
      result[key] = patch[key];
    }
  });

  return result;
};

const getApiErrorMessage = (
  error,
  fallback = 'Something went wrong.'
) => {
  return (
    error?.response?.data?.message ||
    error?.response?.data?.error ||
    error?.message ||
    fallback
  );
};

const formatDate = (date) => {
  if (!date) return '';

  try {
    return new Date(date).toLocaleDateString(
      undefined,
      {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }
    );
  } catch {
    return '';
  }
};

// ============================================================
// THEME HELPER
// ============================================================

const applyThemeToDocument = (theme) => {
  if (
    typeof window === 'undefined' ||
    typeof document === 'undefined'
  ) {
    return;
  }

  const root = document.documentElement;

  let resolvedTheme = theme;

  if (theme === 'system') {
    resolvedTheme =
      window.matchMedia &&
      window.matchMedia(
        '(prefers-color-scheme: dark)'
      ).matches
        ? 'dark'
        : 'light';
  }

  root.classList.toggle(
    'dark',
    resolvedTheme === 'dark'
  );

  try {
    localStorage.setItem(
      'theme',
      theme
    );
  } catch {
    // Ignore storage errors.
  }

  try {
    localStorage.setItem(
      'eazy-don-check-theme',
      theme
    );
  } catch {
    // Ignore storage errors.
  }
};

// ============================================================
// SECTION CARD
// ============================================================

const SectionCard = ({
  id,
  icon: Icon,
  title,
  description,
  children,
}) => {
  return (
    <section
      id={id}
      className="scroll-mt-6 rounded-2xl border border-slate-200 dark:border-dark-border bg-white dark:bg-dark-card shadow-sm overflow-hidden"
    >
      <div className="px-5 sm:px-6 py-5 border-b border-slate-200 dark:border-dark-border">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-brand-50 dark:bg-brand-500/10 text-brand-600 dark:text-brand-400 flex items-center justify-center shrink-0">
            <Icon className="w-5 h-5" />
          </div>

          <div className="min-w-0">
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              {title}
            </h2>

            {description && (
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                {description}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="divide-y divide-slate-100 dark:divide-dark-border">
        {children}
      </div>
    </section>
  );
};

// ============================================================
// SETTING ROW
// ============================================================

const SettingRow = ({
  icon: Icon,
  title,
  description,
  children,
  danger = false,
}) => {
  return (
    <div className="px-5 sm:px-6 py-5">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="flex items-start gap-3 min-w-0">
          {Icon && (
            <div
              className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                danger
                  ? 'bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400'
                  : 'bg-slate-100 dark:bg-dark-bg text-slate-600 dark:text-slate-300'
              }`}
            >
              <Icon className="w-4 h-4" />
            </div>
          )}

          <div className="min-w-0">
            <h3
              className={`text-sm font-semibold ${
                danger
                  ? 'text-red-600 dark:text-red-400'
                  : 'text-slate-900 dark:text-white'
              }`}
            >
              {title}
            </h3>

            {description && (
              <p className="mt-1 text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed max-w-2xl">
                {description}
              </p>
            )}
          </div>
        </div>

        <div className="shrink-0 self-start sm:self-center">
          {children}
        </div>
      </div>
    </div>
  );
};

// ============================================================
// TOGGLE
// ============================================================

const Toggle = ({
  checked,
  onChange,
  disabled = false,
}) => {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500/30 ${
        checked
          ? 'bg-brand-600'
          : 'bg-slate-300 dark:bg-slate-700'
      } ${
        disabled
          ? 'opacity-50 cursor-not-allowed'
          : 'cursor-pointer'
      }`}
    >
      <span
        className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform ${
          checked
            ? 'translate-x-5'
            : 'translate-x-0.5'
        }`}
      />
    </button>
  );
};

// ============================================================
// SELECT FIELD
// ============================================================

const SelectField = ({
  value,
  onChange,
  options,
  disabled = false,
}) => {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(event) =>
          onChange(event.target.value)
        }
        disabled={disabled}
        className="appearance-none min-w-[150px] pr-9 pl-3 py-2 rounded-xl border border-slate-200 dark:border-dark-border bg-white dark:bg-dark-bg text-sm text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {options.map((option) => (
          <option
            key={option.value}
            value={option.value}
          >
            {option.label}
          </option>
        ))}
      </select>

      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
    </div>
  );
};

// ============================================================
// SPINNER
// ============================================================

const SettingsSpinner = () => {
  return (
    <div className="min-h-[500px] flex items-center justify-center bg-slate-50 dark:bg-dark-bg">
      <div className="flex flex-col items-center gap-3">
        <div className="w-12 h-12 rounded-2xl bg-brand-50 dark:bg-brand-500/10 flex items-center justify-center">
          <Loader2 className="w-7 h-7 animate-spin text-brand-600 dark:text-brand-400" />
        </div>

        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
          Loading settings...
        </p>
      </div>
    </div>
  );
};

// ============================================================
// SETTINGS
// ============================================================

const Settings = () => {
  const { user } = useAuth();

  const [settings, setSettings] =
    useState(DEFAULT_SETTINGS);

  const [isLoading, setIsLoading] =
    useState(true);

  const [isSaving, setIsSaving] =
    useState(false);

  const [isExporting, setIsExporting] =
    useState(false);

  const [exportFormat, setExportFormat] =
    useState(null);

  const [error, setError] =
    useState('');

  const [success, setSuccess] =
    useState('');

  const [biometricSupported, setBiometricSupported] =
    useState(false);

  const [securityStatus, setSecurityStatus] =
    useState({
      twoFactorEnabled: false,
      biometricEnabled: false,
      biometricCredentials: [],
    });

  const [securityBusy, setSecurityBusy] =
    useState(false);

  const [twoFactorSetup, setTwoFactorSetup] =
    useState(null);

  const [twoFactorCode, setTwoFactorCode] =
    useState('');

  const [recoveryCodes, setRecoveryCodes] =
    useState([]);

  const [disableTwoFactorOpen, setDisableTwoFactorOpen] =
    useState(false);

  const [disableTwoFactorPassword, setDisableTwoFactorPassword] =
    useState('');

  const [disableTwoFactorCode, setDisableTwoFactorCode] =
    useState('');

  const [biometricDeviceName, setBiometricDeviceName] =
    useState('');

  const [biometricNameModalOpen, setBiometricNameModalOpen] =
    useState(false);

  const [deleteConfirmOpen, setDeleteConfirmOpen] =
    useState(false);

  const [activeSection, setActiveSection] =
    useState('appearance');

  const saveTimerRef =
    useRef(null);

  const mountedRef =
    useRef(true);

  // ==========================================================
  // CLEANUP
  // ==========================================================

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;

      if (saveTimerRef.current) {
        clearTimeout(
          saveTimerRef.current
        );
      }
    };
  }, []);

  // ==========================================================
  // LOAD SETTINGS
  // ==========================================================

  const loadSettings = useCallback(
    async () => {
      try {
        setIsLoading(true);
        setError('');

        const response =
          await apiClient.get(
            '/settings'
          );

        const serverSettings =
          response?.data?.data ||
          response?.data ||
          {};

        if (!mountedRef.current) {
          return;
        }

        const mergedSettings =
          deepMerge(
            DEFAULT_SETTINGS,
            serverSettings
          );

        setSettings(
          mergedSettings
        );

        if (
          mergedSettings?.appearance?.theme
        ) {
          applyThemeToDocument(
            mergedSettings.appearance.theme
          );
        }
      } catch (requestError) {
        console.error(
          'LOAD SETTINGS ERROR:',
          requestError
        );

        if (!mountedRef.current) {
          return;
        }

        setError(
          getApiErrorMessage(
            requestError,
            'Failed to load account settings.'
          )
        );
      } finally {
        if (mountedRef.current) {
          setIsLoading(false);
        }
      }
    },
    []
  );

  // ==========================================================
  // LOAD SECURITY STATUS
  // ==========================================================

  const loadSecurityStatus =
    useCallback(async () => {
      try {
        const response =
          await apiClient.get(
            '/security'
          );

        const data =
          response?.data?.data ||
          response?.data ||
          {};

        if (!mountedRef.current) {
          return;
        }

        setSecurityStatus({
          twoFactorEnabled:
            Boolean(
              data.twoFactorEnabled
            ),

          biometricEnabled:
            Boolean(
              data.biometricEnabled
            ),

          biometricCredentials:
            Array.isArray(
              data.biometricCredentials
            )
              ? data.biometricCredentials
              : [],
        });
      } catch (requestError) {
        console.warn(
          'LOAD SECURITY STATUS:',
          requestError
        );
      }
    }, []);

  // ==========================================================
  // CHECK BIOMETRIC SUPPORT
  // ==========================================================

  useEffect(() => {
    const checkBiometricSupport =
      async () => {
        try {
          if (
            typeof window === 'undefined' ||
            !window.isSecureContext ||
            !window.PublicKeyCredential
          ) {
            if (mountedRef.current) {
              setBiometricSupported(false);
            }

            return;
          }

          if (
            typeof window.PublicKeyCredential
              .isUserVerifyingPlatformAuthenticatorAvailable !==
            'function'
          ) {
            if (mountedRef.current) {
              setBiometricSupported(false);
            }

            return;
          }

          const available =
            await window.PublicKeyCredential
              .isUserVerifyingPlatformAuthenticatorAvailable();

          if (mountedRef.current) {
            setBiometricSupported(
              Boolean(available)
            );
          }
        } catch {
          if (mountedRef.current) {
            setBiometricSupported(false);
          }
        }
      };

    checkBiometricSupport();
  }, []);

  // ==========================================================
  // INITIAL LOAD
  // ==========================================================

  useEffect(() => {
    loadSettings();
    loadSecurityStatus();
  }, [
    loadSettings,
    loadSecurityStatus,
  ]);

  // ==========================================================
  // SAVE SETTINGS
  // ==========================================================

  const saveSettings = useCallback(
    async (nextSettings) => {
      try {
        setIsSaving(true);
        setError('');

        const response =
          await apiClient.put(
            '/settings',
            nextSettings
          );

        const savedSettings =
          response?.data?.data ||
          nextSettings;

        if (!mountedRef.current) {
          return true;
        }

        const mergedSettings =
          deepMerge(
            DEFAULT_SETTINGS,
            savedSettings
          );

        setSettings(
          mergedSettings
        );

        setSuccess(
          'Settings saved successfully.'
        );

        window.setTimeout(() => {
          if (mountedRef.current) {
            setSuccess('');
          }
        }, 3000);

        return true;
      } catch (requestError) {
        console.error(
          'SAVE SETTINGS ERROR:',
          requestError
        );

        if (mountedRef.current) {
          setError(
            getApiErrorMessage(
              requestError,
              'Failed to save settings.'
            )
          );
        }

        return false;
      } finally {
        if (mountedRef.current) {
          setIsSaving(false);
        }
      }
    },
    []
  );

  // ==========================================================
  // DEBOUNCED SETTING UPDATE
  // ==========================================================

  const updateSetting = useCallback(
    (
      section,
      key,
      value
    ) => {
      setSettings((previous) => {
        const nextSettings =
          deepMerge(
            previous,
            {
              [section]: {
                [key]: value,
              },
            }
          );

        if (saveTimerRef.current) {
          clearTimeout(
            saveTimerRef.current
          );
        }

        saveTimerRef.current =
          window.setTimeout(() => {
            saveSettings(
              nextSettings
            );
          }, 450);

        return nextSettings;
      });
    },
    [saveSettings]
  );

  // ==========================================================
  // THEME PREFERENCE
  // ==========================================================

  const handleThemePreference =
    async (theme) => {
      const nextSettings =
        deepMerge(
          settings,
          {
            appearance: {
              theme,
            },
          }
        );

      setSettings(
        nextSettings
      );

      applyThemeToDocument(
        theme
      );

      if (saveTimerRef.current) {
        clearTimeout(
          saveTimerRef.current
        );
      }

      const saved =
        await saveSettings(
          nextSettings
        );

      if (saved) {
        window.dispatchEvent(
          new CustomEvent(
            'eazy-don-check-theme-change',
            {
              detail: {
                theme,
              },
            }
          )
        );

        window.dispatchEvent(
          new CustomEvent(
            'theme-change',
            {
              detail: {
                theme,
              },
            }
          )
        );
      }
    };

  // ==========================================================
  // EXPORT USER DATA
  // ==========================================================

  const handleExportData = async (
    format = 'pdf'
  ) => {
    if (isExporting) {
      return;
    }

    const normalizedFormat =
      format === 'docx' ||
      format === 'word'
        ? 'docx'
        : 'pdf';

    try {
      setIsExporting(true);
      setExportFormat(
        normalizedFormat
      );
      setError('');
      setSuccess('');

      const response =
        await apiClient.get(
          `/settings/export?format=${normalizedFormat}`,
          {
            responseType: 'blob',
          }
        );

      const contentType =
        response?.headers?.[
          'content-type'
        ] ||
        (normalizedFormat === 'pdf'
          ? 'application/pdf'
          : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');

      const blob =
        new Blob(
          [response.data],
          {
            type: contentType,
          }
        );

      const url =
        window.URL.createObjectURL(
          blob
        );

      const link =
        document.createElement(
          'a'
        );

      link.href = url;

      const date =
        new Date()
          .toISOString()
          .slice(0, 10);

      link.download =
        normalizedFormat === 'pdf'
          ? `EAZY-DON-CHECK-personal-data-${date}.pdf`
          : `EAZY-DON-CHECK-personal-data-${date}.docx`;

      document.body.appendChild(
        link
      );

      link.click();

      link.remove();

      window.URL.revokeObjectURL(
        url
      );

      setSuccess(
        normalizedFormat === 'pdf'
          ? 'Your account data has been exported as a PDF successfully.'
          : 'Your account data has been exported as a Word document successfully.'
      );

      window.setTimeout(() => {
        if (mountedRef.current) {
          setSuccess('');
        }
      }, 4000);
    } catch (requestError) {
      console.error(
        'EXPORT DATA ERROR:',
        requestError
      );

      let message =
        'Failed to export your account data.';

      try {
        const responseData =
          requestError?.response?.data;

        if (
          responseData instanceof Blob
        ) {
          const errorText =
            await responseData.text();

          if (errorText) {
            try {
              const parsed =
                JSON.parse(
                  errorText
                );

              message =
                parsed?.message ||
                parsed?.error ||
                message;
            } catch {
              if (
                errorText.trim()
              ) {
                message =
                  errorText;
              }
            }
          }
        } else {
          message =
            requestError?.response?.data?.message ||
            requestError?.response?.data?.error ||
            requestError?.message ||
            message;
        }
      } catch {
        message =
          requestError?.response?.data?.message ||
          requestError?.message ||
          message;
      }

      if (mountedRef.current) {
        setError(message);
      }
    } finally {
      if (mountedRef.current) {
        setIsExporting(false);
        setExportFormat(null);
      }
    }
  };

  // ==========================================================
  // TWO-FACTOR SETUP
  // ==========================================================

  const handleStartTwoFactor =
    async () => {
      try {
        setSecurityBusy(true);
        setError('');
        setSuccess('');
        setTwoFactorCode('');
        setRecoveryCodes([]);

        const response =
          await apiClient.post(
            '/security/2fa/setup'
          );

        const data =
          response?.data?.data ||
          response?.data ||
          {};

        if (!data) {
          throw new Error(
            'The server did not return two-factor setup information.'
          );
        }

        setTwoFactorSetup(
          data
        );
      } catch (requestError) {
        console.error(
          '2FA SETUP ERROR:',
          requestError
        );

        setError(
          getApiErrorMessage(
            requestError,
            'Unable to start two-factor authentication setup.'
          )
        );
      } finally {
        if (mountedRef.current) {
          setSecurityBusy(false);
        }
      }
    };

  // ==========================================================
  // ENABLE TWO-FACTOR
  // ==========================================================

  const handleEnableTwoFactor =
    async () => {
      const code =
        twoFactorCode.trim();

      if (
        !code ||
        code.length !== 6
      ) {
        setError(
          'Enter the 6-digit authentication code.'
        );
        return;
      }

      try {
        setSecurityBusy(true);
        setError('');
        setSuccess('');

        const response =
          await apiClient.post(
            '/security/2fa/enable',
            {
              code,
            }
          );

        const data =
          response?.data?.data ||
          response?.data ||
          {};

        const codes =
          Array.isArray(
            data.recoveryCodes
          )
            ? data.recoveryCodes
            : Array.isArray(
                response?.data?.recoveryCodes
              )
            ? response.data.recoveryCodes
            : [];

        setRecoveryCodes(
          codes
        );

        setTwoFactorSetup(
          null
        );

        setTwoFactorCode(
          ''
        );

        setSecurityStatus(
          (previous) => ({
            ...previous,
            twoFactorEnabled: true,
          })
        );

        setSettings(
          (previous) =>
            deepMerge(
              previous,
              {
                security: {
                  twoFactorEnabled: true,
                },
              }
            )
        );

        setSuccess(
          codes.length > 0
            ? 'Two-factor authentication has been enabled. Save your recovery codes securely.'
            : 'Two-factor authentication has been enabled successfully.'
        );
      } catch (requestError) {
        console.error(
          'ENABLE 2FA ERROR:',
          requestError
        );

        setError(
          getApiErrorMessage(
            requestError,
            'Unable to enable two-factor authentication.'
          )
        );
      } finally {
        if (mountedRef.current) {
          setSecurityBusy(false);
        }
      }
    };

  // ==========================================================
  // DISABLE TWO-FACTOR
  // ==========================================================

  const handleDisableTwoFactor =
    async () => {
      if (
        !disableTwoFactorPassword
      ) {
        setError(
          'Enter your current password.'
        );
        return;
      }

      if (
        !disableTwoFactorCode ||
        disableTwoFactorCode.length !== 6
      ) {
        setError(
          'Enter your 6-digit authentication code.'
        );
        return;
      }

      try {
        setSecurityBusy(true);
        setError('');
        setSuccess('');

        await apiClient.post(
          '/security/2fa/disable',
          {
            password:
              disableTwoFactorPassword,
            code:
              disableTwoFactorCode,
          }
        );

        setSecurityStatus(
          (previous) => ({
            ...previous,
            twoFactorEnabled: false,
          })
        );

        setSettings(
          (previous) =>
            deepMerge(
              previous,
              {
                security: {
                  twoFactorEnabled: false,
                },
              }
            )
        );

        setDisableTwoFactorOpen(
          false
        );

        setDisableTwoFactorPassword(
          ''
        );

        setDisableTwoFactorCode(
          ''
        );

        setSuccess(
          'Two-factor authentication has been disabled.'
        );
      } catch (requestError) {
        console.error(
          'DISABLE 2FA ERROR:',
          requestError
        );

        setError(
          getApiErrorMessage(
            requestError,
            'Unable to disable two-factor authentication.'
          )
        );
      } finally {
        if (mountedRef.current) {
          setSecurityBusy(false);
        }
      }
    };

  // ==========================================================
  // OPEN BIOMETRIC DEVICE NAME MODAL
  // ==========================================================

  const handleOpenBiometricRegistration =
    () => {
      if (!biometricSupported) {
        setError(
          'Biometric authentication is not available on this device or browser.'
        );
        return;
      }

      setBiometricDeviceName(
        ''
      );

      setBiometricNameModalOpen(
        true
      );
    };

  // ==========================================================
  // REGISTER BIOMETRIC
  // ==========================================================

  const handleRegisterBiometric =
    async () => {
      if (!biometricSupported) {
        setError(
          'Biometric authentication is not available on this device or browser.'
        );
        return;
      }

      try {
        setSecurityBusy(true);
        setError('');
        setSuccess('');

        // ------------------------------------------------------
        // 1. Get WebAuthn registration options
        // ------------------------------------------------------

        const optionsResponse =
          await apiClient.post(
            '/security/biometric/register/options'
          );

        const responseData =
          optionsResponse?.data?.data ||
          optionsResponse?.data ||
          {};

        const options =
          responseData?.options ||
          responseData?.registrationOptions ||
          responseData;

        console.log(
          '🔐 WebAuthn registration response:',
          optionsResponse?.data
        );

        console.log(
          '🔐 WebAuthn registration options:',
          options
        );

        // ------------------------------------------------------
        // 2. Validate registration options
        // ------------------------------------------------------

        if (
          !options ||
          typeof options !== 'object'
        ) {
          throw new Error(
            'The server did not return WebAuthn registration options.'
          );
        }

        if (!options.challenge) {
          console.error(
            '❌ WebAuthn options are missing challenge:',
            options
          );

          throw new Error(
            'The server returned invalid WebAuthn registration options. The required challenge is missing.'
          );
        }

        if (
          !options.rp ||
          !options.rp.name ||
          !options.rp.id
        ) {
          console.error(
            '❌ WebAuthn options are missing RP information:',
            options
          );

          throw new Error(
            'The server returned invalid WebAuthn registration options. RP information is missing.'
          );
        }

        if (
          !options.user ||
          !options.user.id ||
          !options.user.name
        ) {
          console.error(
            '❌ WebAuthn options are missing user information:',
            options
          );

          throw new Error(
            'The server returned invalid WebAuthn registration options. User information is missing.'
          );
        }

        // ------------------------------------------------------
        // 3. Start browser/platform registration
        // ------------------------------------------------------

        const {
          startRegistration,
        } = await import(
          '@simplewebauthn/browser'
        );

        const registrationResponse =
          await startRegistration({
            optionsJSON: options,
          });

        console.log(
          '✅ WebAuthn registration response:',
          registrationResponse
        );

        // ------------------------------------------------------
        // 4. Validate browser response
        // ------------------------------------------------------

        if (
          !registrationResponse ||
          typeof registrationResponse !== 'object'
        ) {
          throw new Error(
            'The browser did not return a valid WebAuthn registration response.'
          );
        }

        if (
          !registrationResponse.id ||
          !registrationResponse.response ||
          typeof registrationResponse.response !==
            'object'
        ) {
          console.error(
            '❌ Invalid WebAuthn browser response:',
            registrationResponse
          );

          throw new Error(
            'The browser returned an incomplete biometric registration response.'
          );
        }

        // ------------------------------------------------------
        // 5. IMPORTANT:
        // Send the COMPLETE SimpleWebAuthn response at the
        // TOP LEVEL.
        //
        // DO NOT send:
        //
        // {
        //   response: registrationResponse
        // }
        //
        // The backend expects:
        //
        // {
        //   id,
        //   rawId,
        //   response,
        //   type,
        //   ...
        // }
        // ------------------------------------------------------

        const verificationPayload = {
          ...registrationResponse,

          deviceName:
            biometricDeviceName.trim() ||
            'This device',
        };

        console.log(
          '📤 Sending biometric registration verification payload:',
          verificationPayload
        );

        const verifyResponse =
          await apiClient.post(
            '/security/biometric/register/verify',
            verificationPayload
          );

        const verifyData =
          verifyResponse?.data?.data ||
          verifyResponse?.data ||
          {};

        console.log(
          '✅ WebAuthn verification response:',
          verifyResponse?.data
        );

        // ------------------------------------------------------
        // 6. Update local security state
        // ------------------------------------------------------

        setSecurityStatus(
          (previous) => ({
            ...previous,

            biometricEnabled: true,

            biometricCredentials:
              Array.isArray(
                verifyData.biometricCredentials
              )
                ? verifyData.biometricCredentials
                : previous.biometricCredentials,
          })
        );

        setSettings(
          (previous) =>
            deepMerge(
              previous,
              {
                security: {
                  biometricEnabled: true,
                },
              }
            )
        );

        setBiometricDeviceName('');
        setBiometricNameModalOpen(false);

        setSuccess(
          'Biometric authentication has been registered successfully.'
        );

        // Refresh from backend so the device list is always
        // synchronized with MongoDB.
        await loadSecurityStatus();
      } catch (requestError) {
        console.error(
          'BIOMETRIC REGISTRATION ERROR:',
          requestError
        );

        console.error(
          'BIOMETRIC REGISTRATION SERVER RESPONSE:',
          requestError?.response?.data
        );

        let message =
          getApiErrorMessage(
            requestError,
            'Biometric registration failed.'
          );

        if (
          requestError?.name ===
          'NotAllowedError'
        ) {
          message =
            'Biometric registration was cancelled or not allowed by the browser.';
        }

        if (
          requestError?.name ===
          'InvalidStateError'
        ) {
          message =
            'This biometric credential may already be registered on this device.';
        }

        if (
          requestError?.name ===
          'NotSupportedError'
        ) {
          message =
            'This browser or device does not support the requested biometric authentication method.';
        }

        if (
          requestError?.name ===
          'SecurityError'
        ) {
          message =
            'WebAuthn security requirements were not satisfied. Make sure the application is running over HTTPS or localhost and that the configured RP ID matches the current domain.';
        }

        if (
          requestError?.response?.status === 400
        ) {
          const serverMessage =
            requestError?.response?.data?.message ||
            requestError?.response?.data?.error;

          if (serverMessage) {
            message = serverMessage;
          }
        }

        if (mountedRef.current) {
          setError(message);
        }
      } finally {
        if (mountedRef.current) {
          setSecurityBusy(false);
        }
      }
    };

  // ==========================================================
  // REMOVE BIOMETRIC
  // ==========================================================

  const handleRemoveBiometric =
    async (
      credentialId
    ) => {
      if (!credentialId) {
        setError(
          'Biometric credential ID is missing.'
        );
        return;
      }

      try {
        setSecurityBusy(true);
        setError('');
        setSuccess('');

        await apiClient.delete(
          `/security/biometric/${encodeURIComponent(
            credentialId
          )}`
        );

        const remaining =
          securityStatus.biometricCredentials.filter(
            (credential) =>
              String(
                credential.id ||
                  credential.credentialId ||
                  credential._id
              ) !==
              String(
                credentialId
              )
          );

        setSecurityStatus(
          (previous) => ({
            ...previous,
            biometricEnabled:
              remaining.length > 0,

            biometricCredentials:
              remaining,
          })
        );

        setSettings(
          (previous) =>
            deepMerge(
              previous,
              {
                security: {
                  biometricEnabled:
                    remaining.length > 0,
                },
              }
            )
        );

        setSuccess(
          'Biometric credential removed successfully.'
        );
      } catch (requestError) {
        console.error(
          'REMOVE BIOMETRIC ERROR:',
          requestError
        );

        setError(
          getApiErrorMessage(
            requestError,
            'Unable to remove the biometric credential.'
          )
        );
      } finally {
        if (mountedRef.current) {
          setSecurityBusy(false);
        }
      }
    };

  // ==========================================================
  // CHANGE PASSWORD
  // ==========================================================

  const handleChangePassword =
    () => {
      setError(
        'Password change is handled from the security system. Connect the Change Password endpoint before enabling this action.'
      );
    };

  // ==========================================================
  // DELETE ACCOUNT
  // ==========================================================

  const handleDeleteAccount =
    () => {
      setError(
        'Account deletion requires the dedicated secure account-deletion endpoint before it can be performed.'
      );

      setDeleteConfirmOpen(
        false
      );
    };

  // ==========================================================
  // SECTIONS
  // ==========================================================

  const sections = useMemo(
    () => [
      {
        id: 'appearance',
        label: 'Appearance',
        icon: Sparkles,
      },
      {
        id: 'notifications',
        label: 'Notifications',
        icon: Bell,
      },
      {
        id: 'privacy',
        label: 'Privacy',
        icon: Eye,
      },
      {
        id: 'security',
        label: 'Security',
        icon: Shield,
      },
      {
        id: 'verification',
        label: 'Verification',
        icon: Activity,
      },
      {
        id: 'community',
        label: 'Community',
        icon: Users,
      },
      {
        id: 'account',
        label: 'Account',
        icon: User,
      },
    ],
    []
  );

  // ==========================================================
  // SCROLL SPY
  // ==========================================================

  useEffect(() => {
    if (isLoading) {
      return undefined;
    }

    const observer =
      new IntersectionObserver(
        (entries) => {
          const visible =
            entries
              .filter(
                (entry) =>
                  entry.isIntersecting
              )
              .sort(
                (a, b) =>
                  b.intersectionRatio -
                  a.intersectionRatio
              );

          if (
            visible.length > 0 &&
            mountedRef.current
          ) {
            setActiveSection(
              visible[0].target.id
            );
          }
        },
        {
          rootMargin:
            '-100px 0px -55% 0px',
          threshold: [
            0,
            0.1,
            0.25,
            0.5,
          ],
        }
      );

    sections.forEach(
      (section) => {
        const element =
          document.getElementById(
            section.id
          );

        if (element) {
          observer.observe(
            element
          );
        }
      }
    );

    return () => {
      observer.disconnect();
    };
  }, [
    sections,
    isLoading,
  ]);

  // ==========================================================
  // SCROLL TO SECTION
  // ==========================================================

  const scrollToSection =
    (id) => {
      setActiveSection(id);

      document
        .getElementById(id)
        ?.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
        });
    };

  // ==========================================================
  // CLOSE MODALS WITH ESCAPE
  // ==========================================================

  useEffect(() => {
    const handleKeyDown =
      (event) => {
        if (
          event.key !==
          'Escape'
        ) {
          return;
        }

        if (
          twoFactorSetup
        ) {
          setTwoFactorSetup(
            null
          );

          return;
        }

        if (
          recoveryCodes.length > 0
        ) {
          setRecoveryCodes(
            []
          );

          return;
        }

        if (
          disableTwoFactorOpen
        ) {
          setDisableTwoFactorOpen(
            false
          );

          return;
        }

        if (
          biometricNameModalOpen
        ) {
          setBiometricNameModalOpen(
            false
          );

          return;
        }

        if (
          deleteConfirmOpen
        ) {
          setDeleteConfirmOpen(
            false
          );
        }
      };

    window.addEventListener(
      'keydown',
      handleKeyDown
    );

    return () => {
      window.removeEventListener(
        'keydown',
        handleKeyDown
      );
    };
  }, [
    twoFactorSetup,
    recoveryCodes,
    disableTwoFactorOpen,
    biometricNameModalOpen,
    deleteConfirmOpen,
  ]);

  // ==========================================================
  // LOADING
  // ==========================================================

  if (isLoading) {
    return (
      <AppLayout>
        <SettingsSpinner />
      </AppLayout>
    );
  }

  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <AppLayout>
      <div className="min-h-full bg-slate-50 dark:bg-dark-bg transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">

          {/* HEADER */}
          <div className="mb-6">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div>
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-brand-600 text-white flex items-center justify-center shadow-sm">
                    <Sparkles className="w-5 h-5" />
                  </div>

                  <div>
                    <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
                      Settings
                    </h1>

                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                      Manage your EAZY DON CHECK account,
                      preferences and security.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <ThemeToggle />

                {isSaving && (
                  <div className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-xl bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border text-xs text-slate-500 dark:text-slate-400">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Saving...
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ALERTS */}
          {error && (
            <div className="mb-5 flex items-start gap-3 rounded-xl border border-red-200 dark:border-red-500/20 bg-red-50 dark:bg-red-500/10 px-4 py-3">
              <AlertCircle className="w-5 h-5 shrink-0 text-red-600 dark:text-red-400 mt-0.5" />

              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-red-700 dark:text-red-300">
                  {error}
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setError('')
                }
                className="text-red-500 hover:text-red-700 dark:hover:text-red-300"
                aria-label="Dismiss error"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {success && (
            <div className="mb-5 flex items-start gap-3 rounded-xl border border-emerald-200 dark:border-emerald-500/20 bg-emerald-50 dark:bg-emerald-500/10 px-4 py-3">
              <Check className="w-5 h-5 shrink-0 text-emerald-600 dark:text-emerald-400 mt-0.5" />

              <p className="flex-1 text-sm font-medium text-emerald-700 dark:text-emerald-300">
                {success}
              </p>

              <button
                type="button"
                onClick={() =>
                  setSuccess('')
                }
                className="text-emerald-500 hover:text-emerald-700 dark:hover:text-emerald-300"
                aria-label="Dismiss success message"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* MAIN LAYOUT */}
          <div className="grid grid-cols-1 lg:grid-cols-[230px_minmax(0,1fr)] gap-6">

            {/* SETTINGS NAVIGATION */}
            <aside className="lg:sticky lg:top-6 lg:self-start">
              <div className="rounded-2xl border border-slate-200 dark:border-dark-border bg-white dark:bg-dark-card p-2 shadow-sm">
                <div className="px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Settings
                </div>

                <nav className="space-y-1">
                  {sections.map(
                    ({
                      id,
                      label,
                      icon: Icon,
                    }) => {
                      const active =
                        activeSection ===
                        id;

                      return (
                        <button
                          key={id}
                          type="button"
                          onClick={() =>
                            scrollToSection(
                              id
                            )
                          }
                          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left text-sm font-medium transition-colors ${
                            active
                              ? 'bg-brand-50 dark:bg-brand-500/10 text-brand-700 dark:text-brand-400'
                              : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-dark-bg'
                          }`}
                        >
                          <Icon className="w-4 h-4 shrink-0" />

                          <span>
                            {label}
                          </span>
                        </button>
                      );
                    }
                  )}
                </nav>
              </div>
            </aside>

            {/* SETTINGS CONTENT */}
            <main className="space-y-6">

              {/* APPEARANCE */}
              <SectionCard
                id="appearance"
                icon={Sparkles}
                title="Appearance"
                description="Customize how EAZY DON CHECK looks on your device."
              >
                <SettingRow
                  icon={Monitor}
                  title="Theme"
                  description="Choose the appearance used throughout the application."
                >
                  <SelectField
                    value={
                      settings.appearance
                        .theme
                    }
                    onChange={
                      handleThemePreference
                    }
                    options={[
                      {
                        value: 'system',
                        label: 'System',
                      },
                      {
                        value: 'light',
                        label: 'Light',
                      },
                      {
                        value: 'dark',
                        label: 'Dark',
                      },
                    ]}
                  />
                </SettingRow>

                <SettingRow
                  icon={Sun}
                  title="Quick Theme Toggle"
                  description="Switch between the available theme modes using the global theme control."
                >
                  <ThemeToggle />
                </SettingRow>
              </SectionCard>

              {/* NOTIFICATIONS */}
              <SectionCard
                id="notifications"
                icon={Bell}
                title="Notifications"
                description="Choose which notifications you want to receive."
              >
                <SettingRow
                  icon={Activity}
                  title="System Notifications"
                  description="Receive important system and account notifications."
                >
                  <Toggle
                    checked={
                      settings.notifications
                        .system
                    }
                    onChange={(value) =>
                      updateSetting(
                        'notifications',
                        'system',
                        value
                      )
                    }
                  />
                </SettingRow>

                <SettingRow
                  icon={MessageCircle}
                  title="Messages"
                  description="Receive notifications when you receive new messages."
                >
                  <Toggle
                    checked={
                      settings.notifications
                        .messages
                    }
                    onChange={(value) =>
                      updateSetting(
                        'notifications',
                        'messages',
                        value
                      )
                    }
                  />
                </SettingRow>

                <SettingRow
                  icon={Users}
                  title="Friend Requests"
                  description="Notify me when someone sends me a friend request."
                >
                  <Toggle
                    checked={
                      settings.notifications
                        .friendRequests
                    }
                    onChange={(value) =>
                      updateSetting(
                        'notifications',
                        'friendRequests',
                        value
                      )
                    }
                  />
                </SettingRow>

                <SettingRow
                  icon={MessageCircle}
                  title="Comments"
                  description="Receive notifications about comments on your content."
                >
                  <Toggle
                    checked={
                      settings.notifications
                        .comments
                    }
                    onChange={(value) =>
                      updateSetting(
                        'notifications',
                        'comments',
                        value
                      )
                    }
                  />
                </SettingRow>

                <SettingRow
                  icon={Check}
                  title="Likes"
                  description="Receive notifications when people like your content."
                >
                  <Toggle
                    checked={
                      settings.notifications
                        .likes
                    }
                    onChange={(value) =>
                      updateSetting(
                        'notifications',
                        'likes',
                        value
                      )
                    }
                  />
                </SettingRow>

                <SettingRow
                  icon={Mail}
                  title="Email Notifications"
                  description="Receive account and important activity notifications by email."
                >
                  <Toggle
                    checked={
                      settings.notifications
                        .email
                    }
                    onChange={(value) =>
                      updateSetting(
                        'notifications',
                        'email',
                        value
                      )
                    }
                  />
                </SettingRow>
              </SectionCard>

              {/* PRIVACY */}
              <SectionCard
                id="privacy"
                icon={Eye}
                title="Privacy"
                description="Control who can see your information and interact with you."
              >
                <SettingRow
                  icon={Globe}
                  title="Profile Visibility"
                  description="Choose who can view your profile."
                >
                  <SelectField
                    value={
                      settings.privacy
                        .profileVisibility
                    }
                    onChange={(value) =>
                      updateSetting(
                        'privacy',
                        'profileVisibility',
                        value
                      )
                    }
                    options={[
                      {
                        value: 'public',
                        label: 'Public',
                      },
                      {
                        value: 'friends',
                        label: 'Friends',
                      },
                      {
                        value: 'private',
                        label: 'Private',
                      },
                    ]}
                  />
                </SettingRow>

                <SettingRow
                  icon={MessageCircle}
                  title="Who Can Message Me"
                  description="Choose who can start a conversation with you."
                >
                  <SelectField
                    value={
                      settings.privacy
                        .whoCanMessage
                    }
                    onChange={(value) =>
                      updateSetting(
                        'privacy',
                        'whoCanMessage',
                        value
                      )
                    }
                    options={[
                      {
                        value: 'everyone',
                        label: 'Everyone',
                      },
                      {
                        value: 'friends',
                        label: 'Friends',
                      },
                      {
                        value: 'nobody',
                        label: 'Nobody',
                      },
                    ]}
                  />
                </SettingRow>

                <SettingRow
                  icon={Activity}
                  title="Show Online Status"
                  description="Allow other members to see when you are online."
                >
                  <Toggle
                    checked={
                      settings.privacy
                        .showOnlineStatus
                    }
                    onChange={(value) =>
                      updateSetting(
                        'privacy',
                        'showOnlineStatus',
                        value
                      )
                    }
                  />
                </SettingRow>

                <SettingRow
                  icon={Activity}
                  title="Show Activity Status"
                  description="Allow other members to see your recent activity status."
                >
                  <Toggle
                    checked={
                      settings.privacy
                        .showActivityStatus
                    }
                    onChange={(value) =>
                      updateSetting(
                        'privacy',
                        'showActivityStatus',
                        value
                      )
                    }
                  />
                </SettingRow>
              </SectionCard>

              {/* SECURITY */}
              <SectionCard
                id="security"
                icon={Shield}
                title="Security"
                description="Protect your account with additional authentication and security controls."
              >
                <SettingRow
                  icon={KeyRound}
                  title="Two-Factor Authentication"
                  description={
                    securityStatus.twoFactorEnabled
                      ? 'Two-factor authentication is currently enabled.'
                      : 'Add an authenticator app as an additional layer of protection.'
                  }
                >
                  {securityStatus.twoFactorEnabled ? (
                    <button
                      type="button"
                      onClick={() =>
                        setDisableTwoFactorOpen(
                          true
                        )
                      }
                      disabled={
                        securityBusy
                      }
                      className="px-3 py-2 rounded-xl border border-red-200 dark:border-red-500/20 bg-red-50 dark:bg-red-500/10 text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-500/20 disabled:opacity-50"
                    >
                      Disable
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={
                        handleStartTwoFactor
                      }
                      disabled={
                        securityBusy
                      }
                      className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold disabled:opacity-50"
                    >
                      {securityBusy ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Shield className="w-4 h-4" />
                      )}

                      Enable
                    </button>
                  )}
                </SettingRow>

                <SettingRow
                  icon={Fingerprint}
                  title="Biometric Authentication"
                  description={
                    biometricSupported
                      ? 'Use your device fingerprint or platform biometric authenticator to sign in.'
                      : 'Biometric authentication is unavailable on this device or browser.'
                  }
                >
                  <div className="flex items-center gap-2">
                    {securityStatus
                      .biometricEnabled && (
                      <span className="hidden sm:inline-flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                        <Check className="w-3.5 h-3.5" />
                        Enabled
                      </span>
                    )}

                    <button
                      type="button"
                      onClick={
                        handleOpenBiometricRegistration
                      }
                      disabled={
                        !biometricSupported ||
                        securityBusy
                      }
                      className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 dark:border-dark-border bg-white dark:bg-dark-bg text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-dark-card disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {securityBusy ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Fingerprint className="w-4 h-4" />
                      )}

                      {securityStatus.biometricEnabled
                        ? 'Add Device'
                        : 'Set Up'}
                    </button>
                  </div>
                </SettingRow>

                {securityStatus
                  .biometricCredentials
                  ?.length > 0 && (
                  <div className="px-5 sm:px-6 py-5 bg-slate-50/70 dark:bg-dark-bg/50">
                    <div className="mb-3">
                      <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                        Registered biometric devices
                      </h3>

                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        Remove a device if you no longer want it
                        to authenticate your account.
                      </p>
                    </div>

                    <div className="space-y-2">
                      {securityStatus.biometricCredentials.map(
                        (
                          credential,
                          index
                        ) => {
                          const credentialId =
                            credential.id ||
                            credential.credentialId ||
                            credential._id;

                          const deviceName =
                            credential.deviceName ||
                            credential.name ||
                            `Biometric device ${
                              index + 1
                            }`;

                          return (
                            <div
                              key={
                                credentialId ||
                                index
                              }
                              className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 dark:border-dark-border bg-white dark:bg-dark-card px-3 py-3"
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <div className="w-9 h-9 rounded-lg bg-brand-50 dark:bg-brand-500/10 text-brand-600 dark:text-brand-400 flex items-center justify-center shrink-0">
                                  <Fingerprint className="w-4 h-4" />
                                </div>

                                <div className="min-w-0">
                                  <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">
                                    {deviceName}
                                  </p>

                                  {credential.createdAt && (
                                    <p className="text-xs text-slate-400">
                                      Added{' '}
                                      {formatDate(
                                        credential.createdAt
                                      )}
                                    </p>
                                  )}
                                </div>
                              </div>

                              <button
                                type="button"
                                onClick={() =>
                                  handleRemoveBiometric(
                                    credentialId
                                  )
                                }
                                disabled={
                                  securityBusy
                                }
                                className="text-xs font-semibold text-red-600 dark:text-red-400 hover:underline disabled:opacity-50 shrink-0"
                              >
                                Remove
                              </button>
                            </div>
                          );
                        }
                      )}
                    </div>
                  </div>
                )}

                <SettingRow
                  icon={Lock}
                  title="Sensitive Action Confirmation"
                  description="Require additional confirmation before sensitive account actions."
                >
                  <Toggle
                    checked={
                      settings.security
                        .sensitiveActionConfirmation
                    }
                    onChange={(value) =>
                      updateSetting(
                        'security',
                        'sensitiveActionConfirmation',
                        value
                      )
                    }
                  />
                </SettingRow>

                <SettingRow
                  icon={KeyRound}
                  title="Password"
                  description="Change the password used to protect your account."
                >
                  <button
                    type="button"
                    onClick={
                      handleChangePassword
                    }
                    className="px-3 py-2 rounded-xl border border-slate-200 dark:border-dark-border bg-white dark:bg-dark-bg text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-dark-card"
                  >
                    Change Password
                  </button>
                </SettingRow>
              </SectionCard>

              {/* VERIFICATION */}
              <SectionCard
                id="verification"
                icon={Activity}
                title="Verification"
                description="Control receipt verification and scan-related preferences."
              >
                <SettingRow
                  icon={Bell}
                  title="Scan Notifications"
                  description="Notify me when receipt verification scans are completed."
                >
                  <Toggle
                    checked={
                      settings.verification
                        .scanNotifications
                    }
                    onChange={(value) =>
                      updateSetting(
                        'verification',
                        'scanNotifications',
                        value
                      )
                    }
                  />
                </SettingRow>

                <SettingRow
                  icon={Check}
                  title="Verification Results"
                  description="Show verification results and related status notifications."
                >
                  <Toggle
                    checked={
                      settings.verification
                        .verificationResults
                    }
                    onChange={(value) =>
                      updateSetting(
                        'verification',
                        'verificationResults',
                        value
                      )
                    }
                  />
                </SettingRow>

                <SettingRow
                  icon={Save}
                  title="Save Scan History"
                  description="Keep your receipt verification history in your account."
                >
                  <Toggle
                    checked={
                      settings.verification
                        .saveScanHistory
                    }
                    onChange={(value) =>
                      updateSetting(
                        'verification',
                        'saveScanHistory',
                        value
                      )
                    }
                  />
                </SettingRow>
              </SectionCard>

              {/* COMMUNITY */}
              <SectionCard
                id="community"
                icon={Users}
                title="Community"
                description="Manage your community interaction preferences."
              >
                <SettingRow
                  icon={Users}
                  title="Friend Requests"
                  description="Allow other members to send you friend requests."
                >
                  <Toggle
                    checked={
                      settings.community
                        .friendRequests
                    }
                    onChange={(value) =>
                      updateSetting(
                        'community',
                        'friendRequests',
                        value
                      )
                    }
                  />
                </SettingRow>

                <SettingRow
                  icon={Bell}
                  title="Community Notifications"
                  description="Receive notifications about community activity."
                >
                  <Toggle
                    checked={
                      settings.community
                        .communityNotifications
                    }
                    onChange={(value) =>
                      updateSetting(
                        'community',
                        'communityNotifications',
                        value
                      )
                    }
                  />
                </SettingRow>

                <SettingRow
                  icon={Users}
                  title="Profile Suggestions"
                  description="Allow EAZY DON CHECK to suggest relevant profiles to you."
                >
                  <Toggle
                    checked={
                      settings.community
                        .profileSuggestions
                    }
                    onChange={(value) =>
                      updateSetting(
                        'community',
                        'profileSuggestions',
                        value
                      )
                    }
                  />
                </SettingRow>
              </SectionCard>

              {/* ACCOUNT */}
              <SectionCard
                id="account"
                icon={User}
                title="Account"
                description="Manage your account data and account-level actions."
              >
                <SettingRow
                  icon={User}
                  title="Account"
                  description={
                    user?.email
                      ? `Signed in as ${user.email}`
                      : 'Manage your EAZY DON CHECK account.'
                  }
                >
                  <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
                    {user?.role ||
                      'User'}
                  </div>
                </SettingRow>

                <SettingRow
                  icon={Download}
                  title="Export Your Data"
                  description="Download a copy of the personal account data and settings stored for your account as a PDF or Microsoft Word document."
                >
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        handleExportData(
                          'pdf'
                        )
                      }
                      disabled={
                        isExporting
                      }
                      className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isExporting &&
                      exportFormat ===
                        'pdf' ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Exporting PDF...
                        </>
                      ) : (
                        <>
                          <Download className="w-4 h-4" />
                          Export PDF
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        handleExportData(
                          'docx'
                        )
                      }
                      disabled={
                        isExporting
                      }
                      className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-dark-border bg-white dark:bg-dark-card text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-dark-bg text-xs font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isExporting &&
                      exportFormat ===
                        'docx' ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Exporting Word...
                        </>
                      ) : (
                        <>
                          <Download className="w-4 h-4" />
                          Export Word
                        </>
                      )}
                    </button>
                  </div>
                </SettingRow>

                <SettingRow
                  icon={Trash2}
                  title="Delete Account"
                  description="Permanently delete your EAZY DON CHECK account and associated account data."
                  danger
                >
                  <button
                    type="button"
                    onClick={() =>
                      setDeleteConfirmOpen(
                        true
                      )
                    }
                    className="px-3 py-2 rounded-xl border border-red-200 dark:border-red-500/20 bg-red-50 dark:bg-red-500/10 text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-500/20"
                  >
                    Delete Account
                  </button>
                </SettingRow>
              </SectionCard>

              {/* SAVE STATUS */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-2xl border border-slate-200 dark:border-dark-border bg-white dark:bg-dark-card px-5 py-4">
                <div>
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">
                    Settings
                  </p>

                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Changes are saved automatically.
                  </p>
                </div>

                {isSaving ? (
                  <div className="inline-flex items-center gap-2 text-xs font-semibold text-brand-600 dark:text-brand-400">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Saving changes...
                  </div>
                ) : (
                  <div className="inline-flex items-center gap-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                    <Check className="w-4 h-4" />
                    All changes saved
                  </div>
                )}
              </div>
            </main>
          </div>
        </div>

        {/* ======================================================
            2FA SETUP MODAL
        ====================================================== */}

        {twoFactorSetup && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-dark-border">
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                    Set Up Two-Factor Authentication
                  </h3>

                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Use your authenticator app to complete setup.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setTwoFactorSetup(
                      null
                    );
                    setTwoFactorCode(
                      ''
                    );
                  }}
                  className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-100 dark:hover:bg-dark-bg"
                  aria-label="Close 2FA setup"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-5 space-y-5">
                {twoFactorSetup.qrCode && (
                  <div className="flex justify-center">
                    <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm">
                      <img
                        src={
                          twoFactorSetup.qrCode
                        }
                        alt="Two-factor authentication QR code"
                        className="w-52 h-52 object-contain"
                      />
                    </div>
                  </div>
                )}

                <div className="rounded-xl bg-slate-50 dark:bg-dark-bg border border-slate-200 dark:border-dark-border p-4">
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    Scan the QR code with your authenticator app.
                    Then enter the 6-digit verification code below.
                  </p>

                  {twoFactorSetup.secret && (
                    <div className="mt-3">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                        Manual setup key
                      </p>

                      <code className="block mt-1 break-all text-xs text-slate-700 dark:text-slate-200 font-mono">
                        {twoFactorSetup.secret}
                      </code>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                    Authentication Code
                  </label>

                  <input
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    value={
                      twoFactorCode
                    }
                    onChange={(event) =>
                      setTwoFactorCode(
                        event.target.value
                          .replace(
                            /\D/g,
                            ''
                          )
                          .slice(
                            0,
                            6
                          )
                      )
                    }
                    placeholder="000000"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-dark-border bg-white dark:bg-dark-bg text-center text-lg font-bold tracking-[0.35em] text-slate-900 dark:text-white outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
                  />
                </div>

                <button
                  type="button"
                  onClick={
                    handleEnableTwoFactor
                  }
                  disabled={
                    securityBusy ||
                    twoFactorCode.length !==
                      6
                  }
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {securityBusy && (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  )}

                  Verify & Enable
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================
            RECOVERY CODES MODAL
        ====================================================== */}

        {recoveryCodes.length > 0 && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto">
              <div className="px-5 py-5 border-b border-slate-200 dark:border-dark-border">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                    <Check className="w-5 h-5" />
                  </div>

                  <div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                      2FA Enabled
                    </h3>

                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      Save these recovery codes somewhere secure.
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-5">
                <div className="grid grid-cols-2 gap-2">
                  {recoveryCodes.map(
                    (code) => (
                      <code
                        key={code}
                        className="rounded-lg border border-slate-200 dark:border-dark-border bg-slate-50 dark:bg-dark-bg px-3 py-2 text-center text-sm font-mono text-slate-700 dark:text-slate-200"
                      >
                        {code}
                      </code>
                    )
                  )}
                </div>

                <p className="mt-4 text-xs text-amber-600 dark:text-amber-400 leading-relaxed">
                  Each recovery code should be treated like a
                  password. Do not share them with anyone.
                </p>

                <button
                  type="button"
                  onClick={() =>
                    setRecoveryCodes(
                      []
                    )
                  }
                  className="w-full mt-5 px-4 py-3 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold"
                >
                  I Have Saved My Codes
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================
            DISABLE 2FA MODAL
        ====================================================== */}

        {disableTwoFactorOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-2xl bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border shadow-2xl overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-dark-border">
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                    Disable Two-Factor Authentication
                  </h3>

                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Verify your password and current 2FA code.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setDisableTwoFactorOpen(
                      false
                    );
                    setDisableTwoFactorPassword(
                      ''
                    );
                    setDisableTwoFactorCode(
                      ''
                    );
                  }}
                  className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-100 dark:hover:bg-dark-bg"
                  aria-label="Close disable 2FA dialog"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-5 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                    Current Password
                  </label>

                  <input
                    type="password"
                    autoComplete="current-password"
                    value={
                      disableTwoFactorPassword
                    }
                    onChange={(event) =>
                      setDisableTwoFactorPassword(
                        event.target.value
                      )
                    }
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-dark-border bg-white dark:bg-dark-bg text-sm text-slate-900 dark:text-white outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
                    placeholder="Enter your password"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                    Authentication Code
                  </label>

                  <input
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    value={
                      disableTwoFactorCode
                    }
                    onChange={(event) =>
                      setDisableTwoFactorCode(
                        event.target.value
                          .replace(
                            /\D/g,
                            ''
                          )
                          .slice(
                            0,
                            6
                          )
                      )
                    }
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-dark-border bg-white dark:bg-dark-bg text-sm text-slate-900 dark:text-white outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
                    placeholder="000000"
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setDisableTwoFactorOpen(
                        false
                      );

                      setDisableTwoFactorPassword(
                        ''
                      );

                      setDisableTwoFactorCode(
                        ''
                      );
                    }}
                    className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-dark-border text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-dark-bg"
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    onClick={
                      handleDisableTwoFactor
                    }
                    disabled={
                      securityBusy
                    }
                    className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-semibold disabled:opacity-50"
                  >
                    {securityBusy && (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    )}

                    Disable 2FA
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================
            BIOMETRIC DEVICE NAME MODAL
        ====================================================== */}

        {biometricNameModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-2xl bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border shadow-2xl overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-dark-border">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-brand-50 dark:bg-brand-500/10 text-brand-600 dark:text-brand-400 flex items-center justify-center">
                    <Fingerprint className="w-5 h-5" />
                  </div>

                  <div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                      Register Biometric Device
                    </h3>

                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      Give this device a recognizable name.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    if (!securityBusy) {
                      setBiometricNameModalOpen(
                        false
                      );
                    }
                  }}
                  className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-100 dark:hover:bg-dark-bg disabled:opacity-50"
                  disabled={
                    securityBusy
                  }
                  aria-label="Close biometric registration"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-5 space-y-5">
                <div className="rounded-xl bg-slate-50 dark:bg-dark-bg border border-slate-200 dark:border-dark-border p-4">
                  <div className="flex items-start gap-3">
                    <Smartphone className="w-5 h-5 text-brand-600 dark:text-brand-400 shrink-0 mt-0.5" />

                    <p className="text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                      Your browser will now ask you to
                      authenticate using your fingerprint,
                      Windows Hello, Touch ID, or another
                      supported platform authenticator.
                    </p>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                    Device Name
                  </label>

                  <input
                    type="text"
                    value={
                      biometricDeviceName
                    }
                    onChange={(event) =>
                      setBiometricDeviceName(
                        event.target.value.slice(
                          0,
                          80
                        )
                      )
                    }
                    onKeyDown={(event) => {
                      if (
                        event.key ===
                          'Enter' &&
                        !securityBusy
                      ) {
                        event.preventDefault();

                        handleRegisterBiometric();
                      }
                    }}
                    autoFocus
                    placeholder="e.g. My Windows PC"
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-dark-border bg-white dark:bg-dark-bg text-sm text-slate-900 dark:text-white outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
                  />

                  <p className="mt-1.5 text-[11px] text-slate-400">
                    Leave blank to use “This device”.
                  </p>
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setBiometricNameModalOpen(
                        false
                      )
                    }
                    disabled={
                      securityBusy
                    }
                    className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-dark-border text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-dark-bg disabled:opacity-50"
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    onClick={
                      handleRegisterBiometric
                    }
                    disabled={
                      securityBusy
                    }
                    className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold disabled:opacity-50"
                  >
                    {securityBusy ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Fingerprint className="w-4 h-4" />
                    )}

                    Continue
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================
            DELETE ACCOUNT MODAL
        ====================================================== */}

        {deleteConfirmOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-2xl bg-white dark:bg-dark-card border border-red-200 dark:border-red-500/20 shadow-2xl overflow-hidden">
              <div className="px-5 py-5 border-b border-slate-200 dark:border-dark-border">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 flex items-center justify-center">
                    <Trash2 className="w-5 h-5" />
                  </div>

                  <div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                      Delete Account
                    </h3>

                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      Secure account deletion is required before
                      this action can be completed.
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-5">
                <div className="rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 p-4">
                  <p className="text-sm text-red-700 dark:text-red-300 leading-relaxed">
                    Account deletion is intentionally not executed
                    from this screen until the dedicated secure
                    deletion endpoint is connected. This prevents
                    accidental permanent deletion.
                  </p>
                </div>

                <div className="flex gap-2 mt-5">
                  <button
                    type="button"
                    onClick={() =>
                      setDeleteConfirmOpen(
                        false
                      )
                    }
                    className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-dark-border text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-dark-bg"
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    onClick={
                      handleDeleteAccount
                    }
                    className="flex-1 px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-semibold"
                  >
                    Continue
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default Settings;