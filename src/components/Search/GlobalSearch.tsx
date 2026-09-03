"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  Clock,
  Trash2,
  X,
  Play,
  Film,
  Tv,
  Flame,
  Trophy,
  Loader2,
  ArrowRight,
  ArrowLeft,
  Sparkles,
} from "lucide-react";
import Image from "next/image";
import { GATED_CONFIG } from "@/config/gated-sections";

interface SuggestionItem {
  id: string;
  name: string;
  type_name: string;
  year: string;
  pic: string;
  actor: string;
  remarks: string;
}

const HISTORY_KEY = "4kvm_search_history";
const MAX_HISTORY = 10;

export function useSearchHistory() {
  const [history, setHistory] = useState<string[]>([]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(HISTORY_KEY);
      if (stored) {
        setHistory(JSON.parse(stored));
      }
    } catch (e) {}
  }, []);

  const addHistory = (term: string) => {
    const clean = term.trim();
    if (!clean) return;
    try {
      const updated = [clean, ...history.filter((h) => h !== clean)].slice(0, MAX_HISTORY);
      setHistory(updated);
      localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
    } catch (e) {}
  };

  const removeHistory = (term: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    try {
      const updated = history.filter((h) => h !== term);
      setHistory(updated);
      localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
    } catch (e) {}
  };

  const clearHistory = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    try {
      setHistory([]);
      localStorage.removeItem(HISTORY_KEY);
    } catch (e) {}
  };

  return { history, addHistory, removeHistory, clearHistory };
}

// 高亮匹配文字
function HighlightMatchedText({ text, query }: { text: string; query: string }) {
  if (!query.trim()) return <span>{text}</span>;

  // 尝试匹配汉字或拼音
  const q = query.trim();
  const index = text.toLowerCase().indexOf(q.toLowerCase());
  if (index === -1) {
    return <span>{text}</span>;
  }

  const before = text.slice(0, index);
  const match = text.slice(index, index + q.length);
  const after = text.slice(index + q.length);

  return (
    <span>
      {before}
      <span className="text-cyan-400 font-bold underline underline-offset-2">{match}</span>
      {after}
    </span>
  );
}

/**
 * 桌面端显眼搜索框 + 联想下拉菜单
 */
