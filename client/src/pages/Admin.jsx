import React, {
  useEffect,
  useMemo,
  useState,
} from 'react';

import AppLayout from '../components/layout/AppLayout';

import API from '../services/api';

import {
  ShieldAlert,
  Users,
  FileCheck2,
  Cpu,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Download,
  Loader2,
  Edit3,
  Trash2,
  X,
  Save,
  AlertTriangle,
  UserCog,
  Plus,
  RefreshCw,
  MessageSquare,
  Star,
  Eye,
  Clock,
  Check,
  ChevronDown,
  Send,
} from 'lucide-react';


// ============================================================
// HELPERS
// ============================================================

const getUserId = (user) => {
  return user?._id || user?.id || null;
};


const getUserName = (user) => {
  if (user?.name) {
    return user.name;
  }

  const fullName = [
    user?.firstName,
    user?.middleName,
    user?.lastName,
  ]
    .filter(Boolean)
    .join(' ');

  return fullName || 'Unnamed User';
};


const isSuperAdminRole = (role) => {
  const normalizedRole =
    String(role || '').toLowerCase();

  return (
    normalizedRole === 'superadmin' ||
    normalizedRole === 'super_admin' ||
    normalizedRole === 'super-admin'
  );
};


const getUserStatus = (user) => {
  if (user?.status) {
    return user.status;
  }

  if (user?.accountStatus) {
    return user.accountStatus;
  }

  return 'Active';
};


const getStatusIsActive = (status) => {
  return String(status || '').toLowerCase() === 'active';
};


const formatDate = (date) => {
  if (!date) {
    return 'N/A';
  }

  const parsed = new Date(date);

  if (Number.isNaN(parsed.getTime())) {
    return 'N/A';
  }

  return parsed.toLocaleString(
    undefined,
    {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }
  );
};


const formatShortDate = (date) => {
  if (!date) {
    return 'N/A';
  }

  const parsed = new Date(date);

  if (Number.isNaN(parsed.getTime())) {
    return 'N/A';
  }

  return parsed.toLocaleDateString(
    undefined,
    {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
    }
  );
};


const normalizeFeedbackStatus = (status) => {
  return String(status || 'new').toLowerCase();
};


const getFeedbackStatusLabel = (status) => {
  const normalized =
    normalizeFeedbackStatus(status);

  if (normalized === 'reviewed') {
    return 'Reviewed';
  }

  if (normalized === 'resolved') {
    return 'Resolved';
  }

  return 'New';
};


const getFeedbackCategoryLabel = (category) => {
  const labels = {
    general: 'General',
    bug: 'Bug Report',
    feature: 'Feature Request',
    verification: 'Verification',
    community: 'Community',
    security: 'Security',
    other: 'Other',
  };

  return (
    labels[
      String(category || '').toLowerCase()
    ] ||
    'Other'
  );
};


const getFeedbackStatusClasses = (status) => {
  const normalized =
    normalizeFeedbackStatus(status);

  if (normalized === 'resolved') {
    return {
      wrapper:
        'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
      icon: 'text-emerald-500 dark:text-emerald-400',
    };
  }

  if (normalized === 'reviewed') {
    return {
      wrapper:
        'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
      icon:
        'text-blue-500 dark:text-blue-400',
    };
  }

  return {
    wrapper:
      'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
    icon:
      'text-amber-500 dark:text-amber-400',
  };
};


// ============================================================
// STAR RATING
// ============================================================

const StarRating = ({
  rating = 0,
  size = 'w-3.5 h-3.5',
  interactive = false,
  value = rating,
  onChange,
}) => {
  const numericRating =
    Number(rating) || 0;

  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => {
        const active =
          star <= numericRating;

        return (
          <button
            key={star}
            type={interactive ? 'button' : undefined}
            disabled={!interactive}
            onClick={() => {
              if (
                interactive &&
                onChange
              ) {
                onChange(star);
              }
            }}
            className={`
              ${
                interactive
                  ? 'cursor-pointer hover:scale-110'
                  : 'cursor-default'
              }
              transition-transform
              ${
                active
                  ? 'text-amber-400 fill-amber-400'
                  : 'text-slate-300 dark:text-slate-600'
              }
            `}
            aria-label={
              interactive
                ? `${star} star${star === 1 ? '' : 's'}`
                : undefined
            }
          >
            <Star
              className={size}
              fill={
                active
                  ? 'currentColor'
                  : 'none'
              }
            />
          </button>
        );
      })}
    </div>
  );
};


// ============================================================
// COMPONENT
// ============================================================

