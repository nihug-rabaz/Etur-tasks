import { Toaster } from "@/components/ui/toaster"
import AppLoader from '@/components/AppLoader'
import { useState, useEffect } from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import NavigationTracker from '@/lib/NavigationTracker'
import { pagesConfig } from './pages.config'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import ApprovalBranchHead from '@/pages/ApprovalBranchHead';
import ApprovalDeputyCommander from '@/pages/ApprovalDeputyCommander';
import ApprovalChiefRabbi from '@/pages/ApprovalChiefRabbi';
import ApproverManagement from '@/pages/ApproverManagement';

const { Pages, Layout, mainPage } = pagesConfig;
const mainPageKey = mainPage ?? Object.keys(Pages)[0];
const MainPage = mainPageKey ? Pages[mainPageKey] : <></>;

const LayoutWrapper = ({ children, currentPageName }) => Layout ?
  <Layout currentPageName={currentPageName}>{children}</Layout>
  : <>{children}</>;

const AppEntry = ({ children }) => {
  const [done, setDone] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDone(true), 2900);
    return () => clearTimeout(t);
  }, []);

  return (
    <>
      {!done && <AppLoader />}
      <div style={{ visibility: done ? 'visible' : 'hidden' }}>{children}</div>
    </>
  );
};

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  // Show loading spinner while checking app public settings or auth
  if (isLoadingPublicSettings || isLoadingAuth) {
    return null;
  }

  // Handle authentication errors
  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      // Redirect to login automatically
      navigateToLogin();
      return null;
    }
  }

  // Render the main app
  return (
    <Routes>
      <Route path = "/" element={
        <LayoutWrapper currentPageName={mainPageKey}>
          <MainPage />
        </LayoutWrapper>
      } />
      {Object.entries(Pages).map(([path, Page]) => (
        <Route
          key={path}
          path={`/${path}`}
          element={
            <LayoutWrapper currentPageName={path}>
              <Page />
            </LayoutWrapper>
          }
        />
      ))}
      <Route path = "/approval/branch-head" element={<ApprovalBranchHead />} />
      <Route path = "/approval/deputy-commander" element={<ApprovalDeputyCommander />} />
      <Route path = "/approval/chief-rabbi" element={<ApprovalChiefRabbi />} />
      <Route path = "/approver-management" element={<ApproverManagement />} />
      <Route path = "*" element={<PageNotFound />} />
    </Routes>
  );
};


function App() {

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <NavigationTracker />
          <AppEntry>
            <AuthenticatedApp />
          </AppEntry>
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App