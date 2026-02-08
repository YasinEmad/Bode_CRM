/**
 * KPI Calculation Utility
 * Provides functions to calculate KPI scores based on settings and employee data
 */

export interface KPIIndicator {
  name: string;
  target: number;
  weight: number;
}

export interface EmployeeMetrics {
  attendancePercentage: number;
  closedDealsCount: number;
  sheetsCount: number;
  meetingsCount: number;
  assessmentsCount: number;
  requestsCount: number;
}

export interface KPIScores {
  attendance: number;
  deals: number;
  sheets: number;
  meetings: number;
  assessments: number;
  requests: number;
  total: number;
}

/**
 * Calculate achievement percentage for a metric
 * For attendance: If below target, it's reduced proportionally
 * For others: Capped at 100%
 */
function calculateAchievementPercentage(actual: number, target: number, isAttendance: boolean): number {
  if (target <= 0) return 0;

  const percentage = (actual / target) * 100;

  // For attendance, we don't cap at 100% if target is exceeded
  // For other metrics, cap at 100%
  if (isAttendance) {
    return Math.min(percentage, 100);
  }

  return Math.min(percentage, 100);
}

/**
 * Calculate KPI score for a single indicator
 * Score = Achievement Percentage × Weight
 */
function calculateIndicatorScore(actual: number, target: number, weight: number, isAttendance: boolean): number {
  const achievementPercentage = calculateAchievementPercentage(actual, target, isAttendance);
  return (achievementPercentage / 100) * weight;
}

/**
 * Calculate total KPI for an employee
 * Returns detailed scores for each indicator and total KPI
 */
export function calculateEmployeeKPI(
  metrics: EmployeeMetrics,
  indicators: KPIIndicator[]
): KPIScores {
  if (!indicators || indicators.length === 0) {
    console.error('⚠️ No indicators provided to KPI calculator');
    return {
      attendance: 0,
      deals: 0,
      sheets: 0,
      meetings: 0,
      assessments: 0,
      requests: 0,
      total: 0,
    };
  }

  const scores: KPIScores = {
    attendance: 0,
    deals: 0,
    sheets: 0,
    meetings: 0,
    assessments: 0,
    requests: 0,
    total: 0,
  };

  // Create a map of indicators for easy lookup
  const indicatorMap = new Map<string, KPIIndicator>();
  indicators.forEach((ind) => {
    indicatorMap.set(ind.name.toLowerCase(), ind);
    console.log(`📊 Indicator loaded: ${ind.name} -> target: ${ind.target}, weight: ${ind.weight}`);
  });

  // Calculate score for each indicator
  const attendanceInd = indicatorMap.get('attendance');
  if (attendanceInd) {
    scores.attendance = calculateIndicatorScore(
      metrics.attendancePercentage,
      attendanceInd.target,
      attendanceInd.weight,
      true // isAttendance = true
    );
    console.log(`📊 Attendance: ${metrics.attendancePercentage}% / target: ${attendanceInd.target}% = ${scores.attendance.toFixed(2)}`);
  } else {
    console.warn('⚠️ Attendance indicator not found');
  }

  const dealsInd = indicatorMap.get('deals');
  if (dealsInd) {
    scores.deals = calculateIndicatorScore(
      metrics.closedDealsCount,
      dealsInd.target,
      dealsInd.weight,
      false
    );
    console.log(`📊 Deals: ${metrics.closedDealsCount} / target: ${dealsInd.target} = ${scores.deals.toFixed(2)}`);
  } else {
    console.warn('⚠️ Deals indicator not found');
  }

  const sheetsInd = indicatorMap.get('sheets');
  if (sheetsInd) {
    scores.sheets = calculateIndicatorScore(
      metrics.sheetsCount,
      sheetsInd.target,
      sheetsInd.weight,
      false
    );
    console.log(`📊 Sheets: ${metrics.sheetsCount} / target: ${sheetsInd.target} = ${scores.sheets.toFixed(2)}`);
  } else {
    console.warn('⚠️ Sheets indicator not found');
  }

  const meetingsInd = indicatorMap.get('meetings');
  if (meetingsInd) {
    scores.meetings = calculateIndicatorScore(
      metrics.meetingsCount,
      meetingsInd.target,
      meetingsInd.weight,
      false
    );
    console.log(`📊 Meetings: ${metrics.meetingsCount} / target: ${meetingsInd.target} = ${scores.meetings.toFixed(2)}`);
  } else {
    console.warn('⚠️ Meetings indicator not found');
  }

  const assessmentsInd = indicatorMap.get('assessments');
  if (assessmentsInd) {
    scores.assessments = calculateIndicatorScore(
      metrics.assessmentsCount,
      assessmentsInd.target,
      assessmentsInd.weight,
      false
    );
    console.log(`📊 Assessments: ${metrics.assessmentsCount} / target: ${assessmentsInd.target} = ${scores.assessments.toFixed(2)}`);
  } else {
    console.warn('⚠️ Assessments indicator not found');
  }

  const requestsInd = indicatorMap.get('requests');
  if (requestsInd) {
    scores.requests = calculateIndicatorScore(
      metrics.requestsCount,
      requestsInd.target,
      requestsInd.weight,
      false
    );
    console.log(`📊 Requests: ${metrics.requestsCount} / target: ${requestsInd.target} = ${scores.requests.toFixed(2)}`);
  } else {
    console.warn('⚠️ Requests indicator not found');
  }

  // Calculate total KPI
  scores.total = scores.attendance + scores.deals + scores.sheets + scores.meetings + scores.assessments + scores.requests;

  // Cap total at 100 (shouldn't happen if weights are correct, but just in case)
  scores.total = Math.min(scores.total, 100);
  
  console.log(`🎯 Total KPI Score: ${scores.total.toFixed(2)}`);

  return scores;
}

