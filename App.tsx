import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend } from 'recharts';
import { Task, Priority } from './types';
import { breakDownTask, suggestPriority, getMotivation } from './services/pranavService';
import { SparklesIcon, CheckCircleIcon, CircleIcon, TrashIcon, ChartIcon, PlusIcon } from './components/Icons';

// Use local storage to persist tasks
const loadTasks = (): Task[] => {
  const saved = localStorage.getItem('pranav_tasks');
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch (e) {
      console.error("Failed to load tasks", e);
    }
  }
  return [];
};

const COLORS = ['#ef4444', '#f59e0b', '#3b82f6']; // High, Medium, Low colors

export default function App() {
  const [tasks, setTasks] = useState<Task[]>(loadTasks);
  const [inputText, setInputText] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [motivation, setMotivation] = useState<string>("Welcome back, Pranav!");
  const [showStats, setShowStats] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'active' | 'completed'>('all');

  // Save tasks whenever they change
  useEffect(() => {
    localStorage.setItem('pranav_tasks', JSON.stringify(tasks));
  }, [tasks]);

  // Initial motivation
  useEffect(() => {
    const fetchMotivation = async () => {
      const activeCount = tasks.filter(t => !t.completed).length;
      if (activeCount > 0) {
        const msg = await getMotivation(activeCount);
        setMotivation(msg);
      }
    };
    fetchMotivation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run once on mount

  const addTask = useCallback(async (text: string, priorityOverride?: Priority) => {
    if (!text.trim()) return;

    let priority = priorityOverride || Priority.LOW;
    
    // If no override, try to infer priority if it seems urgent, but keep it fast for UX
    // We'll just default to Low unless AI is invoked explicitly via "Ask Pranav" usually, 
    // but here we just add it simply.
    
    const newTask: Task = {
      id: crypto.randomUUID(),
      text: text.trim(),
      completed: false,
      priority,
      createdAt: Date.now()
    };

    setTasks(prev => [newTask, ...prev]);
    setInputText('');
  }, []);

  const handleSmartAdd = async () => {
    if (!inputText.trim()) return;
    setIsAiLoading(true);
    try {
      // 1. Get Priority
      const priority = await suggestPriority(inputText);
      
      // 2. Check if it needs breakdown
      // We assume if it's long, it might need breakdown, but let's just ask AI to break it down 
      // if the user specifically clicked the AI button.
      const subtasks = await breakDownTask(inputText);

      if (subtasks.length > 0) {
        const newTasks = subtasks.map(st => ({
          id: crypto.randomUUID(),
          text: st,
          completed: false,
          priority: priority, // Inherit priority
          createdAt: Date.now()
        }));
        setTasks(prev => [...newTasks, ...prev]);
      } else {
        // Just add the main one if no subtasks returned
        addTask(inputText, priority);
      }
      
      setInputText('');
    } catch (error) {
      console.error("Pranav AI Error", error);
    } finally {
      setIsAiLoading(false);
    }
  };

  const toggleTask = (id: string) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
  };

  const deleteTask = (id: string) => {
    setTasks(prev => prev.filter(t => t.id !== id));
  };

  const filteredTasks = useMemo(() => {
    return tasks.filter(t => {
      if (activeTab === 'active') return !t.completed;
      if (activeTab === 'completed') return t.completed;
      return true;
    });
  }, [tasks, activeTab]);

  const statsData = useMemo(() => {
    const high = tasks.filter(t => t.priority === Priority.HIGH && !t.completed).length;
    const medium = tasks.filter(t => t.priority === Priority.MEDIUM && !t.completed).length;
    const low = tasks.filter(t => t.priority === Priority.LOW && !t.completed).length;
    return [
      { name: 'High', value: high },
      { name: 'Medium', value: medium },
      { name: 'Low', value: low },
    ].filter(d => d.value > 0);
  }, [tasks]);

  const getPriorityColor = (p: Priority) => {
    switch (p) {
      case Priority.HIGH: return 'text-red-400 bg-red-400/10 border-red-400/20';
      case Priority.MEDIUM: return 'text-amber-400 bg-amber-400/10 border-amber-400/20';
      case Priority.LOW: return 'text-blue-400 bg-blue-400/10 border-blue-400/20';
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-4 md:p-8 flex flex-col items-center relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/20 rounded-full blur-[100px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-600/20 rounded-full blur-[100px] pointer-events-none"></div>

      {/* Header */}
      <header className="w-full max-w-3xl mb-8 flex justify-between items-center z-10">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
            Pranav's Workspace
          </h1>
          <p className="text-slate-400 text-sm mt-1 flex items-center gap-2">
            <SparklesIcon className="w-3 h-3 text-yellow-400" />
            Powered by Pranav AI
          </p>
        </div>
        <button 
          onClick={() => setShowStats(!showStats)}
          className="p-2 bg-slate-800 hover:bg-slate-700 rounded-xl border border-slate-700 transition-all active:scale-95"
          title="View Productivity Stats"
        >
          <ChartIcon className="w-6 h-6 text-blue-400" />
        </button>
      </header>

      {/* Main Content */}
      <main className="w-full max-w-3xl flex flex-col gap-6 z-10">
        
        {/* Input Area */}
        <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 p-4 rounded-2xl shadow-xl">
          <div className="flex gap-2">
            <input 
              type="text" 
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !isAiLoading && addTask(inputText)}
              placeholder="What does Pranav need to do today?"
              className="flex-1 bg-slate-900/50 border border-slate-700 text-slate-100 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500/50 placeholder:text-slate-500 transition-all"
            />
          </div>
          <div className="flex justify-between items-center mt-3">
             <span className="text-xs text-slate-500 italic hidden md:block">
               "{motivation}"
             </span>
             <div className="flex gap-2 w-full md:w-auto justify-end">
                <button 
                  onClick={() => addTask(inputText)}
                  disabled={!inputText.trim() || isAiLoading}
                  className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 text-sm font-medium rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
                >
                  <PlusIcon className="w-4 h-4" />
                  Add
                </button>
                <button 
                  onClick={handleSmartAdd}
                  disabled={!inputText.trim() || isAiLoading}
                  className="px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white text-sm font-medium rounded-lg shadow-lg shadow-blue-900/20 transition-all active:scale-95 flex items-center gap-2 disabled:opacity-50"
                >
                  {isAiLoading ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <SparklesIcon className="w-4 h-4" />
                  )}
                  Pranav AI Organize
                </button>
             </div>
          </div>
        </div>

        {/* Stats Visualization (Conditionally Rendered) */}
        {showStats && (
          <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 p-6 rounded-2xl shadow-xl animate-fade-in">
            <h3 className="text-lg font-semibold mb-4 text-slate-200">Pranav's Workload Distribution</h3>
            <div className="h-64 w-full">
              {statsData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statsData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {statsData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <RechartsTooltip 
                      contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: '8px', color: '#f8fafc' }}
                      itemStyle={{ color: '#f8fafc' }}
                    />
                    <Legend verticalAlign="bottom" height={36}/>
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-slate-500">
                  No active tasks to visualize.
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-4 border-b border-slate-800 pb-2 px-2">
          {(['all', 'active', 'completed'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`capitalize text-sm font-medium pb-2 transition-colors relative ${
                activeTab === tab ? 'text-blue-400' : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              {tab}
              {activeTab === tab && (
                <div className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-400 rounded-t-full" />
              )}
            </button>
          ))}
        </div>

        {/* Task List */}
        <div className="space-y-3">
          {filteredTasks.length === 0 ? (
            <div className="text-center py-12 text-slate-600">
              <p>No tasks found via Pranav's search.</p>
            </div>
          ) : (
            filteredTasks.map((task) => (
              <div 
                key={task.id}
                className="group flex items-center gap-3 bg-slate-800 border border-slate-700/50 p-4 rounded-xl hover:border-slate-600 transition-all shadow-sm"
              >
                <button 
                  onClick={() => toggleTask(task.id)}
                  className={`flex-shrink-0 transition-colors ${task.completed ? 'text-green-500' : 'text-slate-600 hover:text-slate-400'}`}
                >
                  {task.completed ? <CheckCircleIcon className="w-6 h-6" /> : <CircleIcon className="w-6 h-6" />}
                </button>
                
                <div className="flex-1 min-w-0">
                  <p className={`text-base truncate ${task.completed ? 'text-slate-500 line-through' : 'text-slate-200'}`}>
                    {task.text}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded border ${getPriorityColor(task.priority)}`}>
                      {task.priority}
                    </span>
                    <span className="text-xs text-slate-600">
                      {new Date(task.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                <button 
                  onClick={() => deleteTask(task.id)}
                  className="opacity-0 group-hover:opacity-100 p-2 text-slate-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all"
                >
                  <TrashIcon className="w-5 h-5" />
                </button>
              </div>
            ))
          )}
        </div>

      </main>

      {/* Footer */}
      <footer className="mt-12 text-slate-600 text-sm z-10 text-center">
        <p>Designed & Built by <span className="text-blue-500 font-semibold">Pranav</span></p>
        <p className="text-xs mt-1 opacity-50">&copy; {new Date().getFullYear()} Pranav Technologies</p>
      </footer>
    </div>
  );
}