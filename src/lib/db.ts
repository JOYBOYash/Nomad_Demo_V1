import { User, Event, EventParticipant, Mission, UserMission, TokenTransaction, Reward, Redemption, ParticipationBadge, EventStatus, BadgeTier } from '../types';
import { generateId, DEV_USERS } from './utils';

const STORAGE_KEY = 'nomad_db_state_v1';

export interface EventUpdate { id: string; eventId: string; title: string; description: string; createdAt: string; }

interface DBState {
  users: User[];
  events: Event[];
  participants: EventParticipant[];
  missions: Mission[];
  userMissions: UserMission[];
  transactions: TokenTransaction[];
  rewards: Reward[];
  redemptions: Redemption[];
  badges: ParticipationBadge[];
  badgeTemplates?: any[];
  bannedUsers?: { id: string; eventId: string; userId: string; reason: string; createdAt: string; }[];
  updates?: EventUpdate[];
}

function getInitialState(): DBState {
  const users = DEV_USERS.map(u => ({ ...u, createdAt: new Date().toISOString() }));
  return { users, events: [], participants: [], missions: [], userMissions: [], transactions: [], rewards: [], redemptions: [], badges: [], badgeTemplates: [], bannedUsers: [] };
}

function loadState(): DBState {
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored ? JSON.parse(stored) : getInitialState();
}

