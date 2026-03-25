import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { AlertCircle } from "lucide-react";

const REFUND_REASONS = [
  { value: "customer_request", label: "Customer Request" },
  { value: "damaged_item", label: "Damaged Item" },
  { value: "wrong_order", label: "Wrong Order" },
  { value: "quality_issue", label: "Quality Issue" },
  { value: "partial", label: "Partial Refund" },
  { value: "other", label: "Other" },
];

const REFUND_METHODS = [
  { value: "cash", label: "Cash" },
  { value: "card", label: "Card" },
  { value: "store_credit", label: "Store Credit" },
  { value: "replacement", label: "Replacement" },
];

export default function RefundDialog({ order, onClose, onSuccess }) {
  const [refundType, setRefundType] = useState("full");
  const [amount, setAmount] = useState(order?.total?.toFixed(2) || "");
  const [reason, setReason] = useState("customer_request");
  const [refundMethod, setRefundMethod] = useState("cash");
  const [notes, setNotes] = useState("");
  const queryClient = useQueryClient();

  const createRefund = useMutation({
    mutationFn: async (data) => {
      // Create refund record
      const refund = await base44.entities.Refund.create(data);
      
      // Automatically create journal entry for accounting (Sales Returns account 4150)
      await base44.entities.JournalEntry.create({
        date: new Date().toISOString().split('T')[0],
        description: `Refund for Order ${data.order_number} - ${data.reason?.replace(/_/g, " ")}`,
        account_dr: "4150", // Sales Returns & Allowances
        account_cr: data.refund_method === "cash" ? "1100" : "1110", // Cash or Bank
        amount_dr: data.amount,
        amount_cr: data.amount,
        account_dr_type: "Income",
        account_cr_type: "Asset",
        category: "Revenue",
        reference: data.order_number,
        payment_method: data.refund_method.charAt(0).toUpperCase() + data.refund_method.slice(1),
        notes: `Refund: ${data.notes}`,
      });
      
      return refund;
    },
    onSuccess: () => {
      toast.success("Refund created and accounting entry recorded");
      queryClient.invalidateQueries({ queryKey: ["refunds"] });
      queryClient.invalidateQueries({ queryKey: ["JournalEntry"] });
      onSuccess?.();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to create refund");
    },
  });

  const handleSubmit = () => {
    if (!amount || parseFloat(amount) <= 0) {
      toast.error("Amount must be greater than 0");
      return;
    }

    const refundAmount = parseFloat(amount);
    if (refundType === "partial" && refundAmount > order.total) {
      toast.error("Refund amount cannot exceed order total");
      return;
    }

    createRefund.mutate({
      order_id: order.id,
      order_number: order.order_number,
      customer_name: order.customer_name || "Walk-in",
      reason,
      refund_type: refundType,
      amount: refundAmount,
      refund_method: refundMethod,
      notes,
      status: "pending",
    });
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create Refund for {order.order_number}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Order Total */}
          <div className="bg-muted/50 rounded-lg p-3 text-sm">
            <p className="text-muted-foreground">Order Total</p>
            <p className="text-2xl font-bold">${order.total?.toFixed(2)}</p>
          </div>

          {/* Refund Type */}
          <div>
            <Label className="text-sm font-medium mb-2 block">Refund Type</Label>
            <div className="flex gap-2">
              {["full", "partial"].map((type) => (
                <Button
                  key={type}
                  variant={refundType === type ? "default" : "outline"}
                  size="sm"
                  onClick={() => {
                    setRefundType(type);
                    if (type === "full") setAmount(order.total?.toFixed(2));
                  }}
                  className="flex-1 capitalize"
                >
                  {type}
                </Button>
              ))}
            </div>
          </div>

          {/* Amount */}
          <div>
            <Label htmlFor="amount" className="text-sm font-medium mb-2 block">
              Amount
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0"
                max={order.total}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="pl-6"
              />
            </div>
          </div>

          {/* Reason */}
          <div>
            <Label htmlFor="reason" className="text-sm font-medium mb-2 block">
              Reason
            </Label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {REFUND_REASONS.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Refund Method */}
          <div>
            <Label htmlFor="method" className="text-sm font-medium mb-2 block">
              Refund Method
            </Label>
            <Select value={refundMethod} onValueChange={setRefundMethod}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {REFUND_METHODS.map((m) => (
                  <SelectItem key={m.value} value={m.value}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Notes */}
          <div>
            <Label htmlFor="notes" className="text-sm font-medium mb-2 block">
              Notes (optional)
            </Label>
            <Textarea
              id="notes"
              placeholder="Additional details..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="h-20 resize-none"
            />
          </div>

          {/* Warning */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex gap-2.5">
            <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-amber-700">
              Refund will be created with <strong>Pending</strong> status. Approve or process in the Accounting tab.
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button onClick={handleSubmit} className="flex-1" disabled={createRefund.isPending}>
              {createRefund.isPending ? "Creating..." : "Create Refund"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}