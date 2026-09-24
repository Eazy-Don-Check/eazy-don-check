import React, { useMemo, useState } from 'react';

import {
  AlertCircle,
  ArrowLeft,
  Bug,
  CheckCircle2,
  ChevronRight,
  FileCheck2,
  Lightbulb,
  Loader2,
  MessageSquare,
  Send,
  ShieldCheck,
  Sparkles,
  Star,
  Users,
  X,
} from 'lucide-react';

import { Link, useNavigate } from 'react-router-dom';

import AppLayout from '../components/layout/AppLayout';
import { useAuth } from '../context/AuthContext';
import apiClient from '../utils/apiClient';

const CATEGORIES = [
  {
    value: 'general',
    label: 'General Feedback',
    description: 'Tell us about your overall experience.',
    icon: MessageSquare,
  },
  {
    value: 'bug',
    label: 'Bug Report',
    description: 'Something is not working as expected.',
    icon: Bug,
  },
  {
    value: 'feature',
    label: 'Feature Request',
    description: 'Suggest something you would like us to add.',
    icon: Lightbulb,
  },
  {
    value: 'verification',
    label: 'Receipt Verification',
    description: 'Feedback about receipt scanning and verification.',
    icon: FileCheck2,
  },
  {
    value: 'community',
    label: 'Community & Chat',
    description: 'Feedback about rooms, messages and community.',
    icon: Users,
  },
  {
    value: 'security',
    label: 'Account & Security',
    description: 'Account, privacy or security concerns.',
    icon: ShieldCheck,
  },
  {
    value: 'other',
    label: 'Other',
    description: 'Anything else you would like us to know.',
    icon: Sparkles,
  },
];

const MAX_SUBJECT_LENGTH = 120;
const MAX_MESSAGE_LENGTH = 2000;
const MAX_SUGGESTION_LENGTH = 1000;

const initialForm = {
  rating: 0,
  category: '',
  subject: '',
  message: '',
  suggestion: '',
};

const getUserName = (user) => {
  if (!user) return '';

  return (
    user.name ||
    user.fullName ||
    [user.firstName, user.middleName, user.lastName]
      .filter(Boolean)
      .join(' ') ||
    user.username ||
    ''
  );
};

const getErrorMessage = (error) => {
  return (
    error?.response?.data?.message ||
    error?.response?.data?.error ||
    error?.message ||
    'We could not submit your feedback. Please try again.'
  );
};

