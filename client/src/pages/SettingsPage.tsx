import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Save, Upload, X, Eye, Printer } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

interface InvoiceSettings {
  id: string;
  store_id: string;
  business_name: string;
  logo_url: string;
  address: string;
  phone: string;
  abn_number: string;
  policy_text: string;
  default_payment_method: "cash" | "card" | "eftpos";
  tax_rate: number;
  closing_message: string;
}

const DEFAULT_SETTINGS: Omit<InvoiceSettings, "id" | "store_id"> = {
  business_name: "",
  logo_url: "",
  address: "",
  phone: "",
  abn_number: "",
  policy_text:
    "No returns or refunds on repaired devices. Parts come with 30-day warranty. Data loss is not covered.",
  default_payment_method: "cash",
  tax_rate: 10.0,
  closing_message: "Thank you for your business!",
};

export default function SettingsPage() {
  const [, navigate] = useLocation();
  const { selectedStoreId } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] =
    useState<Partial<InvoiceSettings>>(DEFAULT_SETTINGS);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (selectedStoreId) {
      fetchSettings();
    }
  }, [selectedStoreId]);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const response = await axios.get("/api/settings/invoice");
      setSettings(response.data);
      if (response.data.logo_url) {
        setLogoPreview(response.data.logo_url);
      }
    } catch (error) {
      console.error("Failed to fetch settings:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 500000) {
      toast.error("Logo file must be less than 500KB");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      setLogoPreview(base64);
      setSettings(prev => ({ ...prev, logo_url: base64 }));
    };
    reader.readAsDataURL(file);
  };

  const removeLogo = () => {
    setLogoPreview(null);
    setSettings(prev => ({ ...prev, logo_url: "" }));
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSave = async () => {
    if (!selectedStoreId) {
      toast.error("Please select a store first");
      return;
    }

    setSaving(true);
    try {
      await axios.put("/api/settings/invoice", {
        business_name: settings.business_name,
        logo_url: settings.logo_url,
        address: settings.address,
        phone: settings.phone,
        abn_number: settings.abn_number,
        policy_text: settings.policy_text,
        default_payment_method: settings.default_payment_method,
        tax_rate: settings.tax_rate,
        closing_message: settings.closing_message,
      });
      toast.success("Settings saved successfully");
    } catch (error: any) {
      console.error("Failed to save settings:", error);
      toast.error(error.response?.data?.error || "Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const formatDate = () => {
    const now = new Date();
    return `${now.toLocaleDateString("en-AU", { day: "2-digit", month: "long", year: "numeric" })} ${now.toLocaleTimeString("en-AU", { hour: "2-digit", minute: "2-digit" })}`;
  };

  const generatePreviewHtml = () => {
    const logoHtml = logoPreview
      ? `<img src="${logoPreview}" alt="Logo" style="max-height: 60px; max-width: 150px; margin-bottom: 10px;">`
      : "";

    const taxRate = settings.tax_rate || 10;
    const subtotal = 149.97;
    const discount = 10.0;
    const taxBase = subtotal - discount;
    const tax = taxBase * (taxRate / 100);
    const total = taxBase + tax;

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Invoice Preview</title>
  <style>
    body { font-family: Arial, sans-serif; padding: 30px; max-width: 700px; margin: 0 auto; color: #1a1a1a; }
    .header { text-align: center; margin-bottom: 25px; border-bottom: 2px solid #1e3a5f; padding-bottom: 15px; }
    .header h1 { font-size: 28px; margin: 0 0 5px 0; color: #1e3a5f; }
    .header .business-name { font-size: 18px; font-weight: bold; margin-bottom: 5px; }
    .header .address { font-size: 12px; color: #666; }
    .header .contact { font-size: 12px; color: #666; }
    .invoice-meta { display: flex; justify-content: space-between; margin: 20px 0; }
    .invoice-meta .invoice-number { font-size: 16px; font-weight: bold; color: #1e3a5f; }
    .invoice-meta .invoice-date { font-size: 14px; color: #666; }
    .customer-info { margin-bottom: 20px; padding: 10px; background: #f8f9fa; border-radius: 5px; }
    .customer-info h3 { font-size: 12px; text-transform: uppercase; color: #666; margin: 0 0 5px 0; }
    .customer-info p { margin: 0; font-size: 14px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
    th { background: #1e3a5f; color: white; padding: 10px 8px; text-align: left; font-size: 11px; text-transform: uppercase; }
    th.qty, th.price, th.total { text-align: right; }
    td { padding: 10px 8px; border-bottom: 1px solid #e0e0e0; font-size: 13px; }
    td.qty, td.price, td.total { text-align: right; font-family: monospace; }
    td.desc { padding-left: 15px; }
    td.sku { font-family: monospace; font-size: 11px; color: #888; }
    .totals { margin-top: 20px; text-align: right; }
    .totals .subtotal, .totals .discount, .totals .tax { margin: 5px 0; font-size: 14px; }
    .totals .tax-item { font-size: 12px; color: #666; }
    .totals .total-row { font-size: 22px; font-weight: bold; color: #1e3a5f; margin-top: 10px; padding-top: 10px; border-top: 2px solid #1e3a5f; }
    .payment-info { margin: 20px 0; padding: 10px; background: #f0f7ff; border-radius: 5px; text-align: center; }
    .payment-info strong { font-size: 14px; text-transform: uppercase; }
    .policy { margin: 25px 0; padding: 15px; border: 1px solid #ddd; border-radius: 5px; font-size: 11px; color: #555; }
    .policy h4 { margin: 0 0 8px 0; font-size: 12px; text-transform: uppercase; }
    .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 14px; color: #1e3a5f; font-weight: bold; }
  </style>
</head>
<body>
  <div class="header">
    ${logoHtml}
    <h1>TAX INVOICE</h1>
    <p class="business-name">${settings.business_name || "Your Business Name"}</p>
    ${settings.address ? `<p class="address">${settings.address}</p>` : '<p class="address">123 Business Street, City</p>'}
    ${settings.phone ? `<p class="contact">Phone: ${settings.phone}</p>` : ""}
    ${settings.abn_number ? `<p class="contact">ABN: ${settings.abn_number}</p>` : ""}
  </div>
  <div class="invoice-meta">
    <div>
      <div class="invoice-number">INV-2026-001</div>
    </div>
    <div class="invoice-date">${formatDate()}</div>
  </div>
  <div class="customer-info">
    <h3>Bill To</h3>
    <p><strong>Sample Customer</strong></p>
  </div>
  <table>
    <thead>
      <tr>
        <th>Description</th>
        <th class="sku">SKU</th>
        <th class="qty">Qty</th>
        <th class="price">Unit Price</th>
        <th class="total">Total</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td class="desc">iPhone 14 Screen (OLED)</td>
        <td class="sku">SCR-IP14-001</td>
        <td class="qty">1</td>
        <td class="price">$89.99</td>
        <td class="total">$89.99</td>
      </tr>
      <tr>
        <td class="desc">USB-C 65W Fast Charger</td>
        <td class="sku">ACC-CHG-65W</td>
        <td class="qty">2</td>
        <td class="price">$29.99</td>
        <td class="total">$59.98</td>
      </tr>
    </tbody>
  </table>
  <div class="totals">
    <div class="subtotal">Subtotal: <strong>$${subtotal.toFixed(2)}</strong></div>
    ${discount > 0 ? `<div class="discount">Discount: <strong style="color: green;">-$${discount.toFixed(2)}</strong></div>` : ""}
    <div class="tax-item">GST (${taxRate}%): <strong>$${tax.toFixed(2)}</strong></div>
    <div class="total-row">TOTAL: $${total.toFixed(2)}</div>
  </div>
  <div class="payment-info">
    <strong>Payment Method: ${(settings.default_payment_method || "cash").toUpperCase()}</strong>
  </div>
  ${
    settings.policy_text
      ? `
  <div class="policy">
    <h4>Return & Refund Policy</h4>
    <p>${settings.policy_text}</p>
  </div>
  `
      : ""
  }
  <div class="footer">
    ${settings.closing_message || "Thank you for your business!"}
  </div>
</body>
</html>`;
  };

  const handlePrintPreview = () => {
    const win = window.open("", "_blank");
    if (win) {
      win.document.write(generatePreviewHtml());
      win.document.close();
      win.print();
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 rounded-full border-4 border-blue-200 border-t-blue-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
          <ArrowLeft size={20} />
        </Button>
        <div>
          <h1 className="page-title">Invoice Settings</h1>
          <p className="page-subtitle">
            Customize your invoice template and business details
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-6">
          <Tabs defaultValue="business" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="business">Business</TabsTrigger>
              <TabsTrigger value="invoice">Invoice</TabsTrigger>
              <TabsTrigger value="policy">Policy</TabsTrigger>
            </TabsList>

            <TabsContent value="business" className="space-y-4 pt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">
                    Business Information
                  </CardTitle>
                  <CardDescription>
                    Basic details shown on invoices
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="business_name">Business Name</Label>
                    <Input
                      id="business_name"
                      value={settings.business_name || ""}
                      onChange={e =>
                        setSettings(prev => ({
                          ...prev,
                          business_name: e.target.value,
                        }))
                      }
                      placeholder="Your Business Name"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Logo</Label>
                    <div className="flex items-start gap-4">
                      {logoPreview && (
                        <div className="relative">
                          <img
                            src={logoPreview}
                            alt="Logo preview"
                            className="w-24 h-24 object-contain border rounded-lg bg-white p-2"
                          />
                          <button
                            onClick={removeLogo}
                            className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center hover:bg-red-600"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      )}
                      <div className="flex-1">
                        <input
                          type="file"
                          ref={fileInputRef}
                          accept="image/*"
                          onChange={handleLogoUpload}
                          className="hidden"
                          id="logo-upload"
                        />
                        <Button
                          variant="outline"
                          onClick={() =>
                            document.getElementById("logo-upload")?.click()
                          }
                          className="w-full gap-2"
                        >
                          <Upload size={16} />
                          Upload Logo
                        </Button>
                        <p className="text-xs text-muted-foreground mt-1">
                          Max 500KB. PNG, JPG, SVG supported.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="address">Address</Label>
                    <Textarea
                      id="address"
                      value={settings.address || ""}
                      onChange={e =>
                        setSettings(prev => ({
                          ...prev,
                          address: e.target.value,
                        }))
                      }
                      placeholder="123 Street Name, Suburb, State, Postcode"
                      rows={2}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone</Label>
                      <Input
                        id="phone"
                        value={settings.phone || ""}
                        onChange={e =>
                          setSettings(prev => ({
                            ...prev,
                            phone: e.target.value,
                          }))
                        }
                        placeholder="02 1234 5678"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="abn">ABN Number</Label>
                      <Input
                        id="abn"
                        value={settings.abn_number || ""}
                        onChange={e =>
                          setSettings(prev => ({
                            ...prev,
                            abn_number: e.target.value,
                          }))
                        }
                        placeholder="12 345 678 901"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="invoice" className="space-y-4 pt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Invoice Options</CardTitle>
                  <CardDescription>
                    Configure invoice calculations and defaults
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="tax_rate">Tax Rate (%)</Label>
                      <Input
                        id="tax_rate"
                        type="number"
                        step="0.1"
                        min="0"
                        max="100"
                        value={settings.tax_rate || 10}
                        onChange={e =>
                          setSettings(prev => ({
                            ...prev,
                            tax_rate: parseFloat(e.target.value) || 0,
                          }))
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="payment_method">Default Payment</Label>
                      <Select
                        value={settings.default_payment_method || "cash"}
                        onValueChange={value =>
                          setSettings(prev => ({
                            ...prev,
                            default_payment_method: value as any,
                          }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="cash">Cash</SelectItem>
                          <SelectItem value="card">Card</SelectItem>
                          <SelectItem value="eftpos">EFTPOS</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="closing_message">Closing Message</Label>
                    <Input
                      id="closing_message"
                      value={settings.closing_message || ""}
                      onChange={e =>
                        setSettings(prev => ({
                          ...prev,
                          closing_message: e.target.value,
                        }))
                      }
                      placeholder="Thank you for your business!"
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="policy" className="space-y-4 pt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">
                    Return & Refund Policy
                  </CardTitle>
                  <CardDescription>
                    This text will appear on every invoice
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Textarea
                    value={settings.policy_text || ""}
                    onChange={e =>
                      setSettings(prev => ({
                        ...prev,
                        policy_text: e.target.value,
                      }))
                    }
                    placeholder="Enter your return and refund policy..."
                    rows={6}
                    className="resize-none"
                  />
                  <p className="text-xs text-muted-foreground mt-2">
                    This policy is displayed on printed invoices. Keep it clear
                    and concise.
                  </p>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          <Button
            onClick={handleSave}
            disabled={saving}
            className="w-full gap-2"
          >
            <Save size={16} />
            {saving ? "Saving..." : "Save Settings"}
          </Button>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Invoice Preview</h3>
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrintPreview}
              className="gap-2"
            >
              <Printer size={14} />
              Print Preview
            </Button>
          </div>
          <Card className="overflow-hidden p-0">
            <iframe
              srcDoc={generatePreviewHtml()}
              title="Invoice Preview"
              className="w-full border-0"
              style={{ height: "700px", minHeight: "700px" }}
              sandbox="allow-same-origin"
            />
          </Card>
        </div>
      </div>
    </div>
  );
}
