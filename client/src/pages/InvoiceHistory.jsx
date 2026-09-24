import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Search,
  Plus,
  FileText,
  Download,
  FileSpreadsheet,
  Eye,
  Edit3,
  Copy,
  Trash2,
  MoreVertical,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  X,
  CheckCircle2,
  Clock3,
  AlertTriangle,
  XCircle,
  CreditCard,
  ReceiptText,
  CalendarDays,
  UserRound,
  Building2,
  Loader2,
  ExternalLink,
} from "lucide-react";

import {
  useNavigate,
} from "react-router-dom";

import AppLayout from "../components/layout/AppLayout";

import apiClient from "../utils/apiClient";

const STATUS_OPTIONS = [
  {
    value: "",
    label: "All Statuses",
  },
  {
    value: "draft",
    label: "Draft",
  },
  {
    value: "sent",
    label: "Sent",
  },
  {
    value: "paid",
    label: "Paid",
  },
  {
    value: "partially_paid",
    label: "Partially Paid",
  },
  {
    value: "overdue",
    label: "Overdue",
  },
  {
    value: "cancelled",
    label: "Cancelled",
  },
];

const PAGE_SIZE = 20;

const roundMoney = (value) => {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return 0;
  }

  return Math.round(
    (number + Number.EPSILON) * 100
  ) / 100;
};

const formatMoney = (
  amount,
  currency = "NGN"
) => {
  const numericAmount =
    Number(amount) || 0;

  try {
    return new Intl.NumberFormat(
      "en-NG",
      {
        style: "currency",
        currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }
    ).format(numericAmount);
  } catch {
    return `${currency} ${numericAmount.toFixed(
      2
    )}`;
  }
};

const formatDate = (
  value
) => {
  if (!value) {
    return "—";
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return String(value);
  }

  return new Intl.DateTimeFormat(
    "en-NG",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }
  ).format(date);
};

const getInvoiceId = (
  invoice
) => {
  return (
    invoice?.id ||
    invoice?._id ||
    invoice?.invoiceId ||
    null
  );
};

const getCustomerName = (
  invoice
) => {
  return (
    invoice?.customer?.name ||
    invoice?.customer?.companyName ||
    "Walk-in Customer"
  );
};

const getStatusLabel = (
  status
) => {
  const option =
    STATUS_OPTIONS.find(
      (item) =>
        item.value === status
    );

  return (
    option?.label ||
    "Draft"
  );
};

