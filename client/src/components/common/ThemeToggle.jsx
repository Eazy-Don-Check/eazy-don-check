import React, { useEffect, useState } from 'react';
import { Sun, Moon } from 'lucide-react';

// ============================================================
// THEME CONFIGURATION
// ============================================================

const STORAGE_KEY = 'eazy_check_theme';
const THEME_EVENT = 'eazy-check-theme-change';

// ============================================================
// GET INITIAL THEME
// ============================================================

const getInitialTheme = () => {
  try {
    const savedTheme = localStorage.getItem(STORAGE_KEY);

    if (
      savedTheme === 'dark' ||
      savedTheme === 'light'
    ) {
      return savedTheme;
    }
  } catch (error) {
    console.warn(
      'Unable to read saved theme:',
      error
    );
  }

  // Use system preference only when no saved theme exists.
  try {
    if (
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia(
        '(prefers-color-scheme: dark)'
      ).matches
    ) {
      return 'dark';
    }
  } catch (error) {
    console.warn(
      'Unable to detect system theme:',
      error
    );
  }

  return 'light';
};

// ============================================================
// APPLY THEME TO DOCUMENT
// ============================================================

const applyTheme = (theme) => {
  if (typeof document === 'undefined') {
    return;
  }

  const isDark = theme === 'dark';

  const root =
    document.documentElement;

  // Tailwind darkMode: 'class'
  root.classList.toggle(
    'dark',
    isDark
  );

  // Helps native controls such as select/input.
  root.style.colorScheme = isDark
    ? 'dark'
    : 'light';

  // Keep body transition consistent.
  document.body?.classList.add(
    'theme-transition'
  );
};

// ============================================================
// SAVE THEME
// ============================================================

const saveTheme = (theme) => {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      theme
    );
  } catch (error) {
    console.warn(
      'Unable to save theme:',
      error
    );
  }
};

// ============================================================
// THEME TOGGLE
//
// This component works both:
//   <ThemeToggle />
//
// and, for backward compatibility:
//   <ThemeToggle theme="dark" onToggle={...} />
//
// However, the synchronized EAZY CHECK implementation
// intentionally uses the self-contained version.
// ============================================================

const ThemeToggle = ({
  theme: controlledTheme,
  onToggle,
}) => {
  const [
    internalTheme,
    setInternalTheme,
  ] = useState(getInitialTheme);

  // ----------------------------------------------------------
  // Determine whether parent is controlling this component.
  // ----------------------------------------------------------

  const isControlled =
    controlledTheme === 'dark' ||
    controlledTheme === 'light';

  const theme = isControlled
    ? controlledTheme
    : internalTheme;

  const isDark =
    theme === 'dark';

  // ==========================================================
  // APPLY CURRENT THEME
  // ==========================================================

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  // ==========================================================
  // LISTEN FOR GLOBAL THEME CHANGES
  //
  // This is what synchronizes:
  //
  // Navbar
  // Sidebar
  // AppLayout
  // Mobile Navbar
  // Profile dropdown
  //
  // ==========================================================

  useEffect(() => {
    const handleThemeChange = (
      event
    ) => {
      const nextTheme =
        event?.detail;

      if (
        nextTheme !== 'dark' &&
        nextTheme !== 'light'
      ) {
        return;
      }

      // Update local display state.
      setInternalTheme(
        nextTheme
      );

      // Apply globally.
      applyTheme(
        nextTheme
      );
    };

    window.addEventListener(
      THEME_EVENT,
      handleThemeChange
    );

    return () => {
      window.removeEventListener(
        THEME_EVENT,
        handleThemeChange
      );
    };
  }, []);

  // ==========================================================
  // HANDLE TOGGLE
  // ==========================================================

  const handleToggle = (
    event
  ) => {
    event.preventDefault();

    // Important when the toggle is inside:
    // dropdowns, navigation containers, etc.
    event.stopPropagation();

    // --------------------------------------------------------
    // Backward compatibility
    // --------------------------------------------------------

    if (
      isControlled &&
      typeof onToggle === 'function'
    ) {
      onToggle();
      return;
    }

    // --------------------------------------------------------
    // Calculate next theme
    // --------------------------------------------------------

    const nextTheme =
      theme === 'dark'
        ? 'light'
        : 'dark';

    // --------------------------------------------------------
    // Update local state
    // --------------------------------------------------------

    setInternalTheme(
      nextTheme
    );

    // --------------------------------------------------------
    // Apply immediately
    // --------------------------------------------------------

    applyTheme(
      nextTheme
    );

    // --------------------------------------------------------
    // Persist
    // --------------------------------------------------------

    saveTheme(
      nextTheme
    );

    // --------------------------------------------------------
    // Synchronize every other ThemeToggle
    // --------------------------------------------------------

    window.dispatchEvent(
      new CustomEvent(
        THEME_EVENT,
        {
          detail: nextTheme,
        }
      )
    );
  };

  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <button
      type="button"
      onClick={handleToggle}
      aria-pressed={isDark}
      aria-label={
        isDark
          ? 'Switch to light mode'
          : 'Switch to dark mode'
      }
      title={
        isDark
          ? 'Switch to light mode'
          : 'Switch to dark mode'
      }
      className={`
        relative
        inline-flex
        items-center
        w-11
        h-6
        rounded-full
        shrink-0
        cursor-pointer
        select-none
        touch-manipulation
        transition-colors
        duration-200
        ease-out
        focus:outline-none
        focus-visible:ring-2
        focus-visible:ring-brand-500/50
        focus-visible:ring-offset-2
        focus-visible:ring-offset-white
        dark:focus-visible:ring-offset-dark-card
        ${
          isDark
            ? 'bg-brand-600 hover:bg-brand-500'
            : 'bg-slate-300 hover:bg-slate-400'
        }
      `}
    >
      {/* ------------------------------------------------------
          SLIDER
      ------------------------------------------------------ */}

      <span
        aria-hidden="true"
        className={`
          absolute
          top-0.5
          left-0.5
          w-5
          h-5
          rounded-full
          bg-white
          shadow-md
          flex
          items-center
          justify-center
          transition-transform
          duration-200
          ease-out
          pointer-events-none
          ${
            isDark
              ? 'translate-x-5'
              : 'translate-x-0'
          }
        `}
      >
        {isDark ? (
          <Moon
            className="w-3 h-3 text-slate-700"
          />
        ) : (
          <Sun
            className="w-3 h-3 text-amber-500"
          />
        )}
      </span>
    </button>
  );
};

export default ThemeToggle;