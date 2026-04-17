# @reasvyn/auth-team

> Team management module for auth-hub — multi-tenant workspace support with full CRUD, invitations, role hierarchy, and ready-made React UI.

## Features

- ✅ Full team CRUD (create, update, delete)
- ✅ Member management (add, remove, change roles)
- ✅ Invitation flow (invite by email, accept, decline, cancel)
- ✅ Role hierarchy: `owner > admin > member > viewer`
- ✅ Ownership transfer
- ✅ Active team persistence in `localStorage`
- ✅ Adapter pattern — bring your own database (Prisma, Drizzle, etc.)
- ✅ React components with Tailwind CSS + dark mode
- ✅ TypeScript strict

## Installation

```bash
pnpm add @reasvyn/auth-team
```

## Quick Start

```tsx
import { TeamProvider } from '@reasvyn/auth-team/react';
import { myTeamAdapter } from './lib/teamAdapter';

function App() {
  return (
    <TeamProvider adapter={myTeamAdapter} userId="user_123">
      <YourApp />
    </TeamProvider>
  );
}
```

## Implementing a `TeamAdapter`

The adapter is the persistence layer — implement it with your ORM/API:

```ts
import type { TeamAdapter } from '@reasvyn/auth-team';
import { db } from './db'; // your Prisma/Drizzle client

export const myTeamAdapter: TeamAdapter = {
  // ── Teams ──────────────────────────────────────────────────────────────────
  async listTeams(userId) {
    return db.team.findMany({ where: { members: { some: { userId } } } });
  },
  async createTeam(userId, input) {
    return db.team.create({
      data: { ...input, members: { create: { userId, role: 'owner' } } },
    });
  },
  async updateTeam(teamId, input) {
    return db.team.update({ where: { id: teamId }, data: input });
  },
  async deleteTeam(teamId) {
    await db.team.delete({ where: { id: teamId } });
  },

  // ── Members ─────────────────────────────────────────────────────────────────
  async listMembers(teamId) {
    return db.teamMember.findMany({ where: { teamId }, include: { user: true } });
  },
  async addMember(teamId, userId, role) {
    return db.teamMember.create({ data: { teamId, userId, role } });
  },
  async removeMember(teamId, userId) {
    await db.teamMember.delete({ where: { teamId_userId: { teamId, userId } } });
  },
  async updateMemberRole(teamId, userId, role) {
    return db.teamMember.update({
      where: { teamId_userId: { teamId, userId } },
      data: { role },
    });
  },

  // ── Invitations ─────────────────────────────────────────────────────────────
  async listInvitations(teamId) {
    return db.teamInvitation.findMany({ where: { teamId, status: 'pending' } });
  },
  async createInvitation(input) {
    return db.teamInvitation.create({ data: input });
  },
  async updateInvitationStatus(invitationId, status) {
    return db.teamInvitation.update({ where: { id: invitationId }, data: { status } });
  },

  // ── Optional ─────────────────────────────────────────────────────────────────
  async sendInvitationEmail(invitation, appBaseUrl) {
    const link = `${appBaseUrl}/accept-invite?token=${invitation.token}`;
    await emailService.send({
      to: invitation.email,
      subject: `You've been invited to join a team`,
      body: `Click here to accept: ${link}`,
    });
  },
};
```

### `TeamAdapter` Interface

```ts
interface TeamAdapter {
  // Teams
  listTeams(userId: string): Promise<Team[]>;
  createTeam(userId: string, input: CreateTeamInput): Promise<Team>;
  updateTeam(teamId: string, input: UpdateTeamInput): Promise<Team>;
  deleteTeam(teamId: string): Promise<void>;

  // Members
  listMembers(teamId: string): Promise<TeamMember[]>;
  addMember(teamId: string, userId: string, role: TeamRole): Promise<TeamMember>;
  removeMember(teamId: string, userId: string): Promise<void>;
  updateMemberRole(teamId: string, userId: string, role: TeamRole): Promise<TeamMember>;

  // Invitations
  listInvitations(teamId: string): Promise<TeamInvitation[]>;
  createInvitation(input: CreateInvitationInput): Promise<TeamInvitation>;
  updateInvitationStatus(invitationId: string, status: InvitationStatus): Promise<TeamInvitation>;

  // Optional
  sendInvitationEmail?(invitation: TeamInvitation, appBaseUrl?: string): Promise<void>;
}
```

## Core Types

```ts
type TeamRole = 'owner' | 'admin' | 'member' | 'viewer';
type InvitationStatus = 'pending' | 'accepted' | 'declined' | 'cancelled' | 'expired';

interface Team {
  id: string;
  name: string;
  slug: string;
  description?: string;
  ownerId: string;
  createdAt: Date;
  updatedAt: Date;
  metadata?: Record<string, unknown>;
}

interface TeamMember {
  id: string;
  teamId: string;
  userId: string;
  role: TeamRole;
  joinedAt: Date;
  user?: TeamMemberUser;  // optional populated relation
}

interface TeamInvitation {
  id: string;
  teamId: string;
  email: string;
  role: TeamRole;
  token: string;
  invitedBy: string;
  status: InvitationStatus;
  expiresAt: Date;
  createdAt: Date;
}
```

## React Hooks

### `useTeam()`

```tsx
import { useTeam } from '@reasvyn/auth-team/react';

