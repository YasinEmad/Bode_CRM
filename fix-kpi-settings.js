const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

async function fixKPISettings() {
  try {
    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const db = mongoose.connection;
    const collection = db.collection('kpisettings');

    console.log('🔄 Checking existing KPI settings...');
    const existingSettings = await collection.findOne({});

    if (existingSettings) {
      console.log('Found existing settings:', existingSettings._id);

      // Replace 'calls' with 'sheets' if needed
      const hasCalls = existingSettings.indicators?.some((ind) => ind.name === 'calls');
      const hasSheets = existingSettings.indicators?.some((ind) => ind.name === 'sheets');

      let newIndicators = existingSettings.indicators || [];
      let updated = false;

      if (hasCalls && !hasSheets) {
        console.log('🔄 Replacing calls with sheets indicator...');
        newIndicators = newIndicators.map((ind) =>
          ind.name === 'calls' ? { name: 'sheets', target: ind.target, weight: ind.weight } : ind
        );
        updated = true;
      }

      // Ensure requests exists for backward compatibility
      const hasRequests = newIndicators.some((ind) => ind.name === 'requests');
      if (!hasRequests) {
        console.log('🔄 Adding requests indicator...');
        newIndicators = [...newIndicators, { name: 'requests', target: 10, weight: 20 }];
        updated = true;
      }

      if (updated) {
        // Normalize weights to 100%
        const currentTotal = newIndicators.reduce((sum, ind) => sum + (Number(ind.weight) || 0), 0);
        if (currentTotal !== 100) {
          console.log(`Current total weight: ${currentTotal}%, normalizing...`);
          const normalized = newIndicators.map((ind) => {
            if (ind.name === 'requests') {
              return { name: ind.name, target: Number(ind.target) || 10, weight: Number(ind.weight) || 20 };
            }
            const scale = 80 / (currentTotal - 20 || 1);
            const newWeight = Math.round((Number(ind.weight) * scale) * 100) / 100;
            return { name: ind.name, target: Number(ind.target) || 0, weight: !isNaN(newWeight) ? newWeight : Number(ind.weight) || 0 };
          });

          let total = normalized.reduce((s, i) => s + i.weight, 0);
          const diff = 100 - total;
          if (Math.abs(diff) > 0.01) normalized[0].weight = Number(normalized[0].weight) + diff;

          await collection.updateOne({ _id: existingSettings._id }, { $set: { indicators: normalized, totalWeight: 100 } });
          console.log('✅ KPI settings normalized and saved');
        } else {
          await collection.updateOne({ _id: existingSettings._id }, { $set: { indicators: newIndicators, totalWeight: 100 } });
          console.log('✅ KPI settings updated');
        }
      } else {
        console.log('✅ KPI settings are already up to date');
      }
    } else {
      console.log('🔄 Creating default KPI settings...');
      await collection.insertOne({
        indicators: [
          { name: 'attendance', target: 95, weight: 10 },
          { name: 'deals', target: 2, weight: 20 },
          { name: 'sheets', target: 20, weight: 15 },
          { name: 'meetings', target: 5, weight: 15 },
          { name: 'assessments', target: 3, weight: 20 },
          { name: 'requests', target: 10, weight: 20 },
        ],
        totalWeight: 100,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      console.log('✅ Created default KPI settings');
    }

    console.log('\n📋 Final KPI Settings:');
    const updatedSettings = await collection.findOne({});
    updatedSettings.indicators.forEach((ind) => {
      console.log(`  - ${ind.name}: target=${ind.target}, weight=${ind.weight}%`);
    });
    console.log(`  Total Weight: ${updatedSettings.totalWeight}%`);

    await mongoose.disconnect();
    console.log('✅ All done!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

fixKPISettings();
