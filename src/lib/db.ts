import { User, Event, EventParticipant, Mission, UserMission, TokenTransaction, Reward, Redemption, ParticipationBadge, EventStatus, BadgeTier } from '../types';
import { generateId } from './utils';
import { firestoreDb, storage } from './firebase';
import { collection, doc, getDoc, getDocs, setDoc, query, where, updateDoc, writeBatch, orderBy, deleteDoc } from 'firebase/firestore';
import { ref, uploadString, getDownloadURL } from 'firebase/storage';

export interface EventUpdate { id: string; eventId: string; title: string; description: string; createdAt: string; }

// Helper query function
const fetchDocs = async <T,>(colName: string, filters: {field: string, op: '==', val: any}[] = []): Promise<T[]> => {
  let q: any = collection(firestoreDb, colName);
  filters.forEach(f => {
    q = query(q, where(f.field, f.op, f.val));
  });
  const snap = await getDocs(q);
  return snap.docs.map(d => d.data() as T);
};

export const db = {
  async getDevUsers(): Promise<User[]> {
    return fetchDocs<User>('users');
  },
  
  async loginOrCreateUser(email: string, name: string, avatarUrl?: string): Promise<User> {
    const q = query(collection(firestoreDb, 'users'), where('email', '==', email));
    const snap = await getDocs(q);
    if (!snap.empty) {
      const docSnap = snap.docs[0];
      const user = docSnap.data() as User;
      if (avatarUrl && !user.avatarUrl.includes("dicebear") && user.avatarUrl !== avatarUrl) {
         user.avatarUrl = avatarUrl;
         user.name = name;
         await updateDoc(docSnap.ref, { avatarUrl, name });
      }
      return user;
    } else {
      const id = generateId();
      const user: User = { id, name, email, avatarUrl: avatarUrl || `https://api.dicebear.com/9.x/avataaars/svg?seed=${name}`, createdAt: new Date().toISOString() };
      await setDoc(doc(firestoreDb, 'users', id), user);
      return user;
    }
  },

  async createEvent(creatorId: string, name: string, description: string, startDate: string, endDate: string, imageUrl?: string): Promise<Event> {
    const id = generateId();
    let finalImageUrl = imageUrl;
    
    if (imageUrl && imageUrl.startsWith('data:image')) {
       const storageRef = ref(storage, `events/${id}.jpg`);
       await uploadString(storageRef, imageUrl, 'data_url');
       finalImageUrl = await getDownloadURL(storageRef);
    }

    const event: Event = {
      id, creatorId, name, description, startDate, endDate, status: 'Draft', imageUrl: finalImageUrl,
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
    };
    
    await setDoc(doc(firestoreDb, 'events', id), event);

    const templates = [
      { id: generateId(), eventId: id, name: 'Participant', tier: 'Participation', description: 'Awarded to all participants', imageUrl: `https://api.dicebear.com/9.x/shapes/svg?seed=Participant-${id}` },
      { id: generateId(), eventId: id, name: 'Champion', tier: 'Top 1', description: 'Awarded to the 1st place winner', imageUrl: `https://api.dicebear.com/9.x/shapes/svg?seed=Champion-${id}` },
      { id: generateId(), eventId: id, name: 'Pro', tier: 'Top 2-5', description: 'Awarded to ranks 2 through 5', imageUrl: `https://api.dicebear.com/9.x/shapes/svg?seed=Pro-${id}` }
    ];
    
    const batch = writeBatch(firestoreDb);
    templates.forEach(t => {
       batch.set(doc(firestoreDb, 'badgeTemplates', t.id), t);
    });
    await batch.commit();

    return event;
  },

  async getEventOverviewStats(eventId: string) {
    const parts = await fetchDocs<EventParticipant>('participants', [{field: 'eventId', op: '==', val: eventId}]);
    const earnedTx = await fetchDocs<TokenTransaction>('transactions', [{field: 'eventId', op: '==', val: eventId}, {field: 'type', op: '==', val: 'Earned'}]);
    const totalTokensEarned = earnedTx.reduce((acc, t) => acc + t.amount, 0);
    const missionsCompleted = await fetchDocs<UserMission>('userMissions', [{field: 'eventId', op: '==', val: eventId}]);
    return { participantsCount: parts.length, totalTokensEarned, missionsCompletedCount: missionsCompleted.length };
  },

  async getCreatorMissions(eventId: string) {
    const missions = await fetchDocs<Mission>('missions', [{field: 'eventId', op: '==', val: eventId}]);
    const allUserMissions = await fetchDocs<UserMission>('userMissions', [{field: 'eventId', op: '==', val: eventId}]);
    
    return missions.map(m => {
      const completions = allUserMissions.filter(um => um.missionId === m.id).length;
      return { ...m, completionsCount: completions, totalTokensEarned: completions * m.tokenReward };
    });
  },

  async getCreatorRewards(eventId: string) {
    const rewards = await fetchDocs<Reward>('rewards', [{field: 'eventId', op: '==', val: eventId}]);
    const allRedemptions = await fetchDocs<Redemption>('redemptions', [{field: 'eventId', op: '==', val: eventId}]);
    
    return rewards.map(r => {
      const claims = allRedemptions.filter(rd => rd.rewardId === r.id).length;
      return { ...r, claimsCount: claims, totalTokensSpent: claims * r.tokenCost };
    });
  },

  async getEvents(): Promise<Event[]> {
    const events = await fetchDocs<Event>('events');
    const batch = writeBatch(firestoreDb);
    let modified = false;

    // Cache to prevent N+1 queries during status generation
    let transactions: TokenTransaction[] | null = null;
    let badgeTemplates: any[] | null = null;
    let participants: EventParticipant[] | null = null;
    let existingBadges: ParticipationBadge[] | null = null;

    for (const e of events) {
      if (e.status === 'Draft' || e.status === 'Canceled' || e.status === 'Ended') continue;
      const end = new Date(e.endDate).getTime();
      
      if (Date.now() > end + 86400000) {
        e.status = 'Ended';
        e.updatedAt = new Date().toISOString();
        batch.update(doc(firestoreDb, 'events', e.id), { status: 'Ended', updatedAt: e.updatedAt });
        
        const updateDocId = generateId();
        batch.set(doc(firestoreDb, 'updates', updateDocId), { id: updateDocId, eventId: e.id, title: `Event Status Updated: Ended`, description: `The event has concluded automatically based on the end date.`, createdAt: new Date().toISOString() });
        modified = true;

        if (!transactions) {
           transactions = await fetchDocs<TokenTransaction>('transactions');
           badgeTemplates = await fetchDocs<any>('badgeTemplates');
           participants = await fetchDocs<EventParticipant>('participants');
           existingBadges = await fetchDocs<ParticipationBadge>('badges');
        }

        const sums: Record<string, number> = {};
        const pts = transactions.filter(t => t.eventId === e.id && t.type === 'Earned');
        pts.forEach(t => { sums[t.userId] = (sums[t.userId] ?? 0) + t.amount; });
        
        const leaderboard = Object.entries(sums)
          .map(([userId, score]) => ({ userId, score }))
          .sort((a, b) => b.score - a.score)
          .map((u, i) => ({ ...u, rank: i + 1 }));

        const templates = badgeTemplates!.filter(bt => bt.eventId === e.id);
        const parts = participants!.filter(p => p.eventId === e.id);

        parts.forEach(p => {
          let tier: BadgeTier = 'Participation';
          let name = "Participant Badge";
          let img = "https://images.unsplash.com/photo-1558591710-4b4a1ae0f04d?w=400&q=80";
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

          if (!existingBadges!.find(b => b.eventId === e.id && b.userId === p.userId)) {
             const bId = generateId();
             const badgeData = {
               id: bId,
               eventId: e.id,
               userId: p.userId,
               badgeTitle: tier !== 'Participation' ? `${tier} - ${name}` : name,
               issueDate: new Date().toISOString(),
               confirmationText: `Awarded for participation in this event.`,
               imageUrl: img
             };
             batch.set(doc(firestoreDb, 'badges', bId), badgeData);
             existingBadges!.push(badgeData);
          }
        });
      }
    }
    
    if (modified) await batch.commit();
    return events;
  },

  async getEvent(id: string): Promise<Event | undefined> { 
     const snap = await getDoc(doc(firestoreDb, 'events', id));
     if (snap.exists()) return snap.data() as Event;
     return undefined;
  },

  async setEventStatus(eventId: string, status: EventStatus, currentUserId: string): Promise<Event> {
    const eventRef = doc(firestoreDb, 'events', eventId);
    const snap = await getDoc(eventRef);
    if (!snap.exists()) throw new Error("Event not found");
    const event = snap.data() as Event;
    
    if (event.creatorId !== currentUserId) throw new Error("Unauthorized");
    
    event.status = status;
    event.updatedAt = new Date().toISOString();

    const batch = writeBatch(firestoreDb);
    batch.update(eventRef, { status: event.status, updatedAt: event.updatedAt });

    const updateDocId = generateId();
    batch.set(doc(firestoreDb, 'updates', updateDocId), { id: updateDocId, eventId, title: `Event Status Updated: ${status}`, description: `The event is now in ${status} phase.`, createdAt: new Date().toISOString() });

    if (status === 'Ended') {
      const participants = await fetchDocs<EventParticipant>('participants', [{field: 'eventId', op: '==', val: eventId}]);
      const txs = await fetchDocs<TokenTransaction>('transactions', [{field: 'eventId', op: '==', val: eventId}, {field: 'type', op: '==', val: 'Earned'}]);
      const templates = await fetchDocs<any>('badgeTemplates', [{field: 'eventId', op: '==', val: eventId}]);
      const existingBadges = await fetchDocs<ParticipationBadge>('badges', [{field: 'eventId', op: '==', val: eventId}]);

      const sums: Record<string, number> = {};
      txs.forEach(t => { sums[t.userId] = (sums[t.userId] ?? 0) + t.amount; });
      
      const leaderboard = Object.entries(sums)
        .map(([userId, score]) => ({ userId, score }))
        .sort((a, b) => b.score - a.score)
        .map((u, i) => ({ ...u, rank: i + 1 }));

      for (const p of participants) {
        const lbEntry = leaderboard.find(l => l.userId === p.userId);
        const rank = lbEntry ? lbEntry.rank : 9999;
        
        const awardBadge = (tpl: any) => {
          if (!tpl) return;
          if (!existingBadges.find(b => b.userId === p.userId && b.badgeTitle === tpl.name)) {
             const bId = generateId();
             const badgeData = {
                id: bId, eventId, userId: p.userId, badgeTitle: tpl.name,
                issueDate: new Date().toISOString(), confirmationText: tpl.description,
                imageUrl: tpl.imageUrl || `https://api.dicebear.com/9.x/shapes/svg?seed=${tpl.name}-${eventId}`
             };
             batch.set(doc(firestoreDb, 'badges', bId), badgeData);
             existingBadges.push(badgeData);
          }
        };

        awardBadge(templates.find(t => t.tier === 'Participation'));
        if (rank === 1) awardBadge(templates.find(t => t.tier === 'Top 1'));
        if (rank >= 2 && rank <= 5) awardBadge(templates.find(t => t.tier === 'Top 2-5'));
      }
    }
    
    await batch.commit();
    return event;
  },

  async joinEvent(eventId: string, userId: string): Promise<void> {
    const banned = await fetchDocs<any>('bannedUsers', [{field: 'eventId', op: '==', val: eventId}, {field: 'userId', op: '==', val: userId}]);
    if (banned.length > 0) throw new Error("You have been banned from this event.");
    
    const parts = await fetchDocs<EventParticipant>('participants', [{field: 'eventId', op: '==', val: eventId}, {field: 'userId', op: '==', val: userId}]);
    if (parts.length > 0) return;

    const id = generateId();
    await setDoc(doc(firestoreDb, 'participants', id), { id, eventId, userId, joinedAt: new Date().toISOString() });
  },

  async getParticipantStats(userId: string) {
    const parts = await fetchDocs<EventParticipant>('participants', [{field: 'userId', op: '==', val: userId}]);
    const created = await fetchDocs<Event>('events', [{field: 'creatorId', op: '==', val: userId}]);
    return { joinedCount: parts.length, createdCount: created.length };
  },
  
  async getJoinedEvents(userId: string): Promise<Event[]> {
    const parts = await fetchDocs<EventParticipant>('participants', [{field: 'userId', op: '==', val: userId}]);
    const eventIds = parts.map(p => p.eventId);
    if (eventIds.length === 0) return [];
    
    // Firestore max in query list is 10. For simplicity in porting, fetch all and filter or batch fetch.
    const allEvents = await fetchDocs<Event>('events');
    return allEvents.filter(e => eventIds.includes(e.id));
  },

  async hasJoined(eventId: string, userId: string): Promise<boolean> {
    const banned = await fetchDocs<any>('bannedUsers', [{field: 'eventId', op: '==', val: eventId}, {field: 'userId', op: '==', val: userId}]);
    if (banned.length > 0) return false;
    
    const parts = await fetchDocs<EventParticipant>('participants', [{field: 'eventId', op: '==', val: eventId}, {field: 'userId', op: '==', val: userId}]);
    return parts.length > 0;
  },

  async getEventParticipantsWithDetails(eventId: string) {
    const parts = await fetchDocs<EventParticipant>('participants', [{field: 'eventId', op: '==', val: eventId}]);
    const users = await fetchDocs<User>('users');
    return parts.map(p => {
      const user = users.find(u => u.id === p.userId);
      return { ...p, user };
    });
  },

  async banUser(eventId: string, userId: string, reason: string) {
    const banned = await fetchDocs<any>('bannedUsers', [{field: 'eventId', op: '==', val: eventId}, {field: 'userId', op: '==', val: userId}]);
    if (banned.length === 0) {
       const id = generateId();
       await setDoc(doc(firestoreDb, 'bannedUsers', id), { id, eventId, userId, reason, createdAt: new Date().toISOString() });
    }
    const parts = await fetchDocs<EventParticipant>('participants', [{field: 'eventId', op: '==', val: eventId}, {field: 'userId', op: '==', val: userId}]);
    if (parts.length > 0) {
       await deleteDoc(doc(firestoreDb, 'participants', parts[0].id));
    }
  },

  async getBannedUsers(eventId: string) {
    const banned = await fetchDocs<any>('bannedUsers', [{field: 'eventId', op: '==', val: eventId}]);
    const users = await fetchDocs<User>('users');
    return banned.map(b => {
      const user = users.find(u => u.id === b.userId);
      return { ...b, user };
    });
  },

  async addMission(eventId: string, creatorId: string, title: string, description: string, tokenReward: number, isActive: boolean): Promise<Mission> {
    const existing = await fetchDocs<Mission>('missions', [{field: 'eventId', op: '==', val: eventId}]);
    if (existing.some(m => m.title.trim().toLowerCase() === title.trim().toLowerCase())) {
      throw new Error("A mission with this exact same title already exists.");
    }
    const mission: Mission = { id: generateId(), eventId, createdBy: creatorId, title, description, tokenReward, isActive, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    
    const batch = writeBatch(firestoreDb);
    batch.set(doc(firestoreDb, 'missions', mission.id), mission);
    
    const updateId = generateId();
    batch.set(doc(firestoreDb, 'updates', updateId), { id: updateId, eventId, title: `New Mission: ${title}`, description: `A new mission worth ${tokenReward} TKN was added.`, createdAt: new Date().toISOString() });
    
    await batch.commit();
    return mission;
  },

  async getMissions(eventId: string, userId?: string) {
    const missions = await fetchDocs<Mission>('missions', [{field: 'eventId', op: '==', val: eventId}]);
    if (!userId) return missions;
    const userMissions = await fetchDocs<UserMission>('userMissions', [{field: 'eventId', op: '==', val: eventId}, {field: 'userId', op: '==', val: userId}]);
    return missions.map(m => ({ ...m, status: userMissions.some(um => um.missionId === m.id) ? 'Completed' : 'Active' }));
  },

  async completeMission(eventId: string, missionId: string, userId: string): Promise<void> {
    const eventRef = doc(firestoreDb, 'events', eventId);
    const eventSnap = await getDoc(eventRef);
    if (!eventSnap.exists() || (eventSnap.data() as Event).status === 'Ended') throw new Error("Event has ended");

    const existing = await fetchDocs<UserMission>('userMissions', [{field: 'missionId', op: '==', val: missionId}, {field: 'userId', op: '==', val: userId}]);
    if (existing.length > 0) throw new Error("Already completed");
    
    const missionRef = doc(firestoreDb, 'missions', missionId);
    const missionSnap = await getDoc(missionRef);
    if (!missionSnap.exists() || !(missionSnap.data() as Mission).isActive) throw new Error("Mission not active");
    
    const mission = missionSnap.data() as Mission;
    const batch = writeBatch(firestoreDb);

    const umId = generateId();
    batch.set(doc(firestoreDb, 'userMissions', umId), { id: umId, eventId, missionId, userId, status: 'Completed', completedAt: new Date().toISOString() });
    
    const txId = generateId();
    batch.set(doc(firestoreDb, 'transactions', txId), { id: txId, eventId, userId, amount: mission.tokenReward, type: 'Earned', reason: `Completed: ${mission.title}`, createdAt: new Date().toISOString() });
    
    await batch.commit();
  },

  async getWallet(eventId: string, userId: string) {
    const tx = await fetchDocs<TokenTransaction>('transactions', [{field: 'eventId', op: '==', val: eventId}, {field: 'userId', op: '==', val: userId}]);
    tx.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    const balance = tx.reduce((sum, t) => sum + (t.type === 'Earned' ? t.amount : -t.amount), 0);
    return { balance, transactions: tx };
  },

  async getLeaderboard(eventId: string) {
    const txs = await fetchDocs<TokenTransaction>('transactions', [{field: 'eventId', op: '==', val: eventId}, {field: 'type', op: '==', val: 'Earned'}]);
    const users = await fetchDocs<User>('users');
    
    const sums: Record<string, number> = {};
    txs.forEach(t => { sums[t.userId] = (sums[t.userId] ?? 0) + t.amount; });
    
    return Object.entries(sums)
      .map(([userId, score]) => ({ userId, name: users.find(u => u.id === userId)?.name || 'Unknown', score }))
      .sort((a, b) => b.score - a.score)
      .map((user, index) => ({ ...user, rank: index + 1 }));
  },

  async addReward(eventId: string, creatorId: string, name: string, description: string, tokenCost: number, inventory: number, imageUrl?: string): Promise<Reward> {
    const existing = await fetchDocs<Reward>('rewards', [{field: 'eventId', op: '==', val: eventId}]);
    if (existing.some(r => r.name.trim().toLowerCase() === name.trim().toLowerCase())) {
      throw new Error("A reward with this exact same name already exists.");
    }
    
    const id = generateId();
    let finalImageUrl = imageUrl;
    if (imageUrl && imageUrl.startsWith('data:image')) {
       const storageRef = ref(storage, `rewards/${id}.jpg`);
       await uploadString(storageRef, imageUrl, 'data_url');
       finalImageUrl = await getDownloadURL(storageRef);
    }
    
    const reward: Reward = { id, eventId, createdBy: creatorId, name, description, tokenCost, inventory, imageUrl: finalImageUrl, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    
    const batch = writeBatch(firestoreDb);
    batch.set(doc(firestoreDb, 'rewards', id), reward);

    const updateId = generateId();
    batch.set(doc(firestoreDb, 'updates', updateId), { id: updateId, eventId, title: `New Reward: ${name}`, description: `A new reward was added! It costs ${tokenCost} TKN.`, createdAt: new Date().toISOString() });
    
    await batch.commit();
    return reward;
  },

  async getRewards(eventId: string): Promise<Reward[]> {
    return fetchDocs<Reward>('rewards', [{field: 'eventId', op: '==', val: eventId}]);
  },

  async redeemReward(eventId: string, rewardId: string, userId: string): Promise<void> {
    const rewardRef = doc(firestoreDb, 'rewards', rewardId);
    const rewardSnap = await getDoc(rewardRef);
    if (!rewardSnap.exists()) throw new Error("Reward unavailable");
    const reward = rewardSnap.data() as Reward;
    if (reward.inventory <= 0) throw new Error("Reward unavailable");

    const tx = await fetchDocs<TokenTransaction>('transactions', [{field: 'eventId', op: '==', val: eventId}, {field: 'userId', op: '==', val: userId}]);
    const balance = tx.reduce((sum, t) => sum + (t.type === 'Earned' ? t.amount : -t.amount), 0);
    
    if (balance < reward.tokenCost) throw new Error("Insufficient tokens");

    const batch = writeBatch(firestoreDb);
    batch.update(rewardRef, { inventory: reward.inventory - 1 });
    
    const redId = generateId();
    batch.set(doc(firestoreDb, 'redemptions', redId), { id: redId, eventId, rewardId, userId, status: 'Redeemed', createdAt: new Date().toISOString() });
    
    const txId = generateId();
    batch.set(doc(firestoreDb, 'transactions', txId), { id: txId, eventId, userId, amount: reward.tokenCost, type: 'Spent', reason: `Redeemed: ${reward.name}`, createdAt: new Date().toISOString() });
    
    await batch.commit();
  },

  async getBadgeTemplates(eventId: string) {
    let templates = await fetchDocs<any>('badgeTemplates', [{field: 'eventId', op: '==', val: eventId}]);
    
    if (templates.length === 0) {
      const batch = writeBatch(firestoreDb);
      const newTemplates = [
        { id: generateId(), eventId, name: 'Participant', tier: 'Participation', description: 'Awarded to all participants', imageUrl: `https://api.dicebear.com/9.x/shapes/svg?seed=Participant-${eventId}` },
        { id: generateId(), eventId, name: 'Champion', tier: 'Top 1', description: 'Awarded to the 1st place winner', imageUrl: `https://api.dicebear.com/9.x/shapes/svg?seed=Champion-${eventId}` },
        { id: generateId(), eventId, name: 'Pro', tier: 'Top 2-5', description: 'Awarded to ranks 2 through 5', imageUrl: `https://api.dicebear.com/9.x/shapes/svg?seed=Pro-${eventId}` }
      ];
      newTemplates.forEach(t => batch.set(doc(firestoreDb, 'badgeTemplates', t.id), t));
      await batch.commit();
      templates = newTemplates;
    }
    
    templates.forEach(t => {
      if (!t.imageUrl) t.imageUrl = `https://api.dicebear.com/9.x/shapes/svg?seed=${t.name}-${eventId}`;
    });
    return templates;
  },

  async updateBadgeTemplate(templateId: string, name: string, description: string, imageUrl?: string) {
    const updateData: any = { name, description };
    if (imageUrl) {
      if (imageUrl.startsWith('data:image')) {
         const storageRef = ref(storage, `badges/${templateId}.jpg`);
         await uploadString(storageRef, imageUrl, 'data_url');
         updateData.imageUrl = await getDownloadURL(storageRef);
      } else {
         updateData.imageUrl = imageUrl;
      }
    }
    await updateDoc(doc(firestoreDb, 'badgeTemplates', templateId), updateData);
  },

  async getEventUpdates(eventId: string): Promise<EventUpdate[]> {
    const updates = await fetchDocs<EventUpdate>('updates', [{field: 'eventId', op: '==', val: eventId}]);
    return updates.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },

  async addCustomBadgeTemplate(eventId: string, name: string, description: string, imageUrl: string) {
    const existing = await fetchDocs<any>('badgeTemplates', [{field: 'eventId', op: '==', val: eventId}]);
    if (existing.some(b => b.name.trim().toLowerCase() === name.trim().toLowerCase())) {
      throw new Error("A badge with this exact title already exists.");
    }
    
    const id = generateId();
    let finalImageUrl = imageUrl || `https://api.dicebear.com/9.x/shapes/svg?seed=${name}-${eventId}`;
    if (imageUrl && imageUrl.startsWith('data:image')) {
       const storageRef = ref(storage, `badges/${id}.jpg`);
       await uploadString(storageRef, imageUrl, 'data_url');
       finalImageUrl = await getDownloadURL(storageRef);
    }

    const template = { id, eventId, name, tier: 'Custom', description, imageUrl: finalImageUrl };
    await setDoc(doc(firestoreDb, 'badgeTemplates', id), template);
    return template;
  },

  async getBadges(userId: string) {
    const badges = await fetchDocs<ParticipationBadge>('badges', [{field: 'userId', op: '==', val: userId}]);
    const events = await fetchDocs<Event>('events');
    return badges.map(b => {
      const event = events.find(e => e.id === b.eventId);
      return { ...b, eventName: event?.name || 'Local Event' };
    });
  },
  
  async getEventBadge(eventId: string, userId: string) {
    const badges = await fetchDocs<ParticipationBadge>('badges', [{field: 'eventId', op: '==', val: eventId}, {field: 'userId', op: '==', val: userId}]);
    return badges[0];
  }
};
