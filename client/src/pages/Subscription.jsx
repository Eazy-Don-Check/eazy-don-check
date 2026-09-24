import React, {
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  Link,
  useNavigate,
} from 'react-router-dom';

import {
  Check,
  CreditCard,
  Crown,
  Loader2,
  ShieldCheck,
  Sparkles,
  Zap,
  AlertCircle,
  ArrowRight,
  CalendarDays,
  Image as ImageIcon,
  Receipt,
} from 'lucide-react';

import apiClient from '../utils/apiClient';

import AppLayout from '../components/layout/AppLayout';


const Subscription = () => {

  const navigate =
    useNavigate();

  const [
    plans,
    setPlans,
  ] = useState([]);

  const [
    subscription,
    setSubscription,
  ] = useState(null);

  const [
    quota,
    setQuota,
  ] = useState(null);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    error,
    setError,
  ] = useState('');

  const [
    processingPlan,
    setProcessingPlan,
  ] = useState('');

  const [
    cancelling,
    setCancelling,
  ] = useState(false);


  // ============================================================
  // LOAD SUBSCRIPTION DATA
  // ============================================================

  const loadSubscriptionData = async () => {

    try {

      setLoading(true);
      setError('');

      const [
        plansResponse,
        subscriptionResponse,
        quotaResponse,
      ] = await Promise.all([
        apiClient.get(
          '/subscription/plans'
        ),

        apiClient.get(
          '/subscription/me'
        ),

        apiClient.get(
          '/subscription/quota'
        ),
      ]);


      const plansData =
        plansResponse?.data?.data ||
        plansResponse?.data ||
        {};

      const subscriptionData =
        subscriptionResponse?.data?.data ||
        subscriptionResponse?.data ||
        {};

      const quotaData =
        quotaResponse?.data?.data ||
        quotaResponse?.data ||
        {};


      setPlans(
        Array.isArray(plansData)
          ? plansData
          : plansData.plans || []
      );


      setSubscription(
        subscriptionData.subscription ||
        subscriptionData
      );


      setQuota(
        quotaData.quota ||
        quotaData
      );

    } catch (err) {

      console.error(
        'Subscription loading error:',
        err
      );

      setError(
        err?.response?.data?.message ||
        'Unable to load subscription information.'
      );

    } finally {

      setLoading(false);

    }

  };


  useEffect(() => {

    loadSubscriptionData();

  }, []);


  // ============================================================
  // SUPER ADMIN CHECK
  // ============================================================

  const isUnlimited =
    subscription?.unlimited === true ||
    subscription?.plan === 'unlimited' ||
    quota?.unlimited === true;


  // ============================================================
  // CURRENT PLAN
  // ============================================================

  const currentPlan =
    subscription?.plan?.id ||
    subscription?.plan ||
    quota?.plan ||
    'free';


  // ============================================================
  // FORMAT PLAN NAME
  // ============================================================

  const formatPlanName = (plan) => {

    if (!plan) {
      return 'Free';
    }

    if (
      typeof plan === 'object'
    ) {

      return (
        plan.name ||
        plan.id ||
        'Free'
      );

    }

    return String(plan)
      .charAt(0)
      .toUpperCase() +
      String(plan).slice(1);

  };


  // ============================================================
  // FORMAT NUMBER
  // ============================================================

  const formatNumber = (value) => {

    if (
      value === -1 ||
      value === Infinity
    ) {
      return 'Unlimited';
    }

    return Number(
      value || 0
    ).toLocaleString();

  };


  // ============================================================
  // FORMAT DATE
  // ============================================================

  const formatDate = (date) => {

    if (!date) {
      return 'No expiry';
    }

    const parsed =
      new Date(date);

    if (
      Number.isNaN(
        parsed.getTime()
      )
    ) {
      return 'No expiry';
    }

    return parsed.toLocaleDateString(
      'en-NG',
      {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      }
    );

  };


  // ============================================================
  // PRICE
  // ============================================================

  const formatPrice = (price) => {

    if (
      price === null ||
      price === undefined ||
      Number(price) <= 0
    ) {
      return 'Free';
    }

    return `₦${Number(
      price
    ).toLocaleString(
      'en-NG'
    )}`;

  };


  // ============================================================
  // PLAN COLORS
  // ============================================================

  const getPlanClasses = (
    planId
  ) => {

    if (
      planId === currentPlan
    ) {

      return `
        border-brand-500
        ring-2
        ring-brand-500/20
      `;

    }

    return `
      border-slate-200
      dark:border-dark-border
    `;

  };


  // ============================================================
  // INITIALIZE PAYSTACK PAYMENT
  // ============================================================

  const handleSubscribe = async (
    planId
  ) => {

    if (!planId) {
      return;
    }


    // ----------------------------------------------------------
    // FREE PLAN
    // ----------------------------------------------------------

    if (
      planId === 'free'
    ) {

      try {

        setProcessingPlan(
          planId
        );

        setError('');

        await apiClient.post(
          '/subscription/activate',
          {
            plan: 'free',
          }
        );

        await loadSubscriptionData();

        window.dispatchEvent(
          new Event(
            'subscription:updated'
          )
        );

      } catch (err) {

        console.error(
          'Free plan activation error:',
          err
        );

        setError(
          err?.response?.data?.message ||
          'Unable to activate the Free plan.'
        );

      } finally {

        setProcessingPlan('');

      }

      return;
    }


    // ----------------------------------------------------------
    // PAID PLAN / PAYSTACK
    // ----------------------------------------------------------

    try {

      setProcessingPlan(
        planId
      );

      setError('');


      const response =
        await apiClient.post(
          '/subscription/paystack/initialize',
          {
            plan: planId,
          }
        );


      /*
       * Your backend currently returns:
       *
       * {
       *   success: true,
       *   message: "...",
       *   payment: {
       *     reference,
       *     accessCode,
       *     authorizationUrl,
       *     amount,
       *     amountSubunit,
       *     currency,
       *     plan,
       *     planName
       *   }
       * }
       *
       * Therefore the Paystack checkout URL is:
       *
       * response.data.payment.authorizationUrl
       *
       * We support both the current response and a
       * possible future `data` wrapper.
       */


      const responseBody =
        response?.data || {};


      const data =
        responseBody?.data ||
        responseBody;


      const payment =
        data?.payment ||
        responseBody?.payment ||
        {};


      const authorizationUrl =
        payment?.authorizationUrl ||
        payment?.authorization_url ||
        data?.authorizationUrl ||
        data?.authorization_url;


      /*
       * Log the response when debugging payment
       * initialization. This makes it immediately clear
       * if the backend response structure changes.
       */

      console.log(
        'Paystack initialization response:',
        responseBody
      );


      if (
        !authorizationUrl
      ) {

        console.error(
          '❌ Paystack checkout URL missing. Full response:',
          responseBody
        );

        throw new Error(
          'Paystack initialized the payment, but no checkout URL was returned.'
        );

      }


      console.log(
        '✅ Paystack checkout URL received:',
        authorizationUrl
      );


      /*
       * Redirect directly to Paystack checkout.
       */

      window.location.href =
        authorizationUrl;

    } catch (err) {

      console.error(
        'Paystack initialization error:',
        err
      );

      setError(
        err?.response?.data?.message ||
        err?.message ||
        'Unable to initialize Paystack payment.'
      );

      setProcessingPlan('');

    }

  };


  // ============================================================
  // CANCEL SUBSCRIPTION
  // ============================================================

  const handleCancel = async () => {

    const confirmed =
      window.confirm(
        'Are you sure you want to cancel your subscription? Your current access may remain available until the current subscription period ends.'
      );

    if (!confirmed) {
      return;
    }


    try {

      setCancelling(true);
      setError('');

      await apiClient.post(
        '/subscription/cancel'
      );

      await loadSubscriptionData();

      window.dispatchEvent(
        new Event(
          'subscription:updated'
        )
      );

    } catch (err) {

      console.error(
        'Subscription cancellation error:',
        err
      );

      setError(
        err?.response?.data?.message ||
        'Unable to cancel your subscription.'
      );

    } finally {

      setCancelling(false);

    }

  };


  // ============================================================
  // PAYMENT STATUS
  // ============================================================

  const subscriptionStatus =
    subscription?.status ||
    quota?.subscriptionStatus ||
    'inactive';


  // ============================================================
  // NORMALIZED PLANS
  // ============================================================

  const normalizedPlans =
    useMemo(() => {

      return plans.map(
        (plan) => ({

          ...plan,

          id:
            plan.id ||
            plan.plan ||
            'free',

          name:
            plan.name ||
            formatPlanName(
              plan.id
            ),

          scans:
            plan.scans ??
            plan.scansLimit ??
            0,

          photos:
            plan.photos ??
            plan.photosLimit ??
            0,

          price:
            plan.price ??
            0,

          description:
            plan.description ||
            '',

        })
      );

    }, [
      plans,
      currentPlan,
    ]);


  // ============================================================
  // LOADING
  // ============================================================

  if (loading) {

    return (

      <AppLayout>

        <div
          className="
            min-h-full
            flex
            items-center
            justify-center
            p-6
            bg-slate-50
            dark:bg-dark-bg
          "
        >

          <div
            className="
              flex
              flex-col
              items-center
              gap-3
              text-slate-500
              dark:text-slate-400
            "
          >

            <Loader2
              className="
                w-8
                h-8
                animate-spin
                text-brand-500
              "
            />

            <span className="text-sm">
              Loading subscription...
            </span>

          </div>

        </div>

      </AppLayout>

    );

  }


  // ============================================================
  // RENDER
  // ============================================================

  return (

    <AppLayout>

      <div
        className="
          min-h-full
          bg-slate-50
          dark:bg-dark-bg
          transition-colors
        "
      >

        <div
          className="
            max-w-7xl
            mx-auto
            px-4
            sm:px-6
            lg:px-8
            py-8
          "
        >

          {/* ==================================================
              HEADER
          ================================================== */}

          <div
            className="
              mb-8
              flex
              flex-col
              lg:flex-row
              lg:items-end
              lg:justify-between
              gap-5
            "
          >

            <div>

              <div
                className="
                  flex
                  items-center
                  gap-2
                  text-brand-600
                  dark:text-brand-400
                  text-xs
                  font-bold
                  uppercase
                  tracking-wider
                  mb-2
                "
              >

                <CreditCard
                  className="w-4 h-4"
                />

                Subscription

              </div>


              <h1
                className="
                  text-2xl
                  sm:text-3xl
                  font-black
                  text-slate-900
                  dark:text-white
                  tracking-tight
                "
              >
                Choose the access that fits you
              </h1>


              <p
                className="
                  mt-2
                  text-sm
                  text-slate-500
                  dark:text-slate-400
                  max-w-2xl
                "
              >
                Manage your receipt verification
                and photo enhancement usage from
                one place.
              </p>

            </div>


            <Link
              to="/dashboard"

              className="
                inline-flex
                items-center
                justify-center
                gap-2
                px-4
                py-2.5
                rounded-xl
                border
                border-slate-200
                dark:border-dark-border
                bg-white
                dark:bg-dark-card
                text-sm
                font-semibold
                text-slate-700
                dark:text-slate-200
                hover:border-brand-500/40
                hover:text-brand-600
                dark:hover:text-brand-400
                transition-colors
              "
            >

              Back to Dashboard

              <ArrowRight
                className="w-4 h-4"
              />

            </Link>

          </div>


          {/* ==================================================
              ERROR
          ================================================== */}

          {error && (

            <div
              className="
                mb-6
                flex
                items-start
                gap-3
                p-4
                rounded-xl
                border
                border-red-200
                dark:border-red-500/20
                bg-red-50
                dark:bg-red-500/10
                text-red-700
                dark:text-red-300
              "
            >

              <AlertCircle
                className="
                  w-5
                  h-5
                  shrink-0
                  mt-0.5
                "
              />

              <div>

                <p
                  className="
                    text-sm
                    font-semibold
                  "
                >
                  Subscription error
                </p>

                <p
                  className="
                    text-xs
                    mt-1
                    opacity-90
                  "
                >
                  {error}
                </p>

              </div>

            </div>

          )}


          {/* ==================================================
              SUPER ADMIN UNLIMITED
          ================================================== */}

          {isUnlimited && (

            <div
              className="
                mb-8
                rounded-2xl
                border
                border-brand-500/20
                bg-brand-500/5
                dark:bg-brand-500/10
                p-6
              "
            >

              <div
                className="
                  flex
                  flex-col
                  md:flex-row
                  md:items-center
                  gap-5
                "
              >

                <div
                  className="
                    w-14
                    h-14
                    rounded-2xl
                    bg-brand-500/10
                    flex
                    items-center
                    justify-center
                    text-brand-600
                    dark:text-brand-400
                    shrink-0
                  "
                >

                  <Crown
                    className="w-7 h-7"
                  />

                </div>


                <div className="flex-1">

                  <h2
                    className="
                      text-lg
                      font-black
                      text-slate-900
                      dark:text-white
                    "
                  >
                    Unlimited Super Admin Access
                  </h2>

                  <p
                    className="
                      mt-1
                      text-sm
                      text-slate-500
                      dark:text-slate-400
                    "
                  >
                    Your Super Admin account has
                    unlimited receipt verification and
                    photo enhancement access. No
                    subscription payment is required.
                  </p>

                </div>


                <div
                  className="
                    inline-flex
                    items-center
                    gap-2
                    px-4
                    py-2
                    rounded-xl
                    bg-brand-600
                    text-white
                    text-xs
                    font-bold
                  "
                >

                  <ShieldCheck
                    className="w-4 h-4"
                  />

                  Unlimited

                </div>

              </div>

            </div>

          )}


          {/* ==================================================
              CURRENT SUBSCRIPTION
          ================================================== */}

          {!isUnlimited && (

            <div
              className="
                grid
                grid-cols-1
                md:grid-cols-3
                gap-4
                mb-10
              "
            >

              {/* CURRENT PLAN */}

              <div
                className="
                  rounded-2xl
                  border
                  border-slate-200
                  dark:border-dark-border
                  bg-white
                  dark:bg-dark-card
                  p-5
                "
              >

                <div
                  className="
                    flex
                    items-center
                    gap-2
                    text-xs
                    font-bold
                    text-slate-500
                    dark:text-slate-400
                    uppercase
                    tracking-wider
                  "
                >

                  <CreditCard
                    className="w-4 h-4"
                  />

                  Current Plan

                </div>


                <p
                  className="
                    mt-3
                    text-2xl
                    font-black
                    text-slate-900
                    dark:text-white
                  "
                >
                  {formatPlanName(
                    currentPlan
                  )}
                </p>


                <p
                  className="
                    mt-1
                    text-xs
                    text-slate-500
                    dark:text-slate-400
                  "
                >
                  Status:{' '}

                  <span
                    className="
                      font-semibold
                      capitalize
                    "
                  >
                    {subscriptionStatus}
                  </span>

                </p>

              </div>


              {/* SCAN USAGE */}

              <div
                className="
                  rounded-2xl
                  border
                  border-slate-200
                  dark:border-dark-border
                  bg-white
                  dark:bg-dark-card
                  p-5
                "
              >

                <div
                  className="
                    flex
                    items-center
                    gap-2
                    text-xs
                    font-bold
                    text-slate-500
                    dark:text-slate-400
                    uppercase
                    tracking-wider
                  "
                >

                  <Receipt
                    className="w-4 h-4"
                  />

                  Receipt Scans

                </div>


                <p
                  className="
                    mt-3
                    text-2xl
                    font-black
                    text-slate-900
                    dark:text-white
                  "
                >

                  {formatNumber(
                    quota?.scansUsed
                  )}

                  <span
                    className="
                      text-sm
                      font-medium
                      text-slate-400
                      ml-1
                    "
                  >
                    /
                    {' '}
                    {formatNumber(
                      quota?.maxScans
                    )}
                  </span>

                </p>

              </div>


              {/* PHOTO USAGE */}

              <div
                className="
                  rounded-2xl
                  border
                  border-slate-200
                  dark:border-dark-border
                  bg-white
                  dark:bg-dark-card
                  p-5
                "
              >

                <div
                  className="
                    flex
                    items-center
                    gap-2
                    text-xs
                    font-bold
                    text-slate-500
                    dark:text-slate-400
                    uppercase
                    tracking-wider
                  "
                >

                  <ImageIcon
                    className="w-4 h-4"
                  />

                  Photo Enhancement

                </div>


                <p
                  className="
                    mt-3
                    text-2xl
                    font-black
                    text-slate-900
                    dark:text-white
                  "
                >

                  {formatNumber(
                    quota?.photosUsed
                  )}

                  <span
                    className="
                      text-sm
                      font-medium
                      text-slate-400
                      ml-1
                    "
                  >
                    /
                    {' '}
                    {formatNumber(
                      quota?.maxPhotos
                    )}
                  </span>

                </p>

              </div>

            </div>

          )}


          {/* ==================================================
              PLANS
          ================================================== */}

          {!isUnlimited && (

            <section>

              <div
                className="
                  flex
                  items-center
                  justify-between
                  gap-4
                  mb-5
                "
              >

                <div>

                  <h2
                    className="
                      text-xl
                      font-black
                      text-slate-900
                      dark:text-white
                    "
                  >
                    Subscription Plans
                  </h2>

                  <p
                    className="
                      mt-1
                      text-xs
                      text-slate-500
                      dark:text-slate-400
                    "
                  >
                    Select a plan to increase your
                    monthly usage limits.
                  </p>

                </div>

              </div>


              <div
                className="
                  grid
                  grid-cols-1
                  md:grid-cols-2
                  xl:grid-cols-4
                  gap-5
                "
              >

                {normalizedPlans.map(
                  (plan) => {

                    const isCurrent =
                      plan.id ===
                      currentPlan;

                    const isProcessing =
                      processingPlan ===
                      plan.id;


                    return (

                      <div
                        key={plan.id}

                        className={`
                          relative
                          flex
                          flex-col
                          rounded-2xl
                          border
                          bg-white
                          dark:bg-dark-card
                          p-6
                          transition-all
                          duration-200
                          hover:-translate-y-1
                          hover:shadow-lg

                          ${getPlanClasses(
                            plan.id
                          )}
                        `}
                      >

                        {isCurrent && (

                          <div
                            className="
                              absolute
                              top-4
                              right-4
                              px-2.5
                              py-1
                              rounded-full
                              bg-brand-500/10
                              text-brand-600
                              dark:text-brand-400
                              text-[10px]
                              font-bold
                            "
                          >
                            Current
                          </div>

                        )}


                        <div
                          className="
                            w-11
                            h-11
                            rounded-xl
                            bg-brand-500/10
                            flex
                            items-center
                            justify-center
                            text-brand-600
                            dark:text-brand-400
                            mb-5
                          "
                        >

                          {plan.id === 'business'
                            ? (
                              <Crown
                                className="w-5 h-5"
                              />
                            )
                            : plan.id === 'pro'
                              ? (
                                <Sparkles
                                  className="w-5 h-5"
                                />
                              )
                              : plan.id === 'basic'
                                ? (
                                  <Zap
                                    className="w-5 h-5"
                                  />
                                )
                                : (
                                  <ShieldCheck
                                    className="w-5 h-5"
                                  />
                                )}

                        </div>


                        <h3
                          className="
                            text-lg
                            font-black
                            text-slate-900
                            dark:text-white
                          "
                        >
                          {plan.name}
                        </h3>


                        <p
                          className="
                            mt-2
                            min-h-[40px]
                            text-xs
                            leading-5
                            text-slate-500
                            dark:text-slate-400
                          "
                        >
                          {plan.description}
                        </p>


                        <div className="mt-5">

                          <span
                            className="
                              text-2xl
                              font-black
                              text-slate-900
                              dark:text-white
                            "
                          >
                            {formatPrice(
                              plan.price
                            )}
                          </span>


                          {plan.durationDays && (

                            <span
                              className="
                                ml-1
                                text-xs
                                text-slate-400
                              "
                            >
                              / {plan.durationDays} days
                            </span>

                          )}

                        </div>


                        <div
                          className="
                            mt-6
                            space-y-3
                            flex-1
                          "
                        >

                          <div
                            className="
                              flex
                              items-center
                              gap-2
                              text-xs
                              text-slate-600
                              dark:text-slate-300
                            "
                          >

                            <Check
                              className="
                                w-4
                                h-4
                                text-emerald-500
                                shrink-0
                              "
                            />

                            <span>
                              {formatNumber(
                                plan.scans
                              )}{' '}
                              receipt scans
                            </span>

                          </div>


                          <div
                            className="
                              flex
                              items-center
                              gap-2
                              text-xs
                              text-slate-600
                              dark:text-slate-300
                            "
                          >

                            <Check
                              className="
                                w-4
                                h-4
                                text-emerald-500
                                shrink-0
                              "
                            />

                            <span>
                              {formatNumber(
                                plan.photos
                              )}{' '}
                              photo enhancements
                            </span>

                          </div>

                        </div>


                        <button
                          type="button"

                          disabled={
                            isCurrent ||
                            isProcessing
                          }

                          onClick={() =>
                            handleSubscribe(
                              plan.id
                            )
                          }

                          className={` 
                            mt-6
                            w-full
                            inline-flex
                            items-center
                            justify-center
                            gap-2
                            px-4
                            py-3
                            rounded-xl
                            text-xs
                            font-bold
                            transition-all

                            ${
                              isCurrent

                                ? 'bg-slate-100 dark:bg-dark-bg text-slate-400 cursor-not-allowed'

                                : 'bg-brand-600 hover:bg-brand-700 text-white shadow-sm hover:shadow-md disabled:opacity-60'
                            }
                          `}
                        >

                          {isProcessing ? (

                            <>

                              <Loader2
                                className="
                                  w-4
                                  h-4
                                  animate-spin
                                "
                              />

                              Processing...

                            </>

                          ) : isCurrent ? (

                            'Current Plan'

                          ) : plan.id === 'free' ? (

                            'Use Free Plan'

                          ) : (

                            <>

                              Subscribe with Paystack

                              <ArrowRight
                                className="w-4 h-4"
                              />

                            </>

                          )}

                        </button>

                      </div>

                    );

                  }
                )}

              </div>

            </section>

          )}


          {/* ==================================================
              SUBSCRIPTION DETAILS / CANCEL
          ================================================== */}

          {!isUnlimited &&
            subscription &&
            currentPlan !== 'free' && (

              <div
                className="
                  mt-8
                  rounded-2xl
                  border
                  border-slate-200
                  dark:border-dark-border
                  bg-white
                  dark:bg-dark-card
                  p-6
                "
              >

                <div
                  className="
                    flex
                    flex-col
                    md:flex-row
                    md:items-center
                    md:justify-between
                    gap-5
                  "
                >

                  <div>

                    <h3
                      className="
                        text-sm
                        font-black
                        text-slate-900
                        dark:text-white
                      "
                    >
                      Subscription Details
                    </h3>


                    <div
                      className="
                        mt-3
                        flex
                        flex-wrap
                        gap-x-6
                        gap-y-2
                        text-xs
                        text-slate-500
                        dark:text-slate-400
                      "
                    >

                      <span
                        className="
                          inline-flex
                          items-center
                          gap-1.5
                        "
                      >

                        <CalendarDays
                          className="w-3.5 h-3.5"
                        />

                        Expires:{' '}

                        {formatDate(
                          subscription.expiresAt
                        )}

                      </span>


                      <span>

                        Status:{' '}

                        <strong
                          className="
                            text-slate-700
                            dark:text-slate-200
                            capitalize
                          "
                        >
                          {subscriptionStatus}
                        </strong>

                      </span>

                    </div>

                  </div>


                  {subscriptionStatus ===
                    'active' && (

                    <button
                      type="button"

                      disabled={cancelling}

                      onClick={
                        handleCancel
                      }

                      className="
                        inline-flex
                        items-center
                        justify-center
                        gap-2
                        px-4
                        py-2.5
                        rounded-xl
                        border
                        border-red-200
                        dark:border-red-500/20
                        text-red-600
                        dark:text-red-400
                        hover:bg-red-500/10
                        text-xs
                        font-bold
                        transition-colors
                        disabled:opacity-60
                      "
                    >

                      {cancelling && (

                        <Loader2
                          className="
                            w-4
                            h-4
                            animate-spin
                          "
                        />

                      )}

                      Cancel Subscription

                    </button>

                  )}

                </div>

              </div>

            )}


          {/* ==================================================
              PAYMENT NOTE
          ================================================== */}

          <div
            className="
              mt-8
              text-center
              text-[11px]
              text-slate-400
              dark:text-slate-500
            "
          >

            Payments are securely processed through
            Paystack. EAZY DON CHECK does not store
            your card details.

          </div>

        </div>

      </div>

    </AppLayout>

  );

};


export default Subscription;