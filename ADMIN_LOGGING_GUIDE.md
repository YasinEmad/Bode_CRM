/**
 * Integration Guide: Admin Action Logging
 * 
 * This file shows how to log admin actions across the application.
 * Copy the logAdminAction import and call it in your admin API routes.
 */

/**
 * STEP 1: Import the logging function
 */
// import { logAdminAction } from '@/lib/adminLogger';

/**
 * STEP 2: Call logAdminAction after a successful admin action
 */

/**
 * EXAMPLE 1: Logging admin user creation (already implemented in src/app/api/admin/users/route.ts)
 */
// await logAdminAction({
//   adminId: payload.userId,
//   action: 'create',
//   resourceType: 'admin',
//   resourceId: user._id,
//   resourceName: user.name,
//   description: `Created new admin user: ${user.name} (${user.username})`,
//   details: {
//     username: user.username,
//     email: user.email,
//     position: user.position,
//   },
// });

/**
 * EXAMPLE 2: Logging commission approval (already implemented in src/app/api/commissions/[id]/route.ts)
 */
// await logAdminAction({
//   adminId: payload.userId,
//   action: 'approve',
//   resourceType: 'commission',
//   resourceId: commission._id,
//   resourceName: `Commission for ${employeeName}`,
//   description: `Approved commission for ${employeeName}. Amount: ${commission.amount}`,
//   details: {
//     commissionId: commission._id,
//     employeeId: commission.employeeId,
//     amount: commission.amount,
//     status: 'approved',
//   },
// });

/**
 * EXAMPLE 3: Logging employee deletion
 */
// await logAdminAction({
//   adminId: payload.userId,
//   action: 'delete',
//   resourceType: 'employee',
//   resourceId: employeeId,
//   resourceName: employee.name,
//   description: `Deleted employee: ${employee.name} (${employee.email})`,
//   details: {
//     employeeId: employee._id,
//     email: employee.email,
//     position: employee.position,
//   },
// });

/**
 * EXAMPLE 4: Logging settings change
 */
// await logAdminAction({
//   adminId: payload.userId,
//   action: 'update',
//   resourceType: 'settings',
//   resourceName: 'System Settings',
//   description: `Updated system settings: Changed commission rate from ${oldRate}% to ${newRate}%`,
//   details: {
//     settingKey: 'commissionRate',
//     oldValue: oldRate,
//     newValue: newRate,
//   },
// });

/**
 * EXAMPLE 5: Logging team modification
 */
// await logAdminAction({
//   adminId: payload.userId,
//   action: 'update',
//   resourceType: 'team',
//   resourceId: team._id,
//   resourceName: team.name,
//   description: `Updated team: ${team.name}. Changed members count from ${oldCount} to ${newCount}`,
//   details: {
//     teamId: team._id,
//     oldMemberCount: oldCount,
//     newMemberCount: newCount,
//   },
// });

/**
 * SUPPORTED ACTION TYPES:
 * - 'create': Creating a new resource
 * - 'update': Modifying an existing resource
 * - 'delete': Removing a resource
 * - 'approve': Approving a request (commission, etc.)
 * - 'reject': Rejecting a request
 * - 'assign': Assigning a resource (already handled by AssignmentLog for leads)
 */

/**
 * SUPPORTED RESOURCE TYPES:
 * - 'admin': Admin user account
 * - 'employee': Employee account
 * - 'user': Generic user
 * - 'lead': Lead record
 * - 'commission': Commission entry
 * - 'team': Team record
 * - 'settings': System settings
 * - 'deal': Deal closing record
 */

/**
 * HOW TO IMPLEMENT IN YOUR ROUTE:
 * 
 * 1. Add import at top:
 *    import { logAdminAction } from '@/lib/adminLogger';
 * 
 * 2. After successful operation, add:
 *    await logAdminAction({
 *      adminId: payload.userId,
 *      action: 'action_type',
 *      resourceType: 'resource_type',
 *      resourceId: resource._id,
 *      resourceName: resource.name,
 *      description: 'Human-readable description',
 *      details: { /* additional context */ },
 *    });
 * 
 * 3. Return your response as normal
 *    (logging errors won't break the main operation)
 */

export {}; // This is just a documentation file
