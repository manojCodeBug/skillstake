import { useEffect } from "react";
import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster } from "sonner";
import { queryClient } from "./lib/query";
import { ThemeProvider } from "./lib/theme";
import { api } from "./lib/api";
import { AppShell } from "./layout";
import { useWallet } from "./lib/wallet";
import {
  ActiveChallengesPage,
  AdminDashboardPage,
  ChallengeDetailsPage,
  CreateChallengePage,
  DashboardPage,
  LandingPage,
  LeaderboardPage,
  NotFoundPage,
  NotificationsPage,
  ProfilePage,
  RewardPoolPage,
  SettingsPage,
  WalletPage,
} from "./pages";

function AppNetworkGuard() {
  useQuery({ queryKey: ["network"], queryFn: api.network });
  return null;
}

export function App() {
  const wallet = useWallet();

  useEffect(() => {
    wallet.initializeSession();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <BrowserRouter>
          <AppNetworkGuard />
          <AppShell>
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/wallet" element={<WalletPage />} />
              <Route path="/create" element={<CreateChallengePage />} />
              <Route path="/challenge/:id" element={<ChallengeDetailsPage />} />
              <Route path="/active" element={<ActiveChallengesPage />} />
              <Route path="/completed" element={<ActiveChallengesPage completedOnly />} />
              <Route path="/reward-pool" element={<RewardPoolPage />} />
              <Route path="/leaderboard" element={<LeaderboardPage />} />
              <Route path="/notifications" element={<NotificationsPage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/admin" element={<AdminDashboardPage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/404" element={<NotFoundPage />} />
              <Route path="*" element={<Navigate to="/404" replace />} />
            </Routes>
          </AppShell>
          <Toaster position="bottom-right" richColors closeButton />
        </BrowserRouter>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
