import { useMemo, type ReactNode } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { Badge, Button, Card } from "./components/ui";
import { useTheme } from "./lib/theme";
import { useWallet } from "./lib/wallet";
import { api } from "./lib/api";
import { explorerTxUrl, formatAmount, truncateAddress } from "./lib/utils";
import { useQuery } from "@tanstack/react-query";

const navItems = [
  { to: "/dashboard", label: "Dashboard" },
  { to: "/wallet", label: "Wallet" },
  { to: "/create", label: "Create Challenge" },
  { to: "/active", label: "Active Challenges" },
  { to: "/completed", label: "Completed Challenges" },
  { to: "/reward-pool", label: "Reward Pool" },
  { to: "/leaderboard", label: "Leaderboard" },
  { to: "/notifications", label: "Notifications" },
  { to: "/profile", label: "Profile" },
  { to: "/admin", label: "Admin Dashboard" },
  { to: "/settings", label: "Settings" },
];

export function AppShell({ children }: { children: ReactNode }) {
  const location = useLocation();
  const { themeMode, setThemeMode } = useTheme();
  const wallet = useWallet();
  const networkQuery = useQuery({ queryKey: ["network"], queryFn: api.network });
  const rewardPoolQuery = useQuery({ queryKey: ["reward-pool"], queryFn: api.rewardPool });

  const activeLabel = useMemo(() => navItems.find((item) => item.to === location.pathname)?.label ?? "SkillStake", [location.pathname]);

  return (
    <div className="page-shell min-h-screen text-fg">
      <div className="noise-grid fixed inset-0 pointer-events-none opacity-[0.35]" />
      <div className="relative mx-auto flex min-h-screen max-w-[1600px] flex-col lg:flex-row">
        <aside className="glass sticky top-0 hidden h-screen w-80 shrink-0 flex-col border-r border-border/80 p-6 lg:flex">
          <div className="mb-8">
            <Link to="/" className="text-3xl font-bold tracking-tight">
              SkillStake
            </Link>
            <p className="mt-2 text-sm text-muted">Stake XLM on goals, verify progress, and earn XP.</p>
          </div>
          <nav className="flex-1 space-y-1 overflow-y-auto pr-2 safe-scrollbar">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  [
                    "flex items-center justify-between rounded-xl px-4 py-3 text-sm transition",
                    isActive ? "bg-accent text-accentFg" : "text-muted hover:bg-black/5 dark:hover:bg-white/5 hover:text-fg",
                  ].join(" ")
                }
              >
                <span>{item.label}</span>
                {item.to === "/dashboard" ? <Badge>Live</Badge> : null}
              </NavLink>
            ))}
          </nav>
          <Card className="mt-6 space-y-4">
            <div>
              <p className="text-label text-xs text-muted">Wallet</p>
              <p className="mt-1 text-sm font-medium">{wallet.address ? truncateAddress(wallet.address) : "Not connected"}</p>
            </div>
            <div>
              <p className="text-label text-xs text-muted">Network</p>
              <p className="mt-1 text-sm font-medium">{networkQuery.data ? networkQuery.data.passphrase.includes("Public") ? "Public" : "Testnet" : "Loading"}</p>
            </div>
            <div>
              <p className="text-label text-xs text-muted">Reward Pool</p>
              <p className="mt-1 text-sm font-medium">{formatAmount(rewardPoolQuery.data?.rewardPool.currentBalance ?? 0)} XLM</p>
            </div>
          </Card>
        </aside>
        <main className="flex-1">
          <header className="sticky top-0 z-40 border-b border-border/70 bg-[rgb(var(--bg)/0.78)] backdrop-blur-xl">
            <div className="flex items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
              <div>
                <p className="text-label text-xs text-muted">{activeLabel}</p>
                <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">SkillStake</h1>
              </div>
              <div className="flex items-center gap-3">
                <div className="hidden rounded-full border border-border px-3 py-2 text-xs text-muted md:block">
                  {networkQuery.data ? networkQuery.data.passphrase : "Resolving network"}
                </div>
                <Button variant="secondary" onClick={() => setThemeMode(themeMode === "dark" ? "light" : themeMode === "light" ? "auto" : "dark")}>
                  Theme: {themeMode}
                </Button>
                {wallet.connected ? (
                  <Button variant="secondary" onClick={wallet.disconnect}>
                    Disconnect {wallet.address ? truncateAddress(wallet.address) : "Wallet"}
                  </Button>
                ) : (
                  <Button asChild>
                    <Link to="/wallet">Connect Wallet</Link>
                  </Button>
                )}
              </div>
            </div>
          </header>
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25, ease: "easeOut" }} className="px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
            {children}
          </motion.div>
        </main>
      </div>
    </div>
  );
}
