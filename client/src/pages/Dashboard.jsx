import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
} from 'react';

import AppLayout from '../components/layout/AppLayout';
import { useAuth } from '../context/AuthContext';
import apiClient from '../utils/apiClient';

import {
  Upload,
  Camera,
  FileText,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Download,
  Edit3,
  Save,
  Trash2,
  Zap,
  Shield,
  Sparkles,
  Plus,
  X,
  FileSpreadsheet,
  History,
  TrendingUp,
  CreditCard,
  FileDown,
  Calculator,
  Receipt,
  SearchCheck,
} from 'lucide-react';


// =============================================================
// HELPERS
// =============================================================

const roundMoney = (value) => {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return 0;
  }

  return Math.round(
    (number + Number.EPSILON) * 100
  ) / 100;
};


const toNumber = (
  value,
  fallback = 0
) => {
  const number = Number(value);

  return Number.isFinite(number)
    ? number
    : fallback;
};


const formatDateOnly = (value) => {
  if (!value) {
    return 'N/A';
  }

  const stringValue =
    String(value);

  if (stringValue.includes('T')) {
    return stringValue.split('T')[0];
  }

  return stringValue;
};


const escapeCsvValue = (value) => {
  const stringValue =
    value === null ||
    value === undefined
      ? ''
      : String(value);

  return `"${stringValue.replace(
    /"/g,
    '""'
  )}"`;
};


// =============================================================
// CURRENCY NORMALIZATION
// =============================================================

/*
 * Intl.NumberFormat requires an ISO 4217 currency code.
 *
 * Examples:
 *   "$"       -> "USD"
 *   "US$"     -> "USD"
 *   "₦"       -> "NGN"
 *   "Naira"   -> "NGN"
 *   "£"       -> "GBP"
 *   "€"       -> "EUR"
 *   "¥"       -> "JPY"
 *
 * This is especially important for OCR because receipts
 * frequently return currency symbols instead of ISO codes.
 */

const normalizeCurrencyCode = (
  value,
  fallback = 'NGN'
) => {
  const raw =
    String(value ?? '')
      .trim()
      .toUpperCase()
      .replace(/\s+/g, ' ');

  if (!raw) {
    return fallback;
  }

  const currencyMap = {
    '$': 'USD',
    'US$': 'USD',
    'USD$': 'USD',
    'DOLLAR': 'USD',
    'DOLLARS': 'USD',
    'US DOLLAR': 'USD',
    'US DOLLARS': 'USD',

    '₦': 'NGN',
    'N': 'NGN',
    'NGN': 'NGN',
    'NAIRA': 'NGN',
    'NAIRAS': 'NGN',
    'NIGERIAN NAIRA': 'NGN',

    '£': 'GBP',
    'GBP': 'GBP',
    'POUND': 'GBP',
    'POUNDS': 'GBP',
    'BRITISH POUND': 'GBP',
    'BRITISH POUNDS': 'GBP',

    '€': 'EUR',
    'EUR': 'EUR',
    'EURO': 'EUR',
    'EUROS': 'EUR',

    '¥': 'JPY',
    'JPY': 'JPY',
    'YEN': 'JPY',
  };

  if (currencyMap[raw]) {
    return currencyMap[raw];
  }

  if (
    raw.includes('₦') ||
    raw.includes('NAIRA')
  ) {
    return 'NGN';
  }

  if (
    raw.includes('$') ||
    raw.includes('DOLLAR')
  ) {
    return 'USD';
  }

  if (
    raw.includes('£') ||
    raw.includes('POUND')
  ) {
    return 'GBP';
  }

  if (
    raw.includes('€') ||
    raw.includes('EURO')
  ) {
    return 'EUR';
  }

  if (
    raw.includes('¥') ||
    raw.includes('YEN')
  ) {
    return 'JPY';
  }

  /*
   * If OCR/backend already supplied a valid
   * three-letter ISO currency code, validate it
   * before returning it.
   */
  if (/^[A-Z]{3}$/.test(raw)) {
    try {
      new Intl.NumberFormat(
        'en-NG',
        {
          style: 'currency',
          currency: raw,
        }
      ).format(0);

      return raw;
    } catch {
      return fallback;
    }
  }

  return fallback;
};


// =============================================================
// COMPONENT
// =============================================================