export function DesktopSearch() {
  const router = useRouter();
  const { history, addHistory, removeHistory, clearHistory } = useSearchHistory();
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<SuggestionItem[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // 快捷键 Ctrl+K / Cmd+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        inputRef.current?.focus();
        setIsOpen(true);
      } else if (e.key === "Escape") {
        setIsOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // 点击外部关闭
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // 防抖联想请求
  useEffect(() => {
    const q = query.trim();
    if (!q) {
      setSuggestions([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const timer = setTimeout(() => {
      const pin = typeof window !== "undefined" ? localStorage.getItem(GATED_CONFIG.storageKey) || "" : "";
      const headers: Record<string, string> = {};
      if (pin) headers[GATED_CONFIG.headerKey] = pin;

      fetch(`/api/vod/suggest?q=${encodeURIComponent(q)}&limit=6`, { headers })
        .then((res) => res.json())
        .then((data) => {
          setSuggestions(data.list || []);
          setLoading(false);
        })
        .catch(() => setLoading(false));
    }, 150);

    return () => clearTimeout(timer);
  }, [query]);

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    const clean = query.trim();
    if (clean) {
      addHistory(clean);
      setIsOpen(false);
      router.push(`/search?q=${encodeURIComponent(clean)}`);
    }
  };

  const handleSelectHistory = (term: string) => {
    setQuery(term);
    addHistory(term);
    setIsOpen(false);
    router.push(`/search?q=${encodeURIComponent(term)}`);
  };

  const handleSelectSuggestion = (item: SuggestionItem) => {
    addHistory(item.name);
    setIsOpen(false);
    router.push(`/play/${item.id}`);
  };

  return (
    <div ref={containerRef} className="relative w-72 lg:w-96">
      {/* 搜索输入条 */}
      <form onSubmit={handleSubmit} className="relative flex items-center">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onFocus={() => setIsOpen(true)}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          placeholder="搜索片名、拼音、演员 (支持全拼/首字母)..."
          className="w-full bg-dark-900/90 text-sm text-white placeholder-gray-400/80 px-4 py-2 pl-9 pr-16 rounded-xl border border-white/10 hover:border-white/20 focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 shadow-inner transition duration-200"
        />
        <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5 pointer-events-none" />

        {/* 右侧快捷键或清除按钮 */}
        <div className="absolute right-2.5 flex items-center gap-1">
          {query ? (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                inputRef.current?.focus();
              }}
              className="p-1 rounded-md text-gray-400 hover:text-white hover:bg-white/10 transition"
              title="清空"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          ) : (
            <kbd className="hidden lg:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-mono text-gray-400 bg-white/5 rounded border border-white/10 select-none">
              <span className="text-xs">⌘</span>K
            </kbd>
          )}
        </div>
      </form>

      {/* 智能联想与历史下拉面板 */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 sm:-right-8 lg:-right-16 mt-2 bg-dark-900/95 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-150">
          {/* 状态 1: 输入为空，展示搜索历史与推荐热词 */}
          {!query.trim() ? (
            <div className="p-4 space-y-4">
              {history.length > 0 && (
                <div>
                  <div className="flex items-center justify-between text-xs text-gray-400 mb-2.5 px-1">
                    <span className="flex items-center gap-1.5 font-medium">
                      <Clock className="w-3.5 h-3.5 text-cyan-400" />
                      搜索历史
                    </span>
                    <button
                      onClick={clearHistory}
                      className="flex items-center gap-1 hover:text-rose-400 transition"
                      title="清空全部搜索历史"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      清空
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {history.map((term) => (
                      <div
                        key={term}
                        onClick={() => handleSelectHistory(term)}
                        className="group flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-lg bg-white/5 hover:bg-cyan-500/15 text-gray-300 hover:text-cyan-300 border border-white/5 hover:border-cyan-500/30 cursor-pointer transition"
                      >
                        <span>{term}</span>
                        <button
                          onClick={(e) => removeHistory(term, e)}
                          className="text-gray-500 group-hover:text-cyan-300/80 hover:!text-rose-400 transition"
                          title="删除该记录"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 快捷热门板块 */}
              <div>
                <div className="flex items-center gap-1.5 text-xs font-medium text-gray-400 mb-2 px-1">
                  <Flame className="w-3.5 h-3.5 text-amber-400" />
                  快捷发现
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <button
                    onClick={() => handleSelectHistory("2026")}
                    className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-left text-gray-300 hover:text-white transition flex items-center justify-between"
                  >
                    <span>⚡ 2026 最新大片</span>
                    <ArrowRight className="w-3 h-3 text-gray-500" />
                  </button>
                  <button
                    onClick={() => handleSelectHistory("短剧")}
                    className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-left text-gray-300 hover:text-white transition flex items-center justify-between"
                  >
                    <span>🔥 爽文热血短剧</span>
                    <ArrowRight className="w-3 h-3 text-gray-500" />
                  </button>
                  <button
                    onClick={() => handleSelectHistory("NBA")}
                    className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-left text-gray-300 hover:text-white transition flex items-center justify-between"
                  >
                    <span>🏀 NBA 赛事全场</span>
                    <ArrowRight className="w-3 h-3 text-gray-500" />
                  </button>
                  <button
                    onClick={() => handleSelectHistory("动漫")}
                    className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-left text-gray-300 hover:text-white transition flex items-center justify-between"
                  >
                    <span>✨ 热血日本动漫</span>
                    <ArrowRight className="w-3 h-3 text-gray-500" />
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* 状态 2: 正在输入，实时展示联想结果 */
            <div className="py-2">
              <div className="px-3 py-1.5 text-xs text-gray-400 font-medium flex items-center justify-between border-b border-white/5">
                <span className="flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-cyan-400" />
                  智能联想匹配
                </span>
                {loading && <Loader2 className="w-3 h-3 text-cyan-400 animate-spin" />}
              </div>

              {suggestions.length > 0 ? (
                <div className="divide-y divide-white/5">
                  {suggestions.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => handleSelectSuggestion(item)}
                      className="group px-3 py-2.5 flex items-center gap-3 hover:bg-cyan-500/10 cursor-pointer transition"
                    >
                      {/* 封面微图 */}
                      <div className="relative w-9 h-12 rounded bg-dark-800 shrink-0 overflow-hidden border border-white/10">
                        {item.pic ? (
                          <img
                            src={item.pic}
                            alt={item.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition"
                            loading="lazy"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-600">
                            <Film className="w-4 h-4" />
                          </div>
                        )}
                      </div>

                      {/* 片名与信息 */}
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium text-white truncate group-hover:text-cyan-300 transition flex items-center gap-1.5">
                          <HighlightMatchedText text={item.name} query={query} />
                        </div>
                        <div className="text-xs text-gray-400 truncate mt-0.5 flex items-center gap-2">
                          <span className="text-cyan-400/90 font-medium">{item.type_name}</span>
                          {item.year && <span>{item.year}</span>}
                          {item.actor && <span>{item.actor}</span>}
                        </div>
                      </div>

                      {/* 右侧直接播放提示 */}
                      <div className="shrink-0 flex items-center gap-1 text-xs text-cyan-400 opacity-0 group-hover:opacity-100 transition">
                        <Play className="w-3.5 h-3.5 fill-cyan-400" />
                        <span>播放</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                !loading && (
                  <div className="py-6 px-4 text-center text-xs text-gray-400">
                    未找到直接相关的片名，按回车全网深度检索
                  </div>
                )
              )}

              {/* 底部查看全部按钮 */}
              <button
                type="button"
                onClick={() => handleSubmit()}
                className="w-full mt-1 px-4 py-2.5 bg-white/5 hover:bg-cyan-500/20 text-xs font-medium text-cyan-400 flex items-center justify-between border-t border-white/5 transition"
              >
                <span>查看全部与 “{query}” 相关的影视结果</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * 移动端全屏沉浸式搜索面板
 */
export function MobileSearchModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const { history, addHistory, removeHistory, clearHistory } = useSearchHistory();
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<SuggestionItem[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery("");
      setSuggestions([]);
    }
  }, [isOpen]);

  useEffect(() => {
    const q = query.trim();
    if (!q) {
      setSuggestions([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const timer = setTimeout(() => {
      const pin = typeof window !== "undefined" ? localStorage.getItem(GATED_CONFIG.storageKey) || "" : "";
      const headers: Record<string, string> = {};
      if (pin) headers[GATED_CONFIG.headerKey] = pin;

      fetch(`/api/vod/suggest?q=${encodeURIComponent(q)}&limit=8`, { headers })
        .then((res) => res.json())
        .then((data) => {
          setSuggestions(data.list || []);
          setLoading(false);
        })
        .catch(() => setLoading(false));
    }, 150);

    return () => clearTimeout(timer);
  }, [query]);

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    const clean = query.trim();
    if (clean) {
      addHistory(clean);
      onClose();
      router.push(`/search?q=${encodeURIComponent(clean)}`);
    }
  };

  const handleSelectHistory = (term: string) => {
    addHistory(term);
    onClose();
    router.push(`/search?q=${encodeURIComponent(term)}`);
  };

  const handleSelectSuggestion = (item: SuggestionItem) => {
    addHistory(item.name);
    onClose();
    router.push(`/play/${item.id}`);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-dark-950/98 backdrop-blur-2xl flex flex-col pt-[env(safe-area-inset-top,0px)] animate-in fade-in duration-200">
      {/* 顶部搜索输入栏 */}
      <div className="p-3 border-b border-white/10 flex items-center gap-2">
        <button
          onClick={onClose}
          className="p-2 text-gray-400 hover:text-white rounded-xl transition"
          aria-label="返回"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        <form onSubmit={handleSubmit} className="flex-1 relative flex items-center">
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="搜片名/拼音/演员 (如春或chun)..."
            className="w-full bg-dark-900 text-sm text-white placeholder-gray-400 px-3.5 py-2.5 pl-9 pr-8 rounded-xl border border-white/10 focus:outline-none focus:border-cyan-500"
          />
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3 pointer-events-none" />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="absolute right-2.5 p-1 text-gray-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </form>

        <button
          onClick={() => handleSubmit()}
          className="px-3.5 py-2 text-sm font-bold text-cyan-400 bg-cyan-500/10 rounded-xl border border-cyan-500/30"
        >
          搜索
        </button>
      </div>

      {/* 内容区域 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {!query.trim() ? (
          <>
            {history.length > 0 && (
              <div>
                <div className="flex items-center justify-between text-xs text-gray-400 mb-2 px-1">
                  <span className="flex items-center gap-1.5 font-semibold text-gray-300">
                    <Clock className="w-3.5 h-3.5 text-cyan-400" />
                    历史搜索
                  </span>
                  <button
                    onClick={clearHistory}
                    className="flex items-center gap-1 hover:text-rose-400 transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    清空
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {history.map((term) => (
                    <div
                      key={term}
                      onClick={() => handleSelectHistory(term)}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-dark-850 text-gray-200 border border-white/10 active:bg-cyan-500/20"
                    >
                      <span>{term}</span>
                      <button
                        onClick={(e) => removeHistory(term, e)}
                        className="text-gray-400 active:text-rose-400"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 热门搜索推荐 */}
            <div>
              <div className="text-xs font-semibold text-gray-300 mb-2 px-1 flex items-center gap-1.5">
                <Flame className="w-3.5 h-3.5 text-amber-400" />
                热门推荐
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {["2026", "短剧", "NBA", "动漫", "早春晴朗", "周星驰"].map((tag) => (
                  <button
                    key={tag}
                    onClick={() => handleSelectHistory(tag)}
                    className="p-3 bg-dark-850 active:bg-dark-800 rounded-xl text-gray-300 flex items-center justify-between border border-white/5"
                  >
                    <span>{tag}</span>
                    <ArrowRight className="w-3 h-3 text-gray-500" />
                  </button>
                ))}
              </div>
            </div>
          </>
        ) : (
          <div>
            <div className="text-xs text-gray-400 mb-2 px-1 flex items-center justify-between">
              <span>智能联想结果</span>
              {loading && <Loader2 className="w-3.5 h-3.5 text-cyan-400 animate-spin" />}
            </div>

            <div className="divide-y divide-white/5 rounded-xl overflow-hidden bg-dark-900 border border-white/10">
              {suggestions.map((item) => (
                <div
                  key={item.id}
                  onClick={() => handleSelectSuggestion(item)}
                  className="p-3 flex items-center gap-3 active:bg-white/5"
                >
                  <div className="relative w-10 h-14 rounded bg-dark-800 shrink-0 overflow-hidden">
                    {item.pic ? (
                      <img src={item.pic} alt={item.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-600">
                        <Film className="w-4 h-4" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-white truncate">
                      <HighlightMatchedText text={item.name} query={query} />
                    </div>
                    <div className="text-xs text-gray-400 mt-1 flex items-center gap-2 truncate">
                      <span className="text-cyan-400">{item.type_name}</span>
                      {item.year && <span>{item.year}</span>}
                      {item.actor && <span>{item.actor}</span>}
                    </div>
                  </div>
                  <Play className="w-4 h-4 text-cyan-400 shrink-0" />
                </div>
              ))}

              {suggestions.length === 0 && !loading && (
                <div className="p-6 text-center text-xs text-gray-400">
                  未找到直接匹配的片名，点击下方按钮查看更多
                </div>
              )}
            </div>

            <button
              onClick={() => handleSubmit()}
              className="w-full mt-3 p-3 rounded-xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-400 text-xs font-bold flex items-center justify-center gap-2 active:bg-cyan-500/25"
            >
              <span>查看全部与 “{query}” 相关的影视结果</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
