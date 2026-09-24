import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  ArrowLeft,
  Calculator,
  CheckCircle2,
  ChevronDown,
  FileText,
  Loader2,
  Plus,
  Save,
  Trash2,
  X,
  Eye,
  Building2,
  UserRound,
  ReceiptText,
  Settings2,
  Copy,
  Upload,
  Image as ImageIcon,
  Download,
  Printer,
  PanelRightClose,
  PanelRightOpen,
} from "lucide-react";

import {
  useNavigate,
  useSearchParams,
} from "react-router-dom";

import AppLayout from "../components/layout/AppLayout";
import apiClient from "../utils/apiClient";
import { useAuth } from "../context/AuthContext";

const EMPTY_ITEM = {
  description: "",
  qty: 1,
  unitPrice: 0,
  total: 0,
};

const DEFAULT_BUSINESS = {
  name: "",
  logoUrl: "",
  address: "",
  phone: "",
  email: "",
  website: "",
  taxNumber: "",
};

const DEFAULT_CUSTOMER = {
  name: "",
  companyName: "",
  address: "",
  phone: "",
  email: "",
  taxNumber: "",
};

const ALLOWED_STATUSES = [
  "draft",
  "sent",
  "paid",
  "partially_paid",
  "overdue",
  "cancelled",
];

const TEMPLATES = [
  {
    value: "professional",
    label: "Professional",
    description: "Clean business invoice",
  },
  {
    value: "modern",
    label: "Modern",
    description: "Contemporary layout",
  },
  {
    value: "classic",
    label: "Classic",
    description: "Traditional invoice",
  },
  {
    value: "minimal",
    label: "Minimal",
    description: "Simple and elegant",
  },
];

const EAZY_DON_CHECK_LOGO = "/eazy-don-check-logo.png";

const loadImageForPdf = async (src) => {
  if (!src) return null;

  try {
    const image = new Image();
    image.crossOrigin = "anonymous";

    await new Promise((resolve, reject) => {
      image.onload = resolve;
      image.onerror = reject;
      image.src = src;
    });

    const canvas = document.createElement("canvas");
    canvas.width = image.naturalWidth || image.width;
    canvas.height = image.naturalHeight || image.height;

    if (!canvas.width || !canvas.height) {
      return null;
    }

    const context = canvas.getContext("2d");
    if (!context) return null;

    context.clearRect(0, 0, canvas.width, canvas.height);
    context.globalAlpha = 0.065;
    context.drawImage(image, 0, 0, canvas.width, canvas.height);

    return {
      dataUrl: canvas.toDataURL("image/png"),
      width: canvas.width,
      height: canvas.height,
    };
  } catch (imageError) {
    console.warn("PDF WATERMARK IMAGE ERROR:", imageError);
    return null;
  }
};

const CURRENCIES = [
  { value: "NGN", label: "₦ Nigerian Naira" },
  { value: "USD", label: "$ US Dollar" },
  { value: "GBP", label: "£ British Pound" },
  { value: "EUR", label: "€ Euro" },
  { value: "GHS", label: "₵ Ghanaian Cedi" },
  { value: "KES", label: "KSh Kenyan Shilling" },
];

const roundMoney = (value) => {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return 0;
  }

  return Math.round((number + Number.EPSILON) * 100) / 100;
};

const toNumber = (value, fallback = 0) => {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return fallback;
  }

  const parsed = Number(
    String(value).replace(/,/g, "")
  );

  return Number.isFinite(parsed)
    ? parsed
    : fallback;
};

const getCurrencySymbol = (currency = "NGN") => {
  const symbols = {
    NGN: "₦",
    USD: "$",
    GBP: "£",
    EUR: "€",
    GHS: "₵",
    KES: "KSh",
  };

  return symbols[currency] || currency;
};

const formatMoney = (
  amount,
  currency = "NGN"
) => {
  const numericAmount = Number(amount) || 0;

  try {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(numericAmount);
  } catch {
    return `${getCurrencySymbol(currency)} ${numericAmount.toFixed(2)}`;
  }
};

const formatPdfMoney = (
  amount,
  currency = "NGN"
) => {
  const numericAmount = Number(amount) || 0;

  return `${getCurrencySymbol(
    currency
  )} ${numericAmount.toLocaleString(
    "en-US",
    {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }
  )}`;
};

