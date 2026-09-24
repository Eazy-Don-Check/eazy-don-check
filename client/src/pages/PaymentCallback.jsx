import React, {
  useEffect,
  useState,
} from 'react';

import {
  useNavigate,
  useSearchParams,
} from 'react-router-dom';

import {
  CheckCircle2,
  XCircle,
  Loader2,
  ArrowRight,
  CreditCard,
  Clock3,
} from 'lucide-react';

import apiClient from '../utils/apiClient';

import AppLayout from '../components/layout/AppLayout';


const PaymentCallback = () => {

  const navigate =
    useNavigate();

  const [
    searchParams,
  ] = useSearchParams();

  const [
    status,
    setStatus,
  ] = useState('verifying');

  const [
    message,
    setMessage,
  ] = useState(
    'Verifying your Paystack payment...'
  );

  const [
    transaction,
    setTransaction,
  ] = useState(null);


  useEffect(() => {

    let cancelled = false;


    const verifyPayment = async () => {

      const reference =
        searchParams.get(
          'reference'
        ) ||
        searchParams.get(
          'trxref'
        );


      if (!reference) {

        if (!cancelled) {

          setStatus('failed');

          setMessage(
            'No Paystack transaction reference was found.'
          );

        }

        return;

      }


      try {

        const response =
          await apiClient.get(
            `/subscription/paystack/verify/${encodeURIComponent(
              reference
            )}`
          );


        const data =
          response?.data?.data ||
          response?.data ||
          {};


        if (cancelled) {
          return;
        }


        /*
         * The backend returns:
         *
         * paid: true
         *     Payment is confirmed and the subscription
         *     has been fulfilled.
         *
         * paid: false
         *     The HTTP request itself succeeded, but the
         *     Paystack transaction has NOT been confirmed
         *     as successfully paid.
         *
         * IMPORTANT:
         * A HTTP 200 response does NOT automatically mean
         * the payment was successful.
         */

        const paid =
          data?.paid === true;

        const paystackStatus =
          String(
            data?.status ||
            data?.transaction?.status ||
            ''
          ).toLowerCase();


        setTransaction(
          data?.transaction ||
          null
        );


        // ========================================================
        // CONFIRMED SUCCESS
        // ========================================================

        if (paid) {

          setStatus(
            'success'
          );

          setMessage(
            data?.message ||
            'Your payment has been confirmed and your subscription has been activated.'
          );


          /*
           * Only notify the application after the backend
           * has confirmed the payment and fulfilled the
           * subscription.
           */
          window.dispatchEvent(
            new Event(
              'subscription:updated'
            )
          );


          return;

        }


        // ========================================================
        // PAYMENT STILL PROCESSING
        // ========================================================

        const pendingStatuses = [
          'pending',
          'processing',
          'ongoing',
          'queued',
        ];


        if (
          pendingStatuses.includes(
            paystackStatus
          )
        ) {

          setStatus(
            'pending'
          );

          setMessage(
            data?.message ||
            `Your payment is still being processed. Paystack currently reports the transaction as "${paystackStatus}". Please check your subscription again shortly.`
          );


          return;

        }


        // ========================================================
        // PAYMENT NOT COMPLETED
        // ========================================================

        setStatus(
          'failed'
        );

        setMessage(
          data?.message ||
          (
            paystackStatus
              ? `Your payment was not completed. Paystack transaction status: ${paystackStatus}.`
              : 'Your payment could not be confirmed. Please check your transaction or try again.'
          )
        );

      } catch (error) {

        if (cancelled) {
          return;
        }


        console.error(
          'Payment verification failed:',
          error
        );


        setStatus(
          'failed'
        );

        setMessage(
          error?.response?.data?.message ||
          'We could not verify this payment. Please contact support if money was deducted from your account.'
        );

      }

    };


    verifyPayment();


    return () => {
      cancelled = true;
    };

  }, [
    searchParams,
  ]);


  // ============================================================
  // RENDER
  // ============================================================

  return (

    <AppLayout>

      <div
        className="
          min-h-full
          flex
          items-center
          justify-center
          bg-slate-50
          dark:bg-dark-bg
          px-4
          py-12
        "
      >

        <div
          className="
            w-full
            max-w-lg
            rounded-2xl
            border
            border-slate-200
            dark:border-dark-border
            bg-white
            dark:bg-dark-card
            p-8
            text-center
            shadow-sm
          "
        >

          {/* =====================================================
              VERIFYING
          ====================================================== */}

          {status === 'verifying' && (

            <>

              <div
                className="
                  mx-auto
                  w-16
                  h-16
                  rounded-full
                  bg-brand-500/10
                  flex
                  items-center
                  justify-center
                  text-brand-600
                  dark:text-brand-400
                "
              >

                <Loader2
                  className="
                    w-8
                    h-8
                    animate-spin
                  "
                />

              </div>


              <h1
                className="
                  mt-6
                  text-xl
                  font-black
                  text-slate-900
                  dark:text-white
                "
              >
                Verifying Payment
              </h1>


              <p
                className="
                  mt-2
                  text-sm
                  leading-6
                  text-slate-500
                  dark:text-slate-400
                "
              >
                {message}
              </p>

            </>

          )}


          {/* =====================================================
              SUCCESS
          ====================================================== */}

          {status === 'success' && (

            <>

              <div
                className="
                  mx-auto
                  w-16
                  h-16
                  rounded-full
                  bg-emerald-500/10
                  flex
                  items-center
                  justify-center
                  text-emerald-600
                  dark:text-emerald-400
                "
              >

                <CheckCircle2
                  className="w-9 h-9"
                />

              </div>


              <h1
                className="
                  mt-6
                  text-2xl
                  font-black
                  text-slate-900
                  dark:text-white
                "
              >
                Payment Successful
              </h1>


              <p
                className="
                  mt-2
                  text-sm
                  leading-6
                  text-slate-500
                  dark:text-slate-400
                "
              >
                {message}
              </p>


              {transaction && (

                <div
                  className="
                    mt-6
                    p-4
                    rounded-xl
                    bg-slate-50
                    dark:bg-dark-bg
                    border
                    border-slate-200
                    dark:border-dark-border
                    text-left
                  "
                >

                  <div
                    className="
                      flex
                      items-center
                      gap-2
                      text-xs
                      font-bold
                      text-slate-700
                      dark:text-slate-200
                    "
                  >

                    <CreditCard
                      className="w-4 h-4"
                    />

                    Transaction Confirmed

                  </div>


                  {transaction.reference && (

                    <p
                      className="
                        mt-2
                        text-[11px]
                        text-slate-500
                        dark:text-slate-400
                        break-all
                      "
                    >
                      Reference:{' '}
                      {transaction.reference}
                    </p>

                  )}

                </div>

              )}


              <button
                type="button"

                onClick={() =>
                  navigate(
                    '/subscription',
                    {
                      replace: true,
                    }
                  )
                }

                className="
                  mt-7
                  w-full
                  inline-flex
                  items-center
                  justify-center
                  gap-2
                  px-5
                  py-3
                  rounded-xl
                  bg-brand-600
                  hover:bg-brand-700
                  text-white
                  text-sm
                  font-bold
                  transition-colors
                "
              >

                View My Subscription

                <ArrowRight
                  className="w-4 h-4"
                />

              </button>

            </>

          )}


          {/* =====================================================
              PENDING / PROCESSING
          ====================================================== */}

          {status === 'pending' && (

            <>

              <div
                className="
                  mx-auto
                  w-16
                  h-16
                  rounded-full
                  bg-amber-500/10
                  flex
                  items-center
                  justify-center
                  text-amber-600
                  dark:text-amber-400
                "
              >

                <Clock3
                  className="w-9 h-9"
                />

              </div>


              <h1
                className="
                  mt-6
                  text-2xl
                  font-black
                  text-slate-900
                  dark:text-white
                "
              >
                Payment Processing
              </h1>


              <p
                className="
                  mt-2
                  text-sm
                  leading-6
                  text-slate-500
                  dark:text-slate-400
                "
              >
                {message}
              </p>


              {transaction && (

                <div
                  className="
                    mt-6
                    p-4
                    rounded-xl
                    bg-slate-50
                    dark:bg-dark-bg
                    border
                    border-slate-200
                    dark:border-dark-border
                    text-left
                  "
                >

                  <div
                    className="
                      flex
                      items-center
                      gap-2
                      text-xs
                      font-bold
                      text-slate-700
                      dark:text-slate-200
                    "
                  >

                    <CreditCard
                      className="w-4 h-4"
                    />

                    Transaction Reference

                  </div>


                  {transaction.reference && (

                    <p
                      className="
                        mt-2
                        text-[11px]
                        text-slate-500
                        dark:text-slate-400
                        break-all
                      "
                    >
                      {transaction.reference}
                    </p>

                  )}

                </div>

              )}


              <button
                type="button"

                onClick={() =>
                  navigate(
                    '/subscription'
                  )
                }

                className="
                  mt-7
                  w-full
                  inline-flex
                  items-center
                  justify-center
                  gap-2
                  px-5
                  py-3
                  rounded-xl
                  bg-brand-600
                  hover:bg-brand-700
                  text-white
                  text-sm
                  font-bold
                  transition-colors
                "
              >

                Check My Subscription

                <ArrowRight
                  className="w-4 h-4"
                />

              </button>


              <p
                className="
                  mt-4
                  text-xs
                  leading-5
                  text-slate-400
                  dark:text-slate-500
                "
              >
                If your account was charged, your subscription
                will be updated after Paystack confirms the
                transaction.
              </p>

            </>

          )}


          {/* =====================================================
              FAILED
          ====================================================== */}

          {status === 'failed' && (

            <>

              <div
                className="
                  mx-auto
                  w-16
                  h-16
                  rounded-full
                  bg-red-500/10
                  flex
                  items-center
                  justify-center
                  text-red-600
                  dark:text-red-400
                "
              >

                <XCircle
                  className="w-9 h-9"
                />

              </div>


              <h1
                className="
                  mt-6
                  text-2xl
                  font-black
                  text-slate-900
                  dark:text-white
                "
              >
                Payment Not Completed
              </h1>


              <p
                className="
                  mt-2
                  text-sm
                  leading-6
                  text-slate-500
                  dark:text-slate-400
                "
              >
                {message}
              </p>


              {transaction && transaction.reference && (

                <div
                  className="
                    mt-6
                    p-4
                    rounded-xl
                    bg-slate-50
                    dark:bg-dark-bg
                    border
                    border-slate-200
                    dark:border-dark-border
                    text-left
                  "
                >

                  <div
                    className="
                      flex
                      items-center
                      gap-2
                      text-xs
                      font-bold
                      text-slate-700
                      dark:text-slate-200
                    "
                  >

                    <CreditCard
                      className="w-4 h-4"
                    />

                    Transaction Reference

                  </div>


                  <p
                    className="
                      mt-2
                      text-[11px]
                      text-slate-500
                      dark:text-slate-400
                      break-all
                    "
                  >
                    {transaction.reference}
                  </p>

                </div>

              )}


              <div
                className="
                  mt-6
                  flex
                  flex-col
                  sm:flex-row
                  gap-3
                "
              >

                <button
                  type="button"

                  onClick={() =>
                    navigate(
                      '/subscription'
                    )
                  }

                  className="
                    flex-1
                    inline-flex
                    items-center
                    justify-center
                    gap-2
                    px-5
                    py-3
                    rounded-xl
                    bg-brand-600
                    hover:bg-brand-700
                    text-white
                    text-sm
                    font-bold
                    transition-colors
                  "
                >
                  Back to Subscription
                </button>


                <button
                  type="button"

                  onClick={() =>
                    navigate(
                      '/dashboard'
                    )
                  }

                  className="
                    flex-1
                    inline-flex
                    items-center
                    justify-center
                    gap-2
                    px-5
                    py-3
                    rounded-xl
                    border
                    border-slate-200
                    dark:border-dark-border
                    text-slate-700
                    dark:text-slate-200
                    text-sm
                    font-bold
                    hover:bg-slate-50
                    dark:hover:bg-dark-bg
                    transition-colors
                  "
                >
                  Dashboard
                </button>

              </div>


              <p
                className="
                  mt-4
                  text-xs
                  leading-5
                  text-slate-400
                  dark:text-slate-500
                "
              >
                If money was deducted from your account,
                please keep your transaction reference and
                contact support before making another payment.
              </p>

            </>

          )}

        </div>

      </div>

    </AppLayout>

  );

};


export default PaymentCallback;