import React, {
  useCallback,
  useEffect,
  useState,
} from 'react';

import {
  Users,
  User,
  Check,
  X,
  UserMinus,
  Loader2,
  Clock,
  UserPlus,
} from 'lucide-react';

import {
  useNavigate,
} from 'react-router-dom';

import AppLayout from '../components/layout/AppLayout';

import {
  useAuth,
} from '../context/AuthContext';

import API from '../services/api';


const Friends = () => {
  const {
    user,
  } = useAuth();

  const navigate =
    useNavigate();


  const [
    friends,
    setFriends,
  ] = useState([]);

  const [
    requests,
    setRequests,
  ] = useState([]);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    actionId,
    setActionId,
  ] = useState(null);

  const [
    error,
    setError,
  ] = useState('');

  const [
    success,
    setSuccess,
  ] = useState('');


  // ==========================================================
  // LOAD FRIENDS
  // ==========================================================

  const loadFriends =
    useCallback(async () => {
      try {
        const response =
          await API.get(
            '/friends'
          );

        setFriends(
          response?.data?.data || []
        );
      } catch (err) {
        setError(
          err?.response?.data?.message ||
          'Unable to load friends.'
        );
      }
    }, []);


  // ==========================================================
  // LOAD REQUESTS
  // ==========================================================

  const loadRequests =
    useCallback(async () => {
      try {
        const response =
          await API.get(
            '/friends/requests'
          );

        setRequests(
          response?.data?.data || []
        );
      } catch (err) {
        setError(
          err?.response?.data?.message ||
          'Unable to load friend requests.'
        );
      }
    }, []);


  // ==========================================================
  // INITIAL LOAD
  // ==========================================================

  const loadData =
    useCallback(async () => {
      setLoading(true);
      setError('');

      await Promise.all([
        loadFriends(),
        loadRequests(),
      ]);

      setLoading(false);
    }, [
      loadFriends,
      loadRequests,
    ]);


  useEffect(() => {
    loadData();
  }, [loadData]);


  // ==========================================================
  // ACCEPT
  // ==========================================================

  const handleAccept =
    async (requestId) => {
      try {
        setActionId(requestId);
        setError('');
        setSuccess('');

        await API.put(
          `/friends/request/${requestId}/accept`
        );

        setRequests(
          (previous) =>
            previous.filter(
              (request) =>
                request._id !== requestId
            )
        );

        await loadFriends();

        setSuccess(
          'Friend request accepted.'
        );
      } catch (err) {
        setError(
          err?.response?.data?.message ||
          'Unable to accept friend request.'
        );
      } finally {
        setActionId(null);
      }
    };


  // ==========================================================
  // REJECT
  // ==========================================================

  const handleReject =
    async (requestId) => {
      try {
        setActionId(requestId);
        setError('');
        setSuccess('');

        await API.put(
          `/friends/request/${requestId}/reject`
        );

        setRequests(
          (previous) =>
            previous.filter(
              (request) =>
                request._id !== requestId
            )
        );

        setSuccess(
          'Friend request rejected.'
        );
      } catch (err) {
        setError(
          err?.response?.data?.message ||
          'Unable to reject friend request.'
        );
      } finally {
        setActionId(null);
      }
    };


  // ==========================================================
  // REMOVE FRIEND
  // ==========================================================

  const handleRemove =
    async (friendId) => {
      const confirmed =
        window.confirm(
          'Are you sure you want to remove this friend?'
        );

      if (!confirmed) {
        return;
      }

      try {
        setActionId(friendId);
        setError('');
        setSuccess('');

        await API.delete(
          `/friends/${friendId}`
        );

        setFriends(
          (previous) =>
            previous.filter(
              (friend) =>
                friend._id !== friendId
            )
        );

        setSuccess(
          'Friend removed successfully.'
        );
      } catch (err) {
        setError(
          err?.response?.data?.message ||
          'Unable to remove friend.'
        );
      } finally {
        setActionId(null);
      }
    };


  // ==========================================================
  // USER AVATAR
  // ==========================================================

  const Avatar = ({
    person,
    size = 'normal',
  }) => {

    const sizeClass =
      size === 'large'
        ? 'w-16 h-16'
        : 'w-12 h-12';

    const iconClass =
      size === 'large'
        ? 'w-7 h-7'
        : 'w-5 h-5';

    if (person?.avatarUrl) {
      return (
        <img
          src={person.avatarUrl}
          alt={person.name || 'User'}
          className={`${sizeClass} rounded-full object-cover`}
        />
      );
    }

    return (
      <div
        className={`${sizeClass} rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center`}
      >
        <User
          className={`${iconClass} text-slate-400`}
        />
      </div>
    );
  };


  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <AppLayout user={user}>

      <div className="min-h-screen bg-slate-50 dark:bg-dark-bg transition-colors duration-200">

        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">

          {/* ==================================================
              HEADER
          ================================================== */}

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">

            <div className="flex items-center gap-3">

              <div className="w-11 h-11 rounded-xl bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center">

                <Users
                  className="w-6 h-6 text-brand-600 dark:text-brand-400"
                />

              </div>

              <div>

                <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                  Friends
                </h1>

                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Manage your connections and friend requests.
                </p>

              </div>

            </div>


            <button
              type="button"
              onClick={() =>
                navigate('/people')
              }
              className="inline-flex items-center justify-center gap-2 px-4 h-10 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium transition"
            >
              <UserPlus
                className="w-4 h-4"
              />
              Find People
            </button>

          </div>


          {/* ==================================================
              MESSAGES
          ================================================== */}

          {error && (
            <div className="mb-4 rounded-xl border border-red-200 dark:border-red-900/40 bg-red-50 dark:bg-red-900/20 px-4 py-3 text-sm text-red-700 dark:text-red-300">
              {error}
            </div>
          )}

          {success && (
            <div className="mb-4 rounded-xl border border-emerald-200 dark:border-emerald-900/40 bg-emerald-50 dark:bg-emerald-900/20 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-300">
              {success}
            </div>
          )}


          {loading ? (

            <div className="flex items-center justify-center py-20">

              <Loader2
                className="w-8 h-8 animate-spin text-brand-500"
              />

            </div>

          ) : (

            <div className="space-y-6">

              {/* =================================================
                  FRIEND REQUESTS
              ================================================= */}

              <section className="rounded-2xl border border-slate-200 dark:border-dark-border bg-white dark:bg-dark-card overflow-hidden">

                <div className="px-5 py-4 border-b border-slate-200 dark:border-dark-border flex items-center justify-between">

                  <div>

                    <h2 className="font-semibold text-slate-900 dark:text-white">
                      Friend Requests
                    </h2>

                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      People who want to connect with you.
                    </p>

                  </div>

                  <span className="min-w-7 h-7 px-2 rounded-full bg-brand-100 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300 flex items-center justify-center text-xs font-bold">
                    {requests.length}
                  </span>

                </div>


                {requests.length === 0 ? (

                  <div className="p-8 text-center">

                    <Clock
                      className="w-9 h-9 mx-auto text-slate-300 dark:text-slate-600 mb-3"
                    />

                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      No pending friend requests.
                    </p>

                  </div>

                ) : (

                  <div className="divide-y divide-slate-100 dark:divide-slate-800">

                    {requests.map(
                      (request) => {

                        const sender =
                          request.sender;

                        return (

                          <div
                            key={request._id}
                            className="p-4 flex flex-col sm:flex-row sm:items-center gap-4"
                          >

                            <button
                              type="button"
                              onClick={() =>
                                navigate(
                                  `/profile/${sender?._id}`
                                )
                              }
                              className="flex items-center gap-3 flex-1 text-left min-w-0"
                            >

                              <Avatar
                                person={sender}
                              />

                              <div className="min-w-0">

                                <p className="font-semibold text-slate-900 dark:text-white truncate">
                                  {sender?.name ||
                                    'User'}
                                </p>

                                {sender?.username && (
                                  <p className="text-sm text-slate-500 dark:text-slate-400 truncate">
                                    @{sender.username}
                                  </p>
                                )}

                              </div>

                            </button>


                            <div className="flex gap-2 sm:flex-shrink-0">

                              <button
                                type="button"
                                disabled={
                                  actionId ===
                                  request._id
                                }
                                onClick={() =>
                                  handleAccept(
                                    request._id
                                  )
                                }
                                className="inline-flex items-center justify-center gap-2 px-4 h-9 rounded-lg bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white text-sm font-medium transition"
                              >

                                {actionId ===
                                request._id ? (

                                  <Loader2
                                    className="w-4 h-4 animate-spin"
                                  />

                                ) : (

                                  <Check
                                    className="w-4 h-4"
                                  />

                                )}

                                Accept

                              </button>


                              <button
                                type="button"
                                disabled={
                                  actionId ===
                                  request._id
                                }
                                onClick={() =>
                                  handleReject(
                                    request._id
                                  )
                                }
                                className="inline-flex items-center justify-center gap-2 px-4 h-9 rounded-lg border border-slate-200 dark:border-dark-border text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50 text-sm font-medium transition"
                              >

                                <X
                                  className="w-4 h-4"
                                />

                                Reject

                              </button>

                            </div>

                          </div>

                        );
                      }
                    )}

                  </div>

                )}

              </section>


              {/* =================================================
                  FRIENDS LIST
              ================================================= */}

              <section className="rounded-2xl border border-slate-200 dark:border-dark-border bg-white dark:bg-dark-card overflow-hidden">

                <div className="px-5 py-4 border-b border-slate-200 dark:border-dark-border">

                  <h2 className="font-semibold text-slate-900 dark:text-white">
                    My Friends
                  </h2>

                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    {friends.length}{' '}
                    {friends.length === 1
                      ? 'friend'
                      : 'friends'}
                  </p>

                </div>


                {friends.length === 0 ? (

                  <div className="p-10 text-center">

                    <Users
                      className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-600 mb-3"
                    />

                    <h3 className="font-medium text-slate-900 dark:text-white">
                      You don't have any friends yet.
                    </h3>

                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 mb-4">
                      Search for people and start connecting.
                    </p>

                    <button
                      type="button"
                      onClick={() =>
                        navigate('/people')
                      }
                      className="inline-flex items-center gap-2 px-4 h-9 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium"
                    >
                      <UserPlus
                        className="w-4 h-4"
                      />
                      Find People
                    </button>

                  </div>

                ) : (

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-5">

                    {friends.map(
                      (friend) => (

                        <div
                          key={friend._id}
                          className="rounded-xl border border-slate-200 dark:border-dark-border p-4 hover:shadow-md transition"
                        >

                          <div className="flex items-center gap-3">

                            <button
                              type="button"
                              onClick={() =>
                                navigate(
                                  `/profile/${friend._id}`
                                )
                              }
                            >
                              <Avatar
                                person={friend}
                                size="large"
                              />
                            </button>


                            <button
                              type="button"
                              onClick={() =>
                                navigate(
                                  `/profile/${friend._id}`
                                )
                              }
                              className="min-w-0 text-left flex-1"
                            >

                              <p className="font-semibold text-slate-900 dark:text-white truncate">
                                {friend.name ||
                                  'User'}
                              </p>

                              {friend.username && (
                                <p className="text-sm text-slate-500 dark:text-slate-400 truncate">
                                  @{friend.username}
                                </p>
                              )}

                              <div className="flex items-center gap-1 mt-1">

                                <span
                                  className={`w-2 h-2 rounded-full ${
                                    friend.isOnline
                                      ? 'bg-emerald-500'
                                      : 'bg-slate-300 dark:bg-slate-600'
                                  }`}
                                />

                                <span className="text-xs text-slate-500 dark:text-slate-400">
                                  {friend.isOnline
                                    ? 'Online'
                                    : 'Offline'}
                                </span>

                              </div>

                            </button>

                          </div>


                          <div className="mt-4 flex gap-2">

                            <button
                              type="button"
                              onClick={() =>
                                navigate(
                                  `/profile/${friend._id}`
                                )
                              }
                              className="flex-1 h-9 rounded-lg border border-slate-200 dark:border-dark-border text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
                            >
                              View Profile
                            </button>


                            <button
                              type="button"
                              disabled={
                                actionId ===
                                friend._id
                              }
                              onClick={() =>
                                handleRemove(
                                  friend._id
                                )
                              }
                              className="w-9 h-9 rounded-lg border border-red-200 dark:border-red-900/40 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center justify-center transition disabled:opacity-50"
                              title="Remove friend"
                            >

                              {actionId ===
                              friend._id ? (

                                <Loader2
                                  className="w-4 h-4 animate-spin"
                                />

                              ) : (

                                <UserMinus
                                  className="w-4 h-4"
                                />

                              )}

                            </button>

                          </div>

                        </div>

                      )
                    )}

                  </div>

                )}

              </section>

            </div>

          )}

        </div>

      </div>

    </AppLayout>
  );
};


export default Friends;