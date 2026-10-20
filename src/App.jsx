import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { useQuizData } from './hooks/useQuizData';
import { useDarkMode } from './hooks/useDarkMode';
import { useFontSize } from './hooks/useFontSize';
import Header from './components/Header';
import TabNav from './components/TabNav';
import ConfirmDialog from './components/ConfirmDialog';
import AlertDialog from './components/AlertDialog';
import Toast from './components/Toast';
import Dashboard from './pages/Dashboard';
import Editor from './pages/Editor';
import PracticeSetup from './pages/PracticeSetup';
import ExamSetup from './pages/ExamSetup';
import Practice from './pages/Practice';
import Results from './pages/Results';
import History from './pages/History';
import DataManagement from './pages/DataManagement';

// Language Learning Pages
import VocabDashboard from './pages/VocabDashboard';
import VocabEditor from './pages/VocabEditor';
import VocabFlashcard from './pages/VocabFlashcard';
import VocabQuiz from './pages/VocabQuiz';
import { isTtsMuted, setTtsMuted } from './lib/tts';

import { useState, useCallback, createContext, useContext, useEffect, Component } from 'react';

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

function MainLayout({ quiz, dark, toggleDark, fontSizeState }) {
  const location = useLocation();

  const [appMode, setAppModeState] = useState(() => {
    // If opening a vocab URL directly, default to language mode
    if (window.location.pathname.startsWith('/vocab')) {
      return 'language';
    }
    return localStorage.getItem('app_learning_mode') || 'quiz';
  });

  const setAppMode = useCallback((mode) => {
    localStorage.setItem('app_learning_mode', mode);
    setAppModeState(mode);
  }, []);

  // Sync mode if user navigates via URL
  useEffect(() => {
    if (location.pathname.startsWith('/vocab')) {
      if (appMode !== 'language') {
        setAppModeState('language');
        localStorage.setItem('app_learning_mode', 'language');
      }
    } else if (location.pathname === '/' || location.pathname === '/practice-setup' || location.pathname === '/editor') {
      if (appMode !== 'quiz') {
        setAppModeState('quiz');
        localStorage.setItem('app_learning_mode', 'quiz');
      }
    }
  }, [location.pathname]);

  const [confirmMsg, setConfirmMsg] = useState(null);
  const [confirmCallback, setConfirmCallback] = useState(null);
  const [confirmOpts, setConfirmOpts] = useState({});
  const [toasts, setToasts] = useState([]);
  const [alertInfo, setAlertInfo] = useState(null);

  const dismissToast = useCallback((id) => {
    setToasts(t => t.filter(x => x.id !== id));
  }, []);

  const showToast = useCallback((message, type = 'success', duration = 3500) => {
    const text = typeof message === 'object' && message !== null ? message.message : message;
    const id = `${Date.now()}-${Math.random()}`;
    const toastObj = typeof message === 'object' && message !== null
      ? { id, type, ...message }
      : { id, message, type };

    setToasts(current => {
      // Prevent showing the exact same toast twice simultaneously
      if (current.some(t => t.message === text)) {
        return current;
      }
      return [...current, toastObj];
    });

    setTimeout(() => {
      setToasts(t => t.filter(x => x.id !== id));
    }, duration);
  }, []);

  const [ttsMuted, setTtsMutedState] = useState(() => isTtsMuted());

  const toggleTts = useCallback(() => {
    const next = !ttsMuted;
    setTtsMuted(next);
    setTtsMutedState(next);
    if (next) {
      showToast('Đã tắt tự động đọc khi chuyển câu', 'info');
    } else {
      showToast('Đã bật tự động đọc khi chuyển câu', 'success');
    }
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
    appMode,
    setAppMode,
    ttsMuted,
    toggleTts,
    fontSizeState,
    showConfirm,
    showToast,
    showAlert
  };

  return (
    <QuizContext.Provider value={ctx}>
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-10 dark:text-slate-200 transition-all">
        <Header
          syncStatus={quiz.syncStatus}
          dark={dark}
          toggleDark={toggleDark}
          appMode={appMode}
          setAppMode={setAppMode}
          ttsMuted={ttsMuted}
          toggleTts={toggleTts}
          fontSizeState={fontSizeState}
        />
        <TabNav />
        <div className="page-enter">
          <ErrorBoundary>
            <Routes>
              {/* Quiz Mode Routes */}
              <Route path="/" element={<Dashboard />} />
              <Route path="/editor" element={<Editor />} />
              <Route path="/editor/:testId" element={<Editor />} />
              <Route path="/practice-setup" element={<PracticeSetup />} />
              <Route path="/exam-setup" element={<ExamSetup />} />
              <Route path="/practice" element={<Practice />} />
              <Route path="/results" element={<Results />} />
              <Route path="/history" element={<History />} />
              <Route path="/data" element={<DataManagement />} />

              {/* Language Learning Mode Routes */}
              <Route path="/vocab" element={<VocabDashboard />} />
              <Route path="/vocab-editor" element={<VocabEditor />} />
              <Route path="/vocab-editor/:deckId" element={<VocabEditor />} />
              <Route path="/vocab-learn" element={<VocabFlashcard />} />
              <Route path="/vocab-quiz" element={<VocabQuiz />} />
            </Routes>
          </ErrorBoundary>
        </div>
      </div>

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
        <AlertDialog
          title={alertInfo.title}
          message={alertInfo.message}
          type={alertInfo.type}
          onClose={hideAlert}
        />
      )}
      <Toast toasts={toasts} onDismiss={dismissToast} />
    </QuizContext.Provider>
  );
}

export default function App() {
  const quiz = useQuizData();
  const { dark, toggle: toggleDark } = useDarkMode();
  const fontSizeState = useFontSize();

  return (
    <BrowserRouter>
      <ErrorBoundary>
        <MainLayout quiz={quiz} dark={dark} toggleDark={toggleDark} fontSizeState={fontSizeState} />
      </ErrorBoundary>
    </BrowserRouter>
  );
}
