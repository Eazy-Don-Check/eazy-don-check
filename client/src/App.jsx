import React from 'react';

import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from 'react-router-dom';

import {
  AuthProvider,
  useAuth,
} from './context/AuthContext';

import {
  SocketProvider,
} from './context/SocketContext';

import {
  NotificationProvider,
} from './context/NotificationContext';

import {
  ChatUnreadProvider,
} from './context/ChatUnreadContext';


// ============================================================
// PUBLIC LANDING PAGE
// ============================================================

import Home from './pages/Home';


// ============================================================
// PUBLIC INFORMATION PAGES
// ============================================================

import PrivacyPolicy from './pages/PrivacyPolicy';
import TermsOfService from './pages/TermsOfService';
import Security from './pages/Security';


// ============================================================
// AUTHENTICATION PAGES
// ============================================================

import Login from './pages/Login';
import Signup from './pages/Signup';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';


// ============================================================
// MAIN APPLICATION PAGES
// ============================================================

import Dashboard from './pages/Dashboard';
import Feed from './pages/Feed';
import VerifyReceipt from './pages/VerifyReceipt';
import InvoiceGenerator from "./pages/InvoiceGenerator";
import InvoiceHistory from "./pages/InvoiceHistory";
import Profile from './pages/Profile';
import UserProfile from './pages/UserProfile';
import PhotoEnhancer from './pages/PhotoEnhancer';
import Notifications from './pages/Notifications';
import Subscription from './pages/Subscription';
import PaymentCallback from './pages/PaymentCallback';
import Feedback from './pages/Feedback';


// ============================================================
// SYSTEM SETTINGS
// ============================================================

import Settings from './pages/Settings';


// ============================================================
// SOCIAL / FRIEND SYSTEM
// ============================================================

import People from './pages/People';
import Friends from './pages/Friends';


// ============================================================
// CHAT
// ============================================================

import ChatRoom from './pages/ChatRoom';


// ============================================================
// ADMIN
// ============================================================

import Admin from './pages/Admin';


// ============================================================
// BRAND LOGO
// ============================================================
//
// Make sure the file exists at:
//
// public/eazy-don-check-logo.png
//
// It can then be accessed as:
//
// /eazy-don-check-logo.png
//
// ============================================================

const LOGO_SRC = '/eazy-don-check-logo.png';


// ============================================================
// LOADING SPINNER
// ============================================================

const LoadingSpinner = () => (
  <div
    className="
      flex
      min-h-screen
      items-center
      justify-center
      bg-slate-50
      dark:bg-dark-bg
      transition-colors
      duration-200
    "
  >
    <div className="flex flex-col items-center">

      {/* ======================================================
          BRAND LOGO
      ====================================================== */}

      <div
        className="
          flex
          h-20
          w-20
          items-center
          justify-center
          overflow-hidden
          rounded-2xl
          bg-white
          border
          border-slate-200
          shadow-lg
          shadow-slate-900/10
          dark:bg-white
          dark:border-slate-200
        "
        aria-label="Loading EAZY DON CHECK"
      >
        <img
          src={LOGO_SRC}
          alt="EAZY DON CHECK"
          className="
            block
            h-full
            w-full
            object-contain
            p-2
          "
          onError={(event) => {
            event.currentTarget.style.display = 'none';
          }}
        />
      </div>


      {/* ======================================================
          LOADING BAR
      ====================================================== */}

      <div
        className="
          mt-5
          h-1.5
          w-32
          overflow-hidden
          rounded-full
          bg-slate-200
          dark:bg-dark-border
        "
      >
        <div
          className="
            h-full
            w-1/2
            animate-pulse
            rounded-full
            bg-brand-600
          "
        />
      </div>


      {/* ======================================================
          LOADING TEXT
      ====================================================== */}

      <p
        className="
          mt-3
          text-sm
          font-medium
          text-slate-500
          dark:text-slate-400
        "
      >
        Loading EAZY DON CHECK...
      </p>

    </div>
  </div>
);


// ============================================================
// PROTECTED ROUTE
// ============================================================

