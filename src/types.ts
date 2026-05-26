export type EventStatus = 'Draft' | 'Upcoming' | 'Live' | 'Ended' | 'Canceled';
export type MissionStatus = 'Active' | 'Completed';
export type TransactionType = 'Earned' | 'Spent';
export type BadgeTier = 'Participation' | 'Top 1' | 'Top 2-5' | 'Custom';

export interface User { id: string; name: string; email: string; avatarUrl: string; createdAt: string; }
export interface Event { id: string; creatorId: string; name: string; description: string; startDate: string; endDate: string; status: EventStatus; imageUrl?: string; createdAt: string; updatedAt: string; }
export interface EventParticipant { id: string; eventId: string; userId: string; joinedAt: string; }
export interface Mission { id: string; eventId: string; createdBy: string; title: string; description: string; tokenReward: number; isActive: boolean; createdAt: string; updatedAt: string; }
export interface UserMission { id: string; eventId: string; missionId: string; userId: string; status: 'Completed'; completedAt: string; }
export interface TokenTransaction { id: string; eventId: string; userId: string; amount: number; type: TransactionType; reason: string; createdAt: string; }
export interface Reward { id: string; eventId: string; createdBy: string; name: string; description: string; tokenCost: number; inventory: number; imageUrl?: string; createdAt: string; updatedAt: string; }
export interface Redemption { id: string; eventId: string; rewardId: string; userId: string; status: 'Redeemed'; createdAt: string; }
export interface ParticipationBadge { id: string; eventId: string; userId: string; badgeTitle: string; issueDate: string; confirmationText: string; imageUrl?: string; }
export interface BannedUser { id: string; eventId: string; userId: string; reason: string; createdAt: string; }

export interface BadgeTemplate {
  id: string;
  eventId: string;
  name: string;
  tier: BadgeTier;
  description: string;
  imageUrl?: string;
}

