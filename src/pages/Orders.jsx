import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { format } from "date-fns";
import { Eye, CreditCard, Banknote, Smartphone, Store, Bike, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import RefundDialog from "@/components/pos/RefundDialog";

const statusColors = {
  pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
  preparing: "bg-blue-100 text-blue-800 border-blue-200",
  ready: "bg-green-100 text-green-800 border-green-200",
  completed: "bg-secondary text-secondary-foreground",
  cancelled: "bg-red-100 text-red-800 border-red-200",
};

const paymentIcons = { cash: Banknote, card: CreditCard, mobile: Smartphone };

const SOURCE_LABELS = {
  in_person: { label: "En local", color: "bg-slate-100 text-slate-700" },
  uber_eats: { label: "Uber Eats", color: "bg-black text-white" },
  doordash:  { label: "DoorDash", color: "bg-red-100 text-red-700" },
  rappi:     { label: "Rappi",    color: "bg-orange-100 text-orange-700" },
  online:    { label: "Online",   color: "bg-blue-100 text-blue-700" },
  phone:     { label: "Teléfono", color: "bg-purple-100 text-purple-700" },
};

export default function Orders() {
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [refundOrder, setRefundOrder] = useState(null);
  const queryClient = useQueryClient();

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["orders"],
    queryFn: () => base44.entities.Order.list("-created_date", 100),
  });

  const updateOrder = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Order.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      toast.success("Order updated");
    },
  });

  const filtered = statusFilter === "all" ? orders : orders.filter((o) => o.status === statusFilter);

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Orders</h1>
          <p className="text-sm text-muted-foreground mt-1">{orders.length} total orders</p>
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="preparing">Preparing</SelectItem>
            <SelectItem value="ready">Ready</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-xl border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Order #</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Source</TableHead>
              <TableHead>Items</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Payment</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-20">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={9} className="text-center py-12">Loading...</TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={9} className="text-center py-12 text-muted-foreground">No orders found</TableCell></TableRow>
            ) : (
              filtered.map((order) => {
                const PayIcon = paymentIcons[order.payment_method] || Banknote;
                return (
                  <TableRow key={order.id}>
                    <TableCell className="font-mono font-semibold text-sm">{order.order_number}</TableCell>
                    <TableCell className="text-sm">
                      {order.created_date ? format(new Date(order.created_date), "MMM d, HH:mm") : "—"}
                    </TableCell>
                    <TableCell className="text-sm">{order.customer_name || "Walk-in"}</TableCell>
                    <TableCell>
                     <Badge variant="outline" className="text-xs capitalize">{order.order_type?.replace("_", " ") || "—"}</Badge>
                    </TableCell>
                    <TableCell>
                     {(() => {
                       const src = SOURCE_LABELS[order.order_source] || SOURCE_LABELS.in_person;
                       return <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${src.color}`}>{src.label}</span>;
                     })()}
                    </TableCell>
                    <TableCell className="text-sm">{order.items?.length || 0}</TableCell>
                    <TableCell className="font-semibold">${order.total?.toFixed(2)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <PayIcon className="w-3.5 h-3.5 text-muted-foreground" />
                        <span className="text-xs capitalize">{order.payment_method}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={`${statusColors[order.status] || ""} border text-xs capitalize`}>
                        {order.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setSelectedOrder(order)}>
                        <Eye className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Order Detail Dialog */}
      <Dialog open={!!selectedOrder} onOpenChange={() => setSelectedOrder(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Order {selectedOrder?.order_number}</DialogTitle>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-muted-foreground">Customer:</span> <span className="font-medium ml-1">{selectedOrder.customer_name || "Walk-in"}</span></div>
                <div><span className="text-muted-foreground">Type:</span> <span className="font-medium ml-1 capitalize">{selectedOrder.order_type?.replace("_", " ")}</span></div>
                <div><span className="text-muted-foreground">Source:</span> <span className="font-medium ml-1">{SOURCE_LABELS[selectedOrder.order_source]?.label || "En local"}</span></div>
                <div><span className="text-muted-foreground">Payment:</span> <span className="font-medium ml-1 capitalize">{selectedOrder.payment_method}</span></div>
                <div><span className="text-muted-foreground">Date:</span> <span className="font-medium ml-1">{selectedOrder.created_date ? format(new Date(selectedOrder.created_date), "MMM d, yyyy HH:mm") : "—"}</span></div>
              </div>

              <div className="border rounded-lg divide-y">
                {selectedOrder.items?.map((item, i) => (
                  <div key={i} className="flex justify-between px-3 py-2 text-sm">
                    <span>{item.quantity}x {item.name}</span>
                    <span className="font-medium">${item.subtotal?.toFixed(2)}</span>
                  </div>
                ))}
              </div>

              <div className="text-sm space-y-1">
                <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>${selectedOrder.subtotal?.toFixed(2)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Tax</span><span>${selectedOrder.tax?.toFixed(2)}</span></div>
                <div className="flex justify-between font-bold text-base border-t pt-2"><span>Total</span><span>${selectedOrder.total?.toFixed(2)}</span></div>
              </div>

               <div className="flex gap-2">
                 {selectedOrder.status !== "completed" && selectedOrder.status !== "cancelled" && (
                   <>
                     {selectedOrder.status === "pending" && (
                       <Button size="sm" onClick={() => { updateOrder.mutate({ id: selectedOrder.id, data: { status: "preparing" } }); setSelectedOrder(null); }}>
                         Start Preparing
                       </Button>
                     )}
                     {selectedOrder.status === "preparing" && (
                       <Button size="sm" onClick={() => { updateOrder.mutate({ id: selectedOrder.id, data: { status: "ready" } }); setSelectedOrder(null); }}>
                         Mark Ready
                       </Button>
                     )}
                     {selectedOrder.status === "ready" && (
                       <Button size="sm" onClick={() => { updateOrder.mutate({ id: selectedOrder.id, data: { status: "completed" } }); setSelectedOrder(null); }}>
                         Complete
                       </Button>
                     )}
                     <Button size="sm" variant="destructive" onClick={() => { updateOrder.mutate({ id: selectedOrder.id, data: { status: "cancelled" } }); setSelectedOrder(null); }}>
                       Cancel
                     </Button>
                   </>
                 )}
                 <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setRefundOrder(selectedOrder)}>
                   <RotateCcw className="w-3.5 h-3.5" />
                   Refund
                 </Button>
               </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Refund Dialog */}
      {refundOrder && (
        <RefundDialog 
          order={refundOrder} 
          onClose={() => { setRefundOrder(null); setSelectedOrder(null); }} 
          onSuccess={() => { setRefundOrder(null); setSelectedOrder(null); queryClient.invalidateQueries({ queryKey: ["orders"] }); }}
        />
      )}
    </div>
  );
}