import React, {
  createContext,
  useState,
  useEffect,
  useContext,
  useCallback,
} from 'react';

import API from '../services/api';

const AuthContext = createContext(null);

const DEFAULT_AVATAR =
  'data:image/svg+xml;charset=UTF-8,' +
  encodeURIComponent(`
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="300"
      height="300"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#94a3b8"
      stroke-width="1.5"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      <rect width="24" height="24" rx="12" fill="#0f172a"/>
      <circle cx="12" cy="8" r="3.5"/>
      <path d="M4.5 20c.8-4 3.5-6 7.5-6s6.7 2 7.5 6"/>
    </svg>
  `);

const isInvalidAvatar = (value) => {
  if (!value || typeof value !== 'string') return true;

  const avatar = value.trim();

  if (!avatar) return true;

  return (
    avatar.includes('via.placeholder.com') ||
    avatar.includes('placeholder.com')
  );
};

const getSafeAvatar = (user, fallbackUser = null) => {
  if (!user && !fallbackUser) {
    return DEFAULT_AVATAR;
  }

  if (user && !isInvalidAvatar(user.avatarUrl)) {
    return user.avatarUrl.trim();
  }

  if (user && !isInvalidAvatar(user.avatar)) {
    return user.avatar.trim();
  }

  if (
    fallbackUser &&
    !isInvalidAvatar(fallbackUser.avatarUrl)
  ) {
    return fallbackUser.avatarUrl.trim();
  }

  if (
    fallbackUser &&
    !isInvalidAvatar(fallbackUser.avatar)
  ) {
    return fallbackUser.avatar.trim();
  }

  return DEFAULT_AVATAR;
};

const normalizeUser = (user, fallbackUser = null) => {
  if (!user || typeof user !== 'object') {
    return null;
  }

  const safeAvatar = getSafeAvatar(
    user,
    fallbackUser
  );

  return {
    ...user,
    avatarUrl: safeAvatar,
    avatar: safeAvatar,
    isOnline: user.isOnline === true,
  };
};

const getResponseBody = (response) => {
  return response?.data || {};
};

const getResponseData = (response) => {
  const body = getResponseBody(response);

  return body?.data || {};
};

const extractToken = (response) => {
  const body = getResponseBody(response);
  const data = getResponseData(response);

  return (
    body?.token ||
    body?.accessToken ||
    body?.jwt ||
    data?.token ||
    data?.accessToken ||
    data?.jwt ||
    null
  );
};

const extractUser = (
  response,
  fallbackUser = null
) => {
  const body = getResponseBody(response);
  const data = getResponseData(response);

  if (body?.user) {
    return normalizeUser(
      body.user,
      fallbackUser
    );
  }

  if (data?.user) {
    return normalizeUser(
      data.user,
      fallbackUser
    );
  }

  if (body?.userData) {
    return normalizeUser(
      body.userData,
      fallbackUser
    );
  }

  if (data?.userData) {
    return normalizeUser(
      data.userData,
      fallbackUser
    );
  }

  if (
    data &&
    typeof data === 'object' &&
    (
      data._id ||
      data.id ||
      data.email ||
      data.username
    )
  ) {
    const {
      token,
      accessToken,
      jwt,
      ...userWithoutToken
    } = data;

    return normalizeUser(
      userWithoutToken,
      fallbackUser
    );
  }

  if (
    body &&
    typeof body === 'object' &&
    (
      body._id ||
      body.id ||
      body.email ||
      body.username
    )
  ) {
    const {
      token,
      accessToken,
      jwt,
      ...userWithoutToken
    } = body;

    return normalizeUser(
      userWithoutToken,
      fallbackUser
    );
  }

  return null;
};

const extractTwoFactorChallenge = (
  response
) => {
  const body = getResponseBody(response);
  const data = getResponseData(response);

  return (
    body?.challengeToken ||
    body?.twoFactorToken ||
    body?.twoFactorChallenge ||
    data?.challengeToken ||
    data?.twoFactorToken ||
    data?.twoFactorChallenge ||
    null
  );
};

const isTwoFactorRequired = (response) => {
  const body = getResponseBody(response);
  const data = getResponseData(response);

  return (
    body?.requiresTwoFactor === true ||
    body?.requires2FA === true ||
    body?.twoFactorRequired === true ||
    data?.requiresTwoFactor === true ||
    data?.requires2FA === true ||
    data?.twoFactorRequired === true
  );
};

