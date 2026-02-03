/**
 * Backfill script: populate missing `project` on Commission documents
 * Usage: MONGODB_URI=<uri> node scripts/backfill-commission-projects.js
 */
const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:3000/bode-crm';

async function run() {
  try {
    await mongoose.connect(MONGODB_URI, { dbName: undefined });
    console.log('Connected to DB');

    const { Schema, Types } = mongoose;

    const CommissionSchema = new Schema({ project: String, dealId: Schema.Types.Mixed }, { strict: false });
    const DealClosingSchema = new Schema({ project: String }, { strict: false });
    const LeadSchema = new Schema({ project: String }, { strict: false });

    // Force collection names to match existing ones
    const Commission = mongoose.models.Commission || mongoose.model('Commission', CommissionSchema, 'commissions');
    const DealClosing = mongoose.models.DealClosing || mongoose.model('DealClosing', DealClosingSchema, 'dealclosings');
    const Lead = mongoose.models.Lead || mongoose.model('Lead', LeadSchema, 'leads');

    const cursor = Commission.find({ $or: [{ project: { $exists: false } }, { project: '' }, { project: null }] }).cursor();
    let count = 0;
    for (let doc = await cursor.next(); doc != null; doc = await cursor.next()) {
      try {
        let project = doc.project;
        if (!project || project === '') {
          if (doc.dealId) {
            const id = String(doc.dealId);
            // Try DealClosing first
            let deal = null;
            try {
              deal = await DealClosing.findById(id).lean();
            } catch (e) {
              deal = null;
            }
            if (deal && deal.project) project = deal.project;
            else {
              let lead = null;
              try {
                lead = await Lead.findById(id).lean();
              } catch (e) {
                lead = null;
              }
              if (lead && lead.project) project = lead.project;
            }
          }
        }

        if (project && project !== '') {
          doc.project = project;
          await doc.save();
          count++;
          console.log(`Updated commission ${doc._id} => project='${project}'`);
        } else {
          console.log(`No project found for commission ${doc._id}`);
        }
      } catch (err) {
        console.error('Error processing commission', doc._id, err);
      }
    }

    console.log(`Backfill complete. Updated ${count} commission(s).`);
    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('Backfill failed', err);
    try { await mongoose.disconnect(); } catch (_) {}
    process.exit(1);
  }
}

run();
