// scripts/seed-mock.js
// Usage: BASE_URL=http://localhost:3000 node scripts/seed-mock.js [user_id]
// All data is seeded under the given user so it shows in the app immediately.

const BASE    = process.env.BASE_URL || 'http://localhost:3000';
const USER_ID = process.argv[2] || '69143f65-c38d-4a23-a9c6-d6af7cf9f833';

// ──────────────────────────────────────────────────────────────────
// HTTP helpers
// ──────────────────────────────────────────────────────────────────
async function req(method, path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json();
  if (!res.ok) {
    console.error(`  ✗ ${method} ${path} → ${res.status}`, JSON.stringify(json));
    throw new Error(`${method} ${path} failed`);
  }
  return json;
}
const post = (p, b) => req('POST', p, b);

function iso(days = 0) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString();
}
function past(days)   { return iso(-days); }
function future(days) { return iso(+days); }

// ──────────────────────────────────────────────────────────────────
// Main
// ──────────────────────────────────────────────────────────────────
async function main() {
  console.log(`\n🌱  Seeding mock data → ${BASE}  (user: ${USER_ID})\n`);

  // ── 1. Members ────────────────────────────────────────────────
  console.log('── 1/5  Creating members …');
  const memberDefs = [
    { name: 'Arjun Kumar',    nick: 'AK',  phone: '9001000001', upi: 'arjun@icici'   },
    { name: 'Priya Sharma',   nick: 'PS',  phone: '9001000002', upi: 'priya@gpay'    },
    { name: 'Suresh Rajan',   nick: 'SR',  phone: '9001000003', upi: 'suresh@okaxis' },
    { name: 'Meena Devi',     nick: 'MD',  phone: '9001000004', upi: 'meena@paytm'   },
    { name: 'Ravi Shankar',   nick: 'RS',  phone: '9001000005', upi: 'ravi@ybl'      },
    { name: 'Kavitha Nair',   nick: 'KN',  phone: '9001000006', upi: 'kavitha@upi'   },
    { name: 'Dinesh Babu',    nick: 'DB',  phone: '9001000007', upi: 'dinesh@icici'  },
    { name: 'Lakshmi Iyer',   nick: 'LI',  phone: '9001000008', upi: 'lakshmi@hdfc'  },
    { name: 'Gopal Venkat',   nick: 'GV',  phone: '9001000009', upi: 'gopal@okicici' },
    { name: 'Sangeetha M',    nick: 'SM',  phone: '9001000010', upi: 'sangeetha@upi' },
    { name: 'Ramesh Pillai',  nick: 'RP',  phone: '9001000011', upi: 'ramesh@ybl'    },
    { name: 'Anitha Raj',     nick: 'AR',  phone: '9001000012', upi: 'anitha@gpay'   },
    { name: 'Vijay Murugan',  nick: 'VM',  phone: '9001000013', upi: 'vijay@paytm'   },
    { name: 'Bharathi S',     nick: 'BS',  phone: '9001000014', upi: 'bharathi@upi'  },
    { name: 'Kumar Swamy',    nick: 'KS',  phone: '9001000015', upi: 'kumar@okaxis'  },
    { name: 'Nalini Prasad',  nick: 'NP',  phone: '9001000016', upi: 'nalini@icici'  },
    { name: 'Senthil Raja',   nick: 'SRj', phone: '9001000017', upi: 'senthil@hdfc'  },
    { name: 'Deepa Krishnan', nick: 'DK',  phone: '9001000018', upi: 'deepa@upi'     },
    { name: 'Murugan T',      nick: 'MT',  phone: '9001000019', upi: 'murugan@ybl'   },
    { name: 'Chandra Sekar',  nick: 'CS',  phone: '9001000020', upi: 'chandra@gpay'  },
  ];

  const members = [];
  for (const d of memberDefs) {
    const now = new Date().toISOString();
    const m = await post('/api/members', {
      user_id: USER_ID,
      name:     { value: d.name,  updated_at: now },
      nickname: { value: d.nick,  updated_at: now },
      mobile:   { value: d.phone, updated_at: now },
      upi_ids:  [{ value: d.upi,  added_at: now, is_active: true }],
      is_active: true,
    });
    members.push({ ...m, upi: d.upi });
    console.log(`   ✓ Member: ${d.name}`);
  }

  // ── 2. Chit groups ────────────────────────────────────────────
  console.log('\n── 2/5  Creating chit groups …');
  const groupDefs = [
    {
      name: 'Office Savers 2025',
      total_amount: 100000, total_members: 10, duration_months: 10,
      commission_type: 'PERCENT', commission_value: 15, round_off_value: 50,
      status: 'ACTIVE',
      auction_start_date: past(90),   // started 3 months ago
      auctionsToCreate: 3,
    },
    {
      name: 'Family Gold Fund',
      total_amount: 200000, total_members: 20, duration_months: 20,
      commission_type: 'PERCENT', commission_value: 12, round_off_value: 100,
      status: 'ACTIVE',
      auction_start_date: past(180),  // 6 months ago
      auctionsToCreate: 6,
    },
    {
      name: 'Weekend Chit 2026',
      total_amount: 50000, total_members: 5, duration_months: 5,
      commission_type: 'FIXED', commission_value: 500, round_off_value: 10,
      status: 'PENDING',
      auction_start_date: future(15), // upcoming in 15 days
      auctionsToCreate: 0,
    },
    {
      name: 'Retirement Reserve',
      total_amount: 500000, total_members: 10, duration_months: 10,
      commission_type: 'PERCENT', commission_value: 10, round_off_value: 100,
      status: 'COMPLETED',
      auction_start_date: past(365),  // fully completed last year
      auctionsToCreate: 10,
    },
    {
      name: 'Travel Fund 2024',
      total_amount: 80000, total_members: 8, duration_months: 8,
      commission_type: 'FIXED', commission_value: 1000, round_off_value: 50,
      status: 'CANCELLED',
      auction_start_date: past(200),
      auctionsToCreate: 0,
    },
    {
      name: 'Startup Chit',
      total_amount: 120000, total_members: 12, duration_months: 12,
      commission_type: 'PERCENT', commission_value: 20, round_off_value: 50,
      status: 'ACTIVE',
      auction_start_date: past(60),
      auctionsToCreate: 2,
    },
  ];

  const groups = [];
  for (const g of groupDefs) {
    const monthly_amount = Math.round(g.total_amount / g.total_members);
    const cg = await post('/api/chit-groups', {
      user_id: USER_ID,
      name: g.name,
      total_amount: g.total_amount,
      total_members: g.total_members,
      monthly_amount,
      duration_months: g.duration_months,
      commission_type: g.commission_type,
      commission_value: g.commission_value,
      round_off_value: g.round_off_value,
      status: g.status,
      auction_start_date: g.auction_start_date,
    });
    groups.push({ ...cg, def: g, monthly_amount });
    console.log(`   ✓ Group: ${g.name} [${g.status}]`);
  }

  // ── 3. Assign chit-members (tickets) ─────────────────────────
  console.log('\n── 3/5  Assigning tickets …');
  const chitMembersMap = {};
  let mIdx = 0;
  for (const g of groups) {
    chitMembersMap[g.id] = [];
    for (let t = 1; t <= g.def.total_members; t++) {
      const member = members[mIdx % members.length];
      mIdx++;
      const cm = await post('/api/chit-members', {
        member_id: member.id,
        chit_group_id: g.id,
        ticket_number: t,
      });
      chitMembersMap[g.id].push({ ...cm, member });
    }
    console.log(`   ✓ ${g.def.total_members} tickets → ${g.def.name}`);
  }

  // ── 4. Auctions + payments ────────────────────────────────────
  console.log('\n── 4/5  Auctions & payments …');
  for (const g of groups) {
    const months = g.def.auctionsToCreate;
    if (months === 0) {
      console.log(`   ↷  Skipped auctions for ${g.def.name} [${g.def.status}]`);
      continue;
    }

    const tickets = chitMembersMap[g.id];
    const usedWinners = new Set();

    for (let mnum = 1; mnum <= months; mnum++) {
      // pick unique winner
      let winner;
      for (let attempt = 0; attempt < tickets.length * 3; attempt++) {
        const candidate = tickets[Math.floor(Math.random() * tickets.length)];
        if (!usedWinners.has(candidate.id)) { winner = candidate; break; }
      }
      if (!winner) { console.warn(`   ⚠  No available winner for ${g.def.name} M${mnum}`); continue; }
      usedWinners.add(winner.id);

      const bid = Math.floor(Number(g.total_amount) * (0.05 + Math.random() * 0.2));
      let auc;
      try {
        auc = await post('/api/auctions', {
          chit_group_id: g.id,
          month_number: mnum,
          winner_chit_member_id: winner.id,
          original_bid: bid,
        });
        console.log(`   ✓ Auction: ${g.def.name} M${mnum} winner #${winner.ticket_number}`);
      } catch (e) {
        console.warn(`   ⚠  Auction failed for ${g.def.name} M${mnum}: ${e.message}`);
        continue;
      }

      const amount_to_collect = auc.calculation_data?.amount_to_collect ?? Number(g.monthly_amount);
      const payDate = past(Math.max(0, (months - mnum) * 30));

      for (const cm of tickets) {
        if (cm.id === winner.id) continue; // winner doesn't pay
        const r = Math.random();
        if (r < 0.15) continue; // 15% skip entirely

        // 20% partial, 65% full
        const amount_paid = r < 0.35
          ? Math.max(1, Math.floor(amount_to_collect * (0.3 + Math.random() * 0.4)))
          : amount_to_collect;

        try {
          const pay = await post('/api/payments', {
            chit_group_id: g.id,
            chit_member_id: cm.id,
            month_number: mnum,
            amount_paid,
            payment_method: ['UPI', 'CASH', 'BANK_TRANSFER'][Math.floor(Math.random() * 3)],
            upi_id: cm.member?.upi_ids?.[0]?.value || `${cm.id}@upi`,
            payment_date: payDate,
            notes: r < 0.35 ? 'Partial payment' : undefined,
          });
          console.log(`      → Payment: ${g.def.name} M${mnum} ticket #${cm.ticket_number} ₹${pay.amount_paid} [${pay.status}]`);
        } catch (e) {
          console.warn(`      ⚠  Payment skip ticket #${cm.ticket_number}: ${e.message}`);
        }
      }
    }
  }

  // ── 5. Standalone audit log entries ──────────────────────────
  console.log('\n── 5/5  Simulating extra audit log entries …');
  const auditEntries = [
    { action_type: 'LOGIN',  action_detail: 'User logged in from mobile',   record_id: USER_ID },
    { action_type: 'LOGOUT', action_detail: 'User logged out',              record_id: USER_ID },
    { action_type: 'LOGIN',  action_detail: 'User logged in from desktop',  record_id: USER_ID },
    { action_type: 'UPDATE', action_detail: 'User profile updated',         record_id: USER_ID },
    { action_type: 'LOGIN',  action_detail: 'User logged in from tablet',   record_id: USER_ID },
  ];
  for (const entry of auditEntries) {
    try {
      await post('/api/audit-logs', { ...entry, user_id: USER_ID, table_name: 'users' });
      console.log(`   ✓ Audit: ${entry.action_type} – ${entry.action_detail}`);
    } catch {
      console.warn(`   ⚠  Audit log skip`);
    }
  }

  console.log('\n✅  Seeding complete!\n');
}

main().catch((err) => {
  console.error('\n❌  Seed failed:', err.message);
  process.exit(1);
});