/**
 * Get detailed breakdown of KPI calculation for logging/debugging
 */
export function getKPIBreakdown(
  metrics: EmployeeMetrics,
  indicators: KPIIndicator[]
): Record<string, any> {
  const breakdown: Record<string, any> = {
    metrics,
    indicatorCalculations: {},
    totalKPI: 0,
  };

  const indicatorMap = new Map<string, KPIIndicator>();
  indicators.forEach((ind) => {
    indicatorMap.set(ind.name, ind);
  });

  // Attendance
  const attendanceInd = indicatorMap.get('attendance');
  if (attendanceInd) {
    const achievement = calculateAchievementPercentage(metrics.attendancePercentage, attendanceInd.target, true);
    const score = (achievement / 100) * attendanceInd.weight;
    breakdown.indicatorCalculations.attendance = {
      actual: metrics.attendancePercentage,
      target: attendanceInd.target,
      achievement: achievement.toFixed(2),
      weight: attendanceInd.weight,
      score: score.toFixed(2),
    };
  }

  // Deals
  const dealsInd = indicatorMap.get('deals');
  if (dealsInd) {
    const achievement = calculateAchievementPercentage(metrics.closedDealsCount, dealsInd.target, false);
    const score = (achievement / 100) * dealsInd.weight;
    breakdown.indicatorCalculations.deals = {
      actual: metrics.closedDealsCount,
      target: dealsInd.target,
      achievement: achievement.toFixed(2),
      weight: dealsInd.weight,
      score: score.toFixed(2),
    };
  }

  // Sheets
  const sheetsInd = indicatorMap.get('sheets');
  if (sheetsInd) {
    const achievement = calculateAchievementPercentage(metrics.sheetsCount, sheetsInd.target, false);
    const score = (achievement / 100) * sheetsInd.weight;
    breakdown.indicatorCalculations.sheets = {
      actual: metrics.sheetsCount,
      target: sheetsInd.target,
      achievement: achievement.toFixed(2),
      weight: sheetsInd.weight,
      score: score.toFixed(2),
    };
  }

  // Meetings
  const meetingsInd = indicatorMap.get('meetings');
  if (meetingsInd) {
    const achievement = calculateAchievementPercentage(metrics.meetingsCount, meetingsInd.target, false);
    const score = (achievement / 100) * meetingsInd.weight;
    breakdown.indicatorCalculations.meetings = {
      actual: metrics.meetingsCount,
      target: meetingsInd.target,
      achievement: achievement.toFixed(2),
      weight: meetingsInd.weight,
      score: score.toFixed(2),
    };
  }

  // Assessments
  const assessmentsInd = indicatorMap.get('assessments');
  if (assessmentsInd) {
    const achievement = calculateAchievementPercentage(metrics.assessmentsCount, assessmentsInd.target, false);
    const score = (achievement / 100) * assessmentsInd.weight;
    breakdown.indicatorCalculations.assessments = {
      actual: metrics.assessmentsCount,
      target: assessmentsInd.target,
      achievement: achievement.toFixed(2),
      weight: assessmentsInd.weight,
      score: score.toFixed(2),
    };
  }

  // Requests
  const requestsInd = indicatorMap.get('requests');
  if (requestsInd) {
    const achievement = calculateAchievementPercentage(metrics.requestsCount, requestsInd.target, false);
    const score = (achievement / 100) * requestsInd.weight;
    breakdown.indicatorCalculations.requests = {
      actual: metrics.requestsCount,
      target: requestsInd.target,
      achievement: achievement.toFixed(2),
      weight: requestsInd.weight,
      score: score.toFixed(2),
    };
  }

  const scores = calculateEmployeeKPI(metrics, indicators);
  breakdown.totalKPI = parseFloat(scores.total.toFixed(2));

  return breakdown;
}