function saveState(state: DBState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export const db = {
  async getDevUsers(): Promise<User[]> {
    const s = loadState();
    return s.users;
  },
  
  async loginOrCreateUser(email: string, name: string, avatarUrl?: string): Promise<User> {
    const s = loadState();
    let user = s.users.find(u => u.email === email);
    if (!user) {
      user = { id: generateId(), name, email, avatarUrl: avatarUrl || `https://api.dicebear.com/9.x/avataaars/svg?seed=${name}`, createdAt: new Date().toISOString() };
      s.users.push(user);
      saveState(s);
    } else if (avatarUrl && !user.avatarUrl.includes("dicebear")) {
      user.avatarUrl = avatarUrl;
      user.name = name; // Update name as well from latest google login
      saveState(s);
    }
    return user;
  },

  async createEvent(creatorId: string, name: string, description: string, startDate: string, endDate: string, imageUrl?: string): Promise<Event> {
    const s = loadState();
    const event: Event = {
      id: generateId(), creatorId, name, description, startDate, endDate, status: 'Draft', imageUrl,
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
    };
    s.events.push(event);

    s.badgeTemplates = s.badgeTemplates || [];
    s.badgeTemplates.push({ id: generateId(), eventId: event.id, name: 'Participant', tier: 'Participation', description: 'Awarded to all participants', imageUrl: `https://api.dicebear.com/9.x/shapes/svg?seed=Participant-${event.id}` });
    s.badgeTemplates.push({ id: generateId(), eventId: event.id, name: 'Champion', tier: 'Top 1', description: 'Awarded to the 1st place winner', imageUrl: `https://api.dicebear.com/9.x/shapes/svg?seed=Champion-${event.id}` });
    s.badgeTemplates.push({ id: generateId(), eventId: event.id, name: 'Pro', tier: 'Top 2-5', description: 'Awarded to ranks 2 through 5', imageUrl: `https://api.dicebear.com/9.x/shapes/svg?seed=Pro-${event.id}` });

    saveState(s);
    return event;
  },

  async getEventOverviewStats(eventId: string) {
    const s = loadState();
    const participantsCount = s.participants.filter(p => p.eventId === eventId).length;
    const earnedTx = s.transactions.filter(t => t.eventId === eventId && t.type === 'Earned');
    const totalTokensEarned = earnedTx.reduce((acc, t) => acc + t.amount, 0);
    const missionsCompletedCount = s.userMissions.filter(um => um.eventId === eventId).length;
    return { participantsCount, totalTokensEarned, missionsCompletedCount };
  },

  async getCreatorMissions(eventId: string) {
    const s = loadState();
    const missions = s.missions.filter(m => m.eventId === eventId);
    return missions.map(m => {
      const completions = s.userMissions.filter(um => um.missionId === m.id).length;
      return { ...m, completionsCount: completions, totalTokensEarned: completions * m.tokenReward };
    });
  },

  async getCreatorRewards(eventId: string) {
    const s = loadState();
    const rewards = s.rewards.filter(r => r.eventId === eventId);
    return rewards.map(r => {
      const claims = s.redemptions.filter(rd => rd.rewardId === r.id).length;
      return { ...r, claimsCount: claims, totalTokensSpent: claims * r.tokenCost };
    });
  },

  async getEvents(): Promise<Event[]> {
     const s = loadState();
     let modified = false;
     
     s.events.forEach(e => {
       if (e.status === 'Draft' || e.status === 'Canceled' || e.status === 'Ended') return;
       // if Live or Upcoming, check date
       const end = new Date(e.endDate).getTime();
       // add 1 day to end date to represent strictly passing it (e.g. at midnight of end date)
       if (Date.now() > end + 86400000) {
         e.status = 'Ended';
         e.updatedAt = new Date().toISOString();
         s.updates = s.updates || [];
         s.updates.push({ id: generateId(), eventId: e.id, title: `Event Status Updated: Ended`, description: `The event has concluded automatically based on the end date.`, createdAt: new Date().toISOString() });
         
         const sums: Record<string, number> = {};
         const pts = s.transactions.filter(t => t.eventId === e.id && t.type === 'Earned');
         pts.forEach(t => { sums[t.userId] = (sums[t.userId] ?? 0) + t.amount; });
         
         const leaderboard = Object.entries(sums)
           .map(([userId, score]) => ({ userId, score }))
           .sort((a, b) => b.score - a.score)
           .map((u, i) => ({ ...u, rank: i + 1 }));

         const templates = (s.badgeTemplates || []).filter(bt => bt.eventId === e.id);
         const parts = s.participants.filter(p => p.eventId === e.id);

         parts.forEach(p => {
           let tier: BadgeTier = 'Participation';
           let name = "Participant Badge";
           let img = "https://images.unsplash.com/photo-1558591710-4b4a1ae0f04d?w=400&q=80"; // Default Star
           const uScore = leaderboard.find(l => l.userId === p.userId);
           const rnk = uScore?.rank;

           if (rnk === 1) {
             const t1 = templates.find(t => t.tier === 'Top 1');
             if (t1) { tier = 'Top 1'; name = t1.name; img = t1.imageUrl; }
             else { tier = 'Top 1'; name = "1st Place Champion"; img = "https://images.unsplash.com/photo-1491438590914-bc09fcaaf77a?w=400&q=80"; }
           } else if (rnk && rnk >= 2 && rnk <= 5) {
             const t2 = templates.find(t => t.tier === 'Top 2-5');
             if (t2) { tier = 'Top 2-5'; name = t2.name; img = t2.imageUrl; }
             else { tier = 'Top 2-5'; name = "Top Performer"; img = "https://images.unsplash.com/photo-1507676184212-d0330a15673c?w=400&q=80"; }
           } else {
             const tP = templates.find(t => t.tier === 'Participation');
             if (tP) { name = tP.name; img = tP.imageUrl; }
           }

           if (!s.badges.find(b => b.eventId === e.id && b.userId === p.userId)) {
             // Let's add tier to ParticipationBadge locally if needed, but the type demands badgeTitle, issueDate, confirmationText.
             // We can do an intersection or ignore typescript if needed, or simply map it to `badgeTitle`: tier + " - " + name... Wait!
             // `ParticipationBadge` in types is `{ id: string; eventId: string; userId: string; badgeTitle: string; issueDate: string; confirmationText: string; imageUrl?: string; }`
             s.badges.push({
               id: generateId(),
               eventId: e.id,
               userId: p.userId,
               badgeTitle: tier !== 'Participation' ? `${tier} - ${name}` : name,
               issueDate: new Date().toISOString(),
               confirmationText: `Awarded for participation in this event.`,
               imageUrl: img
             });
           }
         });
         modified = true;
       }
     });

     if (modified) saveState(s);
     return s.events;
  },

  async getEvent(id: string): Promise<Event | undefined> { 
     const events = await this.getEvents();
     return events.find(e => e.id === id); 
  },

  async setEventStatus(eventId: string, status: EventStatus, currentUserId: string): Promise<Event> {
    const s = loadState();
    const event = s.events.find(e => e.id === eventId);
    if (!event || event.creatorId !== currentUserId) throw new Error("Unauthorized or not found");
    
    event.status = status;
    event.updatedAt = new Date().toISOString();

    s.updates = s.updates || [];
    s.updates.push({ id: generateId(), eventId, title: `Event Status Updated: ${status}`, description: `The event is now in ${status} phase.`, createdAt: new Date().toISOString() });

    // If transitioning to Ended, generate badges
    if (status === 'Ended') {
      const participants = s.participants.filter(p => p.eventId === eventId);
      
      const sums: Record<string, number> = {};
      const pts = s.transactions.filter(t => t.eventId === eventId && t.type === 'Earned');
      pts.forEach(t => { sums[t.userId] = (sums[t.userId] ?? 0) + t.amount; });
      
      const leaderboard = Object.entries(sums)
        .map(([userId, score]) => ({ userId, score }))
        .sort((a, b) => b.score - a.score)
        .map((u, i) => ({ ...u, rank: i + 1 }));

      const templates = (s.badgeTemplates || []).filter(bt => bt.eventId === eventId);

      for (const p of participants) {
        const lbEntry = leaderboard.find(l => l.userId === p.userId);
        const rank = lbEntry ? lbEntry.rank : 9999;

        const awardBadge = (tpl: any) => {
          if (!tpl) return;
          if (!s.badges.find(b => b.eventId === eventId && b.userId === p.userId && b.badgeTitle === tpl.name)) {
            s.badges.push({
              id: generateId(), eventId, userId: p.userId, badgeTitle: tpl.name,
              issueDate: new Date().toISOString(), confirmationText: tpl.description,
              imageUrl: tpl.imageUrl || `https://api.dicebear.com/9.x/shapes/svg?seed=${tpl.name}-${eventId}`
            });
          }
        };

        awardBadge(templates.find(t => t.tier === 'Participation'));
        if (rank === 1) awardBadge(templates.find(t => t.tier === 'Top 1'));
        if (rank >= 2 && rank <= 5) awardBadge(templates.find(t => t.tier === 'Top 2-5'));
      }
    }
    saveState(s);
    return event;
  },

  async joinEvent(eventId: string, userId: string): Promise<void> {
    const s = loadState();
    if (s.bannedUsers?.find(b => b.eventId === eventId && b.userId === userId)) {
      throw new Error("You have been banned from this event.");
    }
    if (s.participants.find(p => p.eventId === eventId && p.userId === userId)) return;
    s.participants.push({ id: generateId(), eventId, userId, joinedAt: new Date().toISOString() });
    saveState(s);
  },

  async getParticipantStats(userId: string) {
    const s = loadState();
    return { joinedCount: s.participants.filter(p => p.userId === userId).length, createdCount: s.events.filter(e => e.creatorId === userId).length };
  },
  
  async getJoinedEvents(userId: string): Promise<Event[]> {
    const s = loadState();
    const eventIds = s.participants.filter(p => p.userId === userId).map(p => p.eventId);
    return s.events.filter(e => eventIds.includes(e.id));
  },

  async hasJoined(eventId: string, userId: string): Promise<boolean> {
    const s = loadState();
    if (s.bannedUsers?.find(b => b.eventId === eventId && b.userId === userId)) return false;
    return s.participants.some(p => p.eventId === eventId && p.userId === userId);
  },

  async getEventParticipantsWithDetails(eventId: string) {
    const s = loadState();
    const participants = s.participants.filter(p => p.eventId === eventId);
    return participants.map(p => {
      const user = s.users.find(u => u.id === p.userId);
      return { ...p, user };
    });
  },

  async banUser(eventId: string, userId: string, reason: string) {
    const s = loadState();
    s.bannedUsers = s.bannedUsers || [];
    if (!s.bannedUsers.find(b => b.eventId === eventId && b.userId === userId)) {
      s.bannedUsers.push({ id: generateId(), eventId, userId, reason, createdAt: new Date().toISOString() });
    }
    // Remove from participants
    s.participants = s.participants.filter(p => !(p.eventId === eventId && p.userId === userId));
    saveState(s);
  },

  async getBannedUsers(eventId: string) {
    const s = loadState();
    const banned = (s.bannedUsers || []).filter(b => b.eventId === eventId);
    return banned.map(b => {
      const user = s.users.find(u => u.id === b.userId);
      return { ...b, user };
    });
  },

  // Missions
  async addMission(eventId: string, creatorId: string, title: string, description: string, tokenReward: number, isActive: boolean): Promise<Mission> {
    const s = loadState();
    if (s.missions.some(m => m.eventId === eventId && m.title.trim().toLowerCase() === title.trim().toLowerCase())) {
      throw new Error("A mission with this exact same title already exists.");
    }
    const mission: Mission = { id: generateId(), eventId, createdBy: creatorId, title, description, tokenReward, isActive, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    s.missions.push(mission);
    s.updates = s.updates || [];
    s.updates.push({ id: generateId(), eventId, title: `New Mission: ${title}`, description: `A new mission worth ${tokenReward} TKN was added.`, createdAt: new Date().toISOString() });
    saveState(s);
    return mission;
  },

  async getMissions(eventId: string, userId?: string) {
    const s = loadState();
    const missions = s.missions.filter(m => m.eventId === eventId);
    if (!userId) return missions;
    const userMissions = s.userMissions.filter(um => um.userId === userId && um.eventId === eventId);
    return missions.map(m => ({ ...m, status: userMissions.some(um => um.missionId === m.id) ? 'Completed' : 'Active' }));
  },

  async completeMission(eventId: string, missionId: string, userId: string): Promise<void> {
    const s = loadState();
    const event = s.events.find(e => e.id === eventId);
    if (event?.status === 'Ended') throw new Error("Event has ended");

    if (s.userMissions.some(um => um.missionId === missionId && um.userId === userId)) throw new Error("Already completed");
    
    const mission = s.missions.find(m => m.id === missionId);
    if (!mission || !mission.isActive) throw new Error("Mission not active");

    s.userMissions.push({ id: generateId(), eventId, missionId, userId, status: 'Completed', completedAt: new Date().toISOString() });
    s.transactions.push({ id: generateId(), eventId, userId, amount: mission.tokenReward, type: 'Earned', reason: `Completed: ${mission.title}`, createdAt: new Date().toISOString() });
    saveState(s);
  },

  // Wallet and Leaderboard
  async getWallet(eventId: string, userId: string) {
    const s = loadState();
    const tx = s.transactions.filter(t => t.eventId === eventId && t.userId === userId).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    const balance = tx.reduce((sum, t) => sum + (t.type === 'Earned' ? t.amount : -t.amount), 0);
    return { balance, transactions: tx };
  },

  async getLeaderboard(eventId: string) {
    const s = loadState();
    const sums: Record<string, number> = {};
    const pts = s.transactions.filter(t => t.eventId === eventId && t.type === 'Earned');
    pts.forEach(t => { sums[t.userId] = (sums[t.userId] ?? 0) + t.amount; });
    
    return Object.entries(sums)
      .map(([userId, score]) => ({ userId, name: s.users.find(u => u.id === userId)?.name || 'Unknown', score }))
      .sort((a, b) => b.score - a.score)
      .map((user, index) => ({ ...user, rank: index + 1 }));
  },

  // Rewards
  async addReward(eventId: string, creatorId: string, name: string, description: string, tokenCost: number, inventory: number, imageUrl?: string): Promise<Reward> {
    const s = loadState();
    if (s.rewards.some(r => r.eventId === eventId && r.name.trim().toLowerCase() === name.trim().toLowerCase())) {
      throw new Error("A reward with this exact same name already exists.");
    }
    const reward: Reward = { id: generateId(), eventId, createdBy: creatorId, name, description, tokenCost, inventory, imageUrl, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    s.rewards.push(reward);
    s.updates = s.updates || [];
    s.updates.push({ id: generateId(), eventId, title: `New Reward: ${name}`, description: `A new reward was added! It costs ${tokenCost} TKN.`, createdAt: new Date().toISOString() });
    saveState(s);
    return reward;
  },

  async getRewards(eventId: string): Promise<Reward[]> {
    return loadState().rewards.filter(r => r.eventId === eventId);
  },

  async redeemReward(eventId: string, rewardId: string, userId: string): Promise<void> {
    const s = loadState();
    const reward = s.rewards.find(r => r.id === rewardId);
    if (!reward || reward.inventory <= 0) throw new Error("Reward unavailable");

    const tx = s.transactions.filter(t => t.eventId === eventId && t.userId === userId);
    const balance = tx.reduce((sum, t) => sum + (t.type === 'Earned' ? t.amount : -t.amount), 0);
    
    if (balance < reward.tokenCost) throw new Error("Insufficient tokens");

    reward.inventory -= 1;
    s.redemptions.push({ id: generateId(), eventId, rewardId, userId, status: 'Redeemed', createdAt: new Date().toISOString() });
    s.transactions.push({ id: generateId(), eventId, userId, amount: reward.tokenCost, type: 'Spent', reason: `Redeemed: ${reward.name}`, createdAt: new Date().toISOString() });
    saveState(s);
  },

  // Badges
  async getBadgeTemplates(eventId: string) {
    const s = loadState();
    let templates = (s.badgeTemplates || []).filter(bt => bt.eventId === eventId);
    
    if (templates.length === 0) {
      // Seed default templates for legacy/existing events
      s.badgeTemplates = s.badgeTemplates || [];
      const newTemplates = [
        { id: generateId(), eventId, name: 'Participant', tier: 'Participation', description: 'Awarded to all participants', imageUrl: `https://api.dicebear.com/9.x/shapes/svg?seed=Participant-${eventId}` },
        { id: generateId(), eventId, name: 'Champion', tier: 'Top 1', description: 'Awarded to the 1st place winner', imageUrl: `https://api.dicebear.com/9.x/shapes/svg?seed=Champion-${eventId}` },
        { id: generateId(), eventId, name: 'Pro', tier: 'Top 2-5', description: 'Awarded to ranks 2 through 5', imageUrl: `https://api.dicebear.com/9.x/shapes/svg?seed=Pro-${eventId}` }
      ];
      s.badgeTemplates.push(...newTemplates);
      saveState(s);
      templates = newTemplates;
    }

    // Assign placeholder to legacy templates if missing
    templates.forEach(t => {
      if (!t.imageUrl) {
        t.imageUrl = `https://api.dicebear.com/9.x/shapes/svg?seed=${t.name}-${eventId}`;
      }
    });
    
    return templates;
  },

  async updateBadgeTemplate(templateId: string, name: string, description: string, imageUrl?: string) {
    const s = loadState();
    const bt = (s.badgeTemplates || []).find(b => b.id === templateId);
    if (bt) {
      bt.name = name;
      bt.description = description;
      if (imageUrl) bt.imageUrl = imageUrl;
      saveState(s);
    }
  },

  async getEventUpdates(eventId: string): Promise<EventUpdate[]> {
    const s = loadState();
    return (s.updates || []).filter(u => u.eventId === eventId).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },

  async addCustomBadgeTemplate(eventId: string, name: string, description: string, imageUrl: string) {
    const s = loadState();
    s.badgeTemplates = s.badgeTemplates || [];
    if (s.badgeTemplates.some(b => b.eventId === eventId && b.name.trim().toLowerCase() === name.trim().toLowerCase())) {
      throw new Error("A badge with this exact title already exists.");
    }
    const template = { id: generateId(), eventId, name, tier: 'Custom', description, imageUrl: imageUrl || `https://api.dicebear.com/9.x/shapes/svg?seed=${name}-${eventId}` };
    s.badgeTemplates.push(template);
    saveState(s);
    return template;
  },

  async getBadges(userId: string) {
    const s = loadState();
    return s.badges.filter(b => b.userId === userId).map(b => {
      const event = s.events.find(e => e.id === b.eventId);
      return { ...b, eventName: event?.name || 'Local Event' };
    });
  },
  
  async getEventBadge(eventId: string, userId: string) {
    return loadState().badges.find(b => b.eventId === eventId && b.userId === userId);
  }
};