const Admin = () => {

  // ============================================================
  // TABS / FILTERS
  // ============================================================

  const [
    activeTab,
    setActiveTab,
  ] = useState('users');

  const [
    searchTerm,
    setSearchTerm,
  ] = useState('');

  const [
    roleFilter,
    setRoleFilter,
  ] = useState('all');


  // ============================================================
  // DATABASE STATES
  // ============================================================

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    refreshing,
    setRefreshing,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState(null);

  const [
    users,
    setUsers,
  ] = useState([]);

  const [
    logs,
    setLogs,
  ] = useState([]);


  // ============================================================
  // FEEDBACK STATES
  // ============================================================

  const [
    feedback,
    setFeedback,
  ] = useState([]);

  const [
    feedbackStats,
    setFeedbackStats,
  ] = useState({
    total: 0,
    new: 0,
    reviewed: 0,
    resolved: 0,
    averageRating: 0,
  });

  const [
    feedbackLoading,
    setFeedbackLoading,
  ] = useState(false);

  const [
    feedbackRefreshing,
    setFeedbackRefreshing,
  ] = useState(false);

  const [
    feedbackError,
    setFeedbackError,
  ] = useState(null);

  const [
    feedbackSearch,
    setFeedbackSearch,
  ] = useState('');

  const [
    feedbackStatusFilter,
    setFeedbackStatusFilter,
  ] = useState('all');

  const [
    feedbackCategoryFilter,
    setFeedbackCategoryFilter,
  ] = useState('all');

  const [
    feedbackRatingFilter,
    setFeedbackRatingFilter,
  ] = useState('all');

  const [
    selectedFeedback,
    setSelectedFeedback,
  ] = useState(null);

  const [
    feedbackDetailLoading,
    setFeedbackDetailLoading,
  ] = useState(false);

  const [
    feedbackActionLoading,
    setFeedbackActionLoading,
  ] = useState({});

  const [
    feedbackNote,
    setFeedbackNote,
  ] = useState('');

  const [
    deletingFeedback,
    setDeletingFeedback,
  ] = useState(null);

  const [
    deletingFeedbackLoading,
    setDeletingFeedbackLoading,
  ] = useState(false);


  // ============================================================
  // ACTION LOADING STATES
  // ============================================================

  const [
    statusLoading,
    setStatusLoading,
  ] = useState({});

  const [
    quotaLoading,
    setQuotaLoading,
  ] = useState({});


  // ============================================================
  // METRICS
  // ============================================================

  const [
    metricsData,
    setMetricsData,
  ] = useState({
    totalUsers: '0',
    userChange: '+0%',
    totalScans: '0',
    scanChange: '+0%',
    accuracy: '0%',
    accuracyChange: '+0%',
    flaggedCount: '0',
    flaggedChange: '+0%',
  });


  // ============================================================
  // EDIT USER
  // ============================================================

  const [
    editingUser,
    setEditingUser,
  ] = useState(null);

  const [
    editForm,
    setEditForm,
  ] = useState({
    name: '',
    email: '',
    role: 'user',
    accountStatus: 'active',
  });

  const [
    savingUser,
    setSavingUser,
  ] = useState(false);


  // ============================================================
  // DELETE USER
  // ============================================================

  const [
    deletingUser,
    setDeletingUser,
  ] = useState(null);

  const [
    deleting,
    setDeleting,
  ] = useState(false);


  // ============================================================
  // FETCH ADMIN DATA
  // ============================================================

  const fetchAdminData = async ({
    showRefreshState = false,
  } = {}) => {
    try {
      if (showRefreshState) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError(null);

      const [
        usersRes,
        logsRes,
        metricsRes,
      ] = await Promise.all([
        API.get('/admin/users'),
        API.get('/admin/logs'),
        API.get('/admin/metrics'),
      ]);


      const fetchedUsers =
        usersRes.data?.users ||
        usersRes.data?.data ||
        usersRes.data ||
        [];


      const fetchedLogs =
        logsRes.data?.logs ||
        logsRes.data?.data ||
        logsRes.data ||
        [];


      const fetchedMetrics =
        metricsRes.data?.data ||
        metricsRes.data ||
        {};


      setUsers(
        Array.isArray(fetchedUsers)
          ? fetchedUsers
          : []
      );

      setLogs(
        Array.isArray(fetchedLogs)
          ? fetchedLogs
          : []
      );


      setMetricsData({
        totalUsers:
          fetchedMetrics.totalUsers ??
          fetchedMetrics.stats?.totalUsers ??
          '0',

        userChange:
          fetchedMetrics.userChange ??
          '+0%',

        totalScans:
          fetchedMetrics.totalScans ??
          fetchedMetrics.stats?.totalScans ??
          '0',

        scanChange:
          fetchedMetrics.scanChange ??
          '+0%',

        accuracy:
          fetchedMetrics.accuracy ??
          '0%',

        accuracyChange:
          fetchedMetrics.accuracyChange ??
          '+0%',

        flaggedCount:
          fetchedMetrics.flaggedCount ??
          fetchedMetrics.stats?.flaggedCount ??
          '0',

        flaggedChange:
          fetchedMetrics.flaggedChange ??
          '+0%',
      });

    } catch (err) {
      console.error(
        'Error fetching admin data:',
        err
      );

      setError(
        err.response?.data?.error ||
        err.response?.data?.message ||
        'Failed to load administrative data from database.'
      );

    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };


  // ============================================================
  // FETCH FEEDBACK
  // ============================================================

  const fetchFeedback = async ({
    showRefreshState = false,
  } = {}) => {
    try {
      if (showRefreshState) {
        setFeedbackRefreshing(true);
      } else {
        setFeedbackLoading(true);
      }

      setFeedbackError(null);

      const [
        feedbackRes,
        statsRes,
      ] = await Promise.all([
        API.get('/admin/feedback'),
        API.get('/admin/feedback/stats'),
      ]);


      const fetchedFeedback =
        feedbackRes.data?.feedback ||
        feedbackRes.data?.data ||
        feedbackRes.data ||
        [];


      const fetchedStats =
        statsRes.data?.stats ||
        statsRes.data?.data ||
        statsRes.data ||
        {};


      setFeedback(
        Array.isArray(fetchedFeedback)
          ? fetchedFeedback
          : []
      );


      setFeedbackStats({
        total:
          Number(
            fetchedStats.total ??
            fetchedStats.totalFeedback ??
            0
          ),

        new:
          Number(
            fetchedStats.new ??
            fetchedStats.newFeedback ??
            0
          ),

        reviewed:
          Number(
            fetchedStats.reviewed ??
            fetchedStats.reviewedFeedback ??
            0
          ),

        resolved:
          Number(
            fetchedStats.resolved ??
            fetchedStats.resolvedFeedback ??
            0
          ),

        averageRating:
          Number(
            fetchedStats.averageRating ??
            0
          ),
      });

    } catch (err) {
      console.error(
        'Error fetching feedback:',
        err
      );

      setFeedbackError(
        err.response?.data?.error ||
        err.response?.data?.message ||
        'Failed to load feedback from database.'
      );

    } finally {
      setFeedbackLoading(false);
      setFeedbackRefreshing(false);
    }
  };


  // ============================================================
  // INITIAL LOAD
  // ============================================================

  useEffect(() => {
    fetchAdminData();
    fetchFeedback();
  }, []);


  // ============================================================
  // METRICS
  // ============================================================

  const metrics = [
    {
      label: 'Total Registered Users',
      value: metricsData.totalUsers,
      change: metricsData.userChange,
      icon: Users,
      color:
        'text-blue-500 dark:text-blue-400',
      bg:
        'bg-blue-500/10',
    },

    {
      label: 'Total Verification Scans',
      value: metricsData.totalScans,
      change: metricsData.scanChange,
      icon: FileCheck2,
      color:
        'text-emerald-500 dark:text-emerald-400',
      bg:
        'bg-emerald-500/10',
    },

    {
      label: 'AI Extraction Accuracy',
      value: metricsData.accuracy,
      change: metricsData.accuracyChange,
      icon: Cpu,
      color:
        'text-brand-500 dark:text-brand-400',
      bg:
        'bg-brand-500/10',
    },

    {
      label: 'Flagged / Fraud Alerts',
      value: metricsData.flaggedCount,
      change: metricsData.flaggedChange,
      icon: ShieldAlert,
      color:
        'text-amber-500 dark:text-amber-400',
      bg:
        'bg-amber-500/10',
    },
  ];


  // ============================================================
  // TOGGLE USER STATUS
  // ============================================================

  const toggleUserStatus = async (userId) => {
    if (
      !userId ||
      statusLoading[userId]
    ) {
      return;
    }

    try {
      setStatusLoading((previous) => ({
        ...previous,
        [userId]: true,
      }));

      const res = await API.patch(
        `/admin/users/${userId}/status`
      );

      const updatedUser =
        res.data?.user ||
        res.data?.data;

      if (!updatedUser) {
        throw new Error(
          'Server did not return the updated user.'
        );
      }

      setUsers((currentUsers) =>
        currentUsers.map((user) => {
          const currentId =
            getUserId(user);

          return String(currentId) ===
            String(userId)
            ? updatedUser
            : user;
        })
      );

    } catch (err) {
      console.error(
        'Failed to update user status:',
        err
      );

      alert(
        err.response?.data?.error ||
        err.response?.data?.message ||
        'Error updating user status on server.'
      );

    } finally {
      setStatusLoading((previous) => ({
        ...previous,
        [userId]: false,
      }));
    }
  };


  // ============================================================
  // INCREASE SCAN QUOTA
  // ============================================================

  const handleQuotaIncrease = async (userId) => {
    if (
      !userId ||
      quotaLoading[userId]
    ) {
      return;
    }

    try {
      setQuotaLoading((previous) => ({
        ...previous,
        [userId]: true,
      }));

      const res = await API.patch(
        `/admin/users/${userId}/quota`,
        {
          increment: 10,
        }
      );

      const updatedUser =
        res.data?.user ||
        res.data?.data;

      if (!updatedUser) {
        throw new Error(
          'Server did not return the updated user.'
        );
      }

      setUsers((currentUsers) =>
        currentUsers.map((user) => {
          const currentId =
            getUserId(user);

          return String(currentId) ===
            String(userId)
            ? updatedUser
            : user;
        })
      );

    } catch (err) {
      console.error(
        'Failed to increase scan quota:',
        err
      );

      alert(
        err.response?.data?.error ||
        err.response?.data?.message ||
        'Error updating scan quota on server.'
      );

    } finally {
      setQuotaLoading((previous) => ({
        ...previous,
        [userId]: false,
      }));
    }
  };


  // ============================================================
  // OPEN EDIT USER
  // ============================================================

  const handleEditUser = (user) => {
    if (!user) {
      return;
    }

    if (isSuperAdminRole(user.role)) {
      alert(
        'The Super Admin account cannot be edited from this panel.'
      );

      return;
    }

    setEditingUser(user);

    setEditForm({
      name:
        user.name ||
        getUserName(user),

      email:
        user.email ||
        '',

      role:
        user.role ||
        'user',

      accountStatus:
        user.accountStatus ||
        (
          String(user.status || '')
            .toLowerCase() === 'suspended'
            ? 'suspended'
            : 'active'
        ),
    });
  };


  // ============================================================
  // EDIT FORM
  // ============================================================

  const handleEditChange = (event) => {
    const {
      name,
      value,
    } = event.target;

    setEditForm((current) => ({
      ...current,
      [name]: value,
    }));
  };


  // ============================================================
  // SAVE USER
  // ============================================================

  const handleSaveUser = async (event) => {
    event.preventDefault();

    if (
      !editingUser ||
      savingUser
    ) {
      return;
    }

    const userId =
      getUserId(editingUser);

    if (!userId) {
      alert('Invalid user ID.');
      return;
    }

    const cleanName =
      editForm.name.trim();

    const cleanEmail =
      editForm.email.trim();

    if (!cleanName) {
      alert('Please enter the user name.');
      return;
    }

    if (!cleanEmail) {
      alert('Please enter the user email.');
      return;
    }

    try {
      setSavingUser(true);

      const res = await API.put(
        `/admin/users/${userId}`,
        {
          name: cleanName,
          email: cleanEmail,
          role: editForm.role,
          accountStatus:
            editForm.accountStatus,
        }
      );

      const updatedUser =
        res.data?.user ||
        res.data?.data;

      if (!updatedUser) {
        throw new Error(
          'Server did not return the updated user.'
        );
      }

      setUsers((currentUsers) =>
        currentUsers.map((user) => {
          const currentId =
            getUserId(user);

          return String(currentId) ===
            String(userId)
            ? updatedUser
            : user;
        })
      );

      setEditingUser(null);

      alert(
        res.data?.message ||
        'User account updated successfully.'
      );

    } catch (err) {
      console.error(
        'Failed to edit user:',
        err
      );

      alert(
        err.response?.data?.error ||
        err.response?.data?.message ||
        'Failed to update user account.'
      );

    } finally {
      setSavingUser(false);
    }
  };


  // ============================================================
  // OPEN DELETE USER
  // ============================================================

  const handleDeleteUser = (user) => {
    if (!user) {
      return;
    }

    if (isSuperAdminRole(user.role)) {
      alert(
        'The Super Admin account cannot be deleted from this panel.'
      );

      return;
    }

    const userId =
      getUserId(user);

    if (!userId) {
      alert('Invalid user ID.');
      return;
    }

    setDeletingUser(user);
  };


  // ============================================================
  // DELETE USER
  // ============================================================

  const confirmDeleteUser = async () => {
    if (
      !deletingUser ||
      deleting
    ) {
      return;
    }

    const userId =
      getUserId(deletingUser);

    if (!userId) {
      alert('Invalid user ID.');
      return;
    }

    try {
      setDeleting(true);

      const res = await API.delete(
        `/admin/users/${userId}`
      );

      setUsers((currentUsers) =>
        currentUsers.filter((user) => {
          const currentId =
            getUserId(user);

          return String(currentId) !==
            String(userId);
        })
      );

      setDeletingUser(null);

      try {
        const metricsRes =
          await API.get('/admin/metrics');

        const refreshed =
          metricsRes.data?.data ||
          metricsRes.data ||
          {};

        setMetricsData((current) => ({
          ...current,

          totalUsers:
            refreshed.totalUsers ??
            refreshed.stats?.totalUsers ??
            current.totalUsers,

          totalScans:
            refreshed.totalScans ??
            refreshed.stats?.totalScans ??
            current.totalScans,

          accuracy:
            refreshed.accuracy ??
            current.accuracy,

          flaggedCount:
            refreshed.flaggedCount ??
            refreshed.stats?.flaggedCount ??
            current.flaggedCount,

          userChange:
            refreshed.userChange ??
            current.userChange,

          scanChange:
            refreshed.scanChange ??
            current.scanChange,

          accuracyChange:
            refreshed.accuracyChange ??
            current.accuracyChange,

          flaggedChange:
            refreshed.flaggedChange ??
            current.flaggedChange,
        }));

      } catch (metricsError) {
        console.warn(
          'Metrics refresh after deletion failed:',
          metricsError
        );
      }

      alert(
        res.data?.message ||
        'User account deleted successfully.'
      );

    } catch (err) {
      console.error(
        'Failed to delete user:',
        err
      );

      alert(
        err.response?.data?.error ||
        err.response?.data?.message ||
        'Failed to delete user account.'
      );

    } finally {
      setDeleting(false);
    }
  };


  // ============================================================
  // FILTER USERS
  // ============================================================

  const filteredUsers =
    users.filter((user) => {
      const search =
        searchTerm
          .trim()
          .toLowerCase();

      const name =
        getUserName(user);

      const email =
        user.email || '';

      const matchesSearch =
        !search ||
        name
          .toLowerCase()
          .includes(search) ||
        email
          .toLowerCase()
          .includes(search);

      const normalizedRole =
        String(
          user.role || ''
        ).toLowerCase();

      const matchesRole =
        roleFilter === 'all' ||
        normalizedRole ===
          roleFilter;

      return (
        matchesSearch &&
        matchesRole
      );
    });


  // ============================================================
  // FEEDBACK DETAIL
  // ============================================================

  const openFeedback = async (item) => {
    if (!item) {
      return;
    }

    const feedbackId =
      item._id || item.id;

    if (!feedbackId) {
      setSelectedFeedback(item);
      setFeedbackNote(
        item.adminNote || ''
      );
      return;
    }

    try {
      setFeedbackDetailLoading(true);

      const res = await API.get(
        `/admin/feedback/${feedbackId}`
      );

      const detailedFeedback =
        res.data?.feedback ||
        res.data?.data ||
        item;

      setSelectedFeedback(
        detailedFeedback
      );

      setFeedbackNote(
        detailedFeedback.adminNote ||
        ''
      );

    } catch (err) {
      console.error(
        'Failed to load feedback details:',
        err
      );

      setSelectedFeedback(item);

      setFeedbackNote(
        item.adminNote || ''
      );
    } finally {
      setFeedbackDetailLoading(false);
    }
  };


  // ============================================================
  // UPDATE FEEDBACK STATUS
  // ============================================================

  const updateFeedbackStatus = async (
    feedbackItem,
    nextStatus
  ) => {
    if (!feedbackItem) {
      return;
    }

    const feedbackId =
      feedbackItem._id ||
      feedbackItem.id;

    if (!feedbackId) {
      return;
    }

    const loadingKey =
      `${feedbackId}-${nextStatus}`;

    if (feedbackActionLoading[loadingKey]) {
      return;
    }

    try {
      setFeedbackActionLoading(
        (previous) => ({
          ...previous,
          [loadingKey]: true,
        })
      );

      const res = await API.patch(
        `/admin/feedback/${feedbackId}/status`,
        {
          status: nextStatus,
          adminNote:
            feedbackNote.trim(),
        }
      );

      const updatedFeedback =
        res.data?.feedback ||
        res.data?.data;

      if (updatedFeedback) {
        setFeedback((current) =>
          current.map((item) => {
            const itemId =
              item._id || item.id;

            return String(itemId) ===
              String(feedbackId)
              ? updatedFeedback
              : item;
          })
        );

        setSelectedFeedback(
          updatedFeedback
        );

        setFeedbackNote(
          updatedFeedback.adminNote ||
          ''
        );
      } else {
        setFeedback((current) =>
          current.map((item) => {
            const itemId =
              item._id || item.id;

            return String(itemId) ===
              String(feedbackId)
              ? {
                  ...item,
                  status: nextStatus,
                  adminNote:
                    feedbackNote.trim(),
                }
              : item;
          })
        );

        setSelectedFeedback((current) =>
          current
            ? {
                ...current,
                status: nextStatus,
                adminNote:
                  feedbackNote.trim(),
              }
            : current
        );
      }

      await refreshFeedbackStats();

    } catch (err) {
      console.error(
        'Failed to update feedback status:',
        err
      );

      alert(
        err.response?.data?.error ||
        err.response?.data?.message ||
        'Failed to update feedback status.'
      );

    } finally {
      setFeedbackActionLoading(
        (previous) => ({
          ...previous,
          [loadingKey]: false,
        })
      );
    }
  };


  // ============================================================
  // SAVE ADMIN NOTE
  // ============================================================

  const saveFeedbackNote = async () => {
    if (!selectedFeedback) {
      return;
    }

    const currentStatus =
      normalizeFeedbackStatus(
        selectedFeedback.status
      );

    await updateFeedbackStatus(
      selectedFeedback,
      currentStatus
    );
  };


  // ============================================================
  // REFRESH FEEDBACK STATS
  // ============================================================

  const refreshFeedbackStats = async () => {
    try {
      const statsRes =
        await API.get(
          '/admin/feedback/stats'
        );

      const stats =
        statsRes.data?.stats ||
        statsRes.data?.data ||
        statsRes.data ||
        {};

      setFeedbackStats({
        total:
          Number(
            stats.total ??
            stats.totalFeedback ??
            0
          ),

        new:
          Number(
            stats.new ??
            stats.newFeedback ??
            0
          ),

        reviewed:
          Number(
            stats.reviewed ??
            stats.reviewedFeedback ??
            0
          ),

        resolved:
          Number(
            stats.resolved ??
            stats.resolvedFeedback ??
            0
          ),

        averageRating:
          Number(
            stats.averageRating ??
            0
          ),
      });

    } catch (err) {
      console.warn(
        'Unable to refresh feedback statistics:',
        err
      );
    }
  };


  // ============================================================
  // DELETE FEEDBACK
  // ============================================================

  const confirmDeleteFeedback = async () => {
    if (
      !deletingFeedback ||
      deletingFeedbackLoading
    ) {
      return;
    }

    const feedbackId =
      deletingFeedback._id ||
      deletingFeedback.id;

    if (!feedbackId) {
      return;
    }

    try {
      setDeletingFeedbackLoading(true);

      const res = await API.delete(
        `/admin/feedback/${feedbackId}`
      );

      setFeedback((current) =>
        current.filter((item) => {
          const itemId =
            item._id || item.id;

          return String(itemId) !==
            String(feedbackId);
        })
      );

      if (
        selectedFeedback &&
        String(
          selectedFeedback._id ||
          selectedFeedback.id
        ) === String(feedbackId)
      ) {
        setSelectedFeedback(null);
      }

      setDeletingFeedback(null);

      await refreshFeedbackStats();

      alert(
        res.data?.message ||
        'Feedback deleted successfully.'
      );

    } catch (err) {
      console.error(
        'Failed to delete feedback:',
        err
      );

      alert(
        err.response?.data?.error ||
        err.response?.data?.message ||
        'Failed to delete feedback.'
      );

    } finally {
      setDeletingFeedbackLoading(false);
    }
  };


  // ============================================================
  // FILTER FEEDBACK
  // ============================================================

  const filteredFeedback =
    useMemo(() => {
      const search =
        feedbackSearch
          .trim()
          .toLowerCase();

      return feedback.filter(
        (item) => {
          const user =
            item.user ||
            item.userId ||
            {};

          const name =
            item.name ||
            user.name ||
            getUserName(user);

          const email =
            item.email ||
            user.email ||
            '';

          const subject =
            item.subject ||
            '';

          const message =
            item.message ||
            '';

          const matchesSearch =
            !search ||
            name
              .toLowerCase()
              .includes(search) ||
            email
              .toLowerCase()
              .includes(search) ||
            subject
              .toLowerCase()
              .includes(search) ||
            message
              .toLowerCase()
              .includes(search);

          const normalizedStatus =
            normalizeFeedbackStatus(
              item.status
            );

          const matchesStatus =
            feedbackStatusFilter === 'all' ||
            normalizedStatus ===
              feedbackStatusFilter;

          const normalizedCategory =
            String(
              item.category || 'other'
            ).toLowerCase();

          const matchesCategory =
            feedbackCategoryFilter === 'all' ||
            normalizedCategory ===
              feedbackCategoryFilter;

          const numericRating =
            Number(item.rating) || 0;

          const matchesRating =
            feedbackRatingFilter === 'all' ||
            numericRating ===
              Number(feedbackRatingFilter);

          return (
            matchesSearch &&
            matchesStatus &&
            matchesCategory &&
            matchesRating
          );
        }
      );
    }, [
      feedback,
      feedbackSearch,
      feedbackStatusFilter,
      feedbackCategoryFilter,
      feedbackRatingFilter,
    ]);


  // ============================================================
  // THEME CLASSES
  // ============================================================

  const panelClass =
    'bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border';

  const inputClass =
    'bg-white dark:bg-dark-bg border border-slate-200 dark:border-dark-border text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600';


  // ============================================================
  // FEEDBACK STAT CARDS
  // ============================================================

  const feedbackStatCards = [
    {
      label: 'Total Feedback',
      value: feedbackStats.total,
      icon: MessageSquare,
      color:
        'text-brand-500 dark:text-brand-400',
      bg:
        'bg-brand-500/10',
    },

    {
      label: 'New',
      value: feedbackStats.new,
      icon: Clock,
      color:
        'text-amber-500 dark:text-amber-400',
      bg:
        'bg-amber-500/10',
    },

    {
      label: 'Reviewed',
      value: feedbackStats.reviewed,
      icon: Eye,
      color:
        'text-blue-500 dark:text-blue-400',
      bg:
        'bg-blue-500/10',
    },

    {
      label: 'Resolved',
      value: feedbackStats.resolved,
      icon: CheckCircle2,
      color:
        'text-emerald-500 dark:text-emerald-400',
      bg:
        'bg-emerald-500/10',
    },

    {
      label: 'Average Rating',
      value:
        Number(
          feedbackStats.averageRating
        ).toFixed(1),
      icon: Star,
      color:
        'text-yellow-500 dark:text-yellow-400',
      bg:
        'bg-yellow-500/10',
    },
  ];


  // ============================================================
  // RENDER
  // ============================================================

  return (
    <AppLayout>

      <div
        className="
          w-full
          max-w-[1600px]
          mx-auto
          px-4
          sm:px-6
          lg:px-8
          xl:px-10
          2xl:px-12
          pt-5
          sm:pt-6
          pb-10
          sm:pb-12
          space-y-6
        "
      >

        {/* ====================================================
            PAGE HEADER
        ==================================================== */}

        <div
          className="
            flex
            flex-col
            sm:flex-row
            sm:items-center
            sm:justify-between
            gap-4
          "
        >

          <div>

            <div className="flex items-center gap-2">

              <div
                className="
                  w-9
                  h-9
                  rounded-xl
                  bg-brand-500/10
                  text-brand-600
                  dark:text-brand-400
                  flex
                  items-center
                  justify-center
                "
              >
                <ShieldAlert className="w-5 h-5" />
              </div>

              <div>

                <h1
                  className="
                    text-lg
                    sm:text-xl
                    font-bold
                    text-slate-900
                    dark:text-white
                  "
                >
                  Administration
                </h1>

                <p
                  className="
                    text-xs
                    text-slate-500
                    dark:text-slate-400
                    mt-0.5
                  "
                >
                  Manage users, verification activity, feedback and platform operations.
                </p>

              </div>

            </div>

          </div>


          {/* REFRESH */}

          <button
            type="button"
            onClick={() => {
              fetchAdminData({
                showRefreshState: true,
              });

              fetchFeedback({
                showRefreshState: true,
              });
            }}
            disabled={
              loading ||
              refreshing ||
              feedbackRefreshing
            }
            className="
              inline-flex
              items-center
              justify-center
              gap-2
              px-3.5
              py-2
              rounded-lg
              bg-white
              dark:bg-dark-card
              border
              border-slate-200
              dark:border-dark-border
              text-xs
              font-semibold
              text-slate-600
              dark:text-slate-300
              hover:text-slate-900
              dark:hover:text-white
              hover:border-brand-500/40
              transition
              disabled:opacity-50
              disabled:cursor-not-allowed
            "
          >

            <RefreshCw
              className={`w-3.5 h-3.5 ${
                refreshing ||
                feedbackRefreshing
                  ? 'animate-spin'
                  : ''
              }`}
            />

            {refreshing ||
            feedbackRefreshing
              ? 'Refreshing...'
              : 'Refresh Data'}

          </button>

        </div>


        {/* ====================================================
            ERROR
        ==================================================== */}

        {error && (
          <div
            className="
              flex
              items-start
              gap-3
              rounded-xl
              border
              border-red-200
              dark:border-red-500/20
              bg-red-50
              dark:bg-red-500/5
              p-4
            "
          >

            <AlertTriangle
              className="
                w-5
                h-5
                text-red-500
                dark:text-red-400
                shrink-0
                mt-0.5
              "
            />

            <div className="min-w-0">

              <p
                className="
                  text-sm
                  font-semibold
                  text-red-700
                  dark:text-red-300
                "
              >
                Unable to load administrative data
              </p>

              <p
                className="
                  text-xs
                  text-red-600/80
                  dark:text-red-300/70
                  mt-1
                "
              >
                {error}
              </p>

              <button
                type="button"
                onClick={() =>
                  fetchAdminData()
                }
                className="
                  mt-3
                  inline-flex
                  items-center
                  gap-2
                  px-3
                  py-1.5
                  rounded-lg
                  bg-red-500
                  text-white
                  text-xs
                  font-semibold
                  hover:bg-red-600
                  transition
                "
              >
                Try Again
              </button>

            </div>

          </div>
        )}


        {/* ====================================================
            SYSTEM OVERVIEW
        ==================================================== */}

        <div
          className="
            grid
            grid-cols-1
            sm:grid-cols-2
            lg:grid-cols-4
            gap-4
            lg:gap-5
          "
        >

          {metrics.map((item, index) => {
            const Icon = item.icon;

            return (
              <div
                key={`${item.label}-${index}`}
                className={`
                  glass-card
                  p-5
                  rounded-xl
                  ${panelClass}
                `}
              >

                <div
                  className="
                    flex
                    items-center
                    justify-between
                    mb-3
                  "
                >

                  <span
                    className="
                      text-xs
                      font-medium
                      text-slate-500
                      dark:text-slate-400
                    "
                  >
                    {item.label}
                  </span>

                  <div
                    className={`
                      p-2
                      rounded-lg
                      ${item.bg}
                      ${item.color}
                    `}
                  >
                    <Icon className="w-4 h-4" />
                  </div>

                </div>


                <div
                  className="
                    flex
                    items-baseline
                    justify-between
                    gap-3
                  "
                >

                  <span
                    className="
                      text-2xl
                      font-bold
                      text-slate-900
                      dark:text-white
                      tracking-tight
                    "
                  >
                    {loading &&
                    metricsData.totalUsers === '0'
                      ? '...'
                      : item.value}
                  </span>

                  <span
                    className={`
                      text-xs
                      font-semibold
                      ${
                        String(
                          item.change || ''
                        ).startsWith('-')
                          ? 'text-red-500 dark:text-red-400'
                          : 'text-emerald-500 dark:text-emerald-400'
                      }
                    `}
                  >
                    {item.change}
                  </span>

                </div>

              </div>
            );
          })}

        </div>


        {/* ====================================================
            MAIN ADMIN DATA PANEL
        ==================================================== */}

        <div
          className={`
            glass-card
            rounded-xl
            overflow-hidden
            ${panelClass}
          `}
        >

          {/* ==================================================
              TABS
          ================================================== */}

          <div
            className="
              flex
              items-center
              justify-between
              border-b
              border-slate-200
              dark:border-dark-border
              px-4
              sm:px-6
              pt-4
              overflow-x-auto
            "
          >

            <div
              className="
                flex
                items-center
                gap-5
                sm:gap-6
                min-w-max
              "
            >

              {/* USERS TAB */}

              <button
                type="button"
                onClick={() =>
                  setActiveTab('users')
                }
                className={`
                  pb-4
                  text-sm
                  font-semibold
                  transition-colors
                  relative
                  ${
                    activeTab === 'users'
                      ? 'text-brand-600 dark:text-brand-400'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }
                `}
              >

                User Accounts ({users.length})

                {activeTab === 'users' && (
                  <span
                    className="
                      absolute
                      bottom-0
                      left-0
                      right-0
                      h-0.5
                      bg-brand-500
                      rounded-t-full
                    "
                  />
                )}

              </button>


              {/* LOGS TAB */}

              <button
                type="button"
                onClick={() =>
                  setActiveTab('logs')
                }
                className={`
                  pb-4
                  text-sm
                  font-semibold
                  transition-colors
                  relative
                  ${
                    activeTab === 'logs'
                      ? 'text-brand-600 dark:text-brand-400'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }
                `}
              >

                Verification Audit Logs ({logs.length})

                {activeTab === 'logs' && (
                  <span
                    className="
                      absolute
                      bottom-0
                      left-0
                      right-0
                      h-0.5
                      bg-brand-500
                      rounded-t-full
                    "
                  />
                )}

              </button>


              {/* FEEDBACK TAB */}

              <button
                type="button"
                onClick={() =>
                  setActiveTab('feedback')
                }
                className={`
                  pb-4
                  text-sm
                  font-semibold
                  transition-colors
                  relative
                  inline-flex
                  items-center
                  gap-2
                  ${
                    activeTab === 'feedback'
                      ? 'text-brand-600 dark:text-brand-400'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }
                `}
              >

                <MessageSquare className="w-3.5 h-3.5" />

                Feedback ({feedbackStats.total})

                {feedbackStats.new > 0 && (
                  <span
                    className="
                      inline-flex
                      min-w-[18px]
                      h-[18px]
                      px-1
                      items-center
                      justify-center
                      rounded-full
                      bg-amber-500
                      text-white
                      text-[9px]
                      font-bold
                    "
                  >
                    {feedbackStats.new > 99
                      ? '99+'
                      : feedbackStats.new}
                  </span>
                )}

                {activeTab === 'feedback' && (
                  <span
                    className="
                      absolute
                      bottom-0
                      left-0
                      right-0
                      h-0.5
                      bg-brand-500
                      rounded-t-full
                    "
                  />
                )}

              </button>

            </div>

          </div>


          {/* ==================================================
              GENERAL LOADING
          ================================================== */}

          {loading &&
          activeTab !== 'feedback' &&
          users.length === 0 ? (

            <div
              className="
                flex
                flex-col
                items-center
                justify-center
                p-16
                space-y-3
              "
            >

              <Loader2
                className="
                  w-8
                  h-8
                  text-brand-500
                  animate-spin
                "
              />

              <p
                className="
                  text-xs
                  text-slate-500
                  dark:text-slate-400
                "
              >
                Syncing with database...
              </p>

            </div>

          ) : (

            <>

              {/* =================================================
                  USERS
              ================================================= */}

              {activeTab === 'users' && (
                <div
                  className="
                    p-4
                    sm:p-6
                    space-y-6
                  "
                >

                  {/* SEARCH / FILTER */}

                  <div
                    className="
                      flex
                      flex-col
                      sm:flex-row
                      items-stretch
                      sm:items-center
                      justify-between
                      gap-4
                    "
                  >

                    <div
                      className="
                        relative
                        w-full
                        sm:w-80
                      "
                    >

                      <Search
                        className="
                          w-4
                          h-4
                          text-slate-400
                          dark:text-slate-500
                          absolute
                          left-3
                          top-1/2
                          -translate-y-1/2
                        "
                      />

                      <input
                        type="text"
                        value={searchTerm}
                        onChange={(event) =>
                          setSearchTerm(
                            event.target.value
                          )
                        }
                        placeholder="Search by name or email..."
                        className={`
                          w-full
                          pl-9
                          pr-4
                          py-2
                          rounded-lg
                          text-xs
                          focus:outline-none
                          focus:border-brand-500
                          transition-colors
                          ${inputClass}
                        `}
                      />

                    </div>


                    <div
                      className="
                        flex
                        items-center
                        gap-2
                        bg-slate-50
                        dark:bg-dark-bg
                        border
                        border-slate-200
                        dark:border-dark-border
                        rounded-lg
                        px-3
                        py-1.5
                        text-xs
                        text-slate-600
                        dark:text-slate-300
                        w-full
                        sm:w-auto
                      "
                    >

                      <Filter
                        className="
                          w-3.5
                          h-3.5
                          text-slate-400
                        "
                      />

                      <span>
                        Role:
                      </span>

                      <select
                        value={roleFilter}
                        onChange={(event) =>
                          setRoleFilter(
                            event.target.value
                          )
                        }
                        className="
                          bg-transparent
                          text-slate-900
                          dark:text-white
                          font-medium
                          focus:outline-none
                          cursor-pointer
                        "
                      >

                        <option
                          value="all"
                          className="
                            bg-white
                            dark:bg-dark-card
                            text-slate-900
                            dark:text-white
                          "
                        >
                          All Roles
                        </option>

                        <option
                          value="user"
                          className="
                            bg-white
                            dark:bg-dark-card
                            text-slate-900
                            dark:text-white
                          "
                        >
                          User
                        </option>

                        <option
                          value="superadmin"
                          className="
                            bg-white
                            dark:bg-dark-card
                            text-slate-900
                            dark:text-white
                          "
                        >
                          Super Admin
                        </option>

                      </select>

                    </div>

                  </div>


                  {/* USERS TABLE */}

                  <div
                    className="
                      w-full
                      overflow-x-auto
                      overflow-y-hidden
                      border
                      border-slate-200
                      dark:border-dark-border
                      rounded-lg
                    "
                  >

                    <table
                      className="
                        w-full
                        min-w-[900px]
                        text-left
                        text-xs
                      "
                    >

                      <thead
                        className="
                          bg-slate-50
                          dark:bg-dark-bg/80
                          text-slate-500
                          dark:text-slate-400
                          font-medium
                          border-b
                          border-slate-200
                          dark:border-dark-border
                        "
                      >

                        <tr>

                          <th className="p-3.5">
                            User
                          </th>

                          <th className="p-3.5">
                            Role
                          </th>

                          <th className="p-3.5">
                            Quota Allocation
                          </th>

                          <th className="p-3.5">
                            Status
                          </th>

                          <th className="p-3.5">
                            Joined Date
                          </th>

                          <th className="p-3.5 text-right">
                            Actions
                          </th>

                        </tr>

                      </thead>


                      <tbody
                        className="
                          divide-y
                          divide-slate-200
                          dark:divide-dark-border/60
                          text-slate-700
                          dark:text-slate-300
                        "
                      >

                        {filteredUsers.length === 0 ? (

                          <tr>

                            <td
                              colSpan="6"
                              className="
                                text-center
                                py-10
                                text-slate-500
                              "
                            >

                              <div
                                className="
                                  flex
                                  flex-col
                                  items-center
                                  gap-2
                                "
                              >

                                <Users
                                  className="
                                    w-7
                                    h-7
                                    text-slate-300
                                    dark:text-slate-600
                                  "
                                />

                                <span>
                                  No users found matching criteria.
                                </span>

                              </div>

                            </td>

                          </tr>

                        ) : (

                          filteredUsers.map((user) => {

                            const userId =
                              getUserId(user);

                            const displayName =
                              user.name ||
                              user.username ||
                              getUserName(user);

                            const displayEmail =
                              user.email ||
                              'No email';

                            const status =
                              getUserStatus(user);

                            const scansUsed =
                              Number(
                                user.scansUsed ??
                                user.usage?.scansThisMonth ??
                                0
                              );

                            const maxScans =
                              Number(
                                user.maxScans ??
                                user.usage?.maxScansAllowed ??
                                5
                              );

                            const isSuperAdmin =
                              isSuperAdminRole(
                                user.role
                              );

                            const active =
                              getStatusIsActive(
                                status
                              );

                            return (

                              <tr
                                key={userId}
                                className="
                                  hover:bg-slate-50
                                  dark:hover:bg-dark-bg/40
                                  transition-colors
                                "
                              >

                                <td className="p-3.5">

                                  <div
                                    className="
                                      font-semibold
                                      text-slate-900
                                      dark:text-white
                                    "
                                  >
                                    {displayName}
                                  </div>

                                  <div
                                    className="
                                      text-[11px]
                                      text-slate-500
                                      dark:text-slate-400
                                    "
                                  >
                                    {displayEmail}
                                  </div>

                                </td>


                                <td className="p-3.5">

                                  <span
                                    className={`
                                      inline-block
                                      px-2
                                      py-0.5
                                      rounded
                                      text-[10px]
                                      font-bold
                                      uppercase
                                      tracking-wider
                                      ${
                                        isSuperAdmin
                                          ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                                          : 'bg-slate-100 dark:bg-slate-700/40 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700/40'
                                      }
                                    `}
                                  >
                                    {isSuperAdmin
                                      ? 'Super Admin'
                                      : user.role || 'User'}
                                  </span>

                                </td>


                                <td className="p-3.5">

                                  <div
                                    className="
                                      flex
                                      items-center
                                      gap-2
                                      flex-wrap
                                    "
                                  >

                                    <span
                                      className="
                                        font-semibold
                                        text-slate-900
                                        dark:text-white
                                      "
                                    >
                                      {scansUsed}
                                    </span>

                                    <span
                                      className="
                                        text-slate-500
                                        dark:text-slate-400
                                      "
                                    >
                                      /
                                      {' '}
                                      {maxScans >= 999999
                                        ? 'Unlimited'
                                        : maxScans}
                                    </span>

                                    {!isSuperAdmin && (
                                      <button
                                        type="button"
                                        onClick={() =>
                                          handleQuotaIncrease(
                                            userId
                                          )
                                        }
                                        disabled={
                                          quotaLoading[userId]
                                        }
                                        className="
                                          inline-flex
                                          items-center
                                          gap-1
                                          text-[10px]
                                          font-semibold
                                          text-brand-600
                                          dark:text-brand-400
                                          hover:text-brand-700
                                          dark:hover:text-brand-300
                                          ml-1
                                          px-1.5
                                          py-0.5
                                          rounded
                                          bg-brand-500/10
                                          border
                                          border-brand-500/20
                                          disabled:opacity-50
                                          disabled:cursor-not-allowed
                                          transition-colors
                                        "
                                      >

                                        {quotaLoading[userId] ? (
                                          <Loader2
                                            className="
                                              w-3
                                              h-3
                                              animate-spin
                                            "
                                          />
                                        ) : (
                                          <Plus
                                            className="
                                              w-3
                                              h-3
                                            "
                                          />
                                        )}

                                        {quotaLoading[userId]
                                          ? 'Updating...'
                                          : '+10 Scans'}

                                      </button>
                                    )}

                                  </div>

                                </td>


                                <td className="p-3.5">

                                  <span
                                    className={`
                                      inline-flex
                                      items-center
                                      gap-1
                                      text-[11px]
                                      font-medium
                                      ${
                                        active
                                          ? 'text-emerald-600 dark:text-emerald-400'
                                          : 'text-red-600 dark:text-red-400'
                                      }
                                    `}
                                  >

                                    {active ? (
                                      <CheckCircle2
                                        className="
                                          w-3.5
                                          h-3.5
                                        "
                                      />
                                    ) : (
                                      <XCircle
                                        className="
                                          w-3.5
                                          h-3.5
                                        "
                                      />
                                    )}

                                    {status}

                                  </span>

                                </td>


                                <td
                                  className="
                                    p-3.5
                                    text-slate-500
                                    dark:text-slate-400
                                    whitespace-nowrap
                                  "
                                >

                                  {user.createdAt
                                    ? formatShortDate(
                                        user.createdAt
                                      )
                                    : user.joined || 'N/A'}

                                </td>


                                <td className="p-3.5">

                                  {!isSuperAdmin && (
                                    <div
                                      className="
                                        flex
                                        flex-wrap
                                        justify-end
                                        gap-2
                                      "
                                    >

                                      <button
                                        type="button"
                                        onClick={() =>
                                          handleEditUser(user)
                                        }
                                        className="
                                          inline-flex
                                          items-center
                                          gap-1
                                          px-2.5
                                          py-1
                                          rounded
                                          text-[11px]
                                          font-medium
                                          bg-brand-500/10
                                          text-brand-600
                                          dark:text-brand-400
                                          hover:bg-brand-500/20
                                          transition-colors
                                        "
                                      >

                                        <Edit3 className="w-3 h-3" />

                                        Edit

                                      </button>


                                      <button
                                        type="button"
                                        onClick={() =>
                                          toggleUserStatus(
                                            userId
                                          )
                                        }
                                        disabled={
                                          statusLoading[userId]
                                        }
                                        className={`
                                          inline-flex
                                          items-center
                                          gap-1.5
                                          px-2.5
                                          py-1
                                          rounded
                                          text-[11px]
                                          font-medium
                                          transition-colors
                                          disabled:opacity-50
                                          disabled:cursor-not-allowed
                                          ${
                                            active
                                              ? 'bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-500/20'
                                              : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20'
                                          }
                                        `}
                                      >

                                        {statusLoading[userId] && (
                                          <Loader2
                                            className="
                                              w-3
                                              h-3
                                              animate-spin
                                            "
                                          />
                                        )}

                                        {statusLoading[userId]
                                          ? 'Updating...'
                                          : active
                                            ? 'Suspend'
                                            : 'Activate'}

                                      </button>


                                      <button
                                        type="button"
                                        onClick={() =>
                                          handleDeleteUser(user)
                                        }
                                        className="
                                          inline-flex
                                          items-center
                                          gap-1
                                          px-2.5
                                          py-1
                                          rounded
                                          text-[11px]
                                          font-medium
                                          bg-red-500/10
                                          text-red-600
                                          dark:text-red-400
                                          hover:bg-red-500/20
                                          transition-colors
                                        "
                                      >

                                        <Trash2
                                          className="w-3 h-3"
                                        />

                                        Delete

                                      </button>

                                    </div>
                                  )}

                                </td>

                              </tr>
                            );
                          })
                        )}

                      </tbody>

                    </table>

                  </div>

                </div>
              )}


              {/* =================================================
                  AUDIT LOGS
              ================================================= */}

              {activeTab === 'logs' && (
                <div
                  className="
                    p-4
                    sm:p-6
                    space-y-5
                  "
                >

                  <div
                    className="
                      flex
                      flex-col
                      sm:flex-row
                      sm:items-center
                      sm:justify-between
                      gap-3
                    "
                  >

                    <div>

                      <h3
                        className="
                          text-sm
                          font-semibold
                          text-slate-900
                          dark:text-white
                        "
                      >
                        Verification Audit Trail
                      </h3>

                      <p
                        className="
                          text-xs
                          text-slate-500
                          dark:text-slate-400
                          mt-1
                        "
                      >
                        Recent verification activity recorded in the EAZY CHECK database.
                      </p>

                    </div>


                    <button
                      type="button"
                      onClick={() =>
                        window.open(
                          `${
                            API.defaults?.baseURL ||
                            ''
                          }/admin/logs/export`,
                          '_blank'
                        )
                      }
                      className="
                        inline-flex
                        items-center
                        justify-center
                        gap-2
                        px-3
                        py-2
                        rounded-lg
                        bg-slate-50
                        dark:bg-dark-bg
                        border
                        border-slate-200
                        dark:border-dark-border
                        text-xs
                        font-semibold
                        text-slate-600
                        dark:text-slate-300
                        hover:text-slate-900
                        dark:hover:text-white
                        hover:border-slate-400
                        dark:hover:border-slate-600
                        transition-colors
                      "
                    >

                      <Download className="w-3.5 h-3.5" />

                      Export Logs

                    </button>

                  </div>


                  <div
                    className="
                      w-full
                      overflow-x-auto
                      overflow-y-hidden
                      border
                      border-slate-200
                      dark:border-dark-border
                      rounded-lg
                    "
                  >

                    <table
                      className="
                        w-full
                        min-w-[800px]
                        text-left
                        text-xs
                      "
                    >

                      <thead
                        className="
                          bg-slate-50
                          dark:bg-dark-bg/80
                          text-slate-500
                          dark:text-slate-400
                          font-medium
                          border-b
                          border-slate-200
                          dark:border-dark-border
                        "
                      >

                        <tr>

                          <th className="p-3.5">
                            User
                          </th>

                          <th className="p-3.5">
                            Merchant
                          </th>

                          <th className="p-3.5">
                            Verification Status
                          </th>

                          <th className="p-3.5">
                            Confidence
                          </th>

                          <th className="p-3.5">
                            Date
                          </th>

                        </tr>

                      </thead>


                      <tbody
                        className="
                          divide-y
                          divide-slate-200
                          dark:divide-dark-border/60
                        "
                      >

                        {logs.length === 0 ? (

                          <tr>

                            <td
                              colSpan="5"
                              className="
                                py-12
                                text-center
                              "
                            >

                              <div
                                className="
                                  flex
                                  flex-col
                                  items-center
                                  gap-2
                                "
                              >

                                <FileCheck2
                                  className="
                                    w-8
                                    h-8
                                    text-slate-300
                                    dark:text-slate-600
                                  "
                                />

                                <p
                                  className="
                                    text-xs
                                    text-slate-500
                                    dark:text-slate-400
                                  "
                                >
                                  No verification logs found.
                                </p>

                              </div>

                            </td>

                          </tr>

                        ) : (

                          logs.map(
                            (
                              log,
                              index
                            ) => {

                              const verificationUser =
                                log.user ||
                                log.userId ||
                                {};

                              const verificationStatus =
                                String(
                                  log.status ||
                                  log.verificationStatus ||
                                  'pending'
                                );

                              const normalizedStatus =
                                verificationStatus.toLowerCase();

                              const confidence =
                                log.confidence ||
                                (
                                  log.confidenceScore !==
                                    undefined &&
                                  log.confidenceScore !==
                                    null
                                    ? `${log.confidenceScore}%`
                                    : '0%'
                                );

                              const merchant =
                                log.merchant ||
                                log.merchantName ||
                                'N/A';

                              const logDate =
                                log.createdAt ||
                                log.updatedAt ||
                                log.date;

                              const logUserName =
                                verificationUser.name ||
                                verificationUser.email ||
                                'Unknown User';

                              const isSuccessful =
                                normalizedStatus ===
                                  'verified' ||
                                normalizedStatus ===
                                  'approved' ||
                                normalizedStatus ===
                                  'success';

                              const isFailed =
                                normalizedStatus ===
                                  'flagged' ||
                                normalizedStatus ===
                                  'rejected' ||
                                normalizedStatus ===
                                  'fraud';

                              return (

                                <tr
                                  key={
                                    log._id ||
                                    log.id ||
                                    `verification-${index}`
                                  }
                                  className="
                                    hover:bg-slate-50
                                    dark:hover:bg-dark-bg/40
                                    transition-colors
                                  "
                                >

                                  <td className="p-3.5">

                                    <div
                                      className="
                                        font-medium
                                        text-slate-900
                                        dark:text-white
                                      "
                                    >
                                      {logUserName}
                                    </div>

                                    {verificationUser.email &&
                                      verificationUser.name && (
                                        <div
                                          className="
                                            text-[10px]
                                            text-slate-500
                                            dark:text-slate-400
                                          "
                                        >
                                          {
                                            verificationUser.email
                                          }
                                        </div>
                                      )}

                                  </td>


                                  <td
                                    className="
                                      p-3.5
                                      text-slate-700
                                      dark:text-slate-300
                                    "
                                  >
                                    {merchant}
                                  </td>


                                  <td className="p-3.5">

                                    <span
                                      className={`
                                        inline-flex
                                        items-center
                                        gap-1.5
                                        px-2
                                        py-1
                                        rounded
                                        text-[10px]
                                        font-bold
                                        uppercase
                                        tracking-wide
                                        ${
                                          isSuccessful
                                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                                            : isFailed
                                              ? 'bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20'
                                              : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                                        }
                                      `}
                                    >

                                      {isSuccessful ? (
                                        <CheckCircle2
                                          className="w-3 h-3"
                                        />
                                      ) : isFailed ? (
                                        <XCircle
                                          className="w-3 h-3"
                                        />
                                      ) : (
                                        <ShieldAlert
                                          className="w-3 h-3"
                                        />
                                      )}

                                      {verificationStatus}

                                    </span>

                                  </td>


                                  <td className="p-3.5">

                                    <span
                                      className="
                                        font-semibold
                                        text-slate-700
                                        dark:text-slate-200
                                      "
                                    >
                                      {confidence}
                                    </span>

                                  </td>


                                  <td
                                    className="
                                      p-3.5
                                      text-slate-500
                                      dark:text-slate-400
                                      whitespace-nowrap
                                    "
                                  >

                                    {logDate
                                      ? formatDate(
                                          logDate
                                        )
                                      : 'N/A'}

                                  </td>

                                </tr>
                              );
                            }
                          )
                        )}

                      </tbody>

                    </table>

                  </div>

                </div>
              )}


              {/* =================================================
                  FEEDBACK MANAGEMENT
              ================================================= */}

              {activeTab === 'feedback' && (
                <div
                  className="
                    p-4
                    sm:p-6
                    space-y-6
                  "
                >

                  {/* FEEDBACK ERROR */}

                  {feedbackError && (
                    <div
                      className="
                        flex
                        items-start
                        gap-3
                        rounded-xl
                        border
                        border-red-200
                        dark:border-red-500/20
                        bg-red-50
                        dark:bg-red-500/5
                        p-4
                      "
                    >

                      <AlertTriangle
                        className="
                          w-5
                          h-5
                          text-red-500
                          dark:text-red-400
                          shrink-0
                        "
                      />

                      <div className="flex-1">

                        <p
                          className="
                            text-sm
                            font-semibold
                            text-red-700
                            dark:text-red-300
                          "
                        >
                          Unable to load feedback
                        </p>

                        <p
                          className="
                            text-xs
                            text-red-600/80
                            dark:text-red-300/70
                            mt-1
                          "
                        >
                          {feedbackError}
                        </p>

                        <button
                          type="button"
                          onClick={() =>
                            fetchFeedback()
                          }
                          className="
                            mt-3
                            inline-flex
                            items-center
                            gap-2
                            px-3
                            py-1.5
                            rounded-lg
                            bg-red-500
                            text-white
                            text-xs
                            font-semibold
                            hover:bg-red-600
                          "
                        >
                          Try Again
                        </button>

                      </div>

                    </div>
                  )}


                  {/* FEEDBACK STATS */}

                  <div
                    className="
                      grid
                      grid-cols-2
                      md:grid-cols-3
                      xl:grid-cols-5
                      gap-3
                    "
                  >

                    {feedbackStatCards.map(
                      (item) => {
                        const Icon =
                          item.icon;

                        return (
                          <div
                            key={item.label}
                            className="
                              rounded-xl
                              border
                              border-slate-200
                              dark:border-dark-border
                              bg-slate-50
                              dark:bg-dark-bg/40
                              p-4
                            "
                          >

                            <div
                              className="
                                flex
                                items-center
                                justify-between
                                gap-3
                              "
                            >

                              <div>

                                <p
                                  className="
                                    text-[10px]
                                    font-medium
                                    uppercase
                                    tracking-wide
                                    text-slate-500
                                    dark:text-slate-400
                                  "
                                >
                                  {item.label}
                                </p>

                                <p
                                  className="
                                    mt-1
                                    text-xl
                                    font-bold
                                    text-slate-900
                                    dark:text-white
                                  "
                                >
                                  {feedbackLoading
                                    ? '...'
                                    : item.value}
                                </p>

                              </div>

                              <div
                                className={`
                                  p-2
                                  rounded-lg
                                  ${item.bg}
                                  ${item.color}
                                `}
                              >
                                <Icon className="w-4 h-4" />
                              </div>

                            </div>

                            {item.label ===
                              'Average Rating' && (
                              <div className="mt-2">
                                <StarRating
                                  rating={
                                    feedbackStats.averageRating
                                  }
                                />
                              </div>
                            )}

                          </div>
                        );
                      }
                    )}

                  </div>


                  {/* FEEDBACK HEADER */}

                  <div
                    className="
                      flex
                      flex-col
                      xl:flex-row
                      xl:items-center
                      xl:justify-between
                      gap-4
                    "
                  >

                    <div>

                      <h3
                        className="
                          text-sm
                          font-semibold
                          text-slate-900
                          dark:text-white
                        "
                      >
                        User Feedback
                      </h3>

                      <p
                        className="
                          text-xs
                          text-slate-500
                          dark:text-slate-400
                          mt-1
                        "
                      >
                        Review suggestions, bug reports, feature requests and platform feedback submitted by users.
                      </p>

                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        fetchFeedback({
                          showRefreshState: true,
                        })
                      }
                      disabled={
                        feedbackLoading ||
                        feedbackRefreshing
                      }
                      className="
                        inline-flex
                        items-center
                        justify-center
                        gap-2
                        px-3
                        py-2
                        rounded-lg
                        bg-slate-50
                        dark:bg-dark-bg
                        border
                        border-slate-200
                        dark:border-dark-border
                        text-xs
                        font-semibold
                        text-slate-600
                        dark:text-slate-300
                        hover:text-slate-900
                        dark:hover:text-white
                        transition-colors
                        disabled:opacity-50
                      "
                    >

                      <RefreshCw
                        className={`
                          w-3.5
                          h-3.5
                          ${
                            feedbackRefreshing
                              ? 'animate-spin'
                              : ''
                          }
                        `}
                      />

                      Refresh Feedback

                    </button>

                  </div>


                  {/* SEARCH / FILTERS */}

                  <div
                    className="
                      grid
                      grid-cols-1
                      md:grid-cols-2
                      xl:grid-cols-4
                      gap-3
                    "
                  >

                    {/* SEARCH */}

                    <div
                      className="
                        relative
                        md:col-span-2
                        xl:col-span-1
                      "
                    >

                      <Search
                        className="
                          absolute
                          left-3
                          top-1/2
                          -translate-y-1/2
                          w-4
                          h-4
                          text-slate-400
                        "
                      />

                      <input
                        type="text"
                        value={feedbackSearch}
                        onChange={(event) =>
                          setFeedbackSearch(
                            event.target.value
                          )
                        }
                        placeholder="Search feedback..."
                        className={`
                          w-full
                          pl-9
                          pr-3
                          py-2.5
                          rounded-lg
                          text-xs
                          focus:outline-none
                          focus:border-brand-500
                          ${inputClass}
                        `}
                      />

                    </div>


                    {/* STATUS */}

                    <div
                      className="
                        flex
                        items-center
                        gap-2
                        px-3
                        rounded-lg
                        border
                        border-slate-200
                        dark:border-dark-border
                        bg-white
                        dark:bg-dark-bg
                      "
                    >

                      <Filter
                        className="
                          w-3.5
                          h-3.5
                          text-slate-400
                          shrink-0
                        "
                      />

                      <select
                        value={
                          feedbackStatusFilter
                        }
                        onChange={(event) =>
                          setFeedbackStatusFilter(
                            event.target.value
                          )
                        }
                        className="
                          w-full
                          bg-transparent
                          py-2.5
                          text-xs
                          font-medium
                          text-slate-700
                          dark:text-slate-200
                          focus:outline-none
                        "
                      >

                        <option value="all">
                          All Statuses
                        </option>

                        <option value="new">
                          New
                        </option>

                        <option value="reviewed">
                          Reviewed
                        </option>

                        <option value="resolved">
                          Resolved
                        </option>

                      </select>

                    </div>


                    {/* CATEGORY */}

                    <div
                      className="
                        flex
                        items-center
                        gap-2
                        px-3
                        rounded-lg
                        border
                        border-slate-200
                        dark:border-dark-border
                        bg-white
                        dark:bg-dark-bg
                      "
                    >

                      <MessageSquare
                        className="
                          w-3.5
                          h-3.5
                          text-slate-400
                          shrink-0
                        "
                      />

                      <select
                        value={
                          feedbackCategoryFilter
                        }
                        onChange={(event) =>
                          setFeedbackCategoryFilter(
                            event.target.value
                          )
                        }
                        className="
                          w-full
                          bg-transparent
                          py-2.5
                          text-xs
                          font-medium
                          text-slate-700
                          dark:text-slate-200
                          focus:outline-none
                        "
                      >

                        <option value="all">
                          All Categories
                        </option>

                        <option value="general">
                          General
                        </option>

                        <option value="bug">
                          Bug Report
                        </option>

                        <option value="feature">
                          Feature Request
                        </option>

                        <option value="verification">
                          Verification
                        </option>

                        <option value="community">
                          Community
                        </option>

                        <option value="security">
                          Security
                        </option>

                        <option value="other">
                          Other
                        </option>

                      </select>

                    </div>


                    {/* RATING */}

                    <div
                      className="
                        flex
                        items-center
                        gap-2
                        px-3
                        rounded-lg
                        border
                        border-slate-200
                        dark:border-dark-border
                        bg-white
                        dark:bg-dark-bg
                      "
                    >

                      <Star
                        className="
                          w-3.5
                          h-3.5
                          text-amber-400
                          shrink-0
                        "
                      />

                      <select
                        value={
                          feedbackRatingFilter
                        }
                        onChange={(event) =>
                          setFeedbackRatingFilter(
                            event.target.value
                          )
                        }
                        className="
                          w-full
                          bg-transparent
                          py-2.5
                          text-xs
                          font-medium
                          text-slate-700
                          dark:text-slate-200
                          focus:outline-none
                        "
                      >

                        <option value="all">
                          All Ratings
                        </option>

                        <option value="5">
                          5 Stars
                        </option>

                        <option value="4">
                          4 Stars
                        </option>

                        <option value="3">
                          3 Stars
                        </option>

                        <option value="2">
                          2 Stars
                        </option>

                        <option value="1">
                          1 Star
                        </option>

                      </select>

                    </div>

                  </div>


                  {/* RESULTS COUNT */}

                  <div
                    className="
                      flex
                      items-center
                      justify-between
                      gap-3
                    "
                  >

                    <p
                      className="
                        text-[11px]
                        text-slate-500
                        dark:text-slate-400
                      "
                    >
                      Showing{' '}
                      <span
                        className="
                          font-semibold
                          text-slate-700
                          dark:text-slate-200
                        "
                      >
                        {filteredFeedback.length}
                      </span>{' '}
                      of{' '}
                      <span
                        className="
                          font-semibold
                          text-slate-700
                          dark:text-slate-200
                        "
                      >
                        {feedback.length}
                      </span>{' '}
                      feedback entries
                    </p>

                  </div>


                  {/* FEEDBACK TABLE */}

                  <div
                    className="
                      w-full
                      overflow-x-auto
                      overflow-y-hidden
                      border
                      border-slate-200
                      dark:border-dark-border
                      rounded-lg
                    "
                  >

                    <table
                      className="
                        w-full
                        min-w-[1050px]
                        text-left
                        text-xs
                      "
                    >

                      <thead
                        className="
                          bg-slate-50
                          dark:bg-dark-bg/80
                          text-slate-500
                          dark:text-slate-400
                          font-medium
                          border-b
                          border-slate-200
                          dark:border-dark-border
                        "
                      >

                        <tr>

                          <th className="p-3.5">
                            User
                          </th>

                          <th className="p-3.5">
                            Feedback
                          </th>

                          <th className="p-3.5">
                            Category
                          </th>

                          <th className="p-3.5">
                            Rating
                          </th>

                          <th className="p-3.5">
                            Status
                          </th>

                          <th className="p-3.5">
                            Submitted
                          </th>

                          <th className="p-3.5 text-right">
                            Action
                          </th>

                        </tr>

                      </thead>


                      <tbody
                        className="
                          divide-y
                          divide-slate-200
                          dark:divide-dark-border/60
                        "
                      >

                        {feedbackLoading ? (

                          <tr>

                            <td
                              colSpan="7"
                              className="py-14"
                            >

                              <div
                                className="
                                  flex
                                  flex-col
                                  items-center
                                  justify-center
                                  gap-3
                                "
                              >

                                <Loader2
                                  className="
                                    w-7
                                    h-7
                                    text-brand-500
                                    animate-spin
                                  "
                                />

                                <p
                                  className="
                                    text-xs
                                    text-slate-500
                                    dark:text-slate-400
                                  "
                                >
                                  Loading feedback...
                                </p>

                              </div>

                            </td>

                          </tr>

                        ) : filteredFeedback.length === 0 ? (

                          <tr>

                            <td
                              colSpan="7"
                              className="py-14"
                            >

                              <div
                                className="
                                  flex
                                  flex-col
                                  items-center
                                  justify-center
                                  gap-3
                                "
                              >

                                <div
                                  className="
                                    w-12
                                    h-12
                                    rounded-full
                                    bg-slate-100
                                    dark:bg-dark-bg
                                    flex
                                    items-center
                                    justify-center
                                  "
                                >

                                  <MessageSquare
                                    className="
                                      w-6
                                      h-6
                                      text-slate-300
                                      dark:text-slate-600
                                    "
                                  />

                                </div>

                                <p
                                  className="
                                    text-sm
                                    font-semibold
                                    text-slate-700
                                    dark:text-slate-300
                                  "
                                >
                                  No feedback found
                                </p>

                                <p
                                  className="
                                    text-xs
                                    text-slate-500
                                    dark:text-slate-400
                                  "
                                >
                                  Try changing your search or filters.
                                </p>

                              </div>

                            </td>

                          </tr>

                        ) : (

                          filteredFeedback.map(
                            (item) => {

                              const feedbackId =
                                item._id ||
                                item.id;

                              const user =
                                item.user ||
                                item.userId ||
                                {};

                              const name =
                                item.name ||
                                user.name ||
                                getUserName(user);

                              const email =
                                item.email ||
                                user.email ||
                                'No email';

                              const status =
                                normalizeFeedbackStatus(
                                  item.status
                                );

                              const statusClasses =
                                getFeedbackStatusClasses(
                                  status
                                );

                              return (

                                <tr
                                  key={feedbackId}
                                  className="
                                    hover:bg-slate-50
                                    dark:hover:bg-dark-bg/40
                                    transition-colors
                                  "
                                >

                                  {/* USER */}

                                  <td className="p-3.5">

                                    <div
                                      className="
                                        max-w-[190px]
                                      "
                                    >

                                      <p
                                        className="
                                          font-semibold
                                          text-slate-900
                                          dark:text-white
                                          truncate
                                        "
                                      >
                                        {name}
                                      </p>

                                      <p
                                        className="
                                          mt-0.5
                                          text-[10px]
                                          text-slate-500
                                          dark:text-slate-400
                                          truncate
                                        "
                                      >
                                        {email}
                                      </p>

                                    </div>

                                  </td>


                                  {/* FEEDBACK */}

                                  <td className="p-3.5">

                                    <div
                                      className="
                                        max-w-[330px]
                                      "
                                    >

                                      <p
                                        className="
                                          font-semibold
                                          text-slate-800
                                          dark:text-slate-200
                                          truncate
                                        "
                                      >
                                        {item.subject ||
                                          'Untitled Feedback'}
                                      </p>

                                      <p
                                        className="
                                          mt-1
                                          text-[10px]
                                          leading-relaxed
                                          text-slate-500
                                          dark:text-slate-400
                                          line-clamp-2
                                        "
                                      >
                                        {item.message ||
                                          'No message provided.'}
                                      </p>

                                    </div>

                                  </td>


                                  {/* CATEGORY */}

                                  <td className="p-3.5">

                                    <span
                                      className="
                                        inline-flex
                                        items-center
                                        px-2
                                        py-1
                                        rounded
                                        text-[10px]
                                        font-semibold
                                        bg-slate-100
                                        dark:bg-slate-700/40
                                        text-slate-600
                                        dark:text-slate-300
                                        border
                                        border-slate-200
                                        dark:border-slate-700/40
                                        whitespace-nowrap
                                      "
                                    >
                                      {getFeedbackCategoryLabel(
                                        item.category
                                      )}
                                    </span>

                                  </td>


                                  {/* RATING */}

                                  <td className="p-3.5">

                                    <div
                                      className="
                                        flex
                                        flex-col
                                        gap-1
                                      "
                                    >

                                      <StarRating
                                        rating={
                                          item.rating
                                        }
                                      />

                                      <span
                                        className="
                                          text-[10px]
                                          text-slate-500
                                          dark:text-slate-400
                                        "
                                      >
                                        {Number(
                                          item.rating
                                        ) || 0}/5
                                      </span>

                                    </div>

                                  </td>


                                  {/* STATUS */}

                                  <td className="p-3.5">

                                    <span
                                      className={`
                                        inline-flex
                                        items-center
                                        gap-1.5
                                        px-2
                                        py-1
                                        rounded
                                        border
                                        text-[10px]
                                        font-bold
                                        uppercase
                                        tracking-wide
                                        ${statusClasses.wrapper}
                                      `}
                                    >

                                      {status ===
                                      'resolved' ? (
                                        <CheckCircle2
                                          className={`
                                            w-3
                                            h-3
                                            ${statusClasses.icon}
                                          `}
                                        />
                                      ) : status ===
                                        'reviewed' ? (
                                        <Eye
                                          className={`
                                            w-3
                                            h-3
                                            ${statusClasses.icon}
                                          `}
                                        />
                                      ) : (
                                        <Clock
                                          className={`
                                            w-3
                                            h-3
                                            ${statusClasses.icon}
                                          `}
                                        />
                                      )}

                                      {getFeedbackStatusLabel(
                                        status
                                      )}

                                    </span>

                                  </td>


                                  {/* DATE */}

                                  <td
                                    className="
                                      p-3.5
                                      whitespace-nowrap
                                      text-slate-500
                                      dark:text-slate-400
                                    "
                                  >
                                    {formatDate(
                                      item.createdAt
                                    )}
                                  </td>


                                  {/* ACTION */}

                                  <td className="p-3.5">

                                    <div
                                      className="
                                        flex
                                        items-center
                                        justify-end
                                        gap-2
                                      "
                                    >

                                      <button
                                        type="button"
                                        onClick={() =>
                                          openFeedback(
                                            item
                                          )
                                        }
                                        className="
                                          inline-flex
                                          items-center
                                          gap-1
                                          px-2.5
                                          py-1.5
                                          rounded
                                          text-[11px]
                                          font-semibold
                                          bg-brand-500/10
                                          text-brand-600
                                          dark:text-brand-400
                                          hover:bg-brand-500/20
                                          transition-colors
                                        "
                                      >

                                        <Eye
                                          className="
                                            w-3
                                            h-3
                                          "
                                        />

                                        View

                                      </button>


                                      <button
                                        type="button"
                                        onClick={() =>
                                          setDeletingFeedback(
                                            item
                                          )
                                        }
                                        className="
                                          inline-flex
                                          items-center
                                          gap-1
                                          px-2.5
                                          py-1.5
                                          rounded
                                          text-[11px]
                                          font-semibold
                                          bg-red-500/10
                                          text-red-600
                                          dark:text-red-400
                                          hover:bg-red-500/20
                                          transition-colors
                                        "
                                      >

                                        <Trash2
                                          className="
                                            w-3
                                            h-3
                                          "
                                        />

                                        Delete

                                      </button>

                                    </div>

                                  </td>

                                </tr>
                              );
                            }
                          )
                        )}

                      </tbody>

                    </table>

                  </div>

                </div>
              )}

            </>

          )}

        </div>


        {/* ======================================================
            EDIT USER MODAL
        ====================================================== */}

        {editingUser && (
          <div
            className="
              fixed
              inset-0
              z-[100]
              flex
              items-center
              justify-center
              p-4
            "
          >

            <div
              className="
                absolute
                inset-0
                bg-slate-950/50
                dark:bg-black/70
                backdrop-blur-sm
              "
              onClick={() => {
                if (!savingUser) {
                  setEditingUser(null);
                }
              }}
            />


            <div
              className="
                relative
                w-full
                max-w-lg
                max-h-[90vh]
                overflow-y-auto
                bg-white
                dark:bg-dark-card
                border
                border-slate-200
                dark:border-dark-border
                rounded-2xl
                shadow-2xl
              "
            >

              <div
                className="
                  sticky
                  top-0
                  z-10
                  flex
                  items-center
                  justify-between
                  px-6
                  py-4
                  border-b
                  border-slate-200
                  dark:border-dark-border
                  bg-white
                  dark:bg-dark-card
                "
              >

                <div
                  className="
                    flex
                    items-center
                    gap-3
                  "
                >

                  <div
                    className="
                      p-2
                      rounded-lg
                      bg-brand-500/10
                      text-brand-600
                      dark:text-brand-400
                    "
                  >
                    <Edit3 className="w-5 h-5" />
                  </div>

                  <div>

                    <h2
                      className="
                        text-base
                        font-bold
                        text-slate-900
                        dark:text-white
                      "
                    >
                      Edit User Account
                    </h2>

                    <p
                      className="
                        text-[11px]
                        text-slate-500
                        dark:text-slate-400
                        mt-0.5
                      "
                    >
                      Update the registered user's account details.
                    </p>

                  </div>

                </div>


                <button
                  type="button"
                  disabled={savingUser}
                  onClick={() =>
                    setEditingUser(null)
                  }
                  className="
                    p-2
                    rounded-lg
                    text-slate-400
                    hover:text-slate-900
                    dark:hover:text-white
                    hover:bg-slate-100
                    dark:hover:bg-dark-bg
                    transition-colors
                    disabled:opacity-50
                  "
                >
                  <X className="w-4 h-4" />
                </button>

              </div>


              <form
                onSubmit={handleSaveUser}
                className="p-6 space-y-5"
              >

                <div>

                  <label
                    htmlFor="edit-user-name"
                    className="
                      block
                      text-xs
                      font-semibold
                      text-slate-700
                      dark:text-slate-300
                      mb-2
                    "
                  >
                    Full Name
                  </label>

                  <input
                    id="edit-user-name"
                    name="name"
                    type="text"
                    value={editForm.name}
                    onChange={handleEditChange}
                    disabled={savingUser}
                    placeholder="Enter full name"
                    className={`
                      w-full
                      px-3.5
                      py-2.5
                      rounded-lg
                      text-sm
                      focus:outline-none
                      focus:border-brand-500
                      transition-colors
                      disabled:opacity-50
                      ${inputClass}
                    `}
                  />

                </div>


                <div>

                  <label
                    htmlFor="edit-user-email"
                    className="
                      block
                      text-xs
                      font-semibold
                      text-slate-700
                      dark:text-slate-300
                      mb-2
                    "
                  >
                    Email Address
                  </label>

                  <input
                    id="edit-user-email"
                    name="email"
                    type="email"
                    value={editForm.email}
                    onChange={handleEditChange}
                    disabled={savingUser}
                    placeholder="user@example.com"
                    className={`
                      w-full
                      px-3.5
                      py-2.5
                      rounded-lg
                      text-sm
                      focus:outline-none
                      focus:border-brand-500
                      transition-colors
                      disabled:opacity-50
                      ${inputClass}
                    `}
                  />

                </div>


                <div
                  className="
                    grid
                    grid-cols-1
                    sm:grid-cols-2
                    gap-4
                  "
                >

                  <div>

                    <label
                      htmlFor="edit-user-role"
                      className="
                        block
                        text-xs
                        font-semibold
                        text-slate-700
                        dark:text-slate-300
                        mb-2
                      "
                    >
                      Account Role
                    </label>

                    <select
                      id="edit-user-role"
                      name="role"
                      value={editForm.role}
                      onChange={handleEditChange}
                      disabled={savingUser}
                      className={`
                        w-full
                        px-3.5
                        py-2.5
                        rounded-lg
                        text-sm
                        focus:outline-none
                        focus:border-brand-500
                        transition-colors
                        disabled:opacity-50
                        ${inputClass}
                      `}
                    >

                      <option value="user">
                        User
                      </option>

                      <option value="superadmin">
                        Super Admin
                      </option>

                    </select>

                  </div>


                  <div>

                    <label
                      htmlFor="edit-user-status"
                      className="
                        block
                        text-xs
                        font-semibold
                        text-slate-700
                        dark:text-slate-300
                        mb-2
                      "
                    >
                      Account Status
                    </label>

                    <select
                      id="edit-user-status"
                      name="accountStatus"
                      value={
                        editForm.accountStatus
                      }
                      onChange={handleEditChange}
                      disabled={savingUser}
                      className={`
                        w-full
                        px-3.5
                        py-2.5
                        rounded-lg
                        text-sm
                        focus:outline-none
                        focus:border-brand-500
                        transition-colors
                        disabled:opacity-50
                        ${inputClass}
                      `}
                    >

                      <option value="active">
                        Active
                      </option>

                      <option value="suspended">
                        Suspended
                      </option>

                      <option value="banned">
                        Banned
                      </option>

                    </select>

                  </div>

                </div>


                <div
                  className="
                    flex
                    gap-3
                    p-3
                    rounded-lg
                    bg-amber-500/5
                    border
                    border-amber-500/10
                  "
                >

                  <AlertTriangle
                    className="
                      w-4
                      h-4
                      text-amber-500
                      dark:text-amber-400
                      flex-shrink-0
                      mt-0.5
                    "
                  />

                  <p
                    className="
                      text-[11px]
                      leading-relaxed
                      text-slate-500
                      dark:text-slate-400
                    "
                  >
                    Changes made here are applied directly to the registered account in the database.
                  </p>

                </div>


                <div
                  className="
                    flex
                    items-center
                    justify-end
                    gap-3
                    pt-2
                  "
                >

                  <button
                    type="button"
                    disabled={savingUser}
                    onClick={() =>
                      setEditingUser(null)
                    }
                    className="
                      px-4
                      py-2.5
                      rounded-lg
                      text-xs
                      font-semibold
                      text-slate-600
                      dark:text-slate-300
                      bg-slate-50
                      dark:bg-dark-bg
                      border
                      border-slate-200
                      dark:border-dark-border
                      hover:text-slate-900
                      dark:hover:text-white
                      hover:border-slate-400
                      dark:hover:border-slate-600
                      transition-colors
                      disabled:opacity-50
                    "
                  >
                    Cancel
                  </button>


                  <button
                    type="submit"
                    disabled={savingUser}
                    className="
                      inline-flex
                      items-center
                      gap-2
                      px-4
                      py-2.5
                      rounded-lg
                      bg-brand-600
                      hover:bg-brand-500
                      text-white
                      text-xs
                      font-bold
                      transition-colors
                      disabled:opacity-50
                      disabled:cursor-not-allowed
                    "
                  >

                    {savingUser ? (
                      <>
                        <Loader2
                          className="
                            w-3.5
                            h-3.5
                            animate-spin
                          "
                        />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="w-3.5 h-3.5" />
                        Save Changes
                      </>
                    )}

                  </button>

                </div>

              </form>

            </div>

          </div>
        )}


        {/* ======================================================
            DELETE USER MODAL
        ====================================================== */}

        {deletingUser && (
          <div
            className="
              fixed
              inset-0
              z-[110]
              flex
              items-center
              justify-center
              p-4
            "
          >

            <div
              className="
                absolute
                inset-0
                bg-slate-950/50
                dark:bg-black/75
                backdrop-blur-sm
              "
              onClick={() => {
                if (!deleting) {
                  setDeletingUser(null);
                }
              }}
            />


            <div
              className="
                relative
                w-full
                max-w-md
                bg-white
                dark:bg-dark-card
                border
                border-red-200
                dark:border-red-500/20
                rounded-2xl
                shadow-2xl
                overflow-hidden
              "
            >

              <div className="p-6">

                <div
                  className="
                    flex
                    items-start
                    gap-4
                  "
                >

                  <div
                    className="
                      p-3
                      rounded-xl
                      bg-red-500/10
                      text-red-500
                      dark:text-red-400
                    "
                  >
                    <Trash2 className="w-6 h-6" />
                  </div>

                  <div className="flex-1">

                    <h2
                      className="
                        text-base
                        font-bold
                        text-slate-900
                        dark:text-white
                      "
                    >
                      Delete User Account?
                    </h2>

                    <p
                      className="
                        text-xs
                        text-slate-500
                        dark:text-slate-400
                        mt-2
                        leading-relaxed
                      "
                    >
                      You are about to permanently delete this registered account from the EAZY CHECK database.
                    </p>

                  </div>

                </div>


                <div
                  className="
                    mt-5
                    p-4
                    rounded-lg
                    bg-slate-50
                    dark:bg-dark-bg
                    border
                    border-slate-200
                    dark:border-dark-border
                  "
                >

                  <div
                    className="
                      flex
                      items-center
                      gap-3
                    "
                  >

                    <div
                      className="
                        w-9
                        h-9
                        rounded-full
                        bg-brand-500/10
                        border
                        border-brand-500/20
                        flex
                        items-center
                        justify-center
                      "
                    >
                      <UserCog
                        className="
                          w-4
                          h-4
                          text-brand-500
                          dark:text-brand-400
                        "
                      />
                    </div>

                    <div className="min-w-0">

                      <p
                        className="
                          text-sm
                          font-semibold
                          text-slate-900
                          dark:text-white
                          truncate
                        "
                      >
                        {getUserName(
                          deletingUser
                        )}
                      </p>

                      <p
                        className="
                          text-[11px]
                          text-slate-500
                          dark:text-slate-400
                          truncate
                        "
                      >
                        {deletingUser.email ||
                          'No email'}
                      </p>

                    </div>

                  </div>

                </div>


                <div
                  className="
                    flex
                    gap-3
                    mt-4
                    p-3
                    rounded-lg
                    bg-red-500/5
                    border
                    border-red-500/10
                  "
                >

                  <AlertTriangle
                    className="
                      w-4
                      h-4
                      text-red-500
                      dark:text-red-400
                      flex-shrink-0
                      mt-0.5
                    "
                  />

                  <p
                    className="
                      text-[11px]
                      leading-relaxed
                      text-red-600/80
                      dark:text-red-300/80
                    "
                  >
                    This action cannot be undone. The user account will be permanently removed.
                  </p>

                </div>

              </div>


              <div
                className="
                  flex
                  items-center
                  justify-end
                  gap-3
                  px-6
                  py-4
                  bg-slate-50
                  dark:bg-dark-bg/40
                  border-t
                  border-slate-200
                  dark:border-dark-border
                "
              >

                <button
                  type="button"
                  disabled={deleting}
                  onClick={() =>
                    setDeletingUser(null)
                  }
                  className="
                    px-4
                    py-2.5
                    rounded-lg
                    text-xs
                    font-semibold
                    text-slate-600
                    dark:text-slate-300
                    bg-white
                    dark:bg-dark-bg
                    border
                    border-slate-200
                    dark:border-dark-border
                    hover:text-slate-900
                    dark:hover:text-white
                    hover:border-slate-400
                    dark:hover:border-slate-600
                    transition-colors
                    disabled:opacity-50
                  "
                >
                  Cancel
                </button>


                <button
                  type="button"
                  disabled={deleting}
                  onClick={confirmDeleteUser}
                  className="
                    inline-flex
                    items-center
                    gap-2
                    px-4
                    py-2.5
                    rounded-lg
                    bg-red-600
                    hover:bg-red-500
                    text-white
                    text-xs
                    font-bold
                    transition-colors
                    disabled:opacity-50
                    disabled:cursor-not-allowed
                  "
                >

                  {deleting ? (
                    <>
                      <Loader2
                        className="
                          w-3.5
                          h-3.5
                          animate-spin
                        "
                      />
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-3.5 h-3.5" />
                      Delete Permanently
                    </>
                  )}

                </button>

              </div>

            </div>

          </div>
        )}


        {/* ======================================================
            FEEDBACK DETAIL MODAL
        ====================================================== */}

        {selectedFeedback && (
          <div
            className="
              fixed
              inset-0
              z-[120]
              flex
              items-center
              justify-center
              p-4
            "
          >

            <div
              className="
                absolute
                inset-0
                bg-slate-950/60
                dark:bg-black/80
                backdrop-blur-sm
              "
              onClick={() => {
                if (!feedbackDetailLoading) {
                  setSelectedFeedback(null);
                }
              }}
            />


            <div
              className="
                relative
                w-full
                max-w-2xl
                max-h-[92vh]
                overflow-y-auto
                bg-white
                dark:bg-dark-card
                border
                border-slate-200
                dark:border-dark-border
                rounded-2xl
                shadow-2xl
              "
            >

              {/* HEADER */}

              <div
                className="
                  sticky
                  top-0
                  z-10
                  flex
                  items-center
                  justify-between
                  gap-4
                  px-5
                  sm:px-6
                  py-4
                  bg-white
                  dark:bg-dark-card
                  border-b
                  border-slate-200
                  dark:border-dark-border
                "
              >

                <div
                  className="
                    flex
                    items-center
                    gap-3
                    min-w-0
                  "
                >

                  <div
                    className="
                      w-10
                      h-10
                      rounded-xl
                      bg-brand-500/10
                      text-brand-600
                      dark:text-brand-400
                      flex
                      items-center
                      justify-center
                      shrink-0
                    "
                  >
                    <MessageSquare className="w-5 h-5" />
                  </div>

                  <div className="min-w-0">

                    <h2
                      className="
                        text-base
                        font-bold
                        text-slate-900
                        dark:text-white
                        truncate
                      "
                    >
                      Feedback Details
                    </h2>

                    <p
                      className="
                        text-[11px]
                        text-slate-500
                        dark:text-slate-400
                        mt-0.5
                      "
                    >
                      Review and manage this user submission.
                    </p>

                  </div>

                </div>


                <button
                  type="button"
                  onClick={() =>
                    setSelectedFeedback(null)
                  }
                  className="
                    p-2
                    rounded-lg
                    text-slate-400
                    hover:text-slate-900
                    dark:hover:text-white
                    hover:bg-slate-100
                    dark:hover:bg-dark-bg
                    transition-colors
                  "
                >
                  <X className="w-4 h-4" />
                </button>

              </div>


              {/* CONTENT */}

              <div className="p-5 sm:p-6 space-y-5">

                {/* USER */}

                <div
                  className="
                    flex
                    flex-col
                    sm:flex-row
                    sm:items-center
                    sm:justify-between
                    gap-4
                    p-4
                    rounded-xl
                    bg-slate-50
                    dark:bg-dark-bg/60
                    border
                    border-slate-200
                    dark:border-dark-border
                  "
                >

                  <div
                    className="
                      flex
                      items-center
                      gap-3
                      min-w-0
                    "
                  >

                    <div
                      className="
                        w-10
                        h-10
                        rounded-full
                        bg-brand-500/10
                        border
                        border-brand-500/20
                        flex
                        items-center
                        justify-center
                        shrink-0
                      "
                    >
                      <UserCog
                        className="
                          w-5
                          h-5
                          text-brand-500
                          dark:text-brand-400
                        "
                      />
                    </div>

                    <div className="min-w-0">

                      <p
                        className="
                          text-sm
                          font-semibold
                          text-slate-900
                          dark:text-white
                          truncate
                        "
                      >
                        {selectedFeedback.name ||
                          selectedFeedback.user?.name ||
                          getUserName(
                            selectedFeedback.user ||
                            selectedFeedback.userId
                          )}
                      </p>

                      <p
                        className="
                          text-[11px]
                          text-slate-500
                          dark:text-slate-400
                          truncate
                        "
                      >
                        {selectedFeedback.email ||
                          selectedFeedback.user?.email ||
                          selectedFeedback.userId?.email ||
                          'No email'}
                      </p>

                    </div>

                  </div>


                  <div
                    className="
                      text-left
                      sm:text-right
                    "
                  >

                    <p
                      className="
                        text-[10px]
                        text-slate-400
                        dark:text-slate-500
                      "
                    >
                      Submitted
                    </p>

                    <p
                      className="
                        mt-0.5
                        text-xs
                        font-medium
                        text-slate-700
                        dark:text-slate-300
                      "
                    >
                      {formatDate(
                        selectedFeedback.createdAt
                      )}
                    </p>

                  </div>

                </div>


                {/* SUBJECT */}

                <div>

                  <div
                    className="
                      flex
                      flex-wrap
                      items-center
                      gap-2
                      mb-3
                    "
                  >

                    <span
                      className="
                        inline-flex
                        items-center
                        px-2
                        py-1
                        rounded
                        text-[10px]
                        font-bold
                        uppercase
                        tracking-wide
                        bg-brand-500/10
                        text-brand-600
                        dark:text-brand-400
                        border
                        border-brand-500/20
                      "
                    >
                      {getFeedbackCategoryLabel(
                        selectedFeedback.category
                      )}
                    </span>

                    <span
                      className={`
                        inline-flex
                        items-center
                        gap-1
                        px-2
                        py-1
                        rounded
                        text-[10px]
                        font-bold
                        uppercase
                        tracking-wide
                        border
                        ${
                          getFeedbackStatusClasses(
                            selectedFeedback.status
                          ).wrapper
                        }
                      `}
                    >
                      {getFeedbackStatusLabel(
                        selectedFeedback.status
                      )}
                    </span>

                  </div>


                  <h3
                    className="
                      text-lg
                      font-bold
                      text-slate-900
                      dark:text-white
                    "
                  >
                    {selectedFeedback.subject ||
                      'Untitled Feedback'}
                  </h3>

                  <div
                    className="
                      mt-2
                      flex
                      items-center
                      gap-2
                    "
                  >

                    <StarRating
                      rating={
                        selectedFeedback.rating
                      }
                      size="w-4 h-4"
                    />

                    <span
                      className="
                        text-xs
                        font-semibold
                        text-slate-600
                        dark:text-slate-300
                      "
                    >
                      {Number(
                        selectedFeedback.rating
                      ) || 0}/5
                    </span>

                  </div>

                </div>


                {/* MESSAGE */}

                <div>

                  <p
                    className="
                      text-[10px]
                      font-bold
                      uppercase
                      tracking-wide
                      text-slate-500
                      dark:text-slate-400
                      mb-2
                    "
                  >
                    User Message
                  </p>

                  <div
                    className="
                      p-4
                      rounded-xl
                      bg-slate-50
                      dark:bg-dark-bg/50
                      border
                      border-slate-200
                      dark:border-dark-border
                    "
                  >

                    <p
                      className="
                        text-sm
                        leading-7
                        text-slate-700
                        dark:text-slate-300
                        whitespace-pre-wrap
                        break-words
                      "
                    >
                      {selectedFeedback.message ||
                        'No message provided.'}
                    </p>

                  </div>

                </div>


                {/* SUGGESTION */}

                {selectedFeedback.suggestion && (
                  <div>

                    <p
                      className="
                        text-[10px]
                        font-bold
                        uppercase
                        tracking-wide
                        text-slate-500
                        dark:text-slate-400
                        mb-2
                      "
                    >
                      User Suggestion
                    </p>

                    <div
                      className="
                        p-4
                        rounded-xl
                        bg-brand-500/5
                        border
                        border-brand-500/10
                      "
                    >

                      <p
                        className="
                          text-sm
                          leading-6
                          text-slate-700
                          dark:text-slate-300
                          whitespace-pre-wrap
                          break-words
                        "
                      >
                        {selectedFeedback.suggestion}
                      </p>

                    </div>

                  </div>
                )}


                {/* ADMIN NOTE */}

                <div>

                  <div
                    className="
                      flex
                      items-center
                      justify-between
                      gap-3
                      mb-2
                    "
                  >

                    <p
                      className="
                        text-[10px]
                        font-bold
                        uppercase
                        tracking-wide
                        text-slate-500
                        dark:text-slate-400
                      "
                    >
                      Admin Note
                    </p>

                    <span
                      className="
                        text-[10px]
                        text-slate-400
                        dark:text-slate-500
                      "
                    >
                      Internal only
                    </span>

                  </div>

                  <textarea
                    value={feedbackNote}
                    onChange={(event) =>
                      setFeedbackNote(
                        event.target.value
                      )
                    }
                    maxLength={2000}
                    rows={4}
                    placeholder="Add an internal note about this feedback..."
                    className={`
                      w-full
                      px-3.5
                      py-3
                      rounded-xl
                      text-sm
                      resize-none
                      focus:outline-none
                      focus:border-brand-500
                      transition-colors
                      ${inputClass}
                    `}
                  />

                  <div
                    className="
                      flex
                      justify-end
                      mt-1
                    "
                  >
                    <span
                      className="
                        text-[10px]
                        text-slate-400
                        dark:text-slate-500
                      "
                    >
                      {feedbackNote.length}/2000
                    </span>
                  </div>

                </div>


                {/* REVIEW INFORMATION */}

                {(selectedFeedback.reviewedAt ||
                  selectedFeedback.resolvedAt) && (
                  <div
                    className="
                      grid
                      grid-cols-1
                      sm:grid-cols-2
                      gap-3
                    "
                  >

                    {selectedFeedback.reviewedAt && (
                      <div
                        className="
                          p-3
                          rounded-lg
                          bg-blue-500/5
                          border
                          border-blue-500/10
                        "
                      >

                        <p
                          className="
                            text-[10px]
                            font-bold
                            uppercase
                            text-blue-600
                            dark:text-blue-400
                          "
                        >
                          Reviewed
                        </p>

                        <p
                          className="
                            mt-1
                            text-xs
                            text-slate-600
                            dark:text-slate-300
                          "
                        >
                          {formatDate(
                            selectedFeedback.reviewedAt
                          )}
                        </p>

                      </div>
                    )}


                    {selectedFeedback.resolvedAt && (
                      <div
                        className="
                          p-3
                          rounded-lg
                          bg-emerald-500/5
                          border
                          border-emerald-500/10
                        "
                      >

                        <p
                          className="
                            text-[10px]
                            font-bold
                            uppercase
                            text-emerald-600
                            dark:text-emerald-400
                          "
                        >
                          Resolved
                        </p>

                        <p
                          className="
                            mt-1
                            text-xs
                            text-slate-600
                            dark:text-slate-300
                          "
                        >
                          {formatDate(
                            selectedFeedback.resolvedAt
                          )}
                        </p>

                      </div>
                    )}

                  </div>
                )}

              </div>


              {/* FOOTER ACTIONS */}

              <div
                className="
                  sticky
                  bottom-0
                  flex
                  flex-col-reverse
                  sm:flex-row
                  sm:items-center
                  sm:justify-between
                  gap-3
                  px-5
                  sm:px-6
                  py-4
                  bg-slate-50
                  dark:bg-dark-bg/70
                  border-t
                  border-slate-200
                  dark:border-dark-border
                "
              >

                <button
                  type="button"
                  onClick={() =>
                    setSelectedFeedback(null)
                  }
                  className="
                    px-4
                    py-2.5
                    rounded-lg
                    text-xs
                    font-semibold
                    text-slate-600
                    dark:text-slate-300
                    bg-white
                    dark:bg-dark-bg
                    border
                    border-slate-200
                    dark:border-dark-border
                    hover:text-slate-900
                    dark:hover:text-white
                    transition-colors
                  "
                >
                  Close
                </button>


                <div
                  className="
                    flex
                    flex-wrap
                    items-center
                    justify-end
                    gap-2
                  "
                >

                  {/* SAVE NOTE */}

                  <button
                    type="button"
                    onClick={saveFeedbackNote}
                    disabled={
                      feedbackActionLoading[
                        `${
                          selectedFeedback._id ||
                          selectedFeedback.id
                        }-${normalizeFeedbackStatus(
                          selectedFeedback.status
                        )}`
                      ]
                    }
                    className="
                      inline-flex
                      items-center
                      gap-2
                      px-3
                      py-2.5
                      rounded-lg
                      text-xs
                      font-semibold
                      text-slate-700
                      dark:text-slate-200
                      bg-white
                      dark:bg-dark-card
                      border
                      border-slate-200
                      dark:border-dark-border
                      hover:border-brand-500/40
                      transition-colors
                      disabled:opacity-50
                    "
                  >

                    <Save className="w-3.5 h-3.5" />

                    Save Note

                  </button>


                  {/* REVIEW */}

                  {normalizeFeedbackStatus(
                    selectedFeedback.status
                  ) !== 'reviewed' &&
                  normalizeFeedbackStatus(
                    selectedFeedback.status
                  ) !== 'resolved' && (
                    <button
                      type="button"
                      onClick={() =>
                        updateFeedbackStatus(
                          selectedFeedback,
                          'reviewed'
                        )
                      }
                      disabled={
                        feedbackActionLoading[
                          `${
                            selectedFeedback._id ||
                            selectedFeedback.id
                          }-reviewed`
                        ]
                      }
                      className="
                        inline-flex
                        items-center
                        gap-2
                        px-3
                        py-2.5
                        rounded-lg
                        bg-blue-600
                        hover:bg-blue-500
                        text-white
                        text-xs
                        font-bold
                        disabled:opacity-50
                      "
                    >

                      {feedbackActionLoading[
                        `${
                          selectedFeedback._id ||
                          selectedFeedback.id
                        }-reviewed`
                      ] ? (
                        <Loader2
                          className="
                            w-3.5
                            h-3.5
                            animate-spin
                          "
                        />
                      ) : (
                        <Eye className="w-3.5 h-3.5" />
                      )}

                      Mark Reviewed

                    </button>
                  )}


                  {/* RESOLVE */}

                  {normalizeFeedbackStatus(
                    selectedFeedback.status
                  ) !== 'resolved' && (
                    <button
                      type="button"
                      onClick={() =>
                        updateFeedbackStatus(
                          selectedFeedback,
                          'resolved'
                        )
                      }
                      disabled={
                        feedbackActionLoading[
                          `${
                            selectedFeedback._id ||
                            selectedFeedback.id
                          }-resolved`
                        ]
                      }
                      className="
                        inline-flex
                        items-center
                        gap-2
                        px-3
                        py-2.5
                        rounded-lg
                        bg-emerald-600
                        hover:bg-emerald-500
                        text-white
                        text-xs
                        font-bold
                        disabled:opacity-50
                      "
                    >

                      {feedbackActionLoading[
                        `${
                          selectedFeedback._id ||
                          selectedFeedback.id
                        }-resolved`
                      ] ? (
                        <Loader2
                          className="
                            w-3.5
                            h-3.5
                            animate-spin
                          "
                        />
                      ) : (
                        <Check className="w-3.5 h-3.5" />
                      )}

                      Mark Resolved

                    </button>
                  )}

                </div>

              </div>

            </div>

          </div>
        )}


        {/* ======================================================
            DELETE FEEDBACK MODAL
        ====================================================== */}

        {deletingFeedback && (
          <div
            className="
              fixed
              inset-0
              z-[130]
              flex
              items-center
              justify-center
              p-4
            "
          >

            <div
              className="
                absolute
                inset-0
                bg-slate-950/60
                dark:bg-black/80
                backdrop-blur-sm
              "
              onClick={() => {
                if (
                  !deletingFeedbackLoading
                ) {
                  setDeletingFeedback(null);
                }
              }}
            />


            <div
              className="
                relative
                w-full
                max-w-md
                bg-white
                dark:bg-dark-card
                border
                border-red-200
                dark:border-red-500/20
                rounded-2xl
                shadow-2xl
                overflow-hidden
              "
            >

              <div className="p-6">

                <div
                  className="
                    flex
                    items-start
                    gap-4
                  "
                >

                  <div
                    className="
                      p-3
                      rounded-xl
                      bg-red-500/10
                      text-red-500
                      dark:text-red-400
                      shrink-0
                    "
                  >
                    <Trash2 className="w-6 h-6" />
                  </div>

                  <div>

                    <h2
                      className="
                        text-base
                        font-bold
                        text-slate-900
                        dark:text-white
                      "
                    >
                      Delete Feedback?
                    </h2>

                    <p
                      className="
                        mt-2
                        text-xs
                        leading-relaxed
                        text-slate-500
                        dark:text-slate-400
                      "
                    >
                      This will permanently remove the feedback submission from the EAZY CHECK database.
                    </p>

                  </div>

                </div>


                <div
                  className="
                    mt-5
                    p-4
                    rounded-lg
                    bg-slate-50
                    dark:bg-dark-bg
                    border
                    border-slate-200
                    dark:border-dark-border
                  "
                >

                  <p
                    className="
                      text-sm
                      font-semibold
                      text-slate-900
                      dark:text-white
                    "
                  >
                    {deletingFeedback.subject ||
                      'Untitled Feedback'}
                  </p>

                  <p
                    className="
                      mt-1
                      text-[11px]
                      text-slate-500
                      dark:text-slate-400
                      line-clamp-2
                    "
                  >
                    {deletingFeedback.message ||
                      'No message provided.'}
                  </p>

                </div>


                <div
                  className="
                    flex
                    gap-3
                    mt-4
                    p-3
                    rounded-lg
                    bg-red-500/5
                    border
                    border-red-500/10
                  "
                >

                  <AlertTriangle
                    className="
                      w-4
                      h-4
                      text-red-500
                      dark:text-red-400
                      flex-shrink-0
                      mt-0.5
                    "
                  />

                  <p
                    className="
                      text-[11px]
                      leading-relaxed
                      text-red-600/80
                      dark:text-red-300/80
                    "
                  >
                    This action cannot be undone.
                  </p>

                </div>

              </div>


              <div
                className="
                  flex
                  items-center
                  justify-end
                  gap-3
                  px-6
                  py-4
                  bg-slate-50
                  dark:bg-dark-bg/40
                  border-t
                  border-slate-200
                  dark:border-dark-border
                "
              >

                <button
                  type="button"
                  disabled={
                    deletingFeedbackLoading
                  }
                  onClick={() =>
                    setDeletingFeedback(null)
                  }
                  className="
                    px-4
                    py-2.5
                    rounded-lg
                    text-xs
                    font-semibold
                    text-slate-600
                    dark:text-slate-300
                    bg-white
                    dark:bg-dark-bg
                    border
                    border-slate-200
                    dark:border-dark-border
                    hover:text-slate-900
                    dark:hover:text-white
                    transition-colors
                    disabled:opacity-50
                  "
                >
                  Cancel
                </button>


                <button
                  type="button"
                  disabled={
                    deletingFeedbackLoading
                  }
                  onClick={
                    confirmDeleteFeedback
                  }
                  className="
                    inline-flex
                    items-center
                    gap-2
                    px-4
                    py-2.5
                    rounded-lg
                    bg-red-600
                    hover:bg-red-500
                    text-white
                    text-xs
                    font-bold
                    transition-colors
                    disabled:opacity-50
                    disabled:cursor-not-allowed
                  "
                >

                  {deletingFeedbackLoading ? (
                    <>
                      <Loader2
                        className="
                          w-3.5
                          h-3.5
                          animate-spin
                        "
                      />
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2
                        className="w-3.5 h-3.5"
                      />
                      Delete Feedback
                    </>
                  )}

                </button>

              </div>

            </div>

          </div>
        )}

      </div>

    </AppLayout>
  );
};


export default Admin;