const Feedback = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [form, setForm] = useState(initialForm);
  const [hoverRating, setHoverRating] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const selectedCategory = useMemo(
    () => CATEGORIES.find((item) => item.value === form.category),
    [form.category]
  );

  const updateField = (field, value) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));

    if (errorMessage) {
      setErrorMessage('');
    }

    if (successMessage) {
      setSuccessMessage('');
    }
  };

  const validateForm = () => {
    if (!form.rating) {
      return 'Please select a rating before submitting your feedback.';
    }

    if (!form.category) {
      return 'Please select a feedback category.';
    }

    if (!form.subject.trim()) {
      return 'Please enter a subject.';
    }

    if (form.subject.trim().length < 3) {
      return 'Your subject should contain at least 3 characters.';
    }

    if (!form.message.trim()) {
      return 'Please tell us about your experience.';
    }

    if (form.message.trim().length < 10) {
      return 'Please provide a little more detail in your feedback.';
    }

    return '';
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    setSuccessMessage('');
    setErrorMessage('');

    if (!user) {
      setErrorMessage('Please sign in to submit feedback.');
      return;
    }

    const validationError = validateForm();

    if (validationError) {
      setErrorMessage(validationError);
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        rating: Number(form.rating),
        category: form.category,
        subject: form.subject.trim(),
        message: form.message.trim(),
        suggestion: form.suggestion.trim(),
      };

      const response = await apiClient.post('/feedback', payload);

      const message =
        response?.data?.message ||
        'Thank you! Your feedback has been submitted successfully.';

      setSuccessMessage(message);
      setForm(initialForm);
      setHoverRating(0);
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    if (isSubmitting) return;

    navigate(-1);
  };

  if (!user) {
    return (
      <AppLayout>
        <div className="min-h-[calc(100vh-80px)] bg-slate-50 px-4 py-8 dark:bg-dark-bg sm:px-6 lg:px-8">
          <div className="mx-auto flex min-h-[70vh] max-w-2xl items-center justify-center">
            <div className="w-full rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-xl dark:border-dark-border dark:bg-dark-card sm:p-12">
              <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400">
                <MessageSquare size={30} />
              </div>

              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                Sign in to leave feedback
              </h1>

              <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-slate-500 dark:text-slate-400">
                Your feedback helps us improve EAZY DON CHECK and build a
                better experience for everyone.
              </p>

              <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
                <Link
                  to="/login"
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-brand-700"
                >
                  Sign In
                  <ChevronRight size={18} />
                </Link>

                <Link
                  to="/"
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-dark-border dark:bg-dark-bg dark:text-slate-200 dark:hover:bg-dark-card"
                >
                  Back Home
                </Link>
              </div>
            </div>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="min-h-[calc(100vh-80px)] bg-slate-50 px-4 py-6 text-slate-900 dark:bg-dark-bg dark:text-white sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          {/* Header */}
          <div className="mb-6">
            <button
              type="button"
              onClick={handleCancel}
              className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-brand-600 dark:text-slate-400 dark:hover:text-brand-400"
            >
              <ArrowLeft size={17} />
              Back
            </button>

            <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
              <div>
                <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-brand-200 bg-brand-50 px-3 py-1.5 text-xs font-semibold text-brand-700 dark:border-brand-500/20 dark:bg-brand-500/10 dark:text-brand-400">
                  <MessageSquare size={14} />
                  EAZY DON CHECK FEEDBACK
                </div>

                <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-4xl">
                  Tell us what you think
                </h1>

                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400 sm:text-base">
                  Your feedback helps us improve receipt verification,
                  community features, security and the overall EAZY DON CHECK
                  experience.
                </p>
              </div>

              <div className="hidden items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm dark:border-dark-border dark:bg-dark-card lg:flex">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400">
                  <ShieldCheck size={20} />
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Signed in as
                  </p>
                  <p className="max-w-[180px] truncate text-sm font-semibold text-slate-800 dark:text-white">
                    {getUserName(user) || 'EAZY DON CHECK Member'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Alerts */}
          {successMessage && (
            <div className="mb-6 flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-500/20 dark:bg-emerald-500/10">
              <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400">
                <CheckCircle2 size={18} />
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-300">
                  Feedback submitted
                </p>
                <p className="mt-1 text-sm leading-5 text-emerald-700 dark:text-emerald-400">
                  {successMessage}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSuccessMessage('')}
                className="rounded-lg p-1 text-emerald-600 transition hover:bg-emerald-100 dark:text-emerald-400 dark:hover:bg-emerald-500/10"
                aria-label="Dismiss success message"
              >
                <X size={18} />
              </button>
            </div>
          )}

          {errorMessage && (
            <div className="mb-6 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 dark:border-red-500/20 dark:bg-red-500/10">
              <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-600 dark:bg-red-500/15 dark:text-red-400">
                <AlertCircle size={18} />
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-red-800 dark:text-red-300">
                  Unable to submit feedback
                </p>
                <p className="mt-1 text-sm leading-5 text-red-700 dark:text-red-400">
                  {errorMessage}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setErrorMessage('')}
                className="rounded-lg p-1 text-red-600 transition hover:bg-red-100 dark:text-red-400 dark:hover:bg-red-500/10"
                aria-label="Dismiss error message"
              >
                <X size={18} />
              </button>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
              {/* Main Form */}
              <div className="space-y-6">
                {/* Rating */}
                <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-dark-border dark:bg-dark-card sm:p-7">
                  <div className="mb-5">
                    <div className="flex items-center gap-2">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-500 dark:bg-amber-500/10 dark:text-amber-400">
                        <Star size={18} fill="currentColor" />
                      </div>

                      <div>
                        <h2 className="font-semibold text-slate-900 dark:text-white">
                          How was your experience?
                        </h2>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          Choose a rating from 1 to 5 stars.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div
                    className="flex flex-wrap items-center gap-2"
                    onMouseLeave={() => setHoverRating(0)}
                  >
                    {[1, 2, 3, 4, 5].map((star) => {
                      const active =
                        star <= (hoverRating || form.rating);

                      return (
                        <button
                          key={star}
                          type="button"
                          onClick={() => updateField('rating', star)}
                          onMouseEnter={() => setHoverRating(star)}
                          aria-label={`${star} star${star > 1 ? 's' : ''}`}
                          className={`flex h-12 w-12 items-center justify-center rounded-xl border transition ${
                            active
                              ? 'border-amber-300 bg-amber-50 text-amber-500 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-400'
                              : 'border-slate-200 bg-white text-slate-300 hover:border-amber-200 hover:text-amber-400 dark:border-dark-border dark:bg-dark-bg dark:text-slate-600 dark:hover:border-amber-500/30 dark:hover:text-amber-400'
                          }`}
                        >
                          <Star
                            size={22}
                            fill={active ? 'currentColor' : 'none'}
                          />
                        </button>
                      );
                    })}

                    <span className="ml-2 text-sm font-medium text-slate-500 dark:text-slate-400">
                      {form.rating
                        ? `${form.rating}/5`
                        : 'No rating selected'}
                    </span>
                  </div>
                </section>

                {/* Category */}
                <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-dark-border dark:bg-dark-card sm:p-7">
                  <div className="mb-5">
                    <h2 className="font-semibold text-slate-900 dark:text-white">
                      What is your feedback about?
                    </h2>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      Select the category that best matches your feedback.
                    </p>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    {CATEGORIES.map((category) => {
                      const Icon = category.icon;
                      const selected = form.category === category.value;

                      return (
                        <button
                          key={category.value}
                          type="button"
                          onClick={() =>
                            updateField('category', category.value)
                          }
                          className={`group flex items-start gap-3 rounded-2xl border p-4 text-left transition ${
                            selected
                              ? 'border-brand-500 bg-brand-50 ring-2 ring-brand-500/10 dark:border-brand-400 dark:bg-brand-500/10'
                              : 'border-slate-200 bg-white hover:border-brand-300 hover:bg-slate-50 dark:border-dark-border dark:bg-dark-bg dark:hover:border-brand-500/40 dark:hover:bg-dark-card'
                          }`}
                        >
                          <div
                            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition ${
                              selected
                                ? 'bg-brand-600 text-white dark:bg-brand-500'
                                : 'bg-slate-100 text-slate-500 group-hover:bg-brand-50 group-hover:text-brand-600 dark:bg-dark-card dark:text-slate-400 dark:group-hover:bg-brand-500/10 dark:group-hover:text-brand-400'
                            }`}
                          >
                            <Icon size={19} />
                          </div>

                          <div className="min-w-0 flex-1">
                            <p
                              className={`text-sm font-semibold ${
                                selected
                                  ? 'text-brand-700 dark:text-brand-300'
                                  : 'text-slate-800 dark:text-white'
                              }`}
                            >
                              {category.label}
                            </p>

                            <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
                              {category.description}
                            </p>
                          </div>

                          {selected && (
                            <CheckCircle2
                              size={18}
                              className="shrink-0 text-brand-600 dark:text-brand-400"
                            />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </section>

                {/* Details */}
                <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-dark-border dark:bg-dark-card sm:p-7">
                  <div className="mb-6">
                    <h2 className="font-semibold text-slate-900 dark:text-white">
                      Tell us more
                    </h2>

                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      Give us enough detail to understand your feedback.
                    </p>
                  </div>

                  <div className="space-y-5">
                    {/* Subject */}
                    <div>
                      <div className="mb-2 flex items-center justify-between gap-3">
                        <label
                          htmlFor="feedback-subject"
                          className="text-sm font-semibold text-slate-700 dark:text-slate-200"
                        >
                          Subject
                        </label>

                        <span className="text-xs text-slate-400">
                          {form.subject.length}/{MAX_SUBJECT_LENGTH}
                        </span>
                      </div>

                      <input
                        id="feedback-subject"
                        type="text"
                        value={form.subject}
                        onChange={(event) =>
                          updateField(
                            'subject',
                            event.target.value.slice(
                              0,
                              MAX_SUBJECT_LENGTH
                            )
                          )
                        }
                        placeholder="e.g. Great experience with receipt verification"
                        maxLength={MAX_SUBJECT_LENGTH}
                        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 dark:border-dark-border dark:bg-dark-bg dark:text-white dark:placeholder:text-slate-600"
                      />
                    </div>

                    {/* Message */}
                    <div>
                      <div className="mb-2 flex items-center justify-between gap-3">
                        <label
                          htmlFor="feedback-message"
                          className="text-sm font-semibold text-slate-700 dark:text-slate-200"
                        >
                          Your feedback
                        </label>

                        <span className="text-xs text-slate-400">
                          {form.message.length}/{MAX_MESSAGE_LENGTH}
                        </span>
                      </div>

                      <textarea
                        id="feedback-message"
                        value={form.message}
                        onChange={(event) =>
                          updateField(
                            'message',
                            event.target.value.slice(
                              0,
                              MAX_MESSAGE_LENGTH
                            )
                          )
                        }
                        placeholder="Tell us what happened, what you liked, what could be improved, or what you would like us to know..."
                        rows={7}
                        maxLength={MAX_MESSAGE_LENGTH}
                        className="w-full resize-y rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm leading-6 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 dark:border-dark-border dark:bg-dark-bg dark:text-white dark:placeholder:text-slate-600"
                      />
                    </div>

                    {/* Suggestion */}
                    <div>
                      <div className="mb-2 flex items-center justify-between gap-3">
                        <label
                          htmlFor="feedback-suggestion"
                          className="text-sm font-semibold text-slate-700 dark:text-slate-200"
                        >
                          What should we improve?
                          <span className="ml-2 text-xs font-normal text-slate-400">
                            Optional
                          </span>
                        </label>

                        <span className="text-xs text-slate-400">
                          {form.suggestion.length}/{MAX_SUGGESTION_LENGTH}
                        </span>
                      </div>

                      <textarea
                        id="feedback-suggestion"
                        value={form.suggestion}
                        onChange={(event) =>
                          updateField(
                            'suggestion',
                            event.target.value.slice(
                              0,
                              MAX_SUGGESTION_LENGTH
                            )
                          )
                        }
                        placeholder="If you have a specific idea or solution, share it here..."
                        rows={5}
                        maxLength={MAX_SUGGESTION_LENGTH}
                        className="w-full resize-y rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm leading-6 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 dark:border-dark-border dark:bg-dark-bg dark:text-white dark:placeholder:text-slate-600"
                      />
                    </div>
                  </div>
                </section>

                {/* Actions */}
                <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={handleCancel}
                    disabled={isSubmitting}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-dark-border dark:bg-dark-card dark:text-slate-200 dark:hover:bg-dark-bg"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-600 px-7 py-3 text-sm font-semibold text-white shadow-lg shadow-brand-600/20 transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 size={18} className="animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      <>
                        <Send size={18} />
                        Submit Feedback
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Sidebar */}
              <aside className="space-y-6">
                {/* Selected category */}
                <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-dark-border dark:bg-dark-card">
                  <div className="mb-4 flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400">
                      <Sparkles size={19} />
                    </div>

                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                        Selected topic
                      </p>
                      <p className="text-sm font-semibold text-slate-900 dark:text-white">
                        {selectedCategory?.label || 'Choose a category'}
                      </p>
                    </div>
                  </div>

                  <p className="text-sm leading-6 text-slate-500 dark:text-slate-400">
                    {selectedCategory?.description ||
                      'Select a feedback category so your message can be directed to the right team.'}
                  </p>
                </div>

                {/* Why feedback */}
                <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-dark-border dark:bg-dark-card">
                  <div className="bg-gradient-to-br from-brand-600 to-brand-700 p-6 text-white">
                    <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-white/15">
                      <MessageSquare size={21} />
                    </div>

                    <h3 className="text-lg font-bold">
                      Your voice matters
                    </h3>

                    <p className="mt-2 text-sm leading-6 text-white/80">
                      Every useful report, suggestion and idea helps us make
                      EAZY DON CHECK better.
                    </p>
                  </div>

                  <div className="space-y-4 p-6">
                    <div className="flex gap-3">
                      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400">
                        <CheckCircle2 size={17} />
                      </div>

                      <div>
                        <p className="text-sm font-semibold text-slate-800 dark:text-white">
                          Be specific
                        </p>
                        <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
                          Details make it easier for us to understand and
                          investigate issues.
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400">
                        <ShieldCheck size={17} />
                      </div>

                      <div>
                        <p className="text-sm font-semibold text-slate-800 dark:text-white">
                          Keep it respectful
                        </p>
                        <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
                          Honest and constructive feedback helps our team act
                          on it effectively.
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-purple-50 text-purple-600 dark:bg-purple-500/10 dark:text-purple-400">
                        <Lightbulb size={17} />
                      </div>

                      <div>
                        <p className="text-sm font-semibold text-slate-800 dark:text-white">
                          Share ideas
                        </p>
                        <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
                          Feature ideas and practical suggestions are welcome.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Account */}
                <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-dark-border dark:bg-dark-card">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-100 text-sm font-bold text-brand-700 dark:bg-brand-500/15 dark:text-brand-300">
                      {(getUserName(user) || 'E')[0].toUpperCase()}
                    </div>

                    <div className="min-w-0">
                      <p className="text-xs text-slate-400">
                        Feedback from
                      </p>

                      <p className="truncate text-sm font-semibold text-slate-800 dark:text-white">
                        {getUserName(user) || 'EAZY DON CHECK Member'}
                      </p>

                      {user?.email && (
                        <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                          {user.email}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </aside>
            </div>
          </form>
        </div>
      </div>
    </AppLayout>
  );
};

export default Feedback;