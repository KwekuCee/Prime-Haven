/**
 * Invoice PDF Generator
 * Uses browser's native print functionality to generate a clean PDF invoice.
 * No external dependencies needed.
 */

interface InvoiceData {
  id: string;
  clientName?: string;
  clientEmail?: string;
  serviceType: string;
  tier: string;
  amount: number;
  paymentReference?: string;
  paymentStatus: string;
  createdAt: string;
  currency?: string;
}

const SERVICE_LABELS: Record<string, string> = {
  'logo': 'Logo Design',
  'logo-design': 'Logo Design',
  'brand': 'Brand Identity',
  'brand-identity': 'Brand Identity',
  'uiux': 'UI/UX Design',
  'app-design': 'UI/UX Design',
  'web': 'Web Development',
  'web-development': 'Web Development',
  'print': 'Print Design',
  'flyer': 'Flyer / Poster Design',
  'social-media': 'Social Media Design',
  'illustration': 'Illustration',
};

export const generateInvoicePDF = (invoice: InvoiceData): void => {
  const currency = invoice.currency || 'GH₵';
  const serviceName = SERVICE_LABELS[invoice.serviceType] || invoice.serviceType?.replace(/-/g, ' ') || 'Design Service';
  const invoiceNumber = `INV-${invoice.id.slice(0, 8).toUpperCase()}`;
  const dateStr = new Date(invoice.createdAt).toLocaleDateString('en-GB', {
    day: '2-digit', month: 'long', year: 'numeric'
  });

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <title>Invoice ${invoiceNumber}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Inter', sans-serif; background: #fff; color: #0f0f0f; padding: 48px; font-size: 13px; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 48px; }
    .brand { font-size: 22px; font-weight: 700; letter-spacing: -0.5px; color: #6c47ff; }
    .brand-sub { font-size: 11px; color: #888; margin-top: 2px; }
    .invoice-label { text-align: right; }
    .invoice-label h1 { font-size: 28px; font-weight: 700; color: #0f0f0f; letter-spacing: -1px; }
    .invoice-label p { font-size: 11px; color: #666; margin-top: 4px; }
    .divider { border: none; border-top: 1px solid #eee; margin: 24px 0; }
    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 32px; margin-bottom: 40px; }
    .info-block h3 { font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; color: #999; margin-bottom: 8px; }
    .info-block p { font-size: 13px; color: #333; line-height: 1.6; }
    .info-block .name { font-weight: 600; font-size: 15px; color: #0f0f0f; }
    .table { width: 100%; border-collapse: collapse; margin-bottom: 32px; }
    .table thead tr { border-bottom: 2px solid #0f0f0f; }
    .table th { text-align: left; font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.8px; color: #666; padding: 0 12px 10px; }
    .table th:last-child { text-align: right; }
    .table tbody tr { border-bottom: 1px solid #f0f0f0; }
    .table td { padding: 14px 12px; font-size: 13px; color: #333; }
    .table td:last-child { text-align: right; font-weight: 600; }
    .totals { margin-left: auto; width: 240px; }
    .totals-row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 13px; color: #555; }
    .totals-row.total { border-top: 2px solid #0f0f0f; margin-top: 8px; padding-top: 12px; font-size: 16px; font-weight: 700; color: #0f0f0f; }
    .status-badge { display: inline-block; padding: 3px 10px; border-radius: 999px; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;
      background: ${invoice.paymentStatus === 'paid' || invoice.paymentStatus === 'completed' ? '#d1fae5' : '#fef3c7'};
      color: ${invoice.paymentStatus === 'paid' || invoice.paymentStatus === 'completed' ? '#065f46' : '#92400e'};
    }
    .footer { margin-top: 60px; text-align: center; font-size: 11px; color: #aaa; line-height: 1.8; border-top: 1px solid #eee; padding-top: 24px; }
    .accent { color: #6c47ff; font-weight: 600; }
    @media print {
      body { padding: 32px; }
      @page { margin: 0; size: A4; }
    }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="brand">Prime Haven</div>
      <div class="brand-sub">Creative Design Agency</div>
    </div>
    <div class="invoice-label">
      <h1>INVOICE</h1>
      <p class="accent">${invoiceNumber}</p>
      <p>Issued: ${dateStr}</p>
    </div>
  </div>

  <hr class="divider" />

  <div class="info-grid">
    <div class="info-block">
      <h3>Billed To</h3>
      <p class="name">${invoice.clientName || 'Valued Client'}</p>
      ${invoice.clientEmail ? `<p>${invoice.clientEmail}</p>` : ''}
    </div>
    <div class="info-block">
      <h3>From</h3>
      <p class="name">Prime Haven</p>
      <p>primehaven26@gmail.com</p>
      <p>Ghana, West Africa</p>
    </div>
  </div>

  <table class="table">
    <thead>
      <tr>
        <th style="width:40%">Description</th>
        <th>Package</th>
        <th>Reference</th>
        <th>Status</th>
        <th>Amount</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>${serviceName}</strong></td>
        <td style="text-transform:capitalize">${invoice.tier || 'Standard'}</td>
        <td>${invoice.paymentReference || '—'}</td>
        <td><span class="status-badge">${invoice.paymentStatus || 'pending'}</span></td>
        <td>${currency}${Number(invoice.amount || 0).toLocaleString()}</td>
      </tr>
    </tbody>
  </table>

  <div class="totals">
    <div class="totals-row"><span>Subtotal</span><span>${currency}${Number(invoice.amount || 0).toLocaleString()}</span></div>
    <div class="totals-row"><span>Tax (0%)</span><span>${currency}0.00</span></div>
    <div class="totals-row total"><span>Total Due</span><span>${currency}${Number(invoice.amount || 0).toLocaleString()}</span></div>
  </div>

  <div class="footer">
    <p>Thank you for choosing <strong>Prime Haven</strong> — Where Creativity Meets Excellence.</p>
    <p>This is a computer-generated invoice and does not require a signature.</p>
    <p>Questions? Contact us at <span class="accent">primehaven26@gmail.com</span></p>
  </div>
</body>
</html>`;

  const printWindow = window.open('', '_blank', 'width=900,height=700');
  if (!printWindow) {
    alert('Please allow popups to download invoice PDFs.');
    return;
  }
  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => {
    printWindow.print();
    // Don't close — user can Save as PDF from print dialog
  }, 600);
};
