// scripts/seed-mock.js
// Usage: BASE_URL=http://localhost:3000 node scripts/seed-mock.js <user_id>

const BASE = process.env.BASE_URL || 'http://localhost:3000';
const USER_ID = process.argv[2] || 'your-user-id-here';

async function post(path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (!res.ok) {
    console.error('POST', path, 'failed', res.status, json);
    throw new Error('Request failed');
  }
  return json;
}

async function main() {
  console.log('Seeding mock data to', BASE, 'as user', USER_ID);

  // 1) create members
  const members = [];
  for (let i = 1; i <= 20; i++) {
    const payload = {
      user_id: USER_ID,
      name: { value: `Member ${i}`, updated_at: new Date().toISOString() },
      nickname: { value: `M${i}`, updated_at: new Date().toISOString() },
      mobile: { value: `9000000${String(100 + i).slice(-3)}`, updated_at: new Date().toISOString() },
      upi_ids: [
        { value: `member${i}@upi`, added_at: new Date().toISOString(), is_active: true },
      ],
      is_active: true,
    };
    const m = await post('/api/members', payload);
    members.push(m);
    console.log('Created member', m.id, m.name?.value || m.name);
  }

  // 2) create chit groups with varying statuses
  const groupsSpec = [
    { name: 'Daily Savers', total_members: 5, total_amount: 100000, duration_months: 10, status: 'ACTIVE' },
    { name: 'Weekend Group', total_members: 8, total_amount: 160000, duration_months: 8, status: 'PENDING' },
    { name: 'Retirement Fund', total_members: 5, total_amount: 50000, duration_months: 10, status: 'COMPLETED' },
    { name: 'Travel Fund', total_members: 10, total_amount: 200000, duration_months: 20, status: 'CANCELLED' },
  ];

  const groups = [];
  for (const g of groupsSpec) {
    const monthly_amount = Math.round(g.total_amount / g.total_members);
    const payload = {
      user_id: USER_ID,
      name: g.name,
      total_amount: g.total_amount,
      total_members: g.total_members,
      monthly_amount,
      duration_months: g.duration_months,
      commission_type: 'PERCENT',
      commission_value: 15,
      round_off_value: 50,
      status: g.status,
    };
    const cg = await post('/api/chit-groups', payload);
    groups.push(cg);
    console.log('Created group', cg.id, cg.name);
  }

  // 3) assign chit-members (tickets) to groups — pick members sequentially
  const chitMembers = {};
  let memberIndex = 0;
  for (const g of groups) {
    chitMembers[g.id] = [];
    for (let t = 1; t <= g.total_members; t++) {
      const member = members[memberIndex % members.length];
      memberIndex++;
      const payload = {
        member_id: member.id,
        chit_group_id: g.id,
        ticket_number: t,
      };
      const cm = await post('/api/chit-members', payload);
      chitMembers[g.id].push({ ...cm, member });
    }
    console.log(`Assigned ${g.total_members} tickets for group ${g.name}`);
  }

  // 4) create auctions for some groups (some months), and create payments for non-winners
  for (const g of groups) {
    // create auctions for first 3 months for ACTIVE/COMPLETED groups, 0 for CANCELLED
    const months = g.status === 'CANCELLED' ? 0 : Math.min(3, g.duration_months);
    for (let mnum = 1; mnum <= months; mnum++) {
      // pick a random winner ticket
      const tickets = chitMembers[g.id];
      const winnerIdx = Math.floor(Math.random() * tickets.length);
      const winner = tickets[winnerIdx];
      const original_bid = Math.floor((Math.random() * 0.2 + 0.05) * Number(g.total_amount));
      const payload = {
        chit_group_id: g.id,
        month_number: mnum,
        winner_chit_member_id: winner.id,
        original_bid,
      };
      const auc = await post('/api/auctions', payload);
      console.log(`Created auction for group ${g.name} month ${mnum} winner ticket #${winner.ticket_number}`);

      // Now create payments for other tickets (some full, some partial)
      // We need amount_to_collect from auction.calculation_data
      const amount_to_collect = auc.calculation_data?.amount_to_collect ?? Number(g.monthly_amount);
      for (const cm of tickets) {
        if (cm.id === winner.id) continue; // winner doesn't pay
        // Randomize payment status: 60% paid, 20% partial, 20% none
        const r = Math.random();
        if (r < 0.2) continue; // skip (no payment)
        let amount_paid = amount_to_collect;
        if (r < 0.4) {
          amount_paid = Math.max(0, Math.floor(amount_to_collect / 2)); // partial
        }
        const payPayload = {
          chit_group_id: g.id,
          chit_member_id: cm.id,
          month_number: mnum,
          amount_paid,
          payment_method: 'UPI',
          upi_id: cm.member.upi_ids?.[0]?.value || `${cm.member.id}@upi`,
          payment_date: new Date().toISOString(),
        };
        try {
          const pay = await post('/api/payments', payPayload);
          console.log(`Payment for group ${g.name} month ${mnum} ticket #${cm.ticket_number}: ${pay.amount_paid} status ${pay.status}`);
        } catch (e) {
          console.warn('Payment failed', e.message);
        }
      }
    }
  }

  console.log('Seeding complete.');
}

main().catch((err) => {
  console.error('Seed failed', err);
  process.exit(1);
});
