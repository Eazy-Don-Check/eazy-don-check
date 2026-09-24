import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { 
  CheckCircle2, 
  XCircle, 
  Search, 
  Loader2, 
  ShieldCheck, 
  Printer, 
  Calendar, 
  DollarSign, 
  FileText, 
  User, 
  Building2,
  ArrowLeft
} from 'lucide-react';

export default function VerifyReceipt() {
  const [searchParams] = useSearchParams();
  const receiptIdFromUrl = searchParams.get('id') || searchParams.get('code') || '';

  const [receiptCode, setReceiptCode] = useState(receiptIdFromUrl);
  const [isLoading, setIsLoading] = useState(false);
  const [verificationResult, setVerificationResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  // Function to perform verification API call
  const handleVerify = async (codeToVerify) => {
    const code = codeToVerify || receiptCode;
    if (!code.trim()) return;

    setIsLoading(true);
    setErrorMsg('');
    setVerificationResult(null);

    try {
      const res = await fetch(`/api/v1/receipts/verify/${encodeURIComponent(code.trim())}`);
      const result = await res.json();

      if (res.ok && result.success) {
        setVerificationResult(result.data || result.receipt);
      } else {
        setErrorMsg(result.message || 'Receipt could not be verified. Please check the code and try again.');
      }
    } catch (error) {
      console.error('Verification error:', error);
      setErrorMsg('Network error while connecting to the verification server.');
    } finally {
      setIsLoading(false);
    }
  };

  // Auto-verify if an ID is present in the URL query string on load
  useEffect(() => {
    if (receiptIdFromUrl) {
      handleVerify(receiptIdFromUrl);
    }
  }, [receiptIdFromUrl]);

  const onSubmitSearch = (e) => {
    e.preventDefault();
    handleVerify(receiptCode);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-dark-bg text-slate-900 dark:text-slate-100 flex flex-col justify-between transition-colors duration-200">
      {/* Top Navigation / Header */}
      <header className="h-16 bg-white dark:bg-dark-card border-b border-slate-200 dark:border-dark-border px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center text-brand-600 dark:text-brand-400">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xs font-extrabold uppercase tracking-wider text-slate-900 dark:text-white">
              EAZY DON CHECK
            </h1>
            <p className="text-[10px] text-slate-500 dark:text-slate-400">Secure Digital Receipt Verification</p>
          </div>
        </div>

        <Link
          to="/dashboard"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-dark-bg border border-slate-200 dark:border-dark-border text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Dashboard</span>
        </Link>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-2xl w-full mx-auto p-6 flex flex-col justify-center my-auto">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-brand-500/10 text-brand-600 dark:text-brand-400 mb-3 border border-brand-500/20">
            <FileText className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Verify Payment Receipt</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Enter the unique reference code or scan ID to authenticate transaction records.
          </p>
        </div>

        {/* Search Input Card */}
        <div className="bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-2xl p-6 shadow-sm mb-6">
          <form onSubmit={onSubmitSearch} className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
              <input
                type="text"
                required
                placeholder="Enter Receipt Reference Code (e.g. EZ-98421)"
                value={receiptCode}
                onChange={(e) => setReceiptCode(e.target.value)}
                className="w-full bg-slate-100 dark:bg-dark-bg border border-slate-200 dark:border-dark-border rounded-xl pl-10 pr-4 py-3 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-brand-500 transition-colors"
              />
            </div>
            <button
              type="submit"
              disabled={isLoading || !receiptCode.trim()}
              className="inline-flex items-center justify-center px-6 py-3 bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-sm transition-all gap-2 shrink-0"
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
              <span>Verify</span>
            </button>
          </form>

          {errorMsg && (
            <div className="mt-4 p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-start gap-3 text-rose-600 dark:text-rose-400 text-xs">
              <XCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Verification Failed</p>
                <p className="mt-0.5">{errorMsg}</p>
              </div>
            </div>
          )}
        </div>

        {/* Verification Result Display */}
        {verificationResult && (
          <div className="bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-2xl p-6 shadow-md print:shadow-none print:border-none">
            {/* Status Header */}
            <div className="flex items-center justify-between pb-6 border-b border-slate-200 dark:border-dark-border">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">Authentic Receipt</h3>
                  <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">Verified in Database</p>
                </div>
              </div>
              <button
                onClick={handlePrint}
                className="print:hidden inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 dark:bg-dark-bg border border-slate-200 dark:border-dark-border text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 transition"
              >
                <Printer className="w-4 h-4" />
                <span>Print</span>
              </button>
            </div>

            {/* Receipt Core Details */}
            <div className="py-6 space-y-4">
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-slate-400 dark:text-slate-500 block mb-1">Receipt Reference</span>
                  <span className="font-bold font-mono text-slate-900 dark:text-white">
                    {verificationResult.referenceCode || verificationResult.code || receiptCode}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 dark:text-slate-500 block mb-1">Issue Date</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-brand-500" />
                    {verificationResult.createdAt ? new Date(verificationResult.createdAt).toLocaleDateString() : 'N/A'}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-xs pt-3 border-t border-slate-100 dark:border-dark-border/50">
                <div>
                  <span className="text-slate-400 dark:text-slate-500 block mb-1">Customer / Client</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-brand-500" />
                    {verificationResult.customerName || verificationResult.clientName || 'Valued Customer'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 dark:text-slate-500 block mb-1">Issued By</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-brand-500" />
                    {verificationResult.issuer || 'Eazy Don Graphix & Prints'}
                  </span>
                </div>
              </div>

              {/* Items Table */}
              {verificationResult.items && verificationResult.items.length > 0 && (
                <div className="pt-4 border-t border-slate-100 dark:border-dark-border/50">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-3">Transaction Items</span>
                  <div className="rounded-xl border border-slate-200 dark:border-dark-border overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-100 dark:bg-dark-bg text-slate-500 font-bold">
                        <tr>
                          <th className="p-3">Description</th>
                          <th className="p-3 text-center">Qty</th>
                          <th className="p-3 text-right">Amount</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 dark:divide-dark-border">
                        {verificationResult.items.map((item, idx) => (
                          <tr key={idx}>
                            <td className="p-3 text-slate-800 dark:text-slate-200">{item.name || item.description}</td>
                            <td className="p-3 text-center text-slate-600 dark:text-slate-400">{item.quantity || 1}</td>
                            <td className="p-3 text-right font-semibold text-slate-900 dark:text-white">
                              ₦{(item.price || item.total || 0).toLocaleString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Total Amount */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-dark-border bg-slate-50 dark:bg-dark-bg/60 p-4 rounded-xl">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Total Paid Amount</span>
                <span className="text-sm font-extrabold text-brand-600 dark:text-brand-400 flex items-center">
                  <DollarSign className="w-4 h-4" />
                  {(verificationResult.totalAmount || verificationResult.amount || 0).toLocaleString()}
                </span>
              </div>
            </div>

            {/* Footer stamp */}
            <div className="pt-4 border-t border-slate-200 dark:border-dark-border text-center">
              <p className="text-[10px] text-slate-400">
                This is an electronically verifiable official receipt generated by EAZY DON CHECK.
              </p>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="h-14 border-t border-slate-200 dark:border-dark-border flex items-center justify-center text-center text-[11px] text-slate-400">
        <p>© {new Date().getFullYear()} EAZY DON CHECK • All Rights Reserved.</p>
      </footer>
    </div>
  );
}