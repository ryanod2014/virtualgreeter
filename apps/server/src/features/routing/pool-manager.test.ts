import { describe, it, expect, beforeEach } from "vitest";
import { PoolManager } from "./pool-manager.js";
import type { AgentProfile } from "@ghost-greeter/domain";

function createMockAgentProfile(id: string, name: string): AgentProfile {
  return {
    id,
    userId: `user_${id}`,
    displayName: name,
    avatarUrl: null,
    waveVideoUrl: null,
    introVideoUrl: "",
    connectVideoUrl: null,
    loopVideoUrl: "",
    status: "idle",
    maxSimultaneousSimulations: 10,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

describe("PoolManager", () => {
  let poolManager: PoolManager;

  beforeEach(() => {
    poolManager = new PoolManager();
  });

  describe("Fair Round-Robin Agent Selection", () => {
    it("should distribute visitors evenly across idle agents", () => {
      // Register 5 agents
      const agents = ["agent1", "agent2", "agent3", "agent4", "agent5"];
      agents.forEach((id, index) => {
        poolManager.registerAgent(`socket_${id}`, createMockAgentProfile(id, `Agent ${index + 1}`));
      });

      // Track which agents get assigned
      const assignments: string[] = [];

      // Register 5 visitors sequentially
      for (let i = 0; i < 5; i++) {
        const visitorId = `visitor_${i}`;
        poolManager.registerVisitor(`socket_visitor_${i}`, visitorId, "site1", "/");

        const bestAgent = poolManager.findBestAgent();
        expect(bestAgent).toBeDefined();

        poolManager.assignVisitorToAgent(visitorId, bestAgent!.agentId);
        assignments.push(bestAgent!.agentId);
      }

      // Each agent should have been assigned exactly once
      const uniqueAssignments = new Set(assignments);
      expect(uniqueAssignments.size).toBe(5);
      expect(assignments).toHaveLength(5);

      // Verify each agent got 1 visitor
      agents.forEach((agentId) => {
        const agent = poolManager.getAgent(agentId);
        expect(agent?.currentSimulations).toHaveLength(1);
      });
    });

    it("should maintain consistent round-robin order across rounds", () => {
      // Register 3 agents
      poolManager.registerAgent("socket_a", createMockAgentProfile("agentA", "Agent A"));
      poolManager.registerAgent("socket_b", createMockAgentProfile("agentB", "Agent B"));
      poolManager.registerAgent("socket_c", createMockAgentProfile("agentC", "Agent C"));

      // First round: assign 3 visitors
      const firstRoundAssignments: string[] = [];
      for (let i = 0; i < 3; i++) {
        const visitorId = `visitor_round1_${i}`;
        poolManager.registerVisitor(`socket_v1_${i}`, visitorId, "site1", "/");
        const agent = poolManager.findBestAgent();
        poolManager.assignVisitorToAgent(visitorId, agent!.agentId);
        firstRoundAssignments.push(agent!.agentId);
      }

      // All 3 agents should have been used
      expect(new Set(firstRoundAssignments).size).toBe(3);

      // Now unregister all visitors (simulating them leaving)
      for (let i = 0; i < 3; i++) {
        poolManager.unregisterVisitor(`visitor_round1_${i}`);
      }

      // Second round: should follow the same consistent order (true round-robin)
      const secondRoundAssignments: string[] = [];
      for (let i = 0; i < 3; i++) {
        const visitorId = `visitor_round2_${i}`;
        poolManager.registerVisitor(`socket_v2_${i}`, visitorId, "site1", "/");
        const agent = poolManager.findBestAgent();
        poolManager.assignVisitorToAgent(visitorId, agent!.agentId);
        secondRoundAssignments.push(agent!.agentId);
      }

      // Round-robin should give same consistent order each round
      // This ensures fairness - each agent gets equal traffic over time
      expect(secondRoundAssignments).toEqual(firstRoundAssignments);
    });

    it("should fairly rotate through agents with low traffic (1 visitor at a time)", () => {
      // Simulate low traffic scenario: 1 visitor at a time, 10 agents
      const agentIds = Array.from({ length: 10 }, (_, i) => `agent_${i}`);
      agentIds.forEach((id, index) => {
        poolManager.registerAgent(`socket_${id}`, createMockAgentProfile(id, `Agent ${index}`));
      });

      const assignmentOrder: string[] = [];

      // Simulate 20 sequential visitors (each leaves before next arrives)
      for (let i = 0; i < 20; i++) {
        const visitorId = `visitor_${i}`;
        poolManager.registerVisitor(`socket_v_${i}`, visitorId, "site1", "/");

        const agent = poolManager.findBestAgent();
        expect(agent).toBeDefined();

        poolManager.assignVisitorToAgent(visitorId, agent!.agentId);
        assignmentOrder.push(agent!.agentId);

        // Visitor leaves immediately
        poolManager.unregisterVisitor(visitorId);
      }

      // Count how many times each agent was assigned
      const counts = new Map<string, number>();
      assignmentOrder.forEach((id) => {
        counts.set(id, (counts.get(id) || 0) + 1);
      });

      // Each agent should be assigned exactly 2 times (20 visitors / 10 agents)
      agentIds.forEach((agentId) => {
        expect(counts.get(agentId)).toBe(2);
      });
    });
  });

  describe("Least Connections Load Balancing", () => {
    it("should prefer agent with lowest load when none are idle", () => {
      // Register 2 agents
      poolManager.registerAgent("socket_a", createMockAgentProfile("agentA", "Agent A"));
      poolManager.registerAgent("socket_b", createMockAgentProfile("agentB", "Agent B"));

      // Give agentA 3 visitors
      for (let i = 0; i < 3; i++) {
        const visitorId = `visitor_a_${i}`;
        poolManager.registerVisitor(`socket_va_${i}`, visitorId, "site1", "/");
        poolManager.assignVisitorToAgent(visitorId, "agentA");
      }

      // Give agentB 1 visitor
      poolManager.registerVisitor("socket_vb_0", "visitor_b_0", "site1", "/");
      poolManager.assignVisitorToAgent("visitor_b_0", "agentB");

      // Next visitor should go to agentB (lower load)
      poolManager.registerVisitor("socket_new", "visitor_new", "site1", "/");
      const bestAgent = poolManager.findBestAgent();

      expect(bestAgent?.agentId).toBe("agentB");
    });
  });

  describe("Agent Status Filtering", () => {
    it("should skip agents who are in_call", () => {
      poolManager.registerAgent("socket_a", createMockAgentProfile("agentA", "Agent A"));
      poolManager.registerAgent("socket_b", createMockAgentProfile("agentB", "Agent B"));

      // Put agentA in a call
      poolManager.setAgentInCall("agentA", "some_visitor");

      // New visitor should only get agentB
      const bestAgent = poolManager.findBestAgent();
      expect(bestAgent?.agentId).toBe("agentB");
    });

    it("should skip agents who are offline", () => {
      poolManager.registerAgent("socket_a", createMockAgentProfile("agentA", "Agent A"));
      poolManager.registerAgent("socket_b", createMockAgentProfile("agentB", "Agent B"));

      // Set agentA offline
      poolManager.updateAgentStatus("agentA", "offline");

      const bestAgent = poolManager.findBestAgent();
      expect(bestAgent?.agentId).toBe("agentB");
    });

    it("should return undefined when all agents are unavailable", () => {
      poolManager.registerAgent("socket_a", createMockAgentProfile("agentA", "Agent A"));

      // Put the only agent in a call
      poolManager.setAgentInCall("agentA", "some_visitor");

      const bestAgent = poolManager.findBestAgent();
      expect(bestAgent).toBeUndefined();
    });
  });

  describe("findBestAgentForVisitor with busy agent rerouting", () => {
    it("should find alternative agent when preferred agent is in_call", () => {
      // Setup site config with a pool
      poolManager.setSiteConfig("site1", "pool1", []);

      // Register 2 agents in the pool
      poolManager.registerAgent("socket_a", createMockAgentProfile("agentA", "Agent A"));
      poolManager.registerAgent("socket_b", createMockAgentProfile("agentB", "Agent B"));
      poolManager.addAgentToPool("agentA", "pool1");
      poolManager.addAgentToPool("agentB", "pool1");

      // Put agentA in a call
      poolManager.setAgentInCall("agentA", "visitor_in_call");

      // findBestAgentForVisitor should return agentB
      const agent = poolManager.findBestAgentForVisitor("site1", "/some-page");
      expect(agent?.agentId).toBe("agentB");
    });

    it("should return undefined when all agents in pool are busy", () => {
      poolManager.setSiteConfig("site1", "pool1", []);

      poolManager.registerAgent("socket_a", createMockAgentProfile("agentA", "Agent A"));
      poolManager.addAgentToPool("agentA", "pool1");

      // Put the only agent in a call
      poolManager.setAgentInCall("agentA", "visitor_in_call");

      // Should fall back to finding any agent, but none available
      const agent = poolManager.findBestAgentForVisitor("site1", "/some-page");
      expect(agent).toBeUndefined();
    });
  });

  describe("Max Simultaneous Simulations", () => {
    it("should skip agents at capacity", () => {
      // Create agent with max 2 simulations
      const profile = createMockAgentProfile("agentA", "Agent A");
      profile.maxSimultaneousSimulations = 2;
      poolManager.registerAgent("socket_a", profile);

      poolManager.registerAgent("socket_b", createMockAgentProfile("agentB", "Agent B"));

      // Give agentA 2 visitors (at capacity)
      poolManager.registerVisitor("socket_v1", "v1", "site1", "/");
      poolManager.assignVisitorToAgent("v1", "agentA");
      poolManager.registerVisitor("socket_v2", "v2", "site1", "/");
      poolManager.assignVisitorToAgent("v2", "agentA");

      // Next visitor should go to agentB since agentA is at capacity
      const bestAgent = poolManager.findBestAgent();
      expect(bestAgent?.agentId).toBe("agentB");
    });
  });

  describe("Call Queue Management", () => {
    it("should return waiting requests in FIFO order", () => {
      poolManager.registerAgent("socket_a", createMockAgentProfile("agentA", "Agent A"));

      // Create 3 call requests at different times
      poolManager.registerVisitor("socket_v1", "visitor1", "site1", "/");
      const req1 = poolManager.createCallRequest("visitor1", "agentA", "site1", "/");

      poolManager.registerVisitor("socket_v2", "visitor2", "site1", "/");
      const req2 = poolManager.createCallRequest("visitor2", "agentA", "site1", "/");

      poolManager.registerVisitor("socket_v3", "visitor3", "site1", "/");
      const req3 = poolManager.createCallRequest("visitor3", "agentA", "site1", "/");

      // Get waiting requests - should be in order
      const waiting = poolManager.getWaitingRequestsForAgent("agentA");
      expect(waiting).toHaveLength(3);
      expect(waiting[0]!.requestId).toBe(req1.requestId);
      expect(waiting[1]!.requestId).toBe(req2.requestId);
      expect(waiting[2]!.requestId).toBe(req3.requestId);

      // Next waiting should be the oldest
      const next = poolManager.getNextWaitingRequest("agentA");
      expect(next?.requestId).toBe(req1.requestId);
    });
  });
});

