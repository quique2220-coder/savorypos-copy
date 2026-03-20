import React, { useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import CustomerList from "@/components/crm/CustomerList";
import CustomerForm from "@/components/crm/CustomerForm";
import CouponManager from "@/components/crm/CouponManager";
import CampaignManager from "@/components/crm/CampaignManager";
import { Button } from "@/components/ui/button";
import { Users, Tag, Megaphone, Plus } from "lucide-react";

export default function CRM() {
  const [showCustomerForm, setShowCustomerForm] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const qc = useQueryClient();

  const { data: customers = [] } = useQuery({
    queryKey: ["customers"],
    queryFn: () => base44.entities.Customer.list("-updated_date", 200),
  });

  const saveMutation = useMutation({
    mutationFn: (data) =>
      editingCustomer
        ? base44.entities.Customer.update(editingCustomer.id, data)
        : base44.entities.Customer.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["customers"] });
      setShowCustomerForm(false);
      setEditingCustomer(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Customer.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["customers"] }),
  });

  const handleEdit = (c) => { setEditingCustomer(c); setShowCustomerForm(true); };

  return (
    <div className="p-6 min-h-screen bg-background">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Users className="w-6 h-6 text-primary" /> CRM + Marketing
            </h1>
            <p className="text-muted-foreground text-sm mt-1">Clientes, cupones y campañas</p>
          </div>
          <Button onClick={() => { setEditingCustomer(null); setShowCustomerForm(true); }}>
            <Plus className="w-4 h-4 mr-1" /> Nuevo Cliente
          </Button>
        </div>

        {showCustomerForm && (
          <CustomerForm
            customer={editingCustomer}
            onSave={saveMutation.mutate}
            onCancel={() => { setShowCustomerForm(false); setEditingCustomer(null); }}
          />
        )}

        <Tabs defaultValue="customers">
          <TabsList className="mb-4">
            <TabsTrigger value="customers"><Users className="w-4 h-4 mr-1" />Clientes ({customers.length})</TabsTrigger>
            <TabsTrigger value="coupons"><Tag className="w-4 h-4 mr-1" />Cupones</TabsTrigger>
            <TabsTrigger value="campaigns"><Megaphone className="w-4 h-4 mr-1" />Campañas</TabsTrigger>
          </TabsList>

          <TabsContent value="customers">
            <CustomerList customers={customers} onEdit={handleEdit} onDelete={deleteMutation.mutate} />
          </TabsContent>
          <TabsContent value="coupons">
            <CouponManager customers={customers} />
          </TabsContent>
          <TabsContent value="campaigns">
            <CampaignManager customers={customers} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}