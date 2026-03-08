require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/bode-crm';

const TeamSchema = new mongoose.Schema({
  name: String,
  leader: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
}, { timestamps: true });

const UserSchema = new mongoose.Schema({
  name: String,
  email: String,
  role: String,
}, { timestamps: true });

const Team = mongoose.model('Team', TeamSchema);
const User = mongoose.model('User', UserSchema);

async function check() {
  try {
    console.log('Connecting...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected');

    const teams = await Team.find().populate('leader', 'name role').populate('members', 'name role');
    console.log(`Found ${teams.length} teams:`);
    teams.forEach((t, i) => {
      console.log(`${i+1}. ${t.name}`);
      console.log(`   Leader: ${t.leader?.name} (${t.leader?.role})`);
      console.log(`   Members: ${t.members.length}`);
      t.members.forEach(m => console.log(`     - ${m.name} (${m.role})`));
    });

    const teamLeaders = await User.find({ role: 'team-leader' });
    console.log(`\nFound ${teamLeaders.length} users with role 'team-leader':`);
    teamLeaders.forEach(tl => console.log(`- ${tl.name} (${tl.email})`));

  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await mongoose.disconnect();
  }
}

check();
