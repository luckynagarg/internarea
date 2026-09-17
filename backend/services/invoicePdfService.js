const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

const defaultInvoiceDir = path.join(__dirname, '..', '..', 'invoices');

function safeInvoiceNumber(invoiceNumber) {
  return String(invoiceNumber).replace(/[^a-zA-Z0-9-_]/g, '_');
}

async function generateInvoicePdf({
  invoiceNumber,
  userName,
  userEmail,
  planName,
  amountPaid,
  paymentId,
  subscriptionStart,
  subscriptionExpiry,
  outputDir = defaultInvoiceDir,
}) {
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

  const filename = `${safeInvoiceNumber(invoiceNumber)}.pdf`;
  const filepath = path.join(outputDir, filename);

  const doc = new PDFDocument({ size: 'A4', margin: 50 });
  const stream = fs.createWriteStream(filepath);
  doc.pipe(stream);

  doc.fontSize(20).text('InternArea - Subscription Invoice', { align: 'left' });
  doc.moveDown();

  doc.fontSize(12).text(`Invoice Number: ${invoiceNumber}`);
  doc.text(`Issued To: ${userName || 'User'}`);
  doc.text(`Email: ${userEmail || '-'}`);
  doc.moveDown();

  doc.fontSize(14).text('Subscription Details', { underline: true });
  doc.moveDown(0.5);

  const rows = [
    ['Plan', planName],
    ['Amount Paid', `₹${amountPaid}`],
    ['Payment ID', paymentId],
    ['Subscription Start Date', new Date(subscriptionStart).toDateString()],
    ['Subscription Expiry Date', new Date(subscriptionExpiry).toDateString()],
  ];

  doc.fontSize(12);
  for (const [k, v] of rows) {
    doc.text(`${k}: ${v}`);
  }

  doc.moveDown();
  doc.fontSize(10).fillColor('gray').text('Thank you for choosing InternArea.', { align: 'left' });

  doc.end();

  await new Promise((resolve, reject) => {
    stream.on('finish', resolve);
    stream.on('error', reject);
  });

  return filepath;
}

module.exports = { generateInvoicePdf };

