//src/app/page.tsx
import Link from 'next/link';
import {
  HiOutlineUserGroup,
  HiOutlineShieldCheck,
  HiOutlineChartBar,
  HiOutlineBell,
  HiOutlineBanknotes,
  HiOutlineArrowTrendingUp,
} from 'react-icons/hi2';

export default function HomePage() {
  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Ambient background orbs */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-150 h-150 rounded-full bg-cyan-500/[0.07] blur-[120px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-125 h-125 rounded-full bg-purple-500/[0.07] blur-[120px]" />
        <div className="absolute top-[40%] right-[20%] w-75 h-75 rounded-full bg-pink-500/5 blur-[100px]" />
      </div>

      {/* Navigation */}
      <nav className="relative z-10 flex items-center justify-between px-6 sm:px-12 py-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-linear-to-br from-cyan-400 to-purple-500 shadow-lg shadow-cyan-500/20">
            <span className="text-white font-black text-lg">B</span>
          </div>
          <span className="text-foreground font-bold text-xl tracking-tight">
            Bid<span className="neon-text">Nest</span>
          </span>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="text-foreground-secondary hover:text-cyan-400 px-4 py-2 text-sm font-medium transition-colors"
          >
            Sign In
          </Link>
          <Link
            href="/register"
            className="btn-neon px-5 py-2 rounded-xl text-sm font-semibold"
          >
            Get Started
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative z-10 px-6 sm:px-12 py-20 sm:py-32 text-center max-w-5xl mx-auto">
        <div className="inline-flex items-center gap-2 glass rounded-full px-4 py-1.5 mb-8">
          <span className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse-soft" />
          <span className="text-foreground-secondary text-sm">
            Trusted by chit fund managers across India
          </span>
        </div>
        <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black text-foreground leading-[1.1] mb-6 tracking-tight">
          Modern Chit Fund
          <br />
          <span className="bg-linear-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-transparent animate-gradient">
            Management Platform
          </span>
        </h1>
        <p className="text-foreground-muted text-lg sm:text-xl max-w-2xl mx-auto mb-12 leading-relaxed">
          Streamline your rotating chit fund operations with automated auctions,
          real-time tracking, and precise financial calculations.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/register"
            className="relative group overflow-hidden bg-linear-to-r from-cyan-500 to-purple-500 text-white px-8 py-3.5 rounded-xl text-base font-semibold transition-all shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40 hover:-translate-y-0.5 w-full sm:w-auto"
          >
            <span className="relative z-10">Start Managing Now</span>
            <div className="absolute inset-0 bg-linear-to-r from-cyan-400 to-purple-400 opacity-0 group-hover:opacity-100 transition-opacity" />
          </Link>
          <Link
            href="/login"
            className="glass border border-border hover:border-cyan-500/30 text-foreground px-8 py-3.5 rounded-xl text-base font-semibold transition-all hover:shadow-[0_0_20px_rgba(0,240,255,0.15)] w-full sm:w-auto"
          >
            Sign In
          </Link>
        </div>

        {/* Stats bar */}
        <div className="mt-16 glass-strong rounded-2xl p-6 grid grid-cols-3 gap-6 max-w-xl mx-auto">
          {[
            { value: '100%', label: 'Accurate Math' },
            { value: 'Real-time', label: 'Tracking' },
            { value: 'Secure', label: 'Data Protected' },
          ].map((stat) => (
            <div key={stat.label}>
              <div className="text-xl font-bold neon-text">{stat.value}</div>
              <div className="text-foreground-muted text-xs mt-1">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="relative z-10 px-6 sm:px-12 pb-24 max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-3">
            Everything You Need
          </h2>
          <p className="text-foreground-muted max-w-lg mx-auto">
            A complete toolkit to manage chit funds efficiently, from group creation to payout tracking.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 stagger-children">
          {[
            {
              icon: <HiOutlineUserGroup className="w-6 h-6" />,
              title: 'Group Management',
              desc: 'Create and manage multiple chit groups with flexible configurations and member tracking.',
              iconBg: 'bg-cyan-500/10 text-cyan-400',
            },
            {
              icon: <HiOutlineChartBar className="w-6 h-6" />,
              title: 'Auto Calculations',
              desc: 'Accurate dividend, commission, and payout calculations computed automatically every month.',
              iconBg: 'bg-purple-500/10 text-purple-400',
            },
            {
              icon: <HiOutlineBanknotes className="w-6 h-6" />,
              title: 'Payment Tracking',
              desc: 'Track contributions, payouts, and pending amounts with real-time status updates.',
              iconBg: 'bg-green-500/10 text-green-400',
            },
            {
              icon: <HiOutlineArrowTrendingUp className="w-6 h-6" />,
              title: 'Auction System',
              desc: 'Conduct monthly auctions with bid tracking, winner selection, and instant calculations.',
              iconBg: 'bg-pink-500/10 text-pink-400',
            },
            {
              icon: <HiOutlineShieldCheck className="w-6 h-6" />,
              title: 'Secure & Reliable',
              desc: 'Role-based access control with row-level security. Admin and member views separated.',
              iconBg: 'bg-amber-500/10 text-amber-400',
            },
            {
              icon: <HiOutlineBell className="w-6 h-6" />,
              title: 'Real-time Alerts',
              desc: 'Instant notifications for reminders, auction results, payment confirmations, and more.',
              iconBg: 'bg-blue-500/10 text-blue-400',
            },
          ].map((feature) => (
            <div
              key={feature.title}
              className="glass glass-hover rounded-2xl p-6 transition-all duration-300 group cursor-default"
            >
              <div className={`p-3 rounded-xl w-fit mb-4 ${feature.iconBg} transition-transform group-hover:scale-110`}>
                {feature.icon}
              </div>
              <h3 className="text-foreground font-semibold text-base mb-2">{feature.title}</h3>
              <p className="text-foreground-muted text-sm leading-relaxed">{feature.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-border py-8 text-center">
        <p className="text-foreground-muted text-sm">
          &copy; {new Date().getFullYear()} BidNest. Built for G.K Finance.
        </p>
      </footer>
    </div>
  );
}