const InvoiceHistory = () => {
  const navigate =
    useNavigate();

  const [
    invoices,
    setInvoices,
  ] = useState([]);

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
  ] = useState("");

  const [
    success,
    setSuccess,
  ] = useState("");

  const [
    search,
    setSearch,
  ] = useState("");

  const [
    status,
    setStatus,
  ] = useState("");

  const [
    page,
    setPage,
  ] = useState(1);

  const [
    totalPages,
    setTotalPages,
  ] = useState(1);

  const [
    totalInvoices,
    setTotalInvoices,
  ] = useState(0);

  const [
    activeMenu,
    setActiveMenu,
  ] = useState(null);

  const [
    selectedInvoice,
    setSelectedInvoice,
  ] = useState(null);

  const [
    showViewModal,
    setShowViewModal,
  ] = useState(false);

  const [
    showPaymentModal,
    setShowPaymentModal,
  ] = useState(false);

  const [
    paymentAmount,
    setPaymentAmount,
  ] = useState("");

  const [
    actionLoading,
    setActionLoading,
  ] = useState(false);

  const [
    actionInvoiceId,
    setActionInvoiceId,
  ] = useState(null);

  const fetchInvoices =
    useCallback(
      async ({
        silent = false,
      } = {}) => {
        if (!silent) {
          setLoading(true);
        } else {
          setRefreshing(true);
        }

        setError("");

        try {
          const params = {
            page,
            limit: PAGE_SIZE,
          };

          if (
            search.trim()
          ) {
            params.search =
              search.trim();
          }

          if (status) {
            params.status =
              status;
          }

          const response =
            await apiClient.get(
              "/invoices",
              {
                params,
              }
            );

          const body =
            response?.data ||
            {};

          const data =
            body?.data ||
            body?.invoices ||
            [];

          setInvoices(
            Array.isArray(data)
              ? data
              : []
          );

          setTotalInvoices(
            Number(
              body?.total ||
                data?.length ||
                0
            )
          );

          setTotalPages(
            Math.max(
              1,
              Number(
                body?.pages ||
                  1
              )
            )
          );
        } catch (
          requestError
        ) {
          console.error(
            "FETCH INVOICES ERROR:",
            requestError
          );

          setError(
            requestError?.response
              ?.data?.message ||
              requestError?.message ||
              "Failed to load invoices."
          );
        } finally {
          setLoading(false);
          setRefreshing(false);
        }
      },
      [
        page,
        search,
        status,
      ]
    );

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  useEffect(() => {
    const closeMenu =
      () => {
        setActiveMenu(null);
      };

    window.addEventListener(
      "click",
      closeMenu
    );

    return () => {
      window.removeEventListener(
        "click",
        closeMenu
      );
    };
  }, []);

  const clearMessages =
    () => {
      setError("");
      setSuccess("");
    };

  const handleSearch =
    (event) => {
      setSearch(
        event.target.value
      );
      setPage(1);
    };

  const handleStatusChange =
    (event) => {
      setStatus(
        event.target.value
      );
      setPage(1);
    };

  const handleRefresh =
    async () => {
      clearMessages();

      await fetchInvoices({
        silent: true,
      });
    };

  const handleView =
    (invoice) => {
      setSelectedInvoice(
        invoice
      );

      setShowViewModal(
        true
      );

      setActiveMenu(null);
    };

  const handleEdit =
    (invoice) => {
      const id =
        getInvoiceId(invoice);

      if (!id) {
        return;
      }

      navigate(
        `/invoice-generator?id=${id}`
      );
    };

  const handleDuplicate =
    async (invoice) => {
      const id =
        getInvoiceId(invoice);

      if (!id) {
        return;
      }

      clearMessages();
      setActionLoading(true);
      setActionInvoiceId(id);
      setActiveMenu(null);

      try {
        const response =
          await apiClient.post(
            `/invoices/${id}/duplicate`
          );

        const duplicated =
          response?.data?.data ||
          response?.data;

        setSuccess(
          "Invoice duplicated successfully."
        );

        if (
          duplicated?.id
        ) {
          navigate(
            `/invoice-generator?id=${duplicated.id}`
          );
        } else {
          await fetchInvoices({
            silent: true,
          });
        }
      } catch (
        requestError
      ) {
        console.error(
          "DUPLICATE INVOICE ERROR:",
          requestError
        );

        setError(
          requestError?.response
            ?.data?.message ||
            requestError?.message ||
            "Failed to duplicate invoice."
        );
      } finally {
        setActionLoading(false);
        setActionInvoiceId(null);
      }
    };

  const handleDelete =
    async (invoice) => {
      const id =
        getInvoiceId(invoice);

      if (!id) {
        return;
      }

      const confirmed =
        window.confirm(
          `Delete invoice ${invoice.invoiceNumber || ""}? This action cannot be undone.`
        );

      if (!confirmed) {
        return;
      }

      clearMessages();
      setActionLoading(true);
      setActionInvoiceId(id);
      setActiveMenu(null);

      try {
        await apiClient.delete(
          `/invoices/${id}`
        );

        setSuccess(
          "Invoice deleted successfully."
        );

        await fetchInvoices({
          silent: true,
        });
      } catch (
        requestError
      ) {
        console.error(
          "DELETE INVOICE ERROR:",
          requestError
        );

        setError(
          requestError?.response
            ?.data?.message ||
            requestError?.message ||
            "Failed to delete invoice."
        );
      } finally {
        setActionLoading(false);
        setActionInvoiceId(null);
      }
    };

  const handleStatusUpdate =
    async (
      invoice,
      nextStatus
    ) => {
      const id =
        getInvoiceId(invoice);

      if (!id) {
        return;
      }

      clearMessages();
      setActionLoading(true);
      setActionInvoiceId(id);
      setActiveMenu(null);

      try {
        const response =
          await apiClient.patch(
            `/invoices/${id}/status`,
            {
              status:
                nextStatus,
            }
          );

        const updated =
          response?.data?.data ||
          response?.data;

        setInvoices(
          (previous) =>
            previous.map(
              (item) =>
                getInvoiceId(
                  item
                ) === id
                  ? {
                      ...item,
                      ...(updated ||
                        {}),
                      status:
                        updated?.status ||
                        nextStatus,
                    }
                  : item
            )
        );

        setSuccess(
          `Invoice marked as ${getStatusLabel(
            nextStatus
          ).toLowerCase()}.`
        );
      } catch (
        requestError
      ) {
        console.error(
          "UPDATE INVOICE STATUS ERROR:",
          requestError
        );

        setError(
          requestError?.response
            ?.data?.message ||
            requestError?.message ||
            "Failed to update invoice status."
        );
      } finally {
        setActionLoading(false);
        setActionInvoiceId(null);
      }
    };

  const openPaymentModal =
    (invoice) => {
      setSelectedInvoice(
        invoice
      );

      setPaymentAmount("");

      setShowPaymentModal(
        true
      );

      setActiveMenu(null);
    };

  const handlePayment =
    async () => {
      const id =
        getInvoiceId(
          selectedInvoice
        );

      const amount =
        Number(paymentAmount);

      if (!id) {
        return;
      }

      if (
        !Number.isFinite(
          amount
        ) ||
        amount <= 0
      ) {
        setError(
          "Enter a valid payment amount."
        );

        return;
      }

      setActionLoading(true);
      setActionInvoiceId(id);
      setError("");

      try {
        const response =
          await apiClient.post(
            `/invoices/${id}/payment`,
            {
              amount,
            }
          );

        const updated =
          response?.data?.data ||
          response?.data;

        setInvoices(
          (previous) =>
            previous.map(
              (item) =>
                getInvoiceId(
                  item
                ) === id
                  ? {
                      ...item,
                      ...(updated ||
                        {}),
                    }
                  : item
            )
        );

        setSelectedInvoice(
          updated
        );

        setShowPaymentModal(
          false
        );

        setPaymentAmount("");

        setSuccess(
          "Invoice payment recorded successfully."
        );
      } catch (
        requestError
      ) {
        console.error(
          "RECORD PAYMENT ERROR:",
          requestError
        );

        setError(
          requestError?.response
            ?.data?.message ||
            requestError?.message ||
            "Failed to record payment."
        );
      } finally {
        setActionLoading(false);
        setActionInvoiceId(null);
      }
    };

  const markExported =
    async (invoice) => {
      const id =
        getInvoiceId(invoice);

      if (!id) {
        return;
      }

      try {
        await apiClient.post(
          `/invoices/${id}/exported`
        );
      } catch (
        requestError
      ) {
        console.warn(
          "MARK EXPORTED ERROR:",
          requestError
        );
      }
    };

  const exportExcel =
    async (invoice) => {
      setActiveMenu(null);
      clearMessages();

      const items =
        Array.isArray(
          invoice.items
        )
          ? invoice.items
          : [];

      const rows =
        items.length > 0
          ? items.map(
              (
                item,
                index
              ) => ({
                "S/N":
                  index + 1,

                Description:
                  item.description ||
                  "",

                Qty:
                  Number(
                    item.qty
                  ) || 0,

                Price:
                  Number(
                    item.unitPrice
                  ) || 0,

                Total:
                  Number(
                    item.total
                  ) || 0,
              })
            )
          : [
              {
                "S/N": "",
                Description: "",
                Qty: "",
                Price: "",
                Total: "",
              },
            ];

      const summaryRows = [
        {},
        {
          "S/N":
            "",
          Description:
            "Subtotal",
          Qty:
            "",
          Price:
            "",
          Total:
            roundMoney(
              invoice.subtotal
            ),
        },
        {
          "S/N":
            "",
          Description:
            "Discount",
          Qty:
            "",
          Price:
            "",
          Total:
            roundMoney(
              invoice.discountAmount
            ),
        },
        {
          "S/N":
            "",
          Description:
            `Tax (${Number(
              invoice.taxRate
            ) || 0}%)`,
          Qty:
            "",
          Price:
            "",
          Total:
            roundMoney(
              invoice.taxAmount
            ),
        },
        {
          "S/N":
            "",
          Description:
            "Service Charge",
          Qty:
            "",
          Price:
            "",
          Total:
            roundMoney(
              invoice.serviceCharge
            ),
        },
        {
          "S/N":
            "",
          Description:
            "Grand Total",
          Qty:
            "",
          Price:
            "",
          Total:
            roundMoney(
              invoice.grandTotal
            ),
        },
        {
          "S/N":
            "",
          Description:
            "Amount Paid",
          Qty:
            "",
          Price:
            "",
          Total:
            roundMoney(
              invoice.amountPaid
            ),
        },
        {
          "S/N":
            "",
          Description:
            "Balance Due",
          Qty:
            "",
          Price:
            "",
          Total:
            roundMoney(
              invoice.balanceDue
            ),
        },
      ];

      const worksheetRows =
        [
          {
            "S/N":
              "",
            Description:
              invoice.business
                ?.name ||
              "Business",
            Qty:
              "",
            Price:
              "",
            Total:
              "",
          },
          {
            "S/N":
              "",
            Description:
              `Invoice: ${
                invoice.invoiceNumber ||
                ""
              }`,
            Qty:
              "",
            Price:
              "",
            Total:
              "",
          },
          {
            "S/N":
              "",
            Description:
              `Customer: ${getCustomerName(
                invoice
              )}`,
            Qty:
              "",
            Price:
              "",
            Total:
              "",
          },
          {},
          {
            "S/N":
              "S/N",
            Description:
              "Description",
            Qty:
              "Qty",
            Price:
              "Price",
            Total:
              "Total",
          },
          ...rows,
          ...summaryRows,
        ];

      try {
        const XLSX =
          await import(
            "xlsx"
          );

        const workbook =
          XLSX.utils.book_new();

        const worksheet =
          XLSX.utils.aoa_to_sheet(
            worksheetRows.map(
              (row) => [
                row["S/N"],
                row.Description,
                row.Qty,
                row.Price,
                row.Total,
              ]
            )
          );

        worksheet[
          "!cols"
        ] = [
          {
            wch: 8,
          },
          {
            wch: 42,
          },
          {
            wch: 12,
          },
          {
            wch: 18,
          },
          {
            wch: 18,
          },
        ];

        XLSX.utils.book_append_sheet(
          workbook,
          worksheet,
          "Invoice"
        );

        const filename =
          `${invoice.invoiceNumber || "invoice"}.xlsx`;

        XLSX.writeFile(
          workbook,
          filename
        );

        await markExported(
          invoice
        );

        setSuccess(
          "Excel file generated successfully."
        );
      } catch (
        exportError
      ) {
        console.error(
          "EXCEL EXPORT ERROR:",
          exportError
        );

        setError(
          "Excel export requires the xlsx package. Install it with: npm install xlsx"
        );
      }
    };

  const exportPDF =
    async (invoice) => {
      setActiveMenu(null);
      clearMessages();

      try {
        const jsPDFModule =
          await import(
            "jspdf"
          );

        const autoTableModule =
          await import(
            "jspdf-autotable"
          );

        const jsPDF =
          jsPDFModule.jsPDF ||
          jsPDFModule.default;

        const autoTable =
          autoTableModule.default ||
          jsPDFModule.default?.autoTable;

        const doc =
          new jsPDF({
            orientation:
              "portrait",
            unit: "mm",
            format: "a4",
          });

        if (
          typeof autoTable !==
          "function"
        ) {
          throw new Error(
            "jspdf-autotable is not available."
          );
        }

        const currency =
          invoice.currency ||
          "NGN";

        const businessName =
          invoice.business
            ?.name ||
          "EAZY DON CHECK";

        const customerName =
          getCustomerName(
            invoice
          );

        const pageWidth =
          doc.internal
            .pageSize
            .getWidth();

        let y = 20;

        doc.setFontSize(
          22
        );

        doc.setFont(
          "helvetica",
          "bold"
        );

        doc.text(
          "INVOICE",
          pageWidth - 20,
          y,
          {
            align: "right",
          }
        );

        y += 10;

        doc.setFontSize(
          14
        );

        doc.text(
          businessName,
          20,
          20
        );

        doc.setFontSize(
          9
        );

        doc.setFont(
          "helvetica",
          "normal"
        );

        const businessLines =
          [
            invoice.business
              ?.address,
            invoice.business
              ?.phone,
            invoice.business
              ?.email,
            invoice.business
              ?.website,
          ].filter(Boolean);

        let businessY =
          27;

        businessLines.forEach(
          (line) => {
            doc.text(
              String(line),
              20,
              businessY
            );

            businessY +=
              4.5;
          }
        );

        doc.setFont(
          "helvetica",
          "bold"
        );

        doc.text(
          invoice.invoiceNumber ||
            "Invoice",
          pageWidth - 20,
          30,
          {
            align: "right",
          }
        );

        doc.setFont(
          "helvetica",
          "normal"
        );

        doc.text(
          `Date: ${
            invoice.invoiceDate ||
            "-"
          }`,
          pageWidth - 20,
          36,
          {
            align: "right",
          }
        );

        doc.text(
          `Due: ${
            invoice.dueDate ||
            "-"
          }`,
          pageWidth - 20,
          41,
          {
            align: "right",
          }
        );

        y =
          Math.max(
            businessY + 8,
            55
          );

        doc.setFont(
          "helvetica",
          "bold"
        );

        doc.text(
          "BILL TO",
          20,
          y
        );

        y += 5;

        doc.setFont(
          "helvetica",
          "normal"
        );

        doc.text(
          customerName,
          20,
          y
        );

        y += 5;

        const customerLines =
          [
            invoice.customer
              ?.companyName,
            invoice.customer
              ?.address,
            invoice.customer
              ?.phone,
            invoice.customer
              ?.email,
          ].filter(Boolean);

        customerLines.forEach(
          (line) => {
            doc.text(
              String(line),
              20,
              y
            );

            y +=
              4.5;
          }
        );

        y += 5;

        const tableRows =
          (
            invoice.items ||
            []
          ).map(
            (
              item,
              index
            ) => [
              index + 1,
              item.description ||
                "",
              item.qty || 0,
              formatMoney(
                item.unitPrice,
                currency
              ),
              formatMoney(
                item.total,
                currency
              ),
            ]
          );

        autoTable(
          doc,
          {
            startY: y,
            head: [
              [
                "S/N",
                "Description",
                "Qty",
                "Price",
                "Total",
              ],
            ],
            body:
              tableRows,
            theme:
              "grid",
            styles: {
              fontSize: 9,
              cellPadding: 3,
            },
            headStyles: {
              fontStyle:
                "bold",
            },
            columnStyles: {
              0: {
                halign:
                  "center",
                cellWidth: 12,
              },
              2: {
                halign:
                  "right",
                cellWidth: 18,
              },
              3: {
                halign:
                  "right",
              },
              4: {
                halign:
                  "right",
              },
            },
          }
        );

        let finalY =
          doc.lastAutoTable
            ?.finalY ||
          y + 20;

        finalY += 10;

        const totals = [
          [
            "Subtotal",
            formatMoney(
              invoice.subtotal,
              currency
            ),
          ],
          [
            "Discount",
            formatMoney(
              invoice.discountAmount,
              currency
            ),
          ],
          [
            `Tax (${
              Number(
                invoice.taxRate
              ) || 0
            }%)`,
            formatMoney(
              invoice.taxAmount,
              currency
            ),
          ],
          [
            "Service Charge",
            formatMoney(
              invoice.serviceCharge,
              currency
            ),
          ],
          [
            "Grand Total",
            formatMoney(
              invoice.grandTotal,
              currency
            ),
          ],
          [
            "Amount Paid",
            formatMoney(
              invoice.amountPaid,
              currency
            ),
          ],
          [
            "Balance Due",
            formatMoney(
              invoice.balanceDue,
              currency
            ),
          ],
        ];

        autoTable(
          doc,
          {
            startY: finalY,
            body: totals,
            theme:
              "plain",
            tableWidth:
              80,
            margin: {
              left:
                pageWidth -
                100,
            },
            styles: {
              fontSize: 9,
              cellPadding: 2.5,
            },
            columnStyles: {
              0: {
                fontStyle:
                  "bold",
              },
              1: {
                halign:
                  "right",
              },
            },
            didParseCell:
              (
                data
              ) => {
                if (
                  data.row.index ===
                  4
                ) {
                  data.cell.styles.fontStyle =
                    "bold";
                }

                if (
                  data.row.index ===
                  6
                ) {
                  data.cell.styles.fontStyle =
                    "bold";
                }
              },
          }
        );

        finalY =
          doc.lastAutoTable
            ?.finalY ||
          finalY + 30;

        finalY += 12;

        if (
          invoice.paymentDetails
        ) {
          doc.setFont(
            "helvetica",
            "bold"
          );

          doc.text(
            "PAYMENT DETAILS",
            20,
            finalY
          );

          finalY += 5;

          doc.setFont(
            "helvetica",
            "normal"
          );

          const paymentLines =
            doc.splitTextToSize(
              String(
                invoice.paymentDetails
              ),
              170
            );

          doc.text(
            paymentLines,
            20,
            finalY
          );

          finalY +=
            paymentLines.length *
            4.5;
        }

        if (
          invoice.notes
        ) {
          finalY += 6;

          doc.setFont(
            "helvetica",
            "bold"
          );

          doc.text(
            "NOTES",
            20,
            finalY
          );

          finalY += 5;

          doc.setFont(
            "helvetica",
            "normal"
          );

          const noteLines =
            doc.splitTextToSize(
              String(
                invoice.notes
              ),
              170
            );

          doc.text(
            noteLines,
            20,
            finalY
          );

          finalY +=
            noteLines.length *
            4.5;
        }

        doc.setFontSize(
          8
        );

        doc.setTextColor(
          120
        );

        doc.text(
          "Generated with EAZY DON CHECK",
          pageWidth / 2,
          287,
          {
            align: "center",
          }
        );

        doc.save(
          `${invoice.invoiceNumber || "invoice"}.pdf`
        );

        await markExported(
          invoice
        );

        setSuccess(
          "PDF generated successfully."
        );
      } catch (
        exportError
      ) {
        console.error(
          "PDF EXPORT ERROR:",
          exportError
        );

        setError(
          "PDF export requires jspdf and jspdf-autotable. Install them with: npm install jspdf jspdf-autotable"
        );
      }
    };

  const visibleRange =
    useMemo(() => {
      if (
        totalInvoices ===
        0
      ) {
        return "0 invoices";
      }

      const start =
        (page - 1) *
          PAGE_SIZE +
        1;

      const end =
        Math.min(
          page * PAGE_SIZE,
          totalInvoices
        );

      return `${start}-${end} of ${totalInvoices}`;
    }, [
      page,
      totalInvoices,
    ]);

  return (
    <AppLayout>
      <div className="min-h-full bg-gray-50 dark:bg-dark-bg">

        <div className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8">

          {/* Header */}
          <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">

            <div>
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-100 text-brand-700 dark:bg-brand-950/40 dark:text-brand-300">
                  <ReceiptText className="h-6 w-6" />
                </div>

                <div>
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-white sm:text-3xl">
                    Invoice History
                  </h1>

                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    Manage, edit, export and track your customer invoices.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">

              <button
                type="button"
                onClick={
                  handleRefresh
                }
                disabled={
                  refreshing
                }
                className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:opacity-60 dark:border-dark-border dark:bg-dark-card dark:text-gray-200 dark:hover:bg-gray-800"
              >
                <RefreshCw
                  className={`h-4 w-4 ${
                    refreshing
                      ? "animate-spin"
                      : ""
                  }`}
                />

                Refresh
              </button>

              <button
                type="button"
                onClick={() =>
                  navigate(
                    "/invoice-generator"
                  )
                }
                className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-brand-700"
              >
                <Plus className="h-4 w-4" />
                Create Invoice
              </button>

            </div>
          </div>

          {/* Messages */}
          {error && (
            <div className="mb-5 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />

              <span className="flex-1">
                {error}
              </span>

              <button
                type="button"
                onClick={
                  clearMessages
                }
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          {success && (
            <div className="mb-5 flex items-start gap-3 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-700 dark:border-green-900/50 dark:bg-green-950/30 dark:text-green-300">
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />

              <span className="flex-1">
                {success}
              </span>

              <button
                type="button"
                onClick={
                  clearMessages
                }
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* Filters */}
          <div className="mb-5 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-dark-border dark:bg-dark-card">

            <div className="flex flex-col gap-3 lg:flex-row">

              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />

                <input
                  type="text"
                  value={
                    search
                  }
                  onChange={
                    handleSearch
                  }
                  placeholder="Search invoice number, customer or company..."
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 py-3 pl-10 pr-4 text-sm text-gray-900 outline-none transition focus:border-brand-500 focus:bg-white focus:ring-2 focus:ring-brand-500/20 dark:border-dark-border dark:bg-dark-bg dark:text-white dark:focus:bg-dark-card"
                />
              </div>

              <select
                value={
                  status
                }
                onChange={
                  handleStatusChange
                }
                className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-medium text-gray-700 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-dark-border dark:bg-dark-bg dark:text-gray-200"
              >
                {STATUS_OPTIONS.map(
                  (option) => (
                    <option
                      key={
                        option.value
                      }
                      value={
                        option.value
                      }
                    >
                      {
                        option.label
                      }
                    </option>
                  )
                )}
              </select>

            </div>
          </div>

          {/* Main card */}
          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-dark-border dark:bg-dark-card">

            {/* Table header */}
            <div className="flex flex-col gap-3 border-b border-gray-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between dark:border-dark-border">

              <div>
                <h2 className="font-bold text-gray-900 dark:text-white">
                  Your Invoices
                </h2>

                <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                  {visibleRange}
                </p>
              </div>

              <div className="text-xs text-gray-500 dark:text-gray-400">
                Page {page} of{" "}
                {totalPages}
              </div>
            </div>

            {loading ? (
              <LoadingState />
            ) : invoices.length ===
              0 ? (
              <EmptyState
                search={
                  search
                }
                status={
                  status
                }
                onCreate={() =>
                  navigate(
                    "/invoice-generator"
                  )
                }
                onClear={() => {
                  setSearch("");
                  setStatus("");
                  setPage(1);
                }}
              />
            ) : (
              <>
                {/* Desktop table */}
                <div className="hidden overflow-x-auto lg:block">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200 bg-gray-50 text-left text-[11px] font-bold uppercase tracking-wide text-gray-500 dark:border-dark-border dark:bg-gray-900/30 dark:text-gray-400">

                        <th className="px-5 py-3">
                          Invoice
                        </th>

                        <th className="px-5 py-3">
                          Customer
                        </th>

                        <th className="px-5 py-3">
                          Date
                        </th>

                        <th className="px-5 py-3">
                          Due
                        </th>

                        <th className="px-5 py-3">
                          Total
                        </th>

                        <th className="px-5 py-3">
                          Balance
                        </th>

                        <th className="px-5 py-3">
                          Status
                        </th>

                        <th className="w-16 px-3 py-3" />

                      </tr>
                    </thead>

                    <tbody className="divide-y divide-gray-100 dark:divide-dark-border">

                      {invoices.map(
                        (
                          invoice
                        ) => {
                          const id =
                            getInvoiceId(
                              invoice
                            );

                          const isActionLoading =
                            actionLoading &&
                            actionInvoiceId ===
                              id;

                          return (
                            <tr
                              key={
                                id ||
                                invoice.invoiceNumber
                              }
                              className="transition hover:bg-gray-50/80 dark:hover:bg-gray-900/30"
                            >

                              <td className="px-5 py-4">
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleView(
                                      invoice
                                    )
                                  }
                                  className="text-left"
                                >
                                  <p className="font-bold text-gray-900 hover:text-brand-600 dark:text-white dark:hover:text-brand-400">
                                    {
                                      invoice.invoiceNumber ||
                                      "Invoice"
                                    }
                                  </p>

                                  <p className="mt-0.5 text-xs text-gray-400">
                                    {invoice.template ||
                                      "professional"}
                                  </p>
                                </button>
                              </td>

                              <td className="px-5 py-4">
                                <div className="flex items-center gap-3">

                                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-600 dark:bg-brand-950/30 dark:text-brand-400">
                                    <UserRound className="h-4 w-4" />
                                  </div>

                                  <div className="min-w-0">
                                    <p className="truncate text-sm font-semibold text-gray-800 dark:text-gray-200">
                                      {getCustomerName(
                                        invoice
                                      )}
                                    </p>

                                    {invoice
                                      .customer
                                      ?.companyName && (
                                      <p className="truncate text-xs text-gray-400">
                                        {
                                          invoice
                                            .customer
                                            .companyName
                                        }
                                      </p>
                                    )}
                                  </div>

                                </div>
                              </td>

                              <td className="px-5 py-4 text-sm text-gray-600 dark:text-gray-300">
                                {formatDate(
                                  invoice.invoiceDate
                                )}
                              </td>

                              <td className="px-5 py-4 text-sm text-gray-600 dark:text-gray-300">
                                {formatDate(
                                  invoice.dueDate
                                )}
                              </td>

                              <td className="px-5 py-4">
                                <p className="text-sm font-bold text-gray-900 dark:text-white">
                                  {formatMoney(
                                    invoice.grandTotal,
                                    invoice.currency
                                  )}
                                </p>
                              </td>

                              <td className="px-5 py-4">
                                <p
                                  className={`text-sm font-bold ${
                                    Number(
                                      invoice.balanceDue
                                    ) >
                                    0
                                      ? "text-orange-600"
                                      : "text-green-600"
                                  }`}
                                >
                                  {formatMoney(
                                    invoice.balanceDue,
                                    invoice.currency
                                  )}
                                </p>
                              </td>

                              <td className="px-5 py-4">
                                <StatusBadge
                                  status={
                                    invoice.status
                                  }
                                />
                              </td>

                              <td className="px-3 py-4 text-right">
                                <div className="relative">

                                  <button
                                    type="button"
                                    onClick={(
                                      event
                                    ) => {
                                      event.stopPropagation();

                                      setActiveMenu(
                                        activeMenu ===
                                          id
                                          ? null
                                          : id
                                      );
                                    }}
                                    disabled={
                                      isActionLoading
                                    }
                                    className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-500 transition hover:bg-gray-100 hover:text-gray-900 disabled:opacity-50 dark:hover:bg-gray-800 dark:hover:text-white"
                                  >
                                    {isActionLoading ? (
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                      <MoreVertical className="h-4 w-4" />
                                    )}
                                  </button>

                                  {activeMenu ===
                                    id && (
                                    <InvoiceMenu
                                      invoice={
                                        invoice
                                      }
                                      onView={() =>
                                        handleView(
                                          invoice
                                        )
                                      }
                                      onEdit={() =>
                                        handleEdit(
                                          invoice
                                        )
                                      }
                                      onDuplicate={() =>
                                        handleDuplicate(
                                          invoice
                                        )
                                      }
                                      onPayment={() =>
                                        openPaymentModal(
                                          invoice
                                        )
                                      }
                                      onPDF={() =>
                                        exportPDF(
                                          invoice
                                        )
                                      }
                                      onExcel={() =>
                                        exportExcel(
                                          invoice
                                        )
                                      }
                                      onStatusChange={(
                                        nextStatus
                                      ) =>
                                        handleStatusUpdate(
                                          invoice,
                                          nextStatus
                                        )
                                      }
                                      onDelete={() =>
                                        handleDelete(
                                          invoice
                                        )
                                      }
                                    />
                                  )}

                                </div>
                              </td>

                            </tr>
                          );
                        }
                      )}

                    </tbody>
                  </table>
                </div>

                {/* Mobile cards */}
                <div className="divide-y divide-gray-100 lg:hidden dark:divide-dark-border">

                  {invoices.map(
                    (
                      invoice
                    ) => {
                      const id =
                        getInvoiceId(
                          invoice
                        );

                      const isActionLoading =
                        actionLoading &&
                        actionInvoiceId ===
                          id;

                      return (
                        <div
                          key={
                            id ||
                            invoice.invoiceNumber
                          }
                          className="p-4"
                        >

                          <div className="flex items-start justify-between gap-3">

                            <button
                              type="button"
                              onClick={() =>
                                handleView(
                                  invoice
                                )
                              }
                              className="min-w-0 flex-1 text-left"
                            >
                              <p className="truncate font-bold text-gray-900 dark:text-white">
                                {
                                  invoice.invoiceNumber ||
                                  "Invoice"
                                }
                              </p>

                              <p className="mt-1 truncate text-sm text-gray-500 dark:text-gray-400">
                                {getCustomerName(
                                  invoice
                                )}
                              </p>
                            </button>

                            <div className="relative">
                              <button
                                type="button"
                                onClick={(
                                  event
                                ) => {
                                  event.stopPropagation();

                                  setActiveMenu(
                                    activeMenu ===
                                      id
                                      ? null
                                      : id
                                  );
                                }}
                                disabled={
                                  isActionLoading
                                }
                                className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
                              >
                                {isActionLoading ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <MoreVertical className="h-4 w-4" />
                                )}
                              </button>

                              {activeMenu ===
                                id && (
                                <InvoiceMenu
                                  invoice={
                                    invoice
                                  }
                                  onView={() =>
                                    handleView(
                                      invoice
                                    )
                                  }
                                  onEdit={() =>
                                    handleEdit(
                                      invoice
                                    )
                                  }
                                  onDuplicate={() =>
                                    handleDuplicate(
                                      invoice
                                    )
                                  }
                                  onPayment={() =>
                                    openPaymentModal(
                                      invoice
                                    )
                                  }
                                  onPDF={() =>
                                    exportPDF(
                                      invoice
                                    )
                                  }
                                  onExcel={() =>
                                    exportExcel(
                                      invoice
                                    )
                                  }
                                  onStatusChange={(
                                    nextStatus
                                  ) =>
                                    handleStatusUpdate(
                                      invoice,
                                      nextStatus
                                    )
                                  }
                                  onDelete={() =>
                                    handleDelete(
                                      invoice
                                    )
                                  }
                                />
                              )}
                            </div>

                          </div>

                          <div className="mt-4 grid grid-cols-2 gap-3">

                            <MobileStat
                              label="Total"
                              value={formatMoney(
                                invoice.grandTotal,
                                invoice.currency
                              )}
                            />

                            <MobileStat
                              label="Balance"
                              value={formatMoney(
                                invoice.balanceDue,
                                invoice.currency
                              )}
                            />

                            <MobileStat
                              label="Invoice Date"
                              value={formatDate(
                                invoice.invoiceDate
                              )}
                            />

                            <MobileStat
                              label="Due Date"
                              value={formatDate(
                                invoice.dueDate
                              )}
                            />

                          </div>

                          <div className="mt-4">
                            <StatusBadge
                              status={
                                invoice.status
                              }
                            />
                          </div>

                        </div>
                      );
                    }
                  )}

                </div>

                {/* Pagination */}
                <div className="flex flex-col gap-3 border-t border-gray-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between dark:border-dark-border">

                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Showing{" "}
                    {visibleRange}
                  </p>

                  <div className="flex items-center gap-2">

                    <button
                      type="button"
                      onClick={() =>
                        setPage(
                          (current) =>
                            Math.max(
                              1,
                              current -
                                1
                            )
                        )
                      }
                      disabled={
                        page <=
                        1
                      }
                      className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-dark-border dark:bg-dark-card dark:text-gray-300 dark:hover:bg-gray-800"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>

                    <span className="min-w-[70px] text-center text-xs font-semibold text-gray-600 dark:text-gray-300">
                      {page} /{" "}
                      {
                        totalPages
                      }
                    </span>

                    <button
                      type="button"
                      onClick={() =>
                        setPage(
                          (current) =>
                            Math.min(
                              totalPages,
                              current +
                                1
                            )
                        )
                      }
                      disabled={
                        page >=
                        totalPages
                      }
                      className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-dark-border dark:bg-dark-card dark:text-gray-300 dark:hover:bg-gray-800"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>

                  </div>
                </div>
              </>
            )}

          </div>
        </div>
      </div>

      {/* View Modal */}
      {showViewModal &&
        selectedInvoice && (
          <InvoiceViewModal
            invoice={
              selectedInvoice
            }
            onClose={() =>
              setShowViewModal(
                false
              )
            }
            onEdit={() => {
              setShowViewModal(
                false
              );

              handleEdit(
                selectedInvoice
              );
            }}
            onPDF={() =>
              exportPDF(
                selectedInvoice
              )
            }
            onExcel={() =>
              exportExcel(
                selectedInvoice
              )
            }
            onPayment={() =>
              openPaymentModal(
                selectedInvoice
              )
            }
          />
        )}

      {/* Payment Modal */}
      {showPaymentModal &&
        selectedInvoice && (
          <PaymentModal
            invoice={
              selectedInvoice
            }
            amount={
              paymentAmount
            }
            setAmount={
              setPaymentAmount
            }
            loading={
              actionLoading
            }
            onClose={() => {
              setShowPaymentModal(
                false
              );

              setPaymentAmount(
                ""
              );
            }}
            onSubmit={
              handlePayment
            }
          />
        )}
    </AppLayout>
  );
};

