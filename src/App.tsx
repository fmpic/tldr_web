import { useState, useEffect, useRef } from 'react';
import useSWR from 'swr';
import ReactMarkdown from 'react-markdown';
import rehypeHighlight from 'rehype-highlight';
import { Search, Terminal, AlertCircle, Moon, Sun, Github, ArrowUp } from 'lucide-react';
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
  const [darkMode, setDarkMode] = useState(true);
  const [showBackToTop, setShowBackToTop] = useState(false);
  
  // Autocomplete state
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Load Index
  const { commands: indexCommands } = useTldrIndex();

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
      return;
    }
    
    // Simple prefix match, then includes match
    const lowerQuery = query.toLowerCase();
    const exactMatches = indexCommands.filter(c => c.name.toLowerCase().startsWith(lowerQuery)).map(c => c.name);
    // Limit to 10 suggestions to keep UI clean
    setSuggestions(exactMatches.slice(0, 10));
  }, [query, indexCommands]);

  // Smart Platform Switching
  useEffect(() => {
    const cmdData = indexCommands.find(c => c.name === command);
    if (cmdData) {
      const supported = cmdData.platform;
      // If current platform is not supported, switch to best available
      if (!supported.includes(platform)) {
        if (supported.includes('common')) setPlatform('common');
        else if (supported.includes('linux')) setPlatform('linux');
        else if (supported.includes('osx')) setPlatform('osx');
        else if (supported.includes('windows')) setPlatform('windows');
        else setPlatform(supported[0]);
      }
    }
  }, [command, indexCommands]); // Keep 'platform' out of dependency to avoid loops, we only want to react to command changes

  // Fetch content
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
    if (query.trim()) {
      setCommand(query.trim().toLowerCase());
      setShowSuggestions(false);
    }
  };

  const handleSuggestionClick = (cmdName: string) => {
    setQuery(cmdName);
    setCommand(cmdName);
    setShowSuggestions(false);
  };

  // Determine available platforms for current command (for UI state)
  const currentCmdData = indexCommands.find(c => c.name === command);
  const availablePlatforms = currentCmdData?.platform || PLATFORMS;

  return (
    <div className={`min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 transition-colors duration-200 flex flex-col font-sans`}>
      {/* Header */}
      <header className="border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-xl cursor-pointer" onClick={() => {setCommand(''); setQuery('')}}>
            <div className="bg-emerald-500 text-white p-1.5 rounded-md">
              <Terminal size={20} />
            </div>
            <span>tldr<span className="text-emerald-500">.web</span></span>
          </div>
          
          <div className="flex items-center gap-4">
             <a href="https://github.com/tldr-pages/tldr" target="_blank" rel="noreferrer" className="text-gray-500 hover:text-gray-900 dark:hover:text-gray-100 transition-colors">
              <Github size={20} />
            </a>
            <button 
              onClick={() => setDarkMode(!darkMode)}
              className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              {darkMode ? <Sun size={20} /> : <Moon size={20} />}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-4xl mx-auto px-4 py-8 w-full">
        
        {/* Search & Controls */}
        <div className="mb-8 space-y-4">
          <div ref={searchContainerRef} className="relative group">
            <form onSubmit={handleSearchSubmit}>
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400 group-focus-within:text-emerald-500 transition-colors">
                <Search size={20} />
              </div>
              <input
                type="text"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setShowSuggestions(true);
                }}
                onFocus={() => setShowSuggestions(true)}
                placeholder="Search command (e.g., git, tar, docker)..."
                className="w-full pl-10 pr-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all shadow-sm"
                autoFocus
              />
            </form>
            
            {/* Suggestions Dropdown */}
            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute z-20 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg overflow-hidden max-h-60 overflow-y-auto">
                {suggestions.map((cmd) => (
                  <button
                    key={cmd}
                    onClick={() => handleSuggestionClick(cmd)}
                    className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex items-center gap-2"
                  >
                    <Terminal size={14} className="text-gray-400" />
                    <span>{cmd}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Platform Tabs */}
          <div className="flex overflow-x-auto pb-2 scrollbar-hide gap-2">
            {PLATFORMS.map((p) => {
              const isAvailable = availablePlatforms.includes(p);
              if (!isAvailable && command) return null; // Hide unavailable platforms only if a command is selected

              return (
                <button
                  key={p}
                  onClick={() => setPlatform(p)}
                  className={clsx(
                    "px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors",
                    platform === p 
                      ? "bg-emerald-500 text-white shadow-md" 
                      : "bg-gray-200 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-300 dark:hover:bg-gray-700",
                    !isAvailable && command && "opacity-50 cursor-not-allowed"
                  )}
                  disabled={!isAvailable && !!command}
                >
                  {p}
                </button>
              );
            })}
          </div>
        </div>

        {/* Content Area */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden min-h-[300px]">
          {!command ? (
             <div className="flex flex-col items-center justify-center h-64 text-gray-400 text-center p-6">
               <Terminal size={48} className="mb-4 opacity-20" />
               <h2 className="text-xl font-semibold mb-2 text-gray-600 dark:text-gray-300">Welcome to tldr.web</h2>
               <p className="max-w-sm">
                 Simplified and community-driven man pages. <br/>
                 Start by typing a command in the search box above.
               </p>
             </div>
          ) : isLoading ? (
            <div className="flex flex-col items-center justify-center h-64 text-gray-400">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500 mb-4"></div>
              <p>Fetching tldr page...</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center h-64 text-red-500 p-8 text-center">
              <AlertCircle size={48} className="mb-4 opacity-50" />
              <h3 className="text-lg font-bold mb-2">Command not found</h3>
              <p className="text-gray-500 dark:text-gray-400 max-w-md">
                Could not find page for <span className="font-mono bg-gray-100 dark:bg-gray-900 px-1 rounded">"{command}"</span> in <span className="font-mono bg-gray-100 dark:bg-gray-900 px-1 rounded">{platform}</span>.
              </p>
              {availablePlatforms.length > 0 && availablePlatforms[0] !== platform && (
                 <div className="mt-4 flex gap-2 justify-center flex-wrap">
                    {availablePlatforms.map(p => (
                       <button 
                         key={p} 
                         onClick={() => setPlatform(p)}
                         className="text-xs bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                       >
                         Try {p}
                       </button>
                    ))}
                 </div>
              )}
            </div>
          ) : (
            <article className="prose prose-slate dark:prose-invert max-w-none p-6 prose-pre:bg-gray-900 dark:prose-pre:bg-[#0d1117] prose-pre:border dark:prose-pre:border-gray-700 prose-code:text-emerald-600 dark:prose-code:text-emerald-400 prose-headings:text-gray-900 dark:prose-headings:text-gray-100">
               <ReactMarkdown rehypePlugins={[rehypeHighlight]}>
                {data || ''}
              </ReactMarkdown>
            </article>
          )}
        </div>
      </main>

      {/* Back to Top Button */}
      <button
        onClick={scrollToTop}
        className={clsx(
          "fixed bottom-8 right-8 p-3 rounded-full bg-emerald-500 text-white shadow-lg transition-all duration-300 hover:bg-emerald-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 z-50",
          showBackToTop ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10 pointer-events-none"
        )}
        aria-label="Back to top"
      >
        <ArrowUp size={24} />
      </button>

      {/* Footer */}
      <footer className="py-6 text-center text-sm text-gray-500 dark:text-gray-400">
        <p>Powered by <a href="https://github.com/tldr-pages/tldr" className="underline hover:text-emerald-500">tldr-pages</a></p>
      </footer>
    </div>
  );
}

export default App;