const getErrorMessage = (
  error,
  fallback = 'Request failed.'
) => {
  return (
    error?.response?.data?.error ||
    error?.response?.data?.message ||
    error?.response?.data?.details ||
    error?.message ||
    fallback
  );
};

const saveAuthSession = (
  jwtToken,
  userData
) => {
  if (jwtToken) {
    localStorage.setItem(
      'eazy_check_token',
      jwtToken
    );

    API.defaults.headers.common.Authorization =
      `Bearer ${jwtToken}`;
  }

  if (userData) {
    localStorage.setItem(
      'eazy_check_user',
      JSON.stringify(userData)
    );
  }
};

const clearAuthSession = () => {
  localStorage.removeItem(
    'eazy_check_token'
  );

  localStorage.removeItem(
    'eazy_check_user'
  );

  localStorage.removeItem('token');

  delete API.defaults.headers.common.Authorization;
};

export const AuthProvider = ({
  children,
}) => {
  const [user, setUser] = useState(() => {
    try {
      const savedUser =
        localStorage.getItem(
          'eazy_check_user'
        );

      if (!savedUser) {
        return null;
      }

      return normalizeUser(
        JSON.parse(savedUser)
      );
    } catch (error) {
      console.error(
        'Failed to parse cached user:',
        error
      );

      localStorage.removeItem(
        'eazy_check_user'
      );

      return null;
    }
  });

  const [token, setToken] = useState(
    localStorage.getItem(
      'eazy_check_token'
    ) ||
      localStorage.getItem('token') ||
      null
  );

  const [loading, setLoading] =
    useState(true);

  const [
    twoFactorChallenge,
    setTwoFactorChallenge,
  ] = useState(null);

  const [
    twoFactorLoginIdentifier,
    setTwoFactorLoginIdentifier,
  ] = useState('');

  const completeLogin =
    useCallback(
      (jwtToken, userData) => {
        if (!jwtToken) {
          throw new Error(
            'Authentication succeeded, but no authentication token was returned.'
          );
        }

        if (!userData) {
          throw new Error(
            'Authentication succeeded, but no user information was returned.'
          );
        }

        const onlineUser =
          normalizeUser({
            ...userData,
            isOnline: true,
          });

        saveAuthSession(
          jwtToken,
          onlineUser
        );

        setToken(jwtToken);
        setUser(onlineUser);
        setTwoFactorChallenge(null);
        setTwoFactorLoginIdentifier('');

        return onlineUser;
      },
      []
    );

  const logout = useCallback(
    async () => {
      try {
        if (
          API.defaults.headers.common
            .Authorization
        ) {
          await API.post(
            '/auth/logout'
          ).catch(() => {});
        }
      } finally {
        clearAuthSession();

        setToken(null);
        setUser(null);
        setTwoFactorChallenge(null);
        setTwoFactorLoginIdentifier('');
      }
    },
    []
  );

  const setUserOnlineStatus =
    useCallback((isOnline) => {
      setUser((previousUser) => {
        if (!previousUser) {
          return null;
        }

        const updatedUser = {
          ...previousUser,
          isOnline: Boolean(isOnline),
        };

        localStorage.setItem(
          'eazy_check_user',
          JSON.stringify(updatedUser)
        );

        return updatedUser;
      });
    }, []);

  const refreshUser = useCallback(
    async () => {
      const storedToken =
        localStorage.getItem(
          'eazy_check_token'
        ) ||
        localStorage.getItem('token');

      if (!storedToken) {
        return null;
      }

      try {
        API.defaults.headers.common.Authorization =
          `Bearer ${storedToken}`;

        const response =
          await API.get('/auth/me');

        const cachedUser = (() => {
          try {
            const saved =
              localStorage.getItem(
                'eazy_check_user'
              );

            return saved
              ? JSON.parse(saved)
              : null;
          } catch {
            return null;
          }
        })();

        let userData =
          extractUser(
            response,
            cachedUser
          );

        if (
          !userData ||
          !(
            userData._id ||
            userData.id
          )
        ) {
          try {
            const profileResponse =
              await API.get('/profile');

            userData =
              extractUser(
                profileResponse,
                cachedUser
              );
          } catch (
            profileError
          ) {
            console.warn(
              'Profile fallback request failed:',
              profileError?.response
                ?.data ||
                profileError?.message
            );
          }
        }

        if (
          response.data?.success !==
            false &&
          userData &&
          (
            userData._id ||
            userData.id
          )
        ) {
          const normalized =
            normalizeUser(
              userData,
              cachedUser
            );

          setUser(normalized);
          setToken(storedToken);

          localStorage.setItem(
            'eazy_check_user',
            JSON.stringify(normalized)
          );

          return normalized;
        }

        clearAuthSession();

        setToken(null);
        setUser(null);

        return null;
      } catch (error) {
        console.error(
          'Session restoration failed:',
          error?.response?.data ||
            error?.message
        );

        clearAuthSession();

        setToken(null);
        setUser(null);

        return null;
      }
    },
    []
  );

  const updateUser =
    useCallback((updatedFields) => {
      setUser((previousUser) => {
        if (!previousUser) {
          return null;
        }

        const updatedUser =
          normalizeUser({
            ...previousUser,
            ...(updatedFields || {}),
          });

        localStorage.setItem(
          'eazy_check_user',
          JSON.stringify(updatedUser)
        );

        return updatedUser;
      });
    }, []);

  const updateProfile =
    useCallback(
      async (profileData) => {
        try {
          const formData =
            new FormData();

          Object.entries(
            profileData || {}
          ).forEach(
            ([key, value]) => {
              if (
                value === undefined ||
                value === null
              ) {
                return;
              }

              if (
                key === 'avatarUrl' &&
                typeof value ===
                  'string' &&
                value.startsWith('blob:')
              ) {
                return;
              }

              if (key === 'avatar') {
                if (
                  typeof File !==
                    'undefined' &&
                  value instanceof File
                ) {
                  formData.append(
                    'avatar',
                    value
                  );
                }

                return;
              }

              formData.append(
                key,
                value
              );
            }
          );

          const storedToken =
            localStorage.getItem(
              'eazy_check_token'
            ) ||
            localStorage.getItem('token');

          const response =
            await API.put(
              '/profile',
              formData,
              {
                headers: {
                  ...(storedToken
                    ? {
                        Authorization:
                          `Bearer ${storedToken}`,
                      }
                    : {}),
                },
              }
            );

          const previousUser =
            user;

          let updatedUser =
            extractUser(
              response,
              previousUser
            );

          if (!updatedUser) {
            throw new Error(
              'The server did not return updated user information.'
            );
          }

          updatedUser =
            normalizeUser(
              updatedUser,
              previousUser
            );

          setUser(updatedUser);

          localStorage.setItem(
            'eazy_check_user',
            JSON.stringify(updatedUser)
          );

          return updatedUser;
        } catch (error) {
          console.error(
            'Profile update error:',
            error?.response?.data ||
              error?.message
          );

          throw (
            error?.response?.data ||
            error
          );
        }
      },
      [user]
    );

  const login = useCallback(
    async (email, password) => {
      try {
        setTwoFactorChallenge(
          null
        );

        setTwoFactorLoginIdentifier(
          String(email || '').trim()
        );

        const response =
          await API.post(
            '/auth/login',
            {
              email: String(
                email || ''
              ).trim(),
              password,
            }
          );

        if (
          response.data?.success ===
          false
        ) {
          return {
            success: false,
            error:
              response.data?.error ||
              response.data?.message ||
              'Login failed.',
          };
        }

        if (
          isTwoFactorRequired(
            response
          )
        ) {
          const challengeToken =
            extractTwoFactorChallenge(
              response
            );

          if (!challengeToken) {
            return {
              success: false,
              error:
                'Two-factor authentication is required, but the server did not return a challenge.',
            };
          }

          setTwoFactorChallenge(
            challengeToken
          );

          setTwoFactorLoginIdentifier(
            String(email || '').trim()
          );

          return {
            success: false,
            requiresTwoFactor: true,
            challengeToken,
            message:
              response.data?.message ||
              'Enter your two-factor authentication code.',
          };
        }

        const jwtToken =
          extractToken(response);

        const userData =
          extractUser(response);

        if (!jwtToken) {
          return {
            success: false,
            error:
              'Login succeeded, but the server did not return an authentication token.',
          };
        }

        if (!userData) {
          return {
            success: false,
            error:
              'Login succeeded, but the server did not return user information.',
          };
        }

        const onlineUser =
          completeLogin(
            jwtToken,
            userData
          );

        return {
          success: true,
          user: onlineUser,
          token: jwtToken,
        };
      } catch (error) {
        console.error(
          'Login error:',
          error?.response?.data ||
            error?.message
        );

        return {
          success: false,
          error: getErrorMessage(
            error,
            'Server error during login.'
          ),
        };
      }
    },
    [completeLogin]
  );

  const verifyTwoFactorLogin =
    useCallback(
      async (
        code,
        challengeToken = null
      ) => {
        const activeChallenge =
          challengeToken ||
          twoFactorChallenge;

        if (!activeChallenge) {
          return {
            success: false,
            error:
              'Your two-factor login session has expired. Please log in again.',
          };
        }

        try {
          const response =
            await API.post(
              '/security/2fa/login/verify',
              {
                challengeToken:
                  activeChallenge,
                code: String(
                  code || ''
                ).trim(),
              }
            );

          if (
            response.data?.success ===
            false
          ) {
            return {
              success: false,
              error:
                response.data?.error ||
                response.data?.message ||
                'Two-factor verification failed.',
            };
          }

          const jwtToken =
            extractToken(response);

          const userData =
            extractUser(response);

          if (
            !jwtToken ||
            !userData
          ) {
            return {
              success: false,
              error:
                'Two-factor verification succeeded, but the server did not return a complete session.',
            };
          }

          const onlineUser =
            completeLogin(
              jwtToken,
              userData
            );

          return {
            success: true,
            user: onlineUser,
            token: jwtToken,
          };
        } catch (error) {
          console.error(
            '2FA verification error:',
            error?.response?.data ||
              error?.message
          );

          return {
            success: false,
            error: getErrorMessage(
              error,
              'Two-factor verification failed.'
            ),
          };
        }
      },
      [
        completeLogin,
        twoFactorChallenge,
      ]
    );

  const cancelTwoFactorLogin =
    useCallback(() => {
      setTwoFactorChallenge(null);
      setTwoFactorLoginIdentifier('');
    }, []);

  /*
   * ============================================================
   * BIOMETRIC / WEBAUTHN LOGIN
   * ============================================================
   */

  const biometricLogin =
    useCallback(
      async (identifier) => {
        try {
          /*
           * ----------------------------------------------------
           * 1. Check browser security context
           * ----------------------------------------------------
           */

          if (
            typeof window ===
              'undefined' ||
            !window.isSecureContext
          ) {
            return {
              success: false,
              error:
                'Biometric login requires a secure browser context (HTTPS or localhost).',
            };
          }

          /*
           * ----------------------------------------------------
           * 2. Check WebAuthn support
           * ----------------------------------------------------
           */

          if (
            !window.PublicKeyCredential
          ) {
            return {
              success: false,
              error:
                'This browser does not support WebAuthn biometric authentication.',
            };
          }

          /*
           * ----------------------------------------------------
           * 3. Check platform authenticator support
           * ----------------------------------------------------
           */

          if (
            typeof window
              .PublicKeyCredential
              .isUserVerifyingPlatformAuthenticatorAvailable !==
            'function'
          ) {
            return {
              success: false,
              error:
                'This browser does not expose platform biometric authentication.',
            };
          }

          const available =
            await window
              .PublicKeyCredential
              .isUserVerifyingPlatformAuthenticatorAvailable();

          if (!available) {
            return {
              success: false,
              error:
                'No supported fingerprint, Face ID, Windows Hello, or platform biometric authenticator is available on this device.',
            };
          }

          /*
           * ----------------------------------------------------
           * 4. Validate identifier
           * ----------------------------------------------------
           */

          const normalizedIdentifier =
            String(
              identifier || ''
            ).trim();

          if (!normalizedIdentifier) {
            return {
              success: false,
              error:
                'Enter your email or username before using biometric login.',
            };
          }

          /*
           * ----------------------------------------------------
           * 5. Dynamically load SimpleWebAuthn
           * ----------------------------------------------------
           */

          const {
            startAuthentication,
          } = await import(
            '@simplewebauthn/browser'
          );

          /*
           * ----------------------------------------------------
           * 6. Ask backend for authentication options
           * ----------------------------------------------------
           */

          const optionsResponse =
            await API.post(
              '/security/biometric/login/options',
              {
                identifier:
                  normalizedIdentifier,
              }
            );

          if (
            optionsResponse.data
              ?.success === false
          ) {
            return {
              success: false,
              error:
                optionsResponse.data?.error ||
                optionsResponse.data?.message ||
                'Biometric login could not be started.',
            };
          }

          const optionsData =
            getResponseData(
              optionsResponse
            );

          const options =
            optionsData?.options ||
            optionsResponse.data?.options;

          const userId =
            optionsData?.userId ||
            optionsResponse.data?.userId;

          /*
           * ----------------------------------------------------
           * 7. Validate backend response
           * ----------------------------------------------------
           */

          if (!options) {
            console.error(
              'Biometric login options response:',
              optionsResponse.data
            );

            return {
              success: false,
              error:
                'The server did not return valid biometric login options.',
            };
          }

          if (!userId) {
            console.error(
              'Biometric login user ID missing:',
              optionsResponse.data
            );

            return {
              success: false,
              error:
                'The server did not identify the biometric account.',
            };
          }

          /*
           * ----------------------------------------------------
           * 8. Start browser WebAuthn ceremony
           * ----------------------------------------------------
           */

          let authenticationResponse;

          try {
            authenticationResponse =
              await startAuthentication({
                optionsJSON: options,
              });
          } catch (
            ceremonyError
          ) {
            console.error(
              'WebAuthn ceremony error:',
              ceremonyError
            );

            if (
              ceremonyError?.name ===
                'NotAllowedError' ||
              ceremonyError?.code ===
                'ERROR_CEREMONY_ABORTED'
            ) {
              return {
                success: false,
                cancelled: true,
                error:
                  'Biometric authentication was cancelled.',
              };
            }

            if (
              ceremonyError?.name ===
              'InvalidStateError'
            ) {
              return {
                success: false,
                error:
                  'This biometric credential is already registered or is not currently available on this device.',
              };
            }

            if (
              ceremonyError?.name ===
              'SecurityError'
            ) {
              return {
                success: false,
                error:
                  'The browser rejected the biometric request because of a security or origin mismatch. Make sure you are using the same localhost/HTTPS address used when the biometric was registered.',
              };
            }

            throw ceremonyError;
          }

          /*
           * ----------------------------------------------------
           * 9. Validate the browser response
           * ----------------------------------------------------
           *
           * IMPORTANT:
           *
           * The backend verification endpoint expects the
           * complete AuthenticationResponseJSON object at the
           * top level:
           *
           * {
           *   id,
           *   rawId,
           *   response,
           *   type,
           *   clientExtensionResults,
           *   ...
           * }
           *
           * DO NOT send:
           *
           * {
           *   userId,
           *   response: authenticationResponse
           * }
           *
           * because the backend's current verification code
           * passes the request body itself into
           * verifyAuthenticationResponse().
           * ----------------------------------------------------
           */

          if (
            !authenticationResponse ||
            typeof authenticationResponse !==
              'object'
          ) {
            return {
              success: false,
              error:
                'The browser did not return a valid biometric authentication response.',
            };
          }

          if (
            !authenticationResponse.id ||
            !authenticationResponse.response ||
            !authenticationResponse.type
          ) {
            console.error(
              'Invalid WebAuthn authentication response:',
              authenticationResponse
            );

            return {
              success: false,
              error:
                'The browser returned an incomplete biometric authentication response.',
            };
          }

          /*
           * ----------------------------------------------------
           * 10. Build verification payload
           * ----------------------------------------------------
           *
           * The critical fix is spreading the complete
           * authentication response into the request body.
           */

          const verificationPayload = {
            userId: String(userId),

            ...authenticationResponse,
          };

          /*
           * ----------------------------------------------------
           * 11. Send WebAuthn response to backend
           * ----------------------------------------------------
           */

          console.log(
            'Sending biometric verification request:',
            {
              userId: verificationPayload.userId,
              id: verificationPayload.id,
              rawId:
                verificationPayload.rawId,
              type:
                verificationPayload.type,
              hasResponse:
                Boolean(
                  verificationPayload.response
                ),
            }
          );

          const verifyResponse =
            await API.post(
              '/security/biometric/login/verify',
              verificationPayload
            );

          /*
           * ----------------------------------------------------
           * 12. Handle backend verification failure
           * ----------------------------------------------------
           */

          if (
            verifyResponse.data
              ?.success === false
          ) {
            console.error(
              'Biometric verification rejected by server:',
              verifyResponse.data
            );

            return {
              success: false,
              error:
                verifyResponse.data?.error ||
                verifyResponse.data?.message ||
                'Biometric verification failed.',
            };
          }

          /*
           * ----------------------------------------------------
           * 13. Extract JWT
           * ----------------------------------------------------
           */

          const jwtToken =
            extractToken(
              verifyResponse
            );

          /*
           * ----------------------------------------------------
           * 14. Extract authenticated user
           * ----------------------------------------------------
           */

          const userData =
            extractUser(
              verifyResponse
            );

          if (
            !jwtToken ||
            !userData
          ) {
            console.error(
              'Incomplete biometric login response:',
              verifyResponse.data
            );

            return {
              success: false,
              error:
                'Biometric verification succeeded, but the server did not return a complete session.',
            };
          }

          /*
           * ----------------------------------------------------
           * 15. Complete normal authenticated session
           * ----------------------------------------------------
           */

          const onlineUser =
            completeLogin(
              jwtToken,
              userData
            );

          return {
            success: true,
            user: onlineUser,
            token: jwtToken,
          };
        } catch (error) {
          console.error(
            'Biometric login error:',
            error?.response?.data ||
              error?.message ||
              error
          );

          return {
            success: false,
            error: getErrorMessage(
              error,
              'Biometric login failed.'
            ),
          };
        }
      },
      [completeLogin]
    );

  const register = useCallback(
    async (
      name,
      email,
      password
    ) => {
      try {
        const response =
          await API.post(
            '/auth/register',
            {
              name,
              email,
              password,
            }
          );

        if (
          response.data?.success ===
          false
        ) {
          return {
            success: false,
            error:
              response.data?.error ||
              response.data?.message ||
              'Registration failed.',
          };
        }

        const jwtToken =
          extractToken(response);

        const userData =
          extractUser(response);

        if (!jwtToken) {
          return {
            success: true,
            user: userData,
            requiresLogin: true,
            message:
              response.data?.message ||
              'Registration successful. Please log in.',
          };
        }

        if (!userData) {
          return {
            success: false,
            error:
              'Registration succeeded, but user information was not returned.',
          };
        }

        const normalizedUser =
          completeLogin(
            jwtToken,
            userData
          );

        return {
          success: true,
          user: normalizedUser,
          token: jwtToken,
        };
      } catch (error) {
        console.error(
          'Registration error:',
          error?.response?.data ||
            error?.message
        );

        return {
          success: false,
          error: getErrorMessage(
            error,
            'Server error during registration.'
          ),
        };
      }
    },
    [completeLogin]
  );

  useEffect(() => {
    let mounted = true;

    const initAuth = async () => {
      const storedToken =
        localStorage.getItem(
          'eazy_check_token'
        ) ||
        localStorage.getItem('token');

      if (storedToken) {
        API.defaults.headers.common.Authorization =
          `Bearer ${storedToken}`;

        await refreshUser();
      } else if (mounted) {
        setUser(null);
        setToken(null);
      }

      if (mounted) {
        setLoading(false);
      }
    };

    initAuth();

    return () => {
      mounted = false;
    };
  }, [refreshUser]);

  const isAuthenticated =
    !!user && !!token;

  const normalizedRole =
    String(
      user?.role || ''
    ).toLowerCase();

  const isSuperAdmin =
    normalizedRole ===
      'superadmin' ||
    normalizedRole ===
      'super_admin' ||
    normalizedRole ===
      'super-admin';

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        isAuthenticated,
        isSuperAdmin,

        login,
        register,
        logout,

        setUser,
        updateUser,
        updateProfile,
        refreshUser,
        setUserOnlineStatus,

        twoFactorChallenge,
        twoFactorLoginIdentifier,

        verifyTwoFactorLogin,
        cancelTwoFactorLogin,

        biometricLogin,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context =
    useContext(AuthContext);

  if (!context) {
    throw new Error(
      'useAuth must be used within an AuthProvider'
    );
  }

  return context;
};