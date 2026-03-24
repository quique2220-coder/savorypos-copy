import React from "react";
import { Link } from "react-router-dom";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function OrderConfirmation() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="flex justify-center">
          <div className="w-24 h-24 rounded-full bg-green-100 flex items-center justify-center">
            <CheckCircle2 className="w-14 h-14 text-green-500" />
          </div>
        </div>
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">¡Orden Confirmada!</h1>
          <p className="text-muted-foreground">
            Tu pago fue procesado exitosamente. Recibirás un correo de confirmación pronto.
          </p>
        </div>
        <div className="bg-card border border-border rounded-2xl p-6 text-left space-y-2">
          <p className="text-sm text-muted-foreground">✅ Pago recibido</p>
          <p className="text-sm text-muted-foreground">📦 Tu orden está siendo preparada</p>
          <p className="text-sm text-muted-foreground">📧 Confirmación enviada a tu correo</p>
        </div>
        <Link to="/OrderOnline">
          <Button className="w-full h-12 text-base font-bold">
            Hacer otro pedido
          </Button>
        </Link>
      </div>
    </div>
  );
}