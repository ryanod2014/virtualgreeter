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

  /**
   * Test Lock P2: matchPathToPool - URL to Pool Routing
   *
   * Behaviors captured:
   * 1. Returns matching pool when conditions match
   * 2. Returns defaultPoolId when no rules match
   * 3. Returns null when no config for org
   * 4. Rules are evaluated by priority (DESC) - first matching high-priority rule wins
   */
  describe("matchPathToPool", () => {
    it("returns matching pool when path pattern matches", () => {
      poolManager.setOrgConfig("org1", "default_pool", [
        {
          id: "rule1",
          orgId: "org1",
          pathPattern: "/pricing/**",
          domainPattern: "*",
          conditions: [],
          poolId: "pricing_pool",
          priority: 1,
          isActive: true,
        },
      ]);

      const poolId = poolManager.matchPathToPool("org1", "https://example.com/pricing/enterprise");

      expect(poolId).toBe("pricing_pool");
    });

    it("returns defaultPoolId when no rules match", () => {
      poolManager.setOrgConfig("org1", "default_pool", [
        {
          id: "rule1",
          orgId: "org1",
          pathPattern: "/pricing/**",
          domainPattern: "*",
          conditions: [],
          poolId: "pricing_pool",
          priority: 1,
          isActive: true,
        },
      ]);

      const poolId = poolManager.matchPathToPool("org1", "https://example.com/other/page");

      expect(poolId).toBe("default_pool");
    });

    it("returns null when no config exists for org", () => {
      const poolId = poolManager.matchPathToPool("unconfigured_org", "https://example.com/any/path");

      expect(poolId).toBeNull();
    });

    it("evaluates rules by priority (DESC) - higher priority wins", () => {
      poolManager.setOrgConfig("org1", "default_pool", [
        {
          id: "low_priority_rule",
          orgId: "org1",
          pathPattern: "/pricing/**",
          domainPattern: "*",
          conditions: [],
          poolId: "low_priority_pool",
          priority: 1,
          isActive: true,
        },
        {
          id: "high_priority_rule",
          orgId: "org1",
          pathPattern: "/pricing/**",
          domainPattern: "*",
          conditions: [],
          poolId: "high_priority_pool",
          priority: 10,
          isActive: true,
        },
      ]);

      // High priority (10) should match before low priority (1)
      const poolId = poolManager.matchPathToPool("org1", "https://example.com/pricing/page");

      expect(poolId).toBe("high_priority_pool");
    });

    it("first matching rule wins (rules are ORed)", () => {
      poolManager.setOrgConfig("org1", "default_pool", [
        {
          id: "rule1",
          orgId: "org1",
          pathPattern: "/pricing/**",
          domainPattern: "*",
          conditions: [],
          poolId: "pricing_pool",
          priority: 5,
          isActive: true,
        },
        {
          id: "rule2",
          orgId: "org1",
          pathPattern: "/support/**",
          domainPattern: "*",
          conditions: [],
          poolId: "support_pool",
          priority: 4,
          isActive: true,
        },
      ]);

      const pricingPool = poolManager.matchPathToPool("org1", "https://example.com/pricing/page");
      const supportPool = poolManager.matchPathToPool("org1", "https://example.com/support/page");

      expect(pricingPool).toBe("pricing_pool");
      expect(supportPool).toBe("support_pool");
    });

    it("uses conditions-based matching when conditions array is present", () => {
      poolManager.setOrgConfig("org1", "default_pool", [
        {
          id: "condition_rule",
          orgId: "org1",
          pathPattern: "",
          domainPattern: "*",
          conditions: [
            {
              type: "path" as const,
              matchType: "starts_with" as const,
              value: "/enterprise",
            },
          ],
          poolId: "enterprise_pool",
          priority: 1,
          isActive: true,
        },
      ]);

      const poolId = poolManager.matchPathToPool("org1", "https://example.com/enterprise/demo");

      expect(poolId).toBe("enterprise_pool");
    });

    it("skips inactive rules", () => {
      poolManager.setOrgConfig("org1", "default_pool", [
        {
          id: "inactive_rule",
          orgId: "org1",
          pathPattern: "/pricing/**",
          domainPattern: "*",
          conditions: [],
          poolId: "pricing_pool",
          priority: 10,
          isActive: false, // Inactive
        },
      ]);

      const poolId = poolManager.matchPathToPool("org1", "https://example.com/pricing/page");

      // Should fall back to default since rule is inactive
      expect(poolId).toBe("default_pool");
    });

    it("returns null defaultPoolId when default is null and no rules match", () => {
      poolManager.setOrgConfig("org1", null, []);

      const poolId = poolManager.matchPathToPool("org1", "https://example.com/any/path");

      expect(poolId).toBeNull();
    });
  });

  /**
   * Test Lock P2: matchConditions - Condition Matching Logic
   *
   * Behaviors captured:
   * 1. Uses AND logic for multiple conditions (all must match)
   * 2. Matches path patterns (starts_with, contains, is_exactly, ends_with, does_not_contain)
   * 3. Matches query parameters
   * 4. Matches domain patterns
   */
  describe("matchConditions (via matchPathToPool)", () => {
    describe("AND logic for multiple conditions", () => {
      it("matches when ALL conditions are true (AND logic)", () => {
        poolManager.setOrgConfig("org1", "default_pool", [
          {
            id: "and_rule",
            orgId: "org1",
            pathPattern: "",
            domainPattern: "*",
            conditions: [
              { type: "path" as const, matchType: "starts_with" as const, value: "/pricing" },
              { type: "domain" as const, matchType: "contains" as const, value: "example" },
            ],
            poolId: "and_pool",
            priority: 1,
            isActive: true,
          },
        ]);

        // Both conditions match
        const poolId = poolManager.matchPathToPool("org1", "https://example.com/pricing/page");

        expect(poolId).toBe("and_pool");
      });

      it("does not match when ANY condition fails (AND logic)", () => {
        poolManager.setOrgConfig("org1", "default_pool", [
          {
            id: "and_rule",
            orgId: "org1",
            pathPattern: "",
            domainPattern: "*",
            conditions: [
              { type: "path" as const, matchType: "starts_with" as const, value: "/pricing" },
              { type: "domain" as const, matchType: "contains" as const, value: "other" }, // Won't match
            ],
            poolId: "and_pool",
            priority: 1,
            isActive: true,
          },
        ]);

        // Path matches but domain doesn't - should fall back to default
        const poolId = poolManager.matchPathToPool("org1", "https://example.com/pricing/page");

        expect(poolId).toBe("default_pool");
      });
    });

    describe("path pattern matching", () => {
      it("matches path with 'is_exactly' match type", () => {
        poolManager.setOrgConfig("org1", "default_pool", [
          {
            id: "exact_path_rule",
            orgId: "org1",
            pathPattern: "",
            domainPattern: "*",
            conditions: [
              { type: "path" as const, matchType: "is_exactly" as const, value: "/pricing" },
            ],
            poolId: "exact_pool",
            priority: 1,
            isActive: true,
          },
        ]);

        const exactMatch = poolManager.matchPathToPool("org1", "https://example.com/pricing");
        const noMatch = poolManager.matchPathToPool("org1", "https://example.com/pricing/extra");

        expect(exactMatch).toBe("exact_pool");
        expect(noMatch).toBe("default_pool");
      });

      it("matches path with 'contains' match type", () => {
        poolManager.setOrgConfig("org1", "default_pool", [
          {
            id: "contains_rule",
            orgId: "org1",
            pathPattern: "",
            domainPattern: "*",
            conditions: [
              { type: "path" as const, matchType: "contains" as const, value: "pricing" },
            ],
            poolId: "contains_pool",
            priority: 1,
            isActive: true,
          },
        ]);

        const poolId = poolManager.matchPathToPool("org1", "https://example.com/some/pricing/page");

        expect(poolId).toBe("contains_pool");
      });

      it("matches path with 'starts_with' match type", () => {
        poolManager.setOrgConfig("org1", "default_pool", [
          {
            id: "starts_with_rule",
            orgId: "org1",
            pathPattern: "",
            domainPattern: "*",
            conditions: [
              { type: "path" as const, matchType: "starts_with" as const, value: "/docs" },
            ],
            poolId: "docs_pool",
            priority: 1,
            isActive: true,
          },
        ]);

        const poolId = poolManager.matchPathToPool("org1", "https://example.com/docs/api/v2");

        expect(poolId).toBe("docs_pool");
      });

      it("matches path with 'ends_with' match type", () => {
        poolManager.setOrgConfig("org1", "default_pool", [
          {
            id: "ends_with_rule",
            orgId: "org1",
            pathPattern: "",
            domainPattern: "*",
            conditions: [
              { type: "path" as const, matchType: "ends_with" as const, value: "/contact" },
            ],
            poolId: "contact_pool",
            priority: 1,
            isActive: true,
          },
        ]);

        const poolId = poolManager.matchPathToPool("org1", "https://example.com/support/contact");

        expect(poolId).toBe("contact_pool");
      });

      it("matches path with 'does_not_contain' match type", () => {
        poolManager.setOrgConfig("org1", "default_pool", [
          {
            id: "not_contain_rule",
            orgId: "org1",
            pathPattern: "",
            domainPattern: "*",
            conditions: [
              { type: "path" as const, matchType: "does_not_contain" as const, value: "admin" },
            ],
            poolId: "public_pool",
            priority: 1,
            isActive: true,
          },
        ]);

        const publicMatch = poolManager.matchPathToPool("org1", "https://example.com/pricing");
        const adminNoMatch = poolManager.matchPathToPool("org1", "https://example.com/admin/settings");

        expect(publicMatch).toBe("public_pool");
        expect(adminNoMatch).toBe("default_pool");
      });
    });

    describe("query parameter matching", () => {
      it("matches query parameter with 'is_exactly' match type", () => {
        poolManager.setOrgConfig("org1", "default_pool", [
          {
            id: "query_rule",
            orgId: "org1",
            pathPattern: "",
            domainPattern: "*",
            conditions: [
              { type: "query_param" as const, matchType: "is_exactly" as const, value: "enterprise", paramName: "plan" },
            ],
            poolId: "enterprise_pool",
            priority: 1,
            isActive: true,
          },
        ]);

        const poolId = poolManager.matchPathToPool("org1", "https://example.com/pricing?plan=enterprise");

        expect(poolId).toBe("enterprise_pool");
      });

      it("matches query parameter with 'contains' match type", () => {
        poolManager.setOrgConfig("org1", "default_pool", [
          {
            id: "query_contains_rule",
            orgId: "org1",
            pathPattern: "",
            domainPattern: "*",
            conditions: [
              { type: "query_param" as const, matchType: "contains" as const, value: "trial", paramName: "campaign" },
            ],
            poolId: "trial_pool",
            priority: 1,
            isActive: true,
          },
        ]);

        const poolId = poolManager.matchPathToPool("org1", "https://example.com/page?campaign=free_trial_2024");

        expect(poolId).toBe("trial_pool");
      });

      it("does not match when query parameter is missing", () => {
        poolManager.setOrgConfig("org1", "default_pool", [
          {
            id: "query_rule",
            orgId: "org1",
            pathPattern: "",
            domainPattern: "*",
            conditions: [
              { type: "query_param" as const, matchType: "is_exactly" as const, value: "enterprise", paramName: "plan" },
            ],
            poolId: "enterprise_pool",
            priority: 1,
            isActive: true,
          },
        ]);

        const poolId = poolManager.matchPathToPool("org1", "https://example.com/pricing");

        expect(poolId).toBe("default_pool");
      });

      it("matches case-insensitively for query parameter names", () => {
        poolManager.setOrgConfig("org1", "default_pool", [
          {
            id: "query_rule",
            orgId: "org1",
            pathPattern: "",
            domainPattern: "*",
            conditions: [
              { type: "query_param" as const, matchType: "is_exactly" as const, value: "yes", paramName: "DEMO" },
            ],
            poolId: "demo_pool",
            priority: 1,
            isActive: true,
          },
        ]);

        const poolId = poolManager.matchPathToPool("org1", "https://example.com/page?demo=yes");

        expect(poolId).toBe("demo_pool");
      });
    });

    describe("domain matching", () => {
      it("matches domain with 'contains' match type", () => {
        poolManager.setOrgConfig("org1", "default_pool", [
          {
            id: "domain_rule",
            orgId: "org1",
            pathPattern: "",
            domainPattern: "*",
            conditions: [
              { type: "domain" as const, matchType: "contains" as const, value: "staging" },
            ],
            poolId: "staging_pool",
            priority: 1,
            isActive: true,
          },
        ]);

        const poolId = poolManager.matchPathToPool("org1", "https://staging.example.com/page");

        expect(poolId).toBe("staging_pool");
      });

      it("matches domain with 'is_exactly' match type", () => {
        poolManager.setOrgConfig("org1", "default_pool", [
          {
            id: "domain_exact_rule",
            orgId: "org1",
            pathPattern: "",
            domainPattern: "*",
            conditions: [
              { type: "domain" as const, matchType: "is_exactly" as const, value: "app.example.com" },
            ],
            poolId: "app_pool",
            priority: 1,
            isActive: true,
          },
        ]);

        const poolId = poolManager.matchPathToPool("org1", "https://app.example.com/dashboard");

        expect(poolId).toBe("app_pool");
      });
    });
  });

  /**
   * Test Lock P2: assignVisitorToAgent - Assignment State Updates
   *
   * Behaviors captured:
   * 1. Updates agent's currentSimulations array
   * 2. Increments assignment counter (monotonically increasing)
   * 3. Updates lastAssignmentOrder for the agent
   * 4. Updates visitor's assignedAgentId
   * 5. Updates visitor's state to watching_simulation
   * 6. Updates agent status to in_simulation if first visitor
   */
  describe("assignVisitorToAgent", () => {
    it("adds visitor to agent's currentSimulations array", () => {
      poolManager.registerAgent("socket_a", createMockAgentProfile("agentA", "Agent A"));
      poolManager.registerVisitor("socket_v", "visitor1", "org1", "/");

      poolManager.assignVisitorToAgent("visitor1", "agentA");

      const agent = poolManager.getAgent("agentA");
      expect(agent?.currentSimulations).toContain("visitor1");
      expect(agent?.currentSimulations).toHaveLength(1);
    });

    it("increments assignment counter with each assignment", () => {
      poolManager.registerAgent("socket_a", createMockAgentProfile("agentA", "Agent A"));
      poolManager.registerAgent("socket_b", createMockAgentProfile("agentB", "Agent B"));
      poolManager.registerVisitor("socket_v1", "visitor1", "org1", "/");
      poolManager.registerVisitor("socket_v2", "visitor2", "org1", "/");
      poolManager.registerVisitor("socket_v3", "visitor3", "org1", "/");

      // First find and assign establishes order
      const agent1 = poolManager.findBestAgent();
      poolManager.assignVisitorToAgent("visitor1", agent1!.agentId);
      
      const agent2 = poolManager.findBestAgent();
      poolManager.assignVisitorToAgent("visitor2", agent2!.agentId);
      
      const agent3 = poolManager.findBestAgent();
      poolManager.assignVisitorToAgent("visitor3", agent3!.agentId);

      // All agents got assigned, and when querying for the 4th,
      // the round-robin should pick based on oldest assignment order
      poolManager.registerVisitor("socket_v4", "visitor4", "org1", "/");
      poolManager.unregisterVisitor("visitor1");
      poolManager.unregisterVisitor("visitor2");
      poolManager.unregisterVisitor("visitor3");

      // Agent with oldest assignment order should be picked
      const nextAgent = poolManager.findBestAgent();
      expect(nextAgent).toBeDefined();
    });

    it("updates lastAssignmentOrder for the assigned agent", () => {
      poolManager.registerAgent("socket_a", createMockAgentProfile("agentA", "Agent A"));
      poolManager.registerAgent("socket_b", createMockAgentProfile("agentB", "Agent B"));
      poolManager.registerVisitor("socket_v1", "visitor1", "org1", "/");
      poolManager.registerVisitor("socket_v2", "visitor2", "org1", "/");

      // Assign visitor1 to agentA
      poolManager.assignVisitorToAgent("visitor1", "agentA");
      
      // Assign visitor2 to agentB
      poolManager.assignVisitorToAgent("visitor2", "agentB");

      // Both agents now have visitors, so when they become idle again,
      // the one with older assignment order should be picked first
      poolManager.unregisterVisitor("visitor1");
      poolManager.unregisterVisitor("visitor2");

      // AgentA was assigned first, so has older order - should be picked
      poolManager.registerVisitor("socket_v3", "visitor3", "org1", "/");
      const nextAgent = poolManager.findBestAgent();
      
      expect(nextAgent?.agentId).toBe("agentA");
    });

    it("updates visitor assignedAgentId", () => {
      poolManager.registerAgent("socket_a", createMockAgentProfile("agentA", "Agent A"));
      poolManager.registerVisitor("socket_v", "visitor1", "org1", "/");

      poolManager.assignVisitorToAgent("visitor1", "agentA");

      const visitor = poolManager.getVisitor("visitor1");
      expect(visitor?.assignedAgentId).toBe("agentA");
    });

    it("updates visitor state to watching_simulation", () => {
      poolManager.registerAgent("socket_a", createMockAgentProfile("agentA", "Agent A"));
      poolManager.registerVisitor("socket_v", "visitor1", "org1", "/");

      poolManager.assignVisitorToAgent("visitor1", "agentA");

      const visitor = poolManager.getVisitor("visitor1");
      expect(visitor?.state).toBe("watching_simulation");
    });

    it("updates agent status to in_simulation when first visitor assigned", () => {
      poolManager.registerAgent("socket_a", createMockAgentProfile("agentA", "Agent A"));
      poolManager.registerVisitor("socket_v", "visitor1", "org1", "/");

      expect(poolManager.getAgent("agentA")?.profile.status).toBe("idle");

      poolManager.assignVisitorToAgent("visitor1", "agentA");

      expect(poolManager.getAgent("agentA")?.profile.status).toBe("in_simulation");
    });

    it("removes visitor from previous agent when reassigning", () => {
      poolManager.registerAgent("socket_a", createMockAgentProfile("agentA", "Agent A"));
      poolManager.registerAgent("socket_b", createMockAgentProfile("agentB", "Agent B"));
      poolManager.registerVisitor("socket_v", "visitor1", "org1", "/");

      // First assign to agentA
      poolManager.assignVisitorToAgent("visitor1", "agentA");
      expect(poolManager.getAgent("agentA")?.currentSimulations).toContain("visitor1");

      // Reassign to agentB
      poolManager.assignVisitorToAgent("visitor1", "agentB");

      // Should be removed from agentA
      expect(poolManager.getAgent("agentA")?.currentSimulations).not.toContain("visitor1");
      // Should be added to agentB
      expect(poolManager.getAgent("agentB")?.currentSimulations).toContain("visitor1");
    });

    it("returns false if visitor not found", () => {
      poolManager.registerAgent("socket_a", createMockAgentProfile("agentA", "Agent A"));

      const result = poolManager.assignVisitorToAgent("nonexistent", "agentA");

      expect(result).toBe(false);
    });

    it("returns false if agent not found", () => {
      poolManager.registerVisitor("socket_v", "visitor1", "org1", "/");

      const result = poolManager.assignVisitorToAgent("visitor1", "nonexistent");

      expect(result).toBe(false);
    });

    it("returns true on successful assignment", () => {
      poolManager.registerAgent("socket_a", createMockAgentProfile("agentA", "Agent A"));
      poolManager.registerVisitor("socket_v", "visitor1", "org1", "/");

      const result = poolManager.assignVisitorToAgent("visitor1", "agentA");

      expect(result).toBe(true);
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

  /**
   * Test Lock D2: matchPathToPool - URL-based routing to pools
   *
   * Behaviors captured:
   * 1. Matches path pattern using legacy patterns
   * 2. Returns highest priority match when multiple rules match
   * 3. Falls back to default pool when no rules match
   */
  describe("matchPathToPool", () => {
    it("should return null when org config does not exist", () => {
      const result = poolManager.matchPathToPool("nonexistent_org", "https://example.com/page");
      expect(result).toBeNull();
    });

    it("should return default pool when no rules match", () => {
      poolManager.setOrgConfig("org1", "default_pool", []);

      const result = poolManager.matchPathToPool("org1", "https://example.com/any-page");
      expect(result).toBe("default_pool");
    });

    it("should return null as default pool when configured as null", () => {
      poolManager.setOrgConfig("org1", null, []);

      const result = poolManager.matchPathToPool("org1", "https://example.com/any-page");
      expect(result).toBeNull();
    });

    it("should match exact path pattern", () => {
      poolManager.setOrgConfig("org1", "default_pool", [
        {
          id: "rule1",
          orgId: "org1",
          pathPattern: "/pricing",
          domainPattern: "*",
          conditions: [],
          poolId: "sales_pool",
          priority: 1,
          isActive: true,
        },
      ]);

      const result = poolManager.matchPathToPool("org1", "https://example.com/pricing");
      expect(result).toBe("sales_pool");
    });

    it("should match path with wildcard suffix (path*)", () => {
      poolManager.setOrgConfig("org1", "default_pool", [
        {
          id: "rule1",
          orgId: "org1",
          pathPattern: "/products*",
          domainPattern: "*",
          conditions: [],
          poolId: "products_pool",
          priority: 1,
          isActive: true,
        },
      ]);

      expect(poolManager.matchPathToPool("org1", "https://example.com/products")).toBe("products_pool");
      expect(poolManager.matchPathToPool("org1", "https://example.com/products-new")).toBe("products_pool");
      expect(poolManager.matchPathToPool("org1", "https://example.com/products/item")).toBe("products_pool");
    });

    it("should match path with single-level wildcard (/*)", () => {
      poolManager.setOrgConfig("org1", "default_pool", [
        {
          id: "rule1",
          orgId: "org1",
          pathPattern: "/category/*",
          domainPattern: "*",
          conditions: [],
          poolId: "category_pool",
          priority: 1,
          isActive: true,
        },
      ]);

      expect(poolManager.matchPathToPool("org1", "https://example.com/category/electronics")).toBe("category_pool");
      expect(poolManager.matchPathToPool("org1", "https://example.com/category/books")).toBe("category_pool");
      // Should NOT match nested paths
      expect(poolManager.matchPathToPool("org1", "https://example.com/category/electronics/phones")).toBe("default_pool");
    });

    it("should match path with multi-level wildcard (/**)", () => {
      poolManager.setOrgConfig("org1", "default_pool", [
        {
          id: "rule1",
          orgId: "org1",
          pathPattern: "/docs/**",
          domainPattern: "*",
          conditions: [],
          poolId: "docs_pool",
          priority: 1,
          isActive: true,
        },
      ]);

      expect(poolManager.matchPathToPool("org1", "https://example.com/docs")).toBe("docs_pool");
      expect(poolManager.matchPathToPool("org1", "https://example.com/docs/guide")).toBe("docs_pool");
      expect(poolManager.matchPathToPool("org1", "https://example.com/docs/api/v1/methods")).toBe("docs_pool");
    });

    it("should return highest priority match when multiple rules match", () => {
      poolManager.setOrgConfig("org1", "default_pool", [
        {
          id: "rule_low",
          orgId: "org1",
          pathPattern: "/products*",
          domainPattern: "*",
          conditions: [],
          poolId: "general_pool",
          priority: 1,
          isActive: true,
        },
        {
          id: "rule_high",
          orgId: "org1",
          pathPattern: "/products/enterprise*",
          domainPattern: "*",
          conditions: [],
          poolId: "enterprise_pool",
          priority: 10,
          isActive: true,
        },
      ]);

      // Higher priority rule should match for enterprise path
      expect(poolManager.matchPathToPool("org1", "https://example.com/products/enterprise")).toBe("enterprise_pool");
      // Lower priority rule should match for regular products
      expect(poolManager.matchPathToPool("org1", "https://example.com/products/basic")).toBe("general_pool");
    });

    it("should ignore inactive rules", () => {
      poolManager.setOrgConfig("org1", "default_pool", [
        {
          id: "rule1",
          orgId: "org1",
          pathPattern: "/pricing",
          domainPattern: "*",
          conditions: [],
          poolId: "sales_pool",
          priority: 10,
          isActive: false, // Inactive
        },
      ]);

      const result = poolManager.matchPathToPool("org1", "https://example.com/pricing");
      expect(result).toBe("default_pool");
    });

    it("should match domain pattern with exact match", () => {
      poolManager.setOrgConfig("org1", "default_pool", [
        {
          id: "rule1",
          orgId: "org1",
          pathPattern: "/**",
          domainPattern: "enterprise.example.com",
          conditions: [],
          poolId: "enterprise_pool",
          priority: 1,
          isActive: true,
        },
      ]);

      expect(poolManager.matchPathToPool("org1", "https://enterprise.example.com/page")).toBe("enterprise_pool");
      expect(poolManager.matchPathToPool("org1", "https://www.example.com/page")).toBe("default_pool");
    });

    it("should match domain pattern with wildcard subdomain (*.) ", () => {
      poolManager.setOrgConfig("org1", "default_pool", [
        {
          id: "rule1",
          orgId: "org1",
          pathPattern: "/**",
          domainPattern: "*.example.com",
          conditions: [],
          poolId: "subdomain_pool",
          priority: 1,
          isActive: true,
        },
      ]);

      expect(poolManager.matchPathToPool("org1", "https://app.example.com/page")).toBe("subdomain_pool");
      expect(poolManager.matchPathToPool("org1", "https://www.example.com/page")).toBe("subdomain_pool");
      expect(poolManager.matchPathToPool("org1", "https://example.com/page")).toBe("subdomain_pool");
      expect(poolManager.matchPathToPool("org1", "https://other.com/page")).toBe("default_pool");
    });

    it("should handle path-only URLs (no protocol)", () => {
      poolManager.setOrgConfig("org1", "default_pool", [
        {
          id: "rule1",
          orgId: "org1",
          pathPattern: "/pricing",
          domainPattern: "*",
          conditions: [],
          poolId: "sales_pool",
          priority: 1,
          isActive: true,
        },
      ]);

      expect(poolManager.matchPathToPool("org1", "/pricing")).toBe("sales_pool");
      expect(poolManager.matchPathToPool("org1", "pricing")).toBe("sales_pool");
    });
  });

  /**
   * Test Lock D2: matchConditions - Condition-based URL matching
   *
   * Behaviors captured:
   * 1. AND logic - all conditions must match for rule to match
   * 2. Path matching with various match types
   * 3. Query param matching
   * 4. Domain matching
   */
  describe("matchConditions (via matchPathToPool)", () => {
    describe("AND logic for multiple conditions", () => {
      it("should require ALL conditions to match (AND logic)", () => {
        poolManager.setOrgConfig("org1", "default_pool", [
          {
            id: "rule1",
            orgId: "org1",
            pathPattern: "",
            domainPattern: "",
            conditions: [
              { type: "path", matchType: "starts_with", value: "/products" },
              { type: "query_param", matchType: "is_exactly", value: "enterprise", paramName: "plan" },
            ],
            poolId: "enterprise_pool",
            priority: 1,
            isActive: true,
          },
        ]);

        // Both conditions match
        expect(poolManager.matchPathToPool("org1", "https://example.com/products?plan=enterprise")).toBe("enterprise_pool");
        // Only path matches, query param doesn't
        expect(poolManager.matchPathToPool("org1", "https://example.com/products?plan=basic")).toBe("default_pool");
        // Only query param matches, path doesn't
        expect(poolManager.matchPathToPool("org1", "https://example.com/about?plan=enterprise")).toBe("default_pool");
      });

      it("should match with single condition", () => {
        poolManager.setOrgConfig("org1", "default_pool", [
          {
            id: "rule1",
            orgId: "org1",
            pathPattern: "",
            domainPattern: "",
            conditions: [
              { type: "path", matchType: "contains", value: "pricing" },
            ],
            poolId: "sales_pool",
            priority: 1,
            isActive: true,
          },
        ]);

        expect(poolManager.matchPathToPool("org1", "https://example.com/pricing")).toBe("sales_pool");
        expect(poolManager.matchPathToPool("org1", "https://example.com/products/pricing-info")).toBe("sales_pool");
      });

      it("should fail when any condition does not match", () => {
        poolManager.setOrgConfig("org1", "default_pool", [
          {
            id: "rule1",
            orgId: "org1",
            pathPattern: "",
            domainPattern: "",
            conditions: [
              { type: "domain", matchType: "is_exactly", value: "app.example.com" },
              { type: "path", matchType: "starts_with", value: "/admin" },
              { type: "query_param", matchType: "is_exactly", value: "true", paramName: "debug" },
            ],
            poolId: "admin_pool",
            priority: 1,
            isActive: true,
          },
        ]);

        // All three match
        expect(poolManager.matchPathToPool("org1", "https://app.example.com/admin?debug=true")).toBe("admin_pool");
        // Two match, one doesn't (wrong domain)
        expect(poolManager.matchPathToPool("org1", "https://www.example.com/admin?debug=true")).toBe("default_pool");
        // Two match, one doesn't (wrong path)
        expect(poolManager.matchPathToPool("org1", "https://app.example.com/user?debug=true")).toBe("default_pool");
        // Two match, one doesn't (wrong query)
        expect(poolManager.matchPathToPool("org1", "https://app.example.com/admin?debug=false")).toBe("default_pool");
      });
    });

    describe("path matching types", () => {
      it("should match path with is_exactly", () => {
        poolManager.setOrgConfig("org1", "default_pool", [
          {
            id: "rule1",
            orgId: "org1",
            pathPattern: "",
            domainPattern: "",
            conditions: [
              { type: "path", matchType: "is_exactly", value: "/pricing" },
            ],
            poolId: "sales_pool",
            priority: 1,
            isActive: true,
          },
        ]);

        expect(poolManager.matchPathToPool("org1", "https://example.com/pricing")).toBe("sales_pool");
        expect(poolManager.matchPathToPool("org1", "https://example.com/pricing-page")).toBe("default_pool");
        expect(poolManager.matchPathToPool("org1", "https://example.com/products/pricing")).toBe("default_pool");
      });

      it("should match path with contains", () => {
        poolManager.setOrgConfig("org1", "default_pool", [
          {
            id: "rule1",
            orgId: "org1",
            pathPattern: "",
            domainPattern: "",
            conditions: [
              { type: "path", matchType: "contains", value: "checkout" },
            ],
            poolId: "checkout_pool",
            priority: 1,
            isActive: true,
          },
        ]);

        expect(poolManager.matchPathToPool("org1", "https://example.com/checkout")).toBe("checkout_pool");
        expect(poolManager.matchPathToPool("org1", "https://example.com/cart/checkout/confirm")).toBe("checkout_pool");
        expect(poolManager.matchPathToPool("org1", "https://example.com/pre-checkout-steps")).toBe("checkout_pool");
      });

      it("should match path with does_not_contain", () => {
        poolManager.setOrgConfig("org1", "default_pool", [
          {
            id: "rule1",
            orgId: "org1",
            pathPattern: "",
            domainPattern: "",
            conditions: [
              { type: "path", matchType: "does_not_contain", value: "admin" },
            ],
            poolId: "public_pool",
            priority: 1,
            isActive: true,
          },
        ]);

        expect(poolManager.matchPathToPool("org1", "https://example.com/products")).toBe("public_pool");
        expect(poolManager.matchPathToPool("org1", "https://example.com/admin")).toBe("default_pool");
        expect(poolManager.matchPathToPool("org1", "https://example.com/admin/users")).toBe("default_pool");
      });

      it("should match path with starts_with", () => {
        poolManager.setOrgConfig("org1", "default_pool", [
          {
            id: "rule1",
            orgId: "org1",
            pathPattern: "",
            domainPattern: "",
            conditions: [
              { type: "path", matchType: "starts_with", value: "/api" },
            ],
            poolId: "api_pool",
            priority: 1,
            isActive: true,
          },
        ]);

        expect(poolManager.matchPathToPool("org1", "https://example.com/api/v1/users")).toBe("api_pool");
        expect(poolManager.matchPathToPool("org1", "https://example.com/api")).toBe("api_pool");
        expect(poolManager.matchPathToPool("org1", "https://example.com/docs/api")).toBe("default_pool");
      });

      it("should match path with ends_with", () => {
        poolManager.setOrgConfig("org1", "default_pool", [
          {
            id: "rule1",
            orgId: "org1",
            pathPattern: "",
            domainPattern: "",
            conditions: [
              { type: "path", matchType: "ends_with", value: "/contact" },
            ],
            poolId: "contact_pool",
            priority: 1,
            isActive: true,
          },
        ]);

        expect(poolManager.matchPathToPool("org1", "https://example.com/contact")).toBe("contact_pool");
        expect(poolManager.matchPathToPool("org1", "https://example.com/support/contact")).toBe("contact_pool");
        expect(poolManager.matchPathToPool("org1", "https://example.com/contact/form")).toBe("default_pool");
      });

      it("should perform case-insensitive path matching", () => {
        poolManager.setOrgConfig("org1", "default_pool", [
          {
            id: "rule1",
            orgId: "org1",
            pathPattern: "",
            domainPattern: "",
            conditions: [
              { type: "path", matchType: "contains", value: "PRICING" },
            ],
            poolId: "sales_pool",
            priority: 1,
            isActive: true,
          },
        ]);

        expect(poolManager.matchPathToPool("org1", "https://example.com/pricing")).toBe("sales_pool");
        expect(poolManager.matchPathToPool("org1", "https://example.com/PRICING")).toBe("sales_pool");
        expect(poolManager.matchPathToPool("org1", "https://example.com/Pricing")).toBe("sales_pool");
      });
    });

    describe("query param matching", () => {
      it("should match query param with is_exactly", () => {
        poolManager.setOrgConfig("org1", "default_pool", [
          {
            id: "rule1",
            orgId: "org1",
            pathPattern: "",
            domainPattern: "",
            conditions: [
              { type: "query_param", matchType: "is_exactly", value: "enterprise", paramName: "plan" },
            ],
            poolId: "enterprise_pool",
            priority: 1,
            isActive: true,
          },
        ]);

        expect(poolManager.matchPathToPool("org1", "https://example.com/page?plan=enterprise")).toBe("enterprise_pool");
        expect(poolManager.matchPathToPool("org1", "https://example.com/page?plan=basic")).toBe("default_pool");
        expect(poolManager.matchPathToPool("org1", "https://example.com/page")).toBe("default_pool");
      });

      it("should match query param with contains", () => {
        poolManager.setOrgConfig("org1", "default_pool", [
          {
            id: "rule1",
            orgId: "org1",
            pathPattern: "",
            domainPattern: "",
            conditions: [
              { type: "query_param", matchType: "contains", value: "promo", paramName: "ref" },
            ],
            poolId: "promo_pool",
            priority: 1,
            isActive: true,
          },
        ]);

        expect(poolManager.matchPathToPool("org1", "https://example.com/page?ref=promo123")).toBe("promo_pool");
        expect(poolManager.matchPathToPool("org1", "https://example.com/page?ref=summer-promo-2024")).toBe("promo_pool");
        expect(poolManager.matchPathToPool("org1", "https://example.com/page?ref=organic")).toBe("default_pool");
      });

      it("should match query param with does_not_contain", () => {
        poolManager.setOrgConfig("org1", "default_pool", [
          {
            id: "rule1",
            orgId: "org1",
            pathPattern: "",
            domainPattern: "",
            conditions: [
              { type: "query_param", matchType: "does_not_contain", value: "test", paramName: "mode" },
            ],
            poolId: "production_pool",
            priority: 1,
            isActive: true,
          },
        ]);

        expect(poolManager.matchPathToPool("org1", "https://example.com/page?mode=live")).toBe("production_pool");
        expect(poolManager.matchPathToPool("org1", "https://example.com/page?mode=test")).toBe("default_pool");
        expect(poolManager.matchPathToPool("org1", "https://example.com/page?mode=testing")).toBe("default_pool");
        // Missing param - does_not_contain should still match
        expect(poolManager.matchPathToPool("org1", "https://example.com/page")).toBe("production_pool");
      });

      it("should return default pool when query param is missing (for is_exactly/contains)", () => {
        poolManager.setOrgConfig("org1", "default_pool", [
          {
            id: "rule1",
            orgId: "org1",
            pathPattern: "",
            domainPattern: "",
            conditions: [
              { type: "query_param", matchType: "is_exactly", value: "yes", paramName: "confirm" },
            ],
            poolId: "confirm_pool",
            priority: 1,
            isActive: true,
          },
        ]);

        // Missing query param should not match
        expect(poolManager.matchPathToPool("org1", "https://example.com/page")).toBe("default_pool");
        expect(poolManager.matchPathToPool("org1", "https://example.com/page?other=value")).toBe("default_pool");
      });

      it("should handle case-insensitive query param names", () => {
        poolManager.setOrgConfig("org1", "default_pool", [
          {
            id: "rule1",
            orgId: "org1",
            pathPattern: "",
            domainPattern: "",
            conditions: [
              { type: "query_param", matchType: "is_exactly", value: "true", paramName: "DEBUG" },
            ],
            poolId: "debug_pool",
            priority: 1,
            isActive: true,
          },
        ]);

        expect(poolManager.matchPathToPool("org1", "https://example.com/page?debug=true")).toBe("debug_pool");
        expect(poolManager.matchPathToPool("org1", "https://example.com/page?DEBUG=true")).toBe("debug_pool");
      });

      it("should handle multiple query params in URL", () => {
        poolManager.setOrgConfig("org1", "default_pool", [
          {
            id: "rule1",
            orgId: "org1",
            pathPattern: "",
            domainPattern: "",
            conditions: [
              { type: "query_param", matchType: "is_exactly", value: "premium", paramName: "tier" },
            ],
            poolId: "premium_pool",
            priority: 1,
            isActive: true,
          },
        ]);

        expect(poolManager.matchPathToPool("org1", "https://example.com/page?ref=google&tier=premium&lang=en")).toBe("premium_pool");
      });

      it("should handle query params from path-only URLs", () => {
        poolManager.setOrgConfig("org1", "default_pool", [
          {
            id: "rule1",
            orgId: "org1",
            pathPattern: "",
            domainPattern: "",
            conditions: [
              { type: "query_param", matchType: "is_exactly", value: "true", paramName: "special" },
            ],
            poolId: "special_pool",
            priority: 1,
            isActive: true,
          },
        ]);

        expect(poolManager.matchPathToPool("org1", "/page?special=true")).toBe("special_pool");
      });
    });

    describe("domain matching in conditions", () => {
      it("should match domain with is_exactly", () => {
        poolManager.setOrgConfig("org1", "default_pool", [
          {
            id: "rule1",
            orgId: "org1",
            pathPattern: "",
            domainPattern: "",
            conditions: [
              { type: "domain", matchType: "is_exactly", value: "shop.example.com" },
            ],
            poolId: "shop_pool",
            priority: 1,
            isActive: true,
          },
        ]);

        expect(poolManager.matchPathToPool("org1", "https://shop.example.com/products")).toBe("shop_pool");
        expect(poolManager.matchPathToPool("org1", "https://www.example.com/products")).toBe("default_pool");
      });

      it("should match domain with contains", () => {
        poolManager.setOrgConfig("org1", "default_pool", [
          {
            id: "rule1",
            orgId: "org1",
            pathPattern: "",
            domainPattern: "",
            conditions: [
              { type: "domain", matchType: "contains", value: "staging" },
            ],
            poolId: "staging_pool",
            priority: 1,
            isActive: true,
          },
        ]);

        expect(poolManager.matchPathToPool("org1", "https://staging.example.com/page")).toBe("staging_pool");
        expect(poolManager.matchPathToPool("org1", "https://app-staging.example.com/page")).toBe("staging_pool");
        expect(poolManager.matchPathToPool("org1", "https://app.example.com/page")).toBe("default_pool");
      });

      it("should match domain with ends_with for TLD matching", () => {
        poolManager.setOrgConfig("org1", "default_pool", [
          {
            id: "rule1",
            orgId: "org1",
            pathPattern: "",
            domainPattern: "",
            conditions: [
              { type: "domain", matchType: "ends_with", value: ".co.uk" },
            ],
            poolId: "uk_pool",
            priority: 1,
            isActive: true,
          },
        ]);

        expect(poolManager.matchPathToPool("org1", "https://shop.example.co.uk/page")).toBe("uk_pool");
        expect(poolManager.matchPathToPool("org1", "https://example.co.uk/page")).toBe("uk_pool");
        expect(poolManager.matchPathToPool("org1", "https://example.com/page")).toBe("default_pool");
      });
    });

    describe("combined conditions scenarios", () => {
      it("should support complex routing with domain + path + query conditions", () => {
        poolManager.setOrgConfig("org1", "default_pool", [
          {
            id: "rule1",
            orgId: "org1",
            pathPattern: "",
            domainPattern: "",
            conditions: [
              { type: "domain", matchType: "ends_with", value: "example.com" },
              { type: "path", matchType: "starts_with", value: "/enterprise" },
              { type: "query_param", matchType: "is_exactly", value: "demo", paramName: "mode" },
            ],
            poolId: "enterprise_demo_pool",
            priority: 1,
            isActive: true,
          },
        ]);

        // All three conditions match
        expect(poolManager.matchPathToPool("org1", "https://app.example.com/enterprise/setup?mode=demo")).toBe("enterprise_demo_pool");
        // Missing query param
        expect(poolManager.matchPathToPool("org1", "https://app.example.com/enterprise/setup")).toBe("default_pool");
        // Wrong domain
        expect(poolManager.matchPathToPool("org1", "https://other.com/enterprise/setup?mode=demo")).toBe("default_pool");
      });

      it("should evaluate rules in priority order with conditions", () => {
        poolManager.setOrgConfig("org1", "default_pool", [
          {
            id: "rule_low",
            orgId: "org1",
            pathPattern: "",
            domainPattern: "",
            conditions: [
              { type: "path", matchType: "starts_with", value: "/products" },
            ],
            poolId: "general_pool",
            priority: 1,
            isActive: true,
          },
          {
            id: "rule_high",
            orgId: "org1",
            pathPattern: "",
            domainPattern: "",
            conditions: [
              { type: "path", matchType: "starts_with", value: "/products" },
              { type: "query_param", matchType: "is_exactly", value: "vip", paramName: "tier" },
            ],
            poolId: "vip_pool",
            priority: 10,
            isActive: true,
          },
        ]);

        // Higher priority rule with more specific conditions should match first
        expect(poolManager.matchPathToPool("org1", "https://example.com/products?tier=vip")).toBe("vip_pool");
        // Lower priority rule matches when VIP condition doesn't match
        expect(poolManager.matchPathToPool("org1", "https://example.com/products?tier=basic")).toBe("general_pool");
      });
    });
  });
});

