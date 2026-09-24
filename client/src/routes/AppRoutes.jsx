import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './ProtectedRoute';

// Pages
import Home from '../pages/Home';
import Login from '../pages/Login';
import Signup from '../pages/Signup';
import Dashboard from '../pages/Dashboard';
import Admin from '../pages/Admin';
import PhotoEnhancer from '../pages/PhotoEnhancer';
import NotFound from '../pages/NotFound';

const AppRoutes = () => {
  return (
    <Routes>

      {/* ======================================================
          PUBLIC ROUTES
      ====================================================== */}

      <Route
        path="/"
        element={<Home />}
      />

      <Route
        path="/login"
        element={<Login />}
      />

      <Route
        path="/signup"
        element={<Signup />}
      />


      {/* ======================================================
          AUTHENTICATED USER ROUTES
      ====================================================== */}

      <Route
        element={
          <ProtectedRoute
            allowedRoles={['user', 'superadmin']}
          />
        }
      >

        <Route
          path="/dashboard"
          element={<Dashboard />}
        />

        <Route
          path="/photo-enhancer"
          element={<PhotoEnhancer />}
        />

      </Route>


      {/* ======================================================
          SUPER ADMIN ROUTES
      ====================================================== */}

      <Route
        element={
          <ProtectedRoute
            allowedRoles={['superadmin']}
          />
        }
      >

        <Route
          path="/admin"
          element={<Admin />}
        />

      </Route>


      {/* ======================================================
          404 / FALLBACK
      ====================================================== */}

      <Route
        path="/404"
        element={<NotFound />}
      />

      <Route
        path="*"
        element={
          <Navigate
            to="/404"
            replace
          />
        }
      />

    </Routes>
  );
};

export default AppRoutes;