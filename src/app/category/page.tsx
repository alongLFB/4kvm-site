"use client";

import React, { useState, useEffect, use } from "react";
import { useSearchParams } from "next/navigation";
import { FilterBar } from "@/components/FilterBar";
import { MovieCard } from "@/components/MovieCard";
import { Pagination } from "@/components/Pagination";
import { CreateRoomModal } from "@/components/CreateRoomModal";
import { VodItem } from "@/lib/types";
import { Loader2 } from "lucide-react";

export default function CategoryPage() {
  const searchParams = useSearchParams();

  const [selectedType, setSelectedType] = useState("全部");
  const [selectedArea, setSelectedArea] = useState("全部");
  const [selectedLang, setSelectedLang] = useState("全部");
  const [selectedYear, setSelectedYear] = useState("全部");
  const [selectedQuality, setSelectedQuality] = useState("全部");
  const [selectedStatus, setSelectedStatus] = useState("全部");

  const [page, setPage] = useState(1);
  const [pickedVod, setPickedVod] = useState<VodItem | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const [items, setItems] = useState<VodItem[]>([]);
  const [total, setTotal] = useState(0);
  const [pagecount, setPagecount] = useState(1);
  const [loading, setLoading] = useState(true);

  // Sync initial type from URL parameter if present
  useEffect(() => {
    const typeParam = searchParams.get("type");
    if (typeParam) {
      setSelectedType(typeParam);
    }
  }, [searchParams]);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({
      type: selectedType,
      area: selectedArea,
      lang: selectedLang,
      year: selectedYear,
      quality: selectedQuality,
      status: selectedStatus,
      pg: page.toString(),
    });

    fetch(`/api/vod?${params.toString()}`)
      .then((res) => res.json())
      .then((data) => {
        setItems(data.list || []);
        setTotal(data.total || 0);
        setPagecount(data.pagecount || 1);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, [
    selectedType,
    selectedArea,
    selectedLang,
    selectedYear,
    selectedQuality,
    selectedStatus,
    page,
  ]);

  const handleFilterChange = (key: string, value: string) => {
    setPage(1);
    switch (key) {
      case "type":
        setSelectedType(value);
        break;
      case "area":
        setSelectedArea(value);
        break;
      case "lang":
        setSelectedLang(value);
        break;
      case "year":
        setSelectedYear(value);
        break;
      case "quality":
        setSelectedQuality(value);
        break;
      case "status":
        setSelectedStatus(value);
        break;
    }
  };

  return (
    <main className="space-y-6">
      <FilterBar
        selectedType={selectedType}
        selectedArea={selectedArea}
        selectedLang={selectedLang}
        selectedYear={selectedYear}
        selectedQuality={selectedQuality}
        selectedStatus={selectedStatus}
        onSelect={handleFilterChange}
      />

      {loading ? (
        <div className="py-24 flex flex-col items-center justify-center gap-3 text-gray-400">
          <Loader2 className="w-8 h-8 text-gold-500 animate-spin" />
          <span className="text-sm">正在检索高码率片源...</span>
        </div>
      ) : items.length > 0 ? (
        <div className="space-y-8">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {items.map((item) => (
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

          <Pagination
            currentPage={page}
            totalPages={pagecount}
            onPageChange={(p) => setPage(p)}
          />
        </div>
      ) : (
        <div className="py-24 text-center text-gray-400 space-y-2">
          <p className="text-base font-semibold">没有找到符合条件的影视</p>
          <p className="text-xs text-gray-500">试着切换其它筛选标签看看吧</p>
        </div>
      )}

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
    </main>
  );
}
