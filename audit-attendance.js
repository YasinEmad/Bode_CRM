const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

const AttendanceSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  date: Date,
  checkInTime: Date,
  latitude: Number,
  longitude: Number,
  withinRadius: Boolean,
  isLate: Boolean,
  lateMinutes: Number,
  deviceId: String,
  createdAt: Date,
  updatedAt: Date,
});

const UserSchema = new mongoose.Schema({
  name: String,
  email: String,
  role: String,
});

const Attendance = mongoose.model('Attendance', AttendanceSchema);
const User = mongoose.model('User', UserSchema);

async function findProblemAttendance() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB\n');

    // Get all attendance records
    const records = await Attendance.find().populate('userId', 'name email');
    
    console.log('====== ATTENDANCE RECORDS AUDIT ======\n');
    
    for (const record of records) {
      const userName = record.userId ? record.userId.name : 'Unknown';
      const checkInDate = new Date(record.checkInTime);
      const recordDate = new Date(record.date);
      const checkInHours = checkInDate.getHours();
      const checkInMinutes = checkInDate.getMinutes();
      const checkInTimeStr = `${String(checkInHours).padStart(2, '0')}:${String(checkInMinutes).padStart(2, '0')}`;
      
      console.log(`Employee: ${userName}`);
      console.log(`  Record Date: ${recordDate.toDateString()}`);
      console.log(`  Check-in Time: ${checkInDate.toISOString()}`);
      console.log(`  Time of Day: ${checkInTimeStr}`);
      console.log(`  Is Late: ${record.isLate}, Late Minutes: ${record.lateMinutes}`);
      console.log(`  Device ID: ${record.deviceId}`);
      console.log('---');
    }

    console.log('\n====== SUMMARY ======');
    console.log(`Total attendance records: ${records.length}`);

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await mongoose.disconnect();
  }
}

findProblemAttendance();
