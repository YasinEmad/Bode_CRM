const mongoose = require('mongoose');

const MONGODB_URI = 'mongodb+srv://yemad7676_db_user:ZIDPYWQPMeMqNOqn@cluster0.vivzepv.mongodb.net/bode-crm?appName=Cluster0';

async function testKPISetting() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Drop existing model if any
    try {
      mongoose.deleteModel('KPISetting');
    } catch (e) {}

    // Define schema correctly
    const kpiSchema = new mongoose.Schema({
      indicators: [
        {
          name: String,
          target: Number,
          weight: Number
        }
      ],
      totalWeight: Number
    }, { timestamps: true });

    const KPISetting = mongoose.model('KPISetting', kpiSchema);
    
    // Try to find
    const setting = await KPISetting.findOne();
    if (setting) {
      console.log('✅ Found existing KPI Setting');
    } else {
      console.log('ℹ️ No existing KPI Setting, creating...');
      
      const newSetting = await KPISetting.create({
        indicators: [
          { name: 'attendance', target: 95, weight: 12.5 },
          { name: 'deals', target: 2, weight: 50 },
          { name: 'calls', target: 20, weight: 12.5 },
          { name: 'meetings', target: 5, weight: 12.5 },
          { name: 'assessments', target: 3, weight: 12.5 }
        ],
        totalWeight: 100
      });
      console.log('✅ Created KPI Setting successfully');
    }

    await mongoose.disconnect();
    console.log('✅ Test passed!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

testKPISetting();
