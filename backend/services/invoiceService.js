const Invoice = require('../Model/Invoice');

async function getInvoiceForUser(userId, invoiceIdOrNumber) {
  // Support both :id as Mongo _id or invoiceNumber.
  const invoice = await Invoice.findOne({
    userId,
    $or: [
      { _id: invoiceIdOrNumber },
      { invoiceNumber: invoiceIdOrNumber },
    ],
  }).lean();

  return invoice;
}

module.exports = {
  getInvoiceForUser,
};