const Dashboard = () => {
  const {
    user,
    updateUser,
  } = useAuth();


  // ===========================================================
  // SCAN QUOTA
  // ===========================================================

  const [scanQuota, setScanQuota] =
    useState({
      used: 0,
      total: 5,
      remaining: 5,
      unlimited: false,
      plan: {
        id: 'free',
        name: 'Free',
        description:
          'Basic access for getting started.',
        scans: 5,
        photos: 5,
      },
      status: 'inactive',
      expiresAt: null,
      autoRenew: false,
    });

  const [isLoadingQuota, setIsLoadingQuota] =
    useState(true);


  // ===========================================================
  // UPLOAD / PROCESSING
  // ===========================================================

  const [selectedFile, setSelectedFile] =
    useState(null);

  const [previewUrl, setPreviewUrl] =
    useState(null);

  const [isProcessing, setIsProcessing] =
    useState(false);

  const [dragActive, setDragActive] =
    useState(false);

  const [errorMessage, setErrorMessage] =
    useState('');

  const [successMessage, setSuccessMessage] =
    useState('');


  // ===========================================================
  // RECORDS
  // ===========================================================

  const [extractedData, setExtractedData] =
    useState(null);

  const [isEditing, setIsEditing] =
    useState(false);

  const [editedData, setEditedData] =
    useState(null);

  const [scanHistory, setScanHistory] =
    useState([]);

  const [isLoadingHistory, setIsLoadingHistory] =
    useState(true);


  // ===========================================================
  // EXPORT STATE
  // ===========================================================

  const [isExportingPDF, setIsExportingPDF] =
    useState(false);

  const [isExportingExcel, setIsExportingExcel] =
    useState(false);


  // ===========================================================
  // NORMALIZE QUOTA
  // ===========================================================

  const normalizeQuota =
    useCallback(
      (body = {}) => {
        const quota =
          body.quota ||
          body.data?.quota ||
          body;

        const scans =
          quota.scans ||
          body.scans ||
          {};

        const plan =
          quota.plan ||
          body.plan ||
          {
            id: 'free',
            name: 'Free',
            description:
              'Basic access for getting started.',
            scans: 5,
            photos: 5,
          };

        const unlimited =
          Boolean(
            quota.unlimited ??
            body.unlimited ??
            scans.unlimited
          ) ||
          quota.scansRemaining ===
            'Unlimited' ||
          body.scansRemaining ===
            'Unlimited' ||
          scans.remaining ===
            'Unlimited' ||
          plan.id === 'unlimited';

        const usedValue =
          quota.scansUsed ??
          scans.used ??
          body.scansUsed ??
          user?.scansUsed ??
          0;

        const limitValue =
          quota.maxScans ??
          scans.limit ??
          body.maxScans ??
          plan.scans ??
          5;

        const remainingValue =
          quota.scansRemaining ??
          scans.remaining ??
          body.scansRemaining;

        const used =
          Number.isFinite(
            Number(usedValue)
          )
            ? Math.max(
                0,
                Number(usedValue)
              )
            : 0;

        const total =
          unlimited
            ? -1
            : (
                Number.isFinite(
                  Number(limitValue)
                )
                  ? Math.max(
                      0,
                      Number(limitValue)
                    )
                  : 5
              );

        const remaining =
          unlimited
            ? Infinity
            : (
                Number.isFinite(
                  Number(remainingValue)
                )
                  ? Math.max(
                      0,
                      Number(remainingValue)
                    )
                  : Math.max(
                      0,
                      total - used
                    )
              );

        return {
          used,
          total,
          remaining,
          unlimited,
          plan,
          status:
            quota.status ||
            body.status ||
            'inactive',
          expiresAt:
            quota.expiresAt ??
            body.expiresAt ??
            null,
          autoRenew:
            Boolean(
              quota.autoRenew ??
              body.autoRenew
            ),
        };
      },
      [user?.scansUsed]
    );


  // ===========================================================
  // FETCH SCAN QUOTA
  // ===========================================================

  const fetchScanQuota =
    useCallback(
      async () => {
        try {
          setIsLoadingQuota(true);

          const response =
            await apiClient.get(
              '/scan/quota'
            );

          const body =
            response?.data || {};

          const normalized =
            normalizeQuota(body);

          setScanQuota(
            normalized
          );

          if (updateUser) {
            updateUser({
              scansUsed:
                normalized.used,

              maxScans:
                normalized.unlimited
                  ? -1
                  : normalized.total,

              scansRemaining:
                normalized.unlimited
                  ? 'Unlimited'
                  : normalized.remaining,

              subscriptionPlan:
                normalized.plan?.id ||
                'free',

              subscriptionStatus:
                normalized.status ||
                'inactive',
            });
          }

          return normalized;
        } catch (err) {
          console.error(
            'Failed to load scan quota:',
            err
          );

          setScanQuota(
            (previous) => ({
              ...previous,

              used:
                Number(
                  user?.scansUsed
                ) ||
                previous.used ||
                0,

              total:
                Number(
                  user?.maxScans
                ) > 0
                  ? Number(
                      user.maxScans
                    )
                  : previous.total ||
                    5,

              remaining:
                Number(
                  user?.scansRemaining
                ) >= 0
                  ? Number(
                      user.scansRemaining
                    )
                  : previous.remaining,
            })
          );

          return null;
        } finally {
          setIsLoadingQuota(false);
        }
      },
      [
        normalizeQuota,
        updateUser,
        user?.scansUsed,
        user?.maxScans,
        user?.scansRemaining,
      ]
    );


  // ===========================================================
  // INITIAL QUOTA
  // ===========================================================

  useEffect(() => {
    fetchScanQuota();
  }, [fetchScanQuota]);


  // ===========================================================
  // SUBSCRIPTION REFRESH
  // ===========================================================

  useEffect(() => {
    const handleSubscriptionUpdated =
      () => {
        fetchScanQuota();
      };

    window.addEventListener(
      'subscription:updated',
      handleSubscriptionUpdated
    );

    return () => {
      window.removeEventListener(
        'subscription:updated',
        handleSubscriptionUpdated
      );
    };
  }, [fetchScanQuota]);


  // ===========================================================
  // FETCH HISTORY
  // ===========================================================

  const fetchAuditHistory =
    useCallback(
      async () => {
        try {
          setIsLoadingHistory(
            true
          );

          const response =
            await apiClient.get(
              '/scan'
            );

          const body =
            response?.data || {};

          const historyData =
            body.data ||
            body.receipts ||
            body.records ||
            [];

          setScanHistory(
            Array.isArray(
              historyData
            )
              ? historyData
              : []
          );
        } catch (err) {
          console.error(
            'Failed to load audit history:',
            err
          );

          setScanHistory([]);
        } finally {
          setIsLoadingHistory(
            false
          );
        }
      },
      []
    );


  useEffect(() => {
    fetchAuditHistory();
  }, [fetchAuditHistory]);


  // ===========================================================
  // CLEAN OBJECT URL
  // ===========================================================

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(
          previewUrl
        );
      }
    };
  }, [previewUrl]);


  // ===========================================================
  // FILE VALIDATION
  // ===========================================================

  const processFile =
    useCallback(
      (file) => {
        if (!file) {
          return;
        }

        setErrorMessage('');
        setSuccessMessage('');

        const validTypes = [
          'image/jpeg',
          'image/png',
          'image/webp',
          'image/jpg',
          'application/pdf',
        ];

        if (
          !validTypes.includes(
            file.type
          )
        ) {
          setErrorMessage(
            'Unsupported file format. Please use JPG, PNG, WEBP, or PDF.'
          );

          return;
        }

        if (
          file.size >
          10 * 1024 * 1024
        ) {
          setErrorMessage(
            'File size exceeds the 10MB limit.'
          );

          return;
        }

        if (previewUrl) {
          URL.revokeObjectURL(
            previewUrl
          );
        }

        setSelectedFile(file);

        if (
          file.type.startsWith(
            'image/'
          )
        ) {
          setPreviewUrl(
            URL.createObjectURL(
              file
            )
          );
        } else {
          setPreviewUrl(null);
        }

        setExtractedData(null);
        setEditedData(null);
        setIsEditing(false);
      },
      [previewUrl]
    );


  // ===========================================================
  // DRAG / DROP
  // ===========================================================

  const handleDrag = (event) => {
    event.preventDefault();
    event.stopPropagation();

    if (
      event.type ===
        'dragenter' ||
      event.type ===
        'dragover'
    ) {
      setDragActive(true);
    } else if (
      event.type ===
      'dragleave'
    ) {
      setDragActive(false);
    }
  };


  const handleDrop = (event) => {
    event.preventDefault();
    event.stopPropagation();

    setDragActive(false);

    if (
      event.dataTransfer.files &&
      event.dataTransfer.files[0]
    ) {
      processFile(
        event.dataTransfer.files[0]
      );
    }
  };


  const handleFileChange = (
    event
  ) => {
    if (
      event.target.files &&
      event.target.files[0]
    ) {
      processFile(
        event.target.files[0]
      );
    }

    event.target.value = '';
  };


  // ===========================================================
  // RESET
  // ===========================================================

  const handleReset = () => {
    setSelectedFile(null);

    if (previewUrl) {
      URL.revokeObjectURL(
        previewUrl
      );
    }

    setPreviewUrl(null);
    setExtractedData(null);
    setEditedData(null);
    setIsEditing(false);
    setErrorMessage('');
    setSuccessMessage('');
  };


  // ===========================================================
  // START SCAN
  // ===========================================================

  const handleStartScan =
    async () => {
      if (!selectedFile) {
        setErrorMessage(
          'Please select or capture a receipt first.'
        );

        return;
      }

      if (
        !scanQuota.unlimited &&
        scanQuota.remaining <= 0
      ) {
        setErrorMessage(
          `You have reached your ${
            scanQuota.plan?.name ||
            'subscription'
          } scan limit. Please upgrade your subscription to continue.`
        );

        return;
      }

      setIsProcessing(true);
      setErrorMessage('');
      setSuccessMessage('');

      const formData =
        new FormData();

      formData.append(
        'document',
        selectedFile
      );

      try {
        const response =
          await apiClient.post(
            '/scan',
            formData
          );

        const resData =
          response?.data || {};

        if (
          !resData.success &&
          !resData.data
        ) {
          throw new Error(
            resData.message ||
            resData.error ||
            'Failed to extract document data.'
          );
        }

        const savedRecord =
          resData.data || {};

        const normalizedExtracted =
          savedRecord.extractedData ||
          savedRecord;

        const normalizedWithRecordId =
          {
            ...normalizedExtracted,

            _id:
              normalizedExtracted._id ||
              savedRecord._id ||
              savedRecord.id,

            id:
              normalizedExtracted.id ||
              savedRecord.id ||
              savedRecord._id,

            status:
              normalizedExtracted.status ||
              savedRecord.status ||
              'success',
          };

        setExtractedData(
          normalizedWithRecordId
        );

        setEditedData(
          JSON.parse(
            JSON.stringify(
              normalizedWithRecordId
            )
          )
        );


        // =====================================================
        // UPDATE QUOTA
        // =====================================================

        if (resData.quota) {
          const normalized =
            normalizeQuota(
              resData
            );

          setScanQuota(
            normalized
          );

          if (updateUser) {
            updateUser({
              scansUsed:
                normalized.used,

              maxScans:
                normalized.unlimited
                  ? -1
                  : normalized.total,

              scansRemaining:
                normalized.unlimited
                  ? 'Unlimited'
                  : normalized.remaining,
            });
          }
        } else {
          await fetchScanQuota();
        }

        setSuccessMessage(
          'Receipt successfully processed, calculated, verified and saved to the database.'
        );

        await fetchAuditHistory();

      } catch (err) {
        console.error(
          'Scan error:',
          err
        );

        const backendMessage =
          err.response?.data?.message ||
          err.response?.data?.error;

        if (
          err.response?.status === 403 ||
          err.response?.status === 429
        ) {
          setErrorMessage(
            backendMessage ||
            `Your ${
              scanQuota.plan?.name ||
              'subscription'
            } scan limit has been reached. Please upgrade your subscription to continue.`
          );

          await fetchScanQuota();
        } else {
          setErrorMessage(
            backendMessage ||
            err.message ||
            'Error connecting to the OCR verification service.'
          );
        }
      } finally {
        setIsProcessing(false);
      }
    };


  // ===========================================================
  // CALCULATE RECEIPT TOTALS
  // ===========================================================

  const calculateReceiptTotals =
    useCallback(
      (data) => {
        const items =
          Array.isArray(
            data?.lineItems
          )
            ? data.lineItems
            : [];

        const normalizedItems =
          items.map((item) => {
            const qty =
              Math.max(
                0,
                toNumber(
                  item?.qty,
                  1
                )
              );

            const unitPrice =
              Math.max(
                0,
                toNumber(
                  item?.unitPrice,
                  0
                )
              );

            const total =
              roundMoney(
                qty * unitPrice
              );

            return {
              ...item,
              qty,
              unitPrice,
              total,
            };
          });

        const subtotal =
          roundMoney(
            normalizedItems.reduce(
              (
                sum,
                item
              ) =>
                sum +
                toNumber(
                  item.total
                ),
              0
            )
          );

        const discountAmount =
          Math.max(
            0,
            roundMoney(
              toNumber(
                data?.discountAmount,
                0
              )
            )
          );

        const serviceCharge =
          Math.max(
            0,
            roundMoney(
              toNumber(
                data?.serviceCharge,
                0
              )
            )
          );

        const taxRate =
          Math.max(
            0,
            toNumber(
              data?.taxRate,
              0
            )
          );

        let taxAmount =
          toNumber(
            data?.taxAmount,
            0
          );

        /*
         * Important:
         * Do NOT assume 7.5% VAT.
         *
         * If the backend extracted an explicit
         * tax amount, preserve it.
         *
         * Otherwise calculate from an explicitly
         * supplied taxRate.
         */
        if (
          !Number.isFinite(
            Number(data?.taxAmount)
          )
        ) {
          taxAmount =
            taxRate > 0
              ? roundMoney(
                  Math.max(
                    0,
                    subtotal -
                      discountAmount
                  ) *
                    (taxRate / 100)
                )
              : 0;
        }

        taxAmount =
          Math.max(
            0,
            roundMoney(
              taxAmount
            )
          );

        const taxableSubtotal =
          Math.max(
            0,
            roundMoney(
              subtotal -
                discountAmount
            )
          );

        const grandTotal =
          roundMoney(
            taxableSubtotal +
              taxAmount +
              serviceCharge
          );

        const originalReceiptTotal =
          toNumber(
            data?.originalReceiptTotal ??
            data?.totalAmount,
            0
          );

        const calculationDifference =
          originalReceiptTotal > 0
            ? roundMoney(
                grandTotal -
                  originalReceiptTotal
              )
            : 0;

        let calculationStatus =
          data?.calculationStatus ||
          'incomplete';

        if (
          normalizedItems.length === 0
        ) {
          calculationStatus =
            'incomplete';
        } else if (
          originalReceiptTotal <= 0
        ) {
          calculationStatus =
            'incomplete';
        } else if (
          Math.abs(
            calculationDifference
          ) <= 0.01
        ) {
          calculationStatus =
            'verified';
        } else {
          calculationStatus =
            'discrepancy';
        }

        return {
          lineItems:
            normalizedItems,

          subtotal,

          discountAmount,

          taxRate,

          taxAmount,

          serviceCharge,

          grandTotal,

          totalAmount:
            grandTotal,

          originalReceiptTotal,

          calculatedSubtotal:
            subtotal,

          calculatedGrandTotal:
            grandTotal,

          calculationDifference,

          calculationStatus,
        };
      },
      []
    );


  // ===========================================================
  // LIVE CALCULATED DATA
  // ===========================================================

  const activeData =
    isEditing
      ? editedData
      : extractedData;


  const calculatedData =
    useMemo(() => {
      if (!activeData) {
        return null;
      }

      return {
        ...activeData,
        ...calculateReceiptTotals(
          activeData
        ),
      };
    }, [
      activeData,
      calculateReceiptTotals,
    ]);


  // ===========================================================
  // UPDATE FIELD
  // ===========================================================

  const handleFieldChange = (
    field,
    value
  ) => {
    if (!editedData) {
      return;
    }

    setEditedData({
      ...editedData,
      [field]: value,
    });
  };


  // ===========================================================
  // ITEM CHANGE
  // ===========================================================

  const handleItemChange = (
    index,
    field,
    value
  ) => {
    const updatedItems = [
      ...(editedData?.lineItems || []),
    ];

    const currentItem = {
      ...updatedItems[index],
      [field]: value,
    };

    if (
      field === 'qty' ||
      field === 'unitPrice'
    ) {
      const qty =
        field === 'qty'
          ? Math.max(
              0,
              toNumber(
                value,
                0
              )
            )
          : Math.max(
              0,
              toNumber(
                currentItem.qty,
                0
              )
            );

      const unitPrice =
        field === 'unitPrice'
          ? Math.max(
              0,
              toNumber(
                value,
                0
              )
            )
          : Math.max(
              0,
              toNumber(
                currentItem.unitPrice,
                0
              )
            );

      currentItem.qty = qty;
      currentItem.unitPrice =
        unitPrice;

      currentItem.total =
        roundMoney(
          qty * unitPrice
        );
    }

    updatedItems[index] =
      currentItem;

    setEditedData({
      ...editedData,
      lineItems:
        updatedItems,
    });
  };


  // ===========================================================
  // ADD ITEM
  // ===========================================================

  const handleAddLineItem = () => {
    if (!editedData) {
      return;
    }

    const newItem = {
      description:
        'New Item Entry',
      qty: 1,
      unitPrice: 0,
      total: 0,
    };

    setEditedData({
      ...editedData,

      lineItems: [
        ...(editedData.lineItems || []),
        newItem,
      ],
    });
  };


  // ===========================================================
  // REMOVE ITEM
  // ===========================================================

  const handleRemoveLineItem = (
    index
  ) => {
    if (!editedData) {
      return;
    }

    const updatedItems =
      (
        editedData.lineItems ||
        []
      ).filter(
        (_, itemIndex) =>
          itemIndex !== index
      );

    setEditedData({
      ...editedData,
      lineItems:
        updatedItems,
    });
  };


  // ===========================================================
  // SAVE EDITS
  // ===========================================================

  const handleSaveEdits =
    async () => {
      try {
        setErrorMessage('');
        setSuccessMessage('');

        const recordId =
          editedData?._id ||
          editedData?.id;

        if (!recordId) {
          throw new Error(
            'No database record ID was found.'
          );
        }

        const calculated =
          calculateReceiptTotals(
            editedData
          );

        const payload = {
          ...editedData,

          lineItems:
            calculated.lineItems,

          subtotal:
            calculated.subtotal,

          discountAmount:
            calculated.discountAmount,

          taxRate:
            calculated.taxRate,

          taxAmount:
            calculated.taxAmount,

          serviceCharge:
            calculated.serviceCharge,

          totalAmount:
            calculated.totalAmount,

          calculatedSubtotal:
            calculated.calculatedSubtotal,

          calculatedGrandTotal:
            calculated.calculatedGrandTotal,

          calculationDifference:
            calculated.calculationDifference,

          calculationStatus:
            calculated.calculationStatus,
        };

        const response =
          await apiClient.put(
            `/scan/${recordId}`,
            payload
          );

        const resData =
          response?.data || {};

        if (
          !resData.success &&
          !resData.data
        ) {
          throw new Error(
            resData.message ||
            resData.error ||
            'Failed to update record in database.'
          );
        }

        const updatedRecord =
          resData.data || {};

        const updatedExtracted =
          updatedRecord.extractedData ||
          updatedRecord;

        setExtractedData(
          updatedExtracted
        );

        setEditedData(
          JSON.parse(
            JSON.stringify(
              updatedExtracted
            )
          )
        );

        setIsEditing(false);

        setSuccessMessage(
          'Receipt calculation and database record successfully updated.'
        );

        await fetchAuditHistory();

      } catch (err) {
        console.error(
          'Save record error:',
          err
        );

        setErrorMessage(
          err.response?.data?.message ||
          err.response?.data?.error ||
          err.message ||
          'Error saving changes.'
        );
      }
    };


  // ===========================================================
  // DOWNLOAD HELPER
  // ===========================================================

  const downloadBlob = (
    blob,
    filename
  ) => {
    const url =
      URL.createObjectURL(
        blob
      );

    const anchor =
      document.createElement(
        'a'
      );

    anchor.href = url;
    anchor.download =
      filename;

    document.body.appendChild(
      anchor
    );

    anchor.click();

    anchor.remove();

    setTimeout(() => {
      URL.revokeObjectURL(
        url
      );
    }, 1000);
  };


  // ===========================================================
  // JSON EXPORT
  // ===========================================================

  const handleExportJSON = () => {
    if (!calculatedData) {
      return;
    }

    const exportData = {
      documentType:
        'receipt-verification',

      vendorName:
        calculatedData.vendorName ||
        calculatedData.merchantName ||
        '',

      merchantName:
        calculatedData.merchantName ||
        calculatedData.vendorName ||
        '',

      invoiceNumber:
        calculatedData.invoiceNumber ||
        '',

      date:
        calculatedData.date ||
        '',

      currency:
        normalizeCurrencyCode(
          calculatedData.currency,
          'NGN'
        ),

      category:
        calculatedData.category ||
        'General',

      lineItems:
        calculatedData.lineItems ||
        [],

      subtotal:
        calculatedData.subtotal,

      discountAmount:
        calculatedData.discountAmount,

      taxRate:
        calculatedData.taxRate,

      taxAmount:
        calculatedData.taxAmount,

      serviceCharge:
        calculatedData.serviceCharge,

      originalReceiptTotal:
        calculatedData.originalReceiptTotal,

      calculatedGrandTotal:
        calculatedData.calculatedGrandTotal,

      calculationDifference:
        calculatedData.calculationDifference,

      calculationStatus:
        calculatedData.calculationStatus,

      confidenceScore:
        calculatedData.confidenceScore,

      rawText:
        calculatedData.rawText ||
        '',
    };

    const dataStr =
      'data:application/json;charset=utf-8,' +
      encodeURIComponent(
        JSON.stringify(
          exportData,
          null,
          2
        )
      );

    const anchor =
      document.createElement(
        'a'
      );

    anchor.href = dataStr;

    anchor.download =
      `receipt_${
        calculatedData.invoiceNumber ||
        'verification'
      }.json`;

    document.body.appendChild(
      anchor
    );

    anchor.click();

    anchor.remove();
  };


  // ===========================================================
  // CSV EXPORT
  // ===========================================================

  const handleExportCSV = () => {
    if (!calculatedData) {
      return;
    }

    let csv = '';

    csv +=
      'Receipt Verification Report\n\n';

    csv +=
      'Vendor,Invoice Number,Date,Currency,Category\n';

    csv +=
      [
        escapeCsvValue(
          calculatedData.vendorName ||
          calculatedData.merchantName ||
          ''
        ),

        escapeCsvValue(
          calculatedData.invoiceNumber ||
          ''
        ),

        escapeCsvValue(
          calculatedData.date ||
          ''
        ),

        escapeCsvValue(
          normalizeCurrencyCode(
            calculatedData.currency,
            'NGN'
          )
        ),

        escapeCsvValue(
          calculatedData.category ||
          ''
        ),
      ].join(',') +
      '\n\n';

    csv +=
      'S/N,Description,Quantity,Unit Price,Total\n';

    (
      calculatedData.lineItems ||
      []
    ).forEach(
      (item, index) => {
        csv +=
          [
            index + 1,

            escapeCsvValue(
              item.description ||
              ''
            ),

            toNumber(
              item.qty,
              0
            ),

            toNumber(
              item.unitPrice,
              0
            ),

            toNumber(
              item.total,
              0
            ),
          ].join(',') +
          '\n';
      }
    );

    csv += '\n';

    csv +=
      `Subtotal,${calculatedData.subtotal}\n`;

    csv +=
      `Discount,${calculatedData.discountAmount}\n`;

    csv +=
      `Tax Rate,${calculatedData.taxRate}%\n`;

    csv +=
      `Tax Amount,${calculatedData.taxAmount}\n`;

    csv +=
      `Service Charge,${calculatedData.serviceCharge}\n`;

    csv +=
      `Calculated Grand Total,${calculatedData.calculatedGrandTotal}\n`;

    csv +=
      `Original Receipt Total,${calculatedData.originalReceiptTotal}\n`;

    csv +=
      `Difference,${calculatedData.calculationDifference}\n`;

    csv +=
      `Calculation Status,${calculatedData.calculationStatus}\n`;

    const blob =
      new Blob(
        [csv],
        {
          type:
            'text/csv;charset=utf-8;',
        }
      );

    downloadBlob(
      blob,
      `receipt_${
        calculatedData.invoiceNumber ||
        'verification'
      }.csv`
    );
  };


  // ===========================================================
  // EXCEL EXPORT
  // ===========================================================

  const handleExportExcel =
    async () => {
      if (!calculatedData) {
        return;
      }

      try {
        setIsExportingExcel(
          true
        );

        setErrorMessage('');

        const XLSX =
          await import(
            'xlsx'
          );

        const workbook =
          XLSX.utils.book_new();

        const headerRows = [
          [
            'EAZY DON CHECK',
            'Receipt Verification Report',
          ],

          [],

          [
            'Vendor',
            calculatedData.vendorName ||
              calculatedData.merchantName ||
              '',
          ],

          [
            'Invoice / Receipt #',
            calculatedData.invoiceNumber ||
              '',
          ],

          [
            'Date',
            calculatedData.date ||
              '',
          ],

          [
            'Currency',
            normalizeCurrencyCode(
              calculatedData.currency,
              'NGN'
            ),
          ],

          [
            'Category',
            calculatedData.category ||
              'General',
          ],

          [],
        ];

        const itemRows = [
          [
            'S/N',
            'Description',
            'Qty',
            'Price',
            'Total',
          ],
        ];

        (
          calculatedData.lineItems ||
          []
        ).forEach(
          (item, index) => {
            itemRows.push([
              index + 1,

              item.description ||
                '',

              toNumber(
                item.qty,
                0
              ),

              toNumber(
                item.unitPrice,
                0
              ),

              toNumber(
                item.total,
                0
              ),
            ]);
          }
        );

        const summaryRows = [
          [],

          [
            '',
            '',
            '',
            'Subtotal',
            calculatedData.subtotal,
          ],

          [
            '',
            '',
            '',
            'Discount',
            calculatedData.discountAmount,
          ],

          [
            '',
            '',
            '',
            `Tax (${calculatedData.taxRate || 0}%)`,
            calculatedData.taxAmount,
          ],

          [
            '',
            '',
            '',
            'Service Charge',
            calculatedData.serviceCharge,
          ],

          [
            '',
            '',
            '',
            'Calculated Grand Total',
            calculatedData.calculatedGrandTotal,
          ],

          [
            '',
            '',
            '',
            'Original Receipt Total',
            calculatedData.originalReceiptTotal,
          ],

          [
            '',
            '',
            '',
            'Difference',
            calculatedData.calculationDifference,
          ],

          [
            '',
            '',
            '',
            'Calculation Status',
            calculatedData.calculationStatus,
          ],
        ];

        const worksheet =
          XLSX.utils.aoa_to_sheet([
            ...headerRows,
            ...itemRows,
            ...summaryRows,
          ]);

        worksheet['!cols'] = [
          { wch: 8 },
          { wch: 38 },
          { wch: 12 },
          { wch: 18 },
          { wch: 18 },
        ];

        XLSX.utils.book_append_sheet(
          workbook,
          worksheet,
          'Receipt Verification'
        );

        XLSX.writeFile(
          workbook,
          `receipt_${
            calculatedData.invoiceNumber ||
            'verification'
          }.xlsx`
        );

        setSuccessMessage(
          'Excel verification report exported successfully.'
        );
      } catch (err) {
        console.error(
          'Excel export error:',
          err
        );

        setErrorMessage(
          'Unable to generate the Excel file.'
        );
      } finally {
        setIsExportingExcel(
          false
        );
      }
    };


  // ===========================================================
  // PDF EXPORT
  // ===========================================================

  const handleExportPDF =
    async () => {
      if (!calculatedData) {
        return;
      }

      try {
        setIsExportingPDF(true);
        setErrorMessage('');

        const jsPDFModule =
          await import(
            'jspdf'
          );

        const autoTableModule =
          await import(
            'jspdf-autotable'
          );

        const jsPDF =
          jsPDFModule.jsPDF ||
          jsPDFModule.default;

        const autoTable =
          autoTableModule.default ||
          jsPDFModule.autoTable;

        const doc =
          new jsPDF({
            orientation:
              'portrait',
            unit: 'mm',
            format: 'a4',
          });


        // =====================================================
        // FIXED CURRENCY HANDLING
        // =====================================================

        /*
         * IMPORTANT:
         *
         * calculatedData.currency may contain:
         *
         *   "$"
         *   "USD"
         *   "₦"
         *   "NGN"
         *   "Naira"
         *
         * Intl.NumberFormat does NOT accept "$"
         * or "₦" as the currency option.
         *
         * It requires ISO 4217 codes such as:
         *
         *   USD
         *   NGN
         *   GBP
         *   EUR
         *
         * Therefore we normalize the value before
         * creating the formatter.
         */

        const currency =
          normalizeCurrencyCode(
            calculatedData.currency,
            'NGN'
          );


        const money = (
          value
        ) => {
          return new Intl.NumberFormat(
            'en-NG',
            {
              style: 'currency',
              currency,
            }
          ).format(
            toNumber(
              value,
              0
            )
          );
        };


        // -------------------------------------------------------
        // HEADER
        // -------------------------------------------------------

        doc.setFontSize(20);

        doc.setFont(
          'helvetica',
          'bold'
        );

        doc.text(
          'EAZY DON CHECK',
          14,
          18
        );

        doc.setFontSize(10);

        doc.setFont(
          'helvetica',
          'normal'
        );

        doc.text(
          'Receipt Verification Report',
          14,
          25
        );

        doc.setFontSize(9);

        doc.text(
          `Generated: ${new Date().toLocaleString('en-NG')}`,
          14,
          31
        );


        // -------------------------------------------------------
        // RECEIPT DETAILS
        // -------------------------------------------------------

        doc.setFontSize(10);

        doc.setFont(
          'helvetica',
          'bold'
        );

        doc.text(
          'Receipt Details',
          14,
          42
        );

        doc.setFont(
          'helvetica',
          'normal'
        );

        doc.text(
          `Vendor: ${
            calculatedData.vendorName ||
            calculatedData.merchantName ||
            'N/A'
          }`,
          14,
          49
        );

        doc.text(
          `Receipt #: ${
            calculatedData.invoiceNumber ||
            'N/A'
          }`,
          14,
          55
        );

        doc.text(
          `Date: ${
            formatDateOnly(
              calculatedData.date
            )
          }`,
          14,
          61
        );

        doc.text(
          `Currency: ${currency}`,
          110,
          49
        );

        doc.text(
          `Category: ${
            calculatedData.category ||
            'General'
          }`,
          110,
          55
        );


        // -------------------------------------------------------
        // LINE ITEMS
        // -------------------------------------------------------

        const tableRows =
          (
            calculatedData.lineItems ||
            []
          ).map(
            (
              item,
              index
            ) => [
              index + 1,

              item.description ||
                '',

              toNumber(
                item.qty,
                0
              ),

              money(
                item.unitPrice
              ),

              money(
                item.total
              ),
            ]
          );

        if (
          typeof autoTable ===
          'function'
        ) {
          autoTable(
            doc,
            {
              startY: 70,

              head: [[
                'S/N',
                'Description',
                'Qty',
                'Price',
                'Total',
              ]],

              body:
                tableRows.length
                  ? tableRows
                  : [[
                      '-',
                      'No line items extracted',
                      '-',
                      '-',
                      '-',
                    ]],

              theme: 'grid',

              styles: {
                fontSize: 8,
                cellPadding: 3,
              },

              headStyles: {
                fontStyle:
                  'bold',
              },

              columnStyles: {
                0: {
                  cellWidth: 12,
                },

                2: {
                  cellWidth: 18,
                  halign:
                    'center',
                },

                3: {
                  cellWidth: 30,
                  halign:
                    'right',
                },

                4: {
                  cellWidth: 30,
                  halign:
                    'right',
                },
              },
            }
          );
        }


        const finalY =
          doc.lastAutoTable?.finalY ||
          85;


        // -------------------------------------------------------
        // TOTALS
        // -------------------------------------------------------

        let summaryY =
          finalY + 12;

        doc.setFontSize(9);

        doc.setFont(
          'helvetica',
          'normal'
        );

        const summaryXLabel =
          125;

        const summaryXValue =
          196;

        const addSummaryRow = (
          label,
          value,
          bold = false
        ) => {
          doc.setFont(
            'helvetica',
            bold
              ? 'bold'
              : 'normal'
          );

          doc.text(
            label,
            summaryXLabel,
            summaryY,
            {
              align:
                'right',
            }
          );

          doc.text(
            value,
            summaryXValue,
            summaryY,
            {
              align:
                'right',
            }
          );

          summaryY += 6;
        };

        addSummaryRow(
          'Subtotal',
          money(
            calculatedData.subtotal
          )
        );

        if (
          toNumber(
            calculatedData.discountAmount
          ) > 0
        ) {
          addSummaryRow(
            'Discount',
            `-${money(
              calculatedData.discountAmount
            )}`
          );
        }

        if (
          toNumber(
            calculatedData.taxAmount
          ) > 0
        ) {
          addSummaryRow(
            `Tax (${
              calculatedData.taxRate ||
              0
            }%)`,
            money(
              calculatedData.taxAmount
            )
          );
        }

        if (
          toNumber(
            calculatedData.serviceCharge
          ) > 0
        ) {
          addSummaryRow(
            'Service Charge',
            money(
              calculatedData.serviceCharge
            )
          );
        }

        addSummaryRow(
          'GRAND TOTAL',
          money(
            calculatedData.calculatedGrandTotal
          ),
          true
        );

        summaryY += 3;

        addSummaryRow(
          'Receipt Total',
          money(
            calculatedData.originalReceiptTotal
          )
        );

        addSummaryRow(
          'Difference',
          money(
            calculatedData.calculationDifference
          )
        );


        // -------------------------------------------------------
        // STATUS
        // -------------------------------------------------------

        summaryY += 4;

        doc.setFont(
          'helvetica',
          'bold'
        );

        doc.text(
          `Calculation Status: ${
            String(
              calculatedData.calculationStatus ||
              'incomplete'
            ).toUpperCase()
          }`,
          14,
          summaryY
        );

        summaryY += 8;

        doc.setFont(
          'helvetica',
          'normal'
        );

        doc.setFontSize(8);

        doc.text(
          'Generated by EAZY DON CHECK — Receipt Verification System',
          14,
          287
        );

        doc.save(
          `receipt_${
            calculatedData.invoiceNumber ||
            'verification'
          }.pdf`
        );

        setSuccessMessage(
          'PDF verification report exported successfully.'
        );

      } catch (err) {
        console.error(
          'PDF export error:',
          err
        );

        setErrorMessage(
          'Unable to generate the PDF file.'
        );
      } finally {
        setIsExportingPDF(
          false
        );
      }
    };


  // ===========================================================
  // STATUS DISPLAY
  // ===========================================================

  const calculationStatus =
    calculatedData?.calculationStatus ||
    'incomplete';


  const calculationStatusConfig =
    {
      verified: {
        label:
          'CALCULATION VERIFIED',

        icon:
          CheckCircle2,

        classes:
          'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
      },

      discrepancy: {
        label:
          'TOTAL DISCREPANCY',

        icon:
          AlertTriangle,

        classes:
          'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20',
      },

      incomplete: {
        label:
          'INCOMPLETE CALCULATION',

        icon:
          AlertTriangle,

        classes:
          'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
      },
    };


  const statusConfig =
    calculationStatusConfig[
      calculationStatus
    ] ||
    calculationStatusConfig.incomplete;

  const StatusIcon =
    statusConfig.icon;


  // ===========================================================
  // METRICS
  // ===========================================================

  const remainingScans =
    scanQuota.unlimited
      ? Infinity
      : Math.max(
          0,
          Number(
            scanQuota.remaining
          ) || 0
        );


  const usagePercentage =
    scanQuota.unlimited
      ? 0
      : scanQuota.total > 0
        ? Math.round(
            (
              scanQuota.used /
              scanQuota.total
            ) * 100
          )
        : 0;


  // ===========================================================
  // SAFE CURRENCY FORMATTER
  // ===========================================================

  const formatCurrency = (
    value,
    currency = 'NGN'
  ) => {
    const safeCurrency =
      normalizeCurrencyCode(
        currency,
        'NGN'
      );

    try {
      return new Intl.NumberFormat(
        'en-NG',
        {
          style: 'currency',
          currency:
            safeCurrency,
        }
      ).format(
        Number(value) || 0
      );
    } catch {
      /*
       * Final safety fallback.
       * This should practically never be reached because
       * normalizeCurrencyCode() validates ISO currency codes.
       */
      return new Intl.NumberFormat(
        'en-NG',
        {
          style: 'currency',
          currency: 'NGN',
        }
      ).format(
        Number(value) || 0
      );
    }
  };


  // ===========================================================
  // PLAN
  // ===========================================================

  const planName =
    scanQuota.unlimited
      ? 'Unlimited'
      : (
          scanQuota.plan?.name ||
          'Free'
        );


  // ===========================================================
  // EXPIRY
  // ===========================================================

  const formattedExpiry =
    scanQuota.expiresAt
      ? new Date(
          scanQuota.expiresAt
        ).toLocaleDateString(
          'en-NG',
          {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
          }
        )
      : null;


  // ===========================================================
  // RENDER
  // ===========================================================

  return (
    <AppLayout>

      <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 h-[calc(100vh-theme(spacing.16))] flex flex-col overflow-hidden space-y-6 text-slate-900 dark:text-slate-100">

        {/* =====================================================
            HEADER
        ====================================================== */}

        <div className="flex-none flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-dark-border/60">

          <div>

            <div className="flex items-center gap-2 flex-wrap">

              <span className="px-2.5 py-1 text-[11px] font-semibold bg-brand-500/10 text-brand-600 dark:text-brand-400 rounded-md border border-brand-500/20 uppercase tracking-wider">
                Connected Workspace
              </span>

              <span className="text-xs text-slate-400">
                •
              </span>

              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Live Database Synchronized
              </span>

              <span className="text-xs text-slate-400">
                •
              </span>

              <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                <CreditCard className="w-3 h-3" />
                {planName}
              </span>

            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight mt-1">
              Receipt Verification
            </h1>

            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Upload or capture a receipt and automatically turn it into a calculated invoice-style verification report.
            </p>

            {!scanQuota.unlimited &&
              formattedExpiry && (
                <p className="text-[11px] text-slate-400 mt-1">
                  Subscription expires{' '}
                  {formattedExpiry}
                </p>
              )}

          </div>


          <div className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-dark-border bg-white dark:bg-dark-card text-slate-500 dark:text-slate-300 text-xs font-medium shadow-sm">

            <Shield className="w-4 h-4 text-brand-500 dark:text-brand-400" />

            <span>
              OCR • AI Extraction • Automatic Calculation
            </span>

          </div>

        </div>


        {/* =====================================================
            SCROLLABLE CONTENT
        ====================================================== */}

        <div className="flex-1 overflow-y-auto pr-1 space-y-6 pb-6">


          {/* ===================================================
              METRICS
          ==================================================== */}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">


            {/* SCAN QUOTA */}

            <div className="p-5 rounded-2xl bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border shadow-sm flex items-center justify-between">

              <div>

                <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Scans Available
                </p>

                <h3 className="text-2xl font-bold text-slate-900 dark:text-white mt-1">

                  {scanQuota.unlimited
                    ? 'Unlimited'
                    : remainingScans}

                  {!scanQuota.unlimited && (
                    <span className="text-xs font-normal text-slate-500">
                      {' '}
                      / {scanQuota.total}
                    </span>
                  )}

                </h3>

                {!scanQuota.unlimited ? (
                  <div className="w-32 bg-slate-100 dark:bg-dark-bg h-1.5 rounded-full mt-3 overflow-hidden">

                    <div
                      className={`h-full transition-all duration-500 ${
                        usagePercentage >= 90
                          ? 'bg-red-500'
                          : 'bg-brand-500'
                      }`}
                      style={{
                        width: `${Math.min(
                          usagePercentage,
                          100
                        )}%`,
                      }}
                    />

                  </div>
                ) : (
                  <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium mt-2">
                    Super Admin access
                  </p>
                )}

              </div>

              <div className="w-12 h-12 rounded-xl bg-brand-500/10 text-brand-600 dark:text-brand-400 flex items-center justify-center">

                <Zap className="w-6 h-6" />

              </div>

            </div>


            {/* DATABASE RECORDS */}

            <div className="p-5 rounded-2xl bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border shadow-sm flex items-center justify-between">

              <div>

                <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Verified Receipts
                </p>

                <h3 className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                  {scanHistory.length} Stored
                </h3>

                <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium mt-2 flex items-center gap-1">

                  <TrendingUp className="w-3.5 h-3.5" />

                  Live Sync Active

                </p>

              </div>

              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">

                <Receipt className="w-6 h-6" />

              </div>

            </div>


            {/* SECURITY */}

            <div className="p-5 rounded-2xl bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border shadow-sm flex items-center justify-between">

              <div>

                <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Verification Engine
                </p>

                <h3 className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                  AI + OCR
                </h3>

                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2">
                  JWT Authenticated
                </p>

              </div>

              <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">

                <SearchCheck className="w-6 h-6" />

              </div>

            </div>

          </div>


          {/* ===================================================
              NOTIFICATIONS
          ==================================================== */}

          {errorMessage && (
            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 text-xs text-red-500 dark:text-red-400 shadow-sm">

              <AlertTriangle className="w-5 h-5 shrink-0" />

              <span>
                {errorMessage}
              </span>

              <button
                onClick={() =>
                  setErrorMessage('')
                }
                className="ml-auto"
              >
                <X className="w-4 h-4" />
              </button>

            </div>
          )}


          {successMessage && (
            <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center gap-3 text-xs text-emerald-600 dark:text-emerald-400 shadow-sm">

              <CheckCircle2 className="w-5 h-5 shrink-0" />

              <span>
                {successMessage}
              </span>

              <button
                onClick={() =>
                  setSuccessMessage('')
                }
                className="ml-auto"
              >
                <X className="w-4 h-4" />
              </button>

            </div>
          )}


          {/* ===================================================
              MAIN GRID
          ==================================================== */}

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">


            {/* =================================================
                UPLOAD
            ================================================== */}

            <div className="lg:col-span-5 space-y-6">

              <div className="p-6 border border-slate-200 dark:border-dark-border rounded-2xl bg-white dark:bg-dark-card shadow-sm">

                {/* UPLOAD HEADER */}

                <div className="flex items-center justify-between mb-4">

                  <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">

                    <Upload className="w-4 h-4 text-brand-500" />

                    Receipt Ingestion

                  </h3>

                  <span className="text-[11px] text-slate-400 font-medium">
                    JPG • PNG • WEBP • PDF
                  </span>

                </div>


                {/* CAMERA / UPLOAD BUTTONS */}

                <div className="grid grid-cols-2 gap-3 mb-4">

                  <label
                    htmlFor="receipt-camera-input"
                    className="cursor-pointer flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-brand-500/30 bg-brand-500/10 hover:bg-brand-500/15 text-brand-600 dark:text-brand-400 text-xs font-semibold transition-colors"
                  >

                    <Camera className="w-4 h-4" />

                    Take Photo

                  </label>

                  <input
                    id="receipt-camera-input"
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={
                      handleFileChange
                    }
                    className="hidden"
                  />


                  <label
                    htmlFor="receipt-file-input"
                    className="cursor-pointer flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-slate-200 dark:border-dark-border bg-slate-50 dark:bg-dark-bg hover:border-brand-500 text-slate-700 dark:text-slate-300 text-xs font-semibold transition-colors"
                  >

                    <Upload className="w-4 h-4" />

                    Upload Receipt

                  </label>

                </div>


                <input
                  type="file"
                  id="receipt-file-input"
                  accept="image/jpeg,image/png,image/webp,application/pdf"
                  onChange={
                    handleFileChange
                  }
                  className="hidden"
                />


                {/* DROPZONE */}

                <div
                  onDragEnter={
                    handleDrag
                  }
                  onDragLeave={
                    handleDrag
                  }
                  onDragOver={
                    handleDrag
                  }
                  onDrop={
                    handleDrop
                  }
                  className={`border-2 border-dashed rounded-2xl p-5 text-center transition-all ${
                    dragActive
                      ? 'border-brand-500 bg-brand-500/10'
                      : 'border-slate-300 dark:border-dark-border hover:border-brand-500 dark:hover:border-brand-500/50 bg-slate-50 dark:bg-dark-bg/40'
                  }`}
                >

                  {selectedFile ? (

                    <div className="space-y-4">

                      {previewUrl ? (

                        <div className="relative max-h-64 overflow-hidden rounded-xl border border-slate-200 dark:border-dark-border bg-slate-100 dark:bg-black/40">

                          <img
                            src={previewUrl}
                            alt="Receipt preview"
                            className="w-full object-contain max-h-64 mx-auto"
                          />

                        </div>

                      ) : (

                        <div className="p-8 border border-slate-200 dark:border-dark-border rounded-xl bg-slate-100 dark:bg-dark-bg flex flex-col items-center">

                          <FileText className="w-12 h-12 text-brand-500 mb-2" />

                          <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                            PDF Receipt Ready
                          </span>

                        </div>

                      )}


                      <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 px-1">

                        <span className="truncate max-w-[220px] font-medium text-slate-700 dark:text-slate-300">
                          {selectedFile.name}
                        </span>

                        <button
                          type="button"
                          onClick={
                            handleReset
                          }
                          className="text-red-500 hover:text-red-600 dark:hover:text-red-400 flex items-center gap-1 transition-colors font-medium"
                        >

                          <Trash2 className="w-3.5 h-3.5" />

                          Remove

                        </button>

                      </div>

                    </div>

                  ) : (

                    <label
                      htmlFor="receipt-file-input"
                      className="cursor-pointer block space-y-3 py-5"
                    >

                      <div className="w-14 h-14 rounded-2xl bg-brand-500/10 text-brand-600 dark:text-brand-400 flex items-center justify-center mx-auto shadow-inner">

                        <Receipt className="w-7 h-7" />

                      </div>

                      <div>

                        <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                          Drop your receipt here
                        </p>

                        <p className="text-xs text-slate-400 mt-1">
                          Or use Take Photo / Upload Receipt above
                        </p>

                      </div>

                    </label>

                  )}

                </div>


                {/* PROCESS BUTTON */}

                <button
                  type="button"
                  onClick={
                    handleStartScan
                  }
                  disabled={
                    !selectedFile ||
                    isProcessing ||
                    isLoadingQuota ||
                    (
                      !scanQuota.unlimited &&
                      remainingScans <= 0
                    )
                  }
                  className="w-full mt-6 py-3.5 px-4 bg-brand-600 hover:bg-brand-500 text-white font-semibold text-sm rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >

                  {isProcessing ? (

                    <>

                      <RefreshCw className="w-4 h-4 animate-spin" />

                      <span>
                        Processing Receipt...
                      </span>

                    </>

                  ) : isLoadingQuota ? (

                    <>

                      <RefreshCw className="w-4 h-4 animate-spin" />

                      <span>
                        Checking Scan Quota...
                      </span>

                    </>

                  ) : (

                    <>

                      <Sparkles className="w-4 h-4" />

                      <span>
                        Scan & Calculate Receipt
                      </span>

                    </>

                  )}

                </button>


                {!scanQuota.unlimited &&
                  !isLoadingQuota &&
                  remainingScans <= 0 && (
                    <div className="mt-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-center">

                      <p className="text-[11px] font-semibold text-amber-600 dark:text-amber-400">
                        Your {scanQuota.plan?.name || 'Free'} scan quota has been exhausted.
                      </p>

                      <p className="text-[10px] text-amber-600/80 dark:text-amber-400/80 mt-1">
                        Upgrade your subscription to continue scanning receipts.
                      </p>

                    </div>
                  )}

              </div>


              {/* =================================================
                  HISTORY
              ================================================== */}

              <div className="p-6 border border-slate-200 dark:border-dark-border rounded-2xl bg-white dark:bg-dark-card shadow-sm space-y-4">

                <div className="flex items-center justify-between">

                  <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">

                    <History className="w-3.5 h-3.5 text-brand-500" />

                    Verification History

                  </h4>

                  <span className="text-[11px] font-semibold text-brand-600 dark:text-brand-400">
                    {scanHistory.length} Records
                  </span>

                </div>


                <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">

                  {isLoadingHistory ? (

                    <div className="py-8 text-center text-xs text-slate-400">
                      Loading verification records...
                    </div>

                  ) : scanHistory.length === 0 ? (

                    <div className="py-8 text-center text-xs text-slate-400">
                      No receipt verification records found.
                    </div>

                  ) : (

                    scanHistory.map(
                      (
                        item,
                        idx
                      ) => {

                        const dataObj =
                          item.extractedData ||
                          item;

                        const historyStatus =
                          dataObj.calculationStatus ||
                          item.status ||
                          'verified';

                        return (

                          <button
                            type="button"
                            key={
                              item._id ||
                              idx
                            }
                            onClick={() => {

                              const selected = {
                                ...dataObj,

                                _id:
                                  item._id,

                                id:
                                  item._id,

                                status:
                                  item.status ||
                                  dataObj.status ||
                                  'success',
                              };

                              setExtractedData(
                                selected
                              );

                              setEditedData(
                                JSON.parse(
                                  JSON.stringify(
                                    selected
                                  )
                                )
                              );

                              setIsEditing(
                                false
                              );

                              setErrorMessage(
                                ''
                              );

                              setSuccessMessage(
                                ''
                              );
                            }}
                            className="w-full text-left p-3 rounded-xl bg-slate-50 dark:bg-dark-bg/60 border border-slate-200 dark:border-dark-border/60 flex items-center justify-between text-xs cursor-pointer hover:border-brand-500 transition-colors"
                          >

                            <div className="min-w-0">

                              <p className="font-semibold text-slate-900 dark:text-white truncate">

                                {dataObj.vendorName ||
                                  dataObj.merchantName ||
                                  'Unknown Vendor'}

                              </p>

                              <p className="text-[10px] text-slate-400 mt-0.5">

                                {dataObj.invoiceNumber ||
                                  'No receipt number'}{' '}

                                •{' '}

                                {dataObj.date
                                  ? formatDateOnly(
                                      dataObj.date
                                    )
                                  : 'No date'}

                              </p>

                            </div>


                            <div className="text-right ml-3 shrink-0">

                              <p className="font-bold text-slate-900 dark:text-white">

                                {formatCurrency(
                                  dataObj.calculatedGrandTotal ??
                                  dataObj.totalAmount,
                                  dataObj.currency ||
                                  'NGN'
                                )}

                              </p>

                              <span
                                className={`inline-block text-[9px] font-bold px-1.5 py-0.5 rounded mt-0.5 ${
                                  historyStatus ===
                                  'verified'
                                    ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10'
                                    : historyStatus ===
                                      'discrepancy'
                                      ? 'text-red-600 dark:text-red-400 bg-red-500/10'
                                      : 'text-amber-600 dark:text-amber-400 bg-amber-500/10'
                                }`}
                              >

                                {String(
                                  historyStatus
                                ).toUpperCase()}

                              </span>

                            </div>

                          </button>

                        );
                      }
                    )

                  )}

                </div>

              </div>

            </div>


            {/* =================================================
                RESULTS
            ================================================== */}

            <div className="lg:col-span-7">

              <div className="p-6 border border-slate-200 dark:border-dark-border rounded-2xl bg-white dark:bg-dark-card shadow-sm min-h-[520px]">

                {/* RESULTS HEADER */}

                <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-dark-border mb-6">

                  <div>

                    <div className="flex items-center gap-2">

                      <Calculator className="w-5 h-5 text-brand-500" />

                      <h3 className="text-base font-bold text-slate-900 dark:text-white">
                        Receipt Calculation
                      </h3>

                    </div>

                    <p className="text-[11px] text-slate-400 mt-1">
                      Invoice-style breakdown generated from the receipt.
                    </p>

                  </div>


                  {extractedData && (

                    <div className="flex items-center gap-2 flex-wrap">

                      {!isEditing ? (

                        <button
                          type="button"
                          onClick={() =>
                            setIsEditing(
                              true
                            )
                          }
                          className="px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-dark-bg border border-slate-200 dark:border-dark-border rounded-xl flex items-center gap-1.5 transition-colors"
                        >

                          <Edit3 className="w-3.5 h-3.5" />

                          Edit

                        </button>

                      ) : (

                        <button
                          type="button"
                          onClick={
                            handleSaveEdits
                          }
                          className="px-3 py-1.5 text-xs font-medium text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl flex items-center gap-1.5 transition-colors shadow-sm"
                        >

                          <Save className="w-3.5 h-3.5" />

                          Save Changes

                        </button>

                      )}


                      <button
                        type="button"
                        onClick={
                          handleExportPDF
                        }
                        disabled={
                          isExportingPDF
                        }
                        className="px-3 py-1.5 text-xs font-medium text-red-600 dark:text-red-400 bg-red-500/10 hover:bg-red-500/15 border border-red-500/20 rounded-xl flex items-center gap-1.5 transition-colors disabled:opacity-50"
                      >

                        {isExportingPDF ? (
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <FileDown className="w-3.5 h-3.5" />
                        )}

                        PDF

                      </button>


                      <button
                        type="button"
                        onClick={
                          handleExportExcel
                        }
                        disabled={
                          isExportingExcel
                        }
                        className="px-3 py-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/15 border border-emerald-500/20 rounded-xl flex items-center gap-1.5 transition-colors disabled:opacity-50"
                      >

                        {isExportingExcel ? (
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <FileSpreadsheet className="w-3.5 h-3.5" />
                        )}

                        Excel

                      </button>


                      <button
                        type="button"
                        onClick={
                          handleExportCSV
                        }
                        className="px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-dark-bg hover:bg-slate-200 dark:hover:bg-dark-border rounded-xl flex items-center gap-1.5 transition-colors"
                      >

                        <FileSpreadsheet className="w-3.5 h-3.5" />

                        CSV

                      </button>


                      <button
                        type="button"
                        onClick={
                          handleExportJSON
                        }
                        className="px-3 py-1.5 text-xs font-medium text-brand-600 dark:text-brand-400 bg-brand-500/10 border border-brand-500/20 hover:bg-brand-500/15 rounded-xl flex items-center gap-1.5 transition-colors"
                      >

                        <Download className="w-3.5 h-3.5" />

                        JSON

                      </button>

                    </div>

                  )}

                </div>


                {/* =================================================
                    PROCESSING
                ================================================== */}

                {isProcessing ? (

                  <div className="py-28 text-center space-y-4">

                    <RefreshCw className="w-10 h-10 text-brand-500 animate-spin mx-auto" />

                    <div>

                      <p className="text-sm font-semibold text-slate-900 dark:text-slate-200">
                        Processing Receipt
                      </p>

                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        Running OCR, AI extraction, item calculation and verification...
                      </p>

                    </div>

                    <div className="flex justify-center gap-2 flex-wrap pt-2">

                      <span className="px-2.5 py-1 rounded-full bg-brand-500/10 text-brand-600 dark:text-brand-400 text-[10px] font-semibold">
                        OCR
                      </span>

                      <span className="px-2.5 py-1 rounded-full bg-brand-500/10 text-brand-600 dark:text-brand-400 text-[10px] font-semibold">
                        AI Extraction
                      </span>

                      <span className="px-2.5 py-1 rounded-full bg-brand-500/10 text-brand-600 dark:text-brand-400 text-[10px] font-semibold">
                        Calculation
                      </span>

                      <span className="px-2.5 py-1 rounded-full bg-brand-500/10 text-brand-600 dark:text-brand-400 text-[10px] font-semibold">
                        Verification
                      </span>

                    </div>

                  </div>

                ) : extractedData ? (

                  <div className="space-y-6">


                    {/* =================================================
                        RECEIPT HEADER INFORMATION
                    ================================================== */}

                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">


                      {/* VENDOR */}

                      <div className="bg-slate-50 dark:bg-dark-bg/60 p-3.5 rounded-xl border border-slate-200 dark:border-dark-border/60 sm:col-span-2">

                        <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">
                          Vendor / Merchant
                        </span>

                        {isEditing ? (

                          <input
                            type="text"
                            value={
                              editedData?.vendorName ||
                              editedData?.merchantName ||
                              ''
                            }
                            onChange={(
                              event
                            ) => {
                              const value =
                                event.target
                                  .value;

                              setEditedData({
                                ...editedData,
                                vendorName:
                                  value,
                                merchantName:
                                  value,
                              });
                            }}
                            className="w-full mt-1 bg-white dark:bg-dark-card border border-slate-300 dark:border-dark-border text-xs px-2.5 py-1.5 rounded-lg text-slate-900 dark:text-white"
                          />

                        ) : (

                          <p className="text-sm font-semibold text-slate-900 dark:text-white mt-1 truncate">
                            {extractedData.vendorName ||
                              extractedData.merchantName ||
                              'N/A'}
                          </p>

                        )}

                      </div>


                      {/* RECEIPT NUMBER */}

                      <div className="bg-slate-50 dark:bg-dark-bg/60 p-3.5 rounded-xl border border-slate-200 dark:border-dark-border/60">

                        <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">
                          Receipt #
                        </span>

                        {isEditing ? (

                          <input
                            type="text"
                            value={
                              editedData?.invoiceNumber ||
                              ''
                            }
                            onChange={(
                              event
                            ) =>
                              handleFieldChange(
                                'invoiceNumber',
                                event.target.value
                              )
                            }
                            className="w-full mt-1 bg-white dark:bg-dark-card border border-slate-300 dark:border-dark-border text-xs px-2.5 py-1.5 rounded-lg text-slate-900 dark:text-white"
                          />

                        ) : (

                          <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 mt-1 truncate">
                            {extractedData.invoiceNumber ||
                              'N/A'}
                          </p>

                        )}

                      </div>


                      {/* DATE */}

                      <div className="bg-slate-50 dark:bg-dark-bg/60 p-3.5 rounded-xl border border-slate-200 dark:border-dark-border/60">

                        <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">
                          Date
                        </span>

                        {isEditing ? (

                          <input
                            type="date"
                            value={
                              editedData?.date
                                ? formatDateOnly(
                                    editedData.date
                                  )
                                : ''
                            }
                            onChange={(
                              event
                            ) =>
                              handleFieldChange(
                                'date',
                                event.target.value
                              )
                            }
                            className="w-full mt-1 bg-white dark:bg-dark-card border border-slate-300 dark:border-dark-border text-xs px-2.5 py-1.5 rounded-lg text-slate-900 dark:text-white"
                          />

                        ) : (

                          <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 mt-1">
                            {formatDateOnly(
                              extractedData.date
                            )}
                          </p>

                        )}

                      </div>


                      {/* CURRENCY */}

                      <div className="bg-slate-50 dark:bg-dark-bg/60 p-3.5 rounded-xl border border-slate-200 dark:border-dark-border/60">

                        <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">
                          Currency
                        </span>

                        {isEditing ? (

                          <input
                            type="text"
                            value={
                              editedData?.currency ||
                              'NGN'
                            }
                            onChange={(
                              event
                            ) =>
                              handleFieldChange(
                                'currency',
                                event.target.value.toUpperCase()
                              )
                            }
                            className="w-full mt-1 bg-white dark:bg-dark-card border border-slate-300 dark:border-dark-border text-xs px-2.5 py-1.5 rounded-lg text-slate-900 dark:text-white uppercase"
                          />

                        ) : (

                          <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 mt-1">
                            {extractedData.currency ||
                              'NGN'}
                          </p>

                        )}

                      </div>


                      {/* CONFIDENCE */}

                      <div className="bg-slate-50 dark:bg-dark-bg/60 p-3.5 rounded-xl border border-slate-200 dark:border-dark-border/60">

                        <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">
                          AI Confidence
                        </span>

                        <p className="text-sm font-semibold text-brand-600 dark:text-brand-400 mt-1">
                          {extractedData.confidenceScore ||
                            'N/A'}
                        </p>

                      </div>


                      {/* STATUS */}

                      <div className="bg-slate-50 dark:bg-dark-bg/60 p-3.5 rounded-xl border border-slate-200 dark:border-dark-border/60 sm:col-span-2">

                        <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">
                          Calculation Status
                        </span>

                        <div className="mt-1">

                          <span
                            className={`inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-full border ${statusConfig.classes}`}
                          >

                            <StatusIcon className="w-3 h-3" />

                            {statusConfig.label}

                          </span>

                        </div>

                      </div>

                    </div>


                    {/* =================================================
                        DISCREPANCY ALERT
                    ================================================== */}

                    {calculationStatus ===
                      'discrepancy' && (

                      <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20">

                        <div className="flex items-start gap-3">

                          <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />

                          <div>

                            <p className="text-xs font-bold text-red-600 dark:text-red-400">
                              Receipt total does not match the calculated total.
                            </p>

                            <p className="text-[11px] text-red-600/80 dark:text-red-400/80 mt-1">

                              Extracted receipt total:{' '}

                              <strong>
                                {formatCurrency(
                                  calculatedData.originalReceiptTotal,
                                  calculatedData.currency
                                )}
                              </strong>

                              {' • '}

                              Calculated total:{' '}

                              <strong>
                                {formatCurrency(
                                  calculatedData.calculatedGrandTotal,
                                  calculatedData.currency
                                )}
                              </strong>

                              {' • '}

                              Difference:{' '}

                              <strong>
                                {formatCurrency(
                                  calculatedData.calculationDifference,
                                  calculatedData.currency
                                )}
                              </strong>

                            </p>

                          </div>

                        </div>

                      </div>

                    )}


                    {/* =================================================
                        LINE ITEMS
                    ================================================== */}

                    <div>

                      <div className="flex items-center justify-between mb-2">

                        <div>

                          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                            Itemized Receipt Breakdown
                          </h4>

                          <p className="text-[10px] text-slate-400 mt-1">
                            Automatically extracted and calculated line items.
                          </p>

                        </div>

                        {isEditing && (

                          <button
                            type="button"
                            onClick={
                              handleAddLineItem
                            }
                            className="text-xs font-semibold text-brand-600 dark:text-brand-400 hover:underline flex items-center gap-1"
                          >

                            <Plus className="w-3.5 h-3.5" />

                            Add Item

                          </button>

                        )}

                      </div>


                      <div className="overflow-x-auto border border-slate-200 dark:border-dark-border rounded-xl">

                        <table className="w-full text-left text-xs min-w-[620px]">

                          <thead className="bg-slate-100 dark:bg-dark-bg text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-dark-border">

                            <tr>

                              <th className="p-3 w-12 text-center">
                                S/N
                              </th>

                              <th className="p-3">
                                Description
                              </th>

                              <th className="p-3 w-20 text-center">
                                Qty
                              </th>

                              <th className="p-3 w-32 text-right">
                                Price
                              </th>

                              <th className="p-3 w-32 text-right">
                                Total
                              </th>

                              {isEditing && (
                                <th className="p-3 w-10 text-center" />
                              )}

                            </tr>

                          </thead>


                          <tbody className="divide-y divide-slate-200 dark:divide-dark-border/50 text-slate-700 dark:text-slate-300">

                            {(
                              calculatedData?.lineItems ||
                              []
                            ).length > 0 ? (

                              calculatedData.lineItems.map(
                                (
                                  item,
                                  idx
                                ) => (

                                  <tr
                                    key={
                                      item._id ||
                                      idx
                                    }
                                    className="hover:bg-slate-50 dark:hover:bg-dark-bg/30"
                                  >

                                    <td className="p-3 text-center font-semibold text-slate-400">
                                      {idx + 1}
                                    </td>


                                    <td className="p-3 font-medium text-slate-900 dark:text-white">

                                      {isEditing ? (

                                        <input
                                          type="text"
                                          value={
                                            editedData?.lineItems?.[idx]?.description ||
                                            ''
                                          }
                                          onChange={(
                                            event
                                          ) =>
                                            handleItemChange(
                                              idx,
                                              'description',
                                              event.target.value
                                            )
                                          }
                                          className="w-full min-w-[180px] bg-white dark:bg-dark-card border border-slate-300 dark:border-dark-border text-xs px-2.5 py-1.5 rounded-lg text-slate-900 dark:text-white"
                                        />

                                      ) : (

                                        item.description ||
                                        'Unnamed Item'

                                      )}

                                    </td>


                                    <td className="p-3 text-center">

                                      {isEditing ? (

                                        <input
                                          type="number"
                                          min="0"
                                          step="any"
                                          value={
                                            editedData?.lineItems?.[idx]?.qty ??
                                            1
                                          }
                                          onChange={(
                                            event
                                          ) =>
                                            handleItemChange(
                                              idx,
                                              'qty',
                                              event.target.value
                                            )
                                          }
                                          className="w-20 mx-auto bg-white dark:bg-dark-card border border-slate-300 dark:border-dark-border text-xs px-2.5 py-1.5 rounded-lg text-center text-slate-900 dark:text-white"
                                        />

                                      ) : (

                                        item.qty

                                      )}

                                    </td>


                                    <td className="p-3 text-right">

                                      {isEditing ? (

                                        <input
                                          type="number"
                                          min="0"
                                          step="0.01"
                                          value={
                                            editedData?.lineItems?.[idx]?.unitPrice ??
                                            0
                                          }
                                          onChange={(
                                            event
                                          ) =>
                                            handleItemChange(
                                              idx,
                                              'unitPrice',
                                              event.target.value
                                            )
                                          }
                                          className="w-28 ml-auto bg-white dark:bg-dark-card border border-slate-300 dark:border-dark-border text-xs px-2.5 py-1.5 rounded-lg text-right text-slate-900 dark:text-white"
                                        />

                                      ) : (

                                        formatCurrency(
                                          item.unitPrice,
                                          calculatedData.currency
                                        )

                                      )}

                                    </td>


                                    <td className="p-3 text-right font-bold text-slate-900 dark:text-slate-100">

                                      {formatCurrency(
                                        item.total,
                                        calculatedData.currency
                                      )}

                                    </td>


                                    {isEditing && (

                                      <td className="p-3 text-center">

                                        <button
                                          type="button"
                                          onClick={() =>
                                            handleRemoveLineItem(
                                              idx
                                            )
                                          }
                                          className="text-red-500 hover:text-red-600 transition-colors"
                                          title="Remove item"
                                        >

                                          <X className="w-4 h-4" />

                                        </button>

                                      </td>

                                    )}

                                  </tr>

                                )
                              )

                            ) : (

                              <tr>

                                <td
                                  colSpan={
                                    isEditing
                                      ? 6
                                      : 5
                                  }
                                  className="p-8 text-center text-xs text-slate-400"
                                >

                                  No line items were extracted.

                                  {isEditing && (
                                    <button
                                      type="button"
                                      onClick={
                                        handleAddLineItem
                                      }
                                      className="block mx-auto mt-2 text-brand-600 dark:text-brand-400 font-semibold hover:underline"
                                    >
                                      + Add first item
                                    </button>
                                  )}

                                </td>

                              </tr>

                            )}

                          </tbody>

                        </table>

                      </div>

                    </div>


                    {/* =================================================
                        ADJUSTMENTS
                    ================================================== */}

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

                      {/* DISCOUNT */}

                      <div className="p-4 rounded-xl border border-slate-200 dark:border-dark-border bg-slate-50 dark:bg-dark-bg/40">

                        <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-400">
                          Discount
                        </span>

                        {isEditing ? (

                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={
                              editedData?.discountAmount ??
                              0
                            }
                            onChange={(
                              event
                            ) =>
                              handleFieldChange(
                                'discountAmount',
                                event.target.value
                              )
                            }
                            className="w-full mt-2 bg-white dark:bg-dark-card border border-slate-300 dark:border-dark-border rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white"
                          />

                        ) : (

                          <p className="text-sm font-bold mt-2">
                            {formatCurrency(
                              calculatedData.discountAmount,
                              calculatedData.currency
                            )}
                          </p>

                        )}

                      </div>


                      {/* TAX */}

                      <div className="p-4 rounded-xl border border-slate-200 dark:border-dark-border bg-slate-50 dark:bg-dark-bg/40">

                        <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-400">
                          Tax
                        </span>

                        {isEditing ? (

                          <div className="flex gap-2 mt-2">

                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={
                                editedData?.taxRate ??
                                0
                              }
                              onChange={(
                                event
                              ) =>
                                handleFieldChange(
                                  'taxRate',
                                  event.target.value
                                )
                              }
                              className="w-20 bg-white dark:bg-dark-card border border-slate-300 dark:border-dark-border rounded-lg px-2 py-2 text-sm text-slate-900 dark:text-white"
                              placeholder="%"
                            />

                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={
                                editedData?.taxAmount ??
                                0
                              }
                              onChange={(
                                event
                              ) =>
                                handleFieldChange(
                                  'taxAmount',
                                  event.target.value
                                )
                              }
                              className="flex-1 min-w-0 bg-white dark:bg-dark-card border border-slate-300 dark:border-dark-border rounded-lg px-2 py-2 text-sm text-slate-900 dark:text-white"
                              placeholder="Amount"
                            />

                          </div>

                        ) : (

                          <p className="text-sm font-bold mt-2">

                            {formatCurrency(
                              calculatedData.taxAmount,
                              calculatedData.currency
                            )}

                            <span className="text-[10px] text-slate-400 ml-1">
                              ({calculatedData.taxRate || 0}%)
                            </span>

                          </p>

                        )}

                      </div>


                      {/* SERVICE CHARGE */}

                      <div className="p-4 rounded-xl border border-slate-200 dark:border-dark-border bg-slate-50 dark:bg-dark-bg/40">

                        <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-400">
                          Service Charge
                        </span>

                        {isEditing ? (

                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={
                              editedData?.serviceCharge ??
                              0
                            }
                            onChange={(
                              event
                            ) =>
                              handleFieldChange(
                                'serviceCharge',
                                event.target.value
                              )
                            }
                            className="w-full mt-2 bg-white dark:bg-dark-card border border-slate-300 dark:border-dark-border rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white"
                          />

                        ) : (

                          <p className="text-sm font-bold mt-2">
                            {formatCurrency(
                              calculatedData.serviceCharge,
                              calculatedData.currency
                            )}
                          </p>

                        )}

                      </div>

                    </div>


                    {/* =================================================
                        TOTALS
                    ================================================== */}

                    <div className="rounded-2xl border border-slate-200 dark:border-dark-border overflow-hidden">

                      <div className="bg-slate-50 dark:bg-dark-bg/60 p-5">

                        <div className="max-w-md ml-auto space-y-3">

                          <div className="flex items-center justify-between text-sm">

                            <span className="text-slate-500 dark:text-slate-400">
                              Subtotal
                            </span>

                            <span className="font-semibold text-slate-900 dark:text-white">
                              {formatCurrency(
                                calculatedData.subtotal,
                                calculatedData.currency
                              )}
                            </span>

                          </div>


                          {calculatedData.discountAmount > 0 && (

                            <div className="flex items-center justify-between text-sm">

                              <span className="text-slate-500 dark:text-slate-400">
                                Discount
                              </span>

                              <span className="font-semibold text-red-500">
                                -{formatCurrency(
                                  calculatedData.discountAmount,
                                  calculatedData.currency
                                )}
                              </span>

                            </div>

                          )}


                          {calculatedData.taxAmount > 0 && (

                            <div className="flex items-center justify-between text-sm">

                              <span className="text-slate-500 dark:text-slate-400">
                                Tax ({calculatedData.taxRate || 0}%)
                              </span>

                              <span className="font-semibold text-slate-900 dark:text-white">
                                {formatCurrency(
                                  calculatedData.taxAmount,
                                  calculatedData.currency
                                )}
                              </span>

                            </div>

                          )}


                          {calculatedData.serviceCharge > 0 && (

                            <div className="flex items-center justify-between text-sm">

                              <span className="text-slate-500 dark:text-slate-400">
                                Service Charge
                              </span>

                              <span className="font-semibold text-slate-900 dark:text-white">
                                {formatCurrency(
                                  calculatedData.serviceCharge,
                                  calculatedData.currency
                                )}
                              </span>

                            </div>

                          )}


                          <div className="pt-3 mt-2 border-t border-slate-200 dark:border-dark-border flex items-center justify-between">

                            <span className="text-sm font-bold text-slate-900 dark:text-white">
                              GRAND TOTAL
                            </span>

                            <span className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400">
                              {formatCurrency(
                                calculatedData.calculatedGrandTotal,
                                calculatedData.currency
                              )}
                            </span>

                          </div>

                        </div>

                      </div>


                      {/* ORIGINAL RECEIPT TOTAL */}

                      <div className="px-5 py-4 bg-white dark:bg-dark-card border-t border-slate-200 dark:border-dark-border">

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

                          <div>

                            <p className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">
                              Receipt Total
                            </p>

                            <p className="text-sm font-bold text-slate-900 dark:text-white mt-1">
                              {formatCurrency(
                                calculatedData.originalReceiptTotal,
                                calculatedData.currency
                              )}
                            </p>

                          </div>


                          <div>

                            <p className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">
                              Difference
                            </p>

                            <p
                              className={`text-sm font-bold mt-1 ${
                                Math.abs(
                                  calculatedData.calculationDifference
                                ) <= 0.01
                                  ? 'text-emerald-600 dark:text-emerald-400'
                                  : 'text-red-600 dark:text-red-400'
                              }`}
                            >
                              {formatCurrency(
                                calculatedData.calculationDifference,
                                calculatedData.currency
                              )}
                            </p>

                          </div>


                          <div>

                            <p className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">
                              Result
                            </p>

                            <span
                              className={`inline-flex items-center gap-1.5 mt-1 px-2.5 py-1 rounded-full text-[10px] font-bold border ${statusConfig.classes}`}
                            >

                              <StatusIcon className="w-3 h-3" />

                              {statusConfig.label}

                            </span>

                          </div>

                        </div>

                      </div>

                    </div>


                    {/* =================================================
                        EXPORT CTA
                    ================================================== */}

                    <div className="p-4 rounded-2xl bg-brand-500/5 border border-brand-500/15">

                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">

                        <div>

                          <p className="text-xs font-bold text-slate-900 dark:text-white">
                            Save this verification report
                          </p>

                          <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
                            Download the calculated receipt as PDF or Excel for your records.
                          </p>

                        </div>

                        <div className="flex items-center gap-2">

                          <button
                            type="button"
                            onClick={
                              handleExportPDF
                            }
                            disabled={
                              isExportingPDF
                            }
                            className="px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold flex items-center gap-2 transition-colors disabled:opacity-50"
                          >

                            {isExportingPDF ? (
                              <RefreshCw className="w-4 h-4 animate-spin" />
                            ) : (
                              <FileDown className="w-4 h-4" />
                            )}

                            PDF

                          </button>

                          <button
                            type="button"
                            onClick={
                              handleExportExcel
                            }
                            disabled={
                              isExportingExcel
                            }
                            className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-2 transition-colors disabled:opacity-50"
                          >

                            {isExportingExcel ? (
                              <RefreshCw className="w-4 h-4 animate-spin" />
                            ) : (
                              <FileSpreadsheet className="w-4 h-4" />
                            )}

                            Excel

                          </button>

                        </div>

                      </div>

                    </div>

                  </div>

                ) : (

                  <div className="py-28 text-center space-y-4">

                    <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-dark-bg text-slate-400 dark:text-slate-600 flex items-center justify-center mx-auto shadow-inner">

                      <Receipt className="w-8 h-8" />

                    </div>

                    <div>

                      <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                        No Receipt Selected
                      </p>

                      <p className="text-xs max-w-md mx-auto text-slate-400 mt-1 leading-relaxed">
                        Upload a receipt or take a photo. EAZY DON CHECK will extract the receipt data, calculate every item, compare the calculated grand total with the receipt total, and prepare a downloadable verification report.
                      </p>

                    </div>

                    <div className="flex items-center justify-center gap-2 flex-wrap pt-2">

                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-dark-bg text-[10px] font-semibold text-slate-500 dark:text-slate-400">

                        <Camera className="w-3 h-3" />

                        Capture

                      </span>

                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-dark-bg text-[10px] font-semibold text-slate-500 dark:text-slate-400">

                        <Sparkles className="w-3 h-3" />

                        Extract

                      </span>

                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-dark-bg text-[10px] font-semibold text-slate-500 dark:text-slate-400">

                        <Calculator className="w-3 h-3" />

                        Calculate

                      </span>

                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-dark-bg text-[10px] font-semibold text-slate-500 dark:text-slate-400">

                        <FileDown className="w-3 h-3" />

                        Export

                      </span>

                    </div>

                  </div>

                )}

              </div>

            </div>

          </div>

        </div>

      </div>

    </AppLayout>
  );
};


export default Dashboard;