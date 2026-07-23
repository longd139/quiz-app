import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useQuizData } from './hooks/useQuizData';
import Header from './components/Header';
import TabNav from './components/TabNav';
import ConfirmDialog from './components/ConfirmDialog';
import Dashboard from './pages/Dashboard';
import Editor from './pages/Editor';
import PracticeSetup from './pages/PracticeSetup';
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
  const [confirmMsg, setConfirmMsg] = useState(null);
  const [confirmCallback, setConfirmCallback] = useState(null);

  const showConfirm = useCallback((msg, cb) => {
    setConfirmMsg(msg);
    setConfirmCallback(() => cb);
  }, []);

  const hideConfirm = useCallback(() => {
    setConfirmMsg(null);
    setConfirmCallback(null);
  }, []);

  const ctx = { ...quiz, showConfirm };

  return (
    <QuizContext.Provider value={ctx}>
      <BrowserRouter>
        <div className="max-w-2xl mx-auto px-4 pb-8">
          <Header syncStatus={quiz.syncStatus} conflictRef={quiz.conflictRef} resolveConflict={quiz.resolveConflict} />
          <TabNav />
          <div className="page-enter">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/editor" element={<Editor />} />
              <Route path="/editor/:testId" element={<Editor />} />
              <Route path="/practice-setup" element={<PracticeSetup />} />
              <Route path="/practice" element={<Practice />} />
              <Route path="/results" element={<Results />} />
              <Route path="/history" element={<History />} />
              <Route path="/data" element={<DataManagement />} />
            </Routes>
          </div>
        </div>
        {confirmMsg && (
          <ConfirmDialog message={confirmMsg} onYes={() => { confirmCallback?.(); hideConfirm(); }} onNo={hideConfirm} />
        )}
      </BrowserRouter>
    </QuizContext.Provider>
  );
}
