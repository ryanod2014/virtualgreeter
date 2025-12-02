/**
 * Coverage Statistics Utilities
 * 
 * Calculates hourly coverage data showing visitor traffic vs agent availability.
 * Used to identify staffing gaps and hiring opportunities.
 */

interface Pageview {
  created_at: string;
  agent_id: string | null;
}

interface Session {
  started_at: string;
  ended_at: string | null;
}

export interface HourlyStats {
  hour: number; // 0-23
  totalPageviews: number;
  pageviewsWithAgent: number;
  missedOpportunities: number;
  avgAgentsOnline: number;
}

/**
 * Calculate hourly coverage statistics from pageviews and agent sessions
 * 
 * @param pageviews - Array of pageviews with created_at and agent_id
 * @param sessions - Array of agent sessions with started_at and ended_at
 * @param fromDate - Start of date range
 * @param toDate - End of date range
 * @returns Array of 24 HourlyStats objects (one per hour 0-23)
 */
export function calculateHourlyCoverage(
  pageviews: Pageview[],
  sessions: Session[],
  fromDate: Date,
  toDate: Date
): HourlyStats[] {
  // Initialize 24 hours with zero values
  const hourlyData: HourlyStats[] = Array.from({ length: 24 }, (_, hour) => ({
    hour,
    totalPageviews: 0,
    pageviewsWithAgent: 0,
    missedOpportunities: 0,
    avgAgentsOnline: 0,
  }));

  // Group pageviews by hour of day
  pageviews.forEach((pv) => {
    const date = new Date(pv.created_at);
    const hour = date.getHours();
    
    hourlyData[hour].totalPageviews++;
    if (pv.agent_id) {
      hourlyData[hour].pageviewsWithAgent++;
    } else {
      hourlyData[hour].missedOpportunities++;
    }
  });

  // Calculate number of days in the range
  const numDays = Math.max(
    1,
    Math.ceil((toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24))
  );

  // Calculate average agents online per hour
  // For each hour, calculate total agent-minutes across all days, then average
  hourlyData.forEach((h) => {
    let totalAgentMinutes = 0;
    
    sessions.forEach((session) => {
      const start = new Date(session.started_at);
      const end = session.ended_at ? new Date(session.ended_at) : new Date();
      
      // For each day in range, check if session covers this hour
      const currentDay = new Date(fromDate);
      currentDay.setHours(0, 0, 0, 0);
      
      const endDay = new Date(toDate);
      endDay.setHours(23, 59, 59, 999);
      
      while (currentDay <= endDay) {
        const hourStart = new Date(currentDay);
        hourStart.setHours(h.hour, 0, 0, 0);
        const hourEnd = new Date(currentDay);
        hourEnd.setHours(h.hour, 59, 59, 999);
        
        // Calculate overlap between session and this hour slot
        const overlapStart = Math.max(start.getTime(), hourStart.getTime());
        const overlapEnd = Math.min(end.getTime(), hourEnd.getTime());
        
        if (overlapEnd > overlapStart) {
          totalAgentMinutes += (overlapEnd - overlapStart) / (1000 * 60);
        }
        
        // Move to next day
        currentDay.setDate(currentDay.getDate() + 1);
      }
    });
    
    // Average agents = total agent-minutes / (60 min * numDays)
    // This gives us the average number of agents online during this hour across the date range
    h.avgAgentsOnline = totalAgentMinutes / (60 * numDays);
  });

  return hourlyData;
}

/**
 * Find hours with coverage problems (high traffic but low/no agent coverage)
 * 
 * @param hourlyStats - Array of hourly statistics
 * @returns Array of hours (0-23) that have coverage issues
 */
export function findProblemHours(hourlyStats: HourlyStats[]): number[] {
  return hourlyStats
    .filter(h => 
      h.totalPageviews > 0 && 
      h.missedOpportunities > h.pageviewsWithAgent
    )
    .map(h => h.hour);
}

/**
 * Stats for a specific day-of-week + hour combination
 */
export interface DayHourStats {
  dayOfWeek: number; // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  dayName: string;
  hour: number; // 0-23
  totalPageviews: number;
  pageviewsWithAgent: number;
  missedOpportunities: number;
  avgAgentsOnline: number;
  coverageGap: number; // Negative = more agents than needed, Positive = need more agents
}

/**
 * Daily stats aggregated by day of week
 */
