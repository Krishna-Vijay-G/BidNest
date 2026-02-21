-- =============================================================================
-- BidNest Admin SQL Queries
-- Replace every <PLACEHOLDER> with the real UUID / value before running.
-- Run against your Neon DB using the psql CLI or the Neon SQL Editor.
-- Order matters — delete child rows before parent rows to avoid FK violations.
-- =============================================================================


-- =============================================================================
-- 1.  DELETE ALL AUCTIONS OF A CHIT GROUP
-- =============================================================================

-- Step 1a: First delete payments for that group (auctions FK'd by month)
DELETE FROM payments
WHERE chit_group_id = '<CHIT_GROUP_UUID>';

-- Step 1b: Delete the auctions themselves
DELETE FROM auctions
WHERE chit_group_id = '<CHIT_GROUP_UUID>';

-- (Optional) Also wipe the auction_schedule JSON on the group record
UPDATE chit_groups
SET auction_schedule = NULL
WHERE id = '<CHIT_GROUP_UUID>';


-- =============================================================================
-- 2.  DELETE AUDIT LOGS  (filter by user_id AND/OR action_type AND/OR table_name)
-- =============================================================================

-- All three filters combined (most precise):
DELETE FROM audit_logs
WHERE user_id    = '<USER_UUID>'
  AND action_type = '<ACTION_TYPE>'     -- CREATE | UPDATE | DELETE | LOGIN | LOGOUT
  AND table_name  = '<TABLE_NAME>';     -- users | members | chit_groups | chit_members | auctions | payments

-- By user_id only:
DELETE FROM audit_logs
WHERE user_id = '<USER_UUID>';

-- By action_type only:
DELETE FROM audit_logs
WHERE action_type = '<ACTION_TYPE>';

-- By table_name only:
DELETE FROM audit_logs
WHERE table_name = '<TABLE_NAME>';

-- By user_id + action_type:
DELETE FROM audit_logs
WHERE user_id    = '<USER_UUID>'
  AND action_type = '<ACTION_TYPE>';

-- By user_id + table_name:
DELETE FROM audit_logs
WHERE user_id   = '<USER_UUID>'
  AND table_name = '<TABLE_NAME>';


-- =============================================================================
-- 3.  DELETE PAYMENTS  (by member_id, chit_group_id, or both)
-- =============================================================================

-- By chit_group_id only:
DELETE FROM payments
WHERE chit_group_id = '<CHIT_GROUP_UUID>';

-- By chit_member_id only (payments made by a specific ticket holder):
DELETE FROM payments
WHERE chit_member_id = '<CHIT_MEMBER_UUID>';

-- By both chit_group_id AND chit_member_id (most precise):
DELETE FROM payments
WHERE chit_group_id  = '<CHIT_GROUP_UUID>'
  AND chit_member_id = '<CHIT_MEMBER_UUID>';

-- By month within a group:
DELETE FROM payments
WHERE chit_group_id = '<CHIT_GROUP_UUID>'
  AND month_number  = <MONTH_NUMBER>;     -- integer e.g. 3


-- =============================================================================
-- 4.  DELETE CHIT MEMBERS  (tickets in a group)
-- =============================================================================

-- Step 4a: Payments reference chit_members → delete first
DELETE FROM payments
WHERE chit_member_id IN (
    SELECT id FROM chit_members
    WHERE chit_group_id = '<CHIT_GROUP_UUID>'
);

-- Step 4b: Auctions reference winner_chit_member_id → delete first
DELETE FROM auctions
WHERE winner_chit_member_id IN (
    SELECT id FROM chit_members
    WHERE chit_group_id = '<CHIT_GROUP_UUID>'
);

-- By chit_group_id only (all tickets in a group):
DELETE FROM chit_members
WHERE chit_group_id = '<CHIT_GROUP_UUID>';

-- By member_id only (all tickets across all groups for a member):
-- (delete their payments first)
DELETE FROM payments
WHERE chit_member_id IN (
    SELECT id FROM chit_members WHERE member_id = '<MEMBER_UUID>'
);
DELETE FROM auctions
WHERE winner_chit_member_id IN (
    SELECT id FROM chit_members WHERE member_id = '<MEMBER_UUID>'
);
DELETE FROM chit_members
WHERE member_id = '<MEMBER_UUID>';

-- By BOTH chit_group_id AND member_id (most precise):
DELETE FROM payments
WHERE chit_member_id IN (
    SELECT id FROM chit_members
    WHERE chit_group_id = '<CHIT_GROUP_UUID>'
      AND member_id     = '<MEMBER_UUID>'
);
DELETE FROM auctions
WHERE winner_chit_member_id IN (
    SELECT id FROM chit_members
    WHERE chit_group_id = '<CHIT_GROUP_UUID>'
      AND member_id     = '<MEMBER_UUID>'
);
DELETE FROM chit_members
WHERE chit_group_id = '<CHIT_GROUP_UUID>'
  AND member_id     = '<MEMBER_UUID>';


-- =============================================================================
-- 5.  DELETE A CHIT GROUP (and all its child data) BY USER ID
-- =============================================================================

-- Step 5a: Payments
DELETE FROM payments
WHERE chit_group_id IN (
    SELECT id FROM chit_groups WHERE user_id = '<USER_UUID>'
);

-- Step 5b: Auctions
DELETE FROM auctions
WHERE chit_group_id IN (
    SELECT id FROM chit_groups WHERE user_id = '<USER_UUID>'
);

-- Step 5c: Chit members (tickets)
DELETE FROM chit_members
WHERE chit_group_id IN (
    SELECT id FROM chit_groups WHERE user_id = '<USER_UUID>'
);

-- Step 5d: Chit groups themselves
DELETE FROM chit_groups
WHERE user_id = '<USER_UUID>';


-- =============================================================================
-- 6.  DELETE MEMBERS BY USER ID
--     (members that BELONG to a user — not chit-membership / tickets)
-- =============================================================================

-- Step 6a: Delete chit_member rows (tickets) referencing those members
DELETE FROM chit_members
WHERE member_id IN (
    SELECT id FROM members WHERE user_id = '<USER_UUID>'
);

-- Step 6b: Delete the members themselves
DELETE FROM members
WHERE user_id = '<USER_UUID>';


-- =============================================================================
-- BONUS: FULL USER WIPE (user + ALL associated data)
-- Run steps IN ORDER — FK constraints will block out-of-order deletes.
-- =============================================================================

-- B1: payments
DELETE FROM payments
WHERE chit_group_id IN (SELECT id FROM chit_groups WHERE user_id = '<USER_UUID>');

-- B2: auctions
DELETE FROM auctions
WHERE chit_group_id IN (SELECT id FROM chit_groups WHERE user_id = '<USER_UUID>');

-- B3: chit_members
DELETE FROM chit_members
WHERE member_id     IN (SELECT id FROM members     WHERE user_id = '<USER_UUID>')
   OR chit_group_id IN (SELECT id FROM chit_groups WHERE user_id = '<USER_UUID>');

-- B4: members
DELETE FROM members
WHERE user_id = '<USER_UUID>';

-- B5: chit_groups
DELETE FROM chit_groups
WHERE user_id = '<USER_UUID>';

-- B6: audit_logs
DELETE FROM audit_logs
WHERE user_id = '<USER_UUID>';

-- B7: user itself
DELETE FROM users
WHERE id = '<USER_UUID>';
