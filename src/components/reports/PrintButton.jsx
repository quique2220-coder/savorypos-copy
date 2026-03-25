import React from "react";
import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

export default function PrintButton({ filename = "statement", contentRef }) {
  const handlePrint = async () => {
    if (!contentRef?.current) return;

    try {
      const canvas = await html2canvas(contentRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
      });

      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "letter",
      });

      const imgData = canvas.toDataURL("image/png");
      const imgWidth = 210;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let yPos = 0;

      pdf.addImage(imgData, "PNG", 0, yPos, imgWidth, imgHeight);
      yPos += imgHeight;

      while (yPos < canvas.height * (imgWidth / canvas.width)) {
        pdf.addPage();
        yPos -= 297;
        pdf.addImage(imgData, "PNG", 0, -yPos, imgWidth, imgHeight);
      }

      pdf.save(`${filename}.pdf`);
    } catch (error) {
      console.error("Error generating PDF:", error);
    }
  };

  return <Button onClick={handlePrint} size="sm" variant="outline" className="gap-2"><Printer className="w-4 h-4" />Imprimir</Button>;
}