/**
 * Backfill script: create ClosedDealSnapshot docs for existing DealClosing records
 * Usage: MONGODB_URI=<uri> node scripts/backfill-closed-deals.js
 */
const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/bode-crm';

async function run() {
  try {
    await mongoose.connect(MONGODB_URI, { dbName: undefined });
    console.log('Connected to DB');

    const { Schema } = mongoose;

    const DealClosingSchema = new Schema({}, { strict: false });
    const LeadSchema = new Schema({}, { strict: false });
    const ClosedDealSnapshotSchema = new Schema({}, { strict: false });

    const DealClosing = mongoose.models.DealClosing || mongoose.model('DealClosing', DealClosingSchema, 'dealclosings');
    const Lead = mongoose.models.Lead || mongoose.model('Lead', LeadSchema, 'leads');
    const ClosedDealSnapshot = mongoose.models.ClosedDealSnapshot || mongoose.model('ClosedDealSnapshot', ClosedDealSnapshotSchema, 'closeddealsnapshots');

    const cursor = DealClosing.find().cursor();
    let created = 0;
    for (let doc = await cursor.next(); doc != null; doc = await cursor.next()) {
      try {
        const existing = await ClosedDealSnapshot.findOne({ dealId: doc._id }).lean();
        if (existing) continue;

        const payload = {
          dealId: doc._id,
          leadId: doc.leadId || null,
          userId: doc.userId || null,
          tcrType: doc.tcrType || null,
          clientName: doc.clientName || null,
          clientNumber: doc.clientNumber || null,
          developer: doc.developer || null,
          project: doc.project || null,
          unitCode: doc.unitCode || null,
          unitArea: doc.unitArea || null,
          unitType: doc.unitType || null,
          contractPrice: doc.contractPrice || null,
          contractDate: doc.contractDate || null,
          finishingType: doc.finishingType || null,
          deliveryDate: doc.deliveryDate || null,
          paymentPlan: doc.paymentPlan || null,
          downPaymentPercentage: doc.downPaymentPercentage || null,
          downPaymentAmount: doc.downPaymentAmount || null,
          paymentByMonth: doc.paymentByMonth || null,
          attachments: doc.attachments || [],
          info: doc.info || '',
          shared: !!doc.shared,
        };

        if (doc.leadId) {
          try {
            const lead = await Lead.findById(doc.leadId).select('assignedTo proofImage').lean();
            if (lead) {
              payload.assignedTo = lead.assignedTo || null;
              payload.proofImage = lead.proofImage || '';
            }
          } catch (e) {
            // ignore
          }
        }

        await ClosedDealSnapshot.create(payload);
        created++;
        console.log(`Created snapshot for deal ${doc._id}`);
      } catch (err) {
        console.error('Error creating snapshot for deal', doc._id, err);
      }
    }

    console.log(`Backfill complete. Created ${created} snapshot(s).`);
    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('Backfill failed', err);
    try { await mongoose.disconnect(); } catch (_) {}
    process.exit(1);
  }
}

run();