const getToday = () => {
  const date = new Date();

  const year = date.getFullYear();

  const month = String(
    date.getMonth() + 1
  ).padStart(2, "0");

  const day = String(
    date.getDate()
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const getDefaultDueDate = () => {
  const date = new Date();

  date.setDate(
    date.getDate() + 30
  );

  const year = date.getFullYear();

  const month = String(
    date.getMonth() + 1
  ).padStart(2, "0");

  const day = String(
    date.getDate()
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const generateClientInvoiceNumber = () => {
  const year = new Date().getFullYear();

  const timestamp = Date.now()
    .toString()
    .slice(-6);

  return `EDC-${year}-${timestamp}`;
};

const normalizeItem = (item) => {
  const qty = Math.max(
    0,
    toNumber(
      item?.qty,
      1
    )
  );

  const unitPrice = Math.max(
    0,
    toNumber(
      item?.unitPrice,
      0
    )
  );

  return {
    description:
      item?.description || "",

    qty,

    unitPrice,

    total: roundMoney(
      qty * unitPrice
    ),
  };
};

const createItem = () => ({
  ...EMPTY_ITEM,
  _localId: `${Date.now()}-${Math.random()
    .toString(36)
    .slice(2)}`,
});

const InvoiceGenerator = ({
  invoiceId: propInvoiceId = null,
}) => {
  const navigate = useNavigate();

  const [searchParams] =
    useSearchParams();

  const { user } = useAuth();

  const logoInputRef = useRef(null);

  const queryInvoiceId =
    searchParams.get("id");

  const invoiceId =
    propInvoiceId ||
    queryInvoiceId ||
    null;

  const isEditing =
    Boolean(invoiceId);

  const [loading, setLoading] =
    useState(isEditing);

  const [saving, setSaving] =
    useState(false);

  const [
    calculationLoading,
    setCalculationLoading,
  ] = useState(false);

  const [pdfLoading, setPdfLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState("");

  const [showPreview, setShowPreview] =
    useState(false);

  const [previewCollapsed, setPreviewCollapsed] =
    useState(false);

  const [form, setForm] = useState(() => ({
    invoiceNumber:
      generateClientInvoiceNumber(),

    status: "draft",

    business: {
      ...DEFAULT_BUSINESS,
      name:
        user?.businessName ||
        user?.name ||
        "",
      phone:
        user?.phone || "",
      email:
        user?.email || "",
      logoUrl:
        user?.avatarUrl ||
        user?.avatar ||
        "",
    },

    customer: {
      ...DEFAULT_CUSTOMER,
    },

    invoiceDate:
      getToday(),

    dueDate:
      getDefaultDueDate(),

    currency:
      "NGN",

    paymentTerms:
      "Payment due within 30 days.",

    paymentDetails:
      "",

    items: [
      createItem(),
    ],

    discountAmount: 0,

    taxRate: 0,

    taxAmount: 0,

    serviceCharge: 0,

    amountPaid: 0,

    notes:
      "Thank you for your business.",

    termsAndConditions:
      "Goods and services are supplied according to the agreed terms.",

    template:
      "professional",
  }));

  const [
    serverCalculation,
    setServerCalculation,
  ] = useState(null);

  const updateForm = useCallback(
    (field, value) => {
      setServerCalculation(null);

      setForm((previous) => ({
        ...previous,
        [field]: value,
      }));
    },
    []
  );

  const updateBusiness = useCallback(
    (field, value) => {
      setServerCalculation(null);

      setForm((previous) => ({
        ...previous,

        business: {
          ...previous.business,
          [field]: value,
        },
      }));
    },
    []
  );

  const updateCustomer = useCallback(
    (field, value) => {
      setServerCalculation(null);

      setForm((previous) => ({
        ...previous,

        customer: {
          ...previous.customer,
          [field]: value,
        },
      }));
    },
    []
  );

  const updateItem = useCallback(
    (index, field, value) => {
      setServerCalculation(null);

      setForm((previous) => {
        const items = [
          ...previous.items,
        ];

        const currentItem =
          items[index] || {
            ...createItem(),
          };

        const updatedItem = {
          ...currentItem,
          [field]: value,
        };

        if (
          field === "qty" ||
          field === "unitPrice"
        ) {
          const qty =
            Math.max(
              0,
              toNumber(
                field === "qty"
                  ? value
                  : updatedItem.qty,
                1
              )
            );

          const unitPrice =
            Math.max(
              0,
              toNumber(
                field ===
                "unitPrice"
                  ? value
                  : updatedItem.unitPrice,
                0
              )
            );

          updatedItem.total =
            roundMoney(
              qty * unitPrice
            );
        }

        items[index] =
          updatedItem;

        return {
          ...previous,
          items,
        };
      });
    },
    []
  );

  const addItem = useCallback(() => {
    setServerCalculation(null);

    setForm((previous) => ({
      ...previous,

      items: [
        ...previous.items,
        createItem(),
      ],
    }));
  }, []);

  const removeItem = useCallback(
    (index) => {
      setServerCalculation(null);

      setForm((previous) => {
        if (
          previous.items.length <= 1
        ) {
          return {
            ...previous,

            items: [
              createItem(),
            ],
          };
        }

        return {
          ...previous,

          items:
            previous.items.filter(
              (_, itemIndex) =>
                itemIndex !== index
            ),
        };
      });
    },
    []
  );

  const calculations = useMemo(() => {
    const items =
      form.items.map(
        normalizeItem
      );

    const subtotal =
      roundMoney(
        items.reduce(
          (sum, item) =>
            sum + item.total,
          0
        )
      );

    const discountAmount =
      Math.max(
        0,
        toNumber(
          form.discountAmount,
          0
        )
      );

    const taxRate =
      Math.max(
        0,
        toNumber(
          form.taxRate,
          0
        )
      );

    const taxableAmount =
      Math.max(
        0,
        subtotal -
        discountAmount
      );

    const taxAmount =
      roundMoney(
        taxableAmount *
        (taxRate / 100)
      );

    const serviceCharge =
      Math.max(
        0,
        toNumber(
          form.serviceCharge,
          0
        )
      );

    const grandTotal =
      roundMoney(
        Math.max(
          0,
          subtotal -
          discountAmount +
          taxAmount +
          serviceCharge
        )
      );

    const amountPaid =
      Math.max(
        0,
        toNumber(
          form.amountPaid,
          0
        )
      );

    const balanceDue =
      roundMoney(
        Math.max(
          0,
          grandTotal -
          amountPaid
        )
      );

    return {
      items,
      subtotal,
      discountAmount,
      taxRate,
      taxAmount,
      serviceCharge,
      grandTotal,
      amountPaid,
      balanceDue,
    };
  }, [
    form.items,
    form.discountAmount,
    form.taxRate,
    form.serviceCharge,
    form.amountPaid,
  ]);

  const loadInvoice = useCallback(
    async () => {
      if (!invoiceId) {
        return;
      }

      setLoading(true);
      setError("");

      try {
        const response =
          await apiClient.get(
            `/invoices/${invoiceId}`
          );

        const invoice =
          response?.data?.data ||
          response?.data;

        if (!invoice) {
          throw new Error(
            "Invoice data was not returned."
          );
        }

        setForm({
          invoiceNumber:
            invoice.invoiceNumber ||
            generateClientInvoiceNumber(),

          status:
            invoice.status ||
            "draft",

          business: {
            ...DEFAULT_BUSINESS,
            ...(invoice.business ||
              {}),
          },

          customer: {
            ...DEFAULT_CUSTOMER,
            ...(invoice.customer ||
              {}),
          },

          invoiceDate:
            invoice.invoiceDate ||
            getToday(),

          dueDate:
            invoice.dueDate ||
            getDefaultDueDate(),

          currency:
            invoice.currency ||
            "NGN",

          paymentTerms:
            invoice.paymentTerms ||
            "",

          paymentDetails:
            invoice.paymentDetails ||
            "",

          items:
            Array.isArray(
              invoice.items
            ) &&
            invoice.items.length > 0
              ? invoice.items.map(
                (item) => ({
                  ...normalizeItem(
                    item
                  ),
                  _localId:
                    `${Date.now()}-${Math.random()
                      .toString(36)
                      .slice(2)}`,
                })
              )
              : [
                createItem(),
              ],

          discountAmount:
            invoice.discountAmount ||
            0,

          taxRate:
            invoice.taxRate ||
            0,

          taxAmount:
            invoice.taxAmount ||
            0,

          serviceCharge:
            invoice.serviceCharge ||
            0,

          amountPaid:
            invoice.amountPaid ||
            0,

          notes:
            invoice.notes ||
            "",

          termsAndConditions:
            invoice.termsAndConditions ||
            "",

          template:
            invoice.template ||
            "professional",
        });

        setServerCalculation(
          null
        );
      } catch (requestError) {
        console.error(
          "LOAD INVOICE ERROR:",
          requestError
        );

        setError(
          requestError?.response
            ?.data?.message ||
          requestError?.message ||
          "Failed to load invoice."
        );
      } finally {
        setLoading(false);
      }
    },
    [invoiceId]
  );

  useEffect(() => {
    loadInvoice();
  }, [loadInvoice]);

  const handleLogoUpload = useCallback(
    (event) => {
      const file =
        event.target.files?.[0];

      if (!file) {
        return;
      }

      if (
        !file.type.startsWith(
          "image/"
        )
      ) {
        setError(
          "Please select a valid image file for the business logo."
        );

        event.target.value = "";
        return;
      }

      if (
        file.size >
        5 * 1024 * 1024
      ) {
        setError(
          "Business logo must not exceed 5MB."
        );

        event.target.value = "";
        return;
      }

      const reader =
        new FileReader();

      reader.onload = () => {
        updateBusiness(
          "logoUrl",
          reader.result
        );

        setSuccess(
          "Business logo added successfully."
        );
      };

      reader.onerror = () => {
        setError(
          "Unable to read the selected logo."
        );
      };

      reader.readAsDataURL(
        file
      );

      event.target.value = "";
    },
    [updateBusiness]
  );

  const removeLogo = useCallback(() => {
    updateBusiness(
      "logoUrl",
      ""
    );

    setSuccess(
      "Business logo removed."
    );
  }, [updateBusiness]);

  const calculateOnServer =
    useCallback(
      async () => {
        setCalculationLoading(
          true
        );

        try {
          const response =
            await apiClient.post(
              "/invoices/calculate",
              {
                items:
                  calculations.items,

                taxRate:
                  calculations.taxRate,

                discountAmount:
                  calculations.discountAmount,

                serviceCharge:
                  calculations.serviceCharge,

                amountPaid:
                  calculations.amountPaid,
              }
            );

          const result =
            response?.data?.data ||
            response?.data;

          if (result) {
            setServerCalculation(
              result
            );

            setSuccess(
              "Invoice calculation verified successfully."
            );
          }
        } catch (requestError) {
          console.error(
            "SERVER CALCULATION ERROR:",
            requestError
          );

          setError(
            requestError?.response
              ?.data?.message ||
            "Unable to verify the calculation on the server."
          );
        } finally {
          setCalculationLoading(
            false
          );
        }
      },
      [calculations]
    );

  const handleSave = async (
    desiredStatus = null
  ) => {
    setError("");
    setSuccess("");

    const customerName =
      String(
        form.customer?.name ||
        ""
      ).trim();

    const customerCompany =
      String(
        form.customer
          ?.companyName || ""
      ).trim();

    const hasCustomer =
      Boolean(
        customerName ||
        customerCompany
      );

    if (!hasCustomer) {
      setError(
        "Please enter the customer name or company name."
      );

      return;
    }

    const hasItems =
      calculations.items.some(
        (item) =>
          item.description
            .trim() &&
          item.total > 0
      );

    const finalStatus =
      desiredStatus ||
      form.status ||
      "draft";

    if (
      finalStatus !== "draft" &&
      finalStatus !==
      "cancelled" &&
      !hasItems
    ) {
      setError(
        "Please add at least one invoice item before sending or completing the invoice."
      );

      return;
    }

    setSaving(true);

    try {
      const payload = {
        ...form,

        status:
          ALLOWED_STATUSES.includes(
            finalStatus
          )
            ? finalStatus
            : "draft",

        business: {
          ...form.business,
        },

        customer: {
          ...form.customer,
        },

        items:
          calculations.items,

        subtotal:
          calculations.subtotal,

        discountAmount:
          calculations.discountAmount,

        taxRate:
          calculations.taxRate,

        taxAmount:
          calculations.taxAmount,

        serviceCharge:
          calculations.serviceCharge,

        grandTotal:
          calculations.grandTotal,

        amountPaid:
          calculations.amountPaid,

        balanceDue:
          calculations.balanceDue,
      };

      let response;

      if (isEditing) {
        response =
          await apiClient.put(
            `/invoices/${invoiceId}`,
            payload
          );
      } else {
        response =
          await apiClient.post(
            "/invoices",
            payload
          );
      }

      const savedInvoice =
        response?.data?.data ||
        response?.data;

      setForm((previous) => ({
        ...previous,

        status:
          savedInvoice?.status ||
          payload.status,

        invoiceNumber:
          savedInvoice?.invoiceNumber ||
          previous.invoiceNumber,
      }));

      setSuccess(
        isEditing
          ? "Invoice updated successfully."
          : "Invoice created successfully."
      );

      if (
        !isEditing &&
        savedInvoice?.id
      ) {
        navigate(
          `/invoice-generator?id=${savedInvoice.id}`,
          {
            replace: true,
          }
        );
      }
    } catch (requestError) {
      console.error(
        "SAVE INVOICE ERROR:",
        requestError
      );

      setError(
        requestError?.response
          ?.data?.message ||
        requestError?.message ||
        "Failed to save invoice."
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDuplicate =
    async () => {
      if (!invoiceId) {
        return;
      }

      setError("");
      setSuccess("");
      setSaving(true);

      try {
        const response =
          await apiClient.post(
            `/invoices/${invoiceId}/duplicate`
          );

        const duplicate =
          response?.data?.data ||
          response?.data;

        if (
          duplicate?.id
        ) {
          navigate(
            `/invoice-generator?id=${duplicate.id}`
          );
        } else {
          setSuccess(
            "Invoice duplicated successfully."
          );
        }
      } catch (requestError) {
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
        setSaving(false);
      }
    };

  const handleReset =
    () => {
      setForm({
        invoiceNumber:
          generateClientInvoiceNumber(),

        status: "draft",

        business: {
          ...DEFAULT_BUSINESS,
          name:
            user?.businessName ||
            user?.name ||
            "",
          phone:
            user?.phone || "",
          email:
            user?.email || "",
          logoUrl:
            user?.avatarUrl ||
            user?.avatar ||
            "",
        },

        customer: {
          ...DEFAULT_CUSTOMER,
        },

        invoiceDate:
          getToday(),

        dueDate:
          getDefaultDueDate(),

        currency: "NGN",

        paymentTerms:
          "Payment due within 30 days.",

        paymentDetails:
          "",

        items: [
          createItem(),
        ],

        discountAmount: 0,

        taxRate: 0,

        taxAmount: 0,

        serviceCharge: 0,

        amountPaid: 0,

        notes:
          "Thank you for your business.",

        termsAndConditions:
          "Goods and services are supplied according to the agreed terms.",

        template:
          "professional",
      });

      setServerCalculation(
        null
      );

      setError("");
      setSuccess("");
    };

  const handleDownloadPdf =
    useCallback(async () => {
      setPdfLoading(true);
      setError("");

      try {
        const jsPDFModule =
          await import("jspdf");

        const autoTableModule =
          await import(
            "jspdf-autotable"
          );

        const jsPDF =
          jsPDFModule.jsPDF ||
          jsPDFModule.default;

        const autoTable =
          autoTableModule.default ||
          autoTableModule;

        const doc =
          new jsPDF({
            orientation: "portrait",
            unit: "mm",
            format: "a4",
          });

        const pageWidth =
          doc.internal.pageSize.getWidth();

        const pageHeight =
          doc.internal.pageSize.getHeight();

        const margin = 15;

        const template =
          form.template ||
          "professional";

        const primary =
          template === "modern"
            ? [31, 41, 55]
            : [22, 163, 74];

        const watermarkImage =
          await loadImageForPdf(EAZY_DON_CHECK_LOGO);

        const secondary =
          template === "classic"
            ? [31, 41, 55]
            : [75, 85, 99];

        const drawText = (
          text,
          x,
          y,
          options = {}
        ) => {
          doc.text(
            String(
              text ?? ""
            ),
            x,
            y,
            options
          );
        };

        const drawWatermark = (pageNumber) => {
          if (!watermarkImage) return;

          try {
            doc.setPage(pageNumber);

            const maxSize = Math.min(
              pageWidth * 0.38,
              pageHeight * 0.28,
              85
            );

            const ratio =
              watermarkImage.width /
              watermarkImage.height;

            let watermarkWidth = maxSize;
            let watermarkHeight =
              watermarkWidth / ratio;

            if (watermarkHeight > maxSize) {
              watermarkHeight = maxSize;
              watermarkWidth =
                watermarkHeight * ratio;
            }

            const watermarkX =
              (pageWidth - watermarkWidth) / 2;
            const watermarkY =
              (pageHeight - watermarkHeight) / 2;

            doc.addImage(
              watermarkImage.dataUrl,
              "PNG",
              watermarkX,
              watermarkY,
              watermarkWidth,
              watermarkHeight,
              undefined,
              "FAST"
            );
          } catch (watermarkError) {
            console.warn(
              "PDF WATERMARK DRAW ERROR:",
              watermarkError
            );
          }
        };

        const cleanPdfText = (
          value
        ) => {
          return String(
            value ?? ""
          )
            .replace(
              /₦/g,
              "NGN "
            )
            .replace(
              /₵/g,
              "GHS "
            )
            .replace(
              /£/g,
              "GBP "
            )
            .replace(
              /€/g,
              "EUR "
            )
            .replace(
              /–/g,
              "-"
            )
            .replace(
              /—/g,
              "-"
            );
        };

        const pdfMoney = (
          amount
        ) =>
          cleanPdfText(
            formatPdfMoney(
              amount,
              form.currency
            )
          );

        // Draw the very faint EAZY DON CHECK watermark before
        // the invoice content so the first page content remains clear.
        drawWatermark(1);

        let currentY = 15;

        if (
          form.business.logoUrl
        ) {
          try {
            const imageFormat =
              form.business.logoUrl.startsWith(
                "data:image/png"
              )
                ? "PNG"
                : "JPEG";

            doc.addImage(
              form.business.logoUrl,
              imageFormat,
              margin,
              currentY,
              28,
              28
            );
          } catch (logoError) {
            console.warn(
              "PDF LOGO ERROR:",
              logoError
            );
          }
        }

        const businessX =
          form.business.logoUrl
            ? margin + 34
            : margin;

        doc.setFont(
          "helvetica",
          "bold"
        );

        doc.setFontSize(17);

        doc.setTextColor(
          17,
          24,
          39
        );

        drawText(
          form.business.name ||
          "Your Business Name",
          businessX,
          currentY + 7
        );

        doc.setFont(
          "helvetica",
          "normal"
        );

        doc.setFontSize(8);

        doc.setTextColor(
          100,
          116,
          139
        );

        let businessY =
          currentY + 13;

        const businessLines = [
          form.business.address,
          form.business.phone,
          form.business.email,
          form.business.website,
          form.business.taxNumber
            ? `Tax Number: ${form.business.taxNumber}`
            : "",
        ].filter(Boolean);

        businessLines.forEach(
          (line) => {
            const wrapped =
              doc.splitTextToSize(
                cleanPdfText(
                  line
                ),
                85
              );

            wrapped.forEach(
              (wrappedLine) => {
                drawText(
                  wrappedLine,
                  businessX,
                  businessY
                );

                businessY += 4;
              }
            );
          }
        );

        const invoiceRight =
          pageWidth - margin;

        doc.setFont(
          "helvetica",
          "bold"
        );

        doc.setFontSize(24);

        doc.setTextColor(
          ...primary
        );

        drawText(
          "INVOICE",
          invoiceRight,
          currentY + 8,
          {
            align: "right",
          }
        );

        doc.setFontSize(9);

        doc.setTextColor(
          55,
          65,
          81
        );

        doc.setFont(
          "helvetica",
          "bold"
        );

        drawText(
          cleanPdfText(
            form.invoiceNumber ||
            "EDC-INVOICE"
          ),
          invoiceRight,
          currentY + 16,
          {
            align: "right",
          }
        );

        doc.setFont(
          "helvetica",
          "normal"
        );

        doc.setFontSize(8);

        drawText(
          `Date: ${form.invoiceDate || "-"}`,
          invoiceRight,
          currentY + 22,
          {
            align: "right",
          }
        );

        drawText(
          `Due: ${form.dueDate || "-"}`,
          invoiceRight,
          currentY + 27,
          {
            align: "right",
          }
        );

        currentY = Math.max(
          businessY,
          currentY + 34
        ) + 8;

        doc.setDrawColor(
          226,
          232,
          240
        );

        doc.line(
          margin,
          currentY,
          pageWidth - margin,
          currentY
        );

        currentY += 8;

        doc.setFont(
          "helvetica",
          "bold"
        );

        doc.setFontSize(8);

        doc.setTextColor(
          100,
          116,
          139
        );

        drawText(
          "BILL TO",
          margin,
          currentY
        );

        drawText(
          "PAYMENT TERMS",
          pageWidth / 2 + 5,
          currentY
        );

        currentY += 5;

        doc.setFontSize(10);

        doc.setTextColor(
          17,
          24,
          39
        );

        const customerName =
          form.customer.name ||
          form.customer.companyName ||
          "Customer Name";

        doc.setFont(
          "helvetica",
          "bold"
        );

        drawText(
          cleanPdfText(
            customerName
          ),
          margin,
          currentY
        );

        if (
          form.customer.companyName &&
          form.customer.name
        ) {
          currentY += 4;

          doc.setFont(
            "helvetica",
            "normal"
          );

          doc.setFontSize(8);

          drawText(
            cleanPdfText(
              form.customer
                .companyName
            ),
            margin,
            currentY
          );
        }

        currentY += 5;

        doc.setFont(
          "helvetica",
          "normal"
        );

        doc.setFontSize(8);

        const customerLines = [
          form.customer.address,
          form.customer.phone,
          form.customer.email,
          form.customer.taxNumber
            ? `Tax Number: ${form.customer.taxNumber}`
            : "",
        ].filter(Boolean);

        customerLines.forEach(
          (line) => {
            const wrapped =
              doc.splitTextToSize(
                cleanPdfText(
                  line
                ),
                75
              );

            wrapped.forEach(
              (wrappedLine) => {
                drawText(
                  wrappedLine,
                  margin,
                  currentY
                );

                currentY += 4;
              }
            );
          }
        );

        let paymentY =
          currentY - 4;

        const paymentLines =
          doc.splitTextToSize(
            cleanPdfText(
              form.paymentTerms ||
              "Payment terms not specified."
            ),
            75
          );

        paymentLines.forEach(
          (line) => {
            drawText(
              line,
              pageWidth / 2 + 5,
              paymentY
            );

            paymentY += 4;
          }
        );

        currentY =
          Math.max(
            currentY,
            paymentY
          ) + 7;

        const tableItems =
          calculations.items.map(
            (item) => [
              "",
              cleanPdfText(
                item.description ||
                "Item description"
              ),
              String(
                item.qty
              ),
              pdfMoney(
                item.unitPrice
              ),
              pdfMoney(
                item.total
              ),
            ]
          );

        tableItems.forEach(
          (row, index) => {
            row[0] = String(
              index + 1
            );
          }
        );

        autoTable(
          doc,
          {
            startY: currentY,
            margin: {
              left: margin,
              right: margin,
            },
            tableWidth:
              pageWidth -
              margin * 2,
            head: [[
              "S/N",
              "Description",
              "Qty",
              "Unit Price",
              "Total",
            ]],
            body:
              tableItems.length
                ? tableItems
                : [[
                  "1",
                  "Item description",
                  "0",
                  pdfMoney(0),
                  pdfMoney(0),
                ]],
            theme: "grid",
            styles: {
              font:
                "helvetica",
              fontSize: 8,
              cellPadding: 3,
              textColor: [
                31,
                41,
                55,
              ],
              lineColor: [
                226,
                232,
                240,
              ],
              lineWidth: 0.2,
              valign:
                "middle",
            },
            headStyles: {
              fillColor:
                primary,
              textColor: [
                255,
                255,
                255,
              ],
              fontStyle:
                "bold",
              halign:
                "center",
            },
            columnStyles: {
              0: {
                cellWidth: 12,
                halign:
                  "center",
              },
              1: {
                cellWidth: 76,
                halign:
                  "left",
              },
              2: {
                cellWidth: 18,
                halign:
                  "center",
              },
              3: {
                cellWidth: 35,
                halign:
                  "center",
              },
              4: {
                cellWidth: 39,
                halign:
                  "center",
              },
            },
            alternateRowStyles: {
              fillColor: [
                248,
                250,
                252,
              ],
            },
          }
        );

        currentY =
          doc.lastAutoTable.finalY +
          8;

        const totalsX =
          pageWidth -
          margin -
          75;

        const valuesX =
          pageWidth -
          margin;

        const drawTotalRow = (
          label,
          value,
          y,
          options = {}
        ) => {
          doc.setFont(
            "helvetica",
            options.bold
              ? "bold"
              : "normal"
          );

          doc.setFontSize(
            options.fontSize ||
            8
          );

          doc.setTextColor(
            ...(options.color ||
              [
                71,
                85,
                105,
              ])
          );

          drawText(
            label,
            totalsX,
            y
          );

          drawText(
            cleanPdfText(
              value
            ),
            valuesX,
            y,
            {
              align: "right",
            }
          );
        };

        drawTotalRow(
          "Subtotal",
          pdfMoney(
            calculations.subtotal
          ),
          currentY
        );

        currentY += 5;

        if (
          calculations.discountAmount >
          0
        ) {
          drawTotalRow(
            "Discount",
            `- ${pdfMoney(
              calculations.discountAmount
            )}`,
            currentY,
            {
              color: [
                220,
                38,
                38,
              ],
            }
          );

          currentY += 5;
        }

        if (
          calculations.taxRate >
          0
        ) {
          drawTotalRow(
            `Tax (${calculations.taxRate}%)`,
            pdfMoney(
              calculations.taxAmount
            ),
            currentY
          );

          currentY += 5;
        }

        if (
          calculations.serviceCharge >
          0
        ) {
          drawTotalRow(
            "Service Charge",
            pdfMoney(
              calculations.serviceCharge
            ),
            currentY
          );

          currentY += 5;
        }

        doc.setDrawColor(
          203,
          213,
          225
        );

        doc.line(
          totalsX,
          currentY - 1,
          valuesX,
          currentY - 1
        );

        currentY += 5;

        doc.setFillColor(
          ...primary
        );

        doc.roundedRect(
          totalsX - 5,
          currentY - 5,
          80,
          12,
          2,
          2,
          "F"
        );

        doc.setFont(
          "helvetica",
          "bold"
        );

        doc.setFontSize(9);

        doc.setTextColor(
          255,
          255,
          255
        );

        drawText(
          "Grand Total",
          totalsX,
          currentY + 3
        );

        drawText(
          pdfMoney(
            calculations.grandTotal
          ),
          valuesX,
          currentY + 3,
          {
            align: "right",
          }
        );

        currentY += 18;

        if (
          calculations.amountPaid >
          0
        ) {
          drawTotalRow(
            "Amount Paid",
            pdfMoney(
              calculations.amountPaid
            ),
            currentY,
            {
              color: [
                22,
                163,
                74,
              ],
            }
          );

          currentY += 5;
        }

        drawTotalRow(
          "Balance Due",
          pdfMoney(
            calculations.balanceDue
          ),
          currentY,
          {
            bold: true,
            fontSize: 9,
            color: [
              17,
              24,
              39,
            ],
          }
        );

        currentY += 12;

        if (
          form.paymentDetails
        ) {
          doc.setFont(
            "helvetica",
            "bold"
          );

          doc.setFontSize(8);

          doc.setTextColor(
            100,
            116,
            139
          );

          drawText(
            "PAYMENT DETAILS",
            margin,
            currentY
          );

          currentY += 5;

          doc.setFont(
            "helvetica",
            "normal"
          );

          doc.setFontSize(8);

          doc.setTextColor(
            71,
            85,
            105
          );

          const paymentDetailLines =
            doc.splitTextToSize(
              cleanPdfText(
                form.paymentDetails
              ),
              pageWidth -
              margin * 2
            );

          paymentDetailLines.forEach(
            (line) => {
              if (
                currentY >
                pageHeight - 35
              ) {
                doc.addPage();
                currentY = 20;
              }

              drawText(
                line,
                margin,
                currentY
              );

              currentY += 4;
            }
          );

          currentY += 4;
        }

        if (form.notes) {
          doc.setFont(
            "helvetica",
            "bold"
          );

          doc.setFontSize(8);

          doc.setTextColor(
            100,
            116,
            139
          );

          drawText(
            "NOTES",
            margin,
            currentY
          );

          currentY += 5;

          doc.setFont(
            "helvetica",
            "normal"
          );

          doc.setTextColor(
            71,
            85,
            105
          );

          const noteLines =
            doc.splitTextToSize(
              cleanPdfText(
                form.notes
              ),
              pageWidth -
              margin * 2
            );

          noteLines.forEach(
            (line) => {
              if (
                currentY >
                pageHeight - 30
              ) {
                doc.addPage();
                currentY = 20;
              }

              drawText(
                line,
                margin,
                currentY
              );

              currentY += 4;
            }
          );

          currentY += 4;
        }

        if (
          form.termsAndConditions
        ) {
          doc.setFont(
            "helvetica",
            "bold"
          );

          doc.setFontSize(8);

          doc.setTextColor(
            100,
            116,
            139
          );

          drawText(
            "TERMS & CONDITIONS",
            margin,
            currentY
          );

          currentY += 5;

          doc.setFont(
            "helvetica",
            "normal"
          );

          doc.setTextColor(
            71,
            85,
            105
          );

          const termsLines =
            doc.splitTextToSize(
              cleanPdfText(
                form.termsAndConditions
              ),
              pageWidth -
              margin * 2
            );

          termsLines.forEach(
            (line) => {
              if (
                currentY >
                pageHeight - 25
              ) {
                doc.addPage();
                currentY = 20;
              }

              drawText(
                line,
                margin,
                currentY
              );

              currentY += 4;
            }
          );
        }

        const totalPages =
          doc.getNumberOfPages();

        for (
          let page = 1;
          page <= totalPages;
          page += 1
        ) {
          doc.setPage(
            page
          );

          // Pages created later by jsPDF are not available when the
          // initial watermark is drawn, so add the same faint watermark
          // to those pages after layout is complete.
          if (page > 1) {
            drawWatermark(page);
          }

          doc.setFont(
            "helvetica",
            "normal"
          );

          doc.setFontSize(7);

          doc.setTextColor(
            148,
            163,
            184
          );

          drawText(
            "Generated with EAZY DON CHECK",
            pageWidth / 2,
            pageHeight - 8,
            {
              align: "center",
            }
          );

          drawText(
            `Page ${page} of ${totalPages}`,
            pageWidth - margin,
            pageHeight - 8,
            {
              align: "right",
            }
          );
        }

        const safeInvoiceNumber =
          String(
            form.invoiceNumber ||
            "invoice"
          )
            .replace(
              /[^a-zA-Z0-9-_]/g,
              "-"
            );

        doc.save(
          `${safeInvoiceNumber}.pdf`
        );

        if (isEditing) {
          try {
            await apiClient.post(
              `/invoices/${invoiceId}/exported`
            );
          } catch (markError) {
            console.warn(
              "Unable to mark invoice exported:",
              markError
            );
          }
        }

        setSuccess(
          "Invoice PDF downloaded successfully."
        );
      } catch (requestError) {
        console.error(
          "PDF EXPORT ERROR:",
          requestError
        );

        setError(
          requestError?.message ||
          "Unable to generate the invoice PDF."
        );
      } finally {
        setPdfLoading(false);
      }
    }, [
      calculations,
      form,
      invoiceId,
      isEditing,
    ]);

  if (loading) {
    return (
      <AppLayout>
        <div className="min-h-[70vh] flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-10 w-10 animate-spin text-brand-500" />

            <p className="text-sm text-gray-600 dark:text-gray-300">
              Loading invoice...
            </p>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="min-h-full bg-gray-50 dark:bg-dark-bg">
        <div className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8">

          {/* HEADER */}
          <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">

            <div className="flex items-start gap-3">
              <button
                type="button"
                onClick={() =>
                  navigate(-1)
                }
                className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-600 transition hover:bg-gray-50 dark:border-dark-border dark:bg-dark-card dark:text-gray-300 dark:hover:bg-gray-800"
                aria-label="Go back"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>

              <div>
                <div className="flex items-center gap-2">
                  <ReceiptText className="h-7 w-7 text-brand-600" />

                  <h1 className="text-2xl font-bold text-gray-900 dark:text-white sm:text-3xl">
                    Invoice Generator
                  </h1>
                </div>

                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  Create professional invoices for your customers with automatic calculations.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">

              {isEditing && (
                <button
                  type="button"
                  onClick={
                    handleDuplicate
                  }
                  disabled={saving}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-dark-border dark:bg-dark-card dark:text-gray-200 dark:hover:bg-gray-800"
                >
                  <Copy className="h-4 w-4" />
                  Duplicate
                </button>
              )}

              <button
                type="button"
                onClick={() =>
                  setShowPreview(true)
                }
                className="inline-flex items-center gap-1.5 rounded-lg border border-brand-200 bg-brand-50 px-3 py-1.5 text-xs font-semibold text-brand-700 transition hover:bg-brand-100 dark:border-brand-900/40 dark:bg-brand-950/30 dark:text-brand-300"
              >
                <Eye className="h-4 w-4" />
                Open Preview
              </button>

              <button
                type="button"
                onClick={
                  handleDownloadPdf
                }
                disabled={pdfLoading}
                className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-dark-border dark:bg-dark-card dark:text-gray-200 dark:hover:bg-gray-800"
              >
                {pdfLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
                Download PDF
              </button>

              <button
                type="button"
                onClick={() =>
                  handleSave("draft")
                }
                disabled={saving}
                className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}

                Save Draft
              </button>
            </div>
          </div>

          {/* ALERTS */}

          {error && (
            <div className="mb-5 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
              <X className="mt-0.5 h-5 w-5 shrink-0" />

              <div className="flex-1">
                {error}
              </div>

              <button
                type="button"
                onClick={() =>
                  setError("")
                }
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          {success && (
            <div className="mb-5 flex items-start gap-3 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-700 dark:border-green-900/50 dark:bg-green-950/30 dark:text-green-300">
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />

              <div className="flex-1">
                {success}
              </div>

              <button
                type="button"
                onClick={() =>
                  setSuccess("")
                }
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          <div
            className={`grid grid-cols-1 gap-6 ${
              previewCollapsed
                ? ""
                : "xl:grid-cols-[minmax(0,1fr)_520px]"
            }`}
          >

            {/* FORM */}

            <div className="space-y-5">

              {/* INVOICE DETAILS */}

              <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-dark-border dark:bg-dark-card">

                <SectionHeader
                  icon={
                    <FileText className="h-5 w-5" />
                  }
                  title="Invoice Details"
                  description="Basic information about this invoice."
                />

                <div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2 lg:grid-cols-4">

                  <InputField
                    label="Invoice Number"
                    value={
                      form.invoiceNumber
                    }
                    onChange={(value) =>
                      updateForm(
                        "invoiceNumber",
                        value
                      )
                    }
                    placeholder="EDC-2026-0001"
                  />

                  <InputField
                    label="Invoice Date"
                    type="date"
                    value={
                      form.invoiceDate
                    }
                    onChange={(value) =>
                      updateForm(
                        "invoiceDate",
                        value
                      )
                    }
                  />

                  <InputField
                    label="Due Date"
                    type="date"
                    value={
                      form.dueDate
                    }
                    onChange={(value) =>
                      updateForm(
                        "dueDate",
                        value
                      )
                    }
                  />

                  <SelectField
                    label="Currency"
                    value={
                      form.currency
                    }
                    onChange={(value) =>
                      updateForm(
                        "currency",
                        value
                      )
                    }
                    options={
                      CURRENCIES
                    }
                  />

                </div>
              </section>

              {/* BUSINESS + CUSTOMER */}

              <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">

                {/* BUSINESS */}

                <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-dark-border dark:bg-dark-card">

                  <SectionHeader
                    icon={
                      <Building2 className="h-5 w-5" />
                    }
                    title="Business Details"
                    description="Information displayed as the seller."
                  />

                  <div className="space-y-4 p-5">

                    <InputField
                      label="Business Name"
                      value={
                        form.business.name
                      }
                      onChange={(value) =>
                        updateBusiness(
                          "name",
                          value
                        )
                      }
                      placeholder="Your business name"
                    />

                    {/* BUSINESS LOGO */}

                    <div>
                      <span className="mb-1.5 block text-xs font-semibold text-gray-600 dark:text-gray-300">
                        Business Logo
                      </span>

                      <div className="flex flex-col gap-3 rounded-xl border border-dashed border-gray-300 bg-gray-50 p-4 dark:border-dark-border dark:bg-dark-bg sm:flex-row sm:items-center">

                        <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-dark-border dark:bg-white">

                          {form.business.logoUrl ? (
                            <img
                              src={
                                form.business.logoUrl
                              }
                              alt="Business logo"
                              className="h-full w-full object-contain p-1"
                            />
                          ) : (
                            <ImageIcon className="h-8 w-8 text-gray-400" />
                          )}

                        </div>

                        <div className="min-w-0 flex-1">

                          <p className="text-sm font-semibold text-gray-800 dark:text-white">
                            {form.business.logoUrl
                              ? "Business logo attached"
                              : "Add your business logo"}
                          </p>

                          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                            PNG, JPG, JPEG or WEBP. Maximum 5MB.
                          </p>

                          <div className="mt-3 flex flex-wrap gap-2">

                            <input
                              ref={
                                logoInputRef
                              }
                              type="file"
                              accept="image/png,image/jpeg,image/jpg,image/webp"
                              onChange={
                                handleLogoUpload
                              }
                              className="hidden"
                            />

                            <button
                              type="button"
                              onClick={() =>
                                logoInputRef.current?.click()
                              }
                              className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-brand-700"
                            >
                              <Upload className="h-4 w-4" />

                              {form.business.logoUrl
                                ? "Replace Logo"
                                : "Upload Logo"}
                            </button>

                            {form.business.logoUrl && (
                              <button
                                type="button"
                                onClick={
                                  removeLogo
                                }
                                className="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-white px-3 py-2 text-xs font-semibold text-red-600 transition hover:bg-red-50 dark:border-red-900/50 dark:bg-dark-card dark:text-red-300 dark:hover:bg-red-950/30"
                              >
                                <Trash2 className="h-4 w-4" />
                                Remove
                              </button>
                            )}

                          </div>
                        </div>
                      </div>
                    </div>

                    <InputField
                      label="Business Address"
                      value={
                        form.business.address
                      }
                      onChange={(value) =>
                        updateBusiness(
                          "address",
                          value
                        )
                      }
                      placeholder="Business address"
                    />

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">

                      <InputField
                        label="Phone"
                        value={
                          form.business.phone
                        }
                        onChange={(value) =>
                          updateBusiness(
                            "phone",
                            value
                          )
                        }
                        placeholder="080..."
                      />

                      <InputField
                        label="Email"
                        type="email"
                        value={
                          form.business.email
                        }
                        onChange={(value) =>
                          updateBusiness(
                            "email",
                            value
                          )
                        }
                        placeholder="business@example.com"
                      />

                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">

                      <InputField
                        label="Website"
                        value={
                          form.business.website
                        }
                        onChange={(value) =>
                          updateBusiness(
                            "website",
                            value
                          )
                        }
                        placeholder="www.example.com"
                      />

                      <InputField
                        label="Tax Number"
                        value={
                          form.business.taxNumber
                        }
                        onChange={(value) =>
                          updateBusiness(
                            "taxNumber",
                            value
                          )
                        }
                        placeholder="Optional"
                      />

                    </div>

                  </div>
                </section>

                {/* CUSTOMER */}

                <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-dark-border dark:bg-dark-card">

                  <SectionHeader
                    icon={
                      <UserRound className="h-5 w-5" />
                    }
                    title="Customer Details"
                    description="Who is receiving this invoice?"
                  />

                  <div className="space-y-4 p-5">

                    <InputField
                      label="Customer Name"
                      value={
                        form.customer.name
                      }
                      onChange={(value) =>
                        updateCustomer(
                          "name",
                          value
                        )
                      }
                      placeholder="Customer name"
                      required
                    />

                    <InputField
                      label="Company Name"
                      value={
                        form.customer
                          .companyName
                      }
                      onChange={(value) =>
                        updateCustomer(
                          "companyName",
                          value
                        )
                      }
                      placeholder="Optional company name"
                    />

                    <InputField
                      label="Customer Address"
                      value={
                        form.customer.address
                      }
                      onChange={(value) =>
                        updateCustomer(
                          "address",
                          value
                        )
                      }
                      placeholder="Customer address"
                    />

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">

                      <InputField
                        label="Phone"
                        value={
                          form.customer.phone
                        }
                        onChange={(value) =>
                          updateCustomer(
                            "phone",
                            value
                          )
                        }
                        placeholder="080..."
                      />

                      <InputField
                        label="Email"
                        type="email"
                        value={
                          form.customer.email
                        }
                        onChange={(value) =>
                          updateCustomer(
                            "email",
                            value
                          )
                        }
                        placeholder="customer@example.com"
                      />

                    </div>

                    <InputField
                      label="Tax Number"
                      value={
                        form.customer.taxNumber
                      }
                      onChange={(value) =>
                        updateCustomer(
                          "taxNumber",
                          value
                        )
                      }
                      placeholder="Optional"
                    />

                  </div>
                </section>
              </div>

              {/* ITEMS */}

              <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-dark-border dark:bg-dark-card">

                <SectionHeader
                  icon={
                    <Calculator className="h-5 w-5" />
                  }
                  title="Invoice Items"
                  description="Add the products or services being billed."
                  action={
                    <button
                      type="button"
                      onClick={
                        addItem
                      }
                      className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-brand-700"
                    >
                      <Plus className="h-4 w-4" />
                      Add Item
                    </button>
                  }
                />

                <div className="overflow-x-auto">
                  <table className="w-full min-w-[720px]">

                    <thead>
                      <tr className="border-b border-gray-200 bg-gray-50 text-left text-xs font-bold uppercase tracking-wide text-gray-500 dark:border-dark-border dark:bg-gray-900/40 dark:text-gray-400">

                        <th className="w-14 px-4 py-3 text-center">
                          S/N
                        </th>

                        <th className="px-4 py-3">
                          Description
                        </th>

                        <th className="w-24 px-4 py-3 text-right">
                          Qty
                        </th>

                        <th className="w-36 px-4 py-3 text-right">
                          Price
                        </th>

                        <th className="w-36 px-4 py-3 text-right">
                          Total
                        </th>

                        <th className="w-14 px-2 py-3" />

                      </tr>
                    </thead>

                    <tbody className="divide-y divide-gray-100 dark:divide-dark-border">

                      {form.items.map(
                        (
                          item,
                          index
                        ) => (
                          <tr
                            key={
                              item._localId ||
                              `invoice-item-${index}`
                            }
                            className="align-middle"
                          >

                            <td className="px-4 py-3 text-center text-sm font-semibold text-gray-500 dark:text-gray-400">
                              {index + 1}
                            </td>

                            <td className="px-4 py-3">

                              <input
                                type="text"
                                value={
                                  item.description
                                }
                                onChange={(
                                  event
                                ) =>
                                  updateItem(
                                    index,
                                    "description",
                                    event
                                      .target
                                      .value
                                  )
                                }
                                placeholder="Product or service description"
                                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-dark-border dark:bg-dark-bg dark:text-white"
                              />

                            </td>

                            <td className="px-4 py-3">

                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={
                                  item.qty
                                }
                                onChange={(
                                  event
                                ) =>
                                  updateItem(
                                    index,
                                    "qty",
                                    event
                                      .target
                                      .value
                                  )
                                }
                                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-right text-sm text-gray-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-dark-border dark:bg-dark-bg dark:text-white"
                              />

                            </td>

                            <td className="px-4 py-3">

                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={
                                  item.unitPrice
                                }
                                onChange={(
                                  event
                                ) =>
                                  updateItem(
                                    index,
                                    "unitPrice",
                                    event
                                      .target
                                      .value
                                  )
                                }
                                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-right text-sm text-gray-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-dark-border dark:bg-dark-bg dark:text-white"
                              />

                            </td>

                            <td className="px-4 py-3 text-right text-sm font-bold text-gray-900 dark:text-white">
                              {formatMoney(
                                normalizeItem(
                                  item
                                ).total,
                                form.currency
                              )}
                            </td>

                            <td className="px-2 py-3 text-center">

                              <button
                                type="button"
                                onClick={() =>
                                  removeItem(
                                    index
                                  )
                                }
                                className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-gray-400 transition hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30"
                                aria-label={`Remove item ${index + 1}`}
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>

                            </td>

                          </tr>
                        )
                      )}

                    </tbody>
                  </table>
                </div>

                <div className="flex flex-col gap-3 border-t border-gray-200 bg-gray-50 p-4 dark:border-dark-border dark:bg-gray-900/30 sm:flex-row sm:items-center sm:justify-between">

                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Line totals are automatically calculated as Qty × Price.
                  </p>

                  <button
                    type="button"
                    onClick={
                      calculateOnServer
                    }
                    disabled={
                      calculationLoading
                    }
                    className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700 transition hover:bg-gray-50 disabled:opacity-60 dark:border-dark-border dark:bg-dark-card dark:text-gray-200"
                  >
                    {calculationLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Calculator className="h-4 w-4" />
                    )}

                    Verify Calculation
                  </button>
                </div>
              </section>

              {/* CHARGES */}

              <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-dark-border dark:bg-dark-card">

                <SectionHeader
                  icon={
                    <Settings2 className="h-5 w-5" />
                  }
                  title="Charges & Payment"
                  description="Configure discounts, taxes and payment information."
                />

                <div className="grid grid-cols-1 gap-5 p-5 sm:grid-cols-2 lg:grid-cols-4">

                  <NumberField
                    label="Discount"
                    value={
                      form.discountAmount
                    }
                    onChange={(value) =>
                      updateForm(
                        "discountAmount",
                        value
                      )
                    }
                  />

                  <NumberField
                    label="Tax Rate (%)"
                    value={
                      form.taxRate
                    }
                    onChange={(value) =>
                      updateForm(
                        "taxRate",
                        value
                      )
                    }
                    suffix="%"
                  />

                  <NumberField
                    label="Service Charge"
                    value={
                      form.serviceCharge
                    }
                    onChange={(value) =>
                      updateForm(
                        "serviceCharge",
                        value
                      )
                    }
                  />

                  <NumberField
                    label="Amount Paid"
                    value={
                      form.amountPaid
                    }
                    onChange={(value) =>
                      updateForm(
                        "amountPaid",
                        value
                      )
                    }
                  />

                </div>

                <div className="grid grid-cols-1 gap-5 border-t border-gray-200 p-5 dark:border-dark-border lg:grid-cols-2">

                  <TextAreaField
                    label="Payment Terms"
                    value={
                      form.paymentTerms
                    }
                    onChange={(value) =>
                      updateForm(
                        "paymentTerms",
                        value
                      )
                    }
                    placeholder="e.g. Payment due within 30 days."
                  />

                  <TextAreaField
                    label="Payment Details"
                    value={
                      form.paymentDetails
                    }
                    onChange={(value) =>
                      updateForm(
                        "paymentDetails",
                        value
                      )
                    }
                    placeholder="Bank name, account number, transfer details, etc."
                  />

                  <TextAreaField
                    label="Notes"
                    value={
                      form.notes
                    }
                    onChange={(value) =>
                      updateForm(
                        "notes",
                        value
                      )
                    }
                    placeholder="Additional notes"
                  />

                  <TextAreaField
                    label="Terms & Conditions"
                    value={
                      form.termsAndConditions
                    }
                    onChange={(value) =>
                      updateForm(
                        "termsAndConditions",
                        value
                      )
                    }
                    placeholder="Terms and conditions"
                  />

                </div>
              </section>

              {/* TEMPLATE */}

              <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-dark-border dark:bg-dark-card">

                <SectionHeader
                  icon={
                    <Eye className="h-5 w-5" />
                  }
                  title="Invoice Template"
                  description="Choose how your invoice will look."
                />

                <div className="grid grid-cols-1 gap-3 p-5 sm:grid-cols-2 xl:grid-cols-4">

                  {TEMPLATES.map(
                    (template) => {
                      const selected =
                        form.template ===
                        template.value;

                      return (
                        <button
                          key={
                            template.value
                          }
                          type="button"
                          onClick={() =>
                            updateForm(
                              "template",
                              template.value
                            )
                          }
                          className={`rounded-xl border p-4 text-left transition ${
                            selected
                              ? "border-brand-500 bg-brand-50 ring-2 ring-brand-500/20 dark:border-brand-500 dark:bg-brand-950/30"
                              : "border-gray-200 bg-white hover:border-brand-300 hover:bg-gray-50 dark:border-dark-border dark:bg-dark-bg dark:hover:border-brand-700"
                          }`}
                        >

                          <div className="mb-3 flex items-center justify-between">

                            <span
                              className={`text-sm font-bold ${
                                selected
                                  ? "text-brand-700 dark:text-brand-300"
                                  : "text-gray-800 dark:text-white"
                              }`}
                            >
                              {
                                template.label
                              }
                            </span>

                            {selected && (
                              <CheckCircle2 className="h-5 w-5 text-brand-600" />
                            )}

                          </div>

                          <div className="mb-3 h-16 rounded-lg border border-gray-200 bg-white p-2 dark:border-dark-border dark:bg-gray-900">

                            <div className="h-2 w-1/2 rounded bg-gray-300 dark:bg-gray-700" />

                            <div className="mt-2 h-1.5 w-full rounded bg-gray-200 dark:bg-gray-800" />

                            <div className="mt-1 h-1.5 w-4/5 rounded bg-gray-200 dark:bg-gray-800" />

                            <div className="mt-3 flex gap-1">

                              <div className="h-2 w-1/4 rounded bg-brand-200 dark:bg-brand-900" />

                              <div className="h-2 flex-1 rounded bg-gray-200 dark:bg-gray-800" />

                            </div>
                          </div>

                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {
                              template.description
                            }
                          </p>

                        </button>
                      );
                    }
                  )}

                </div>
              </section>

              {/* BOTTOM ACTIONS */}

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

                <button
                  type="button"
                  onClick={
                    handleReset
                  }
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-5 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 dark:border-dark-border dark:bg-dark-card dark:text-gray-200"
                >
                  <X className="h-4 w-4" />
                  Clear Form
                </button>

                <div className="flex flex-col gap-3 sm:flex-row">

                  <button
                    type="button"
                    onClick={() =>
                      handleSave(
                        "sent"
                      )
                    }
                    disabled={saving}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-brand-200 bg-brand-50 px-5 py-3 text-sm font-bold text-brand-700 transition hover:bg-brand-100 disabled:opacity-60 dark:border-brand-900/50 dark:bg-brand-950/30 dark:text-brand-300"
                  >
                    <FileText className="h-4 w-4" />
                    Save & Mark Sent
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      handleSave(
                        form.status
                      )
                    }
                    disabled={saving}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-600 px-6 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {saving ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )}

                    {isEditing
                      ? "Update Invoice"
                      : "Save Invoice"}
                  </button>

                </div>
              </div>
            </div>

            {/* LIVE PREVIEW */}

            {!previewCollapsed && (
              <div className="xl:sticky xl:top-6 xl:self-start">

                <div className="sticky top-3 z-30 mb-3 flex items-center justify-between gap-3 rounded-xl border border-gray-200 bg-gray-50/95 px-3 py-2 shadow-sm backdrop-blur-sm dark:border-dark-border dark:bg-dark-bg/95">

                  <div>
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                      Live Preview
                    </h2>

                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Your invoice updates automatically.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setPreviewCollapsed(true)
                      }
                      className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 transition hover:bg-gray-50 dark:border-dark-border dark:bg-dark-card dark:text-gray-200 dark:hover:bg-gray-800"
                      title="Collapse live preview to make more room for invoice entries"
                    >
                      <PanelRightClose className="h-3.5 w-3.5" />
                      Collapse
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        setShowPreview(true)
                      }
                      className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-3 py-1.5 text-xs font-semibold text-brand-700 transition hover:bg-brand-100 dark:bg-brand-950/30 dark:text-brand-300"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      Open
                    </button>
                  </div>

                </div>

              <InvoicePreview
                form={form}
                calculations={
                  calculations
                }
                onDownloadPdf={
                  handleDownloadPdf
                }
                pdfLoading={
                  pdfLoading
                }
              />

              <div className="mt-4 grid grid-cols-2 gap-3">

                <SummaryCard
                  label="Subtotal"
                  value={formatMoney(
                    calculations.subtotal,
                    form.currency
                  )}
                />

                <SummaryCard
                  label="Grand Total"
                  value={formatMoney(
                    calculations.grandTotal,
                    form.currency
                  )}
                  highlight
                />

                <SummaryCard
                  label="Paid"
                  value={formatMoney(
                    calculations.amountPaid,
                    form.currency
                  )}
                />

                <SummaryCard
                  label="Balance Due"
                  value={formatMoney(
                    calculations.balanceDue,
                    form.currency
                  )}
                />

              </div>
            </div>
            )}

            {previewCollapsed && (
              <div className="fixed right-4 top-24 z-[60] sm:right-6">
                <button
                  type="button"
                  onClick={() =>
                    setPreviewCollapsed(false)
                  }
                  className="inline-flex items-center gap-1.5 rounded-lg border border-brand-200 bg-brand-50 px-3 py-2 text-xs font-semibold text-brand-700 shadow-lg backdrop-blur-sm transition hover:bg-brand-100 dark:border-brand-900/50 dark:bg-brand-950/90 dark:text-brand-300"
                  title="Restore Live Preview"
                >
                  <PanelRightOpen className="h-3.5 w-3.5" />
                  Restore Preview
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* PREVIEW MODAL */}

      {showPreview && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-3 backdrop-blur-sm sm:p-6"
          onMouseDown={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              setShowPreview(false);
            }
          }}
        >

          <div className="flex max-h-[95vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-gray-100 shadow-2xl dark:bg-dark-bg">

            <div className="flex items-center justify-between border-b border-gray-200 bg-white px-4 py-3 dark:border-dark-border dark:bg-dark-card">

              <div>
                <h3 className="font-bold text-gray-900 dark:text-white">
                  Invoice Preview
                </h3>

                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {form.invoiceNumber}
                </p>
              </div>

              <div className="flex items-center gap-2">

                <button
                  type="button"
                  onClick={
                    handleDownloadPdf
                  }
                  disabled={
                    pdfLoading
                  }
                  className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700 transition hover:bg-gray-50 disabled:opacity-60 dark:border-dark-border dark:bg-dark-bg dark:text-gray-200"
                >
                  {pdfLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4" />
                  )}
                  PDF
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setShowPreview(false)
                  }
                  className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700 transition hover:bg-gray-50 dark:border-dark-border dark:bg-dark-bg dark:text-gray-200"
                >
                  <X className="h-4 w-4" />
                  Close Preview
                </button>

              </div>
            </div>

            <div className="overflow-y-auto p-3 sm:p-6">

              <InvoicePreview
                form={form}
                calculations={
                  calculations
                }
                onDownloadPdf={
                  handleDownloadPdf
                }
                pdfLoading={
                  pdfLoading
                }
              />

            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
};

/* =========================================================
   SECTION HEADER
========================================================= */

const SectionHeader = ({
  icon,
  title,
  description,
  action,
}) => {
  return (
    <div className="flex flex-col gap-3 border-b border-gray-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between dark:border-dark-border">

      <div className="flex items-start gap-3">

        <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600 dark:bg-brand-950/30 dark:text-brand-400">
          {icon}
        </div>

        <div>

          <h2 className="text-sm font-bold text-gray-900 dark:text-white">
            {title}
          </h2>

          <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
            {description}
          </p>

        </div>
      </div>

      {action}
    </div>
  );
};

/* =========================================================
   INPUT
========================================================= */

const InputField = ({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  required = false,
}) => {
  return (
    <label className="block">

      <span className="mb-1.5 block text-xs font-semibold text-gray-600 dark:text-gray-300">

        {label}

        {required && (
          <span className="ml-1 text-red-500">
            *
          </span>
        )}

      </span>

      <input
        type={type}
        value={value ?? ""}
        onChange={(event) =>
          onChange(
            event.target.value
          )
        }
        placeholder={
          placeholder
        }
        className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-dark-border dark:bg-dark-bg dark:text-white"
      />

    </label>
  );
};

/* =========================================================
   NUMBER
========================================================= */

const NumberField = ({
  label,
  value,
  onChange,
  suffix,
}) => {
  return (
    <label className="block">

      <span className="mb-1.5 block text-xs font-semibold text-gray-600 dark:text-gray-300">
        {label}
      </span>

      <div className="relative">

        <input
          type="number"
          min="0"
          step="0.01"
          value={
            value ?? 0
          }
          onChange={(event) =>
            onChange(
              event.target.value
            )
          }
          className={`w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-dark-border dark:bg-dark-bg dark:text-white ${
            suffix
              ? "pr-10"
              : ""
          }`}
        />

        {suffix && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">
            {suffix}
          </span>
        )}

      </div>
    </label>
  );
};

/* =========================================================
   SELECT
========================================================= */

const SelectField = ({
  label,
  value,
  onChange,
  options,
}) => {
  return (
    <label className="block">

      <span className="mb-1.5 block text-xs font-semibold text-gray-600 dark:text-gray-300">
        {label}
      </span>

      <div className="relative">

        <select
          value={value}
          onChange={(event) =>
            onChange(
              event.target.value
            )
          }
          className="w-full appearance-none rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 pr-9 text-sm text-gray-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-dark-border dark:bg-dark-bg dark:text-white"
        >
          {options.map(
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

        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />

      </div>
    </label>
  );
};

/* =========================================================
   TEXTAREA
========================================================= */

const TextAreaField = ({
  label,
  value,
  onChange,
  placeholder,
}) => {
  return (
    <label className="block">

      <span className="mb-1.5 block text-xs font-semibold text-gray-600 dark:text-gray-300">
        {label}
      </span>

      <textarea
        rows={4}
        value={value ?? ""}
        onChange={(event) =>
          onChange(
            event.target.value
          )
        }
        placeholder={
          placeholder
        }
        className="w-full resize-y rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-dark-border dark:bg-dark-bg dark:text-white"
      />

    </label>
  );
};

/* =========================================================
   SUMMARY CARD
========================================================= */

const SummaryCard = ({
  label,
  value,
  highlight = false,
}) => {
  return (
    <div
      className={`min-w-0 rounded-xl border p-3 text-center sm:p-4 ${
        highlight
          ? "border-brand-200 bg-brand-50 dark:border-brand-900/40 dark:bg-brand-950/30"
          : "border-gray-200 bg-white dark:border-dark-border dark:bg-dark-card"
      }`}
    >

      <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 sm:text-[11px]">
        {label}
      </p>

      <p
        className={`mt-1 break-words text-sm font-bold leading-tight sm:text-base ${
          highlight
            ? "text-brand-700 dark:text-brand-300"
            : "text-gray-900 dark:text-white"
        }`}
      >
        {value}
      </p>

    </div>
  );
};

/* =========================================================
   INVOICE PREVIEW
========================================================= */

const InvoicePreview = ({
  form,
  calculations,
  onDownloadPdf,
  pdfLoading,
}) => {
  const template =
    form.template ||
    "professional";

  const items =
    calculations?.items ||
    form.items.map(
      normalizeItem
    );

  const subtotal =
    calculations?.subtotal ??
    0;

  const discountAmount =
    calculations?.discountAmount ??
    0;

  const taxRate =
    calculations?.taxRate ??
    0;

  const taxAmount =
    calculations?.taxAmount ??
    0;

  const serviceCharge =
    calculations?.serviceCharge ??
    0;

  const grandTotal =
    calculations?.grandTotal ??
    0;

  const amountPaid =
    calculations?.amountPaid ??
    0;

  const balanceDue =
    calculations?.balanceDue ??
    0;

  const isModern =
    template === "modern";

  const isClassic =
    template === "classic";

  return (
    <div
      className={`mx-auto w-full max-w-[760px] overflow-hidden bg-white text-gray-900 shadow-xl ${
        isClassic
          ? "border-4 border-gray-900"
          : "border border-gray-200"
      }`}
    >

      {/* TOP */}

      <div
        className={`p-6 sm:p-8 ${
          isModern
            ? "bg-gray-900 text-white"
            : isClassic
              ? "border-b-2 border-gray-900 bg-gray-100"
              : "bg-white"
        }`}
      >

        <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">

          <div className="flex min-w-0 items-start gap-4">

            {form.business.logoUrl ? (
              <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-gray-200 bg-white p-1 shadow-sm">
                <img
                  src={
                    form.business.logoUrl
                  }
                  alt={
                    form.business.name ||
                    "Business logo"
                  }
                  className="h-full w-full object-contain"
                />
              </div>
            ) : (
              <div
                className={`flex h-20 w-20 shrink-0 items-center justify-center rounded-xl ${
                  isModern
                    ? "bg-white/10 text-white"
                    : "bg-brand-50 text-brand-600"
                }`}
              >
                <Building2 className="h-9 w-9" />
              </div>
            )}

            <div className="min-w-0">

              <h1
                className={`text-xl font-extrabold sm:text-2xl ${
                  isModern
                    ? "text-white"
                    : "text-gray-900"
                }`}
              >
                {form.business.name ||
                  "Your Business Name"}
              </h1>

              {form.business.address && (
                <p
                  className={`mt-1 whitespace-pre-line text-xs ${
                    isModern
                      ? "text-gray-300"
                      : "text-gray-500"
                  }`}
                >
                  {
                    form.business.address
                  }
                </p>
              )}

              <div
                className={`mt-2 space-y-0.5 text-xs ${
                  isModern
                    ? "text-gray-300"
                    : "text-gray-500"
                }`}
              >

                {form.business.phone && (
                  <p>
                    {
                      form.business.phone
                    }
                  </p>
                )}

                {form.business.email && (
                  <p>
                    {
                      form.business.email
                    }
                  </p>
                )}

                {form.business.website && (
                  <p>
                    {
                      form.business.website
                    }
                  </p>
                )}

                {form.business.taxNumber && (
                  <p>
                    Tax Number:{" "}
                    {
                      form.business.taxNumber
                    }
                  </p>
                )}

              </div>
            </div>
          </div>

          <div className="sm:text-right">

            <p
              className={`text-3xl font-black uppercase tracking-tight ${
                isModern
                  ? "text-white"
                  : "text-gray-900"
              }`}
            >
              Invoice
            </p>

            <p
              className={`mt-1 text-sm font-bold ${
                isModern
                  ? "text-brand-300"
                  : "text-brand-600"
              }`}
            >
              {
                form.invoiceNumber ||
                "EDC-2026-0001"
              }
            </p>

            <div
              className={`mt-3 space-y-1 text-xs ${
                isModern
                  ? "text-gray-300"
                  : "text-gray-500"
              }`}
            >

              <p>
                <strong>
                  Date:
                </strong>{" "}
                {
                  form.invoiceDate ||
                  "-"
                }
              </p>

              <p>
                <strong>
                  Due:
                </strong>{" "}
                {
                  form.dueDate ||
                  "-"
                }
              </p>

            </div>
          </div>
        </div>
      </div>

      {/* CUSTOMER */}

      <div className="grid grid-cols-1 gap-6 border-b border-gray-200 px-6 py-5 sm:grid-cols-2 sm:px-8">

        <div>

          <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.15em] text-gray-400">
            Bill To
          </p>

          <p className="font-bold text-gray-900">
            {
              form.customer.name ||
              form.customer.companyName ||
              "Customer Name"
            }
          </p>

          {form.customer.companyName &&
            form.customer.name && (
              <p className="text-xs text-gray-600">
                {
                  form.customer
                    .companyName
                }
              </p>
            )}

          {form.customer.address && (
            <p className="mt-1 whitespace-pre-line text-xs text-gray-500">
              {
                form.customer.address
              }
            </p>
          )}

          {form.customer.phone && (
            <p className="mt-1 text-xs text-gray-500">
              {
                form.customer.phone
              }
            </p>
          )}

          {form.customer.email && (
            <p className="text-xs text-gray-500">
              {
                form.customer.email
              }
            </p>
          )}

        </div>

        <div className="sm:text-right">

          <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.15em] text-gray-400">
            Payment Terms
          </p>

          <p className="text-xs text-gray-600">
            {
              form.paymentTerms ||
              "Payment terms not specified."
            }
          </p>

        </div>
      </div>

      {/* ITEMS */}

      <div className="px-6 py-5 sm:px-8">

        <div className="overflow-hidden rounded-lg border border-gray-200">

          <table className="w-full table-fixed">

            <thead>

              <tr
                className={`text-left text-[10px] font-bold uppercase tracking-wide ${
                  isModern
                    ? "bg-gray-900 text-white"
                    : "bg-gray-100 text-gray-600"
                }`}
              >

                <th className="w-[8%] px-2 py-3 text-center">
                  S/N
                </th>

                <th className="w-[42%] px-3 py-3">
                  Description
                </th>

                <th className="w-[12%] px-2 py-3 text-right">
                  Qty
                </th>

                <th className="w-[19%] px-2 py-3 text-right">
                  Unit Price
                </th>

                <th className="w-[19%] px-2 py-3 text-right">
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
                      item._localId ||
                      `preview-${index}`
                    }
                  >

                    <td className="px-2 py-3 text-center text-xs text-gray-500">
                      {index + 1}
                    </td>

                    <td className="break-words px-3 py-3 text-xs font-medium text-gray-800">
                      {
                        item.description ||
                        "Item description"
                      }
                    </td>

                    <td className="px-2 py-3 text-center text-xs text-gray-600">
                      {
                        item.qty
                      }
                    </td>

                    <td className="break-all px-2 py-3 text-center text-xs text-gray-600">
                      {formatMoney(
                        item.unitPrice,
                        form.currency
                      )}
                    </td>

                    <td className="break-all px-2 py-3 text-center text-xs font-bold text-gray-900">
                      {formatMoney(
                        item.total,
                        form.currency
                      )}
                    </td>

                  </tr>
                )
              )}

            </tbody>
          </table>
        </div>

        {/* TOTALS */}

        <div className="mt-5 flex justify-end">

          <div className="w-full max-w-xs space-y-2 text-xs">

            <div className="flex justify-between gap-5 text-gray-600">

              <span>
                Subtotal
              </span>

              <span className="font-semibold text-gray-900">
                {formatMoney(
                  subtotal,
                  form.currency
                )}
              </span>

            </div>

            {discountAmount > 0 && (
              <div className="flex justify-between gap-5 text-gray-600">

                <span>
                  Discount
                </span>

                <span className="font-semibold text-red-600">
                  -
                  {formatMoney(
                    discountAmount,
                    form.currency
                  )}
                </span>

              </div>
            )}

            {taxRate > 0 && (
              <div className="flex justify-between gap-5 text-gray-600">

                <span>
                  Tax ({taxRate}%)
                </span>

                <span className="font-semibold text-gray-900">
                  {formatMoney(
                    taxAmount,
                    form.currency
                  )}
                </span>

              </div>
            )}

            {serviceCharge > 0 && (
              <div className="flex justify-between gap-5 text-gray-600">

                <span>
                  Service Charge
                </span>

                <span className="font-semibold text-gray-900">
                  {formatMoney(
                    serviceCharge,
                    form.currency
                  )}
                </span>

              </div>
            )}

            <div className="my-2 border-t border-gray-200" />

            <div
              className={`flex justify-between gap-5 rounded-lg px-3 py-3 ${
                isModern
                  ? "bg-gray-900 text-white"
                  : "bg-brand-600 text-white"
              }`}
            >

              <span className="font-bold">
                Grand Total
              </span>

              <span className="font-black">
                {formatMoney(
                  grandTotal,
                  form.currency
                )}
              </span>

            </div>

            {amountPaid > 0 && (
              <div className="flex justify-between gap-5 text-gray-600">

                <span>
                  Amount Paid
                </span>

                <span className="font-semibold text-green-600">
                  {formatMoney(
                    amountPaid,
                    form.currency
                  )}
                </span>

              </div>
            )}

            <div className="flex justify-between gap-5 text-sm font-black text-gray-900">

              <span>
                Balance Due
              </span>

              <span>
                {formatMoney(
                  balanceDue,
                  form.currency
                )}
              </span>

            </div>
          </div>
        </div>
      </div>

      {/* FOOTER */}

      <div className="border-t border-gray-200 px-6 py-5 sm:px-8">

        {form.paymentDetails && (
          <div className="mb-4">

            <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.15em] text-gray-400">
              Payment Details
            </p>

            <p className="whitespace-pre-line text-xs text-gray-600">
              {
                form.paymentDetails
              }
            </p>

          </div>
        )}

        {form.notes && (
          <div className="mb-4">

            <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.15em] text-gray-400">
              Notes
            </p>

            <p className="whitespace-pre-line text-xs text-gray-600">
              {form.notes}
            </p>

          </div>
        )}

        {form.termsAndConditions && (
          <div>

            <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.15em] text-gray-400">
              Terms & Conditions
            </p>

            <p className="whitespace-pre-line text-xs text-gray-500">
              {
                form.termsAndConditions
              }
            </p>

          </div>
        )}

        <div className="mt-6 flex flex-col items-center justify-center gap-3 border-t border-gray-100 pt-4 sm:flex-row sm:justify-between">

          <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">
            Generated with EAZY DON CHECK
          </p>

          {onDownloadPdf && (
            <button
              type="button"
              onClick={
                onDownloadPdf
              }
              disabled={
                pdfLoading
              }
              className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {pdfLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}

              Download PDF
            </button>
          )}

        </div>
      </div>
    </div>
  );
};

export default InvoiceGenerator;