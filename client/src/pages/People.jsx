import React, {
  useEffect,
  useState,
} from 'react';

import {
  Search,
  UserPlus,
  Check,
  Clock,
  Loader2,
  User,
  MapPin,
  Users,
} from 'lucide-react';

import {
  useNavigate,
} from 'react-router-dom';

import AppLayout from '../components/layout/AppLayout';

import {
  useAuth,
} from '../context/AuthContext';

import API from '../services/api';


const People = () => {
  const {
    user,
  } = useAuth();

  const navigate =
    useNavigate();


  const [
    search,
    setSearch,
  ] = useState('');

  const [
    users,
    setUsers,
  ] = useState([]);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    sendingId,
    setSendingId,
  ] = useState(null);

  const [
    sentRequests,
    setSentRequests,
  ] = useState(
    new Set()
  );

  const [
    error,
    setError,
  ] = useState('');

  const [
    success,
    setSuccess,
  ] = useState('');


  // ==========================================================
  // LOAD USERS
  // ==========================================================

  const loadUsers = async (
    searchTerm = ''
  ) => {
    try {
      setLoading(true);
      setError('');

      const response =
        await API.get(
          '/users',
          {
            params: {
              search: searchTerm,
              limit: 50,
            },
          }
        );

      const data =
        response?.data?.data || [];

      setUsers(data);
    } catch (err) {
      setError(
        err?.response?.data?.message ||
        'Unable to load users.'
      );
    } finally {
      setLoading(false);
    }
  };


  useEffect(() => {
    loadUsers('');
  }, []);


  // ==========================================================
  // SEARCH
  // ==========================================================

  useEffect(() => {
    const timer =
      setTimeout(() => {
        loadUsers(search);
      }, 350);

    return () =>
      clearTimeout(timer);
  }, [search]);


  // ==========================================================
  // SEND FRIEND REQUEST
  // ==========================================================

  const handleSendRequest = async (
    userId
  ) => {
    try {
      setSendingId(userId);
      setError('');
      setSuccess('');

      await API.post(
        `/friends/request/${userId}`
      );

      setSentRequests(
        (previous) => {
          const next =
            new Set(previous);

          next.add(userId);

          return next;
        }
      );

      setSuccess(
        'Friend request sent successfully.'
      );
    } catch (err) {
      setError(
        err?.response?.data?.message ||
        'Unable to send friend request.'
      );
    } finally {
      setSendingId(null);
    }
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

          <div className="mb-6">

            <div className="flex items-center gap-3">

              <div className="w-11 h-11 rounded-xl bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center">

                <Users
                  className="w-6 h-6 text-brand-600 dark:text-brand-400"
                />

              </div>

              <div>

                <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                  People
                </h1>

                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Find people and connect with them.
                </p>

              </div>

            </div>

          </div>


          {/* ==================================================
              SEARCH
          ================================================== */}

          <div className="relative mb-6">

            <Search
              className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400"
            />

            <input
              type="text"
              value={search}
              onChange={(e) =>
                setSearch(e.target.value)
              }
              placeholder="Search by name or username..."
              className="
                w-full
                h-12
                pl-12
                pr-4
                rounded-xl
                border
                border-slate-200
                dark:border-dark-border
                bg-white
                dark:bg-dark-card
                text-slate-900
                dark:text-white
                placeholder:text-slate-400
                focus:outline-none
                focus:ring-2
                focus:ring-brand-500/30
                transition
              "
            />

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


          {/* ==================================================
              LOADING
          ================================================== */}

          {loading ? (

            <div className="flex items-center justify-center py-20">

              <Loader2
                className="w-8 h-8 animate-spin text-brand-500"
              />

            </div>

          ) : users.length === 0 ? (

            <div className="rounded-2xl border border-slate-200 dark:border-dark-border bg-white dark:bg-dark-card p-12 text-center">

              <Users
                className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600 mb-4"
              />

              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                No users found
              </h2>

              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Try another name or username.
              </p>

            </div>

          ) : (

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">

              {users.map((person) => {

                const requestSent =
                  sentRequests.has(
                    person._id
                  );

                return (

                  <div
                    key={person._id}
                    className="
                      rounded-2xl
                      border
                      border-slate-200
                      dark:border-dark-border
                      bg-white
                      dark:bg-dark-card
                      overflow-hidden
                      transition
                      hover:shadow-lg
                    "
                  >

                    {/* Avatar */}

                    <div className="pt-6 flex justify-center">

                      {person.avatarUrl ? (

                        <img
                          src={person.avatarUrl}
                          alt={person.name}
                          className="w-20 h-20 rounded-full object-cover border-4 border-slate-100 dark:border-slate-800"
                        />

                      ) : (

                        <div className="w-20 h-20 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">

                          <User
                            className="w-9 h-9 text-slate-400"
                          />

                        </div>

                      )}

                    </div>


                    {/* Details */}

                    <div className="p-5 text-center">

                      <h2 className="font-semibold text-slate-900 dark:text-white truncate">
                        {person.name || 'User'}
                      </h2>

                      {person.username && (
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                          @{person.username}
                        </p>
                      )}

                      {person.location && (
                        <div className="flex items-center justify-center gap-1 mt-3 text-xs text-slate-500 dark:text-slate-400">

                          <MapPin
                            className="w-3.5 h-3.5"
                          />

                          <span className="truncate">
                            {person.location}
                          </span>

                        </div>
                      )}


                      <div className="flex gap-2 mt-5">

                        <button
                          type="button"
                          onClick={() =>
                            navigate(
                              `/profile/${person._id}`
                            )
                          }
                          className="
                            flex-1
                            h-10
                            rounded-lg
                            border
                            border-slate-200
                            dark:border-dark-border
                            text-slate-700
                            dark:text-slate-200
                            hover:bg-slate-50
                            dark:hover:bg-slate-800
                            text-sm
                            font-medium
                            transition
                          "
                        >
                          View Profile
                        </button>


                        <button
                          type="button"
                          disabled={
                            requestSent ||
                            sendingId === person._id
                          }
                          onClick={() =>
                            handleSendRequest(
                              person._id
                            )
                          }
                          className={`
                            flex-1
                            h-10
                            rounded-lg
                            flex
                            items-center
                            justify-center
                            gap-2
                            text-sm
                            font-medium
                            transition
                            ${
                              requestSent
                                ? 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 cursor-default'
                                : 'bg-brand-600 hover:bg-brand-700 text-white'
                            }
                          `}
                        >

                          {sendingId ===
                          person._id ? (

                            <Loader2
                              className="w-4 h-4 animate-spin"
                            />

                          ) : requestSent ? (

                            <>
                              <Clock
                                className="w-4 h-4"
                              />
                              Sent
                            </>

                          ) : (

                            <>
                              <UserPlus
                                className="w-4 h-4"
                              />
                              Add Friend
                            </>

                          )}

                        </button>

                      </div>

                    </div>

                  </div>

                );
              })}

            </div>

          )}

        </div>

      </div>

    </AppLayout>
  );
};


export default People;