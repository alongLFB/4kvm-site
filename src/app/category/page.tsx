"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { MovieCard } from "@/components/MovieCard";
import { CreateRoomModal } from "@/components/CreateRoomModal";
import { PasscodeModal } from "@/components/PasscodeModal";
import { GATED_CONFIG, isTypeGated } from "@/config/gated-sections";
import { VodItem } from "@/lib/types";
import {
  Loader2,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Sparkles,
  Flame,
  Clock,
  Star,
  Layers,
  MapPin,
  Calendar,
  Languages,
  Lock,
  Unlock,
} from "lucide-react";

const FILTER_CONFIG = {
  // 一级主分类
  types: [
    { label: "全部", value: "全部" },
    { label: "🎬 电影", value: "电影" },
    { label: "📺 电视剧", value: "电视剧" },
    { label: "✨ 动漫", value: "动漫" },
    { label: "🎤 综艺", value: "综艺" },
    { label: "⚽ 体育", value: "体育" },
    { label: "🎬 伦理", value: "伦理" },
  ],
  // 二级动态子类型（按一级分类精准联动）
  subTypes: {
    全部: ["全部", "🔥 爽文短剧", "动作片", "科幻片", "喜剧片", "国产剧", "欧美剧", "日本动漫", "大陆综艺", "NBA"],
    电影: ["全部", "剧情片", "喜剧片", "动作片", "爱情片", "科幻片", "动画片", "悬疑片", "惊悚片", "恐怖片", "犯罪片", "战争片", "纪录片"],
    电视剧: ["全部", "国产剧", "欧美剧", "🔥 爽文短剧", "日本剧", "韩国剧", "香港剧", "台湾剧", "泰国剧", "海外剧"],
    动漫: ["全部", "日本动漫", "国产动漫", "欧美动漫"],
    综艺: ["全部", "大陆综艺", "日韩综艺", "欧美综艺", "港台综艺"],
    体育: ["全部", "NBA", "足球", "CBA", "英超", "西甲", "意甲", "德甲", "法甲", "LPL"],
    伦理: ["全部", "经典伦理", "国产伦理", "日韩伦理", "欧美伦理"],
  } as Record<string, string[]>,
  // 地区维度
  areas: ["全部", "中国大陆", "欧美/好莱坞", "中国香港", "中国台湾", "日本", "韩国", "泰国", "其它"],
  // 年份维度
  years: ["全部", "2026", "2025", "2024", "2023", "2022", "2021", "2020", "2010年代", "2000年代", "更早"],
  // 语言维度
  langs: ["全部", "国语/普通话", "粤语", "英语", "日语", "韩语", "泰语", "其它"],
  // 排序维度
  sorts: [
    { label: "最高人气", value: "hot", icon: Flame },
    { label: "最新上映", value: "latest", icon: Clock },
    { label: "高分精选", value: "rating", icon: Star },
  ],
  // 状态维度
  statuses: ["全部", "完结", "连载中"],
};

function CategoryContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // 解析当前过滤参数
  const rawType = searchParams.get("type") || "全部";
  // 兼容短剧直达链接
  const currentType = rawType === "短剧" ? "电视剧" : rawType;
  const initialSubType = rawType === "短剧" ? "爽文短剧" : (searchParams.get("sub_type") || "全部");
  const currentSubType = initialSubType;

  const currentArea = searchParams.get("area") || "全部";
  const currentLang = searchParams.get("lang") || "全部";
  const currentYear = searchParams.get("year") || "全部";
  const currentSort = searchParams.get("sort") || "hot";
  const currentStatus = searchParams.get("status") || "全部";
  const currentPage = parseInt(searchParams.get("pg") || "1", 10);

  const [vods, setVods] = useState<VodItem[]>([]);
  const [total, setTotal] = useState(0);
  const [pageCount, setPageCount] = useState(1);
  const [loading, setLoading] = useState(true);
  const [jumpInput, setJumpInput] = useState("");

  // 一起看房间选择模态框
  const [pickedVod, setPickedVod] = useState<VodItem | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  // 专区口令加锁与解锁状态
  const [unlockedPin, setUnlockedPin] = useState<string>("");
  const [passcodeModalOpen, setPasscodeModalOpen] = useState(false);
  const [pendingType, setPendingType] = useState<string | null>(null);

  // 初始化读取本地解锁 token
  useEffect(() => {
    const saved = localStorage.getItem(GATED_CONFIG.storageKey) || "";
    setUnlockedPin(saved);
  }, []);

  // 计算当前一级分类下的二级子类型列表
  const activeSubTypes = FILTER_CONFIG.subTypes[currentType] || FILTER_CONFIG.subTypes["全部"];

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (currentType !== "全部") params.set("type", currentType);
    if (currentSubType !== "全部") params.set("sub_type", currentSubType);
    if (currentArea !== "全部") params.set("area", currentArea);
    if (currentLang !== "全部") params.set("lang", currentLang);
    if (currentYear !== "全部") params.set("year", currentYear);
    if (currentSort !== "hot") params.set("sort", currentSort);
    if (currentStatus !== "全部") params.set("status", currentStatus);
    params.set("pg", currentPage.toString());

    // 服务端双重校验：若已解锁，在 Header 中安全携带 access pin
    const headers: Record<string, string> = {};
    if (unlockedPin) {
      headers[GATED_CONFIG.headerKey] = unlockedPin;
    }

    fetch(`/api/vod?${params.toString()}`, { headers })
      .then((res) => {
        if (res.status === 403) {
          // 服务端返回 403 专区受限
          setVods([]);
          setTotal(0);
          setPageCount(1);
          setPasscodeModalOpen(true);
          return null;
        }
        return res.json();
      })
      .then((data) => {
        if (data && data.code === 200) {
          setVods(data.list || []);
          setTotal(data.total || 0);
          setPageCount(data.pagecount || 1);
        }
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, [currentType, currentSubType, currentArea, currentLang, currentYear, currentSort, currentStatus, currentPage, unlockedPin]);

  const updateFilter = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "全部" || (key === "sort" && value === "hot")) {
      params.delete(key);
    } else {
      params.set(key, value);
    }

    // 当切换一级大类时，重置二级子分类
    if (key === "type") {
      params.delete("sub_type");
    }

    params.set("pg", "1");
    router.push(`/category?${params.toString()}`);
  };

  const handleTypeClick = (val: string) => {
    const isLocked = isTypeGated(val);
    const hasUnlocked = unlockedPin === GATED_CONFIG.passcode;
    if (isLocked && !hasUnlocked) {
      setPendingType(val);
      setPasscodeModalOpen(true);
      return;
    }
    updateFilter("type", val);
  };

  const handleUnlockSuccess = (pin: string) => {
    setUnlockedPin(pin);
    if (pendingType) {
      updateFilter("type", pendingType);
      setPendingType(null);
    }
  };

  const handleRelock = () => {
    localStorage.removeItem(GATED_CONFIG.storageKey);
    setUnlockedPin("");
    if (isTypeGated(currentType)) {
      updateFilter("type", "全部");
    }
  };

  const changePage = (page: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("pg", page.toString());
    router.push(`/category?${params.toString()}`);
  };

  const resetAllFilters = () => {
    router.push("/category");
  };

  const isCurrentTypeGated = isTypeGated(currentType);
  const isGatedUnlocked = unlockedPin === GATED_CONFIG.passcode;

  return (
    <div className="space-y-8">
      {/* 多维筛选器容器 */}
      <div className="bg-dark-900 border border-white/10 rounded-2xl p-4 sm:p-6 space-y-4 shadow-xl">
        <div className="flex items-center justify-between pb-3 border-b border-white/5">
          <div className="flex items-center gap-2 text-cyan-400 font-bold text-sm">
            <Sparkles className="w-4 h-4" />
            影视片库多维智能检索
          </div>

          <div className="flex items-center gap-2">
            {isGatedUnlocked ? (
              <button
                onClick={handleRelock}
                className="text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1.5 transition px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20"
                title="点击重新上锁专区"
              >
                <Unlock className="w-3.5 h-3.5" />
                专区已解锁 (重新锁定)
              </button>
            ) : (
              <button
                onClick={() => setPasscodeModalOpen(true)}
                className="text-xs text-gray-400 hover:text-white flex items-center gap-1.5 transition px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10"
              >
                <Lock className="w-3.5 h-3.5 text-amber-400" />
                口令专区
              </button>
            )}

            <button
              onClick={resetAllFilters}
              className="text-xs text-gray-400 hover:text-white flex items-center gap-1.5 transition px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10"
            >
              <RotateCcw className="w-3.5 h-3.5" /> 重置筛选
            </button>
          </div>
        </div>

        {/* 1. 一级主分类 */}
        <div className="flex items-center sm:items-start gap-2 sm:gap-3 text-xs leading-none">
          <span className="w-16 sm:w-20 shrink-0 font-bold text-gray-400 py-1.5 flex items-center gap-1">
            <Layers className="w-3.5 h-3.5 text-cyan-400" />
            一级板块
          </span>
          <div className="flex flex-nowrap sm:flex-wrap gap-1.5 flex-1 overflow-x-auto pb-1.5 sm:pb-0 scrollbar-none">
            {FILTER_CONFIG.types.map((item) => {
              const active = currentType === item.value;
              const isLocked = isTypeGated(item.value);
              const hasUnlocked = unlockedPin === GATED_CONFIG.passcode;
              return (
                <button
                  key={item.value}
                  onClick={() => handleTypeClick(item.value)}
                  className={`px-3 py-1.5 rounded-lg whitespace-nowrap shrink-0 transition text-xs flex items-center gap-1 ${
                    active
                      ? "bg-cyan-500 text-black font-bold shadow-lg shadow-cyan-500/20 scale-105"
                      : "text-gray-300 hover:text-white hover:bg-white/5"
                  }`}
                >
                  <span>{item.label}</span>
                  {isLocked && !hasUnlocked && (
                    <Lock className="w-3 h-3 text-amber-400 inline" />
                  )}
                  {isLocked && hasUnlocked && (
                    <Unlock className="w-3 h-3 text-emerald-400 inline" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* 2. 二级子分类 (根据一级大类动态联动) */}
        <div className="flex items-center sm:items-start gap-2 sm:gap-3 text-xs leading-none pt-2 border-t border-white/5">
          <span className="w-16 sm:w-20 shrink-0 font-bold text-gray-400 py-1.5 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
            细分子类
          </span>
          <div className="flex flex-nowrap sm:flex-wrap gap-1.5 flex-1 overflow-x-auto pb-1.5 sm:pb-0 scrollbar-none">
            {activeSubTypes.map((sub) => {
              const cleanSub = sub.replace(/^[^\w\u4e00-\u9fa5]+/, "").trim();
              const active = (currentSubType === sub) || (currentSubType === cleanSub);
              return (
                <button
                  key={sub}
                  onClick={() => updateFilter("sub_type", cleanSub)}
                  className={`px-2.5 py-1.5 rounded-md whitespace-nowrap shrink-0 transition text-xs ${
                    active
                      ? "bg-cyan-500/20 text-cyan-400 font-bold border border-cyan-500/40"
                      : "text-gray-400 hover:text-gray-200 hover:bg-white/5"
                  }`}
                >
                  {sub}
                </button>
              );
            })}
          </div>
        </div>

        {/* 3. 地区 */}
        <div className="flex items-center sm:items-start gap-2 sm:gap-3 text-xs leading-none pt-2 border-t border-white/5">
          <span className="w-16 sm:w-20 shrink-0 font-bold text-gray-400 py-1.5 flex items-center gap-1">
            <MapPin className="w-3.5 h-3.5 text-blue-400" />
            地区分布
          </span>
          <div className="flex flex-nowrap sm:flex-wrap gap-1.5 flex-1 overflow-x-auto pb-1.5 sm:pb-0 scrollbar-none">
            {FILTER_CONFIG.areas.map((item) => {
              const active = currentArea === item;
              return (
                <button
                  key={item}
                  onClick={() => updateFilter("area", item)}
                  className={`px-2.5 py-1.5 rounded-md whitespace-nowrap shrink-0 transition text-xs ${
                    active
                      ? "bg-cyan-500 text-black font-bold shadow-md shadow-cyan-500/20"
                      : "text-gray-300 hover:text-white hover:bg-white/5"
                  }`}
                >
                  {item}
                </button>
              );
            })}
          </div>
        </div>

        {/* 4. 年份 */}
        <div className="flex items-center sm:items-start gap-2 sm:gap-3 text-xs leading-none pt-2 border-t border-white/5">
          <span className="w-16 sm:w-20 shrink-0 font-bold text-gray-400 py-1.5 flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5 text-amber-400" />
            上映年份
          </span>
          <div className="flex flex-nowrap sm:flex-wrap gap-1.5 flex-1 overflow-x-auto pb-1.5 sm:pb-0 scrollbar-none">
            {FILTER_CONFIG.years.map((item) => {
              const active = currentYear === item;
              return (
                <button
                  key={item}
                  onClick={() => updateFilter("year", item)}
                  className={`px-2.5 py-1.5 rounded-md whitespace-nowrap shrink-0 transition text-xs ${
                    active
                      ? "bg-cyan-500 text-black font-bold shadow-md shadow-cyan-500/20"
                      : "text-gray-300 hover:text-white hover:bg-white/5"
                  }`}
                >
                  {item}
                </button>
              );
            })}
          </div>
        </div>

        {/* 5. 语言 */}
        <div className="flex items-center sm:items-start gap-2 sm:gap-3 text-xs leading-none pt-2 border-t border-white/5">
          <span className="w-16 sm:w-20 shrink-0 font-bold text-gray-400 py-1.5 flex items-center gap-1">
            <Languages className="w-3.5 h-3.5 text-emerald-400" />
            语言声道
          </span>
          <div className="flex flex-nowrap sm:flex-wrap gap-1.5 flex-1 overflow-x-auto pb-1.5 sm:pb-0 scrollbar-none">
            {FILTER_CONFIG.langs.map((item) => {
              const active = currentLang === item;
              return (
                <button
                  key={item}
                  onClick={() => updateFilter("lang", item)}
                  className={`px-2.5 py-1.5 rounded-md whitespace-nowrap shrink-0 transition text-xs ${
                    active
                      ? "bg-cyan-500 text-black font-bold shadow-md shadow-cyan-500/20"
                      : "text-gray-300 hover:text-white hover:bg-white/5"
                  }`}
                >
                  {item}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* 结果控制工具栏：排序切换 + 状态过滤 + 结果总数 */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-dark-900/60 p-3 sm:px-5 sm:py-3.5 rounded-xl border border-white/5">
        {/* 左侧：统计展示 */}
        <div className="text-xs text-gray-400 flex items-center gap-1.5">
          <span>共收录</span>
          <span className="text-cyan-400 font-black text-sm">{total.toLocaleString()}</span>
          <span>部影视</span>
          <span className="text-gray-600">·</span>
          <span>当前第 <strong className="text-white">{currentPage}</strong> / {pageCount} 页</span>
          {isCurrentTypeGated && (
            <span className="ml-2 px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[11px] flex items-center gap-1">
              <Lock className="w-3 h-3" /> 特约专区
            </span>
          )}
        </div>

        {/* 右侧：排序模式与完结状态 */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-4 w-full sm:w-auto justify-between sm:justify-end">
          {/* 排序按钮组 */}
          <div className="flex items-center bg-dark-950/80 p-1 rounded-lg border border-white/10">
            {FILTER_CONFIG.sorts.map((s) => {
              const Icon = s.icon;
              const active = currentSort === s.value;
              return (
                <button
                  key={s.value}
                  onClick={() => updateFilter("sort", s.value)}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs transition ${
                    active
                      ? "bg-cyan-500 text-black font-bold shadow"
                      : "text-gray-400 hover:text-white"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {s.label}
                </button>
              );
            })}
          </div>

          {/* 状态切换 */}
          <div className="flex items-center gap-1 text-xs">
            {FILTER_CONFIG.statuses.map((st) => {
              const active = currentStatus === st;
              return (
                <button
                  key={st}
                  onClick={() => updateFilter("status", st)}
                  className={`px-2 py-1 rounded-md transition ${
                    active
                      ? "text-cyan-400 bg-cyan-500/10 font-bold border border-cyan-500/20"
                      : "text-gray-400 hover:text-gray-200"
                  }`}
                >
                  {st}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* 影片列表卡片网格 */}
      <div className="space-y-6">
        {loading ? (
          <div className="py-32 flex flex-col items-center justify-center gap-3 text-gray-400">
            <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
            <span className="text-sm">正在高速检索片库中...</span>
          </div>
        ) : isCurrentTypeGated && !isGatedUnlocked ? (
          <div className="py-24 text-center space-y-4 bg-dark-900/60 rounded-2xl border border-amber-500/20 p-8">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto text-amber-400">
              <Lock className="w-7 h-7" />
            </div>
            <div className="space-y-1">
              <h4 className="text-lg font-bold text-white">该板块已开启专区访问保护</h4>
              <p className="text-xs text-gray-400 max-w-md mx-auto">
                {GATED_CONFIG.description}
              </p>
            </div>
            <button
              onClick={() => setPasscodeModalOpen(true)}
              className="px-6 py-2.5 bg-cyan-500 hover:bg-cyan-400 active:scale-95 text-black font-bold text-sm rounded-xl transition shadow-lg shadow-cyan-500/20"
            >
              输入口令立即解锁
            </button>
          </div>
        ) : vods.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-6">
            {vods.map((item) => (
              <MovieCard
                key={item.id}
                item={item}
                onCreateRoom={(picked) => {
                  setPickedVod(picked);
                  setModalOpen(true);
                }}
              />
            ))}
          </div>
        ) : (
          <div className="py-24 text-center space-y-3 bg-dark-900/50 rounded-2xl border border-white/5">
            <p className="text-gray-400 text-sm">暂无符合当前组合条件的影视作品</p>
            <button
              onClick={resetAllFilters}
              className="text-xs text-cyan-400 hover:underline inline-flex items-center gap-1"
            >
              <RotateCcw className="w-3 h-3" /> 重置所有筛选条件
            </button>
          </div>
        )}

        {/* 分页控制栏 */}
        {pageCount > 1 && !loading && (
          <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 pt-6 pb-4">
            <button
              onClick={() => changePage(currentPage - 1)}
              disabled={currentPage <= 1}
              className="px-3 sm:px-4 py-2 rounded-xl bg-dark-900 border border-white/10 text-xs font-semibold text-gray-300 hover:text-white hover:bg-dark-800 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 transition active:scale-95"
            >
              <ChevronLeft className="w-4 h-4" /> 上一页
            </button>

            <span className="px-3 sm:px-4 py-2 text-xs font-bold text-cyan-400 bg-dark-900 rounded-xl border border-cyan-500/20">
              {currentPage} / {pageCount}
            </span>

            <button
              onClick={() => changePage(currentPage + 1)}
              disabled={currentPage >= pageCount}
              className="px-3 sm:px-4 py-2 rounded-xl bg-dark-900 border border-white/10 text-xs font-semibold text-gray-300 hover:text-white hover:bg-dark-800 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 transition active:scale-95"
            >
              下一页 <ChevronRight className="w-4 h-4" />
            </button>

            {/* 快速直达跳转框 */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const p = parseInt(jumpInput, 10);
                if (!isNaN(p) && p >= 1 && p <= pageCount) {
                  changePage(p);
                  setJumpInput("");
                }
              }}
              className="flex items-center gap-1.5 bg-dark-900 border border-white/10 px-2.5 py-1 rounded-xl text-xs"
            >
              <span className="text-gray-400 text-[11px]">前往</span>
              <input
                type="number"
                min="1"
                max={pageCount}
                value={jumpInput}
                onChange={(e) => setJumpInput(e.target.value)}
                placeholder={`${currentPage}`}
                className="w-12 bg-dark-800 text-base sm:text-xs text-center text-white px-1 py-1 rounded-lg border border-white/10 focus:outline-none focus:border-cyan-500"
              />
              <span className="text-gray-400 text-[11px]">页</span>
              <button
                type="submit"
                className="px-2 py-1 bg-cyan-500 hover:bg-cyan-400 active:scale-95 text-dark-950 font-bold text-[11px] rounded-lg transition"
              >
                跳转
              </button>
            </form>
          </div>
        )}
      </div>

      {/* 快捷创建一起看房间弹窗 */}
      {pickedVod && (
        <CreateRoomModal
          vodItem={pickedVod}
          isOpen={modalOpen}
          onClose={() => {
            setModalOpen(false);
            setPickedVod(null);
          }}
        />
      )}

      {/* 专区口令解锁弹窗 */}
      <PasscodeModal
        isOpen={passcodeModalOpen}
        onClose={() => {
          setPasscodeModalOpen(false);
          setPendingType(null);
        }}
        onSuccess={handleUnlockSuccess}
        targetCategoryName={pendingType || undefined}
      />
    </div>
  );
}

export default function CategoryPage() {
  return (
    <Suspense fallback={<div className="py-20 text-center text-gray-400">加载片库中...</div>}>
      <CategoryContent />
    </Suspense>
  );
}