const ProtectedRoute = ({
  children,
}) => {
  const {
    isAuthenticated,
    loading,
  } = useAuth();


  if (loading) {
    return <LoadingSpinner />;
  }


  if (!isAuthenticated) {
    return (
      <Navigate
        to="/login"
        replace
      />
    );
  }


  return children;
};


// ============================================================
// ADMIN ROUTE
// ============================================================

const AdminRoute = ({
  children,
}) => {
  const {
    isAuthenticated,
    isSuperAdmin,
    loading,
  } = useAuth();


  if (loading) {
    return <LoadingSpinner />;
  }


  if (!isAuthenticated) {
    return (
      <Navigate
        to="/login"
        replace
      />
    );
  }


  if (!isSuperAdmin) {
    return (
      <Navigate
        to="/feed"
        replace
      />
    );
  }


  return children;
};


// ============================================================
// PUBLIC-ONLY ROUTE
// ============================================================

const PublicOnlyRoute = ({
  children,
}) => {
  const {
    isAuthenticated,
    loading,
  } = useAuth();


  if (loading) {
    return <LoadingSpinner />;
  }


  if (isAuthenticated) {
    return (
      <Navigate
        to="/feed"
        replace
      />
    );
  }


  return children;
};


// ============================================================
// PASSWORD RECOVERY ROUTE
// ============================================================

const PasswordRecoveryRoute = ({
  children,
}) => {
  return children;
};


// ============================================================
// APPLICATION ROUTES
// ============================================================

