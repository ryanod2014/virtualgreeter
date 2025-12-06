import { describe, it, expect } from "vitest";
import {
  calculateHourlyCoverage,
  findProblemHours,
  calculateDailyHourlyCoverage,
  type HourlyStats,
} from "./coverage-stats";

describe("coverage-stats", () => {
  // Helper to create pageviews at specific hours
  const createPageview = (hour: number, dayOffset: number = 0, hasAgent: boolean = true) => ({
    created_at: new Date(2024, 0, 1 + dayOffset, hour, 30, 0).toISOString(),
    agent_id: hasAgent ? "agent-123" : null,
  });

  // Helper to create session spanning hours
  const createSession = (startHour: number, endHour: number, dayOffset: number = 0) => ({
    started_at: new Date(2024, 0, 1 + dayOffset, startHour, 0, 0).toISOString(),
    ended_at: new Date(2024, 0, 1 + dayOffset, endHour, 59, 59).toISOString(),
  });

  describe("calculateHourlyCoverage", () => {
    const fromDate = new Date(2024, 0, 1);
    const toDate = new Date(2024, 0, 1);

    describe("initialization", () => {
      it("returns array of 24 HourlyStats objects", () => {
        const result = calculateHourlyCoverage([], [], fromDate, toDate);

        expect(result).toHaveLength(24);
        expect(result[0].hour).toBe(0);
        expect(result[23].hour).toBe(23);
      });

      it("initializes all hours with zero values when no data", () => {
        const result = calculateHourlyCoverage([], [], fromDate, toDate);

        result.forEach((hourStats, idx) => {
          expect(hourStats.hour).toBe(idx);
          expect(hourStats.totalPageviews).toBe(0);
          expect(hourStats.pageviewsWithAgent).toBe(0);
          expect(hourStats.missedOpportunities).toBe(0);
          expect(hourStats.avgAgentsOnline).toBe(0);
        });
      });
    });

    describe("totalPageviews", () => {
      it("counts pageviews grouped by hour", () => {
        const pageviews = [
          createPageview(9),
          createPageview(9),
          createPageview(10),
          createPageview(14),
        ];

        const result = calculateHourlyCoverage(pageviews, [], fromDate, toDate);

        expect(result[9].totalPageviews).toBe(2);
        expect(result[10].totalPageviews).toBe(1);
        expect(result[14].totalPageviews).toBe(1);
        expect(result[8].totalPageviews).toBe(0);
      });

      it("handles pageviews at hour boundaries", () => {
        const pageviews = [
          { created_at: new Date(2024, 0, 1, 9, 0, 0).toISOString(), agent_id: "a" },
          { created_at: new Date(2024, 0, 1, 9, 59, 59).toISOString(), agent_id: "b" },
        ];

        const result = calculateHourlyCoverage(pageviews, [], fromDate, toDate);

        expect(result[9].totalPageviews).toBe(2);
      });

      it("handles midnight (hour 0) and late night (hour 23)", () => {
        const pageviews = [
          createPageview(0),
          createPageview(23),
        ];

        const result = calculateHourlyCoverage(pageviews, [], fromDate, toDate);

        expect(result[0].totalPageviews).toBe(1);
        expect(result[23].totalPageviews).toBe(1);
      });
    });

    describe("pageviewsWithAgent", () => {
      it("counts pageviews that have an agent_id", () => {
        const pageviews = [
          createPageview(9, 0, true),
          createPageview(9, 0, true),
          createPageview(9, 0, false),
        ];

        const result = calculateHourlyCoverage(pageviews, [], fromDate, toDate);

        expect(result[9].pageviewsWithAgent).toBe(2);
      });

      it("returns 0 when all pageviews lack agents", () => {
        const pageviews = [
          createPageview(10, 0, false),
          createPageview(10, 0, false),
        ];

        const result = calculateHourlyCoverage(pageviews, [], fromDate, toDate);

        expect(result[10].pageviewsWithAgent).toBe(0);
      });

      it("counts 100% when all pageviews have agents", () => {
        const pageviews = [
          createPageview(11, 0, true),
          createPageview(11, 0, true),
          createPageview(11, 0, true),
        ];

        const result = calculateHourlyCoverage(pageviews, [], fromDate, toDate);

        expect(result[11].pageviewsWithAgent).toBe(3);
        expect(result[11].missedOpportunities).toBe(0);
      });
    });

    describe("missedOpportunities", () => {
      it("counts pageviews without agent_id as missed", () => {
        const pageviews = [
          createPageview(15, 0, false),
          createPageview(15, 0, false),
          createPageview(15, 0, true),
        ];

        const result = calculateHourlyCoverage(pageviews, [], fromDate, toDate);

        expect(result[15].missedOpportunities).toBe(2);
      });

      it("missedOpportunities + pageviewsWithAgent equals totalPageviews", () => {
        const pageviews = [
          createPageview(12, 0, true),
          createPageview(12, 0, false),
          createPageview(12, 0, true),
          createPageview(12, 0, false),
          createPageview(12, 0, false),
        ];

        const result = calculateHourlyCoverage(pageviews, [], fromDate, toDate);
        const hour12 = result[12];

        expect(hour12.pageviewsWithAgent + hour12.missedOpportunities).toBe(hour12.totalPageviews);
        expect(hour12.totalPageviews).toBe(5);
        expect(hour12.pageviewsWithAgent).toBe(2);
        expect(hour12.missedOpportunities).toBe(3);
      });
    });

    describe("avgAgentsOnline", () => {
      it("calculates average agents from sessions covering the hour", () => {
        const sessions = [
          createSession(9, 11), // Covers hours 9, 10, 11
        ];

        const result = calculateHourlyCoverage([], sessions, fromDate, toDate);

        // Session covers full hour 10 (60 minutes)
        // Average = 60 min / 60 min = 1 agent (with small floating point variance)
        expect(result[10].avgAgentsOnline).toBeCloseTo(1, 4);
      });

      it("averages multiple agents online at same hour", () => {
        const sessions = [
          createSession(10, 11),
          createSession(10, 11),
        ];

        const result = calculateHourlyCoverage([], sessions, fromDate, toDate);

        // Two sessions each covering full hour
        // Average = (60 + 60) / 60 = 2 agents (with small floating point variance)
        expect(result[10].avgAgentsOnline).toBeCloseTo(2, 4);
      });

      it("handles partial hour coverage", () => {
        const sessions = [
          {
            started_at: new Date(2024, 0, 1, 10, 30, 0).toISOString(),
            ended_at: new Date(2024, 0, 1, 10, 59, 59).toISOString(),
          },
        ];

        const result = calculateHourlyCoverage([], sessions, fromDate, toDate);

        // Session covers ~30 minutes of hour 10
        // Average ≈ 30 / 60 = 0.5 agents
        expect(result[10].avgAgentsOnline).toBeCloseTo(0.5, 1);
      });

      it("returns 0 when no sessions cover the hour", () => {
        const sessions = [
          createSession(14, 16),
        ];

        const result = calculateHourlyCoverage([], sessions, fromDate, toDate);

        expect(result[10].avgAgentsOnline).toBe(0);
        expect(result[14].avgAgentsOnline).toBeCloseTo(1, 4);
      });

      it("handles session with null ended_at (ongoing session)", () => {
        const sessions = [
          {
            started_at: new Date(2024, 0, 1, 10, 0, 0).toISOString(),
            ended_at: null,
          },
        ];

        // For ongoing sessions, end time defaults to now
        // This test verifies it doesn't crash
        const result = calculateHourlyCoverage([], sessions, fromDate, toDate);

        expect(result[10].avgAgentsOnline).toBeGreaterThanOrEqual(0);
      });
    });

    describe("multi-day date ranges", () => {
      it("calculates averages across multiple days", () => {
        const multiDayFrom = new Date(2024, 0, 1);
        const multiDayTo = new Date(2024, 0, 3); // 3 days

        const pageviews = [
          createPageview(10, 0, true),
          createPageview(10, 1, false),
          createPageview(10, 2, true),
        ];

        const result = calculateHourlyCoverage(pageviews, [], multiDayFrom, multiDayTo);

        expect(result[10].totalPageviews).toBe(3);
        expect(result[10].pageviewsWithAgent).toBe(2);
        expect(result[10].missedOpportunities).toBe(1);
      });

      it("averages agent coverage across multiple days", () => {
        const multiDayFrom = new Date(2024, 0, 1);
        const multiDayTo = new Date(2024, 0, 2); // 2 days

        const sessions = [
          createSession(10, 11, 0), // Day 1
          createSession(10, 11, 1), // Day 2
        ];

        const result = calculateHourlyCoverage([], sessions, multiDayFrom, multiDayTo);

        // Implementation uses ceil((toDate - fromDate) / day) which equals 1 for adjacent days
        // Two sessions each cover ~60 min, total = 120 min, divided by (60 * 1 day) = 2
        // This documents current behavior (not necessarily ideal averaging logic)
        expect(result[10].avgAgentsOnline).toBeCloseTo(2, 4);
      });
    });

    describe("edge cases", () => {
      it("handles empty pageviews array", () => {
        const result = calculateHourlyCoverage([], [], fromDate, toDate);

        expect(result.every(h => h.totalPageviews === 0)).toBe(true);
      });

      it("handles empty sessions array", () => {
        const pageviews = [createPageview(10)];

        const result = calculateHourlyCoverage(pageviews, [], fromDate, toDate);

        expect(result.every(h => h.avgAgentsOnline === 0)).toBe(true);
        expect(result[10].totalPageviews).toBe(1);
      });

      it("handles same start and end date (single day)", () => {
        const sameDay = new Date(2024, 0, 15);
        const pageviews = [
          { created_at: new Date(2024, 0, 15, 10, 30, 0).toISOString(), agent_id: "agent-123" },
        ];
        const sessions = [
          {
            started_at: new Date(2024, 0, 15, 9, 0, 0).toISOString(),
            ended_at: new Date(2024, 0, 15, 11, 59, 59).toISOString(),
          },
        ];

        const result = calculateHourlyCoverage(pageviews, sessions, sameDay, sameDay);

        expect(result[10].totalPageviews).toBe(1);
        expect(result[10].avgAgentsOnline).toBeCloseTo(1, 4);
      });
    });
  });

  describe("findProblemHours", () => {
    it("returns hours where missedOpportunities > pageviewsWithAgent", () => {
      const hourlyStats: HourlyStats[] = Array.from({ length: 24 }, (_, hour) => ({
        hour,
        totalPageviews: 0,
        pageviewsWithAgent: 0,
        missedOpportunities: 0,
        avgAgentsOnline: 0,
      }));

      // Hour 10: more missed than covered (problem)
      hourlyStats[10] = {
        hour: 10,
        totalPageviews: 10,
        pageviewsWithAgent: 3,
        missedOpportunities: 7,
        avgAgentsOnline: 0.5,
      };

      // Hour 14: equal covered and missed (not a problem by > definition)
      hourlyStats[14] = {
        hour: 14,
        totalPageviews: 10,
        pageviewsWithAgent: 5,
        missedOpportunities: 5,
        avgAgentsOnline: 1,
      };

      // Hour 16: more covered than missed (not a problem)
      hourlyStats[16] = {
        hour: 16,
        totalPageviews: 10,
        pageviewsWithAgent: 8,
        missedOpportunities: 2,
        avgAgentsOnline: 1.5,
      };

      const problemHours = findProblemHours(hourlyStats);

      expect(problemHours).toContain(10);
      expect(problemHours).not.toContain(14); // Equal, not greater
      expect(problemHours).not.toContain(16);
    });

    it("excludes hours with zero pageviews", () => {
      const hourlyStats: HourlyStats[] = Array.from({ length: 24 }, (_, hour) => ({
        hour,
        totalPageviews: 0,
        pageviewsWithAgent: 0,
        missedOpportunities: 0,
        avgAgentsOnline: 0,
      }));

      const problemHours = findProblemHours(hourlyStats);

      expect(problemHours).toHaveLength(0);
    });

    it("returns empty array when no problem hours exist", () => {
      const hourlyStats: HourlyStats[] = Array.from({ length: 24 }, (_, hour) => ({
        hour,
        totalPageviews: 10,
        pageviewsWithAgent: 8,
        missedOpportunities: 2,
        avgAgentsOnline: 1,
      }));

      const problemHours = findProblemHours(hourlyStats);

      expect(problemHours).toHaveLength(0);
    });

    it("returns multiple problem hours", () => {
      const hourlyStats: HourlyStats[] = Array.from({ length: 24 }, (_, hour) => ({
        hour,
        totalPageviews: hour >= 9 && hour <= 17 ? 10 : 0, // Business hours
        pageviewsWithAgent: 2,
        missedOpportunities: hour >= 9 && hour <= 17 ? 8 : 0, // All missed
        avgAgentsOnline: 0.2,
      }));

      const problemHours = findProblemHours(hourlyStats);

      // Hours 9-17 all have more missed than covered
      expect(problemHours.length).toBe(9);
      expect(problemHours).toContain(9);
      expect(problemHours).toContain(12);
      expect(problemHours).toContain(17);
    });

    it("identifies problem at specific hours of day", () => {
      const hourlyStats: HourlyStats[] = Array.from({ length: 24 }, (_, hour) => ({
        hour,
        totalPageviews: 10,
        pageviewsWithAgent: 8,
        missedOpportunities: 2,
        avgAgentsOnline: 1,
      }));

      // Make lunch hour problematic
      hourlyStats[12] = {
        hour: 12,
        totalPageviews: 20,
        pageviewsWithAgent: 5,
        missedOpportunities: 15,
        avgAgentsOnline: 0.5,
      };

      // Make early morning problematic
      hourlyStats[6] = {
        hour: 6,
        totalPageviews: 5,
        pageviewsWithAgent: 1,
        missedOpportunities: 4,
        avgAgentsOnline: 0.2,
      };

      const problemHours = findProblemHours(hourlyStats);

      expect(problemHours).toEqual([6, 12]);
    });
  });

  describe("calculateDailyHourlyCoverage", () => {
    const fromDate = new Date(2024, 0, 1); // Monday, Jan 1, 2024
    const toDate = new Date(2024, 0, 7);   // Sunday, Jan 7, 2024 (full week)

    describe("byDayHour grid structure", () => {
      it("returns 7x24 grid of DayHourStats", () => {
        const result = calculateDailyHourlyCoverage([], [], fromDate, toDate);

        expect(result.byDayHour).toHaveLength(7);
        result.byDayHour.forEach((day, dayIdx) => {
          expect(day).toHaveLength(24);
          day.forEach((hourStats, hourIdx) => {
            expect(hourStats.dayOfWeek).toBe(dayIdx);
            expect(hourStats.hour).toBe(hourIdx);
          });
        });
      });

      it("includes day names in stats", () => {
        const result = calculateDailyHourlyCoverage([], [], fromDate, toDate);

        expect(result.byDayHour[0][0].dayName).toBe("Sun");
        expect(result.byDayHour[1][0].dayName).toBe("Mon");
        expect(result.byDayHour[2][0].dayName).toBe("Tue");
        expect(result.byDayHour[3][0].dayName).toBe("Wed");
        expect(result.byDayHour[4][0].dayName).toBe("Thu");
        expect(result.byDayHour[5][0].dayName).toBe("Fri");
        expect(result.byDayHour[6][0].dayName).toBe("Sat");
      });

      it("initializes all cells with zero values", () => {
        const result = calculateDailyHourlyCoverage([], [], fromDate, toDate);

        result.byDayHour.forEach(day => {
          day.forEach(hourStats => {
            expect(hourStats.totalPageviews).toBe(0);
            expect(hourStats.pageviewsWithAgent).toBe(0);
            expect(hourStats.missedOpportunities).toBe(0);
            expect(hourStats.avgAgentsOnline).toBe(0);
            expect(hourStats.coverageGap).toBe(0);
          });
        });
      });
    });

    describe("byDayHour pageview counting", () => {
      it("groups pageviews by day of week and hour", () => {
        // January 1, 2024 is Monday (dayOfWeek = 1)
        const pageviews = [
          { created_at: new Date(2024, 0, 1, 10, 30).toISOString(), agent_id: "a" }, // Monday 10am
          { created_at: new Date(2024, 0, 2, 10, 30).toISOString(), agent_id: "a" }, // Tuesday 10am
          { created_at: new Date(2024, 0, 1, 14, 30).toISOString(), agent_id: null }, // Monday 2pm, no agent
        ];

        const result = calculateDailyHourlyCoverage(pageviews, [], fromDate, toDate);

        // Monday (index 1) at hour 10
        expect(result.byDayHour[1][10].totalPageviews).toBe(1);
        expect(result.byDayHour[1][10].pageviewsWithAgent).toBe(1);

        // Tuesday (index 2) at hour 10
        expect(result.byDayHour[2][10].totalPageviews).toBe(1);

        // Monday (index 1) at hour 14
        expect(result.byDayHour[1][14].totalPageviews).toBe(1);
        expect(result.byDayHour[1][14].missedOpportunities).toBe(1);
      });

      it("accumulates multiple pageviews in same day/hour slot", () => {
        const pageviews = [
          { created_at: new Date(2024, 0, 1, 10, 0).toISOString(), agent_id: "a" },
          { created_at: new Date(2024, 0, 1, 10, 15).toISOString(), agent_id: "a" },
          { created_at: new Date(2024, 0, 1, 10, 30).toISOString(), agent_id: null },
          { created_at: new Date(2024, 0, 1, 10, 45).toISOString(), agent_id: "a" },
        ];

        const result = calculateDailyHourlyCoverage(pageviews, [], fromDate, toDate);

        // Monday at hour 10
        const mondayHour10 = result.byDayHour[1][10];
        expect(mondayHour10.totalPageviews).toBe(4);
        expect(mondayHour10.pageviewsWithAgent).toBe(3);
        expect(mondayHour10.missedOpportunities).toBe(1);
      });
    });

    describe("byDayHour agent coverage", () => {
      it("calculates avgAgentsOnline from session overlaps", () => {
        const sessions = [
          {
            started_at: new Date(2024, 0, 1, 9, 0).toISOString(),  // Monday
            ended_at: new Date(2024, 0, 1, 17, 0).toISOString(),
          },
        ];

        const result = calculateDailyHourlyCoverage([], sessions, fromDate, toDate);

        // Monday (index 1) during work hours should show agent coverage
        expect(result.byDayHour[1][10].avgAgentsOnline).toBeGreaterThan(0);
        expect(result.byDayHour[1][20].avgAgentsOnline).toBe(0); // After session ended
      });

      it("averages agent coverage over multiple occurrences of same day", () => {
        // Two Mondays in range
        const twoWeekFrom = new Date(2024, 0, 1);
        const twoWeekTo = new Date(2024, 0, 14);

        const sessions = [
          {
            started_at: new Date(2024, 0, 1, 10, 0).toISOString(),  // First Monday
            ended_at: new Date(2024, 0, 1, 10, 59, 59).toISOString(),
          },
          {
            started_at: new Date(2024, 0, 8, 10, 0).toISOString(),  // Second Monday
            ended_at: new Date(2024, 0, 8, 10, 59, 59).toISOString(),
          },
        ];

        const result = calculateDailyHourlyCoverage([], sessions, twoWeekFrom, twoWeekTo);

        // Monday hour 10 should average 1 agent (each Monday had 1 agent)
        expect(result.byDayHour[1][10].avgAgentsOnline).toBeCloseTo(1, 0);
      });
    });

    describe("coverageGap calculation", () => {
      it("calculates coverageGap as missedOpportunities / totalPageviews", () => {
        const pageviews = [
          { created_at: new Date(2024, 0, 1, 10, 0).toISOString(), agent_id: null },
          { created_at: new Date(2024, 0, 1, 10, 15).toISOString(), agent_id: null },
          { created_at: new Date(2024, 0, 1, 10, 30).toISOString(), agent_id: "a" },
          { created_at: new Date(2024, 0, 1, 10, 45).toISOString(), agent_id: "a" },
        ];

        const result = calculateDailyHourlyCoverage(pageviews, [], fromDate, toDate);

        // 2 missed / 4 total = 0.5 coverage gap
        expect(result.byDayHour[1][10].coverageGap).toBe(0.5);
      });

      it("returns 0 coverageGap when no pageviews", () => {
        const result = calculateDailyHourlyCoverage([], [], fromDate, toDate);

        result.byDayHour.forEach(day => {
          day.forEach(hourStats => {
            expect(hourStats.coverageGap).toBe(0);
          });
        });
      });

      it("returns 0 coverageGap when all pageviews have agents", () => {
        const pageviews = [
          { created_at: new Date(2024, 0, 1, 10, 0).toISOString(), agent_id: "a" },
          { created_at: new Date(2024, 0, 1, 10, 15).toISOString(), agent_id: "b" },
        ];

        const result = calculateDailyHourlyCoverage(pageviews, [], fromDate, toDate);

        expect(result.byDayHour[1][10].coverageGap).toBe(0);
      });

      it("returns 1 coverageGap when no pageviews have agents", () => {
        const pageviews = [
          { created_at: new Date(2024, 0, 1, 10, 0).toISOString(), agent_id: null },
          { created_at: new Date(2024, 0, 1, 10, 15).toISOString(), agent_id: null },
        ];

        const result = calculateDailyHourlyCoverage(pageviews, [], fromDate, toDate);

        expect(result.byDayHour[1][10].coverageGap).toBe(1);
      });
    });

    describe("byDayOfWeek aggregation", () => {
      it("returns 7 DayOfWeekStats objects", () => {
        const result = calculateDailyHourlyCoverage([], [], fromDate, toDate);

        expect(result.byDayOfWeek).toHaveLength(7);
      });

      it("aggregates all hours into day totals", () => {
        const pageviews = [
          { created_at: new Date(2024, 0, 1, 9, 0).toISOString(), agent_id: "a" },  // Monday 9am
          { created_at: new Date(2024, 0, 1, 10, 0).toISOString(), agent_id: "a" }, // Monday 10am
          { created_at: new Date(2024, 0, 1, 14, 0).toISOString(), agent_id: null }, // Monday 2pm
        ];

        const result = calculateDailyHourlyCoverage(pageviews, [], fromDate, toDate);

        const monday = result.byDayOfWeek[1];
        expect(monday.totalPageviews).toBe(3);
        expect(monday.pageviewsWithAgent).toBe(2);
        expect(monday.missedOpportunities).toBe(1);
      });

      it("calculates coverageRate as percentage", () => {
        const pageviews = [
          { created_at: new Date(2024, 0, 1, 10, 0).toISOString(), agent_id: "a" },
          { created_at: new Date(2024, 0, 1, 11, 0).toISOString(), agent_id: "a" },
          { created_at: new Date(2024, 0, 1, 12, 0).toISOString(), agent_id: "a" },
          { created_at: new Date(2024, 0, 1, 13, 0).toISOString(), agent_id: null },
        ];

        const result = calculateDailyHourlyCoverage(pageviews, [], fromDate, toDate);

        // Monday: 3/4 = 75%
        expect(result.byDayOfWeek[1].coverageRate).toBe(75);
      });

      it("returns 100% coverageRate when no pageviews", () => {
        const result = calculateDailyHourlyCoverage([], [], fromDate, toDate);

        result.byDayOfWeek.forEach(day => {
          expect(day.coverageRate).toBe(100);
        });
      });

      it("includes correct day names", () => {
        const result = calculateDailyHourlyCoverage([], [], fromDate, toDate);

        expect(result.byDayOfWeek[0].dayName).toBe("Sun");
        expect(result.byDayOfWeek[1].dayName).toBe("Mon");
        expect(result.byDayOfWeek[6].dayName).toBe("Sat");
      });

      it("includes correct dayOfWeek indices", () => {
        const result = calculateDailyHourlyCoverage([], [], fromDate, toDate);

        result.byDayOfWeek.forEach((day, idx) => {
          expect(day.dayOfWeek).toBe(idx);
        });
      });
    });

    describe("edge cases", () => {
      it("handles single day range", () => {
        const singleDay = new Date(2024, 0, 1); // Monday
        const pageviews = [
          { created_at: new Date(2024, 0, 1, 10, 0).toISOString(), agent_id: "a" },
        ];

        const result = calculateDailyHourlyCoverage(pageviews, [], singleDay, singleDay);

        expect(result.byDayHour[1][10].totalPageviews).toBe(1);
        expect(result.byDayOfWeek[1].totalPageviews).toBe(1);
      });

      it("handles date range not starting on Sunday", () => {
        // Wednesday to Saturday
        const wedDate = new Date(2024, 0, 3);  // Wednesday
        const satDate = new Date(2024, 0, 6);  // Saturday

        const pageviews = [
          { created_at: new Date(2024, 0, 4, 10, 0).toISOString(), agent_id: "a" }, // Thursday
        ];

        const result = calculateDailyHourlyCoverage(pageviews, [], wedDate, satDate);

        // Thursday is index 4
        expect(result.byDayOfWeek[4].totalPageviews).toBe(1);
        // Other days should be 0
        expect(result.byDayOfWeek[0].totalPageviews).toBe(0); // Sunday
        expect(result.byDayOfWeek[1].totalPageviews).toBe(0); // Monday
      });

      it("handles sessions with null ended_at", () => {
        const sessions = [
          {
            started_at: new Date(2024, 0, 1, 10, 0).toISOString(),
            ended_at: null,
          },
        ];

        // Should not throw
        const result = calculateDailyHourlyCoverage([], sessions, fromDate, toDate);

        expect(result.byDayHour).toHaveLength(7);
      });

      it("handles empty data arrays", () => {
        const result = calculateDailyHourlyCoverage([], [], fromDate, toDate);

        expect(result.byDayHour).toHaveLength(7);
        expect(result.byDayOfWeek).toHaveLength(7);
        
        // All should be zero/default
        result.byDayOfWeek.forEach(day => {
          expect(day.totalPageviews).toBe(0);
          expect(day.coverageRate).toBe(100);
        });
      });
    });
  });
});
