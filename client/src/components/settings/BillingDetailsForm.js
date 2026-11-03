import React, { useEffect, useState } from "react";
import { getBillingDetailsApi, updateBillingDetailsApi } from "../../services/billingService";
import { toast, toastError } from "../../utils/toast";
import { Button, Card, Field, Input } from "../ui";

const FIELDS = [
  ["legalName", "Legal / company name", "Acme Pvt Ltd"],
  ["address", "Billing address", "Street, city, postal code"],
  ["country", "Country", "India"],
  ["state", "State / region", "Maharashtra"],
  ["taxId", "GSTIN / VAT number (optional)", "27AAPFU0939F1ZV"],
];

// Buyer details printed on tax invoices. Editable by the owner and admins.
export default function BillingDetailsForm({ canEdit }) {
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getBillingDetailsApi()
      .then((res) => setForm({ legalName: "", address: "", country: "", state: "", taxId: "", ...res.data.billingDetails }))
      .catch(() => setForm({ legalName: "", address: "", country: "", state: "", taxId: "" }));
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await updateBillingDetailsApi(form);
      setForm({ ...form, ...res.data.billingDetails });
      toast.success("Billing details saved. New invoices use them.");
    } catch (err) {
      toastError(err, "Could not save the billing details.");
    }
    setSaving(false);
  };

  if (!form) return null;

  return (
    <Card title="Billing details" description="Printed on your invoices. Add your GSTIN or VAT number to claim input tax credit.">
      <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {FIELDS.map(([key, label, placeholder]) => (
          <div key={key} className={key === "address" ? "md:col-span-2" : ""}>
            <Field label={label} htmlFor={`billing-${key}`}>
              <Input
                id={`billing-${key}`}
                value={form[key] || ""}
                onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                placeholder={placeholder}
                disabled={!canEdit}
              />
            </Field>
          </div>
        ))}
        {canEdit && (
          <div className="md:col-span-2 flex justify-end">
            <Button type="submit" variant="primary" loading={saving}>Save billing details</Button>
          </div>
        )}
      </form>
    </Card>
  );
}
