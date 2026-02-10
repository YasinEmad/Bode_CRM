const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

const SystemSettingsSchema = new mongoose.Schema({
  officeLatitude: Number,
  officeLongitude: Number,
  officeName: String,
  attendanceRadius: Number,
  attendanceTime: String,
  allowedEarlyMinutes: Number,
  shiftDuration: Number,
  minGpsAccuracy: Number,
  createdAt: Date,
  updatedAt: Date,
});

const SystemSettings = mongoose.model('SystemSettings', SystemSettingsSchema);

async function checkSettings() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
    
    const settings = await SystemSettings.findOne();
    if (!settings) {
      console.log('No settings found');
    } else {
      console.log('==== CURRENT SYSTEM SETTINGS ====');
      console.log('Attendance Time (Shift Start):', settings.attendanceTime);
      console.log('Shift Duration (hours):', settings.shiftDuration);
      console.log('Allowed Early Minutes:', settings.allowedEarlyMinutes);
      console.log('Office Name:', settings.officeName);
      console.log('==================================');
    }
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await mongoose.disconnect();
  }
}

checkSettings();
