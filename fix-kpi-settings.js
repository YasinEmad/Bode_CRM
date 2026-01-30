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
      
      // Check if requests exists
      const hasRequests = existingSettings.indicators?.some((ind) => ind.name === 'requests');
      
      if (!hasRequests) {
        console.log('🔄 Adding requests indicator...');
        
        // Add requests
        const newIndicators = [
          ...existingSettings.indicators,
          { name: 'requests', target: 10, weight: 20 }
        ];
        
        // Normalize weights to 100%
        const currentTotal = newIndicators.reduce((sum, ind) => sum + ind.weight, 0);
        
        if (currentTotal !== 100) {
          console.log(`Current total weight: ${currentTotal}%, normalizing...`);
          const normalized = newIndicators.map((ind) => {
            if (ind.name === 'requests') {
              return {
                name: ind.name,
                target: Number(ind.target) || 10,
                weight: Number(ind.weight) || 20,
              };
            }
            const scale = 80 / (currentTotal - 20);
            const newWeight = Math.round((ind.weight * scale) * 100) / 100;
            return {
              name: ind.name,
              target: Number(ind.target) || 0,
              weight: !isNaN(newWeight) ? newWeight : ind.weight,
            };
          });
          
          // Ensure total is exactly 100
          let total = 0;
          normalized.forEach((ind) => (total += ind.weight));
          const difference = 100 - total;
          if (Math.abs(difference) > 0.01) {
            normalized[0].weight = Number(normalized[0].weight) + difference;
          }
          
          console.log('Updated indicators:');
          normalized.forEach((ind) => {
            console.log(`  - ${ind.name}: target=${Number(ind.target)}, weight=${Number(ind.weight)}%`);
          });
          
          await collection.updateOne(
            { _id: existingSettings._id },
            {
              $set: {
                indicators: normalized,
                totalWeight: 100,
              },
            }
          );
        } else {
          await collection.updateOne(
            { _id: existingSettings._id },
            {
              $set: {
                indicators: newIndicators.map((ind) => ({
                  name: ind.name,
                  target: Number(ind.target) || 0,
                  weight: Number(ind.weight) || 0,
                })),
                totalWeight: 100,
              },
            }
          );
        }
        
        console.log('✅ Successfully updated KPI settings with requests indicator');
      } else {
        console.log('✅ Requests indicator already exists');
      }
    } else {
      console.log('🔄 Creating default KPI settings...');
      await collection.insertOne({
        indicators: [
          { name: 'attendance', target: 95, weight: 10 },
          { name: 'deals', target: 2, weight: 20 },
          { name: 'calls', target: 20, weight: 15 },
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
