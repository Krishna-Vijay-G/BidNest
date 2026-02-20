'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useAuth } from '@/components/providers/AuthProvider';
import { Header } from '@/components/layout/Header';
import { Card, Button, PageLoader, EmptyState, Select } from '@/components/ui';
import { formatCurrency } from '@/lib/calculations';
import { HiOutlineBanknotes, HiOutlineArrowDownTray } from 'react-icons/hi2';
import { exportTransactionsReport, exportToCSV } from '@/lib/export';
import Link from 'next/link';
import { fetchTransactionsPageData } from '@/lib/api';
import type { Transaction, ChitGroup } from '@/types';

const CREDIT_TYPES = ['contribution_received', 'commission_deducted'];
const DEBIT_TYPES = ['payout_disbursed', 'dividend_distributed', 'adjustment'];

export default function TransactionsPage() {
  const { isLoading: authLoading } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [groups, setGroups] = useState<ChitGroup[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterGroup, setFilterGroup] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const hasFetched = useRef(false);

  const loadData = useCallback(async (force = false) => {
    if (!force && (hasFetched.current || sessionStorage.getItem('transactions-fetched'))) return;
    hasFetched.current = true;
    sessionStorage.setItem('transactions-fetched', 'true');
    sessionStorage.setItem('transactions-last-fetch', Date.now().toString());

    const { data } = await fetchTransactionsPageData();
    setTransactions(data.transactions);
    setGroups(data.groups);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Refresh data when tab becomes visible (if it's been more than 5 minutes)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && !isLoading) {
        const lastFetch = sessionStorage.getItem('transactions-last-fetch');
        if (!lastFetch || Date.now() - parseInt(lastFetch) > 5 * 60 * 1000) {
          loadData(true);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [isLoading, loadData]);

  const filtered = transactions.filter((t) => {
    if (filterGroup !== 'all' && t.chit_group_id !== filterGroup) return false;
    if (filterType !== 'all' && t.transaction_type !== filterType) return false;
    return true;
  });

  // Calculate running balance
  const runningBalance = filtered.reduceRight<{ tx: Transaction; balance: number }[]>(
    (acc, tx) => {
      const prevBalance = acc.length > 0 ? acc[acc.length - 1].balance : 0;
      const delta = CREDIT_TYPES.includes(tx.transaction_type) ? tx.amount : -tx.amount;
      acc.push({ tx, balance: prevBalance + delta });
      return acc;
    },
    []
  );
  runningBalance.reverse();

  const typeLabel: Record<string, string> = {
    contribution_received: 'Contribution',
    payout_disbursed: 'Payout',
    commission_deducted: 'Commission',
    dividend_distributed: 'Dividend',
    adjustment: 'Adjustment',
  };

  const typeColor: Record<string, string> = {
    contribution_received: 'text-emerald-600',
    payout_disbursed: 'text-red-600',
    commission_deducted: 'text-green-600',
    dividend_distributed: 'text-amber-600',
    adjustment: 'text-foreground-muted',
  };

  if (authLoading || isLoading) {
    return (
      <>
        <Header title="Transactions" />
        <PageLoader />
      </>
    );
  }

  return (
    <>
      <Header
        title="Transactions"
        subtitle={`${transactions.length} total entries`}
      >
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            icon={<HiOutlineArrowDownTray className="w-4 h-4" />}
            onClick={() => exportTransactionsReport(filtered as unknown as Parameters<typeof exportTransactionsReport>[0])}
          >
            PDF
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const headers = ['Date', 'Type', 'Group', 'Member', 'Description', 'Amount'];
              type TxAny = Transaction & { chit_group?: { name?: string }; member?: { app_member?: { name?: string } } };
              const rows = filtered.map((t) => {
                const tx = t as unknown as TxAny;
                return [
                  new Date(tx.created_at).toLocaleDateString('en-IN'),
                  tx.transaction_type,
                  tx.chit_group?.name || '',
                  tx.member?.app_member?.name || '',
                  tx.description || '',
                  tx.amount,
                ];
              });
              exportToCSV({ headers, rows, fileName: `bidnest-transactions-${Date.now()}` });
            }}
          >
            CSV
          </Button>
        </div>
      </Header>

      <div className="p-4 sm:p-6 lg:p-8">
        {/* Summary cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card>
            <p className="text-xs text-foreground-muted">Total Inflow</p>
            <p className="text-lg font-bold text-cyan-400">
              {formatCurrency(
                transactions
                  .filter((t) => CREDIT_TYPES.includes(t.transaction_type))
                  .reduce((s, t) => s + t.amount, 0)
              )}
            </p>
          </Card>
          <Card>
            <p className="text-xs text-foreground-muted">Total Outflow</p>
            <p className="text-lg font-bold text-red-400">
              {formatCurrency(
                transactions
                  .filter((t) => DEBIT_TYPES.includes(t.transaction_type))
                  .reduce((s, t) => s + t.amount, 0)
              )}
            </p>
          </Card>
          <Card>
            <p className="text-xs text-foreground-muted">Commission Earned</p>
            <p className="text-lg font-bold text-purple-400">
              {formatCurrency(
                transactions
                  .filter((t) => t.transaction_type === 'commission_deducted')
                  .reduce((s, t) => s + t.amount, 0)
              )}
            </p>
          </Card>
          <Card>
            <p className="text-xs text-foreground-muted">This Month</p>
            <p className="text-lg font-bold text-foreground">
              {formatCurrency(
                transactions
                  .filter((t) => {
                    const d = new Date(t.created_at);
                    const now = new Date();
                    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
                  })
                  .reduce(
                    (s, t) =>
                      s +
                      (CREDIT_TYPES.includes(t.transaction_type)
                        ? t.amount
                        : -t.amount),
                    0
                  )
              )}
            </p>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-4 mb-6">
          <div className="w-48">
            <Select
              value={filterGroup}
              onChange={(e) => setFilterGroup(e.target.value)}
              options={[
                { value: 'all', label: 'All Groups' },
                ...groups.map((g) => ({ value: g.id, label: g.name })),
              ]}
            />
          </div>
          <div className="w-48">
            <Select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              options={[
                { value: 'all', label: 'All Types' },
                { value: 'contribution_received', label: 'Contribution' },
                { value: 'payout_disbursed', label: 'Payout' },
                { value: 'commission_deducted', label: 'Commission' },
                { value: 'dividend_distributed', label: 'Dividend' },
                { value: 'adjustment', label: 'Adjustment' },
              ]}
            />
          </div>
        </div>

        {filtered.length === 0 ? (
          <EmptyState
            icon={<HiOutlineBanknotes className="w-8 h-8" />}
            title="No transactions found"
            description="Transaction entries are auto-generated when auctions are conducted and payments recorded."
          />
        ) : (
          <Card padding={false}>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-surface">
                  <tr className="text-left text-foreground-muted border-b border-border">
                    <th className="px-4 py-3 font-medium">Date</th>
                    <th className="px-4 py-3 font-medium">Type</th>
                    <th className="px-4 py-3 font-medium">Group</th>
                    <th className="px-4 py-3 font-medium">User</th>
                    <th className="px-4 py-3 font-medium">Description</th>
                    <th className="px-4 py-3 font-medium text-right">Amount</th>
                    <th className="px-4 py-3 font-medium text-right">Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {runningBalance.map(({ tx, balance }) => {
                    type GroupData = { name?: string };
                    type MemberData = { app_member?: { name?: string } };
                    const groupData = (tx as unknown as { chit_group?: GroupData }).chit_group;
                    const memberData = (tx as unknown as { member?: MemberData }).member;
                    const isCredit = CREDIT_TYPES.includes(tx.transaction_type);

                    return (
                      <tr key={tx.id} className="hover:bg-surface-hover">
                        <td className="px-4 py-3 text-foreground-muted whitespace-nowrap">
                          {new Date(tx.created_at).toLocaleDateString('en-IN', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center gap-1 text-xs font-medium ${typeColor[tx.transaction_type] || 'text-foreground-muted'}`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${isCredit ? 'bg-emerald-500' : 'bg-red-500'}`}
                            />
                            {typeLabel[tx.transaction_type] || tx.transaction_type}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {tx.chit_group_id ? (
                            <Link
                              href={`/groups/${tx.chit_group_id}`}
                              className="text-cyan-400 hover:text-cyan-300"
                            >
                              {groupData?.name || 'Group'}
                            </Link>
                          ) : (
                            '—'
                          )}
                        </td>
                        <td className="px-4 py-3 text-foreground-secondary">{memberData?.app_member?.name || '—'}</td>
                        <td className="px-4 py-3 text-foreground-muted max-w-50 truncate">
                          {tx.description || '—'}
                        </td>
                        <td
                          className={`px-4 py-3 text-right font-medium ${isCredit ? 'text-emerald-600' : 'text-red-600'}`}
                        >
                          {isCredit ? '+' : '-'}
                          {formatCurrency(tx.amount)}
                        </td>
                        <td className="px-4 py-3 text-right font-medium text-foreground">
                          {formatCurrency(Math.abs(balance))}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>
    </>
  );
}