const AppRoutes = () => {
  const {
    token,
  } = useAuth();


  return (
    <SocketProvider token={token}>

      {/* ======================================================
          GLOBAL CHAT UNREAD STATE
      ====================================================== */}

      <ChatUnreadProvider>

        {/* ====================================================
            GLOBAL NOTIFICATION STATE
        ==================================================== */}

        <NotificationProvider>

          <Routes>

            {/* ==================================================
                PUBLIC HOME LANDING PAGE
            ================================================== */}

            <Route
              path="/"
              element={
                <Home />
              }
            />


            {/* ==================================================
                PUBLIC PRIVACY POLICY
            ================================================== */}

            <Route
              path="/privacy-policy"
              element={
                <PrivacyPolicy />
              }
            />


            {/* ==================================================
                PUBLIC TERMS OF SERVICE
            ================================================== */}

            <Route
              path="/terms-of-service"
              element={
                <TermsOfService />
              }
            />


            {/* ==================================================
                PUBLIC SECURITY PAGE
            ================================================== */}

            <Route
              path="/security"
              element={
                <Security />
              }
            />


            {/* ==================================================
                PUBLIC LOGIN
            ================================================== */}

            <Route
              path="/login"
              element={
                <PublicOnlyRoute>
                  <Login />
                </PublicOnlyRoute>
              }
            />


            {/* ==================================================
                PUBLIC SIGNUP
            ================================================== */}

            <Route
              path="/signup"
              element={
                <PublicOnlyRoute>
                  <Signup />
                </PublicOnlyRoute>
              }
            />


            {/* ==================================================
                FORGOT PASSWORD
            ================================================== */}

            <Route
              path="/forgot-password"
              element={
                <PasswordRecoveryRoute>
                  <ForgotPassword />
                </PasswordRecoveryRoute>
              }
            />


            {/* ==================================================
                RESET PASSWORD
            ================================================== */}

            <Route
              path="/reset-password"
              element={
                <PasswordRecoveryRoute>
                  <ResetPassword />
                </PasswordRecoveryRoute>
              }
            />


            {/* ==================================================
                FEED
                AUTHENTICATED PRIMARY APPLICATION HOME
            ================================================== */}

            <Route
              path="/feed"
              element={
                <ProtectedRoute>
                  <Feed />
                </ProtectedRoute>
              }
            />


            {/* ==================================================
                DASHBOARD
            ================================================== */}

            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />


            {/* ==================================================
                RECEIPT VERIFICATION
            ================================================== */}

            <Route
              path="/verify"
              element={
                <ProtectedRoute>
                  <VerifyReceipt />
                </ProtectedRoute>
              }
            />

            <Route
              path="/invoice-generator"
              element={<InvoiceGenerator />}
            />

            <Route
              path="/invoice-history"
              element={<InvoiceHistory />}
            />

            {/* ==================================================
                SUBSCRIPTION
            ================================================== */}

            <Route
              path="/subscription"
              element={
                <ProtectedRoute>
                  <Subscription />
                </ProtectedRoute>
              }
            />


            {/* ==================================================
                PAYSTACK PAYMENT CALLBACK
            ================================================== */}

            <Route
              path="/subscription/payment-callback"
              element={
                <ProtectedRoute>
                  <PaymentCallback />
                </ProtectedRoute>
              }
            /> 


            {/* ==================================================
                MY PROFILE
            ================================================== */}

            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <Profile />
                </ProtectedRoute>
              }
            />


            {/* ==================================================
                OTHER USER PROFILE
            ================================================== */}

            <Route
              path="/profile/:userId"
              element={
                <ProtectedRoute>
                  <UserProfile />
                </ProtectedRoute>
              }
            />


            {/* ==================================================
                SYSTEM SETTINGS
            ================================================== */}

            <Route
              path="/settings"
              element={
                <ProtectedRoute>
                  <Settings />
                </ProtectedRoute>
              }
            />


            {/* ==================================================
                PEOPLE / USER DISCOVERY
            ================================================== */}

            <Route
              path="/people"
              element={
                <ProtectedRoute>
                  <People />
                </ProtectedRoute>
              }
            />

            <Route
              path="/feedback"
              element={
                  <Feedback />}
            />

            {/* ==================================================
                FRIENDS
            ================================================== */}

            <Route
              path="/friends"
              element={
                <ProtectedRoute>
                  <Friends />
                </ProtectedRoute>
              }
            />


            {/* ==================================================
                PHOTO ENHANCER
            ================================================== */}

            <Route
              path="/photo-enhancer"
              element={
                <ProtectedRoute>
                  <PhotoEnhancer />
                </ProtectedRoute>
              }
            />


            {/* ==================================================
                CHAT — ALL ROOMS
            ================================================== */}

            <Route
              path="/chat"
              element={
                <ProtectedRoute>
                  <ChatRoom />
                </ProtectedRoute>
              }
            />


            {/* ==================================================
                CHAT — INDIVIDUAL ROOM
            ================================================== */}

            <Route
              path="/chat/:roomSlug"
              element={
                <ProtectedRoute>
                  <ChatRoom />
                </ProtectedRoute>
              }
            />


            {/* ==================================================
                DIRECT MESSAGES
            ================================================== */}

            <Route
              path="/messages"
              element={
                <ProtectedRoute>
                  <ChatRoom />
                </ProtectedRoute>
              }
            />


            {/* ==================================================
                NOTIFICATIONS
            ================================================== */}

            <Route
              path="/notifications"
              element={
                <ProtectedRoute>
                  <Notifications />
                </ProtectedRoute>
              }
            />


            {/* ==================================================
                SUPER ADMIN
            ================================================== */}

            <Route
              path="/admin"
              element={
                <AdminRoute>
                  <Admin />
                </AdminRoute>
              }
            />


            {/* ==================================================
                FALLBACK
            ================================================== */}

            <Route
              path="*"
              element={
                <FallbackRedirect />
              }
            />

          </Routes>

        </NotificationProvider>

      </ChatUnreadProvider>

    </SocketProvider>
  );
};


// ============================================================
// FALLBACK REDIRECT
// ============================================================

const FallbackRedirect = () => {
  const {
    isAuthenticated,
    loading,
  } = useAuth();


  if (loading) {
    return <LoadingSpinner />;
  }


  return (
    <Navigate
      to={
        isAuthenticated
          ? '/feed'
          : '/'
      }
      replace
    />
  );
};


// ============================================================
// ROOT APP
// ============================================================

function App() {
  return (
    <AuthProvider>

      <Router>

        <AppRoutes />

      </Router>

    </AuthProvider>
  );
}


export default App;