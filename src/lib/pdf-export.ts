import jsPDF from "jspdf";
import html2canvas from "html2canvas";

interface NetWorthData {
  rjPortfolio: number;
  externalAssets: number;
  externalDebt: number;
  totalNetWorth: number;
}

export async function exportChartsToPDF(
  chartsContainerRef: HTMLElement,
  netWorthData: NetWorthData,
  userName?: string
): Promise<void> {
  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 15;
  const contentWidth = pageWidth - margin * 2;

  // Colors
  const primaryGreen = [0, 255, 136];
  const darkBg = [10, 10, 15];
  const textLight = [224, 224, 224];
  const textMuted = [160, 160, 160];

  // Set dark background
  pdf.setFillColor(darkBg[0], darkBg[1], darkBg[2]);
  pdf.rect(0, 0, pageWidth, pageHeight, "F");

  let yPos = margin;

  // Header
  pdf.setTextColor(primaryGreen[0], primaryGreen[1], primaryGreen[2]);
  pdf.setFontSize(24);
  pdf.setFont("helvetica", "bold");
  pdf.text("Portfolio Analytics Report", margin, yPos + 8);

  yPos += 15;

  // Date and user info
  pdf.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
  pdf.setFontSize(10);
  pdf.setFont("helvetica", "normal");
  const dateStr = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  pdf.text(`Generated: ${dateStr}`, margin, yPos + 5);
  if (userName) {
    pdf.text(`Prepared for: ${userName}`, margin, yPos + 10);
    yPos += 5;
  }

  yPos += 15;

  // Divider line
  pdf.setDrawColor(primaryGreen[0], primaryGreen[1], primaryGreen[2]);
  pdf.setLineWidth(0.5);
  pdf.line(margin, yPos, pageWidth - margin, yPos);

  yPos += 10;

  // Net Worth Summary Section
  pdf.setTextColor(primaryGreen[0], primaryGreen[1], primaryGreen[2]);
  pdf.setFontSize(14);
  pdf.setFont("helvetica", "bold");
  pdf.text("Net Worth Summary", margin, yPos + 5);

  yPos += 12;

  // Summary boxes
  const boxWidth = (contentWidth - 10) / 4;
  const boxHeight = 25;

  const summaryItems = [
    { label: "RJ Portfolio", value: netWorthData.rjPortfolio, color: primaryGreen },
    { label: "External Assets", value: netWorthData.externalAssets, color: [0, 212, 255] },
    { label: "External Debt", value: netWorthData.externalDebt, color: [255, 0, 128] },
    { label: "Total Net Worth", value: netWorthData.totalNetWorth, color: netWorthData.totalNetWorth >= 0 ? primaryGreen : [255, 0, 128] },
  ];

  summaryItems.forEach((item, index) => {
    const boxX = margin + index * (boxWidth + 3.33);

    // Box background
    pdf.setFillColor(18, 18, 24);
    pdf.roundedRect(boxX, yPos, boxWidth, boxHeight, 2, 2, "F");

    // Box border
    pdf.setDrawColor(item.color[0], item.color[1], item.color[2]);
    pdf.setLineWidth(0.3);
    pdf.roundedRect(boxX, yPos, boxWidth, boxHeight, 2, 2, "S");

    // Label
    pdf.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
    pdf.setFontSize(7);
    pdf.setFont("helvetica", "normal");
    pdf.text(item.label.toUpperCase(), boxX + 3, yPos + 6);

    // Value
    pdf.setTextColor(item.color[0], item.color[1], item.color[2]);
    pdf.setFontSize(11);
    pdf.setFont("helvetica", "bold");
    const valueStr = formatCurrencyPDF(item.value);
    pdf.text(valueStr, boxX + 3, yPos + 16);
  });

  yPos += boxHeight + 15;

  // Capture charts as images
  const chartElements = chartsContainerRef.querySelectorAll(".terminal-window");
  const maxChartHeight = 70; // Maximum height for each chart in mm
  const halfWidth = (contentWidth - 5) / 2; // Width for side-by-side charts

  // Helper to capture and get chart data
  const captureChart = async (chartEl: HTMLElement) => {
    const canvas = await html2canvas(chartEl, {
      backgroundColor: "#0a0a0f",
      scale: 1.5,
      logging: false,
      useCORS: true,
    });
    return canvas.toDataURL("image/png");
  };

  // Process charts
  let i = 0;
  while (i < chartElements.length) {
    const chartEl = chartElements[i] as HTMLElement;
    const title = chartEl.querySelector(".terminal-header span")?.textContent || "";

    // Check if this is one of the side-by-side allocation charts
    const isAllocationPair = title.includes("rj_allocation") || title.includes("external_allocation");
    const isPerformancePair = title.includes("top_performers") || title.includes("bottom_performers");
    const isNetWorthBreakdown = title.includes("net_worth_breakdown");

    // Check if we need a new page
    if (yPos > pageHeight - 80) {
      pdf.addPage();
      pdf.setFillColor(darkBg[0], darkBg[1], darkBg[2]);
      pdf.rect(0, 0, pageWidth, pageHeight, "F");
      yPos = margin;
    }

    try {
      // Handle side-by-side charts
      if ((isAllocationPair || isPerformancePair) && i + 1 < chartElements.length) {
        const nextEl = chartElements[i + 1] as HTMLElement;
        const nextTitle = nextEl.querySelector(".terminal-header span")?.textContent || "";

        const shouldPair = (isAllocationPair && nextTitle.includes("allocation")) ||
                          (isPerformancePair && nextTitle.includes("performers"));

        if (shouldPair) {
          // Capture both charts
          const [imgData1, imgData2] = await Promise.all([
            captureChart(chartEl),
            captureChart(nextEl),
          ]);

          // Calculate heights
          const canvas1 = await html2canvas(chartEl, { scale: 0.5 });
          const canvas2 = await html2canvas(nextEl, { scale: 0.5 });

          let imgHeight1 = (canvas1.height * halfWidth) / canvas1.width;
          let imgHeight2 = (canvas2.height * halfWidth) / canvas2.width;

          // Use the taller height for both, but cap it
          let pairHeight = Math.max(imgHeight1, imgHeight2);
          if (pairHeight > maxChartHeight) {
            pairHeight = maxChartHeight;
          }

          // Check if pair fits on current page
          if (yPos + pairHeight > pageHeight - margin) {
            pdf.addPage();
            pdf.setFillColor(darkBg[0], darkBg[1], darkBg[2]);
            pdf.rect(0, 0, pageWidth, pageHeight, "F");
            yPos = margin;
          }

          // Add both images side by side
          pdf.addImage(imgData1, "PNG", margin, yPos, halfWidth, pairHeight);
          pdf.addImage(imgData2, "PNG", margin + halfWidth + 5, yPos, halfWidth, pairHeight);

          yPos += pairHeight + 8;
          i += 2; // Skip the next chart since we processed it
          continue;
        }
      }

      // Handle net worth breakdown (make it narrower)
      if (isNetWorthBreakdown) {
        const canvas = await html2canvas(chartEl, {
          backgroundColor: "#0a0a0f",
          scale: 1.5,
          logging: false,
          useCORS: true,
        });

        const imgData = canvas.toDataURL("image/png");
        let narrowWidth = contentWidth * 0.6; // 60% width for better proportions
        let imgHeight = (canvas.height * narrowWidth) / canvas.width;

        if (imgHeight > maxChartHeight) {
          const scaleFactor = maxChartHeight / imgHeight;
          imgHeight = maxChartHeight;
          narrowWidth = narrowWidth * scaleFactor;
        }

        const imgX = margin + (contentWidth - narrowWidth) / 2;

        if (yPos + imgHeight > pageHeight - margin) {
          pdf.addPage();
          pdf.setFillColor(darkBg[0], darkBg[1], darkBg[2]);
          pdf.rect(0, 0, pageWidth, pageHeight, "F");
          yPos = margin;
        }

        pdf.addImage(imgData, "PNG", imgX, yPos, narrowWidth, imgHeight);
        yPos += imgHeight + 8;
        i++;
        continue;
      }

      // Default: single full-width chart
      const canvas = await html2canvas(chartEl, {
        backgroundColor: "#0a0a0f",
        scale: 1.5,
        logging: false,
        useCORS: true,
      });

      const imgData = canvas.toDataURL("image/png");
      let imgWidth = contentWidth;
      let imgHeight = (canvas.height * imgWidth) / canvas.width;

      if (imgHeight > maxChartHeight) {
        const scaleFactor = maxChartHeight / imgHeight;
        imgHeight = maxChartHeight;
        imgWidth = imgWidth * scaleFactor;
      }

      const imgX = margin + (contentWidth - imgWidth) / 2;

      if (yPos + imgHeight > pageHeight - margin) {
        pdf.addPage();
        pdf.setFillColor(darkBg[0], darkBg[1], darkBg[2]);
        pdf.rect(0, 0, pageWidth, pageHeight, "F");
        yPos = margin;
      }

      pdf.addImage(imgData, "PNG", imgX, yPos, imgWidth, imgHeight);
      yPos += imgHeight + 8;
    } catch (error) {
      console.error("Error capturing chart:", error);
    }

    i++;
  }

  // Footer on last page
  pdf.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
  pdf.setFontSize(8);
  pdf.setFont("helvetica", "italic");
  pdf.text(
    "Generated by Finance Tracker",
    pageWidth / 2,
    pageHeight - 10,
    { align: "center" }
  );

  // Save the PDF
  const filename = `portfolio-report-${new Date().toISOString().split("T")[0]}.pdf`;
  pdf.save(filename);
}

function formatCurrencyPDF(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}
