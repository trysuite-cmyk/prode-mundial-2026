import React from "react";
import { Trophy, LogOut, User, Settings, Medal, ClipboardList, TrendingUp, Award, HelpCircle } from "lucide-react";
import { UserSession } from "../types";

interface HeaderNavProps {
  session: UserSession;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  userPoints: number;
  userPos: number;
  onLogout: () => void;
  isAdmin: boolean;
}

export default function HeaderNav({
  session,
  activeTab,
  setActiveTab,
  userPoints,
  userPos,
  onLogout,
  isAdmin,
}: HeaderNavProps) {
  return (
    <header id="header-nav" className="sticky top-0 z-40 w-full border-b border-slate-100 bg-white/90 backdrop-blur-md">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo Brand */}
          <div className="flex items-center space-x-2.5 cursor-pointer select-none" onClick={() => setActiveTab("forecast")}>
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-black overflow-hidden border border-slate-900 shadow-sm">
              <img
                src="/src/assets/images/world_cup_2026_logo_1781015208298.png"
                className="h-full w-full object-contain"
                alt="Logo FIFA"
                referrerPolicy="no-referrer"
              />
            </div>
            <div>
              <h1 className="text-[13px] sm:text-base font-bold tracking-tight text-slate-800 font-display">
                PRODE <span className="text-indigo-600 font-extrabold text-[13px] sm:text-base">Mundial</span>
              </h1>
              <span className="hidden sm:block text-[9px] font-semibold uppercase tracking-wider text-slate-400 block -mt-1.5">FIFA 2026 • Colaboradores</span>
            </div>
          </div>

          {/* Center Stats Bar (Desktop) */}
          <div className="hidden md:flex items-center space-x-4">
            <div className="flex items-center space-x-1.5 rounded-xl bg-slate-50 px-3 py-1 text-slate-700 text-xs font-medium border border-slate-150">
              <span className="p-0.5 text-xs">🏆</span>
              <span>Puntos: <strong className="text-slate-900 font-extrabold">{userPoints}</strong></span>
            </div>
            <div className="flex items-center space-x-1.5 rounded-xl bg-amber-50 px-3 py-1 text-amber-900 text-xs font-medium border border-amber-100">
              <span className="p-0.5 text-xs">🏅</span>
              <span>Posición: <strong className="text-amber-800 font-extrabold">#{userPos !== 999 ? userPos : "-"}</strong></span>
            </div>
          </div>

          {/* Navigation Items */}
          <nav className="flex items-center space-x-0.5 sm:space-x-1.5">
            <button
              id="nav-btn-forecast"
              onClick={() => setActiveTab("forecast")}
              className={`flex items-center space-x-1 sm:space-x-1.5 rounded-xl px-1.5 sm:px-2.5 py-1.5 sm:py-2 text-[11px] sm:text-xs font-semibold transition-all ${
                activeTab === "forecast"
                  ? "bg-slate-900 text-white shadow-xs font-bold"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-950"
              }`}
            >
              <ClipboardList className="h-4 w-4 shrink-0 opacity-80" />
              <span className="hidden sm:inline">Pronosticar</span>
            </button>

            <button
              id="nav-btn-specials"
              onClick={() => setActiveTab("specials")}
              className={`flex items-center space-x-1 sm:space-x-1.5 rounded-xl px-1.5 sm:px-2.5 py-1.5 sm:py-2 text-[11px] sm:text-xs font-semibold transition-all ${
                activeTab === "specials"
                  ? "bg-slate-900 text-white shadow-xs font-bold"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-950"
              }`}
            >
              <Award className="h-4 w-4 shrink-0 opacity-80" />
              <span className="hidden sm:inline">Especiales</span>
            </button>

            <button
              id="nav-btn-ranking"
              onClick={() => setActiveTab("ranking")}
              className={`flex items-center space-x-1 sm:space-x-1.5 rounded-xl px-1.5 sm:px-2.5 py-1.5 sm:py-2 text-[11px] sm:text-xs font-semibold transition-all ${
                activeTab === "ranking"
                  ? "bg-slate-900 text-white shadow-xs font-bold"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-950"
              }`}
            >
              <TrendingUp className="h-4 w-4 shrink-0 opacity-80" />
              <span className="hidden sm:inline">Ranking</span>
            </button>

            <button
              id="nav-btn-profile"
              onClick={() => setActiveTab("profile")}
              className={`flex items-center space-x-1 sm:space-x-1.5 rounded-xl px-1.5 sm:px-2.5 py-1.5 sm:py-2 text-[11px] sm:text-xs font-semibold transition-all ${
                activeTab === "profile"
                  ? "bg-slate-900 text-white shadow-xs font-bold"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-950"
              }`}
            >
              <User className="h-4 w-4 shrink-0 opacity-80" />
              <span className="hidden sm:inline">Mi Perfil</span>
            </button>

            <button
              id="nav-btn-faq"
              onClick={() => setActiveTab("faq")}
              className={`flex items-center space-x-1 sm:space-x-1.5 rounded-xl px-1.5 sm:px-2.5 py-1.5 sm:py-2 text-[11px] sm:text-xs font-semibold transition-all ${
                activeTab === "faq"
                  ? "bg-slate-900 text-white shadow-xs font-bold"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-950"
              }`}
            >
              <HelpCircle className="h-4 w-4 shrink-0 opacity-80" />
              <span className="hidden sm:inline">Reglas</span>
            </button>

            {isAdmin && (
              <button
                id="nav-btn-admin"
                onClick={() => setActiveTab("admin")}
                className={`flex items-center space-x-1 sm:space-x-1.5 rounded-xl px-1.5 sm:px-2.5 py-1.5 sm:py-2 text-[10px] sm:text-[11px] font-bold uppercase tracking-wider transition-all ${
                  activeTab === "admin"
                    ? "bg-rose-600 text-white shadow-xs"
                    : "text-rose-600 hover:bg-rose-50"
                }`}
              >
                <Settings className="h-3.5 w-3.5 shrink-0" />
                <span className="hidden sm:inline">Admin</span>
              </button>
            )}

            <span className="h-6 w-px bg-slate-200/80 mx-0.5 sm:mx-1.5"></span>

            <button
              id="nav-btn-logout"
              onClick={onLogout}
              className="flex items-center justify-center h-8.5 w-8.5 rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition cursor-pointer"
              title="Cerrar Sesión"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </nav>
        </div>

        {/* Mobile Stats Bar Quick Show */}
        <div className="flex md:hidden border-t border-slate-100 py-1.5 justify-around items-center text-[10px] text-slate-500 bg-slate-50/70 -mx-4 px-4 select-none">
          <div className="flex items-center space-x-1">
            <span className="text-[11px]">🏆</span>
            <span>Puntos: <strong className="font-bold text-slate-800">{userPoints}</strong></span>
          </div>
          <div className="h-3 w-px bg-slate-250"></div>
          <div className="flex items-center space-x-1">
            <span className="text-[11px]">🎖️</span>
            <span>Posición: <strong className="font-bold text-slate-800">#{userPos !== 999 ? userPos : "-"}</strong></span>
          </div>
          <div className="h-3 w-px bg-slate-250"></div>
          <div className="flex items-center space-x-1">
            <span>Hola, <strong className="font-bold text-indigo-700">{session.user.nombre}</strong></span>
          </div>
        </div>
      </div>
    </header>
  );
}
