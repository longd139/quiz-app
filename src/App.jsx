import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useQuizData } from './hooks/useQuizData';
import { useDarkMode } from './hooks/useDarkMode';
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
import { useState, useCallback, createContext, useContext } from 'react';

export const QuizContext = createContext(null);

export function useQuiz() {
  return useContext(QuizContext);
}

export default function App() {
  const quiz = useQuizData();
  const { dark, toggle: toggleDark } = useDarkMode();
  const [confirmMsg, setConfirmMsg] = useState(null);
  const [confirmCallback, setConfirmCallback] = useState(null);
  const [confirmOpts, setConfirmOpts] = useState({});
  const [toasts, setToasts] = useState([]);
  const [alertInfo, setAlertInfo] = useState(null);

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

  const showToast = useCallback((message, type = 'success', duration = 3000) => {
    const id = `${Date.now()}-${Math.random()}`;
    setToasts(t => [...t, { id, message, type }]);
    setTimeout(() => {
      setToasts(t => t.filter(x => x.id !== id));
    }, duration);
  }, []);

  const showAlert = useCallback((title, message, type = 'info') => {
    setAlertInfo({ title, message, type });
  }, []);
  const hideAlert = useCallback(() => setAlertInfo(null), []);

  const ctx = { ...quiz, showConfirm, showToast, showAlert };

  return (
    <QuizContext.Provider value={ctx}>
      <BrowserRouter>
        <div className="max-w-2xl mx-auto px-4 pb-8 dark:text-slate-200">
          <Header syncStatus={quiz.syncStatus} dark={dark} toggleDark={toggleDark} />
          <TabNav />
          <div className="page-enter">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/editor" element={<Editor />} />
              <Route path="/editor/:testId" element={<Editor />} />
              <Route path="/practice-setup" element={<PracticeSetup />} />
              <Route path="/exam-setup" element={<ExamSetup />} />
              <Route path="/practice" element={<Practice />} />
              <Route path="/results" element={<Results />} />
              <Route path="/history" element={<History />} />
              <Route path="/data" element={<DataManagement />} />
            </Routes>
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
        <Toast toasts={toasts} />
      </BrowserRouter>
    </QuizContext.Provider>
  );
}
