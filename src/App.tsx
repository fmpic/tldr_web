import { useState, useEffect, useRef } from 'react';
import useSWR from 'swr';
import ReactMarkdown from 'react-markdown';
import rehypeHighlight from 'rehype-highlight';
import { Search, Terminal, AlertCircle, Moon, Sun, Github, ArrowUp, Command, History, Trash2 } from 'lucide-react';
import clsx from 'clsx';
import 'highlight.js/styles/github-dark.css';
import { useTldrIndex } from './hooks/useTldrIndex';

// Helper to fetch text
const fetcher = (url: string) => fetch(url).then(async (res) => {
  if (!res.ok) throw new Error('Command not found');
  return res.text();
});

const PLATFORMS = ['common', 'linux', 'osx', 'windows', 'android', 'sunos'];
const BASE_URL = 'https://raw.githubusercontent.com/tldr-pages/tldr/main/pages';

function App() {
  const [query, setQuery] = useState('');
  const [command, setCommand] = useState(''); 
  const [platform, setPlatform] = useState('common');
  
  // Initialize Dark Mode from system preference
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return true;
  });
  
  const [showBackToTop, setShowBackToTop] = useState(false);
  
  // Autocomplete state
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [recentSearches, setRecentSearches] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('tldr_recent_searches');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Load Index
  const { commands: indexCommands } = useTldrIndex();

  const addToHistory = (cmd: string) => {
    setRecentSearches(prev => {
      const newHistory = [cmd, ...prev.filter(c => c !== cmd)].slice(0, 8);
      localStorage.setItem('tldr_recent_searches', JSON.stringify(newHistory));
      return newHistory;
    });
  };

  const clearHistory = () => {
    setRecentSearches([]);
    localStorage.removeItem('tldr_recent_searches');
  };

  // Listen for system theme changes
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => setDarkMode(e.matches);
    
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  // Toggle Dark Mode
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  // Handle Scroll for Back to Top
  useEffect(() => {
    const handleScroll = () => {
      setShowBackToTop(window.scrollY > 300);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Handle click outside to close suggestions
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Update suggestions when query changes
  useEffect(() => {
    if (!query.trim()) {
      setSuggestions([]);
      setSelectedIndex(0);
      return;
    }
    
    const lowerQuery = query.toLowerCase();
    const exactMatches = indexCommands.filter(c => c.name.toLowerCase().startsWith(lowerQuery)).map(c => c.name);
    setSuggestions(exactMatches.slice(0, 8)); // MD3 suggests fewer, cleaner options
    setSelectedIndex(0);
  }, [query, indexCommands]);

  // Smart Platform Switching
  useEffect(() => {
    const cmdData = indexCommands.find(c => c.name === command);
    if (cmdData) {
      const supported = cmdData.platform;
      if (!supported.includes(platform)) {
        if (supported.includes('common')) setPlatform('common');
        else if (supported.includes('linux')) setPlatform('linux');
        else if (supported.includes('osx')) setPlatform('osx');
        else if (supported.includes('windows')) setPlatform('windows');
        else setPlatform(supported[0]);
      }
    }
  }, [command, indexCommands]); 

  const { data, error, isLoading } = useSWR(
    command ? `${BASE_URL}/${platform}/${command}.md` : null,
    fetcher,
    {
      shouldRetryOnError: false,
      onErrorRetry: (error) => {
          if (error.status === 404) return
      }
    }
  );

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Auto-select selected suggestion if available, otherwise use query
    const targetCommand = (suggestions.length > 0 && selectedIndex >= 0 && selectedIndex < suggestions.length)
      ? suggestions[selectedIndex]
      : query.trim().toLowerCase();
    
    if (targetCommand) {
      setQuery(targetCommand);
      setCommand(targetCommand);
      setShowSuggestions(false);
      addToHistory(targetCommand);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (suggestions.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev + 1) % suggestions.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev - 1 + suggestions.length) % suggestions.length);
    }
  };

  const handleSuggestionClick = (cmdName: string) => {
    setQuery(cmdName);
    setCommand(cmdName);
    setShowSuggestions(false);
    addToHistory(cmdName);
  };

  const currentCmdData = indexCommands.find(c => c.name === command);
  const availablePlatforms = currentCmdData?.platform || PLATFORMS;

  // MD3 Colors: Using Zinc as base neutral, Emerald as Primary
  // Backgrounds: surface-container-lowest, low, high, etc.
  
  return (
    <div className={`min-h-screen bg-[#FDFDF5] dark:bg-[#191C1A] text-[#191C1A] dark:text-[#E2E3DE] transition-colors duration-300 flex flex-col font-sans selection:bg-emerald-200 dark:selection:bg-emerald-800`}>
      
      {/* Top App Bar (Small variant) */}
      <header className="sticky top-0 z-30 bg-[#FDFDF5]/80 dark:bg-[#191C1A]/80 backdrop-blur-md border-b border-transparent transition-colors">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div 
            className="flex items-center gap-3 cursor-pointer group" 
            onClick={() => {setCommand(''); setQuery('')}}
          >
            <div className="bg-emerald-600 dark:bg-emerald-400 text-white dark:text-[#003825] p-2 rounded-xl shadow-sm group-hover:scale-105 transition-transform duration-200">
              <Terminal size={20} strokeWidth={2.5} />
            </div>
            <span className="font-medium text-xl tracking-tight">tldr<span className="text-emerald-700 dark:text-emerald-300">.web</span></span>
          </div>
          
          <div className="flex items-center gap-2">
             <a 
               href="https://github.com/tldr-pages/tldr" 
               target="_blank" 
               rel="noreferrer" 
               className="p-2.5 rounded-full hover:bg-[#E2E3DE] dark:hover:bg-[#414942] text-[#414942] dark:text-[#C1C9BF] transition-colors"
               aria-label="GitHub"
             >
              <Github size={24} />
            </a>
            <button 
              onClick={() => setDarkMode(!darkMode)}
              className="p-2.5 rounded-full hover:bg-[#E2E3DE] dark:hover:bg-[#414942] text-[#414942] dark:text-[#C1C9BF] transition-colors"
              aria-label="Toggle Theme"
            >
              {darkMode ? <Sun size={24} /> : <Moon size={24} />}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-3xl mx-auto px-4 w-full pt-8 pb-20">
        
        {/* Search Field (MD3 Filled Text Field style but rounded-full) */}
        <div className="mb-8 relative z-20" ref={searchContainerRef}>
          <form onSubmit={handleSearchSubmit} className="relative shadow-sm hover:shadow-md focus-within:shadow-md transition-shadow duration-300 rounded-full">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-[#414942] dark:text-[#C1C9BF]">
              <Search size={24} />
            </div>
            <input
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setShowSuggestions(true);
              }}
              onKeyDown={handleKeyDown}
              onFocus={() => setShowSuggestions(true)}
              placeholder="Search commands..."
              className="w-full pl-14 pr-6 py-4 bg-[#EEF1ED] dark:bg-[#2C312D] text-lg rounded-full border-none focus:ring-2 focus:ring-emerald-500/50 placeholder:text-[#717971] dark:placeholder:text-[#8B938D] transition-colors"
              autoFocus
            />
            {query && (
              <div className="absolute inset-y-0 right-4 flex items-center">
                 <kbd className="hidden sm:inline-flex items-center h-6 px-2 text-xs font-medium text-[#414942] dark:text-[#C1C9BF] bg-white dark:bg-[#414942] rounded-md border border-gray-200 dark:border-gray-600 opacity-60">
                    <Command size={10} className="mr-1"/> Enter
                 </kbd>
              </div>
            )}
          </form>
          
          {/* Suggestions Dropdown (MD3 Menu) */}
          {showSuggestions && suggestions.length > 0 && (
            <div className="absolute w-full mt-2 bg-[#EEF1ED] dark:bg-[#2C312D] rounded-[20px] shadow-lg overflow-hidden py-2 animate-in fade-in slide-in-from-top-2 duration-200">
              {suggestions.map((cmd, index) => (
                <button
                  key={cmd}
                  onClick={() => handleSuggestionClick(cmd)}
                  onMouseEnter={() => setSelectedIndex(index)}
                  className={clsx(
                    "w-full text-left px-6 py-3 transition-colors flex items-center gap-4 text-base",
                    index === selectedIndex ? "bg-[#DEE5D9] dark:bg-[#414942]" : "hover:bg-[#DEE5D9] dark:hover:bg-[#414942]",
                    index !== suggestions.length - 1 && "border-b border-[#C2C9BD]/20 dark:border-[#8B938D]/20"
                  )}
                >
                  <Terminal size={18} className="text-[#414942] dark:text-[#C1C9BF] opacity-70" />
                  <span>{cmd}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Recent Searches Section */}
        {recentSearches.length > 0 && !command && (
          <div className="mb-8 px-2 animate-in fade-in slide-in-from-top-4 duration-500 delay-100">
             <div className="flex items-center justify-between mb-3 text-sm font-medium text-[#717971] dark:text-[#8B938D]">
               <div className="flex items-center gap-2">
                 <History size={16} />
                 <span>Recent Searches</span>
               </div>
               <button 
                 onClick={clearHistory}
                 className="flex items-center gap-1 hover:text-red-600 dark:hover:text-red-400 transition-colors px-2 py-1 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20"
                 aria-label="Clear history"
               >
                 <Trash2 size={14} />
                 <span className="text-xs">Clear</span>
               </button>
             </div>
             <div className="flex flex-wrap gap-2">
               {recentSearches.map(term => (
                 <button
                   key={term}
                   onClick={() => handleSuggestionClick(term)}
                   className="
                     px-4 py-1.5 rounded-lg text-sm transition-colors
                     bg-[#EEF1ED] dark:bg-[#2C312D] text-[#414942] dark:text-[#C1C9BF]
                     hover:bg-[#DEE5D9] dark:hover:bg-[#414942]
                     flex items-center gap-2
                   "
                 >
                   {term}
                 </button>
               ))}
             </div>
          </div>
        )}

        {/* Platform Chips (MD3 Filter Chips) */}
        {command && (
          <div className="flex overflow-x-auto pb-4 scrollbar-hide gap-2 mb-2 px-1">
            {PLATFORMS.map((p) => {
              const isAvailable = availablePlatforms.includes(p);
              if (!isAvailable) return null;

              const isSelected = platform === p;
              
              return (
                <button
                  key={p}
                  onClick={() => setPlatform(p)}
                  className={clsx(
                    "px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all duration-200 border",
                    isSelected 
                      ? "bg-[#C2EFD0] dark:bg-[#005138] text-[#002114] dark:text-[#C2EFD0] border-transparent shadow-sm" 
                      : "bg-transparent border-[#717971] text-[#414942] dark:text-[#E2E3DE] hover:bg-[#EEF1ED] dark:hover:bg-[#2C312D]"
                  )}
                >
                  {isSelected && <span className="mr-1.5 font-bold">✓</span>}
                  {p}
                </button>
              );
            })}
          </div>
        )}

        {/* Content Card (MD3 Elevated Card) */}
        <div className={clsx(
            "rounded-[28px] overflow-hidden transition-all duration-500 ease-out",
            command ? "bg-[#F0F4F8] dark:bg-[#1E1E1E] shadow-sm min-h-[300px]" : "bg-transparent min-h-[400px] flex items-center justify-center"
        )}>
          {!command ? (
             <div className="flex flex-col items-center justify-center text-center p-8 animate-in zoom-in-95 duration-500">
               <div className="bg-[#C2EFD0] dark:bg-[#005138] p-6 rounded-3xl mb-6 shadow-sm">
                 <Terminal size={64} className="text-[#002114] dark:text-[#C2EFD0]" />
               </div>
               <h2 className="text-3xl font-normal mb-3 text-[#191C1A] dark:text-[#E2E3DE]">Welcome to tldr.web</h2>
               <p className="max-w-md text-[#414942] dark:text-[#C1C9BF] text-lg leading-relaxed">
                 The community-driven man pages. <br/>
                 Simplified, practical, and beautiful.
               </p>
             </div>
          ) : isLoading ? (
            <div className="flex flex-col items-center justify-center h-80 text-[#414942] dark:text-[#C1C9BF]">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-500 mb-6"></div>
              <p className="text-lg">Fetching knowledge...</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center h-80 p-8 text-center">
              <div className="bg-[#FFDAD6] dark:bg-[#93000A] p-4 rounded-full mb-4 text-[#410002] dark:text-[#FFDAD6]">
                <AlertCircle size={40} />
              </div>
              <h3 className="text-2xl font-normal mb-2">No entry found</h3>
              <p className="text-[#414942] dark:text-[#C1C9BF] max-w-md mb-6">
                We couldn't find a page for <span className="font-mono bg-[#E2E3DE] dark:bg-[#414942] px-2 py-0.5 rounded-md mx-1">"{command}"</span> on <span className="font-mono bg-[#E2E3DE] dark:bg-[#414942] px-2 py-0.5 rounded-md mx-1">{platform}</span>.
              </p>
              
              {availablePlatforms.length > 0 && availablePlatforms[0] !== platform && (
                 <div className="flex flex-col items-center gap-3">
                    <span className="text-sm text-[#717971] dark:text-[#8B938D]">Available on:</span>
                    <div className="flex gap-2 justify-center flex-wrap">
                      {availablePlatforms.map(p => (
                        <button 
                          key={p} 
                          onClick={() => setPlatform(p)}
                          className="text-sm bg-[#C2EFD0] dark:bg-[#005138] text-[#002114] dark:text-[#C2EFD0] px-4 py-2 rounded-xl transition-transform hover:scale-105"
                        >
                          {p}
                        </button>
                      ))}
                    </div>
                 </div>
              )}
            </div>
          ) : (
            <article className="
              p-5 sm:p-8 md:p-10
              prose prose-lg max-w-none 
              dark:prose-invert
              prose-headings:font-normal prose-headings:tracking-tight
              prose-h1:text-4xl prose-h1:mb-6 prose-h1:text-[#002114] dark:prose-h1:text-[#C2EFD0]
              prose-p:text-[#414942] dark:prose-p:text-[#C1C9BF] prose-p:leading-relaxed
              prose-code:text-emerald-700 dark:prose-code:text-emerald-300 prose-code:bg-[#E2E3DE] dark:prose-code:bg-[#414942] prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded-md prose-code:font-normal prose-code:before:content-none prose-code:after:content-none
              prose-pre:bg-[#111411] dark:prose-pre:bg-[#000000] prose-pre:rounded-[20px] prose-pre:p-5 sm:prose-pre:p-6 prose-pre:shadow-sm prose-pre:border prose-pre:border-transparent dark:prose-pre:border-[#2C312D] prose-pre:overflow-x-auto
              prose-li:marker:text-emerald-500
            ">
               <ReactMarkdown rehypePlugins={[rehypeHighlight]}>
                {data || ''}
              </ReactMarkdown>
            </article>
          )}
        </div>
      </main>

      {/* FAB (Floating Action Button) - MD3 Standard */}
      <div className={clsx(
        "fixed bottom-8 right-8 z-50 transition-all duration-500 ease-out transform",
        showBackToTop ? "translate-y-0 opacity-100" : "translate-y-20 opacity-0 pointer-events-none"
      )}>
        <button
          onClick={scrollToTop}
          className="
            flex items-center justify-center w-14 h-14 
            bg-[#C2EFD0] dark:bg-[#005138] 
            text-[#002114] dark:text-[#C2EFD0] 
            rounded-2xl shadow-lg hover:shadow-xl hover:scale-105 
            transition-all duration-300
            focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500
          "
          aria-label="Back to top"
        >
          <ArrowUp size={24} />
        </button>
      </div>

      {/* Footer */}
      <footer className="py-8 text-center text-sm text-[#717971] dark:text-[#8B938D]">
        <p>Powered by <a href="https://github.com/tldr-pages/tldr" className="underline hover:text-emerald-600 dark:hover:text-emerald-400 decoration-2 decoration-transparent hover:decoration-current transition-all">tldr-pages</a> & Material You</p>
      </footer>
    </div>
  );
}

export default App;