import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
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
        poolManager.registerVisitor(`socket_visitor_${i}`, visitorId, "org1", "/");

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
        poolManager.registerVisitor(`socket_v1_${i}`, visitorId, "org1", "/");
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
        poolManager.registerVisitor(`socket_v2_${i}`, visitorId, "org1", "/");
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
        poolManager.registerVisitor(`socket_v_${i}`, visitorId, "org1", "/");

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
        poolManager.registerVisitor(`socket_va_${i}`, visitorId, "org1", "/");
        poolManager.assignVisitorToAgent(visitorId, "agentA");
      }

      // Give agentB 1 visitor
      poolManager.registerVisitor("socket_vb_0", "visitor_b_0", "org1", "/");
      poolManager.assignVisitorToAgent("visitor_b_0", "agentB");

      // Next visitor should go to agentB (lower load)
      poolManager.registerVisitor("socket_new", "visitor_new", "org1", "/");
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

    it("should skip agents who are away", () => {
      poolManager.registerAgent("socket_a", createMockAgentProfile("agentA", "Agent A"));
      poolManager.registerAgent("socket_b", createMockAgentProfile("agentB", "Agent B"));

      // Set agentA away (e.g., from RNA timeout)
      poolManager.updateAgentStatus("agentA", "away");

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

    it("should return undefined when all agents are away", () => {
      poolManager.registerAgent("socket_a", createMockAgentProfile("agentA", "Agent A"));
      poolManager.registerAgent("socket_b", createMockAgentProfile("agentB", "Agent B"));

      // Set both agents away
      poolManager.updateAgentStatus("agentA", "away");
      poolManager.updateAgentStatus("agentB", "away");

      const bestAgent = poolManager.findBestAgent();
      expect(bestAgent).toBeUndefined();
    });
  });

  describe("findBestAgentForVisitor with busy agent rerouting", () => {
    it("should find alternative agent when preferred agent is in_call", () => {
      // Setup site config with a pool
      poolManager.setOrgConfig("org1", "pool1", []);

      // Register 2 agents in the pool
      poolManager.registerAgent("socket_a", createMockAgentProfile("agentA", "Agent A"));
      poolManager.registerAgent("socket_b", createMockAgentProfile("agentB", "Agent B"));
      poolManager.addAgentToPool("agentA", "pool1");
      poolManager.addAgentToPool("agentB", "pool1");

      // Put agentA in a call
      poolManager.setAgentInCall("agentA", "visitor_in_call");

      // findBestAgentForVisitor should return agentB
      const result = poolManager.findBestAgentForVisitor("org1", "/some-page");
      expect(result?.agent.agentId).toBe("agentB");
      expect(result?.poolId).toBe("pool1");
    });

    it("should return undefined when all agents in pool are busy", () => {
      poolManager.setOrgConfig("org1", "pool1", []);

      poolManager.registerAgent("socket_a", createMockAgentProfile("agentA", "Agent A"));
      poolManager.addAgentToPool("agentA", "pool1");

      // Put the only agent in a call
      poolManager.setAgentInCall("agentA", "visitor_in_call");

      // Should fall back to finding any agent, but none available
      const result = poolManager.findBestAgentForVisitor("org1", "/some-page");
      expect(result).toBeUndefined();
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
      poolManager.registerVisitor("socket_v1", "v1", "org1", "/");
      poolManager.assignVisitorToAgent("v1", "agentA");
      poolManager.registerVisitor("socket_v2", "v2", "org1", "/");
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
      poolManager.registerVisitor("socket_v1", "visitor1", "org1", "/");
      const req1 = poolManager.createCallRequest("visitor1", "agentA", "org1", "/");

      poolManager.registerVisitor("socket_v2", "visitor2", "org1", "/");
      const req2 = poolManager.createCallRequest("visitor2", "agentA", "org1", "/");

      poolManager.registerVisitor("socket_v3", "visitor3", "org1", "/");
      const req3 = poolManager.createCallRequest("visitor3", "agentA", "org1", "/");

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

  describe("Call Reconnection", () => {
    it("should re-establish call state via reconnectVisitorToCall", () => {
      poolManager.registerAgent("socket_a", createMockAgentProfile("agentA", "Agent A"));
      poolManager.registerVisitor("socket_v", "visitor1", "org1", "/page");

      const reconnectedCall = poolManager.reconnectVisitorToCall("visitor1", "agentA", "reconnect_call_123");

      expect(reconnectedCall).toBeDefined();
      expect(reconnectedCall?.callId).toBe("reconnect_call_123");
      expect(reconnectedCall?.visitorId).toBe("visitor1");
      expect(reconnectedCall?.agentId).toBe("agentA");
    });

    it("should update visitor state to in_call on reconnect", () => {
      poolManager.registerAgent("socket_a", createMockAgentProfile("agentA", "Agent A"));
      poolManager.registerVisitor("socket_v", "visitor1", "org1", "/page");

      poolManager.reconnectVisitorToCall("visitor1", "agentA", "reconnect_call_123");

      const visitor = poolManager.getVisitor("visitor1");
      expect(visitor?.state).toBe("in_call");
      expect(visitor?.assignedAgentId).toBe("agentA");
    });

    it("should set agent status to in_call on reconnect", () => {
      poolManager.registerAgent("socket_a", createMockAgentProfile("agentA", "Agent A"));
      poolManager.registerVisitor("socket_v", "visitor1", "org1", "/page");

      poolManager.reconnectVisitorToCall("visitor1", "agentA", "reconnect_call_123");

      const agent = poolManager.getAgent("agentA");
      expect(agent?.profile.status).toBe("in_call");
      expect(agent?.currentCallVisitorId).toBe("visitor1");
    });

    it("should remove existing active call when reconnecting", () => {
      poolManager.registerAgent("socket_a", createMockAgentProfile("agentA", "Agent A"));
      poolManager.registerVisitor("socket_v", "visitor1", "org1", "/page");

      // Create an initial call
      const request = poolManager.createCallRequest("visitor1", "agentA", "org1", "/page");
      const initialCall = poolManager.acceptCall(request.requestId);
      expect(initialCall).toBeDefined();

      // Reconnect with a new call ID
      poolManager.reconnectVisitorToCall("visitor1", "agentA", "new_reconnect_call");

      // Old call should be gone
      const oldCall = poolManager.getActiveCall(initialCall!.callId);
      expect(oldCall).toBeUndefined();

      // New call should exist
      const newCall = poolManager.getActiveCall("new_reconnect_call");
      expect(newCall).toBeDefined();
    });

    it("should return undefined when visitor not found", () => {
      poolManager.registerAgent("socket_a", createMockAgentProfile("agentA", "Agent A"));

      const result = poolManager.reconnectVisitorToCall("nonexistent", "agentA", "call_123");

      expect(result).toBeUndefined();
    });

    it("should return undefined when agent not found", () => {
      poolManager.registerVisitor("socket_v", "visitor1", "org1", "/page");

      const result = poolManager.reconnectVisitorToCall("visitor1", "nonexistent", "call_123");

      expect(result).toBeUndefined();
    });
  });

  describe("Agent Staleness Detection", () => {
    it("should detect stale idle agents based on lastActivityAt threshold", () => {
      vi.useFakeTimers();

      poolManager.registerAgent("socket_a", createMockAgentProfile("agentA", "Agent A"));
      poolManager.registerAgent("socket_b", createMockAgentProfile("agentB", "Agent B"));

      // Advance time past threshold
      vi.advanceTimersByTime(130000); // 130 seconds

      // Keep agentB active
      poolManager.updateAgentActivity("agentB");

      const staleAgents = poolManager.getStaleAgents(120000); // 2 minute threshold

      expect(staleAgents).toHaveLength(1);
      expect(staleAgents[0]?.agentId).toBe("agentA");

      vi.useRealTimers();
    });

    it("should not mark agents in_call as stale", () => {
      vi.useFakeTimers();

      poolManager.registerAgent("socket_a", createMockAgentProfile("agentA", "Agent A"));
      poolManager.setAgentInCall("agentA", "visitor1");

      vi.advanceTimersByTime(130000); // Past threshold

      const staleAgents = poolManager.getStaleAgents(120000);

      expect(staleAgents).toHaveLength(0);

      vi.useRealTimers();
    });

    it("should not mark agents already away as stale", () => {
      vi.useFakeTimers();

      const awayProfile = createMockAgentProfile("agentA", "Agent A");
      awayProfile.status = "away";
      poolManager.registerAgent("socket_a", awayProfile);

      vi.advanceTimersByTime(130000);

      const staleAgents = poolManager.getStaleAgents(120000);

      expect(staleAgents).toHaveLength(0);

      vi.useRealTimers();
    });

    it("should return empty array when all agents are active", () => {
      vi.useFakeTimers();

      poolManager.registerAgent("socket_a", createMockAgentProfile("agentA", "Agent A"));
      poolManager.registerAgent("socket_b", createMockAgentProfile("agentB", "Agent B"));

      vi.advanceTimersByTime(60000); // 60 seconds - under threshold

      // Keep both active
      poolManager.updateAgentActivity("agentA");
      poolManager.updateAgentActivity("agentB");

      const staleAgents = poolManager.getStaleAgents(120000);

      expect(staleAgents).toHaveLength(0);

      vi.useRealTimers();
    });
  });

  describe("Agent Rerouting on Rejection", () => {
    it("should exclude rejecting agent when finding alternative", () => {
      poolManager.setOrgConfig("org1", "pool1", []);

      poolManager.registerAgent("socket_a", createMockAgentProfile("agentA", "Agent A"));
      poolManager.registerAgent("socket_b", createMockAgentProfile("agentB", "Agent B"));
      poolManager.addAgentToPool("agentA", "pool1");
      poolManager.addAgentToPool("agentB", "pool1");

      // Find agent while excluding agentA (simulating post-rejection reroute)
      const result = poolManager.findBestAgentForVisitor("org1", "/page", "agentA");

      expect(result?.agent.agentId).toBe("agentB");
    });

    it("should return undefined when only the excluded agent is available", () => {
      poolManager.setOrgConfig("org1", "pool1", []);

      poolManager.registerAgent("socket_a", createMockAgentProfile("agentA", "Agent A"));
      poolManager.addAgentToPool("agentA", "pool1");

      const result = poolManager.findBestAgentForVisitor("org1", "/page", "agentA");

      expect(result).toBeUndefined();
    });
  });

  describe("Tiered Routing - getAgentPriorityInPool", () => {
    it("should return agent's priority rank for a specific pool", () => {
      poolManager.registerAgent("socket_a", createMockAgentProfile("agentA", "Agent A"));
      
      // Add agent to pool with priority rank 2
      poolManager.addAgentToPool("agentA", "pool1", 2);
      
      const priority = poolManager.getAgentPriorityInPool("agentA", "pool1");
      expect(priority).toBe(2);
    });

    it("should return 1 (default) if agent is not in the pool", () => {
      poolManager.registerAgent("socket_a", createMockAgentProfile("agentA", "Agent A"));
      
      // Agent is not added to any pool
      const priority = poolManager.getAgentPriorityInPool("agentA", "nonexistent_pool");
      expect(priority).toBe(1);
    });

    it("should return different priorities for the same agent in different pools", () => {
      poolManager.registerAgent("socket_a", createMockAgentProfile("agentA", "Agent A"));
      
      // Add agent to multiple pools with different priorities
      poolManager.addAgentToPool("agentA", "pool1", 1); // Primary in pool1
      poolManager.addAgentToPool("agentA", "pool2", 3); // Backup in pool2
      
      expect(poolManager.getAgentPriorityInPool("agentA", "pool1")).toBe(1);
      expect(poolManager.getAgentPriorityInPool("agentA", "pool2")).toBe(3);
    });

    it("should update priority when setAgentPoolMemberships is called", () => {
      poolManager.registerAgent("socket_a", createMockAgentProfile("agentA", "Agent A"));
      
      // Initially add to pool with priority 1
      poolManager.addAgentToPool("agentA", "pool1", 1);
      expect(poolManager.getAgentPriorityInPool("agentA", "pool1")).toBe(1);
      
      // Update memberships with new priority
      poolManager.setAgentPoolMemberships("agentA", [
        { poolId: "pool1", priorityRank: 2 }
      ]);
      
      expect(poolManager.getAgentPriorityInPool("agentA", "pool1")).toBe(2);
    });
  });

  describe("Tiered Routing - findBestAgent priority ordering", () => {
    it("should group agents by priority and try tier 1 (Primary) first", () => {
      poolManager.setOrgConfig("org1", "pool1", []);
      
      // Register agents
      poolManager.registerAgent("socket_a", createMockAgentProfile("agentA", "Agent A"));
      poolManager.registerAgent("socket_b", createMockAgentProfile("agentB", "Agent B"));
      poolManager.registerAgent("socket_c", createMockAgentProfile("agentC", "Agent C"));
      
      // Add agents to pool with different priorities
      poolManager.addAgentToPool("agentA", "pool1", 3); // Backup
      poolManager.addAgentToPool("agentB", "pool1", 1); // Primary
      poolManager.addAgentToPool("agentC", "pool1", 2); // Standard
      
      // Find best agent - should get Primary (tier 1) first
      const result = poolManager.findBestAgent("pool1");
      expect(result?.agentId).toBe("agentB");
    });

    it("should fall through to tier 2 when tier 1 agents are at capacity", () => {
      poolManager.setOrgConfig("org1", "pool1", []);
      
      // Create agent with max 1 simulation
      const primaryProfile = createMockAgentProfile("agentPrimary", "Primary Agent");
      primaryProfile.maxSimultaneousSimulations = 1;
      poolManager.registerAgent("socket_primary", primaryProfile);
      
      poolManager.registerAgent("socket_standard", createMockAgentProfile("agentStandard", "Standard Agent"));
      
      // Add agents to pool with different priorities
      poolManager.addAgentToPool("agentPrimary", "pool1", 1);  // Primary - will be at capacity
      poolManager.addAgentToPool("agentStandard", "pool1", 2); // Standard - overflow
      
      // Assign visitor to primary agent (now at capacity)
      poolManager.registerVisitor("socket_v1", "visitor1", "org1", "/");
      poolManager.assignVisitorToAgent("visitor1", "agentPrimary");
      
      // Next visitor should go to Standard tier since Primary is at capacity
      const result = poolManager.findBestAgent("pool1");
      expect(result?.agentId).toBe("agentStandard");
    });

    it("should fall through to tier 3 when tiers 1 and 2 are at capacity", () => {
      poolManager.setOrgConfig("org1", "pool1", []);
      
      // Create agents with max 1 simulation each
      const primaryProfile = createMockAgentProfile("agentPrimary", "Primary");
      primaryProfile.maxSimultaneousSimulations = 1;
      
      const standardProfile = createMockAgentProfile("agentStandard", "Standard");
      standardProfile.maxSimultaneousSimulations = 1;
      
      poolManager.registerAgent("socket_primary", primaryProfile);
      poolManager.registerAgent("socket_standard", standardProfile);
      poolManager.registerAgent("socket_backup", createMockAgentProfile("agentBackup", "Backup"));
      
      // Add agents with tiered priorities
      poolManager.addAgentToPool("agentPrimary", "pool1", 1);
      poolManager.addAgentToPool("agentStandard", "pool1", 2);
      poolManager.addAgentToPool("agentBackup", "pool1", 3);
      
      // Fill up tier 1 and tier 2
      poolManager.registerVisitor("socket_v1", "visitor1", "org1", "/");
      poolManager.assignVisitorToAgent("visitor1", "agentPrimary");
      poolManager.registerVisitor("socket_v2", "visitor2", "org1", "/");
      poolManager.assignVisitorToAgent("visitor2", "agentStandard");
      
      // Next visitor should go to Backup tier
      const result = poolManager.findBestAgent("pool1");
      expect(result?.agentId).toBe("agentBackup");
    });

    it("should return undefined when all tiers are at capacity", () => {
      poolManager.setOrgConfig("org1", "pool1", []);
      
      // Create agents with max 1 simulation each
      const primaryProfile = createMockAgentProfile("agentPrimary", "Primary");
      primaryProfile.maxSimultaneousSimulations = 1;
      
      const standardProfile = createMockAgentProfile("agentStandard", "Standard");
      standardProfile.maxSimultaneousSimulations = 1;
      
      poolManager.registerAgent("socket_primary", primaryProfile);
      poolManager.registerAgent("socket_standard", standardProfile);
      
      poolManager.addAgentToPool("agentPrimary", "pool1", 1);
      poolManager.addAgentToPool("agentStandard", "pool1", 2);
      
      // Fill up all tiers
      poolManager.registerVisitor("socket_v1", "visitor1", "org1", "/");
      poolManager.assignVisitorToAgent("visitor1", "agentPrimary");
      poolManager.registerVisitor("socket_v2", "visitor2", "org1", "/");
      poolManager.assignVisitorToAgent("visitor2", "agentStandard");
      
      // No agent should be available
      const result = poolManager.findBestAgent("pool1");
      expect(result).toBeUndefined();
    });

    it("should use round-robin within the same tier", () => {
      poolManager.setOrgConfig("org1", "pool1", []);
      
      // Register 3 agents all at tier 1 (Primary)
      poolManager.registerAgent("socket_a", createMockAgentProfile("agentA", "Agent A"));
      poolManager.registerAgent("socket_b", createMockAgentProfile("agentB", "Agent B"));
      poolManager.registerAgent("socket_c", createMockAgentProfile("agentC", "Agent C"));
      
      poolManager.addAgentToPool("agentA", "pool1", 1);
      poolManager.addAgentToPool("agentB", "pool1", 1);
      poolManager.addAgentToPool("agentC", "pool1", 1);
      
      // Assign 3 visitors - should distribute across all tier 1 agents
      const assignments: string[] = [];
      for (let i = 0; i < 3; i++) {
        const visitorId = `visitor_${i}`;
        poolManager.registerVisitor(`socket_v${i}`, visitorId, "org1", "/");
        const agent = poolManager.findBestAgent("pool1");
        expect(agent).toBeDefined();
        poolManager.assignVisitorToAgent(visitorId, agent!.agentId);
        assignments.push(agent!.agentId);
      }
      
      // All 3 agents in tier 1 should have received visitors (round-robin)
      const uniqueAssignments = new Set(assignments);
      expect(uniqueAssignments.size).toBe(3);
    });

    it("should skip unavailable agents in higher tiers before falling through", () => {
      poolManager.setOrgConfig("org1", "pool1", []);
      
      poolManager.registerAgent("socket_primary", createMockAgentProfile("agentPrimary", "Primary"));
      poolManager.registerAgent("socket_standard", createMockAgentProfile("agentStandard", "Standard"));
      
      poolManager.addAgentToPool("agentPrimary", "pool1", 1);
      poolManager.addAgentToPool("agentStandard", "pool1", 2);
      
      // Set primary agent as away
      poolManager.updateAgentStatus("agentPrimary", "away");
      
      // Should fall through to Standard tier
      const result = poolManager.findBestAgent("pool1");
      expect(result?.agentId).toBe("agentStandard");
    });

    it("should handle agents in multiple pools with different priorities correctly", () => {
      poolManager.setOrgConfig("org1", "pool1", []);
      poolManager.setOrgConfig("org1", "pool2", []);
      
      poolManager.registerAgent("socket_a", createMockAgentProfile("agentA", "Agent A"));
      poolManager.registerAgent("socket_b", createMockAgentProfile("agentB", "Agent B"));
      
      // Agent A is Primary in pool1, Backup in pool2
      poolManager.addAgentToPool("agentA", "pool1", 1);
      poolManager.addAgentToPool("agentA", "pool2", 3);
      
      // Agent B is Backup in pool1, Primary in pool2
      poolManager.addAgentToPool("agentB", "pool1", 3);
      poolManager.addAgentToPool("agentB", "pool2", 1);
      
      // In pool1, Agent A should be selected (Primary)
      const result1 = poolManager.findBestAgent("pool1");
      expect(result1?.agentId).toBe("agentA");
      
      // In pool2, Agent B should be selected (Primary)
      const result2 = poolManager.findBestAgent("pool2");
      expect(result2?.agentId).toBe("agentB");
    });
  });

  describe("Visitor Reassignment", () => {
    it("should reassign some visitors when agent goes away (round-robin behavior)", () => {
      // Note: Current behavior - reassignVisitors uses findBestAgent which uses round-robin.
      // Since agentA is still registered (just being reassigned FROM), it may be picked
      // by the algorithm for subsequent visitors, causing them to become unassigned.
      poolManager.registerAgent("socket_a", createMockAgentProfile("agentA", "Agent A"));
      poolManager.registerAgent("socket_b", createMockAgentProfile("agentB", "Agent B"));

      // Assign 2 visitors to agentA
      poolManager.registerVisitor("socket_v1", "visitor1", "org1", "/");
      poolManager.assignVisitorToAgent("visitor1", "agentA");
      poolManager.registerVisitor("socket_v2", "visitor2", "org1", "/");
      poolManager.assignVisitorToAgent("visitor2", "agentA");

      const result = poolManager.reassignVisitors("agentA");

      // Current behavior: first visitor gets reassigned to agentB,
      // second visitor becomes unassigned (algorithm picks agentA which is rejected)
      expect(result.reassigned.size).toBe(1);
      expect(result.unassigned).toHaveLength(1);
    });

    it("should mark visitors as unassigned when no agents available", () => {
      poolManager.registerAgent("socket_a", createMockAgentProfile("agentA", "Agent A"));

      poolManager.registerVisitor("socket_v1", "visitor1", "org1", "/");
      poolManager.assignVisitorToAgent("visitor1", "agentA");

      const result = poolManager.reassignVisitors("agentA");

      expect(result.reassigned.size).toBe(0);
      expect(result.unassigned).toContain("visitor1");
    });

    it("should exclude visitor in call from reassignment", () => {
      poolManager.registerAgent("socket_a", createMockAgentProfile("agentA", "Agent A"));
      poolManager.registerAgent("socket_b", createMockAgentProfile("agentB", "Agent B"));

      poolManager.registerVisitor("socket_v1", "visitor1", "org1", "/");
      poolManager.assignVisitorToAgent("visitor1", "agentA");
      poolManager.registerVisitor("socket_v2", "visitor2", "org1", "/");
      poolManager.assignVisitorToAgent("visitor2", "agentA");

      // Exclude visitor1 (they're in a call)
      const result = poolManager.reassignVisitors("agentA", "visitor1");

      expect(result.reassigned.size).toBe(1);
      expect(result.reassigned.has("visitor2")).toBe(true);
      expect(result.reassigned.has("visitor1")).toBe(false);
    });
  });

  /**
   * Test Lock A1: updateAgentStatus - Agent Status Updates
   *
   * Behaviors captured:
   * 1. Updates agent.profile.status to provided value
   * 2. Does not throw when agent not found
   */
  describe("updateAgentStatus", () => {
    it("should update agent.profile.status to 'away'", () => {
      poolManager.registerAgent("socket_a", createMockAgentProfile("agentA", "Agent A"));

      poolManager.updateAgentStatus("agentA", "away");

      const agent = poolManager.getAgent("agentA");
      expect(agent?.profile.status).toBe("away");
    });

    it("should update agent.profile.status to 'idle'", () => {
      const awayProfile = createMockAgentProfile("agentA", "Agent A");
      awayProfile.status = "away";
      poolManager.registerAgent("socket_a", awayProfile);

      poolManager.updateAgentStatus("agentA", "idle");

      const agent = poolManager.getAgent("agentA");
      expect(agent?.profile.status).toBe("idle");
    });

    it("should update agent.profile.status to 'offline'", () => {
      poolManager.registerAgent("socket_a", createMockAgentProfile("agentA", "Agent A"));

      poolManager.updateAgentStatus("agentA", "offline");

      const agent = poolManager.getAgent("agentA");
      expect(agent?.profile.status).toBe("offline");
    });

    it("should update agent.profile.status to 'in_simulation'", () => {
      poolManager.registerAgent("socket_a", createMockAgentProfile("agentA", "Agent A"));

      poolManager.updateAgentStatus("agentA", "in_simulation");

      const agent = poolManager.getAgent("agentA");
      expect(agent?.profile.status).toBe("in_simulation");
    });

    it("should not throw when agent does not exist", () => {
      // Should silently handle non-existent agent
      expect(() => {
        poolManager.updateAgentStatus("non_existent", "away");
      }).not.toThrow();
    });

    it("should not affect other agents", () => {
      poolManager.registerAgent("socket_a", createMockAgentProfile("agentA", "Agent A"));
      poolManager.registerAgent("socket_b", createMockAgentProfile("agentB", "Agent B"));

      poolManager.updateAgentStatus("agentA", "away");

      const agentA = poolManager.getAgent("agentA");
      const agentB = poolManager.getAgent("agentB");
      expect(agentA?.profile.status).toBe("away");
      expect(agentB?.profile.status).toBe("idle"); // Unchanged
    });
  });

  /**
   * Test Lock A1: updateAgentActivity - Agent Activity Tracking
   *
   * Behaviors captured:
   * 1. Updates lastActivityAt timestamp to current time
   * 2. Does not throw when agent not found
   */
  describe("updateAgentActivity", () => {
    it("should update lastActivityAt to current time", () => {
      vi.useFakeTimers();
      const initialTime = Date.now();
      
      poolManager.registerAgent("socket_a", createMockAgentProfile("agentA", "Agent A"));
      
      const agentBefore = poolManager.getAgent("agentA");
      const initialLastActivity = agentBefore?.lastActivityAt;

      // Advance time
      vi.advanceTimersByTime(10000);

      poolManager.updateAgentActivity("agentA");

      const agentAfter = poolManager.getAgent("agentA");
      expect(agentAfter?.lastActivityAt).toBeGreaterThan(initialLastActivity!);

      vi.useRealTimers();
    });

    it("should not throw when agent does not exist", () => {
      expect(() => {
        poolManager.updateAgentActivity("non_existent");
      }).not.toThrow();
    });
  });

  /**
   * Test Lock A1: Skip agents with 'away' status in findBestAgent
   */
  describe("Agent Status Filtering - Away Status", () => {
    it("should skip agents who are away", () => {
      poolManager.registerAgent("socket_a", createMockAgentProfile("agentA", "Agent A"));
      poolManager.registerAgent("socket_b", createMockAgentProfile("agentB", "Agent B"));

      // Set agentA to away
      poolManager.updateAgentStatus("agentA", "away");

      const bestAgent = poolManager.findBestAgent();
      expect(bestAgent?.agentId).toBe("agentB");
    });

    it("should return undefined when all agents are away", () => {
      poolManager.registerAgent("socket_a", createMockAgentProfile("agentA", "Agent A"));
      poolManager.registerAgent("socket_b", createMockAgentProfile("agentB", "Agent B"));

      poolManager.updateAgentStatus("agentA", "away");
      poolManager.updateAgentStatus("agentB", "away");

      const bestAgent = poolManager.findBestAgent();
      expect(bestAgent).toBeUndefined();
    });
  });
});