const {
  currentTeam,   // Team | null
  currentRole,   // TeamRole | null
  teams,         // Team[]
  isLoading,     // boolean
  error,         // string | null
  switchTeam,    // (teamId: string) => Promise<void>
  createTeam,    // (input: CreateTeamInput) => Promise<Team>
  updateTeam,    // (input: UpdateTeamInput) => Promise<Team>
  deleteTeam,    // () => Promise<void>
  transferOwnership, // (newOwnerEmail: string) => Promise<void>
  refresh,       // () => Promise<void>
} = useTeam();
```

### `useTeamMembers()`

```tsx
import { useTeamMembers } from '@reasvyn/auth-team/react';

const {
  members,       // TeamMember[]
  isLoading,
  error,
  addMember,     // (userId, role) => Promise<TeamMember>
  removeMember,  // (userId) => Promise<void>
  updateRole,    // (userId, role) => Promise<TeamMember>
  canRemove,     // (memberRole: TeamRole) => boolean
  canChangeRoleTo, // (currentRole, newRole) => boolean
} = useTeamMembers();
```

### `useTeamInvitations(currentUserId)`

```tsx
import { useTeamInvitations } from '@reasvyn/auth-team/react';

const {
  invitations,   // TeamInvitation[]
  isLoading,
  invite,        // (email, role, appBaseUrl?) => Promise<TeamInvitation>
  cancel,        // (invitationId) => Promise<void>
  accept,        // (invitationId) => Promise<void>
  decline,       // (invitationId) => Promise<void>
  refresh,       // () => Promise<void>
} = useTeamInvitations(currentUserId);
```

## React Components

All components use Tailwind CSS with `dark:` variants. Add `dark` class to `<html>` for dark mode.

### `<TeamSwitcher>`

Dropdown to switch between the user's teams.

```tsx
import { TeamSwitcher } from '@reasvyn/auth-team/react';

<TeamSwitcher
  showCreate
  onCreateClick={() => setShowCreateModal(true)}
  onSwitch={(teamId) => console.log('Switched to', teamId)}
/>
```

| Prop | Type | Default | Description |
|---|---|---|---|
| `showCreate` | `boolean` | `true` | Show "Create team" option |
| `onCreateClick` | `() => void` | — | Called when "Create team" is clicked |
| `onSwitch` | `(teamId: string) => void` | — | Called after team switch |

### `<TeamMembersList>`

Table/list of members with role badges, role selector, and remove controls.

```tsx
import { TeamMembersList } from '@reasvyn/auth-team/react';

<TeamMembersList
  currentUserId={user.id}
  onRemove={(userId) => console.log('Removed', userId)}
  onRoleChange={(userId, role) => console.log(userId, 'is now', role)}
/>
```

| Prop | Type | Description |
|---|---|---|
| `currentUserId` | `string` | Prevents self-removal/demotion |
| `onRemove` | `(userId: string) => void` | Called after removal |
| `onRoleChange` | `(userId: string, role: TeamRole) => void` | Called after role change |

### `<TeamInviteForm>`

Email + role selector form with pending invitations list.

```tsx
import { TeamInviteForm } from '@reasvyn/auth-team/react';

<TeamInviteForm
  currentUserId={user.id}
  appBaseUrl="https://myapp.com"
  onInvited={(inv) => console.log('Invited', inv.email)}
/>
```

### `<TeamCreateForm>`

```tsx
import { TeamCreateForm } from '@reasvyn/auth-team/react';

<TeamCreateForm
  onSuccess={(teamId) => router.push(`/teams/${teamId}`)}
  onCancel={() => setShowModal(false)}
/>
```

### `<TeamSettingsForm>`

Update team name/description + danger zone (transfer ownership, delete team).

```tsx
import { TeamSettingsForm } from '@reasvyn/auth-team/react';

<TeamSettingsForm
  currentUserId={user.id}
  onDeleted={() => router.push('/teams')}
/>
```

### `<MemberRoleBadge>`

Colored role badge.

```tsx
import { MemberRoleBadge } from '@reasvyn/auth-team/react';

<MemberRoleBadge role="admin" />
// → blue badge with "Admin"
```

## Utility Functions

```ts
import { slugify, generateInviteToken, outranks, atLeast } from '@reasvyn/auth-team';

slugify('My Awesome Team!'); // 'my-awesome-team'
generateInviteToken();       // 48-char random alphanumeric

outranks('admin', 'member'); // true
outranks('member', 'admin'); // false
atLeast('admin', 'admin');   // true
```

## Role Hierarchy

| Role | Rank | Can invite | Can remove |
|---|---|---|---|
| `owner` | 4 | Anyone | Non-owners |
| `admin` | 3 | member, viewer | member, viewer |
| `member` | 2 | — | — |
| `viewer` | 1 | — | — |

## Integrating with auth-rbac

```tsx
import { RBACProvider, saasRoles } from '@reasvyn/auth-rbac/react';
import { TeamProvider, useTeam } from '@reasvyn/auth-team/react';

function AuthedApp() {
  const { currentRole } = useTeam();
  return (
    <RBACProvider engine={saasRoles} role={currentRole ?? 'viewer'}>
      <App />
    </RBACProvider>
  );
}

function Root() {
  return (
    <TeamProvider adapter={myTeamAdapter} userId={user.id}>
      <AuthedApp />
    </TeamProvider>
  );
}
```
