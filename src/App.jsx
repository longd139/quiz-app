import { BrowserRouter, Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import { useQuizData } from './hooks/useQuizData';
import { useDarkMode } from './hooks/useDarkMode';
import { useFontSize } from './hooks/useFontSize';
import Header from './components/Header';
import TabNav from './components/TabNav';
import ConfirmDialog from './components/ConfirmDialog';
import AlertDialog from './components/AlertDialog';
import Toast from './components/Toast';
import LoginPage from './pages/LoginPage';
import ChangePasswordPage from './pages/ChangePasswordPage';
import Dashboard from './pages/Dashboard';
import Editor from './pages/Editor';
import PracticeSetup from './pages/PracticeSetup';
import ExamSetup from './pages/ExamSetup';
import Practice from './pages/Practice';
import Results from './pages/Results';
import History from './pages/History';
import DataManagement from './pages/DataManagement';
import VocabDashboard from './pages/VocabDashboard';
import VocabEditor from './pages/VocabEditor';
import VocabFlashcard from './pages/VocabFlashcard';
import VocabQuiz from './pages/VocabQuiz';
import AdminLayout from './pages/admin/AdminLayout';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminUsersPage from './pages/admin/AdminUsersPage';
import AdminContentPage from './pages/admin/AdminContentPage';
import AdminAuditLogsPage from './pages/admin/AdminAuditLogsPage';
import AdminBackupsPage from './pages/admin/AdminBackupsPage';
import AdminSettingsPage from './pages/admin/AdminSettingsPage';
import AdminSourcePackagesPage from './pages/admin/AdminSourcePackagesPage';
import { isTtsMuted, setTtsMuted } from './lib/tts';
import { useState, useCallback, createContext, useContext, useEffect, Component } from 'react';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

export const QuizContext = createContext(null);

export function useQuiz() {
  return useContext(QuizContext);
}

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[50vh] flex flex-col items-center justify-center p-6 text-center">
          <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 rounded-2xl p-6 max-w-md w-full">
            <h3 className="text-base font-bold text-rose-800 dark:text-rose-200 mb-2">Đã có lỗi xảy ra</h3>
            <p className="text-xs text-rose-600 dark:text-rose-400 mb-4 font-mono break-words text-left bg-white/60 dark:bg-black/40 p-2.5 rounded-lg border border-rose-100 dark:border-rose-900/40">
              {this.state.error?.message || 'Lỗi không xác định'}
            </p>
            <div className="flex justify-center gap-2">
              <button
                onClick={() => { this.setState({ hasError: false, error: null }); window.location.reload(); }}
                className="bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 px-4 py-2 rounded-lg text-xs font-semibold cursor-pointer hover:bg-slate-800 transition-colors"
              >
                Tải lại trang
              </button>
              <button
                onClick={() => { window.location.href = '/'; }}
                className="border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-4 py-2 rounded-lg text-xs font-medium cursor-pointer hover:bg-slate-50 transition-colors"
              >
                Về trang chủ
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function QuizAppProvider({ dark, toggleDark, fontSizeState, children }) {
  const { user, isAdmin } = useAuth();
  const quiz = useQuizData(user, isAdmin);
  const [appMode, setAppModeState] = useState(() => {
    if (window.location.pathname.startsWith('/vocab')) return 'language';
    return localStorage.getItem('app_learning_mode') || 'quiz';
  });

  const setAppMode = useCallback((mode) => {
    localStorage.setItem('app_learning_mode', mode);
    setAppModeState(mode);
  }, []);

  const [confirmMsg, setConfirmMsg] = useState(null);
  const [confirmCallback, setConfirmCallback] = useState(null);
  const [confirmOpts, setConfirmOpts] = useState({});
  const [toasts, setToasts] = useState([]);
  const [alertInfo, setAlertInfo] = useState(null);
  const [ttsMuted, setTtsMutedState] = useState(() => isTtsMuted());

  const dismissToast = useCallback((id) => {
    setToasts((t) => t.filter((x) => x.id !== id));
  }, []);

  const showToast = useCallback((message, type = 'success', duration = 3500) => {
    const text = typeof message === 'object' && message !== null ? message.message : message;
    const id = `${Date.now()}-${Math.random()}`;
    const toastObj = typeof message === 'object' && message !== null ? { id, type, ...message } : { id, message, type };

    setToasts((current) => (current.some((t) => t.message === text) ? current : [...current, toastObj]));
    setTimeout(() => {
      setToasts((t) => t.filter((x) => x.id !== id));
    }, duration);
  }, []);

  const toggleTts = useCallback(() => {
    const next = !ttsMuted;
    setTtsMuted(next);
    setTtsMutedState(next);
    showToast(next ? 'Đã tắt tự động đọc khi chuyển câu' : 'Đã bật tự động đọc khi chuyển câu', next ? 'info' : 'success');
  }, [ttsMuted, showToast]);

  const showConfirm = useCallback((msg, cb, opts = {}) => {
    setConfirmMsg(msg);
    setConfirmCallback(() => cb);
    setConfirmOpts(opts);
  }, []);

  const hideConfirm = useCallback(() => {
    setConfirmMsg(null);
    setConfirmCallback(null);
    setConfirmOpts({});
  }, []);

  const showAlert = useCallback((title, message, type = 'info') => {
    setAlertInfo({ title, message, type });
  }, []);
  const hideAlert = useCallback(() => setAlertInfo(null), []);

  const ctx = {
    ...quiz,
    isAdmin,
    appMode,
    setAppMode,
    ttsMuted,
    toggleTts,
    fontSizeState,
    showConfirm,
    showToast,
    showAlert,
    dark,
    toggleDark,
  };

  return (
    <QuizContext.Provider value={ctx}>
      {children}
      {confirmMsg && (
        <ConfirmDialog
          title={confirmOpts.title}
          message={confirmMsg}
          danger={confirmOpts.danger !== false}
          yesLabel={confirmOpts.yesLabel}
          noLabel={confirmOpts.noLabel}
          onYes={() => { confirmCallback?.(); hideConfirm(); }}
          onNo={() => { confirmOpts.onNo?.(); hideConfirm(); }}
        />
      )}
      {alertInfo && (
        <AlertDialog title={alertInfo.title} message={alertInfo.message} type={alertInfo.type} onClose={hideAlert} />
      )}
      <Toast toasts={toasts} onDismiss={dismissToast} />
    </QuizContext.Provider>
  );
}

function MainLayout() {
  const location = useLocation();
  const { appMode, setAppMode, dark, toggleDark, ttsMuted, toggleTts, fontSizeState, isLoading, isAdmin } = useQuiz();

  useEffect(() => {
    if (location.pathname.startsWith('/vocab') && appMode !== 'language') {
      setAppMode('language');
    } else if ((location.pathname === '/' || location.pathname === '/practice-setup' || location.pathname === '/editor') && appMode !== 'quiz') {
      setAppMode('quiz');
    }
  }, [location.pathname, appMode, setAppMode]);

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-10 dark:text-slate-200 transition-all">
      <Header
        dark={dark}
        toggleDark={toggleDark}
        appMode={appMode}
        setAppMode={setAppMode}
        ttsMuted={ttsMuted}
        toggleTts={toggleTts}
        fontSizeState={fontSizeState}
      />
      <TabNav />
      {isLoading ? (
        <div className="py-16 flex flex-col items-center justify-center gap-3">
          <div className="w-7 h-7 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-slate-500">Đang tải dữ liệu học tập...</p>
        </div>
      ) : (
        <div className="page-enter">
          <ErrorBoundary>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/editor" element={isAdmin ? <Editor /> : <Navigate to="/" replace />} />
              <Route path="/editor/:testId" element={isAdmin ? <Editor /> : <Navigate to="/" replace />} />
              <Route path="/practice-setup" element={<PracticeSetup />} />
              <Route path="/exam-setup" element={<ExamSetup />} />
              <Route path="/practice" element={<Practice />} />
              <Route path="/results" element={<Results />} />
              <Route path="/history" element={<History />} />
              <Route path="/data" element={<DataManagement />} />

              <Route path="/vocab" element={<VocabDashboard />} />
              <Route path="/vocab-editor" element={isAdmin ? <VocabEditor /> : <Navigate to="/vocab" replace />} />
              <Route path="/vocab-editor/:deckId" element={isAdmin ? <VocabEditor /> : <Navigate to="/vocab" replace />} />
              <Route path="/vocab-learn" element={<VocabFlashcard />} />
              <Route path="/vocab-quiz" element={<VocabQuiz />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </ErrorBoundary>
        </div>
      )}
    </div>
  );
}

export default function App() {
  const { dark, toggle: toggleDark } = useDarkMode();
  const fontSizeState = useFontSize();

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <ErrorBoundary>
            <QuizAppProvider dark={dark} toggleDark={toggleDark} fontSizeState={fontSizeState}>
              <Routes>
                <Route path="/login" element={<LoginPage />} />
                <Route
                  path="/change-password"
                  element={
                    <ProtectedRoute allowPasswordChangeOnly>
                      <ChangePasswordPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin"
                  element={
                    <ProtectedRoute requireAdmin>
                      <AdminLayout />
                    </ProtectedRoute>
                  }
                >
                  <Route index element={<AdminDashboard />} />
                  <Route path="users" element={<AdminUsersPage />} />
                  <Route path="content" element={<AdminContentPage />} />
                  <Route path="audit-logs" element={<AdminAuditLogsPage />} />
                  <Route path="backups" element={<AdminBackupsPage />} />
                  <Route path="source-packages" element={<AdminSourcePackagesPage />} />
                  <Route path="settings" element={<AdminSettingsPage />} />
                </Route>
                <Route
                  path="/*"
                  element={
                    <ProtectedRoute>
                      <MainLayout />
                    </ProtectedRoute>
                  }
                />
              </Routes>
            </QuizAppProvider>
          </ErrorBoundary>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}