const StatusBadge = ({
  status,
}) => {
  const config = {
    draft: {
      label: "Draft",
      icon: FileText,
      classes:
        "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
    },

    sent: {
      label: "Sent",
      icon: ExternalLink,
      classes:
        "bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-300",
    },

    paid: {
      label: "Paid",
      icon: CheckCircle2,
      classes:
        "bg-green-50 text-green-700 dark:bg-green-950/30 dark:text-green-300",
    },

    partially_paid: {
      label: "Partially Paid",
      icon: CreditCard,
      classes:
        "bg-yellow-50 text-yellow-700 dark:bg-yellow-950/30 dark:text-yellow-300",
    },

    overdue: {
      label: "Overdue",
      icon: AlertTriangle,
      classes:
        "bg-orange-50 text-orange-700 dark:bg-orange-950/30 dark:text-orange-300",
    },

    cancelled: {
      label: "Cancelled",
      icon: XCircle,
      classes:
        "bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-300",
    },
  };

  const current =
    config[
      status
    ] || config.draft;

  const Icon =
    current.icon;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold ${current.classes}`}
    >
      <Icon className="h-3.5 w-3.5" />

      {current.label}
    </span>
  );
};

const InvoiceMenu = ({
  invoice,
  onView,
  onEdit,
  onDuplicate,
  onPayment,
  onPDF,
  onExcel,
  onStatusChange,
  onDelete,
}) => {
  const menuItems = [
    {
      label: "View Invoice",
      icon: Eye,
      action: onView,
    },
    {
      label: "Edit Invoice",
      icon: Edit3,
      action: onEdit,
    },
    {
      label: "Duplicate",
      icon: Copy,
      action: onDuplicate,
    },
    {
      label: "Record Payment",
      icon: CreditCard,
      action: onPayment,
    },
    {
      label: "Download PDF",
      icon: Download,
      action: onPDF,
    },
    {
      label: "Download Excel",
      icon: FileSpreadsheet,
      action: onExcel,
    },
  ];

  return (
    <div
      className="absolute right-0 top-11 z-50 w-56 overflow-hidden rounded-xl border border-gray-200 bg-white py-1 shadow-xl dark:border-dark-border dark:bg-dark-card"
      onClick={(event) =>
        event.stopPropagation()
      }
    >
      {menuItems.map(
        (item) => {
          const Icon =
            item.icon;

          return (
            <button
              key={
                item.label
              }
              type="button"
              onClick={
                item.action
              }
              className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm font-medium text-gray-700 transition hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-800"
            >
              <Icon className="h-4 w-4 text-gray-400" />

              {item.label}
            </button>
          );
        }
      )}

      <div className="my-1 border-t border-gray-100 dark:border-dark-border" />

      {invoice.status !==
        "paid" && (
        <button
          type="button"
          onClick={() =>
            onStatusChange(
              "paid"
            )
          }
          className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm font-medium text-green-700 hover:bg-green-50 dark:text-green-300 dark:hover:bg-green-950/30"
        >
          <CheckCircle2 className="h-4 w-4" />
          Mark as Paid
        </button>
      )}

      {invoice.status !==
        "sent" &&
        invoice.status !==
          "paid" &&
        invoice.status !==
          "cancelled" && (
          <button
            type="button"
            onClick={() =>
              onStatusChange(
                "sent"
              )
            }
            className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm font-medium text-blue-700 hover:bg-blue-50 dark:text-blue-300 dark:hover:bg-blue-950/30"
          >
            <ExternalLink className="h-4 w-4" />
            Mark as Sent
          </button>
        )}

      {invoice.status !==
        "overdue" &&
        invoice.status !==
          "paid" &&
        invoice.status !==
          "cancelled" && (
          <button
            type="button"
            onClick={() =>
              onStatusChange(
                "overdue"
              )
            }
            className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm font-medium text-orange-700 hover:bg-orange-50 dark:text-orange-300 dark:hover:bg-orange-950/30"
          >
            <AlertTriangle className="h-4 w-4" />
            Mark Overdue
          </button>
        )}

      {invoice.status !==
        "cancelled" && (
        <button
          type="button"
          onClick={() =>
            onStatusChange(
              "cancelled"
            )
          }
          className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm font-medium text-red-700 hover:bg-red-50 dark:text-red-300 dark:hover:bg-red-950/30"
        >
          <XCircle className="h-4 w-4" />
          Cancel Invoice
        </button>
      )}

      <div className="my-1 border-t border-gray-100 dark:border-dark-border" />

      <button
        type="button"
        onClick={
          onDelete
        }
        className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm font-medium text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30"
      >
        <Trash2 className="h-4 w-4" />
        Delete Invoice
      </button>
    </div>
  );
};

const LoadingState = () => {
  return (
    <div className="flex min-h-[420px] items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="h-9 w-9 animate-spin text-brand-600" />

        <p className="text-sm text-gray-500 dark:text-gray-400">
          Loading invoice history...
        </p>
      </div>
    </div>
  );
};

const EmptyState = ({
  search,
  status,
  onCreate,
  onClear,
}) => {
  const filtered =
    Boolean(
      search ||
        status
    );

  return (
    <div className="flex min-h-[420px] flex-col items-center justify-center px-5 text-center">

      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-50 text-brand-600 dark:bg-brand-950/30 dark:text-brand-400">
        <ReceiptText className="h-8 w-8" />
      </div>

      <h3 className="mt-5 text-lg font-bold text-gray-900 dark:text-white">
        {filtered
          ? "No invoices found"
          : "No invoices yet"}
      </h3>

      <p className="mt-2 max-w-md text-sm text-gray-500 dark:text-gray-400">
        {filtered
          ? "Try changing your search or status filter."
          : "Create your first professional invoice and start managing your customer billing from EAZY DON CHECK."}
      </p>

      <div className="mt-5 flex flex-wrap justify-center gap-3">
        {filtered && (
          <button
            type="button"
            onClick={
              onClear
            }
            className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 dark:border-dark-border dark:bg-dark-card dark:text-gray-200"
          >
            <X className="h-4 w-4" />
            Clear Filters
          </button>
        )}

        <button
          type="button"
          onClick={
            onCreate
          }
          className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-brand-700"
        >
          <Plus className="h-4 w-4" />
          Create Invoice
        </button>
      </div>

    </div>
  );
};

const MobileStat = ({
  label,
  value,
}) => {
  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50 p-3 dark:border-dark-border dark:bg-dark-bg">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">
        {label}
      </p>

      <p className="mt-1 truncate text-sm font-bold text-gray-800 dark:text-gray-200">
        {value}
      </p>
    </div>
  );
};

const InvoiceViewModal = ({
  invoice,
  onClose,
  onEdit,
  onPDF,
  onExcel,
  onPayment,
}) => {
  const items =
    Array.isArray(
      invoice.items
    )
      ? invoice.items
      : [];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-3 backdrop-blur-sm sm:p-6">

      <div className="flex max-h-[94vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-gray-100 shadow-2xl dark:bg-dark-bg">

        <div className="flex flex-col gap-3 border-b border-gray-200 bg-white px-5 py-4 sm:flex-row sm:items-center sm:justify-between dark:border-dark-border dark:bg-dark-card">

          <div>
            <div className="flex items-center gap-2">
              <ReceiptText className="h-5 w-5 text-brand-600" />

              <h2 className="font-bold text-gray-900 dark:text-white">
                {invoice.invoiceNumber ||
                  "Invoice"}
              </h2>
            </div>

            <div className="mt-1">
              <StatusBadge
                status={
                  invoice.status
                }
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">

            <button
              type="button"
              onClick={
                onPayment
              }
              className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50 dark:border-dark-border dark:bg-dark-card dark:text-gray-200"
            >
              <CreditCard className="h-4 w-4" />
              Payment
            </button>

            <button
              type="button"
              onClick={
                onPDF
              }
              className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50 dark:border-dark-border dark:bg-dark-card dark:text-gray-200"
            >
              <Download className="h-4 w-4" />
              PDF
            </button>

            <button
              type="button"
              onClick={
                onExcel
              }
              className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50 dark:border-dark-border dark:bg-dark-card dark:text-gray-200"
            >
              <FileSpreadsheet className="h-4 w-4" />
              Excel
            </button>

            <button
              type="button"
              onClick={
                onEdit
              }
              className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-3 py-2 text-xs font-bold text-white hover:bg-brand-700"
            >
              <Edit3 className="h-4 w-4" />
              Edit
            </button>

            <button
              type="button"
              onClick={
                onClose
              }
              className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              <X className="h-5 w-5" />
            </button>

          </div>
        </div>

        <div className="overflow-y-auto p-3 sm:p-6">

          <div className="mx-auto max-w-4xl rounded-xl border border-gray-200 bg-white p-5 shadow-sm sm:p-8 dark:border-dark-border">

            <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">

              <div>
                <div className="flex items-center gap-3">
                  {invoice.business
                    ?.logoUrl ? (
                    <img
                      src={
                        invoice
                          .business
                          .logoUrl
                      }
                      alt="Business logo"
                      className="h-14 w-14 rounded-lg object-contain"
                    />
                  ) : (
                    <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-brand-50 text-brand-600 dark:bg-brand-950/30 dark:text-brand-400">
                      <Building2 className="h-7 w-7" />
                    </div>
                  )}

                  <div>
                    <h3 className="text-xl font-black text-gray-900 dark:text-white">
                      {invoice.business
                        ?.name ||
                        "Business"}
                    </h3>

                    {invoice
                      .business
                      ?.address && (
                      <p className="mt-1 max-w-sm whitespace-pre-line text-xs text-gray-500">
                        {
                          invoice
                            .business
                            .address
                        }
                      </p>
                    )}
                  </div>
                </div>

                <div className="mt-3 space-y-0.5 text-xs text-gray-500">
                  {invoice
                    .business
                    ?.phone && (
                    <p>
                      {
                        invoice
                          .business
                          .phone
                      }
                    </p>
                  )}

                  {invoice
                    .business
                    ?.email && (
                    <p>
                      {
                        invoice
                          .business
                          .email
                      }
                    </p>
                  )}
                </div>
              </div>

              <div className="sm:text-right">
                <h3 className="text-3xl font-black uppercase tracking-tight text-gray-900 dark:text-white">
                  Invoice
                </h3>

                <p className="mt-1 font-bold text-brand-600">
                  {
                    invoice.invoiceNumber
                  }
                </p>

                <p className="mt-2 text-xs text-gray-500">
                  Date:{" "}
                  {invoice.invoiceDate ||
                    "—"}
                </p>

                <p className="text-xs text-gray-500">
                  Due:{" "}
                  {invoice.dueDate ||
                    "—"}
                </p>
              </div>

            </div>

            <div className="my-6 grid grid-cols-1 gap-5 border-y border-gray-200 py-5 sm:grid-cols-2">

              <div>
                <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-gray-400">
                  Bill To
                </p>

                <p className="font-bold text-gray-900 dark:text-white">
                  {
                    getCustomerName(
                      invoice
                    )
                  }
                </p>

                {invoice
                  .customer
                  ?.companyName && (
                  <p className="text-xs text-gray-500">
                    {
                      invoice
                        .customer
                        .companyName
                    }
                  </p>
                )}

                {invoice
                  .customer
                  ?.address && (
                  <p className="mt-1 whitespace-pre-line text-xs text-gray-500">
                    {
                      invoice
                        .customer
                        .address
                    }
                  </p>
                )}
              </div>

              <div className="sm:text-right">
                <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-gray-400">
                  Payment Terms
                </p>

                <p className="text-xs text-gray-600">
                  {invoice.paymentTerms ||
                    "Not specified"}
                </p>
              </div>

            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[600px]">
                <thead>
                  <tr className="border-b-2 border-gray-900 text-left text-[10px] font-bold uppercase tracking-wide text-gray-600">
                    <th className="w-12 px-3 py-3 text-center">
                      S/N
                    </th>

                    <th className="px-3 py-3">
                      Description
                    </th>

                    <th className="w-20 px-3 py-3 text-right">
                      Qty
                    </th>

                    <th className="w-32 px-3 py-3 text-right">
                      Price
                    </th>

                    <th className="w-32 px-3 py-3 text-right">
                      Total
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-100">
                  {items.map(
                    (
                      item,
                      index
                    ) => (
                      <tr
                        key={
                          index
                        }
                      >
                        <td className="px-3 py-3 text-center text-xs text-gray-500">
                          {index + 1}
                        </td>

                        <td className="px-3 py-3 text-sm font-medium text-gray-800">
                          {
                            item.description
                          }
                        </td>

                        <td className="px-3 py-3 text-right text-sm text-gray-600">
                          {
                            item.qty
                          }
                        </td>

                        <td className="px-3 py-3 text-right text-sm text-gray-600">
                          {formatMoney(
                            item.unitPrice,
                            invoice.currency
                          )}
                        </td>

                        <td className="px-3 py-3 text-right text-sm font-bold text-gray-900">
                          {formatMoney(
                            item.total,
                            invoice.currency
                          )}
                        </td>
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            </div>

            <div className="mt-6 flex justify-end">
              <div className="w-full max-w-sm space-y-2 text-sm">

                <TotalRow
                  label="Subtotal"
                  value={formatMoney(
                    invoice.subtotal,
                    invoice.currency
                  )}
                />

                {Number(
                  invoice.discountAmount
                ) > 0 && (
                  <TotalRow
                    label="Discount"
                    value={`-${formatMoney(
                      invoice.discountAmount,
                      invoice.currency
                    )}`}
                    danger
                  />
                )}

                {Number(
                  invoice.taxRate
                ) > 0 && (
                  <TotalRow
                    label={`Tax (${invoice.taxRate}%)`}
                    value={formatMoney(
                      invoice.taxAmount,
                      invoice.currency
                    )}
                  />
                )}

                {Number(
                  invoice.serviceCharge
                ) > 0 && (
                  <TotalRow
                    label="Service Charge"
                    value={formatMoney(
                      invoice.serviceCharge,
                      invoice.currency
                    )}
                  />
                )}

                <div className="border-t border-gray-200 pt-3">
                  <TotalRow
                    label="Grand Total"
                    value={formatMoney(
                      invoice.grandTotal,
                      invoice.currency
                    )}
                    strong
                  />
                </div>

                <TotalRow
                  label="Amount Paid"
                  value={formatMoney(
                    invoice.amountPaid,
                    invoice.currency
                  )}
                  success
                />

                <TotalRow
                  label="Balance Due"
                  value={formatMoney(
                    invoice.balanceDue,
                    invoice.currency
                  )}
                  strong
                />

              </div>
            </div>

            {(invoice.paymentDetails ||
              invoice.notes ||
              invoice.termsAndConditions) && (
              <div className="mt-8 space-y-5 border-t border-gray-200 pt-6">

                {invoice.paymentDetails && (
                  <InfoBlock
                    title="Payment Details"
                    value={
                      invoice.paymentDetails
                    }
                  />
                )}

                {invoice.notes && (
                  <InfoBlock
                    title="Notes"
                    value={
                      invoice.notes
                    }
                  />
                )}

                {invoice.termsAndConditions && (
                  <InfoBlock
                    title="Terms & Conditions"
                    value={
                      invoice.termsAndConditions
                    }
                  />
                )}

              </div>
            )}

            <div className="mt-8 border-t border-gray-100 pt-4 text-center">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">
                Generated with EAZY DON CHECK
              </p>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};

const TotalRow = ({
  label,
  value,
  strong = false,
  danger = false,
  success = false,
}) => {
  return (
    <div
      className={`flex items-center justify-between gap-5 ${
        strong
          ? "font-black text-gray-900"
          : "text-gray-600"
      }`}
    >
      <span>
        {label}
      </span>

      <span
        className={
          danger
            ? "font-semibold text-red-600"
            : success
            ? "font-semibold text-green-600"
            : ""
        }
      >
        {value}
      </span>
    </div>
  );
};

const InfoBlock = ({
  title,
  value,
}) => {
  return (
    <div>
      <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-gray-400">
        {title}
      </p>

      <p className="whitespace-pre-line text-xs leading-5 text-gray-600">
        {value}
      </p>
    </div>
  );
};

const PaymentModal = ({
  invoice,
  amount,
  setAmount,
  loading,
  onClose,
  onSubmit,
}) => {
  const balance =
    Number(
      invoice.balanceDue
    ) || 0;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">

      <div className="w-full max-w-md overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl dark:border-dark-border dark:bg-dark-card">

        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4 dark:border-dark-border">

          <div>
            <h3 className="font-bold text-gray-900 dark:text-white">
              Record Payment
            </h3>

            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              {
                invoice.invoiceNumber
              }
            </p>
          </div>

          <button
            type="button"
            onClick={
              onClose
            }
            className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <X className="h-5 w-5" />
          </button>

        </div>

        <div className="space-y-5 p-5">

          <div className="rounded-xl bg-gray-50 p-4 dark:bg-dark-bg">

            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">
                Invoice Total
              </span>

              <span className="font-bold text-gray-900 dark:text-white">
                {formatMoney(
                  invoice.grandTotal,
                  invoice.currency
                )}
              </span>
            </div>

            <div className="mt-2 flex items-center justify-between text-sm">
              <span className="text-gray-500">
                Already Paid
              </span>

              <span className="font-semibold text-green-600">
                {formatMoney(
                  invoice.amountPaid,
                  invoice.currency
                )}
              </span>
            </div>

            <div className="mt-3 border-t border-gray-200 pt-3 dark:border-dark-border">

              <div className="flex items-center justify-between">
                <span className="font-bold text-gray-700 dark:text-gray-300">
                  Balance Due
                </span>

                <span className="text-lg font-black text-orange-600">
                  {formatMoney(
                    balance,
                    invoice.currency
                  )}
                </span>
              </div>

            </div>
          </div>

          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-gray-700 dark:text-gray-300">
              Payment Amount
            </span>

            <input
              type="number"
              min="0"
              max={
                balance
              }
              step="0.01"
              value={
                amount
              }
              onChange={(
                event
              ) =>
                setAmount(
                  event
                    .target
                    .value
                )
              }
              placeholder="Enter amount received"
              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-lg font-semibold text-gray-900 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-dark-border dark:bg-dark-bg dark:text-white"
              autoFocus
            />
          </label>

          <button
            type="button"
            onClick={() =>
              setAmount(
                String(
                  balance
                )
              )
            }
            className="text-xs font-semibold text-brand-600 hover:text-brand-700"
          >
            Use full balance
          </button>

        </div>

        <div className="flex gap-3 border-t border-gray-200 p-5 dark:border-dark-border">

          <button
            type="button"
            onClick={
              onClose
            }
            className="flex-1 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-bold text-gray-700 hover:bg-gray-50 dark:border-dark-border dark:bg-dark-card dark:text-gray-200"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={
              onSubmit
            }
            disabled={
              loading
            }
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 py-3 text-sm font-bold text-white hover:bg-brand-700 disabled:opacity-60"
          >
            {loading && (
              <Loader2 className="h-4 w-4 animate-spin" />
            )}

            Record Payment
          </button>

        </div>
      </div>
    </div>
  );
};

export default InvoiceHistory;