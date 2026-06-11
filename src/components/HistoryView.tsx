import React from "react";
import { User, Calendar, CreditCard, Mail, Medal, Trophy, CheckSquare, RefreshCw, Award } from "lucide-react";
import { UserProfileData, formatArgentinaDate, formatArgentinaDateOnly, formatArgentinaWeekdayDate, getMatchRoundLabel, getTeamFlagUrl } from "../types";

interface HistoryViewProps {
  profile: UserProfileData | null;
  onRefresh: () => void;
  loading: boolean;
}

export default function HistoryView({ profile, onRefresh, loading }: HistoryViewProps) {
  if (loading && !profile) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-slate-450 bg-white rounded-2xl border border-slate-100 min-h-[300px]">
        <RefreshCw className="h-8 w-8 animate-spin text-emerald-600 mb-2" />
        <span className="text-sm">Obteniendo estadísticas de colaborador...</span>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center text-slate-500">
        <User className="mx-auto h-12 w-12 text-slate-300" />
        <h4 className="mt-2 text-sm font-bold text-slate-600">No se pudo cargar la información</h4>
        <p className="text-xs text-slate-400 mt-1">Inténtalo de nuevo más tarde o reinicia la sesión.</p>
        <button
          onClick={onRefresh}
          className="mt-4 rounded-xl bg-indigo-600 text-white px-5 py-2.5 text-xs font-semibold hover:bg-indigo-700 transition shadow-md shadow-indigo-100"
        >
          Reintentar
        </button>
      </div>
    );
  }

  const getPointsBadgeClass = (category: string) => {
    switch (category) {
      case "exacto":
        return "bg-emerald-100 text-emerald-800 border-emerald-200";
      case "diferencia":
        return "bg-teal-100 text-teal-800 border-teal-200";
      case "ganador":
      case "empate":
        return "bg-sky-100 text-sky-800 border-sky-200";
      case "error":
        return "bg-rose-50 text-rose-700 border-rose-100";
      default:
        return "bg-slate-50 text-slate-500 border-slate-150";
    }
  };

  const translateCategory = (category: string) => {
    switch (category) {
      case "exacto":
        return "Resultado Exacto (+5 pts)";
      case "diferencia":
        return "Dif. Goles Correcta (+4 pts)";
      case "ganador":
        return "Ganador Correcto (+3 pts)";
      case "empate":
        return "Empate Correcto (+3 pts)";
      case "error":
        return "Sin aciertos (0 pts)";
      default:
        return "Por jugarse / procesar";
    }
  };

  return (
    <div id="history-view-root" className="space-y-6">
      {/* 1. COLLABORATOR CARD & HIGHLIGHTS GRID */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Profile Card */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col justify-between md:col-span-1">
          <div className="space-y-4">
            <div className="flex items-center space-x-3.5">
              <div className="h-12 w-12 bg-indigo-50 text-indigo-700 rounded-xl flex items-center justify-center font-black text-lg border border-indigo-100">
                {profile.nombre[0]}
                {profile.apellido[0]}
              </div>
              <div>
                <h3 className="font-extrabold text-slate-800 text-base leading-tight">
                  {profile.nombre} {profile.apellido}
                </h3>
                <span className="text-[10px] text-slate-400 uppercase font-semibold">Participante Colaborador</span>
              </div>
            </div>

            <div className="space-y-2 pt-3 border-t border-slate-100 text-xs text-slate-500">
              <div className="flex items-center space-x-2.5">
                <Mail className="h-4 w-4 text-slate-400 shrink-0" />
                <span className="truncate">{profile.email}</span>
              </div>
              <div className="flex items-center space-x-2.5">
                <Calendar className="h-4 w-4 text-slate-400 shrink-0" />
                <span>Registrado: {formatArgentinaDateOnly(profile.fechaRegistro)}</span>
              </div>
            </div>

            {profile.email === "admin@prode2026.com" && profile.googleSheetID && (
              <div className="mt-4 p-3 bg-emerald-50 border border-emerald-100 rounded-xl flex flex-col gap-2 select-none">
                <div className="flex items-center gap-2 text-emerald-800 text-xs font-bold">
                  <span className="p-1 text-emerald-700 bg-white rounded shadow-xs">📊</span>
                  <span>Planilla de Control</span>
                </div>
                <a
                  href={`https://docs.google.com/spreadsheets/d/${profile.googleSheetID}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full text-center bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-[11px] tracking-wider uppercase py-2.5 rounded-lg border border-emerald-700/30 flex items-center justify-center gap-1.5 shadow-sm transition cursor-pointer"
                >
                  Abrir Google Sheets ↗
                </a>
              </div>
            )}
          </div>

          <div className="mt-6 pt-3 border-t border-slate-100 flex items-center justify-between">
            <span className="text-[10px] text-slate-400 font-semibold uppercase">Actualizado en vivo</span>
            <button
              onClick={onRefresh}
              disabled={loading}
              className="text-indigo-600 hover:text-indigo-800 font-bold text-xs flex items-center space-x-1"
            >
              <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} />
              <span>Sincronizar</span>
            </button>
          </div>
        </div>

        {/* Big Score Badges */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm md:col-span-2 grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="flex flex-col justify-between bg-slate-50/60 hover:bg-slate-100/50 p-4 rounded-xl border border-slate-100 text-center transition">
            <Trophy className="h-6 w-6 text-emerald-600 mx-auto" />
            <div className="mt-4">
              <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Puntos</span>
              <p className="text-2xl font-black text-slate-800 mt-0.5">{profile.puntos}</p>
            </div>
          </div>

          <div className="flex flex-col justify-between bg-slate-50/60 hover:bg-slate-100/50 p-4 rounded-xl border border-slate-100 text-center transition">
            <Medal className="h-6 w-6 text-indigo-600 mx-auto" />
            <div className="mt-4">
              <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Posición</span>
              <p className="text-2xl font-black text-indigo-700 mt-0.5">#{profile.posicion}</p>
            </div>
          </div>

          <div className="flex flex-col justify-between bg-slate-50/60 hover:bg-slate-100/50 p-4 rounded-xl border border-slate-100 text-center transition">
            <CheckSquare className="h-6 w-6 text-teal-600 mx-auto" />
            <div className="mt-4">
              <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Exactos (+5)</span>
              <p className="text-2xl font-black text-teal-800 mt-0.5">{profile.aciertosExactos}</p>
            </div>
          </div>

          <div className="flex flex-col justify-between bg-slate-50/60 hover:bg-slate-100/50 p-4 rounded-xl border border-slate-100 text-center transition">
            <Award className="h-6 w-6 text-sky-600 mx-auto" />
            <div className="mt-4">
              <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Ganador (+3/4)</span>
              <p className="text-2xl font-black text-sky-800 mt-0.5">{profile.aciertosGanador}</p>
            </div>
          </div>
        </div>
      </div>

      {/* 2. FORECAST HISTORY TIMELINE */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <h3 className="font-bold text-slate-800 text-base mb-4 bento-title">Historial de Pronósticos</h3>

        {profile.history.length === 0 ? (
          <div className="text-center py-12 text-slate-400 border border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
            <CheckSquare className="mx-auto h-8 w-8 text-slate-300" />
            <p className="mt-2 text-xs font-semibold text-slate-550">Aún no has registrado pronósticos en Prode.</p>
            <p className="text-[10px] text-slate-400 mt-1">Tus predicciones aparecerán aquí tan pronto como se configuren y guarden oficialmente.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {profile.history.map((h) => (
              <div
                key={h.matchId}
                className="flex flex-col sm:flex-row items-start sm:items-center sm:justify-between p-4 border border-slate-100 rounded-xl bg-slate-50/50 hover:bg-slate-50 transition gap-4"
              >
                <div>
                  <span className="inline-block bg-indigo-50 border border-indigo-100 rounded px-2 py-0.5 text-[9px] font-extrabold text-indigo-700 uppercase tracking-wider">
                    {getMatchRoundLabel(h.ronda, h.fechaHora)}
                  </span>
                  <div className="mt-1.5 flex items-center space-x-2 text-sm font-bold text-slate-800 flex-wrap gap-y-1">
                    <span className="flex items-center space-x-1">
                      {getTeamFlagUrl(h.equipoA) && (
                        <img
                          src={getTeamFlagUrl(h.equipoA)!}
                          alt=""
                          className="h-3.5 w-5 object-cover rounded shadow-sm"
                          referrerPolicy="no-referrer"
                        />
                      )}
                      <span>{h.equipoA}</span>
                    </span>
                    <span className="text-slate-400 font-normal">vs</span>
                    <span className="flex items-center space-x-1">
                      {getTeamFlagUrl(h.equipoB) && (
                        <img
                          src={getTeamFlagUrl(h.equipoB)!}
                          alt=""
                          className="h-3.5 w-5 object-cover rounded shadow-sm"
                          referrerPolicy="no-referrer"
                        />
                      )}
                      <span>{h.equipoB}</span>
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400 block mt-0.5">
                    ⚽ Comienzo: {formatArgentinaWeekdayDate(h.fechaHora)}
                  </span>
                </div>

                {/* Score comparison block */}
                <div className="flex flex-row items-center gap-4 w-full sm:w-auto justify-between sm:justify-end border-t border-slate-200/50 sm:border-0 pt-2 sm:pt-0">
                  <div className="flex items-center space-x-4">
                    {/* User Guess */}
                    <div className="text-right">
                      <span className="text-[9px] text-slate-400 font-semibold block uppercase leading-none">Mi Prode</span>
                      <strong className="text-slate-700 font-bold text-xs bg-white border border-slate-200 rounded-md py-1 px-2.5 inline-block mt-1">
                        {h.pronosticoA} - {h.pronosticoB}
                      </strong>
                    </div>

                    {/* Real Outcome */}
                    <div>
                      <span className="text-[9px] text-slate-400 font-semibold block uppercase leading-none">FIFA Real</span>
                      <strong className="text-slate-700 font-black text-xs bg-white border border-slate-200 rounded-md py-1 px-2.5 inline-block mt-1">
                        {h.realA !== null && h.realB !== null ? `${h.realA} - ${h.realB}` : "-"}
                      </strong>
                    </div>
                  </div>

                  {/* Award points widget */}
                  <div className="flex flex-col items-end">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[9px] font-bold border ${getPointsBadgeClass(
                        h.resultado
                      )}`}
                    >
                      {translateCategory(h.resultado)}
                    </span>
                    {h.realA !== null && h.realB !== null && (
                      <span className="text-[10px] font-bold text-slate-700 mt-1 leading-none">
                        +{h.puntos} puntos
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
