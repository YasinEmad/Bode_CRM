// Quick diagnostic: Check which employees are NOT assigned to any team
// Run this in MongoDB console or via an admin API

// Option 1: In MongoDB directly
db.teams.aggregate([
  {
    $group: {
      _id: null,
      teamMembers: { $push: "$members" },
      teamLeaders: { $push: "$leader" }
    }
  },
  {
    $addFields: {
      allInTeams: { $concatArrays: ["$teamMembers", [["$teamLeaders"]]] }
    }
  }
]).toArray()

// Then check employees NOT in teams:
db.users.find({
  role: { $in: ["sales", "media buyer"] },
  _id: { $nin: /* IDs from above */ }
}).select("_id name email position")

// Option 2: Via this check script
// Count total sales/media buyers
db.users.count({ role: { $in: ["sales", "media buyer"] } })

// Count sales/media buyers in ANY team
db.teams.aggregate([
  { $unwind: "$members" },
  { $group: { _id: "$members" } }
]).itcount()

// If these numbers don't match, you have unassigned employees!
