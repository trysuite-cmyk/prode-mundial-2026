import React, { useState } from "react";
import { Search, Trophy, Medal, Crown, Star, Award } from "lucide-react";
import { LeaderboardRow } from "../types";

interface RankingViewProps {
  ranking: LeaderboardRow[];
  currentUserId: string;
}

export default function RankingView({ ranking, currentUserId }: RankingViewProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredRanking = ranking.filter((row) =>
    row.NombreCompleto.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Split top 3 for the podium
  const top3 = ranking.slice(0, 3);
  const others = filteredRanking; // we filter the full list in the main table for search convenience

  const getPodiumColor = (index: number) => {
    switch (index) {
      case 0:
        return "bg-amber-100 text-amber-700 border-amber-300 ring-amber-200"; // Gold
      case 1:
        return "bg-slate-100 text-slate-700 border-slate-300 ring-slate-200"; // Silver
      case 2:
        return "bg-orange-100 text-orange-700 border-orange-300 ring-orange-200"; // Bronze
      default:
        return "bg-slate-50 text-slate-600 border-slate-200 ring-slate-100";
    }
  };

  const getCrownIconColor = (index: number) => {
    switch (index) {
      case 0:
        return "text-amber-500 fill-amber-300";
      case 1:
        return "text-slate-400 fill-slate-200";
      case 2:
        return "text-orange-500 fill-orange-200";
      default:
        return "text-slate-300";
    }
  };

  return (
    <div id="ranking-view-root" className="space-y-6">
      {/* PODIUM OF TOP 3 */}
      {ranking.length > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-white to-slate-50/50 p-6 shadow-sm">
          <h3 className="text-center font-black tracking-tight text-slate-800 text-base mb-6 flex items-center justify-center gap-2">
            <Crown className="text-amber-500" />
            LÍDERES DE LA ORGANIZACIÓN
          </h3>

          <div id="ranking-podium-cards" className="flex flex-col sm:flex-row items-end justify-center gap-6 sm:gap-4 mt-2">
            {/* 2ND PLACE (SILVER) - Left */}
            {top3[1] && (
              <div className="w-full sm:w-1/3 order-2 sm:order-1 flex flex-col items-center">
                <div className="relative flex flex-col items-center p-5 rounded-2xl bg-white border border-slate-100 shadow-sm w-full text-center transition hover:shadow-md">
                  <div className={`absolute -top-4 h-9 w-9 rounded-full flex items-center justify-center border-2 font-black text-xs ring-4 ${getPodiumColor(1)}`}>
                    2
                  </div>
                  <Crown className={`h-6 w-6 mt-2 ${getCrownIconColor(1)}`} />
                  <span className="mt-3 text-sm font-bold text-slate-700 block truncate max-w-full">
                    {top3[1].NombreCompleto}
                  </span>
                  <p className="text-xs text-slate-400">Plata</p>
                  <div className="mt-2 bg-slate-50 rounded-lg px-3 py-1 font-extrabold text-slate-700 text-sm">
                    {top3[1].Puntos} pts
                  </div>
                  <span className="text-[9px] text-slate-450 mt-1 block">
                    🎯 Exactos: {top3[1].AciertosExactos}
                  </span>
                </div>
              </div>
            )}

            {/* 1ST PLACE (GOLD) - Center, bigger */}
            {top3[0] && (
              <div className="w-full sm:w-1/3 order-1 sm:order-2 flex flex-col items-center">
                <div className="relative flex flex-col items-center p-6 rounded-2xl bg-white border-2 border-amber-300 shadow-md w-full text-center transition hover:shadow-lg ring-4 ring-amber-50">
                  <div className={`absolute -top-5 h-11 w-11 rounded-full flex items-center justify-center border-2 font-extrabold text-sm ring-4 ${getPodiumColor(0)}`}>
                    1
                  </div>
                  <Crown className={`h-8 w-8 mt-1 ${getCrownIconColor(0)} animate-bounce`} />
                  <span className="mt-4 text-base font-black text-slate-800 block truncate max-w-full">
                    {top3[0].NombreCompleto}
                  </span>
                  <p className="text-xs font-semibold text-amber-600 uppercase tracking-widest">Campeón Provisorio</p>
                  <div className="mt-3 bg-amber-50 text-amber-800 rounded-xl px-4 py-1.5 font-black text-base border border-amber-200">
                    {top3[0].Puntos} pts
                  </div>
                  <span className="text-[10px] font-bold text-amber-700 mt-1.5 block">
                    🎯 Exactos: {top3[0].AciertosExactos} | Ganadores: {top3[0].AciertosGanador}
                  </span>
                </div>
              </div>
            )}

            {/* 3RD PLACE (BRONZE) - Right */}
            {top3[2] && (
              <div className="w-full sm:w-1/3 order-3 sm:order-3 flex flex-col items-center">
                <div className="relative flex flex-col items-center p-5 rounded-2xl bg-white border border-slate-100 shadow-sm w-full text-center transition hover:shadow-md">
                  <div className={`absolute -top-4 h-9 w-9 rounded-full flex items-center justify-center border-2 font-black text-xs ring-4 ${getPodiumColor(2)}`}>
                    3
                  </div>
                  <Crown className={`h-6 w-6 mt-2 ${getCrownIconColor(2)}`} />
                  <span className="mt-3 text-sm font-bold text-slate-700 block truncate max-w-full">
                    {top3[2].NombreCompleto}
                  </span>
                  <p className="text-xs text-slate-400">Bronce</p>
                  <div className="mt-2 bg-orange-50 text-orange-700 rounded-lg px-3 py-1 font-extrabold text-slate-700 text-sm border border-orange-100">
                    {top3[2].Puntos} pts
                  </div>
                  <span className="text-[9px] text-slate-450 mt-1 block">
                    🎯 Exactos: {top3[2].AciertosExactos}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* DETAILED LEADERBOARD VIEW */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        {/* Search Input bar */}
        <div id="ranking-search-row" className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h3 className="font-bold text-slate-800 text-lg bento-title">Tabla de Posiciones</h3>
            <p className="text-xs text-slate-400">Consulte y compare el rendimiento acumulado de todos los participantes</p>
          </div>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              id="ranking-search-input"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar colaborador..."
              className="w-full rounded-xl border border-slate-300 bg-slate-50 pl-9 pr-4 py-2 text-xs focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all"
            />
          </div>
        </div>

        {/* Tabular view */}
        <div id="ranking-table-scroller" className="overflow-x-auto rounded-xl border border-slate-100">
          <table className="min-w-full divide-y divide-slate-100 text-left">
            <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3 text-center w-16">Posición</th>
                <th className="px-6 py-3">Participante</th>
                <th className="px-4 py-3 text-center">Puntaje Total</th>
                <th className="px-4 py-3 text-center">Aciertos Exactos</th>
                <th className="px-4 py-3 text-center">Aciertos Ganador</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-150 text-xs text-slate-700">
              {filteredRanking.map((row) => {
                const isMe = row.UsuarioID === currentUserId;
                return (
                  <tr
                    key={row.UsuarioID}
                    className={`transition-all ${
                      isMe ? "bg-indigo-50/40 hover:bg-indigo-50 font-semibold" : "hover:bg-slate-50/80"
                    }`}
                  >
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`inline-flex h-6 w-6 items-center justify-center rounded-full font-bold text-[10px] ${
                          row.Posicion === 1
                            ? "bg-amber-100 text-amber-800 border border-amber-200"
                            : row.Posicion === 2
                            ? "bg-slate-100 text-slate-800 border border-slate-200"
                            : row.Posicion === 3
                            ? "bg-orange-100 text-orange-800 border border-orange-200"
                            : isMe
                            ? "bg-indigo-600 text-white"
                            : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        {row.Posicion}
                      </span>
                    </td>
                    <td className="px-6 py-3">
                      <div className="flex items-center space-x-2">
                        <span className="truncate text-slate-800">{row.NombreCompleto}</span>
                        {isMe && (
                          <span className="rounded bg-indigo-100 px-1.5 py-0.5 text-[8px] font-black uppercase text-indigo-800 border border-indigo-200">
                            TÚ
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center text-sm font-black text-slate-900">
                      {row.Puntos}
                    </td>
                    <td className="px-4 py-3 text-center text-slate-500 font-medium">
                      {row.AciertosExactos}
                    </td>
                    <td className="px-4 py-3 text-center text-slate-500 font-medium">
                      {row.AciertosGanador}
                    </td>
                  </tr>
                );
              })}

              {filteredRanking.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400 italic">
                    Ningún colaborador coincide con los criterios de búsqueda.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