export interface DayOfWeekStats {
  dayOfWeek: number;
  dayName: string;
  totalPageviews: number;
  pageviewsWithAgent: number;
  missedOpportunities: number;
  coverageRate: number;
}

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/**
 * Calculate coverage broken down by day of week and hour
 * Returns a 7x24 grid for heatmap visualization
 */
export function calculateDailyHourlyCoverage(
  pageviews: Pageview[],
  sessions: Session[],
  fromDate: Date,
  toDate: Date
): { byDayHour: DayHourStats[][]; byDayOfWeek: DayOfWeekStats[] } {
  // Initialize 7 days x 24 hours grid
  const byDayHour: DayHourStats[][] = Array.from({ length: 7 }, (_, day) =>
    Array.from({ length: 24 }, (_, hour) => ({
      dayOfWeek: day,
      dayName: DAY_NAMES[day],
      hour,
      totalPageviews: 0,
      pageviewsWithAgent: 0,
      missedOpportunities: 0,
      avgAgentsOnline: 0,
      coverageGap: 0,
    }))
  );

  // Count days of each type in the range (for averaging)
  const dayCount: number[] = [0, 0, 0, 0, 0, 0, 0];
  const currentDay = new Date(fromDate);
  while (currentDay <= toDate) {
    dayCount[currentDay.getDay()]++;
    currentDay.setDate(currentDay.getDate() + 1);
  }

  // Group pageviews by day of week and hour
  pageviews.forEach((pv) => {
    const date = new Date(pv.created_at);
    const dayOfWeek = date.getDay();
    const hour = date.getHours();
    
    byDayHour[dayOfWeek][hour].totalPageviews++;
    if (pv.agent_id) {
      byDayHour[dayOfWeek][hour].pageviewsWithAgent++;
    } else {
      byDayHour[dayOfWeek][hour].missedOpportunities++;
    }
  });

  // Calculate agent coverage per day/hour
  sessions.forEach((session) => {
    const start = new Date(session.started_at);
    const end = session.ended_at ? new Date(session.ended_at) : new Date();
    
    // For each day in range
    const checkDay = new Date(fromDate);
    checkDay.setHours(0, 0, 0, 0);
    
    while (checkDay <= toDate) {
      const dayOfWeek = checkDay.getDay();
      
      // Check each hour
      for (let hour = 0; hour < 24; hour++) {
        const hourStart = new Date(checkDay);
        hourStart.setHours(hour, 0, 0, 0);
        const hourEnd = new Date(checkDay);
        hourEnd.setHours(hour, 59, 59, 999);
        
        const overlapStart = Math.max(start.getTime(), hourStart.getTime());
        const overlapEnd = Math.min(end.getTime(), hourEnd.getTime());
        
        if (overlapEnd > overlapStart) {
          const minutesCovered = (overlapEnd - overlapStart) / (1000 * 60);
          byDayHour[dayOfWeek][hour].avgAgentsOnline += minutesCovered / 60;
        }
      }
      
      checkDay.setDate(checkDay.getDate() + 1);
    }
  });

  // Average out agent coverage by number of days of that type
  for (let day = 0; day < 7; day++) {
    for (let hour = 0; hour < 24; hour++) {
      if (dayCount[day] > 0) {
        byDayHour[day][hour].avgAgentsOnline /= dayCount[day];
      }
      // Calculate coverage gap (positive = need more agents)
      const stats = byDayHour[day][hour];
      if (stats.totalPageviews > 0) {
        stats.coverageGap = stats.missedOpportunities / stats.totalPageviews;
      }
    }
  }

  // Aggregate by day of week
  const byDayOfWeek: DayOfWeekStats[] = DAY_NAMES.map((dayName, dayOfWeek) => {
    const dayStats = byDayHour[dayOfWeek];
    const total = dayStats.reduce((sum, h) => sum + h.totalPageviews, 0);
    const covered = dayStats.reduce((sum, h) => sum + h.pageviewsWithAgent, 0);
    const missed = dayStats.reduce((sum, h) => sum + h.missedOpportunities, 0);
    
    return {
      dayOfWeek,
      dayName,
      totalPageviews: total,
      pageviewsWithAgent: covered,
      missedOpportunities: missed,
      coverageRate: total > 0 ? (covered / total) * 100 : 100,
    };
  });

  return { byDayHour, byDayOfWeek };
}

